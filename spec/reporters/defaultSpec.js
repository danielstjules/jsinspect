var expect          = require('expect.js');
var util            = require('util');
var chalk           = require('chalk');
var fixtures        = require('../fixtures');
var helpers         = require('../helpers');
var DefaultReporter = require('../../lib/reporters/default.js');
var Inspector       = require('../../lib/inspector.js');

describe('DefaultReporter', function() {
  describe('constructor', function() {
    it('accepts an inspector as an argument', function() {
      var inspector = new Inspector(['']);
      var reporter = new DefaultReporter(inspector);
      expect(reporter._inspector).to.be(inspector);
    });
  });

  it('prints the summary on end', function() {
    helpers.captureOutput();
    var inspector = new Inspector([fixtures.intersection], {
      threshold: 40
    });
    var reporter = new DefaultReporter(inspector);

    inspector.run();
    helpers.restoreOutput();

    expect(helpers.getOutput()).to.be('\n No matches found across 1 file\n');
  });

  describe('given a match', function() {
    beforeEach(function() {
      helpers.captureOutput();
    });

    it('prints the number of instances', function() {
      var inspector = new Inspector([fixtures.intersection]);
      var reporter = new DefaultReporter(inspector);

      inspector.removeAllListeners('end');
      inspector.run();
      helpers.restoreOutput();

      expect(helpers.getOutput()).to.be(
        '\n  Match - 2 instances\n' +
        '  spec/fixtures/intersection.js:1,5\n' +
        '  spec/fixtures/intersection.js:7,11\n'
      );
    });

    it('prints the diffs if enabled', function() {
      var inspector = new Inspector([fixtures.intersection], {
        diff: true,
      });
      var reporter = new DefaultReporter(inspector, {
        diff: true,
      });

      inspector.removeAllListeners('end');
      inspector.run();
      helpers.restoreOutput();

      expect(helpers.getOutput()).to.be(
        '\n  Match - 2 instances\n\n' +
        '- spec/fixtures/intersection.js:1,5\n' +
        '+ spec/fixtures/intersection.js:7,11\n'+
        '-  function intersectionA(array1, array2) {\n' +
        '-    array1.filter(function(n) {\n' +
        '-      return array2.indexOf(n) != -1;\n' +
        '+  function intersectionB(arrayA, arrayB) {\n' +
        '+    arrayA.filter(function(n) {\n' +
        '+      return arrayB.indexOf(n) != -1;\n' +
        '     });\n   }\n'
      );
    });
  });
});
