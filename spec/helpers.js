var fs    = require('fs');
var parse = require('acorn/dist/acorn_loose').parse_dammit;
var chalk = require('chalk');

var output, enabled, write;

output = '';
enabled = chalk.enabled;
write = process.stdout.write;
parseCache = {};

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
    var contents, ast;

    if (parseCache[filePath]) return parseCache[filePath];

    contents = fs.readFileSync(filePath, {
      encoding: 'utf8'
    });

    // Skip the parent 'Program' node
    ast = parse(contents, {
      ecmaVersion: 6,
      allowReturnOutsideFunction: true,
      locations: true,
      sourceType: 'module',
      sourceFile: filePath
    }).body;

    parseCache[filePath] = ast;

    return ast;
  }
};
