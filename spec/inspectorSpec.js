var expect       = require('expect.js');
var EventEmitter = require('events').EventEmitter;
var fs           = require('fs');
var Inspector    = require('../lib/inspector.js');
var Match        = require('../lib/match.js');
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
        threshold: 12,
        diff: false
      };

      var inspector = new Inspector([], opts);

      expect(inspector._threshold).to.be(opts.threshold);
      expect(inspector._diff).to.be(opts.diff);
    });

    it('assigns a default threshold of 15', function() {
      var inspector = new Inspector([]);
      expect(inspector._threshold).to.be(15);
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

    it('emits the "match" event when a match is found', function() {
      var inspector = new Inspector([fixtures['intersection.js']], {
        threshold: 10
      });

      inspector.on('match', listener);
      inspector.run();

      expect(found).to.have.length(1);
    });
  });

  it('can find an exact match between two nodes', function() {
    var inspector = new Inspector([fixtures['intersection.js']], {
      threshold: 15
    });

    inspector.on('match', listener);
    inspector.run();

    var match = found[0];
    expect(found).to.have.length(1);
    expect(match.nodes).to.have.length(2);

    expect(match.nodes[0].type).to.be('FunctionDeclaration');
    expect(match.nodes[0].loc.start).to.eql({line: 1, column: 0});
    expect(match.nodes[0].loc.end).to.eql({line: 5, column: 1});

    expect(match.nodes[1].type).to.be('FunctionDeclaration');
    expect(match.nodes[1].loc.start).to.eql({line: 7, column: 0});
    expect(match.nodes[1].loc.end).to.eql({line: 11, column: 1});
  });

  it('will find the largest match between two nodes', function() {
    var inspector = new Inspector([fixtures['redundantIntersection.js']], {
      threshold: 11
    });

    inspector.on('match', listener);
    inspector.run();

    var match = found[0];
    expect(found).to.have.length(1);
    expect(match.nodes).to.have.length(2);

    expect(match.nodes[0].type).to.be('FunctionDeclaration');
    expect(match.nodes[0].loc.start).to.eql({line: 1, column: 0});
    expect(match.nodes[0].loc.end).to.eql({line: 9, column: 1});

    expect(match.nodes[1].type).to.be('FunctionDeclaration');
    expect(match.nodes[1].loc.start).to.eql({line: 11, column: 0});
    expect(match.nodes[1].loc.end).to.eql({line: 19, column: 1});
  });

  it('includes a diff with the match, if enabled', function() {
    var inspector = new Inspector([fixtures['intersection.js']], {
      threshold: 11,
      diff: true
    });

    inspector.on('match', listener);
    inspector.run();

    var match = found[0];
    expect(found).to.have.length(1);
    expect(match.nodes).to.have.length(2);
    expect(match.diffs).to.have.length(1);
    expect(match.diffs[0]).to.have.length(3);
  });
});
