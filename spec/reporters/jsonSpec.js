var expect       = require('expect.js');
var util         = require('util');
var chalk        = require('chalk');
var fixtures     = require('../fixtures');
var helpers      = require('../helpers');
var JSONReporter = require('../../lib/reporters/json.js');
var Inspector    = require('../../lib/inspector.js');

describe('JSONReporter', function() {
  describe('constructor', function() {
    it('accepts an inspector as an argument', function() {
      var inspector = new Inspector(['']);
      var reporter = new JSONReporter(inspector);
      expect(reporter._inspector).to.be(inspector);
    });

    it('registers a listener for the match event', function() {
      var inspector = new Inspector(['']);
      var reporter = new JSONReporter(inspector);
      expect(inspector.listeners('match')).to.have.length(1);
    });

    it('registers a listener for the start event', function() {
      var inspector = new Inspector(['']);
      var reporter = new JSONReporter(inspector);
      expect(inspector.listeners('start')).to.have.length(1);
    });

    it('registers a listener for the end event', function() {
      var inspector = new Inspector(['']);
      var reporter = new JSONReporter(inspector);
      expect(inspector.listeners('end')).to.have.length(1);
    });
  });

  describe('given a match', function() {
    beforeEach(function() {
      helpers.captureOutput();
    });

    it('prints the number of instances, and their location', function() {
      var inspector = new Inspector([fixtures.smallDiffs], {
        threshold: 1
      });
      var reporter = new JSONReporter(inspector);

      inspector.removeAllListeners('start');
      inspector.removeAllListeners('end');

      inspector.run();
      helpers.restoreOutput();

      var parsedOutput = JSON.parse(helpers.getOutput());
      expect(parsedOutput).to.eql({
        instances: [
          {path: 'spec/fixtures/smallDiffs.js', lines: [1,1]},
          {path: 'spec/fixtures/smallDiffs.js', lines: [2,2]},
          {path: 'spec/fixtures/smallDiffs.js', lines: [3,3]}
        ]
      });
    });

    it('prints the diffs if enabled', function() {
      var inspector = new Inspector([fixtures.smallDiffs], {
        diff: true,
        threshold: 1
      });
      var reporter = new JSONReporter(inspector, {
        diff: true
      });

      inspector.removeAllListeners('start');
      inspector.removeAllListeners('end');

      inspector.run();
      helpers.restoreOutput();

      var diffs = JSON.parse(helpers.getOutput()).diffs;
      expect(diffs).to.eql([
        {
          '+': {
            lines: [2,2],
            path: 'spec/fixtures/smallDiffs.js'
          },
          '-': {
            lines: [1,1],
            path: 'spec/fixtures/smallDiffs.js'
          },
          diff: '+  test = function() { return 2; };\n-  test = function() { return 1; };\n'
        },
        {
          '+': {
            lines: [3,3],
            path: 'spec/fixtures/smallDiffs.js'
          },
          '-': {
            lines: [1,1],
            path: 'spec/fixtures/smallDiffs.js'
          },
          diff: '+  test = function() { return 3; };\n-  test = function() { return 1; };\n'
        }
      ]);
    });
  });
});
