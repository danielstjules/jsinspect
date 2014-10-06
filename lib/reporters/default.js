var util         = require('util');
var chalk        = require('chalk');
var BaseReporter = require('./base');
var Match        = require('../match');

/**
 * A default reporter that displays the file and lines numbers for a given
 * match.
 *
 * @constructor
 *
 * @param {Inspector} inspector The instance on which to register its listeners
 */
function DefaultReporter(inspector, diff) {
  BaseReporter.call(this, inspector);
  this._diff = diff;
  this._registerSummary();
}

util.inherits(DefaultReporter, BaseReporter);
module.exports = DefaultReporter;

/**
 * Returns a string containing the file path and line numbers.
 *
 * @private
 *
 * @param {Match} match The inspector match to output
 *
 * @returns {string} The formatted output
 */
DefaultReporter.prototype._getOutput = function(match) {
  var output, i, nodes, type, files;

  output = "\n";

  type = (match.type === Match.types.fuzzy) ? "Fuzzy match" : "Match";

  output += chalk.bold(type + ' - ' + match.nodes.length + " instances\n");

  nodes = match.nodes;
  nodes.forEach(function(node) {
    var lines = node.loc.start.line + ',' + node.loc.end.line;
    output += chalk.bold(node.loc.source + ':' + lines + "\n");
  });

  if (!this._diff) return output;

  for (i = 0; i < match.diffs.length; i++) {
    output += "\n";

    // List files being compared if there's more than 1 diff
    if (match.diffs.length > 1) {
      files = nodes[0].loc.source + "\n" + nodes[i].loc.source + "\n";
      output += chalk.grey(files);
    }

    output += this._getFormattedDiff(match.diffs[i]);
  }

  return output;
};
