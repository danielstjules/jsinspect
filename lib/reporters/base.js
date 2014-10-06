var chalk = require('chalk');
var util  = require('util');

/**
 * A base reporter from which all others inherit.
 *
 * @constructor
 *
 * @param {Inspector} inspector The instance on which to register its listeners
 */
function BaseReporter(inspector) {
  this._inspector = inspector;
  this._found = 0;
  this._registerListener();
}

module.exports = BaseReporter;

/**
 * Registers a listener to the "match" event exposed by the Inspector instance.
 * Invokes the object's _getOutput method, writing it to stdout.
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
 * matches detected.
 */
BaseReporter.prototype._registerSummary = function() {
  var self = this;
  this._inspector.on('end', function() {
    var summary, files, match, numFiles;

    numFiles = self._inspector.numFiles;
    files = (numFiles > 1) ? 'files' : 'file';
    matches = (self._found > 1) ? 'matches' : 'match';

    if (!self._found) {
      summary = chalk.black.bgGreen(util.format(
        "\n No matches found across %d %s", numFiles, files));
    } else {
      summary = chalk.bgRed(util.format("\n %d %s found across %d %s",
        self._found, matches, numFiles, files));
    }

    process.stdout.write(summary + "\n");
  });
};

BaseReporter.prototype._getFormattedDiff = function(diff) {
  var output = '';

  diff.forEach(function(chunk) {
    var lines = chunk.value.split("\n");

    if (chunk.value.slice(-1) === "\n") {
      lines = lines.slice(0, -1);
    }

    if (chunk.added) {
      lines.forEach(function(line) {
        output += chalk.green('+  ' + line + "\n");
      });
    } else if (chunk.removed) {
      lines.forEach(function(line) {
        output += chalk.red('-  ' + line + "\n");
      });
    } else {
      lines.forEach(function(line) {
        output += '   ' + line + "\n";
      });
    }
  });

  return output;
};
