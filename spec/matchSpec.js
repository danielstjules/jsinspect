var expect    = require('expect.js');
var Match     = require('../lib/match');
var fixtures  = require('./fixtures');
var NodeUtils = require('../lib/nodeUtils');
var crypto    = require('crypto');

describe('Match', function() {
  var nodeArrays = [
    [{
      type: 'BlockStatement',
      loc: {filename: 'a', start: {line: 1, column: 0}, end: {line: 2, column: 3}}
    }],
    [{
      type: 'Literal',
      loc: {filename: 'a', start: {line: 3, column: 0}, end: {line: 3, column: 3}}
    }]
  ];

  it('has a hash based on the node types', function() {
    var match = new Match(nodeArrays);
    var str = 'BlockStatement:Literal';
    var sha1 = crypto.createHash('sha1').update(str).digest('hex');
    expect(match.hash).to.be(sha1);
  });

  it('stores instance objects containing filename, start and end', function() {
    var match = new Match(nodeArrays);
    expect(match.instances).to.have.length(2);
    expect(match.instances[0]).to.eql(nodeArrays[0][0].loc);
  });

  it('uses the minimum start value of nodes in an instance', function() {
    var match = new Match([[
      {
        type: 'a',
        loc: {filename: 'a', start: {line: 2, column: 0}, end: {line: 2, column: 0}}
      },
      {
        type: 'a',
        loc: {filename: 'a', start: {line: 1, column: 2}, end: {line: 1, column: 2}}
      },
      {
        type: 'a',
        loc: {filename: 'a', start: {line: 1, column: 0}, end: {line: 1, column: 0}}
      },
      {
        type: 'a',
        loc: {filename: 'a', start: {line: 3, column: 0}, end: {line: 3, column: 0}}
      }
    ]]);
    expect(match.instances[0].start).to.eql({line: 1, column: 0});
  });

  describe('populateLines', function() {
    it('adds the relevant source lines as a prop to each instance', function() {
      var match = new Match(nodeArrays);
      match.populateLines({
        a: ['foo', 'bar', 'baz']
      });
      expect(match.instances[0].lines).to.eql('foo\nbar');
      expect(match.instances[1].lines).to.eql('baz');
    });
  });
});
