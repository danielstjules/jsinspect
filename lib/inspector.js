var util         = require('util');
var EventEmitter = require('events').EventEmitter;
var parse        = require('acorn/acorn_loose').parse_dammit;
var acornWalk    = require('acorn/util/walk');
var fs           = require('fs');
var Match        = require('./match');
var nodeUtils    = require('./nodeUtils');

/**
 * Creates a new Inspector, which extends EventEmitter. filePaths is expected
 * to be an array of string paths. Also accepts an options object with up to
 * five keys: distance, threshold, diff, identifiers, and literals. Distance
 * defines the max edit distance for fuzzy matching, while threshold indicates
 * the minimum number of nodes to analyze, and diff enables the generation of
 * diffs for any outputted matches. Identifiers and literals indicate whether
 * or not those respective node properties should match. An instance of
 * Inspector emits the following events: start, identical, fuzzy and end.
 *
 * @constructor
 * @extends EventEmitter
 *
 * @param {string[]} filePaths The files on which to run the inspector
 * @param {object}   [opts]    Options to set for the inspector
 */
function Inspector(filePaths, opts) {
  opts = opts || {};

  this._filePaths   = filePaths        || [];
  this._distance    = opts.distance    || 0;
  this._threshold   = opts.threshold   || 10;
  this._identifiers = opts.identifiers;
  this._literals    = opts.literals;
  this._diff        = opts.diff;
  this._hash        = Object.create(null);
  this.numFiles     = this._filePaths.length;

  if (this._diff) {
    this._fileContents = {};
  }
}

util.inherits(Inspector, EventEmitter);
module.exports = Inspector;

/**
 * A simple object emulating a map-like structure for defining the available
 * types of literals to match against.
 *
 * @var {object}
 */
Inspector.availableLiterals = {
  boolean: true,
  number:  true,
  string:  true
};

/**
 * Runs the inspector on the given file paths, as provided in the constructor.
 * Emits a start event, followed by a series of match events for any detected
 * structural similarities, and an end event on completion. Iterating over
 * the instance's filePaths and reading their contents is done synchronously.
 *
 * @fires Inspector#start
 * @fires Inspector#match
 * @fires Inspector#end
 */
Inspector.prototype.run = function() {
  var self, opts;

  self = this;
  opts = {encoding: 'utf8'};

  this.emit('start');

  // Iterate over files, and contents are split to allow
  // for specific line extraction
  this._filePaths.forEach(function(filePath) {
    var contents = fs.readFileSync(filePath, opts);
    if (self._diff) {
      self._fileContents[filePath] = contents.split("\n");
    }

    self._parse(filePath, contents);
  });

  this._analyze();

  this.emit('end');
};

/**
 * Invokes acorn's parser on the given file contents to build a syntax tree
 * conforming to the Mozilla Parser API. Acorn's loose parser is used to handle
 * files with potential syntax errors. The parser is invoked with ES6 support
 * enabled, and each node includes its source file. The tree is then walked,
 * and any nodes meeting the defined threshold are stored.
 *
 * @private
 *
 * @param {string} filePath The original file path
 * @param {string} contents The contents to parse
 */
Inspector.prototype._parse = function(filePath, contents) {
  var self, syntaxTree;

  self = this;
  syntaxTree = parse(contents, {
    ecmaVersion: 6,
    allowReturnOutsideFunction: true,
    locations: true,
    sourceFile: filePath
  });

  this._walk(syntaxTree, function(nodes) {
    self._insert(nodes);
  });
};

/**
 * Traverses the keys at which the various nodes are stored. A key containing
 * an array of more than a single node indicates a potential match. The nodes
 * are then grouped if identifier or literal matching is enabled. A match
 * results in the relevant child nodes being removed from any future results.
 * This pruning ensures that we only include the greatest common parent in a
 * set of matches.
 *
 * @private
 *
 * @fires Inspector#match
 */
Inspector.prototype._analyze = function() {
  var key, match, i, nodes;

  // pruning takes advantage of the fact that keys are enumerated
  // based on insertion order. It's not ECMA spec, but is standard,
  // and saves us from having to perform a sort
  for (key in this._hash) {
    if (!this._hash[key] || this._hash[key].length < 2) {
      continue;
    }

    // nodes will be of type node[][], such that each entry is a match
    nodes = [this._hash[key].slice(0)];
    if (this._identifiers) {
      nodes = nodeUtils.groupByMatchingIds(key, nodes);
    }
    if (this._literals) {
      nodes = nodeUtils.groupByMatchingLiterals(key, nodes, this._literals);
    }

    for (i = 0; i < nodes.length; i++) {
      if (nodes[i].length < 2) continue;

      match = new Match(key, !!this._distance, nodes[i]);
      if (this._diff) {
        match.generateDiffs(this._fileContents);
      }

      this.emit('match', match);
      this._prune(key, nodes[i]);
    }
  }
};

/**
 * Walks a given node's AST, building up an array of child nodes that meet
 * the inspector's threshold. When found, the callback is invoked and passed
 * the array of nodes. Traversal is done using a combination of DFS and BFS.
 * DFS alone offers a poor contextual representation of a parent node's
 * children when comparing code.
 *
 * @private
 *
 * @param {Node}     node The node to traverse
 * @param {function} fn   The callback to invoke
 */
