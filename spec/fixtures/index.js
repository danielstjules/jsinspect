var path = require('path');

var absolutePaths = {};
var fixtures = ['intersection', 'redundantIntersection', 'indentation',
  'identifiers', 'commonjs', 'amd', 'simple', 'smallDiffs'];

fixtures.forEach(function(fixture) {
  absolutePaths[fixture] = path.resolve(__dirname, fixture + '.js');
});

module.exports = absolutePaths;
