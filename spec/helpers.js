var fs    = require('fs');
var parse = require('../lib/parser').parse;
var chalk = require('chalk');

var output = '';
var enabled = chalk.enabled;
var write = process.stdout.write;
var parseCache = {};

module.exports = {
  captureOutput: function() {
    chalk.enabled = false;
    output = '';
    process.stdout.write = function(string) {
      if (!string) return;
      output += string;
    };
  },

  collectMatches: function(inspector) {
    var array = [];
    inspector.on('match', function(match) {
      array.push(match);
    });
    return array;
  },

  getOutput: function() {
    return output;
  },

  restoreOutput: function() {
    chalk.enabled = enabled;
    process.stdout.write = write;
  },

  parse: function(filePath) {
    if (parseCache[filePath]) return parseCache[filePath];

    // Skip the root Program node
    var src = fs.readFileSync(filePath, {encoding: 'utf8'});
    var ast = parse(src, filePath).body;
    parseCache[filePath] = ast;

    return ast;
  }
};
