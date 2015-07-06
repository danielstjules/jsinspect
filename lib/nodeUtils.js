var acornWalk = require('acorn/dist/walk');

var nodeUtils = {};
module.exports = nodeUtils;

/**
 * Given an array of nodes, the function returns a colon-delimited string
 * of identifiers found within each node, as well as their children.
 *
 * @var {function}
 *
 * @param   {Node[]} An array of nodes for which to return a string of ids
 * @returns {string} A colon-delimited string of identifiers
 */
nodeUtils.getIdentifierString = function(nodes) {
  var identifiers, nodeTypes, processed;

  identifiers = [];
  processed = [];

  var addNode = function(node) {
    if (processed.indexOf(node) !== -1) return;

    processed.push(node);
    identifiers.push(node.name);
  };

  nodes.forEach(function(node) {
    if (processed.indexOf(node) !== -1) {
      return;
    }

    // The existing walker in acorn (confirmed 0.9) doesn't correctly walk
    // all node types. It especially ignores identifiers. But their walker is
    // still faster than iterating over all properties, so this logic tries
    // to make up for its minor issues.
    // Todo: Propose improvements to the bundled walker
    acornWalk.simple(node, {
      Identifier: addNode,
      Property: function(node) {
        if (!node.key || node.key.type !== 'Identifier') return;
        addNode(node.key);
      },
      FunctionDeclaration: function(node) {
        if (node.id && node.id.type === 'Identifier') {
          addNode(node.id);
        }

        if (!node.params || !(node.params instanceof Array)) return;

        node.params.forEach(function(param) {
          if (param.type !== 'Identifier') return;
          addNode(param);
        });
      },
      MemberExpression: function(node) {
        if (!node.property || node.property.type !== 'Identifier') return;
        addNode(node.property);
      },
      ObjectExpression: function(node) {
        if (!node.properties || !(node.properties instanceof Array)) return;

        node.properties.forEach(function(property) {
          if (!property.key || property.key.type !== 'Identifier') return;
          addNode(property.key);
        });
      },
      FunctionExpression: function(node) {
        if (!node.params || !(node.params instanceof Array)) return;
        node.params.forEach(function(param) {
          if (param.type !== 'Identifier') return;
          addNode(param);
        });
      },
      VariableDeclaration: function(node) {
        if (!node.declarations || !(node.declarations instanceof Array)) return;

        node.declarations.forEach(function(declaration) {
          if (declaration.type !== 'VariableDeclarator' ||
              declaration.id.type !== 'Identifier') {
            return;
          }
          addNode(declaration.id);
        });
      }
    });

    if (processed.indexOf(node) === -1) {
      processed.push(node);
    }
  });

  return identifiers.join(':');
};

/**
 * Accepts a key, identifying the key on each node to traverse, as well as a
 * multi-dimensional array of nodes corresponding to nodes matched by node
 * type, and thus structural similarity. Iterates over the groups, further
 * splitting them based on matching identifiers.
 *
 * @param   {string}    key   Key corresponding to original the found match
 * @param   {nodes[][]} nodes The groups of nodes to group by identifiers
 * @returns {nodes[][]} Nodes grouped by the passed function
 */
nodeUtils.groupByMatchingIds = function(key, nodes) {
  return group(key, nodes, nodeUtils.getIdentifierString);
};

/**
 * Returns whether or not the nodes are part of an AMD require or define
 * expression.
 *
 * @param   {nodes[]} Array of nodes for to check
 * @returns {boolean} Whether or not it's part of the dependencies
 */
nodeUtils.isAMD = function(nodes) {
  // Iterate from last node
  for (var i = nodes.length - 1; i >= nodes.length - 4; i--) {
    if (!nodes[i]) return false;

    if (nodes[i].type === 'ExpressionStatement' &&
        nodes[i].expression.type === 'CallExpression' &&
        (nodes[i].expression.callee.name === 'define' ||
         nodes[i].expression.callee.name === 'require')) {
      return true;
    }
  }

  return false;
};

/**
 * Returns whether or not the nodes are part of a CommonJS require statement.
 *
 * @param   {nodes[]} Array of nodes for to check
 * @returns {boolean} Whether or not it's part of a require statement
 */
nodeUtils.isCommonJS = function(nodes) {
  var j, declaration;

  if (!nodes[0]) {
    return false;
  } else if (nodes[0].type === 'ExpressionStatement' &&
      nodes[0].expression.type === 'CallExpression' &&
      nodes[0].expression.callee.name === 'require') {
    return true;
  } else if (nodes[0].type === 'VariableDeclaration' && nodes[0].declarations) {
    for (j = 0; j < nodes[0].declarations.length; j++) {
      declaration = nodes[0].declarations[j];

      if (declaration.type === 'VariableDeclarator' &&
          declaration.init &&
          declaration.init.type === 'CallExpression' &&
          declaration.init.callee.name === 'require') {
        return true;
      }
    }
  }

  return false;
};

/**
 * Accepts a key, identifying the key on each node to traverse, as well as a
 * multi-dimensional array of nodes corresponding to matches, thus far.
 * Groups are created based on the supplied function, which is expected to
 * return a string id.
 *
 * @param   {string}    key     Key corresponding to original the found match
 * @param   {nodes[][]} nodes   The groups of nodes to further group
 * @param   {function}  fn      Synchronous function for generating group ids
 * @returns {nodes[][]} Nodes grouped by the passed function
 */
function group(key, nodes, fn) {
  var groups, hash, hashKey, id, i, j;

  groups = [];
  hash = {};

  for (i = 0; i < nodes.length; i++) {
    for (j = 0; j < nodes[i].length; j++) {
      id = fn(nodes[i][j].keys[key]);
      if (!hash[id]) {
        hash[id] = [];
      }

      hash[id].push(nodes[i][j]);
    }

    for (id in hash) {
      groups.push(hash[id]);
    }

    hash = {};
  }

  return groups;
}