Inspector.prototype._walk = function(node, fn) {
  var threshold, base, prev, parent, i, recurse;

  threshold = this._threshold;
  i = 0;
  base = acornWalk.base;

  // Ignoring the first node allows us to skip CommonJS require statements.
  // Still have to explicitly skip "define" for AMD
  recurse = function(node, state, override) {
    if (i++ && node !== prev) {
      state = state.slice();
      state.push(node);
      prev = node;
      parent = state[state.length - 2];

      if (!parent || (!parent.numChildren && parent.numChildren !== 0) ||
          parent.numChildren === threshold) {
        // We store and access the number of children on each node
        children = nodeUtils.getNestedChildren(node, threshold - 1);
        node.numChildren = children.length;

        // Ignore AMD define and its array
        if (!nodeUtils.isDefine(state) && children.length === threshold - 1) {
          fn([node].concat(children));
        }
      }
    }

    var type = override || node.type;
    base[type](node, state, recurse);
  };

  recurse(node, []);
};

/**
 * Generates a key based on the combined types of each of the supplied nodes.
 * Pushes the parent node, to an array at the generated key in _hash. The
 * parent node is then updated to include the same key for reverse lookup
 * purposes.
 *
 * @private
 *
 * @param {Node[]} nodes An array of nodes to insert
 */
Inspector.prototype._insert = function(nodes) {
  var key = this._getHashKey(nodes);
  if (!this._hash[key]) {
    this._hash[key] = [];
  } else if (this._hash[key].indexOf(nodes[0]) !== -1) {
    return;
  }

  // Assign the parent node to the key
  this._hash[key].push(nodes[0]);

  // Store keys on the parent, mapping to the nodes
  if (!nodes[0].keys) {
    nodes[0].keys = {};
  }

  nodes[0].keys[key] = nodes;
};

/**
 * Given the inspector's fuzzy distance, the function generates that many sets
 * of nodes, such that each has had an additional node removed from the head
 * of the array. Fuzzy matching is done based on the head of the nodes alone.
 * From there, the function generates keys based on the combined types of each
 * set of nodes, and pushes the parent nodes to an array at the generated keys
 * in _hash. The parent nodes are then updated to include the same keys for
 * reverse lookups.
 *
 * @private
 *
 * @param {Node[]} nodes An array of nodes to insert
 */
Inspector.prototype._insertFuzzy = function(nodes) {
  var i, key, maxIndex, inner;

  maxIndex = Math.min(this._distance + 1, nodes.length);

  for (i = 1; i < maxIndex; i++) {
    key = this._getHashKey(nodes.slice(i));

    if (!this._hash[key]) {
      this._hash[key] = [];
    } else if (this._hash[key].indexOf(nodes[0]) !== -1) {
      return;
    }

    this._hash[key].push(nodes[0]);

    // Store keys on parents, mapping to the nodes
    if (!nodes[0].keys) {
      nodes[0].keys = {};
    }

    nodes[0].keys[key] = nodes;
  }
};

/**
 * Removes the nodes and their children from consideration in any additional
 * matches. It takes care not to modify buckets that contain nodes not included
 * by the given match. This is easily done by simply comparing the lengths of
 * the arrays.
 *
 * @private
 *
 * @param {string} key   Key in which the match was found
 * @param {Node[]} nodes An array of nodes to prune
 */
Inspector.prototype._prune = function(key, nodes) {
  var length, i, j, targetNodes;

  length = nodes.length;

  for (i = 0; i < length; i++) {
    if (!nodes[i].keys[key]) return;

    targetNodes = nodes[i].keys[key].slice(0);

    for (j = 0; j < targetNodes.length; j++) {
      // Continue since the node isn't a parent to any suff. long paths
      if (!targetNodes[j].keys) continue;

      this._removeNode(targetNodes[j], length);
    }
  }
};

/**
 * Removes a given node, as well as its children, from any _hash keys that
 * would not result in the silencing of a match. This is done by comparing the
 * length of the original array for the match, and the arrays for any other
 * keys at which they can be found.
 *
 * @private
 *
 * @param {Node} node   The node to remove
 * @param {int}  length The length of the original bucket containing the node
 */
Inspector.prototype._removeNode = function(node, length) {
  if (!node.keys) return;

  for (var key in node.keys) {
    if (!this._hash[key] || this._hash[key].length > length) {
      return;
    }

    var index = this._hash[key].indexOf(node);
    if (index > -1) {
      this._hash[key].splice(index, 1);
    }

    // Delete empty buckets
    if (!this._hash[key].length) {
      delete this._hash[key];
    }
  }
};

/**
 * Generates a key consisting of the type of each of the passed nodes,
 * delimited by a colon.
 *
 * @private
 *
 * @param   {Node[]} nodes The nodes for which to generate the key
 * @returns {string} A key for the supplied nodes
 */
Inspector.prototype._getHashKey = function(nodes) {
  return nodes.map(function(node) {
    return node.type;
  }).join(':');
};
