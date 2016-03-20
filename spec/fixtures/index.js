var path = require('path');

var absolutePaths = {};
var fixtures = ['intersection', 'redundantIntersection', 'indentation',
  'identifiers', 'es6Module', 'commonjs', 'amd', 'simple', 'smallDiffs',
  'matches'];

fixtures.forEach(function(fixture) {
  absolutePaths[fixture] = path.resolve(__dirname, fixture + '.js');
});

module.exports = absolutePaths;
