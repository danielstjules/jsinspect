var util         = require('util');
var EventEmitter = require('events').EventEmitter;
var acorn        = require('acorn');
var acornWalk    = require('acorn/util/walk');
var fs           = require('fs');
var Match        = require('./match');

/**
 * Creates a new Inspector, which extends EventEmitter. filePaths is expected
 * to be an array of string paths. Also accepts an options object, such that
 * distance defines the max edit distance for fuzzy matching, threshold
 * indicates the minimum number of nodes to analyze, and diff enables the
 * generation of diffs for any outputted matches. An instance of Inspector
 * emits the following events: start, identical, fuzzy and end.
 *
 * @constructor
 * @extends EventEmitter
 *
 * @param {string[]} filePaths The files on which to run the inspector
 * @param {object}   [opts]    Options to set for the inspector
 */
function Inspector(filePaths, opts) {
  opts = opts || {};

  this._filePaths = filePaths      || [];
  this._distance  = opts.distance  || 0;
  this._threshold = opts.threshold || 15;
  this._diff      = opts.diff;

  this._identical = Object.create(null);
  this._fuzzy     = Object.create(null);

  this.numFiles   = filePaths.length;

  if (this._diff) {
    this._fileContents = {};
  }
}

util.inherits(Inspector, EventEmitter);
module.exports = Inspector;

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
 * conforming to the Mozilla Parser API. The parser is invoked with ES6
 * support enabled, and each node includes its source file. The tree is then
 * walked, and any nodes meeting the defined threshold are stored.
 *
 * @private
 *
 * @param {string} filePath The original file path
 * @param {string} contents The contents to parse
 */
Inspector.prototype._parse = function(filePath, contents) {
  var self, syntaxTree;

  self = this;
  syntaxTree = acorn.parse(contents, {
    ecmaVersion: 6,
    allowReturnOutsideFunction: true,
    locations: true,
    sourceFile: filePath
  });

  this._walk(syntaxTree, function(state) {
    // Truncate the state to the last <threshold> nodes,
    // add a "keys" property to the parent node for reverse lookup
    var trimmedState = state.slice(-self._threshold);
    if (!trimmedState[0].keys) {
      trimmedState[0].keys = {};
    }

    self._insertIdentical(trimmedState);

    if (self._distance) {
      self._insertFuzzy(trimmedState);
    }
  });
};

/**
 * Traverses the "hashes" at which the various nodes are stored. A key
 * containing an array of more than a single node indicates a match.
 * A match results in those nodes' ASTs being walked once again, removing
 * their children from any future results. This pruning ensures that we
 * only include the greatest common parent in a set of matches. Pruning of
 * an identical match results in the possible removal of its nodes from
 * any fuzzy matches as well.
 *
 * @private
 *
 * @fires Inspector#match
 */
Inspector.prototype._analyze = function() {
  var self, emitMatches;

  self = this;
  emitMatches = function(type, object) {
    var key, match, i;
    // pruning takes advantage of the fact that keys are enumerated
    // based on insertion order. It's not ECMA spec, but is standard,
    // and saves us from having to perform a sort
    for (key in object) {
      if (!object[key] || object[key].length < 2) {
        continue;
      }

      match = new Match(type, object[key].slice(0));
      if (self._diff) {
        match.generateDiffs(self._fileContents);
      }

      self.emit('match', match);
      self._prune(object[key]);
    }
  };

  emitMatches(Match.types.identical, this._identical);

  if (this._distance) {
    emitMatches(Match.types.fuzzy, this._fuzzy);
  }
};

/**
 * Walks a given node's AST, building up an array of child nodes that meet
 * the inspector's threshold. When found, the callback is invoked and passed
 * the array of nodes.
 *
 * @private
 *
 * @param {Node}     node The node to traverse
 * @param {function} fn   The callback to invoke
 */
