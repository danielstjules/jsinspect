var expect      = require('expect.js');
var util        = require('util');
var chalk       = require('chalk');
var fixtures    = require('../fixtures');
var helpers     = require('../helpers');
var MdReporter = require('../../lib/reporters/md');
var Inspector   = require('../../lib/inspector');

describe('MdReporter', function() {
  afterEach(function() {
    helpers.restoreOutput();
  });

  describe('constructor', function() {
    it('accepts an inspector as an argument', function() {
      var inspector, reporter;

      inspector = new Inspector(['']);
      reporter = new MdReporter(inspector);
      expect(reporter._inspector).to.be(inspector);
    });
  });

  describe('given a match', function() {
    beforeEach(function() {
      helpers.captureOutput();
    });

    it('prints correct with markdown reporter', function() {
      var inspector, reporter, matches;

      inspector = new Inspector([fixtures.smallLines], {threshold: 1});
      reporter = new MdReporter(inspector);
      matches = helpers.collectMatches(inspector);

      inspector.removeAllListeners('start');
      inspector.removeAllListeners('end');

      inspector.run();
      helpers.restoreOutput();

      var expected = helpers.trimlines(
        `#### ID: *${matches[0].hash}*,  Duplicate-Lines: 3
        
        - ${fixtures.smallLines}: 1        
        - ${fixtures.smallLines}: 2        
        - ${fixtures.smallLines}: 3
        
        \`\`\`js
        // spec/fixtures/smallLines.js:1,1
        test = function() { return 1; };

        // spec/fixtures/smallLines.js:2,2
        test = function() { return 2; };

        // spec/fixtures/smallLines.js:3,3
        test = function() { return 3; };
        \`\`\`
        
        ---
        
        `);

      expect(helpers.getOutput()).to.eql(expected);
    });
  });
});
