var util         = require('util');
var EventEmitter = require('events').EventEmitter;
var acorn        = require('acorn');
var acornWalk    = require('acorn/util/walk');
var fs           = require('fs');
var Match        = require('./match');

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

  this._filePaths = filePaths      || [];
  this._distance  = opts.distance  || 0;
  this._threshold = opts.threshold || 15;
  this._diff      = opts.diff;

  this._identical = Object.create(null);
  this._fuzzy     = Object.create(null);

  if (this._diff) {
    this._fileContents = {};
  }
}

util.inherits(Inspector, EventEmitter);
module.exports = Inspector;

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
    if (self._diff) {
      self._fileContents[filePath] = contents.split("\n");
    }

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
  if (!state[0].keys._identical) {
    state[0].keys._identical = [];
  }

  if (state[0].keys._identical.indexOf(key) === -1) {
    state[0].keys._identical.push(key);
  }
};

Inspector.prototype._insertFuzzy = function(state) {
  var i, key, maxIndex;

  maxIndex = Math.min(this._distance + 1, state.length);

  for (i = 1; i < maxIndex; i++) {
    key = this._getHashKey(state.slice(i));

    if (!this._fuzzy[key]) {
      this._fuzzy[key] = [];
    }

    this._fuzzy[key].push(state[0]);

    // Store the keys on the node itself
    if (!state[0].keys._fuzzy) {
      state[0].keys._fuzzy = [];
    }

    state[0].keys._fuzzy.push(key);
  }
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

Inspector.prototype._getHashKey = function(nodes) {
  return nodes.map(function(node) {
    return node.type;
  }).join(':');
};
