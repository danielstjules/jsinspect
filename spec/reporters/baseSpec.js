var expect       = require('expect.js');
var util         = require('util');
var chalk        = require('chalk');
var fixtures     = require('../fixtures');
var helpers      = require('../helpers');
var BaseReporter = require('../../lib/reporters/base.js');
var Inspector    = require('../../lib/inspector.js');

// A simple TestReporter for testing the BaseReporter
class TestReporter extends BaseReporter {
  constructor(inspector) {
    super(inspector);
    this._registerSummary();
  }

  _getOutput() {}
}

describe('BaseReporter', function() {
  var inspector, reporter;

  beforeEach(function() {
    helpers.captureOutput();
    inspector = new Inspector([fixtures.intersection], {
      threshold: 15
    });
    reporter = new TestReporter(inspector);
  });

  afterEach(function() {
    helpers.restoreOutput();
  });

  describe('constructor', function() {
    it('accepts an inspector as an argument', function() {
      expect(reporter._inspector).to.be(inspector);
    });

    it('registers a listener for the match event', function() {
      expect(inspector.listeners('match')).to.have.length(1);
    });
  });

  describe('given a match', function() {
    it('increments the number found', function() {
      inspector.emit('match', {});
      helpers.restoreOutput();
      expect(reporter._found).to.be(1);
    });

    it('invokes _getOutput', function() {
      reporter._getOutput = function(match) {
        return match;
      };

      inspector.emit('match', 'invoked');
      helpers.restoreOutput();
      expect(helpers.getOutput()).to.be('invoked');
    });
  });

  describe('summary', function() {
    it('can be printed on inspector end', function() {
      inspector.run();
      helpers.restoreOutput();
      expect(helpers.getOutput()).to.not.be(null);
    });

    it('prints the correct results if no matches were found', function() {
      inspector = new Inspector([fixtures.intersection], {
        threshold: 40
      });
      var reporter = new TestReporter(inspector);

      inspector.run();
      helpers.restoreOutput();
      expect(helpers.getOutput()).to.be('\nNo matches found across 1 file\n');
    });

    it('prints the correct results if matches were found', function() {
      inspector.run();
      helpers.restoreOutput();
      expect(helpers.getOutput()).to.be('\n1 match found across 1 file\n');
    });
  });
});
