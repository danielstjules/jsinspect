var expect   = require('expect.js');
var Match    = require('../lib/match');
var fixtures = require('./fixtures');
var crypto   = require('crypto');

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
