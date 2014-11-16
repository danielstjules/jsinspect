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

    it('registers a listener for the match event', function() {
      var inspector = new Inspector(['']);
      var reporter = new DefaultReporter(inspector);
      expect(inspector.listeners('match')).to.have.length(1);
    });

    it('registers a listener for the end event', function() {
      var inspector = new Inspector(['']);
      var reporter = new DefaultReporter(inspector);
      expect(inspector.listeners('end')).to.have.length(1);
    });
  });

  describe('given a match', function() {
    beforeEach(function() {
      helpers.captureOutput();
    });

    it('prints the number of instances, and their location', function() {
      var inspector = new Inspector([fixtures.intersection]);
      var reporter = new DefaultReporter(inspector, {
      });

      inspector.removeAllListeners('end');
      inspector.run();
      helpers.restoreOutput();

      expect(helpers.getOutput()).to.be(
        '\nMatch - 2 instances\n' +
        'spec/fixtures/intersection.js:1,5\n' +
        'spec/fixtures/intersection.js:7,11\n'
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
        '\nMatch - 2 instances\n' +
        'spec/fixtures/intersection.js:1,5\n' +
        'spec/fixtures/intersection.js:7,11\n\n' +
        '- spec/fixtures/intersection.js:1,5\n' +
        '+ spec/fixtures/intersection.js:7,11\n'+
        '+  function intersectionB(arrayA, arrayB) {\n' +
        '+    arrayA.filter(function(n) {\n' +
        '+      return arrayB.indexOf(n) != -1;\n' +
        '-  function intersectionA(array1, array2) {\n' +
        '-    array1.filter(function(n) {\n' +
        '-      return array2.indexOf(n) != -1;\n' +
        '     });\n   }\n'
      );
    });
  });
});
