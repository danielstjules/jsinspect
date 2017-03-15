var util         = require('util');
var chalk        = require('chalk');
var BaseReporter = require('./base');

class DefaultReporter extends BaseReporter {
  /**
   * The default reporter, which displays both file and line information for
   * each given match.
   *
   * @constructor
   *
   * @param {Inspector} inspector Instance on which to register its listeners
   * @param {object}    opts      Options to set for the reporter
   */
  constructor(inspector, opts) {
    opts = opts || {};
    super(inspector, opts);
    this._registerSummary();
  }

  /**
   * Returns the string output to print for the given reporter. The string
   * contains the number of instances associated with the match and the files
   * and lines involved.
   *
   * @private
   *
   * @param   {Match}  match The inspector match to output
   * @returns {string} The formatted output
   */
  _getOutput(match) {
    var instances = match.instances;
    var output = '\n' + '-'.repeat(60) + '\n\n' +
      chalk.bold(`Match - ${instances.length} instances\n`);

    instances.forEach((instance) => {
      var location = this._getFormattedLocation(instance);
      var lines = this._getLines(instance);
      output += `\n${location}\n${chalk.grey(lines)}\n`;
    });

    return output;
  }
}

module.exports = DefaultReporter;
