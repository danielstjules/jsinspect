var expect    = require('expect.js');
var fixtures  = require('./fixtures');
var helpers   = require('./helpers');
var nodeUtils = require('../lib/nodeUtils');

describe('nodeUtils', function() {
  describe('getIdentifierString', function() {
    // acorn walker traverses with DFS, but unfortunately invokes the
    // callbacks on children first

    it('returns an unordered string of identifiers', function() {
      // Simplify by only using intersectionA
      var nodes = [helpers.parse(fixtures.intersection)[0]];
      var string = nodeUtils.getIdentifierString(nodes);

      expect(string).to.be('array1:filter:array2:indexOf:n:n:intersectionA:' +
        'array1:array2');
    });

    it('traverses literals in member, object and function expressions', function() {
      var nodes = helpers.parse(fixtures.identifiers);
      var string = nodeUtils.getIdentifierString(nodes);

      expect(string).to.be('cache:storage:cache:key:key:get:storage:cache:' +
        'key:val:key:val:set:storage');
    });
  });
});
