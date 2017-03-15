var testA = function() {
  // Only a subset of each function body matches
  var foo = util.foo('foo') + util.foo('foo');
  var baz = util.generateBaz(() => {
    return {
      a: `foo
      bar
      baz`
    }
  });
}

var testB = function() {
  if (bar) bar('bar');
  var foo = util.foo('foo') + util.foo('foo');
  var baz = util.generateBaz(() => {
    return {
      a: `foo
      bar
      baz`
    }
  });
}
