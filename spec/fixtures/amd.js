define('myModule', ['foo', 'bar'], function(foo, bar) {
  return {};
});

define('myModule', ['foo', 'bar'], function(foo, bar) {
  return {};
});

require(['foo', 'bar', 'baz'], function(foo, bar, baz) {
  foo.doSomething();
});

require(['foo', 'bar', 'baz'], function(foo, bar, baz) {
  foo.doSomething();
});

example.require(['foo', 'bar', 'baz'], function(foo, bar, baz) {
  bar.somethingElse();
});

example.require(['foo', 'bar', 'baz'], function(foo, bar, baz) {
  bar.somethingElse();
});

namespace.example.define('test', ['foo', 'bar', 'baz'], function(foo, bar, baz) {
  bar.somethingElse();
});

namespace.example.define('test', ['foo', 'bar', 'baz'], function(foo, bar, baz) {
  bar.somethingElse();
});
