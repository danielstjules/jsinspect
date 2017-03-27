var strip     = require('strip-indent');
var crypto    = require('crypto');
var NodeUtils = require('./NodeUtils');

class Match {
  /**
   * Creates a new Match.
   *
   * @constructor
   *
   * @param {Node[][]} nodeArrays Multi-dimensional array of nodes
   */
  constructor(nodeArrays) {
    this.hash = this._getHash(nodeArrays);
    this.instances = this._generateInstances(nodeArrays);
  }

  /**
   * Populates each match instance with a lines property containing the
   * relevant source code lines.
   *
   * @param {object} fileContents The file paths and their contents
   */
   populateLines(fileContents) {
    this.instances.forEach(instance => {
      var lines = fileContents[instance.filename]
        .slice(instance.start.line - 1, instance.end.line)
        .join('\n');

      instance.lines = strip(lines);
    });
   }

  /**
   * Generates a hash for a match.
   *
   * @private
   *
   * @param   {Node[][]} nodeArrays   Multi-dimensional array of nodes
   * @returns {String}
   */
  _getHash(nodeArrays) {
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
   * @private
   *
   * @param   {Node[][]} nodeArrays   Multi-dimensional array of nodes
   * @returns {object}
   */
  _generateInstances(nodeArrays) {
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
      if (lastEnd.line > base.line && !NodeUtils.getChildren(last).length) {
        base = lastEnd;
      }

      var maxEnd = nodes.map(node => node.loc.end)
        .reduce((res, curr) => (res.line > curr.line) ? res : curr);
      var end = maxEnd.line - base.line <= 2 ? maxEnd : base;

      return {filename, start, end};
    });
  }
}

module.exports = Match;
