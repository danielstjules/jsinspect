var util  = require('util');
var path  = require('path');
var chalk = require('chalk');

/**
 *
 */
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
    this._truncate = (opts.truncate === 0) ? 0 : (opts.truncate || 100);
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
        summary = chalk.green(util.format(
          '\nNo matches found across %d %s', numFiles, files));
      } else {
        summary = chalk.red(util.format('\n%d %s found across %d %s',
          this._found, matches, numFiles, files));
      }

      this._writableStream.write(summary + '\n');
    });
  }

  /**
   * Returns a string containing the path to the file in which the nodes are
   * located, as well as the lines on which the nodes exist.
   *
   * @param   {Object} instance
   * @returns {string}
   */
  _getFormattedLocation(instance) {
    var filePath = this._getRelativePath(instance.filename);
    return `${filePath}:${instance.start.line},${instance.end.line}`;
  }

  /**
   * Returns the lines associated with an instance.
   *
   * @param   {Object} instance
   * @returns {string}
   */
  _getLines(instance) {
    var lines = instance.lines;
    if (this._truncate) {
      lines = lines.split('\n').slice(0, this._truncate).join('\n');
    }

    return lines;
  }

  /**
   * Returns the relative path for a file.
   *
   * @param   {string} filePath
   * @returns {string}
   */
  _getRelativePath(filePath) {
    if (filePath.charAt(0) === '/') {
      filePath = path.relative(process.cwd(), filePath);
    }

    return filePath;
  }

  /**
   * Returns the absolute path for a file.
   *
   * @param   {string} filePath
   * @returns {string}
   */
  _getAbsolutePath(filePath) {
    if (filePath.charAt(0) !== '/') {
      filePath = path.resolve(process.cwd(), filePath);
    }

    return filePath;
  }
}

module.exports = BaseReporter;
