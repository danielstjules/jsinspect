var expect  = require('expect.js');
var helpers = require('./helpers');
var Parser  = require('../lib/parser');

describe('parse', function() {
  describe('on error', function() {
    var src = '[_, = [1, 2, 3];';
    var filePath = 'broken.js';

    it('includes the filename of the file that failed to parse', function() {
      var fn = () => Parser.parse(src, filePath);
      expect(fn).to.throwException((err) => {
        expect(err.message).to.contain(filePath);
      });
    });

    it('includes a caret pointing to the unexpected token', function() {
      var fn = () => Parser.parse(src, filePath);
      expect(fn).to.throwException((err) => {
        expect(err.message).to.contain(`${src}\n    ^`);
      });
    });

    it('does not include the src line if longer than 100 chars', function() {
      var src = ' '.repeat(100) + ']';
      var fn = () => Parser.parse(src, filePath);
      expect(fn).to.throwException((err) => {
        expect(err.message).not.to.contain(`^`);
      });
    });
  });
});
