var expect          = require('expect.js');
var util            = require('util');
var chalk           = require('chalk');
var fixtures        = require('../fixtures');
var DefaultReporter = require('../../lib/reporters/default.js');
var Inspector       = require('../../lib/inspector.js');

describe('DefaultReporter', function() {
  describe('constructor', function() {
    it('accepts an inspector as an argument', function() {
      var inspector = new Inspector(['']);
      var reporter = new DefaultReporter(inspector);
      expect(reporter._inspector).to.be(inspector);
    });

    it('registers a listener for the match event', function() {
      var inspector = new Inspector(['']);
      var reporter = new DefaultReporter(inspector);
      expect(inspector.listeners('match')).to.have.length(1);
    });
  });
});
