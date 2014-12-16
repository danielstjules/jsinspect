var util  = require('util');
var path  = require('path');
var chalk = require('chalk');

/**
 * A base reporter from which all others inherit. Registers a listener on the
 * passed inspector instance for tracking the number of matches found.
 *
 * @constructor
 *
 * @param {Inspector} inspector The instance on which to register its listeners
 * @param {object}    opts      Options to set for the reporter
 */
function BaseReporter(inspector, opts) {
  opts = opts || {};

  this._inspector = inspector;
  this._found = 0;
  this._suppress = (opts.suppress === 0) ? 0 : (opts.suppress || 1000);
  this._registerListener();
}

module.exports = BaseReporter;

/**
 * Registers a listener to the "match" event exposed by the Inspector instance.
 * Increments _found for each match emitted, and invokes the object's
 * _getOutput method, writing it to stdout.
 *
 * @private
 */
BaseReporter.prototype._registerListener = function() {
  var self = this;
  this._inspector.on('match', function(match) {
    self._found++;
    process.stdout.write(self._getOutput(match));
  });
};

/**
 * Registers a listener that prints a final summary outlining the number of
 * matches detected, as well as the number of files analyzed.
 */
BaseReporter.prototype._registerSummary = function() {
  var self = this;
  this._inspector.on('end', function() {
    var summary, files, matches, numFiles;

    numFiles = self._inspector.numFiles;
    files = (numFiles > 1) ? 'files' : 'file';
    matches = (self._found > 1) ? 'matches' : 'match';

    if (!self._found) {
      summary = chalk.black.bgGreen(util.format(
        '\n No matches found across %d %s', numFiles, files));
    } else {
      summary = chalk.bgRed(util.format('\n %d %s found across %d %s',
        self._found, matches, numFiles, files));
    }

    process.stdout.write(summary + '\n');
  });
};

/**
 * Accepts a jsdiff object and returns a corresponding formatted diff string.
 * The object contains three keys: value, a string with possible newlines,
 * added, a boolean indicating if it were an addition, and removed, for if it
 * were removed from the src. The formatted diff is padded and uses "+" and "-"
 * for indicating the addition and removal of lines.
 *
 * @param   {Object} diff The diff object to format
 * @returns {string} A formatted diff
 */
BaseReporter.prototype._getFormattedDiff = function(diff) {
  var i, j, output, diffLength, chunk, lines;

  output = '';
  diffLength = 0;

  for (i = 0; i < diff.length; i++) {
    chunk = diff[i];
    lines = chunk.value.split('\n');
    if (chunk.value.slice(-1) === '\n') {
      lines = lines.slice(0, -1);
    }

    diffLength += lines.length;
    if (this._suppress && diffLength > this._suppress) {
      return 'Diff suppressed as it surpasses ' + this._suppress + ' lines\n';
    }

    for (j = 0; j < lines.length; j++) {
      if (chunk.added) {
        output += chalk.green('+  ' + lines[j] + '\n');
      } else if (chunk.removed) {
        output += chalk.red('-  ' + lines[j] + '\n');
      } else {
        output += '   ' + lines[j] + '\n';
      }
    }
  }

  return output;
};

/**
 * Returns a string containing the path to the file in which the node is
 * located, as well as the lines on which the node exists.
 *
 * @param   {Node}   node The node from which to get a formatted source
 * @returns {string} The formatted string
 */
BaseReporter.prototype._getFormattedLocation = function(node) {
  var filePath = node.loc.source;

  // Convert any absolute paths to relative
  if (filePath.charAt(0) === '/') {
    filePath = path.relative(process.cwd(), filePath);
  }

  return filePath + ':' + node.loc.start.line + ',' + node.loc.end.line;
};