Inspector.prototype._walk = function(node, fn) {
  var threshold, base, prev, i, recurse;

  threshold = this._threshold;
  i = 0;
  base = acornWalk.base;

  recurse = function(node, state, override) {
    if (i++ && node !== prev) {
      state = state.slice();
      state.push(node);
      prev = node;

      if (state.length >= threshold) {
        fn(state);
      }
    }

    var type = override || node.type;
    base[type](node, state, recurse);
  };

  recurse(node, []);
};

/**
 * Generates a key based on the combined types of each of the supplied nodes.
 * Pushes the parent node, to an array at the generated key in _identical.
 * The parent node is then updated to include the same key for reverse
 * lookup purposes.
 *
 * @private
 *
 * @param {Node[]} nodes An array of nodes to insert
 */
Inspector.prototype._insertIdentical = function(nodes) {
  var key = this._getHashKey(nodes);
  if (!this._identical[key]) {
    this._identical[key] = [];
  }

  if (this._identical[key].indexOf(nodes[0]) !== -1) {
    return;
  }

  // Assign the parent node to the key
  this._identical[key].push(nodes[0]);

  // Store the keys on the node itself
  if (!nodes[0].keys._identical) {
    nodes[0].keys._identical = [];
  }

  if (nodes[0].keys._identical.indexOf(key) === -1) {
    nodes[0].keys._identical.push(key);
  }
};

/**
 * Given the inspector's fuzzy distance, the function generates that many sets
 * of nodes, such that each has had an additional node removed from the head
 * of the array. Fuzzy matching is done based on the head of the nodes alone.
 * From there, the function generates keys based on the combined types of each
 * set of nodes, and pushes the parent nodes to an array at the generated keys
 * in _fuzzy. The parent nodes are then updated to include the same keys for
 * reverse lookups.
 *
 * @private
 *
 * @param {Node[]} nodes An array of nodes to insert
 */
Inspector.prototype._insertFuzzy = function(nodes) {
  var i, key, maxIndex;

  maxIndex = Math.min(this._distance + 1, nodes.length);

  for (i = 1; i < maxIndex; i++) {
    key = this._getHashKey(nodes.slice(i));

    if (!this._fuzzy[key]) {
      this._fuzzy[key] = [];
    }

    this._fuzzy[key].push(nodes[0]);

    // Store the keys on the node itself
    if (!nodes[0].keys._fuzzy) {
      nodes[0].keys._fuzzy = [];
    }

    nodes[0].keys._fuzzy.push(key);
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
 * @param {Node[]} nodes An array of nodes to prune
 */
Inspector.prototype._prune = function(nodes) {
  var base, prev, self, removeNode, recurse, length, i;

  self = this;
  base = acornWalk.base;
  length = nodes.length;

  recurse = function(node, state, override) {
    // Return since the node isn't a parent to any suff. long paths
    if (!node || !node.keys) return;

    // Remove node from being included in future results
    self._removeNode(node, length);
    prev = node;

    var type = override || node.type;
    base[type](node, state, recurse);
  };

  for (i = 0; i < length; i++) {
    recurse(nodes[i], []);
  }
};

/**
 * Removes a given node, as well as its children, from any _identical and
 * _fuzzy keys which would not result in the silencing of a match. This is done
 * by comparing the length of the original array for the match, and the arrays
 * for any other keys at which they can be found.
 *
 * @private
 *
 * @param {Node} node   The node to remove
 * @param {int}  length The length of the original bucket containing the node
 */
Inspector.prototype._removeNode = function(node, length) {
  var self = this;

  ['_identical', '_fuzzy'].forEach(function(hashName) {
    if (!node.keys[hashName]) return;

    node.keys[hashName].forEach(function(key) {
      if (!self[hashName][key] || self[hashName][key].length !== length) {
        return;
      }

      var index = self[hashName][key].indexOf(node);
      if (index > -1) {
        self[hashName][key].splice(index, 1);
      }

      // Delete empty buckets
      if (!self[hashName][key].length) {
        delete self[hashName][key];
      }
    });
  });
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
