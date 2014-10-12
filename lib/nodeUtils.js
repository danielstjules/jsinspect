var nodeUtils = {};
module.exports = nodeUtils;

var identifierHandlers = {
  FunctionDeclaration: function(node) {
    if (node.id && node.id.type === 'Identifier') {
      return node.id.name;
    }
  },

  VariableDeclaration: function(node) {
    return node.declarations.map(function(declaration) {
      return declaration.id.name;
    }).join(':');
  },

  Property: function(node) {
    if (node.key && node.key.type === 'Identifier') {
      return node.key.name;
    }
  },

  CallExpression: function(node) {
    if (node.callee === 'Identifier') {
      return node.callee.name;
    }
  },

  MemberExpression: function(node) {
    var res = [];
    if (node.object && node.object.type === 'Identifier') {
      res.push(node.object.name);
    }
    if (node.property && node.property.type === 'Identifier') {
      res.push(node.property.name);
    }
    return res.join('');
  },

  Identifier: function(node) {
    return node.name;
  }
};

var getIdentifierString = function(nodes) {
  var identifiers = [];

  nodes.forEach(function(node) {
    if (!identifierHandlers[node.type]) return;

    var res = identifierHandlers[node.type](node);
    if (res) {
      identifiers.push(res);
    }
  });

  return identifiers.join(':');
};

var getLiteralString = function(nodes, types) {
  var literals = [];

  nodes.forEach(function(node) {
    if (node.type !== 'Literal') return;

    var type = typeof node.value;
    if (types[type]) {
      literals.push(type);
    }
  });

  return literals.join(':');
};

function group(key, nodes, types, fn) {
  var groups, hash, hashKey, id, i, j;

  groups = [];
  hash = {};

  for (i = 0; i < nodes.length; i++) {
    for (j = 0; j < nodes[i].length; j++) {
      id = fn(nodes[i][j].keys[key], types);
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

nodeUtils.groupByMatchingIds = function(key, nodes) {
  return group(key, nodes, null, getIdentifierString);
};

nodeUtils.groupByMatchingLiterals = function(key, nodes, types) {
  return group(key, nodes, types, getLiteralString);
};

nodeUtils.isDefine = function(state) {
  // Iterate from last node to its great grandparent
  for (var i = state.length - 1; i >= state.length - 4; i--) {
    if (!state[i]) return false;

    if (state[i].type === 'ExpressionStatement' &&
        state[i].expression.type === 'CallExpression' &&
        state[i].expression.callee.type  === 'Identifier' &&
        state[i].expression.callee.name === 'define') {
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
 * Returns a given node's children as an array of nodes.
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
