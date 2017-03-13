var util  = require('util');
var path  = require('path');
var chalk = require('chalk');

class BaseReporter {
  /**
   * A base reporter from which all others inherit. Registers a listener on the
   * passed inspector instance for tracking the number of matches found.
   *
   * @constructor
   *
   * @param {Inspector} inspector Instance on which to register its listeners
   * @param {object}    opts      Options to set for the reporter
   */
  constructor(inspector, opts) {
    opts = opts || {};

    this._inspector = inspector;
    this._found = 0;
    this._suppress = (opts.suppress === 0) ? 0 : (opts.suppress || 1000);
    this._writableStream = opts.writableStream || process.stdout;
    this._registerListener();

    inspector.on('end', () => {
      if (this._writableStream === process.stdout) return;
      // give the reporter a chance to write its last chunk by
      // deferring end to the next tick
      process.nextTick(() => this._writableStream.end());
    });
  }

  /**
   * Registers a listener to the "match" event exposed by the Inspector
   * instance. Increments _found for each match emitted, and invokes the
   * object's _getOutput method, writing it to stdout.
   */
  _registerListener() {
    this._inspector.on('match', (match) => {
      this._found++;
      this._writableStream.write(this._getOutput(match));
    });
  }

  /**
   * Registers a listener that prints a final summary outlining the number of
   * matches detected, as well as the number of files analyzed.
   */
  _registerSummary() {
    this._inspector.on('end', () => {
      var numFiles = this._inspector.numFiles;
      var files = (numFiles > 1) ? 'files' : 'file';
      var matches = (this._found > 1) ? 'matches' : 'match';
      var summary;

      if (!this._found) {
        summary = chalk.black.bgGreen(util.format(
          '\n No matches found across %d %s', numFiles, files));
      } else {
        summary = chalk.bgRed(util.format('\n %d %s found across %d %s',
          this._found, matches, numFiles, files));
      }

      this._writableStream.write(summary + '\n');
    });
  }

  /**
   * Accepts a jsdiff object and returns a corresponding formatted diff string.
   * The object contains three keys: value, a string with possible newlines,
   * added, a boolean indicating if it were an addition, and removed, for if it
   * were removed from the src. The formatted diff is padded and uses "+" and
   * "-" for indicating the addition and removal of lines.
   *
   * @param   {Object} diff The diff object to format
   * @returns {string} A formatted diff
   */
  _getFormattedDiff(diff) {
    var output = '';
    var diffLength = 0;

    diff.forEach((chunk) => {
      var lines = chunk.value.split('\n');
      if (chunk.value.slice(-1) === '\n') {
        lines = lines.slice(0, -1);
      }

      diffLength += lines.length;
      if (this._suppress && diffLength > this._suppress) {
        return `Diff suppressed as it surpasses ${this._suppress} lines\n`;
      }

      lines.forEach((line) => {
        if (chunk.added) {
          output += chalk.green(`+  ${line}\n`);
        } else if (chunk.removed) {
          output += chalk.red(`-  ${line}\n`);
        } else {
          output += `   ${line}\n`;
        }
      });
    });

    return output;
  }

  /**
   * Returns a string containing the path to the file in which the node is
   * located, as well as the lines on which the node exists.
   *
   * @param   {Node}   node The node from which to get a formatted source
   * @returns {string} The formatted string
   */
  _getFormattedLocation(node) {
    var filePath = this._getRelativePath(node);
    return `${filePath}:${node.loc.start.line},${node.loc.end.line}`;
  }

  /**
   * Returns the relative path for the file in which a node is located.
   *
   * @param   {Node}   node The node from which to get the file path
   * @returns {string} The relative file path
   */
  _getRelativePath(node) {
    var filePath = node.loc.filename;
    // Convert any absolute paths to relative
    if (filePath.charAt(0) === '/') {
      filePath = path.relative(process.cwd(), filePath);
    }

    return filePath;
  }

  /**
   * Returns the absolute path for the file in which a node is located.
   *
   * @param   {Node}   node The node from which to get the file path
   * @returns {string} The absolute file path
   */
  _getAbsolutePath(node) {
    var filePath = node.loc.filename;
    // Convert any relative paths to absolute
    if (filePath.charAt(0) !== '/') {
      filePath = path.resolve(process.cwd(), filePath);
    }

    return filePath;
  }
}

module.exports = BaseReporter;
