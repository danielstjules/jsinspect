var jsdiff = require('diff');

/**
 * Creates a new Match, consisting of an array of nodes, as well as boolean
 * indicating whether or not it's a fuzzy match. If generated, an instance
 * also contains an array of diffs created with jsdiff.
 *
 * @constructor
 *
 * @param {string} key   The hash key for the nodes
 * @param {bool}   fuzzy Whether or not it's a fuzzy match
 * @param {Node[]} nodes An array of matching nodes
 */
function Match(key, fuzzy, nodes) {
  this.key   = key;
  this.fuzzy = !!fuzzy;
  this.nodes = nodes;
  this.diffs = [];
}

module.exports = Match;

/**
 * Uses jsdoc to generate line-based diffs for the nodes, given an object
 * mapping source file paths to their contents. If a match contains multiple
 * nodes, 2-way diffs are generated for each against the first node in the
 * array. The diffs are pushed into the diffs array in the same order as
 * the nodes.
 *
 * @param {object} fileContents The file paths and their contents
 */
Match.prototype.generateDiffs = function(fileContents) {
  var i, base, curr;

  base = this._getLines(fileContents, this.nodes[0]);

  for (i = 1; i < this.nodes.length; i++) {
    curr = this._getLines(fileContents, this.nodes[i]);
    this.diffs.push(jsdiff.diffLines(base, curr));
  }
};

/**
 * Returns a string containing the source lines for the supplied node.
 *
 * @param   {object} fileContents The file paths and their contents
 * @param   {Node}   node         The node for which to extract its lines
 * @returns {String} The lines corresponding to the node's body
 */
Match.prototype._getLines = function(fileContents, node) {
  var lines, start, end, nodes;

  lines = fileContents[node.loc.source];

  nodes = node.keys[this.key];
  start = node.loc.start.line - 1;
  end = nodes[nodes.length - 1].loc.end.line;

  return lines.slice(start, end).join("\n");
};
