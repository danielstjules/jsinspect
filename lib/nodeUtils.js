var acornWalk = require('acorn/util/walk');

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
    // all node types. But their walker is still faster than iterating over
    // all properties.
    // Todo: Propose improvements to the bundled walker
    acornWalk.simple(node, {
      Identifier: addNode,
      Property: function(node) {
        if (!node.key || node.key.type !== 'Identifier') return;
        addNode(node.key);
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
 * Returns whether or not the last node in an array is within the dependencies
 * list of an AMD module, as part of a call to "define".
 *
 * @param   {nodes[]} Array of nodes for to check
 * @returns {boolean} Whether or not it's part of the dependencies
 */
nodeUtils.isDefine = function(nodes) {
  // Iterate from last node to its great grandparent
  for (var i = nodes.length - 1; i >= nodes.length - 4; i--) {
    if (!nodes[i]) return false;

    if (nodes[i].type === 'ExpressionStatement' &&
        nodes[i].expression.type === 'CallExpression' &&
        nodes[i].expression.callee.type  === 'Identifier' &&
        nodes[i].expression.callee.name === 'define') {
      return true;
    }
  }

  return false;
};

/**
 * Returns an array of up to n nested children. The node is walked using BFS.
 *
 * @param {Node} node The node for which to retrieve its children
 * @param {int}  n    Max number of children to return
 */
nodeUtils.getNestedChildren = function(node, n) {
  var queue, res, i, children;

  queue = [node];
  res = [];

  while (queue.length > 0) {
    node = queue.shift();

    if (res.length >= n) {
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
 * Returns a given node's children as an array of nodes. Designed for use
 * with acorn's ASTs.
 *
 * @param   {Node}   The node for which to retrieve its children
 * @returns {Node[]} An array of child nodes
 */
nodeUtils.getChildren = function(node) {
  var res, temp, i, j;

  switch (node.type) {
    case 'Expression':
    case 'ThisExpression':
    case 'Statement':
    case 'BreakStatement':
    case 'ContinueStatement':
    case 'EmptyStatement':
    case 'DebuggerStatement':
    case 'ForInit':
    case 'ScopeBody':
    case 'Identifier':
    case 'Literal':
    case 'ExportDeclaration':
    case 'ImportDeclaration':
      return [];

    case 'Program':
    case 'BlockStatement':
      res = [];
      for (i = 0; i < node.body.length; i++) {
        if (node.body[i]) res.push(node.body[i]);
      }
      return res;

    case 'ExpressionStatement':
      return (node.expression) ? [node.expression] : [];

    case 'IfStatement':
      res = [node.test, node.consequent];
      if (node.alternate) res.push(node.alternate);
      return res;

    case 'ArrowFunctionExpression':
    case 'FunctionExpression':
    case 'FunctionDeclaration':
      res = [];
      if (node.params) {
        for (i = 0; i < node.params.length; i++) {
          res.push(node.params[i]);
        }
      }
      if (node.body) res.push(node.body);
      return res;

    case 'LabeledStatement':
      return (node.body) ? [node.body] : [];

    case 'WithStatement':
      return [node.object, node.body];

    case 'SwitchStatement':
      res = [node.discriminant];
      for (i = 0; i < node.cases.length; i++) {
        temp = node.cases[i];
        if (temp.test) res.push(temp.test);
        for (j = 0; j < temp.consequent.length; j++) {
          res.push(temp.consequent[j]);
        }
      }
      return res;

    case 'ReturnStatement':
    case 'YieldExpression':
    case 'ThrowStatement':
    case 'SpreadElement':
      return (node.argument) ? [node.argument] : [];

    case 'TryStatement':
      res = [node.block];
      if (node.handler) res.push(node.handler.body);
      if (node.finalizer) res.push(node.finalizer);
      return res;

    case 'DoWhileStatement':
    case 'WhileStatement':
      return [node.test, node.body];

    case 'ForStatement':
      res = [];
      if (node.init) res.push(node.init);
      if (node.test) res.push(node.test);
      if (node.update) res.push(node.update);
      res.push(node.body);
      return res;

    case 'ForInStatement':
    case 'ForOfStatement':
      return [node.left, node.right, node.body];

    case 'VariableDeclaration':
      res = [];
      for (i = 0; i < node.declarations.length; i++) {
        temp = node.declarations[i];
        if (temp.init) res.push(temp.init);
      }
      return res;

    case 'Function':
      return (node.body) ? [node.body] : [];

    case 'ArrayExpression':
      res = [];
      for (i = 0; i < node.elements.length; i++) {
        temp = node.elements[i];
        if (temp) res.push(temp);
      }
      return res;

    case 'ObjectExpression':
      res = [];
      for (i = 0; i < node.properties.length; ++i) {
        res.push(node.properties[i]);
      }
      return res;

    case 'SequenceExpression':
    case 'TemplateLiteral':
      res = [];
      for (i = 0; i < node.expressions.length; ++i) {
        res.push(node.expressions[i]);
      }
      return res;

    case 'UnaryExpression':
    case 'UpdateExpression':
      return [node.argument];

    case 'BinaryExpression':
    case 'AssignmentExpression':
    case 'LogicalExpression':
      return [node.left, node.right];

    case 'ConditionalExpression':
      return [node.test, node.consequent, node.alternate];

    case 'NewExpression':
    case 'CallExpression':
      res = [node.callee];
      if (!node.arguments) return res;
      for (i = 0; i < node.arguments.length; i++) {
        res.push(node.arguments[i]);
      }
      return res;

    case 'MemberExpression':
      res = [];
      if (node.object) res.push(node.object);
      if (node.computed && node.property) res.push(node.property);
      return res;

    case 'TaggedTemplateExpression':
      res = [];
      if (node.tag) res.push(node.tag);
      if (node.quasi) res.push(node.quasi);
      return res;

    case 'ClassDeclaration':
    case 'ClassExpression':
      res = [];
      if (node.superClass) res.push(node.superClass);
      if (!node.body.body) return res;
      for (i = 0; i < node.body.body.length; i++) {
        res.push(node.body.body[i]);
      }
      return res;

    case 'MethodDefinition':
      res = [];
      if (node.computed && node.key) res.push(node.key);
      if (node.value) res.push(node.value);
      return res;

    case 'ComprehensionExpression':
      res = [];
      for (i = 0; i < node.blocks.length; i++) {
        res.push(node.blocks[i].right);
      }
      if (node.body) res.push(node.body);
      return res;

    default:
      return [];
  }
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
