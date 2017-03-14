var expect    = require('expect.js');
var fixtures  = require('./fixtures');
var helpers   = require('./helpers');
var nodeUtils = require('../lib/nodeUtils');

describe('nodeUtils', function() {
  describe('getIdentifierString', function() {
    it('returns an unordered string of identifiers', function() {
      // Simplify by only using intersectionA
      var nodes = [helpers.parse(fixtures.intersection)[0]];
      var string = nodeUtils.getIdentifierString(nodes);
      expect(string).to.be(
        'intersectionA:array1:array2:array1:filter:n:array2:indexOf:n'
      );
    });

    it('traverses literals in member, object and function expressions', function() {
      var nodes = helpers.parse(fixtures.identifiers);
      var string = nodeUtils.getIdentifierString(nodes);
      expect(string).to.be(
        'storage:cache:get:key:storage:cache:key:set:key:val:storage:cache:key:val'
      );
    });
  });

  describe('isES6ModuleImport', function() {
    it('returns true for an import declaration', function() {
      // ImportDeclaration
      var nodes = [helpers.parse(fixtures.es6Module)[0]];
      expect(nodeUtils.isES6ModuleImport(nodes)).to.be(true);
    });

    it('returns false for export declaration', function() {
      // ExportNamedDeclaration
      var nodes = [helpers.parse(fixtures.es6Module)[1]];
      expect(nodeUtils.isES6ModuleImport(nodes)).to.be(false);
    });

    it('returns false otherwise', function() {
      var nodes = helpers.parse(fixtures.commonjs);
      expect(nodeUtils.isES6ModuleImport(nodes)).to.be(false);
    });
  });

  describe('isAMD', function() {
    it('returns true for an expression containing a define', function() {
      // First expression is define
      var nodes = [helpers.parse(fixtures.amd)[0]];
      expect(nodeUtils.isAMD(nodes)).to.be(true);
    });

    it('returns true for an expression containing a define', function() {
      // Third expression is require
      var nodes = [helpers.parse(fixtures.amd)[2]];
      expect(nodeUtils.isAMD(nodes)).to.be(true);
    });

    it('returns true even if the function is a property', function() {
      var nodes = [helpers.parse(fixtures.amd)[4]];
      expect(nodeUtils.isAMD(nodes)).to.be(true);
    });

    it('returns true even if a nested property', function() {
      var nodes = [helpers.parse(fixtures.amd)[6]];
      expect(nodeUtils.isAMD(nodes)).to.be(true);
    });

    it('returns false otherwise', function() {
      var nodes = helpers.parse(fixtures.commonjs);
      expect(nodeUtils.isAMD(nodes)).to.be(false);
    });
  });

  describe('isCommonJS', function() {
    it('returns true for an expression containing a require', function() {
      // First node is an ExpressionStatement
      var nodes = [helpers.parse(fixtures.commonjs)[0]];
      expect(nodeUtils.isCommonJS(nodes)).to.be(true);
    });

    it('returns true for a declaration containing a require', function() {
      // Second node is a VariableDeclaration
      var nodes = [helpers.parse(fixtures.commonjs)[1]];
      expect(nodeUtils.isCommonJS(nodes)).to.be(true);
    });

    it('returns false otherwise', function() {
      var nodes = helpers.parse(fixtures.amd);
      expect(nodeUtils.isCommonJS(nodes)).to.be(false);
    });
  });
});
