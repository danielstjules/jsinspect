var babylon = require('babylon');

/**
 * Parses the specified src string with babylon, returning the resulting AST
 * and skipping the undocumented File root node, which is neither Babylon AST
 * nor ESTree spec compliant.
 *
 * @param {string} src      Source to parse
 * @param {string} filePath Path to the file
 */
exports.parse = function(src, filePath) {
  try {
    return _parse(src, filePath, 'script');
  } catch (err) {
    return _parse(src, filePath, 'module');
  }
};

function _parse(src, filePath, sourceType) {
  return babylon.parse(src, {
    allowReturnOutsideFunction: true,
    allowImportExportEverywhere: true,
    sourceType: 'module',
    sourceFilename: filePath,
    plugins: ['jsx', 'flow', 'doExpressions', 'objectRestSpread', 'decorators',
      'classProperties', 'exportExtensions', 'asyncGenerators', 'functionBind',
      'functionSent', 'dynamicImport']
  }).program;
}
