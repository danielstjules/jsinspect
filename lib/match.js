var jsdiff = require('diff');

/**
 * Creates a new Match, consisting of one of identical or fuzzy as the type,
 * and an array of nodes. If generated, an instance also contains an array
 * of diffs created with jsdiff.
 *
 * @constructor
 *
 * @param {string} key   The hash key for the nodes
 * @param {int}    type  Type of match, as defined by Match
 * @param {Node[]} nodes An array of matching nodes
 */
function Match(key, type, nodes) {
  this.key   = key;
  this.type  = type;
  this.nodes = nodes;
  this.diffs = [];
}

module.exports = Match;

/**
 * A simple enum-like structure mapping the different match types to an
 * integer value, in an ES5-compatible manner.
 *
 * @var {object}
 */
Match.types = {
  identical: 0,
  fuzzy:     1
};

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
  var lines, end;

  lines = fileContents[node.loc.source];
  end = node.keys[this.type ? '_fuzzy' : '_identical'][this.key].loc.end.line;

  return lines.slice(node.loc.start.line - 1, end).join("\n");
};
