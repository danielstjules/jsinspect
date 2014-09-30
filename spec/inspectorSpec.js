var expect       = require('expect.js');
var EventEmitter = require('events').EventEmitter;
var fs           = require('fs');
var Inspector    = require('../lib/inspector.js');
var fixtures     = require('./fixtures');

describe('Inspector', function() {
  // Used to test emitted events
  var found;
  var listener = function(match) {
    found.push(match);
  };

  beforeEach(function() {
    found = [];
  });

  describe('constructor', function() {
    it('inherits from EventEmitter', function() {
      expect(new Inspector()).to.be.an(EventEmitter);
    });

    it('accepts an array of file paths', function() {
      var filePaths = ['path1.js', 'path2.js'];
      var inspector = new Inspector(filePaths);

      expect(inspector._filePaths).to.be(filePaths);
    });

    it('accepts an options object', function() {
      var opts = {
        fuzzy: Inspector.fuzzyTypes.both,
        distance: 10,
        threshold: 12,
        diff: false
      };

      var inspector = new Inspector([], opts);

      expect(inspector._fuzzy).to.be(opts.fuzzy);
      expect(inspector._distance).to.be(opts.distance);
      expect(inspector._threshold).to.be(opts.threshold);
      expect(inspector._diff).to.be(opts.diff);
    });

    it('assigns a default fuzzy type of head', function() {
      var inspector = new Inspector([]);
      expect(inspector._fuzzy).to.be(Inspector.fuzzyTypes.head);
    });

    it('assigns a default fuzzy distance of 0', function() {
      var inspector = new Inspector([]);
      expect(inspector._distance).to.be(0);
    });

    it('assigns a default threshold of 11', function() {
      var inspector = new Inspector([]);
      expect(inspector._threshold).to.be(11);
    });
  });

  describe('run', function() {
    it('emits a start event', function() {
      var emitted;
      var inspector = new Inspector([fixtures['intersection.js']]);
      inspector.on('start', function() {
        emitted = true;
      });

      inspector.run();
      expect(emitted).to.be(true);
    });

    it('emits an end event', function() {
      var emitted;
      var inspector = new Inspector([fixtures['intersection.js']]);
      inspector.on('end', function() {
        emitted = true;
      });

      inspector.run();
      expect(emitted).to.be(true);
    });

    it('emits the "identical" event when an exact match is found', function() {
      var inspector = new Inspector([fixtures['intersection.js']]);
      inspector.on('identical', listener);
      inspector.run();

      expect(found).to.have.length(1);
    });
  });

  it('can find an exact match between two nodes', function() {
    var inspector = new Inspector([fixtures['intersection.js']]);
    inspector.on('identical', listener);
    inspector.run();

    expect(found).to.have.length(1);
    expect(found[0]).to.have.length(2);

    expect(found[0][0].type).to.be('FunctionDeclaration');
    expect(found[0][0].loc.start).to.eql({line: 1, column: 0});
    expect(found[0][0].loc.end).to.eql({line: 5, column: 1});

    expect(found[0][1].type).to.be('FunctionDeclaration');
    expect(found[0][1].loc.start).to.eql({line: 7, column: 0});
    expect(found[0][1].loc.end).to.eql({line: 11, column: 1});
  });

  it('can find the largest match between two nodes', function() {
    var inspector = new Inspector([fixtures['redundantIntersection.js']]);
    inspector.on('identical', listener);
    inspector.run();

    expect(found).to.have.length(1);
    expect(found[0]).to.have.length(2);

    expect(found[0][0].type).to.be('FunctionDeclaration');
    expect(found[0][0].loc.start).to.eql({line: 1, column: 0});
    expect(found[0][0].loc.end).to.eql({line: 9, column: 1});

    expect(found[0][1].type).to.be('FunctionDeclaration');
    expect(found[0][1].loc.start).to.eql({line: 11, column: 0});
    expect(found[0][1].loc.end).to.eql({line: 19, column: 1});
  });
});
