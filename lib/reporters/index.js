let MDReporter = require('./md.js');
module.exports = {
  default:  require('./default.js'),
  json:     require('./json.js'),
  pmd:      require('./pmd.js'),
  md:       MDReporter,
  markdown: MDReporter,
};
