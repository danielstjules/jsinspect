var strip     = require('strip-indent');
var crypto    = require('crypto');
var nodeUtils = require('./nodeUtils');

class Match {
  /**
   * Creates a new Match.
   *
   * @constructor
   *
   * @param {Node[][]} nodeArrays Multi-dimensional array of nodes
   */
  constructor(nodeArrays, fileContents) {
    this.hash = this._generateUniqueHash(nodeArrays);
    this.instances = this._generateInstances(nodeArrays, fileContents);
  }

  /**
   * Generates a unique hash for a match.
   *
   * @param   {Node[][]} nodeArrays   Multi-dimensional array of nodes
   * @returns {String}
   */
  _generateUniqueHash(nodeArrays) {
    var str = nodeArrays
      .reduce((a, b) => a.concat(b))
      .map(node => node.name || node.type)
      .join(':');

    return crypto.createHash('sha1').update(str).digest('hex');
  }

  /**
   * Returns an array of objects containing the filename, start, end, and
   * lines associated with all instances of a match. Due to sibling traversal,
   * the end line must be searched for among the nodes, and isn't always
   * defined by the last node in the array.
   *
   * @param   {Node[][]} nodeArrays   Multi-dimensional array of nodes
   * @param   {object}   fileContents The file paths and their contents
   * @returns {String}   Lines corresponding to the supplied nodes
   */
  _generateInstances(nodeArrays, fileContents) {
    return nodeArrays.map((nodes) => {
      var filename = nodes[0].loc.filename;
      var start = nodes[0].loc.start;

      // The end line requires more careful approximation so as not to
      // accidentally include a large number of irrelevant src lines
      // from a large node
      var base = nodes.map(node => node.loc.start)
        .reduce((res, curr) => (res.line > curr.line) ? res : curr);

      var last = nodes[nodes.length - 1];
      var lastEnd = last.loc.end;
      if (lastEnd.line > base.line && !nodeUtils.getChildren(last).length) {
        base = lastEnd;
      }

      var maxEnd = nodes.map(node => node.loc.end)
        .reduce((res, curr) => (res.line > curr.line) ? res : curr);
      var end = maxEnd.line - base.line <= 2 ? maxEnd : base;

      var lines = fileContents[filename]
        .slice(start.line - 1, end.line)
        .join('\n');

      return {filename, start, end, lines: strip(lines)};
    });
  }
}

module.exports = Match;
