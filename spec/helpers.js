var chalk = require('chalk');

var output, enabled, write;

output = '';
enabled = chalk.enabled;
write = process.stdout.write;

module.exports = {
  captureOutput: function() {
    chalk.enabled = false;
    output = '';
    process.stdout.write = function(string) {
      if (!string) return;
      output += string;
    };
  },

  getOutput: function() {
    return output;
  },

  restoreOutput: function() {
    chalk.enabled = enabled;
    process.stdout.write = write;
  }
};
