var parse = require('babylon').parse;

/**
 * Parses the specified src string with babylon, returning the resulting AST
 * and skipping the undocumented File root node, which is neither Babylon AST
 * nor ESTree spec compliant.
 *
 * @param {string} src      Source to parse
 * @param {string} filePath Path to the file
 */
exports.parse = function(src, filePath) {
  return parse(src, {
    allowReturnOutsideFunction: true,
    allowImportExportEverywhere: true,
    sourceType: 'module',
    sourceFilename: filePath,
    plugins: ['jsx', 'flow']
  }).program;
};
