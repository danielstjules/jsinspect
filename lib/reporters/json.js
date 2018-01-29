var util         = require('util');
var path         = require('path');
var chalk        = require('chalk');
var BaseReporter = require('./base');

/**
 *
 */
class JSONReporter extends BaseReporter {
  /**
   * A JSON reporter, which displays both file and line information for
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

    var enabled = chalk.enabled;

    inspector.on('start', () => {
      chalk.enabled = false;
      this._writableStream.write('[');
    });

    inspector.on('end', () => {
      chalk.enabled = enabled;
      this._writableStream.write(']\n');
    });
  }

  /**
   * Returns the string output to print for the given reporter. The formatted
   * JSON string contains the number of instances associated with the match and
   * the files and lines involved.
   *
   * @private
   *
   * @param   {Match}  match The inspector match to output
   * @returns {string} The formatted output
   */
  _getOutput(match) {
    var output = (this._found > 1) ? ',\n' : '';

    output += JSON.stringify({
      id: match.hash,
      instances: match.instances.map(instance => {
        return {
          path: this._getRelativePath(instance.filename),
          lines: [instance.start.line, instance.end.line],
          code: this._getLines(instance)
        };
      })
    });

    return output;
  }
}

module.exports = JSONReporter;
