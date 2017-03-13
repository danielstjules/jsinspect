var expect    = require('expect.js');
var Inspector = require('../lib/inspector.js');
var fixtures  = require('./fixtures');

describe('issues', function() {
  describe('issue 44', function() {
    it('supports re-exporting', function() {
      var emitted;
      var inspector = new Inspector([fixtures.issue44]);
      inspector.on('end', function() {
        emitted = true;
      });
      inspector.run();
      expect(emitted).to.be(true);
    });
  });
});
