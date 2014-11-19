var util         = require('util');
var path         = require('path');
var chalk        = require('chalk');
var BaseReporter = require('./base');
var Match        = require('../match');

/**
 * A PMD-CPD XML reporter, which tries to fit jsinspect's output to something
 * CI tools might expect from PMD-CPD.
 *
 * @constructor
 *
 * @param {Inspector} inspector The instance on which to register its listeners
 * @param {object}    opts      Options to set for the reporter
 */
function PMDReporter(inspector, opts) {
  var enabled = chalk.enabled;

  opts = opts || {};
  BaseReporter.call(this, inspector, opts);
  this._diff = opts.diff;

  inspector.on('start', function() {
    chalk.enabled = false;
    process.stdout.write(
      '<?xml version="1.0" encoding="utf-8"?>\n' +
      '<pmd-cpd>\n'
    );
  });

  inspector.on('end', function() {
    chalk.enabled = enabled;
    process.stdout.write('</pmd-cpd>\n');
  });
}

util.inherits(PMDReporter, BaseReporter);
module.exports = PMDReporter;

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
PMDReporter.prototype._getOutput = function(match) {
  var self, output, diff, i, nodes, files;

  self = this;
  output = '';
  diff = '';

  if (this._found > 1) {
    output += '\n';
  }

  output += '<dupliction>\n';

  nodes = match.nodes;
  nodes.forEach(function(node) {
    output += self._getFile(node);
  });

  output += '<codefragment>';
  if (this._diff) {
    for (i = 0; i < match.diffs.length; i++) {
      diff += '\n- ' + this._getFormattedLocation(nodes[0]) + '\n+ ' +
        this._getFormattedLocation(nodes[i + 1]) + '\n\n' +
        this._getFormattedDiff(match.diffs[i]);
    }
  }
  output += this._escape(diff) + '</codefragment>\n</duplication>\n';

  return output;
};

/**
 * Returns an XML string containing the path to the file in which the node is
 * located, as well as its starting line.
 *
 * @param   {Node}   node The node from which to get a formatted location
 * @returns {string} The formatted string
 */
PMDReporter.prototype._getFile = function(node) {
  var filePath = node.loc.source;

  // Convert any absolute paths to relative
  if (filePath.charAt(0) === '/') {
    filePath = path.relative(process.cwd(), filePath);
  }

  return '<file path="' + filePath + '" line="' + node.loc.start.line + '"/>\n';
};

/**
 * Returns an escaped string for use within XML.
 *
 * @param   {string} string The string to escape
 * @returns {string} The escaped string
 */
PMDReporter.prototype._escape = function(string) {
  var escaped = {
    "'": '&apos;',
    '"': '&quot;',
    '&': '&amp;',
    '>': '&gt;',
    '<': '&lt;'
  };

  return string.replace(/(['"&><])/g, function(string, char) {
    return escaped[char];
  });
};
