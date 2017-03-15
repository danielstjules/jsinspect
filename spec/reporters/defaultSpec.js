var expect          = require('expect.js');
var util            = require('util');
var chalk           = require('chalk');
var fixtures        = require('../fixtures');
var helpers         = require('../helpers');
var DefaultReporter = require('../../lib/reporters/default.js');
var Inspector       = require('../../lib/inspector.js');

describe('DefaultReporter', function() {
  afterEach(function() {
    helpers.restoreOutput();
  });

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

    expect(helpers.getOutput()).to.be('\nNo matches found across 1 file\n');
  });

  describe('given a match', function() {
    beforeEach(function() {
      helpers.captureOutput();
    });

    it('prints the instances', function() {
      var inspector = new Inspector([fixtures.intersection], {
        threshold: 15
      });
      var reporter = new DefaultReporter(inspector);

      inspector.removeAllListeners('end');
      inspector.run();
      helpers.restoreOutput();

      var expected = `
------------------------------------------------------------

Match - 2 instances

spec/fixtures/intersection.js:1,5
function intersectionA(array1, array2) {
  array1.filter(function(n) {
    return array2.indexOf(n) != -1;
  });
}

spec/fixtures/intersection.js:7,11
function intersectionB(arrayA, arrayB) {
  arrayA.filter(function(n) {
    return arrayB.indexOf(n) != -1;
  });
}
`;

      expect(helpers.getOutput()).to.be(expected);
    });
  });
});
