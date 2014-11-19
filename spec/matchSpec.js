var expect   = require('expect.js');
var parse    = require('acorn/acorn_loose').parse_dammit;
var fs       = require('fs');
var fixtures = require('./fixtures');
var Match    = require('../lib/match.js');

describe('Match', function() {
  describe('constructor', function() {
    it('accepts an array of nodes, storing them at match.nodes', function() {
      var mockNodes = [
        {type: 'FunctionDeclaration'},
        {type: 'Literal'}
      ];

      var match = new Match(mockNodes);
      expect(match.nodes).to.be(mockNodes);
    });

    it('initializes the object with an empty array for match.diffs', function() {
      var match = new Match([]);
      expect(match.diffs).to.eql([]);
    });
  });

  function getFixture(fixtureName){
    var ast, contents, content;

    content = fs.readFileSync(fixtures[fixtureName], {
      encoding: 'utf8'
    });

    contents = {};
    contents[fixtures[fixtureName]] = content.split('\n');

    ast = parse(content, {
      ecmaVersion: 6,
      allowReturnOutsideFunction: true,
      locations: true,
      sourceFile: fixtures[fixtureName]
    });

    return {ast: ast, contents: contents};
  }

  describe('generateDiffs', function() {
    it('uses jsdiff to generate a diff of two nodes', function() {
      var fixture = getFixture('intersection');
      var nodes = [fixture.ast.body[0], fixture.ast.body[1]];

      var match = new Match(nodes);
      match.generateDiffs(fixture.contents);

      expect(match.diffs).to.eql([[
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
      ]]);
    });

    it('strips indentation to generate clean diffs', function(){
      var fixture = getFixture('indentation');
      var nodes = [fixture.ast.body[0], fixture.ast.body[1]];

      var match = new Match(nodes);
      match.generateDiffs(fixture.contents);

      expect(match.diffs).to.eql([[
        {
          value: 'function intersectionA(array1, array2) {\n  '+
                 'array1.filter(function(n) {\n',
          added: undefined,
          removed: undefined
        },
        {
          value: '    return array2.indexOf(n) == -1;\n',
          added: true,
          removed: undefined
        },
        {
          value: '    return array2.indexOf(n) != -1;\n',
          added: undefined,
          removed: true
        },
        {
          value: '  });\n}',
          added: undefined,
          removed: undefined
        }
      ]]);
    });
  });
});
