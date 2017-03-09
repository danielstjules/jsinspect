var path   = require('path');
var dirmap = require('dirmap');

module.exports = dirmap(path.resolve(__dirname), true);
