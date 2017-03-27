var expect    = require('expect.js');
var fixtures  = require('./fixtures');
var helpers   = require('./helpers');
var NodeUtils = require('../lib/NodeUtils');

describe('NodeUtils', function() {
  describe('getChildren', function() {
    it('ignores null children', function() {
      var node = helpers.parse(fixtures.nullChildren)[1].expression.left;
      // node.elements is an array with a leading null that should be ignored,
      // followed by an identifier
      var res = NodeUtils.getChildren(node);
      expect(res).to.have.length(1);
      expect(res[0].type).to.be('Identifier');
    });
  });

  describe('isES6ModuleImport', function() {
    it('returns true for an import declaration', function() {
      // ImportDeclaration
      var nodes = [helpers.parse(fixtures.es6Module)[0]];
      expect(NodeUtils.isES6ModuleImport(nodes)).to.be(true);
    });

    it('returns false for export declaration', function() {
      // ExportNamedDeclaration
      var nodes = [helpers.parse(fixtures.es6Module)[1]];
      expect(NodeUtils.isES6ModuleImport(nodes)).to.be(false);
    });

    it('returns false otherwise', function() {
      var nodes = helpers.parse(fixtures.commonjs);
      expect(NodeUtils.isES6ModuleImport(nodes)).to.be(false);
    });
  });

  describe('isAMD', function() {
    it('returns true for an expression containing a define', function() {
      // First expression is define
      var nodes = [helpers.parse(fixtures.amd)[0]];
      expect(NodeUtils.isAMD(nodes)).to.be(true);
    });

    it('returns true for an expression containing a define', function() {
      // Third expression is require
      var nodes = [helpers.parse(fixtures.amd)[2]];
      expect(NodeUtils.isAMD(nodes)).to.be(true);
    });

    it('returns true even if the function is a property', function() {
      var nodes = [helpers.parse(fixtures.amd)[4]];
      expect(NodeUtils.isAMD(nodes)).to.be(true);
    });

    it('returns true even if a nested property', function() {
      var nodes = [helpers.parse(fixtures.amd)[6]];
      expect(NodeUtils.isAMD(nodes)).to.be(true);
    });

    it('returns false otherwise', function() {
      var nodes = helpers.parse(fixtures.commonjs);
      expect(NodeUtils.isAMD(nodes)).to.be(false);
    });
  });

  describe('isCommonJS', function() {
    it('returns true for an expression containing a require', function() {
      // First node is an ExpressionStatement
      var nodes = [helpers.parse(fixtures.commonjs)[0]];
      expect(NodeUtils.isCommonJS(nodes)).to.be(true);
    });

    it('returns true for a declaration containing a require', function() {
      // Second node is a VariableDeclaration
      var nodes = [helpers.parse(fixtures.commonjs)[1]];
      expect(NodeUtils.isCommonJS(nodes)).to.be(true);
    });

    it('returns false otherwise', function() {
      var nodes = helpers.parse(fixtures.amd);
      expect(NodeUtils.isCommonJS(nodes)).to.be(false);
    });
  });
});
