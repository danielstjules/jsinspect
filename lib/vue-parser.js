var parse5 = require('parse5');
var deindent = require('de-indent');

var splitRE = /\r?\n/g;
var emptyRE = /^\s*$/;
var commentSymbols = {
  'iced': '#',
  'iced-jsx': '#',
  'iced-redux': '#',
  'coffee': '#',
  'coffee-jsx': '#',
  'coffee-redux': '#',
  'purs': '--',
  'ulmus': '--'
};

exports.parseVueFile = function (content) {
  var result = '';

  var fragment = parse5.parseFragment(content, {
    locationInfo: true
  });

  fragment.childNodes.forEach(function (node) {
    var type = node.tagName;
    var lang = getAttribute(node, 'lang');

    // skip empty script tags
    if (type === 'script') {
      if (!node.childNodes || !node.childNodes.length) {
        return;
      }

      // extract part
      var start = node.childNodes[0].__location.startOffset;
      var end = node.childNodes[node.childNodes.length - 1].__location.endOffset;

      // preserve other parts as commenets so that linters
      // and babel can output correct line numbers in warnings
      result = commentScript(content.slice(0, start), lang) +
        deindent(content.slice(start, end)) +
        commentScript(content.slice(end), lang);
    }
  });

  return result;
}

function commentScript(content, lang) {
  var symbol = getCommentSymbol(lang);
  var lines = content.split(splitRE);
  return lines.map(function (line, index) {
    // preserve EOL
    if (index === lines.length - 1 && emptyRE.test(line)) {
      return '';
    } else {
      return symbol + (emptyRE.test(line) ? '' : ' ' + line);
    }
  }).join('\n');
}

function getCommentSymbol(lang) {
  return commentSymbols[lang] || '//';
}

function getAttribute(node, name) {
  if (node.attrs) {
    var i = node.attrs.length;
    var attr;
    while (i--) {
      attr = node.attrs[i];
      if (attr.name === name) {
        return attr.value;
      }
    }
  }
}
