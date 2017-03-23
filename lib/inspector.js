var util         = require('util');
var EventEmitter = require('events').EventEmitter;
var fs           = require('fs');
var parse        = require('./parser').parse;
var Match        = require('./match');
var nodeUtils    = require('./nodeUtils');
var crypto       = require('crypto');

class Inspector extends EventEmitter {
  /**
   * Creates a new Inspector, which extends EventEmitter. filePaths is expected
   * to be an array of string paths. Also accepts an options object with any
   * combination of the following: threshold, identifiers literals, and
   * minInstances. Threshold indicates the minimum number of nodes to analyze.
   * Identifiers indicates whether or not the nodes in a match should also have
   * matching identifiers, and literals whether or not literal values should
   * match. minInstances specifies the min number of instances for a match.
   * An instance of Inspector emits the following events: start, match and end.
   *
   * @constructor
   * @extends EventEmitter
   *
   * @param {string[]} filePaths The files on which to run the inspector
   * @param {object}   [opts]    Options to set for the inspector
   */
  constructor(filePaths, opts) {
    super();
    opts = opts || {};

    this._filePaths    = filePaths || [];
    this._threshold    = opts.threshold || 30;
    this._identifiers  = opts.identifiers;
    this._literals     = opts.literals;
    this._minInstances = opts.minInstances || 2;
    this._map          = Object.create(null);
    this._fileContents = {};
    this._traversals   = {};
    this.numFiles      = this._filePaths.length;
  }

  /**
   * Runs the inspector on the given file paths, as provided in the constructor.
   * Emits a start event, followed by a series of match events for any detected
   * similarities, and an end event on completion.
   *
   * @fires Inspector#start
   * @fires Inspector#match
   * @fires Inspector#end
   */
  run() {
    this.emit('start');

    // File contents are split to allow for specific line extraction
    this._filePaths.forEach((filePath) => {
      var src = fs.readFileSync(filePath, {encoding: 'utf8'});
      this._fileContents[filePath] = src.split('\n');
      var syntaxTree = parse(src, filePath);
      this._traversals[filePath] = nodeUtils.getDFSTraversal(syntaxTree);
      this._walk(syntaxTree, (nodes) => this._insert(nodes));
    });

    this._analyze();
    this.emit('end');
  }

  /**
   * Walks a given node's AST, building up arrays of nodes that meet the
   * inspector's threshold. When found, the callback is invoked and passed
   * the array of nodes.
   *
   * @private
   *
   * @param {Node}     node The node to traverse
   * @param {function} fn   The callback to invoke
   */
  _walk(node, fn) {
    nodeUtils.walkSubtrees(node, (node, parent, ancestors) => {
      var state = ancestors.concat(node);
      if (nodeUtils.isAMD(state) ||
          nodeUtils.isCommonJS(state) ||
          nodeUtils.isES6ModuleImport(state) ||
          nodeUtils.isES6ClassBoilerplate(state)) {
        return;
      }

      var nodes = nodeUtils.getDFSTraversal(node, this._threshold);
      if (nodes.length === this._threshold) {
        fn(nodes);
      }
    });
  }

  /**
   * Generates a key based on the combined types of each of the supplied nodes.
   * Pushes the array to another array at the generated key in _map. Nodes
   * are updated to keep a reference to all their occurrences in _map.
   *
   * @private
   *
   * @param {Node[]} nodes
   */
  _insert(nodes) {
    var key = this._getMapKey(nodes);

    nodes.forEach(node => {
      if (!node.occurrences) {
        node.occurrences = {};
      }
      if (!node.occurrences[key]) {
        node.occurrences[key] = [];
      }
      node.occurrences[key].push(nodes);
    });

    if (!this._map[key]) {
      this._map[key] = [];
    }

    this._map[key].push(nodes);
  }

  /**
   * Traverses the keys at which the various nodes are stored. A key containing
   * an array of more than a single entry indicates a potential match. The nodes
   * are then grouped if identifier matching is enabled. A match results in the
   * relevant nodes being removed from any future results. This pruning ensures
   * that we only include the greatest common parent in a set of matches.
   *
   * @private
   *
   * @fires Inspector#match
   */
  _analyze() {
    var key, match, i, groups, nodeArrays;

    var sortedKeys = Object.keys(this._map)
      .filter(key => this._map[key].length >= this._minInstances)
      .sort((a, b) => this._map[b].length - this._map[a].length);

    for (key of sortedKeys) {
      if (!this._map[key] || this._map[key].length < this._minInstances) {
        continue;
      }

      nodeArrays = this._map[key].slice(0);
      this._omitOverlappingInstances(nodeArrays);

      // groups will be of type Node[][][]
      groups = [nodeArrays];
      if (this._identifiers) {
        groups = this._groupByMatchingIdentifiers(groups);
      }
      if (this._literals) {
        groups = this._groupByMatchingLiterals(groups);
      }

      for (i = 0; i < groups.length; i++) {
        if (groups[i].length < this._minInstances) continue;

        this._expand(groups[i]);
        match = new Match(groups[i], this._fileContents);
        this.emit('match', match);
        this._prune(groups[i]);
      }
    }
  }

