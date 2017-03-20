/**
 * Cache for getChildren, holding the keys to traverse for a given Node type.
 */
var childKeys = {};

class NodeUtils {
  /**
   * Walks a root node's subtrees using DFS, invoking the passed callback with
   * three args: node, parent, and ancestors. The root node, presumably Program,
   * is ignored.
   *
   * @param {Node}     root The root node of the AST to traverse
   * @param {function} fn   Callback to invoke
   */
  static walkSubtrees(root, fn) {
    var visit = (node, parent, ancestors) => {
      fn(node, parent, ancestors);
      ancestors = ancestors.concat(node);
      NodeUtils.getChildren(node).forEach((child) => {
        visit(child, node, ancestors);
      });
    };

    NodeUtils.getChildren(root).forEach((child) => {
      visit(child, null, []);
    });
  }

  /**
   * Returns an array of nodes in the passed AST, traversed using DFS. Accepts
   * an optional maximum number, n, of nodes to return. The returned array
   * always begins with the root node.
   *
   * @param   {Node}   node The root node of the AST to traverse
   * @param   {int}    [n]  Optional max number of nodes to return
   * @returns {Node[]}
   */
  static getDFSTraversal(node, n) {
    var res = [];

    var dfs = (node) => {
      if (n && res.length >= n) return;
      res.push(node);
      NodeUtils.getChildren(node).forEach(dfs);
    };

    dfs(node);

    return res.slice(0, n);
  }

  /**
   * Returns an array of nodes in the passed AST, traversed using BFS. Accepts
   * an optional maximum number, n, of nodes to return. The returned array
   * always begins with the root node.
   *
   * @param   {Node}   node The root node of the AST to traverse
   * @param   {int}    [n]  Optional max number of nodes to return
   * @returns {Node[]}
   */
  static getBFSTraversal(node, n) {
    var queue, res, i, children;

    queue = [node];
    res = [node];

    while (queue.length) {
      node = queue.shift();

      if (n && res.length >= n) {
        return res.slice(0, n);
      }

      children = NodeUtils.getChildren(node) || [];
      for (i = 0; i < children.length; i++) {
        queue.push(children[i]);
        res.push(children[i]);
      }
    }

    return res.slice(0, n);
  }

  /**
   * Returns a given node's children as an array of nodes. Designed for use
   * with ESTree/Babylon spec ASTs.
   *
   * @param   {Node}   The node for which to retrieve its children
   * @returns {Node[]} An array of child nodes
   */
  static getChildren(node) {
    var res = [];

    if (!childKeys[node.type]) {
      childKeys[node.type] = Object.keys(node).filter((key) => {
        return typeof node[key] === 'object';
      });
    }

    childKeys[node.type].forEach((key) => {
      var val = node[key];
      if (val && val.type) {
        res.push(val);
      } else if (val instanceof Array) {
        res = res.concat(val);
      }
    });

    return res;
  }

  /**
   * Returns whether or not the nodes are part of an ES6 module import.
   *
   * @param   {Node[]}  nodes
   * @returns {boolean}
   */
  static isES6ModuleImport(nodes) {
    return nodes[0] && nodes[0].type === 'ImportDeclaration';
  }

  /**
   * Returns whether or not the nodes belong to class boilerplate.
   *
   * @param   {Node[]}  nodes
   * @returns {boolean}
   */
  static isES6ClassBoilerplate(nodes) {
    var last = nodes[nodes.length - 1];
    return last.type === 'ClassDeclaration' || last.type === 'ClassBody';
  }

  /**
   * Returns whether or not the nodes are part of an AMD require or define
   * expression.
   *
   * @param   {Node[]}  nodes
   * @returns {boolean}
   */
  static isAMD(nodes) {
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
  }

  /**
   * Returns whether or not the nodes are part of a CommonJS require statement.
   *
   * @param   {Node[]}  nodes
   * @returns {boolean}
   */
  static isCommonJS(nodes) {
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
  }

  /**
   * Returns whether or not all nodes are of the same type.
   *
   * @param   {Node[]}  nodes
   * @returns {boolean}
   */
  static typesMatch(nodes) {
    return nodes.every(node => node && node.type === nodes[0].type);
  }

  /**
   * Returns whether or not all nodes have the same identifier.
   *
   * @param   {Node[]}  nodes
   * @returns {boolean}
   */
  static identifiersMatch(nodes) {
    return nodes[0] && nodes.every(node => {
      return node && node.name === nodes[0].name;
    });
  }

  /**
   * Returns whether or not all nodes have the same literal value.
   *
   * @param   {Node[]}  nodes
   * @returns {boolean}
   */
  static literalsMatch(nodes) {
    return nodes[0] && nodes.every(node => {
      return node && (!node.type.includes('Literal') ||
        node.value === nodes[0].value);
    });
  }
}

module.exports = NodeUtils;
