var expect    = require('expect.js');
var fixtures  = require('./fixtures');
var helpers   = require('./helpers');
var nodeUtils = require('../lib/nodeUtils');

describe('nodeUtils', function() {
  describe('getIdentifierString', function() {
    it('returns an unordered string of identifiers', function() {
      // literals are returned in the order in which the node walker
      // visits them
      var nodes = helpers.parse(fixtures.identifiers);
      var string = nodeUtils.getIdentifierString(nodes);

      expect(string).to.be('cache:storage:cache:key:key:get:storage:cache:' +
        'key:val:key:val:set:storage');
    });
  });
});
