var expect      = require('expect.js');
var util        = require('util');
var chalk       = require('chalk');
var fixtures    = require('../fixtures');
var helpers     = require('../helpers');
var PMDReporter = require('../../lib/reporters/pmd');
var Inspector   = require('../../lib/inspector');

describe('PMDReporter', function() {
  afterEach(function() {
    helpers.restoreOutput();
  });

  describe('constructor', function() {
    it('accepts an inspector as an argument', function() {
      var inspector, reporter;

      inspector = new Inspector(['']);
      reporter = new PMDReporter(inspector);
      expect(reporter._inspector).to.be(inspector);
    });
  });

  describe('given a match', function() {
    beforeEach(function() {
      helpers.captureOutput();
    });

    it('prints paths and line numbers in a duplication element', function() {
      var inspector, reporter, matches;

      inspector = new Inspector([fixtures.smallLines], {threshold: 1});
      reporter = new PMDReporter(inspector);
      matches = helpers.collectMatches(inspector);

      inspector.removeAllListeners('start');
      inspector.removeAllListeners('end');

      inspector.run();
      helpers.restoreOutput();

      var expected = helpers.trimlines(
        `<duplication lines="3" id="${matches[0].hash}">
        <file path="${fixtures.smallLines}" line="1"/>
        <file path="${fixtures.smallLines}" line="2"/>
        <file path="${fixtures.smallLines}" line="3"/>
        <codefragment>
        spec/fixtures/smallLines.js:1,1
        test = function() { return 1; };

        spec/fixtures/smallLines.js:2,2
        test = function() { return 2; };

        spec/fixtures/smallLines.js:3,3
        test = function() { return 3; };
        </codefragment>
        </duplication>
      `);

      expect(helpers.getOutput()).to.eql(expected);
    });
  });
});
