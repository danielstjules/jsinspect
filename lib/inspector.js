var util         = require('util');
var EventEmitter = require('events').EventEmitter;
var acorn        = require('acorn');
var acornWalk    = require('acorn/util/walk');
var fs           = require('fs');

/**
 * Creates a new Inspector, which extends EventEmitter. filePaths is expected
 * to be an array of string paths. Emits the following events: start,
 * identical, fuzzy and end.
 *
 * @constructor
 * @extends EventEmitter
 *
 * @param {string[]} filePaths The files on which to run the inspector
 * @param {object}   [opts]    Options to set for the inspector
 */
function Inspector(filePaths, opts) {
  opts = opts || {};

  this._filePaths    = filePaths      || [];
  this._fileContents = {};
  this._fuzzy        = opts.fuzzy     || Inspector.fuzzyTypes.head;
  this._distance     = opts.distance  || 0;
  this._threshold    = opts.threshold || 20;
  this._diff         = opts.diff;

  this._identical = {};
  this._fuzzyHead = {};
  this._fuzzyTail = {};
}

util.inherits(Inspector, EventEmitter);
module.exports = Inspector;

/**
 * Simple object defining the fuzzy matching types.
 *
 * @var {object}
 */
Inspector.fuzzyTypes = {
  head: 0,
  tail: 1,
  both: 2
};

/**
 * Runs the inspector on the given file paths, as provided in the constructor.
 *
 * @fires Inspector#start
 * @fires Inspector#identical
 * @fires Inspector#fuzzy
 * @fires Inspector#end
 */
Inspector.prototype.run = function(fn) {
  var self, opts;

  self = this;
  opts = {encoding: 'utf8'};

  this.emit('start');

  this._filePaths.forEach(function(filePath) {
    var contents = fs.readFileSync(filePath, opts);
    self._fileContents[filePath] = contents;
    self._parse(filePath, contents);
  });

  this._analyze();

  this.emit('end');
};

/**
 * Invoke acorn's parser on the given file contents to build a syntax tree
 * conforming to the Mozilla Parser API. Each node includes its location, as
 * well as the source file.
 *
 * @private
 *
 * @param {string} filePath The original filepath
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
    // Truncate the state to the last <threshold> nodes
    var trimmedState = state.slice(-self._threshold);
    self._insertIdentical(trimmedState);

    if (!self._distance) return;

    if (self._fuzzy !== Inspector.fuzzyTypes.tail) {
      self._insertFuzzyHead(trimmedState);
    }

    if (self._fuzzy !== Inspector.fuzzyTypes.head) {
      self._insertFuzzyTail(trimmedState);
    }
  });
};

Inspector.prototype._analyze = function() {
  var self, emitMatches;

  self = this;
  emitMatches = function(event, object) {
    var key, match, i;
    // pruning takes advantage of the fact that keys are enumerated
    // based on insertion order. It's not ECMA spec, but is standard,
    // and saves us from having to perform a sort
    for (key in object) {
      if (!object[key] || object[key].length < 2) {
        continue;
      }

      match = object[key].slice(0);
      self.emit(event, match);
      self._prune(object[key]);
    }
  };

  emitMatches('identical', this._identical);

  if (!this._distance) return;

  if (this._fuzzy !== Inspector.fuzzyTypes.tail) {
    emitMatches('fuzzy', this._fuzzyHead);
  }

  if (this._fuzzy !== Inspector.fuzzyTypes.head) {
    emitMatches('fuzzy', this._fuzzyTail);
  }
};

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

Inspector.prototype._insertIdentical = function(state) {
  var key = this._getHashKey(state);
  if (!this._identical[key]) {
    this._identical[key] = [];
  }

  if (this._identical[key].indexOf(state[0]) !== -1) {
    return;
  }

  // Assign the parent node to the key
  this._identical[key].push(state[0]);

  // Store the keys on the node itself
  if (!state[0].identicalKeys) {
    state[0].identicalKeys = [];
  }

  if (state[0].identicalKeys.indexOf(key) === -1) {
    state[0].identicalKeys.push(key);
  }
};

Inspector.prototype._insertFuzzyHead = function(state) {
  var i, key, maxIndex;

  maxIndex = Math.min(this._distance + 1, state.length);

  for (i = 1; i < maxIndex; i++) {
    key = this._getHashKey(state.slice(i));
    this._insertFuzzyKey(key, Inspector.fuzzyTypes.head, state[0]);
  }
};

Inspector.prototype._insertFuzzyTail = function(state) {
  var i, key, minStart, length;

  length = state.length;
  minStart = Math.min(this._distance + 1, length);

  for (i = length - minStart; i < length; i++) {
    this._insertFuzzyKey(key, Inspector.fuzzyTypes.tail, state[0]);
  }
};

Inspector.prototype._insertFuzzyKey = function(key, fuzzy, node) {
  var object, nodeKey;
  if (fuzzy === Inspector.fuzzyTypes.head) {
    object = this._fuzzyHead;
    nodeKey = 'fuzzyHeadKeys';
  } else {
    object = this._fuzzyTail;
    nodeKey = 'fuzzyTailKeys';
  }

  if (!object[key]) {
    object[key] = [];
  }

  object[key].push(node);

  // Store the keys on the node itself
  if (!node[nodeKey]) {
    node[nodeKey] = [];
  }

  node[nodeKey].push(key);
};

/**
 * Remove the node and its children from consideration. We take care not
 * to remove buckets that contain nodes not included by the given match.
 */
Inspector.prototype._prune = function(nodes) {
  var base, prev, self, removeNode, recurse, length, i;

  self = this;
  base = acornWalk.base;
  length = nodes.length;

  removeNode = function(node) {
    node.identicalKeys.forEach(function(key) {
      if (!self._identical[key] || self._identical[key].length !== length) {
        return;
      }

      var index = self._identical[key].indexOf(node);
      if (index > -1) {
        self._identical[key].splice(index, 1);
      }

      // Delete empty buckets
      if (!self._identical[key].length) {
        delete self._identical[key];
      }
    });
  };

  recurse = function(node, state, override) {
    // Return since the node isn't a parent to any suff. long paths
    if (!node || !node.identicalKeys) return;

    // Remove node from being included in future results
    removeNode(node);
    prev = node;

    var type = override || node.type;
    base[type](node, state, recurse);
  };

  for (i = 0; i < length; i++) {
    recurse(nodes[i], []);
  }
};

Inspector.prototype._getHashKey = function(nodes) {
  return nodes.map(function(node) {
    return node.type;
  }).join(':');
};
