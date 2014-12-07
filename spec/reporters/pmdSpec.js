var expect      = require('expect.js');
var util        = require('util');
var chalk       = require('chalk');
var fixtures    = require('../fixtures');
var helpers     = require('../helpers');
var PMDReporter = require('../../lib/reporters/pmd.js');
var Inspector   = require('../../lib/inspector.js');

describe('PMDReporter', function() {
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
      var inspector, reporter;

      inspector = new Inspector([fixtures.smallDiffs], {threshold: 1});
      reporter = new PMDReporter(inspector);

      inspector.removeAllListeners('start');
      inspector.removeAllListeners('end');

      inspector.run();
      helpers.restoreOutput();

      expect(helpers.getOutput()).to.eql(
        '<duplication lines=\"3\">\n' +
        '<file path=\"' + fixtures.smallDiffs + '\" line=\"1\"/>\n' +
        '<file path=\"' + fixtures.smallDiffs + '\" line=\"2\"/>\n' +
        '<file path=\"' + fixtures.smallDiffs + '\" line=\"3\"/>\n' +
        '<codefragment></codefragment>\n' +
        '</duplication>\n'
      );
    });

    it('prints diffs if enabled, within a codefragment element', function() {
      var inspector, reporter, absolutePath;

      inspector = new Inspector([fixtures.smallDiffs], {
        diff: true,
        threshold: 1
      });
      reporter = new PMDReporter(inspector, {diff: true});

      inspector.removeAllListeners('start');
      inspector.removeAllListeners('end');

      inspector.run();
      helpers.restoreOutput();

      expect(helpers.getOutput()).to.eql(
        '<duplication lines=\"3\">\n' +
        '<file path=\"' + fixtures.smallDiffs + '\" line=\"1\"/>\n' +
        '<file path=\"' + fixtures.smallDiffs + '\" line=\"2\"/>\n' +
        '<file path=\"' + fixtures.smallDiffs + '\" line=\"3\"/>\n' +
        '<codefragment>\n' +
        '- spec/fixtures/smallDiffs.js:1,1\n' +
        '+ spec/fixtures/smallDiffs.js:2,2\n\n' +
        '+  test = function() { return 2; };\n' +
        '-  test = function() { return 1; };\n\n' +
        '- spec/fixtures/smallDiffs.js:1,1\n' +
        '+ spec/fixtures/smallDiffs.js:3,3\n\n' +
        '+  test = function() { return 3; };\n' +
        '-  test = function() { return 1; };\n' +
        '</codefragment>\n'+
        '</duplication>\n'
      );
    });
  });
});
