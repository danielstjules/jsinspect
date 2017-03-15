var util         = require('util');
var path         = require('path');
var chalk        = require('chalk');
var BaseReporter = require('./base');

class PMDReporter extends BaseReporter {
  /**
   * A PMD CPD XML reporter, which tries to fit jsinspect's output to something
   * CI tools might expect from PMD.
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
      this._writableStream.write(
        '<?xml version="1.0" encoding="utf-8"?>\n' +
        '<pmd-cpd>\n'
      );
    });

    inspector.on('end', () => {
      chalk.enabled = enabled;
      this._writableStream.write('</pmd-cpd>\n');
    });
  }

  /**
   * Returns an XML string containing a <duplication> element, with <file>
   * children indicating the instance locations, and <codefragment> to hold the
   * lines.
   *
   * @private
   *
   * @param   {Match}  match The inspector match to output
   * @returns {string} The formatted output
   */
  _getOutput(match) {
    var output = (this._found > 1) ? '\n' : '';
    var codeFragment = '';
    var instances = match.instances;
    var totalLines = this._getTotalLines(match);

    output += `<duplication lines="${totalLines}" id="${match.hash}">\n`;
    instances.forEach((instance) => output += this._getFile(instance));

    output += '<codefragment>';
    instances.forEach((instance) => {
      var location = this._getFormattedLocation(instance);
      var lines = this._getLines(instance);
      codeFragment += `\n${location}\n${chalk.grey(lines)}\n`;
    });
    output += `${this._escape(codeFragment)}</codefragment>\n</duplication>\n`;

    return output;
  }

  /**
   * Returns the total number of lines spanned by a match.
   *
   * @param   {Match} match
   * @returns {int}
   */
  _getTotalLines(match) {
    return match.instances.reduce((res, curr) => {
      return res + curr.end.line - curr.start.line + 1;
    }, 0);
  }

  /**
   * Returns an XML string containing the path to the file in which the instance
   * is located, as well as its starting line. Absolute paths are required for
   * Jenkins.
   *
   * @param   {object} instance
   * @returns {string}
   */
  _getFile(instance) {
    var filePath = this._getAbsolutePath(instance.filename);
    return `<file path="${filePath}" line="${instance.start.line}"/>\n`;
  }

  /**
   * Returns an escaped string for use within XML.
   *
   * @param   {string} string The string to escape
   * @returns {string} The escaped string
   */
  _escape(string) {
    var escaped = {
      "'": '&apos;',
      '"': '&quot;',
      '&': '&amp;',
      '>': '&gt;',
      '<': '&lt;'
    };

    return string.replace(/(['"&><])/g, (string, char) => {
      return escaped[char];
    });
  }
}

module.exports = PMDReporter;
