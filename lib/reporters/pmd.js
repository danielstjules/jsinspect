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
    this._diff = opts.diff;

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
   * diff.
   *
   * @private
   *
   * @param   {Match}  match The inspector match to output
   * @returns {string} The formatted output
   */
  _getOutput(match) {
    var output = '';
    var codeFragment = '';
    var nodes = match.nodes;
    var totalLines = this._getTotalLines(nodes);

    if (this._found > 1) {
      output += '\n';
    }

    output += `<duplication lines="${totalLines}" id="${match.hash}">\n`;
    nodes.forEach((node) => output += this._getFile(node));

    output += '<codefragment>';
    if (this._diff) {
      match.diffs.forEach((diff, i) => {
        codeFragment += '\n- ' + this._getFormattedLocation(nodes[0]) + '\n+ ' +
          this._getFormattedLocation(nodes[i + 1]) + '\n\n' +
          this._getFormattedDiff(diff);
      });
    }
    output += `${this._escape(codeFragment)}</codefragment>\n</duplication>\n`;

    return output;
  }

  /**
   * Returns the total number of lines spanned by each node in an array.
   *
   * @param   {Node[]} nodes The nodes for which to get the total
   * @returns {int}    Total number of lines
   */
  _getTotalLines(nodes) {
    return nodes.reduce((prev, curr) => {
      return prev + curr.loc.end.line - curr.loc.start.line + 1;
    }, 0);
  }

  /**
   * Returns an XML string containing the path to the file in which the node is
   * located, as well as its starting line. Absolute paths are required for
   * Jenkins.
   *
   * @param   {Node}   node The node from which to get a formatted location
   * @returns {string} The formatted string
   */
  _getFile(node) {
    var filePath = this._getAbsolutePath(node);
    return `<file path="${filePath}" line="${node.loc.start.line}"/>\n`;
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
