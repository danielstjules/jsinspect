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
