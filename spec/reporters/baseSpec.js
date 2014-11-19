  var expect       = require('expect.js');
var util         = require('util');
var chalk        = require('chalk');
var fixtures     = require('../fixtures');
var helpers      = require('../helpers');
var BaseReporter = require('../../lib/reporters/base.js');
var Inspector    = require('../../lib/inspector.js');

// A simple TestReporter for testing the BaseReporter
function TestReporter(inspector) {
  BaseReporter.call(this, inspector);
  this._registerSummary();
}

util.inherits(TestReporter, BaseReporter);
TestReporter.prototype._getOutput = function() {};

describe('BaseReporter', function() {
  describe('constructor', function() {
    it('accepts an inspector as an argument', function() {
      var inspector = new Inspector(['']);
      var reporter = new BaseReporter(inspector);
      expect(reporter._inspector).to.be(inspector);
    });

    it('registers a listener for the match event', function() {
      var inspector = new Inspector(['']);
      var reporter = new BaseReporter(inspector);
      expect(inspector.listeners('match')).to.have.length(1);
    });
  });

  describe('given a match', function() {
    beforeEach(function() {
      helpers.captureOutput();
    });

    it('increments the number found', function() {
      var inspector = new Inspector([fixtures.intersection]);
      var reporter = new TestReporter(inspector);

      inspector.emit('match', {});
      helpers.restoreOutput();

      expect(reporter._found).to.be(1);
    });

    it('invokes _getOutput', function() {
      var inspector = new Inspector([fixtures.intersection]);
      var reporter = new TestReporter(inspector);
      reporter._getOutput = function(match) {
        return match;
      };

      inspector.emit('match', 'invoked');
      helpers.restoreOutput();

      expect(helpers.getOutput()).to.be('invoked');
    });
  });

  describe('summary', function() {
    beforeEach(function() {
      helpers.captureOutput();
    });

    it('can be printed on inspector end', function() {
      var inspector = new Inspector([fixtures.intersection]);
      var reporter = new TestReporter(inspector);

      inspector.run();
      helpers.restoreOutput();

      expect(helpers.getOutput()).to.not.be(null);
    });

    it('prints the correct results if no matches were found', function() {
      var inspector = new Inspector([fixtures.intersection], {
        threshold: 40
      });
      var reporter = new TestReporter(inspector);

      inspector.run();
      helpers.restoreOutput();

      expect(helpers.getOutput()).to.be('\n No matches found across 1 file\n');
    });

    it('prints the correct results if matches were found', function() {
      var inspector = new Inspector([fixtures.intersection]);
      var reporter = new TestReporter(inspector);

      inspector.run();
      helpers.restoreOutput();

      expect(helpers.getOutput()).to.be('\n 1 match found across 1 file\n');
    });
  });
});
