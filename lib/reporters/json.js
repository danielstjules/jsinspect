var util         = require('util');
var path         = require('path');
var chalk        = require('chalk');
var BaseReporter = require('./base');
var Match        = require('../match');

/**
 * A JSON reporter, which displays both file and line information for
 * each given match. If enabled via opts.diff, corresponding diffs are also
 * printed.
 *
 * @constructor
 *
 * @param {Inspector} inspector The instance on which to register its listeners
 * @param {object}    opts      Options to set for the reporter
 */
function JSONReporter(inspector, opts) {
  var enabled = chalk.enabled;
  var self = this;

  opts = opts || {};
  BaseReporter.call(this, inspector, opts);
  this._diff = opts.diff;

  inspector.on('start', function() {
    chalk.enabled = false;
    self._writeStream.write('[');
  });

  inspector.on('end', function() {
    chalk.enabled = enabled;
    self._writeStream.write(']\n');
  });
}

util.inherits(JSONReporter, BaseReporter);
module.exports = JSONReporter;

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
JSONReporter.prototype._getOutput = function(match) {
  var output, formatted, i, nodes, type, files, self;

  self = this;
  output = '';
  formatted = {instances: []};

  nodes = match.nodes;
  nodes.forEach(function(node) {
    formatted.instances.push(self._getFormattedLocation(node));
  });

  if (this._found > 1) {
    output += ',\n';
  }

  if (!this._diff) {
    output += JSON.stringify(formatted);
    return output;
  }

  formatted.diffs = [];
  for (i = 0; i < match.diffs.length; i++) {
    formatted.diffs.push({
      '-': this._getFormattedLocation(nodes[0]),
      '+': this._getFormattedLocation(nodes[i + 1]),
      diff: this._getFormattedDiff(match.diffs[i])
    });
  }

  output += JSON.stringify(formatted);

  return output;
};

/**
 * Returns a JSON string containing the path to the file in which the node is
 * located, as well as the lines on which the node exists.
 *
 * @param   {Node}   node The node from which to get a formatted source
 * @returns {string} The formatted string
 */
JSONReporter.prototype._getFormattedLocation = function(node) {
  var filePath = node.loc.source;

  // Convert any absolute paths to relative
  if (filePath.charAt(0) === '/') {
    filePath = path.relative(process.cwd(), filePath);
  }

  return {
    path: filePath,
    lines: [node.loc.start.line, node.loc.end.line]
  };
};
