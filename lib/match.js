var jsdiff = require('diff');

/**
 * Creates a new Match, consisting of an array of nodes, and optionally, a
 * diff of each.
 *
 * @constructor
 */
function Match(type, nodes) {
  this.type  = type;
  this.nodes = nodes;
  this.diffs = [];
}

module.exports = Match;

Match.types = {
  identical: 0,
  fuzzy:     1
};

Match.prototype.generateDiffs = function(fileContents) {
  var i, base, curr;

  base = this._getLines(fileContents, this.nodes[0]);

  for (i = 1; i < this.nodes.length; i++) {
    curr = this._getLines(fileContents, this.nodes[i]);
    this.diffs.push(jsdiff.diffLines(base, curr));
  }
};

Match.prototype._getLines = function(fileContents, node) {
  var lines = fileContents[node.loc.source];

  return lines.slice(node.loc.start.line - 1, node.loc.end.line).join("\n");
};
