var babylon = require('babylon');
var debug   = require('./debug');

/**
 * Parses the specified src string with babylon, returning the resulting AST
 * and skipping the undocumented File root node, which is neither Babylon AST
 * nor ESTree spec compliant.
 *
 * @param {string} src      Source to parse
 * @param {string} filePath Path to the file
 */
exports.parse = function(src, filePath) {
  debug(`parsing ${filePath}`);
  try {
    return _parse(src, filePath, 'script');
  } catch (err) {
    try {
      return _parse(src, filePath, 'module');
    } catch (err) {
      let ctx = getErrorContext(err, src);
      throw new Error(`Couldn't parse ${filePath}: ${err.message}${ctx}`);
    }
  }
};

function _parse(src, filePath, sourceType) {
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

function getErrorContext(err, src) {
  if (!err.loc || !err.loc.line) return '';

  var line = src.split('\n')[err.loc.line - 1];
  var caret = ' '.repeat(err.loc.column) + '^';

  return `\n${line}\n${caret}`;
}
