var nodeUtils = {};
module.exports = nodeUtils;

var identifierHandlers = {
  VariableDeclaration: function(node) {
    return node.declarations.map(function(declaration) {
      return declaration.id.name;
    }).join(':');
  },

  CallExpression: function(node) {
    if (node.callee === 'Identifier') {
      return node.callee.name;
    }
  },

  MemberExpression: function(node) {
    if (node.property && node.property.type === 'Identifier') {
      return node.property.name;
    }
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
      push(type);
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

  return nodes;
}

nodeUtils.groupByMatchingIds = function(key, nodes, types) {
  return group(key, nodes, types, getIdentifierString);
};

nodeUtils.groupByMatchingLiterals = function(key, nodes, types) {
  return group(key, nodes, types, getLiteralString);
};
