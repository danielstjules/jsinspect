var jsdiff = require('diff');
var strip = require('strip-indent');

/**
 * Creates a new Match, consisting of an array of nodes. If generated, an
 * instance also contains an array of diffs created with jsdiff.
 *
 * @constructor
 *
 * @param {Node[]} nodes An array of matching nodes
 */
function Match(nodes) {
  this.nodes = nodes;
  this.diffs = [];
}

module.exports = Match;

/**
 * Uses jsdiff to generate line-based diffs for the nodes, given an object
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
  var lines, start, end;

  lines = fileContents[node.loc.source];

  start = node.loc.start.line - 1;
  end = node.loc.end.line;

  return strip(lines.slice(start, end).join('\n'));
};
