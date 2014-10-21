var path = require('path');

var fixtures = ['intersection', 'redundantIntersection', 'indentation'];
var absolutePaths = {};

fixtures.forEach(function(fixture) {
  absolutePaths[fixture] = path.resolve(__dirname, fixture + '.js');
});

module.exports = absolutePaths;
