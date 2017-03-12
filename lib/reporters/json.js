var util         = require('util');
var path         = require('path');
var chalk        = require('chalk');
var BaseReporter = require('./base');

class JSONReporter extends BaseReporter {
  /**
   * A JSON reporter, which displays both file and line information for
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

    var enabled = chalk.enabled;
    this._diff = opts.diff;

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
   * the files and lines involved. If diffs are enabled, 2-way diffs are
   * formatted and included.
   *
   * @private
   *
   * @param   {Match}  match The inspector match to output
   * @returns {string} The formatted output
   */
  _getOutput(match) {
    var output = '';
    var nodes = match.nodes;
    var formatted = {
      id: match.hash,
      instances: nodes.map(node => this._getFormattedLocation(node))
    };

    if (this._found > 1) {
      output += ',\n';
    }

    if (!this._diff) {
      output += JSON.stringify(formatted);
      return output;
    }

    formatted.diffs = match.diffs.map((diff, i) => {
      return {
        '-': this._getFormattedLocation(nodes[0]),
        '+': this._getFormattedLocation(nodes[i + 1]),
        diff: this._getFormattedDiff(diff)
      };
    });

    output += JSON.stringify(formatted);

    return output;
  }

  /**
   * Returns a JSON string containing the path to the file in which the node is
   * located, as well as the lines on which the node exists.
   *
   * @param   {Node}   node The node from which to get a formatted source
   * @returns {string} The formatted string
   */
  _getFormattedLocation(node) {
    return {
      path: this._getRelativePath(node),
      lines: [node.loc.start.line, node.loc.end.line]
    };
  }
}

module.exports = JSONReporter;
