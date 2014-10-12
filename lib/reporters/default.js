var util         = require('util');
var chalk        = require('chalk');
var BaseReporter = require('./base');
var Match        = require('../match');

/**
 * The default reporter, which displays both file and line information for
 * each given match. If enabled, corresponding diffs are also rendered.
 *
 * @constructor
 *
 * @param {Inspector} inspector The instance on which to register its listeners
 * @param {bool}      diff      Whether or not to output diffs
 */
function DefaultReporter(inspector, diff) {
  BaseReporter.call(this, inspector);
  this._diff = diff;
  this._registerSummary();
}

util.inherits(DefaultReporter, BaseReporter);
module.exports = DefaultReporter;

/**
 * Returns the string output to print for the given reporter. The formatted
 * string contains the match type, the number of instances associated with the
 * match and the files and lines involved. If diffs are enabled, 2-way diffs
 * are formatted and included.
 *
 * @private
 *
 * @param   {Match}  match The inspector match to output
 * @returns {string} The formatted output
 */
DefaultReporter.prototype._getOutput = function(match) {
  var output, i, nodes, type, files, self;

  self = this;
  output = "\n";

  output += chalk.bold('Match - ' + match.nodes.length + " instances\n");

  nodes = match.nodes;
  nodes.forEach(function(node) {
    var source = self._getFormattedSource(node) + "\n";

    if (self._diff) {
      output += chalk.bold(source);
    } else {
      output += source;
    }
  });

  if (!this._diff) return output;

  for (i = 0; i < match.diffs.length; i++) {
    output += "\n";

    files = '- ' + this._getFormattedSource(nodes[0]) + "\n+ " +
      this._getFormattedSource(nodes[i + 1]) + "\n";
    output += chalk.grey(files);

    output += this._getFormattedDiff(match.diffs[i]);
  }

  return output;
};