  /**
   * Removes overlapping instances from a group of node arrays. That is,
   * if one instance has nodes abcd, and another has bcde, then bcde will
   * be removed from the array.
   *
   * @private
   *
   * @param {Node[][]} nodeArrays
   */
  _omitOverlappingInstances(nodeArrays) {
    var set = new Set();

    var hasOverlap = (nodes) => {
      return nodes.some(node => set.has(node));
    };

    var addNodes = (nodes) => {
      nodes.forEach(node => set.add(node));
    };

    for (var i = 0; i < nodeArrays.length; i++) {
      if (hasOverlap(nodeArrays[i])) {
        nodeArrays.splice(i--, 1);
        continue;
      } else {
        addNodes(nodeArrays[i]);
      }
    }
  }

  /**
   * Iterates over the multi-dimensional array of nodes, and returns a new
   * array grouping them based on matching identifiers.
   *
   * @private
   *
   * @param   {Node[][][]} groups
   * @returns {Node[][][]}
   */
  _groupByMatchingIdentifiers(groups) {
    return this._group(groups, (nodes) => {
      return nodes
        .filter(node => node.name)
        .map(node => node.name)
        .join(':');
    });
  }

  /**
   * Iterates over the multi-dimensional array of nodes, and returns a new
   * array grouping them based on matching literals.
   *
   * @private
   *
   * @param   {Node[][][]} groups
   * @returns {Node[][][]}
   */
  _groupByMatchingLiterals(groups) {
    return this._group(groups, (nodes) => {
      return nodes
        .filter(node => node.type.includes('Literal'))
        .map(node => node.value)
        .join(':');
    });
  }

  /**
   * Expands each instance of a match to the largest common sequence of nodes
   * with the same type, and optionally identifiers. Each array of nodes is
   * modified in place.
   *
   * @private
   *
   * @param {Node[][]} nodeArrays
   */
  _expand(nodeArrays) {
    var traversals = nodeArrays.map(nodes => {
      return this._traversals[nodes[0].loc.filename];
    });

    var positions = nodeArrays.map((nodes, i) => {
      var last = nodes[nodes.length - 1];
      return traversals[i].indexOf(last);
    });

    var incr = (pos) => pos + 1;
    var getNode = (pos, i) => traversals[i][pos];
    var alreadyIncluded = (nodes) => {
      return nodes.some(node => {
        return nodeArrays.some(array => array.indexOf(node) !== -1)
      });
    };

    var isComplete = (nodes) => {
      return (!nodeUtils.typesMatch(nodes) || alreadyIncluded(nodes)) ||
        (this._identifiers && !nodeUtils.identifiersMatch(nodes)) ||
        (this._literals && !nodeUtils.literalsMatch(nodes));
    };

    while (true) {
      positions = positions.map(incr);
      var nodes = positions.map(getNode);
      if (isComplete(nodes)) return;
      nodeArrays.forEach((array, i) => array.push(nodes[i]));
    }
  }

  /**
   * Removes the nodes from consideration in any additional matches.
   *
   * @private
   *
   * @param {Node[][]} nodeArrays
   */
  _prune(nodeArrays) {
    var i, j, nodes;

    for (i = 0; i < nodeArrays.length; i++) {
      nodes = nodeArrays[i];
      for (j = 0; j < nodes.length; j++) {
        this._removeNode(nodes[j]);
      }
    }
  }

  /**
   * Removes all occurrences of a given node.
   *
   * @private
   *
   * @param {Node} node The node to remove
   */
  _removeNode(node) {
    var key, i, index;

    for (key in node.occurrences) {
      for (i = 0; i < node.occurrences[key].length; i++) {
      if (!this._map[key]) break;
        index = this._map[key].indexOf(node.occurrences[key][i]);
        if (index > -1) {
          this._map[key].splice(index, 1);
        }

        // Delete empty buckets
        if (!this._map[key].length) {
          delete this._map[key];
        }
      }

      delete node.occurrences[key];
    }
  }

  /**
   * Generates a key based on the type of each of the passed nodes, returned
   * as a base64-encoded sha1 hash.
   *
   * @private
   *
   * @param   {Node[]} nodes The nodes for which to generate the key
   * @returns {string}
   */
  _getMapKey(nodes) {
    var key = nodes[0].type;
    var length = nodes.length;

    // Significantly faster than a map & join
    for (var i = 1; i < length; i++) {
      key += ':' + nodes[i].type;
    }

    // Prefer shorter key lengths (base64 < hex)
    return crypto.createHash('sha1').update(key).digest('base64');
  }

  /**
   * Accepts a multi-dimensional array of nodes and groups them based on the
   * supplied function, which is expected to return a string.
   *
   * @private
   *
   * @param   {Node[][][]} groups The groups of nodes to further group
   * @param   {function}   fn     Synchronous function for generating group ids
   * @returns {Node[][][]}
   */
  _group(groups, fn) {
    var res = [];
    var map = Object.create(null);
    var id, i, j;

    for (i = 0; i < groups.length; i++) {
      for (j = 0; j < groups[i].length; j++) {
        id = fn(groups[i][j]);
        if (!map[id]) {
          map[id] = [];
        }

        map[id].push(groups[i][j]);
      }

      for (id in map) {
        res.push(map[id]);
      }

      map = Object.create(null);
    }

    return res;
  }
}

module.exports = Inspector;
