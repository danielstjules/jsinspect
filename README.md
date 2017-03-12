![jsinspect](http://danielstjules.com/github/jsinspect-logo.png)

Detect copy-pasted and structurally similar code. The inspector identifies
duplicate code, even if modified, as well as common boilerplate or logic that
should be the target of refactoring.

[![Build Status](https://travis-ci.org/danielstjules/jsinspect.svg?branch=master)](https://travis-ci.org/danielstjules/jsinspect)

* [Overview](#overview)
* [Installation](#installation)
* [Usage](#usage)
* [Integration](#integration)
* [Reporters](#reporters)
* [Performance](#performance)

## Overview

We've all had to deal with code smell, and duplicate code is a common source.
While some instances are easy to spot, this type of searching is the perfect
use-case for a helpful CLI tool.

Existing solutions do exist for this purpose, but are often token-based and
rely on string searching methods such as the Rabin–Karp algorithm. Why isn't
this always ideal? Those tools may struggle with code that has wildly varying
identifiers, despite having the same structure and behavior.

And copy-pasted code is but one type of code duplication. Common boilerplate
and repeated logic can be identified as well using jsinspect, since it
doesn't work on tokens - it uses the ASTs of the parsed code.

You have the freedom to specify a threshold determining the smallest subset of
nodes to analyze. This will identify code with a similar structure, based
on the AST node types, e.g. BlockStatement, VariableDeclaration,
ObjectExpression, etc. For copy-paste oriented detection, you can even limit
the search to nodes with matching identifiers.

The tool accepts a list of paths to parse, and outputs any matches along
with a series of 2-way diffs. Any directories among the paths are walked
recursively, and only `.js` files are analyzed. Any `node_modules` and
`bower_components` dirs are also ignored. Being built for JavaScript, it also
ignores ES6 module declarations, CommonJS require statements, and AMD define
expressions.

![screenshot](http://danielstjules.com/github/jsinspect-example.png)

## Installation

It can be installed via `npm` using:

``` bash
npm install -g jsinspect
```

Also available: [grunt-jsinspect](https://github.com/stefanjudis/grunt-jsinspect),
and [gulp-jsinspect](https://github.com/alexeyraspopov/gulp-jsinspect)

## Usage

```
Usage: jsinspect [options] <paths ...>


Duplicate code and structure detection for JavaScript.
Identifier matching is disabled by default. Example use:
jsinspect -t 30 -i --ignore "Test.js" ./path/to/src


Options:

  -h, --help                         output usage information
  -V, --version                      output the version number
  -t, --threshold <number>           number of nodes (default: 15)
  -i, --identifiers                  match identifiers
  -m, --matches <number>             min number of instances for a match (default: 2)
  -j, --jsx                          support jsx files (default: false)
  -c, --config                       path to config file (default: .jsinspectrc)
  -r, --reporter [default|json|pmd]  specify the reporter to use
  -s, --suppress <number>            length to suppress diffs (default: 100, off: 0)
  -D, --no-diff                      disable 2-way diffs
  -C, --no-color                     disable colors
  --ignore <pattern>                 ignore paths matching a regex
```

If a `.jsinspectrc` file is located in the project directory, its values will
be used in place of the defaults listed above. For example:

``` javascript
{
  "threshold":     30,
  "identifiers":   true,
  "matches":       2,
  "ignore":        "Test.js|Spec.js", // used as RegExp,
  "jsx":           true,
  "reporter":      "json",
  "suppress":      100,
}
```

On first use with a project, you may want to run the tool with the following
options, while running explicitly on the lib/src directories, and not the
test/spec dir.

```
jsinspect -t 30 -i ./path/to/src
```

From there, feel free to try incrementally decreasing the threshold and
ignoring identifiers. A threshold of 20 may lead you to discover new areas of
interest for refactoring or cleanup. Each project or library may be different.

## Integration

It's simple to run jsinspect on your library source as part of a build
process. It will exit with an error code of 0 when no matches are found,
resulting in a passing step, and a positive error code corresponding to its
failure. For example, with Travis CI, you could add the following entries
to your `.travis.yml`:

``` yaml
before_script:
  - "npm install -g jsinspect"

script:
  - "jsinspect -t 30 ./path/to/src"
```

Note that in the above example, we're using a threshold of 30 for detecting
structurally similar code. A lower threshold may work for your build process,
but ~30 should help detect unnecessary boilerplate, while avoiding excessive
output.

To have jsinspect run with each job, but not block or fail the build, you can
use something like the following:

``` yaml
script:
  - "jsinspect -t 30 ./path/to/src || true"
```

## Reporters

Aside from the default reporter, both JSON and PMD CPD-style XML reporters are
available. Note that in the JSON example below, indentation and formatting
has been applied. Furthermore, the id property available in these reporters is
useful for parsing by automatic scripts to determine whether or not duplicate
code has changed between builds.

#### JSON

``` json
[{
  "id":"566f58e984ad337cf78588771e3b7cc908f270c8",
  "instances":[
    {"path":"spec/fixtures/intersection.js","lines":[1,5]},
    {"path":"spec/fixtures/intersection.js","lines":[7,11]}
  ],
  "diffs":[
    {
      "-":{"path":"spec/fixtures/intersection.js","lines":[1,5]},
      "+":{"path":"spec/fixtures/intersection.js","lines":[7,11]},
      "diff":"-  function intersectionA(array1, array2) {\n-    array1.filter(function(n) {\n-      return array2.indexOf(n) != -1;\n+  function intersectionB(arrayA, arrayB) {\n+    arrayA.filter(function(n) {\n+      return arrayB.indexOf(n) != -1;\n     });\n   }\n"
    }
  ]
}]
```

#### PMD CPD XML

``` xml
<?xml version="1.0" encoding="utf-8"?>
<pmd-cpd>
<duplication lines="10" id="566f58e984ad337cf78588771e3b7cc908f270c8">
<file path="/jsinspect/spec/fixtures/intersection.js" line="1"/>
<file path="/jsinspect/spec/fixtures/intersection.js" line="7"/>
<codefragment>
- spec/fixtures/intersection.js:1,5
+ spec/fixtures/intersection.js:7,11

-  function intersectionA(array1, array2) {
-    array1.filter(function(n) {
-      return array2.indexOf(n) != -1;
+  function intersectionB(arrayA, arrayB) {
+    arrayA.filter(function(n) {
+      return arrayB.indexOf(n) != -1;
     });
   }
</codefragment>
</duplication>
</pmd-cpd>
```

## Performance

Running on a medium sized code base, with a 2.4Ghz i5 MPB, yielded the
following results:

``` bash
$ find src/ -name '*.js' | xargs wc -l
# ...
44810 total

$ time jsinspect -t 30 src/
# Looking for structural similarities..
41 matches found across 800 files

real  0m1.542s
user  0m1.472s
sys   0m0.071s

$ time jsinspect -i -t 15 src/
# Looking for copy-pasted code..
96 matches found across 800 files

real  0m1.283s
user  0m1.196s
sys   0m0.084s
```

Much of the overhead comes from diff generation, so a greater number of matches
will increase running time.
