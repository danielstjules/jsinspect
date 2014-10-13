var expect   = require('expect.js');
var fs       = require('fs');
var parse    = require('acorn/acorn_loose').parse_dammit;
var fixtures = require('./fixtures');
var Match    = require('../lib/match.js');

describe('Match', function() {
  describe('constructor', function() {
    it('accepts an array of nodes, storing them at match.nodes', function() {
      var mockNodes = [{type: 'FunctionDeclaration'}, {type: 'Literal'}];
      var match = new Match(mockNodes);
      expect(match.nodes).to.be(mockNodes);
    });

    it('initializes the object with an empty array for match.diffs', function() {
      var match = new Match([]);
      expect(match.diffs).to.eql([]);
    });
  });

  describe('generateDiffs', function() {
    var ast, contents;

    before(function() {
      var intersection = fs.readFileSync(fixtures.intersection, {
        encoding: 'utf8'
      });

      contents = {};
      contents[fixtures.intersection] = intersection.split("\n");

      ast = parse(intersection, {
        ecmaVersion: 6,
        allowReturnOutsideFunction: true,
        locations: true,
        sourceFile: fixtures.intersection
      });
    });

    it('uses jsdiff to generate a diff of two nodes', function() {
      var nodes = [ast.body[0], ast.body[1]];
      var match = new Match(nodes);
      match.generateDiffs(contents);

      var expectedDiffs = [[
        {
          value: 'function intersectionB(arrayA, arrayB) {\n  ' +
                  'arrayA.filter(function(n) {\n    '+
                  'return arrayB.indexOf(n) != -1;\n',
          added: true,
          removed: undefined
        },
        {
          value: 'function intersectionA(array1, array2) {\n  '+
                 'array1.filter(function(n) {\n    ' +
                 'return array2.indexOf(n) != -1;\n',
          added: undefined,
          removed: true
        },
        {
          value: '  });\n}',
          added: undefined,
          removed: undefined
        }
      ]];

      expect(match.diffs).to.eql(expectedDiffs);
    });
  });
});
