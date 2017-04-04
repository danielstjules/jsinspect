var babylon   = require('babylon');
var debug     = require('./debug');
var acorn     = require('acorn/dist/acorn_loose');
var NodeUtils = require('./nodeUtils');

/**
 * Parses the specified src string with babylon or acorn, returning the
 * resulting AST and skipping the undocumented File root node, which is neither
 * Babylon AST nor ESTree spec compliant.
 *
 * @param {string} src      Source to parse
 * @param {string} filePath Path to the file
 */
exports.parse = function(src, filePath, force) {
  debug(`parsing ${filePath}`);
  try {
    var fns = [
      () => _babylonParse(src, filePath, 'script'),
      () => _babylonParse(src, filePath, 'module')
    ];

    if (force) fns.push(() => _acornParse(src, filePath, 'script'));

    return attempt(fns);
  } catch (err) {
    let ctx = getErrorContext(err, src);
    throw new Error(`Couldn't parse ${filePath}: ${err.message}${ctx}`);
  }
};

function attempt(fns) {
  for (let i = 0; i < fns.length; i++) {
    try {
      return fns[i]();
    } catch (err) {
      if (i === fns.length - 1) throw err;
    }
  }
}

function _babylonParse(src, filePath, sourceType) {
  return babylon.parse(src, {
    allowReturnOutsideFunction: true,
    allowImportExportEverywhere: true,
    sourceType: sourceType,
    sourceFilename: filePath,
    plugins: ['jsx', 'flow', 'doExpressions', 'objectRestSpread', 'decorators',
      'classProperties', 'exportExtensions', 'asyncGenerators', 'functionBind',
      'functionSent', 'dynamicImport']
  }).program;
}

function _acornParse(src, filePath, sourceType) {
  var ast = acorn.parse_dammit(src, {
    ecmaVersion: 6,
    allowReturnOutsideFunction: true,
    locations: true,
    sourceType: sourceType
  });

  // Normalize node values
  NodeUtils.walk(ast, (node) => {
  // With sourceFile set, acorn stores the filepath in loc.source, while
  // babylon stores it in loc.filename
    node.loc.filename = filePath;
  });

  return ast;
}

function getErrorContext(err, src) {
  if (!err.loc || !err.loc.line || err.loc.column >= 100) return '';

  var line = src.split('\n')[err.loc.line - 1];
  var caret = ' '.repeat(err.loc.column) + '^';

  return `\n${line}\n${caret}`;
}
