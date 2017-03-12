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
 * Returns an array of nodes in the passed AST, traversed using BFS. Accepts an
 * optional maximum number, n, of nodes to return. The returned array always
 * begins with the root node.
 *
 * @param {Node} node The root node of the AST to traverse
 * @param {int}  [n]  Optional max number of nodes to return
 */
nodeUtils.getBFSTraversal = function(node, n) {
  var queue, res, i, children;

  queue = [node];
  res = [node];

  while (queue.length) {
    node = queue.shift();

    if (n && res.length >= n) {
      return res.slice(0, n);
    }

    children = nodeUtils.getChildren(node) || [];
    for (i = 0; i < children.length; i++) {
      queue.push(children[i]);
      res.push(children[i]);
    }
  }

  return res.slice(0, n);
};

/**
 * Returns an array of nodes in the passed AST, traversed using DFS. Accepts an
 * optional maximum number, n, of nodes to return. The returned array always
 * begins with the root node.
 *
 * @param {Node} node The root node of the AST to traverse
 * @param {int}  [n]  Optional max number of nodes to return
 */
nodeUtils.getDFSTraversal = function(node, n) {
  var res = [];

  var dfs = (node) => {
    if (n && res.length >= n) return;
    res.push(node);
    nodeUtils.getChildren(node).forEach(dfs);
  };

  dfs(node);

  return res.slice(0, n);
}

/**
 * Cache for getChildren, holding the keys to traverse for a given Node type.
 */
nodeUtils.childKeys = {};

/**
 * Returns a given node's children as an array of nodes. Designed for use
 * with acorn's ASTs.
 *
 * @param   {Node}   The node for which to retrieve its children
 * @returns {Node[]} An array of child nodes
 */
nodeUtils.getChildren = function(node) {
  var res = [];

  if (!nodeUtils.childKeys[node.type]) {
    nodeUtils.childKeys[node.type] = Object.keys(node).filter((key) => {
      return typeof node[key] === 'object';
    });
  }

  nodeUtils.childKeys[node.type].forEach((key) => {
    var val = node[key];
    if (val instanceof Array) {
      res = res.concat(val);
    } else if (val && val.type) {
      res.push(val);
    }
  });

  return res;
}

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
 * Returns whether or not the nodes are part of ES6 module declarations.
 *
 * @param   {nodes[]} Array of nodes to check
 * @returns {boolean} Whether or not they're part of an import or export
 */
nodeUtils.isES6Module = function(nodes) {
  var types = ['ExportAllDeclaration', 'ExportDefaultDeclaration',
    'ExportNamedDeclaration', 'ImportDeclaration'];

  if (!nodes[0]) {
    return false;
  } else {
    return (types.indexOf(nodes[0].type) !== -1);
  }
}

/**
 * Returns whether or not the nodes are part of an AMD require or define
 * expression.
 *
 * @param   {nodes[]} Array of nodes to check
 * @returns {boolean} Whether or not it's part of the dependencies
 */
nodeUtils.isAMD = function(nodes) {
  var i, callee, hasAMDName;

  hasAMDName = function(node) {
    if (!node || !node.name) return;
    return (node.name === 'define' || node.name === 'require');
  }

  // Iterate from last node
  for (i = nodes.length - 1; i >= nodes.length - 5; i--) {
    if (!nodes[i]) {
      return false;
    } else if (nodes[i].type !== 'ExpressionStatement' ||
        nodes[i].expression.type !== 'CallExpression') {
      continue;
    }

    // Handle basic cases where define/require are a property
    callee = nodes[i].expression.callee;
    if (hasAMDName(callee)) {
      return true;
    } else if (callee.type === 'MemberExpression' &&
        hasAMDName(callee.property)) {
      return true;
    }
  }

  return false;
};

/**
 * Returns whether or not the nodes are part of a CommonJS require statement.
 *
 * @param   {nodes[]} Array of nodes to check
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
 * @param   {string}    key   Key corresponding to original the found match
 * @param   {nodes[][]} nodes The groups of nodes to further group
 * @param   {function}  fn    Synchronous function for generating group ids
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
