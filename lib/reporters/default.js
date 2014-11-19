var util         = require('util');
var chalk        = require('chalk');
var BaseReporter = require('./base');
var Match        = require('../match');

/**
 * The default reporter, which displays both file and line information for
 * each given match. If enabled via opts.diff, corresponding diffs are also
 * printed.
 *
 * @constructor
 *
 * @param {Inspector} inspector The instance on which to register its listeners
 * @param {object}    opts      Options to set for the reporter
 */
function DefaultReporter(inspector, opts) {
  opts = opts || {};
  BaseReporter.call(this, inspector, opts);

  this._diff = opts.diff;
  this._registerSummary();
}

util.inherits(DefaultReporter, BaseReporter);
module.exports = DefaultReporter;

/**
 * Returns the string output to print for the given reporter. The string
 * contains the number of instances associated with the match and the files
 * and lines involved. If diffs are enabled, 2-way diffs are formatted and
 * included.
 *
 * @private
 *
 * @param   {Match}  match The inspector match to output
 * @returns {string} The formatted output
 */
DefaultReporter.prototype._getOutput = function(match) {
  var output, i, nodes, files, self;

  self = this;
  output = "\n";

  output += chalk.bold('Match - ' + match.nodes.length + " instances\n");

  nodes = match.nodes;
  nodes.forEach(function(node) {
    var source = self._getFormattedLocation(node) + "\n";

    if (self._diff) {
      output += chalk.bold(source);
    } else {
      output += source;
    }
  });

  if (!this._diff) return output;

  for (i = 0; i < match.diffs.length; i++) {
    output += "\n";

    files = '- ' + this._getFormattedLocation(nodes[0]) + "\n+ " +
      this._getFormattedLocation(nodes[i + 1]) + "\n";
    output += chalk.grey(files);

    output += this._getFormattedDiff(match.diffs[i]);
  }

  return output;
};
