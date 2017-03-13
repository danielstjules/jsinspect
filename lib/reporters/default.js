var util         = require('util');
var chalk        = require('chalk');
var BaseReporter = require('./base');

class DefaultReporter extends BaseReporter {
  /**
   * The default reporter, which displays both file and line information for
   * each given match. If enabled via opts.diff, corresponding diffs are also
   * printed.
   *
   * @constructor
   *
   * @param {Inspector} inspector Instance on which to register its listeners
   * @param {object}    opts      Options to set for the reporter
   */
  constructor(inspector, opts) {
    opts = opts || {};
    super(inspector, opts);
    this._diff = opts.diff;
    this._registerSummary();
  }

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
  _getOutput(match) {
    var nodes = match.nodes;
    var output = '\n' + chalk.bold(`  Match - ${nodes.length} instances\n`);

    if (nodes.length > 2 || !this._diff) {
      nodes.forEach((node) => {
        output += '  ' + this._getFormattedLocation(node) + '\n';
      });
    }

    if (!this._diff) return output;

    match.diffs.forEach((diff, i) => {
      var files = chalk.grey('- ' + this._getFormattedLocation(nodes[0]) +
        '\n+ ' + this._getFormattedLocation(nodes[i + 1]) + '\n');
      output += '\n' + files + this._getFormattedDiff(diff);
    });

    return output;
  }
}

module.exports = DefaultReporter;
