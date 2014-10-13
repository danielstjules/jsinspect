var expect       = require('expect.js');
var util         = require('util');
var chalk        = require('chalk');
var fixtures     = require('../fixtures');
var BaseReporter = require('../../lib/reporters/base.js');
var Inspector    = require('../../lib/inspector.js');

// A simple TestReporter for testing the BaseReporter
function TestReporter(inspector) {
  BaseReporter.call(this, inspector);
  this._registerSummary();
}

util.inherits(TestReporter, BaseReporter);

TestReporter.prototype._getOutput = function(magicNumber) {
  return magicNumber.value;
};

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

  describe('summary', function() {
    var enabled, write, restoreWrite, output;

    enabled = chalk.enabled;
    write = process.stdout.write;
    restoreWrite = function() {
      process.stdout.write = write;
    };

    beforeEach(function() {
      chalk.enabled = false;
      output = null;
      process.stdout.write = function(string) {
        output = string;
      };
    });

    afterEach(function() {
      chalk.enabled = enabled;
    });

    it('can be printed on inspector end', function() {
      var inspector = new Inspector([fixtures.intersection]);
      var reporter = new TestReporter(inspector);

      inspector.run();
      restoreWrite();

      expect(output).to.not.be(null);
    });

    it('prints the correct results if no matches were found', function() {
      var inspector = new Inspector([fixtures.intersection], {
        threshold: 40
      });
      var reporter = new TestReporter(inspector);

      inspector.run();
      restoreWrite();

      expect(output).to.be("\n No matches found across 1 file\n");
    });

    it('prints the correct results if magic numbers were found', function() {
      var inspector = new Inspector([fixtures.intersection]);
      var reporter = new TestReporter(inspector);

      inspector.run();
      restoreWrite();

      expect(output).to.be("\n 1 match found across 1 file\n");
    });
  });
});
