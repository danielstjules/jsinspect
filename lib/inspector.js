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

  this._filePaths   = filePaths      || [];
  this._fuzzy       = opts.fuzzy     || Inspector.fuzzyTypes.head;
  this._distance    = opts.distance  || 0;
  this._threshold   = opts.threshold || 10;
  this._diff        = opts.diff;

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
    self._parse(filePath, fs.readFileSync(filePath, opts));
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
  var self, types, syntaxTree;
  types = Inspector.fuzzyTypes;

  self = this;
  syntaxTree = acorn.parse(contents, {
    ecmaVersion: 6,
    allowReturnOutsideFunction: true,
    locations: true,
    sourceFile: filePath
  });

  this._walk(syntaxTree, function(state) {
    self._insertIdentical(state);

    if (!self._distance) return;

    if (self._fuzzy !== types.tail) {
      self._insertFuzzyHead(state);
    }

    if (self._fuzzy !== types.head) {
      self._insertFuzzyTail(state);
    }
  });
};

Inspector.prototype._analyze = function() {
  var self, emitMatches;

  self = this;
  emitMatches = function(event, object) {
    for (var key in object) {
      if (object[key].length < 2) return;

      self.emit(event, object[key]);
    }
  };

  emitMatches('identical', this._identical);
  emitMatches('fuzzy', this._fuzzyHead);
  emitMatches('fuzzy', this._fuzzyTail);
};

Inspector.prototype._walk = function(node, fn) {
  var threshold, base, prev, i;

  threshold = this._threshold;
  i = 0;
  base = acornWalk.base;

  function recurse(node, state, override) {
    if (i++ && node !== prev) {
      state = state.slice();
      state.push(node);
      prev = node;

      if (state.length > threshold) {
        fn(state);
      }
    }

    var type = override || node.type;
    base[type](node, state, recurse);
  }

  recurse(node, []);
};

Inspector.prototype._insertIdentical = function(state) {
  var key = this._getHashKey(state);
  if (!this._identical[key]) {
    this._identical[key] = [];
  }

  // Assign the parent node to the key
  this._identical[key].push(state[0]);
};

Inspector.prototype._insertFuzzyHead = function(state) {
  var i, key, maxIndex;

  maxIndex = Math.min(this._distance + 1, state.length);

  for (i = 1; i < maxIndex; i++) {
    key = this._getHashKey(state.slice(i));
    if (!this._fuzzyHead[key]) {
      this._fuzzyHead[key] = [];
    }

    this._fuzzyHead[key].push(state[0]);
  }
};

Inspector.prototype._insertFuzzyTail = function(state) {
  var i, key, minStart, length;

  length = state.length;
  minStart = Math.min(this._distance + 1, length);

  for (i = length - minStart; i < length; i++) {
    key = this._getHashKey(state.slice(i, length));
    if (!this._fuzzyHead[key]) {
      this._fuzzyHead[key] = [];
    }

    this._fuzzyHead[key].push(state[0]);
  }
};

Inspector.prototype._getHashKey = function(nodes) {
  return nodes.map(function(node) {
    return node.type;
  }).join(':');
};
