![js-inspector](http://danielstjules.com/github/jsinspector-logo.png)

Detect both copy-pasted and structurally similar code. The inspector helps
identify duplicate code, even if modified, as well as common boilerplate or
logic that should be the target of refactoring.

[![Build Status](https://travis-ci.org/danielstjules/js-inspector.svg?branch=master)](https://travis-ci.org/danielstjules/js-inspector)

* [Overview](#overview)
* [Installation](#installation)
* [Usage](#usage)
* [Integration](#integration)

## Overview

We've all had to deal with code smell, and duplicated code is a common source.
While some instances are easy to spot, this type of searching is the perfect
use-case for a helpful CLI tool. Meet the Inspector.

Existing solutions do exist for this purpose, but are often token-based and
rely on string searching methods such as the Rabin–Karp algorithm. Why isn't
this ideal? Those tools tend to struggle with code that has wildly varying
identifiers, despite having the same structure and behavior.

And copy-pasted code is but one type of code duplication. Common boilerplate
and repeated logic can be identified as well using js-inspector, since it
doesn't work on tokens - it uses the ASTs of the parsed code.

You have the freedom to specify a threshold determining the smallest subset of
AST nodes to analyze, as well as an edit distance to enable fuzzy matching.
By default, this will identify code with a similar structure, based on the
AST node types, e.g. BlockStatement, VariableDeclaration, ObjectExpression, etc.
For copy-paste oriented detection, you can limit the search to nodes with
matching literals or identifiers.

The tool accepts a list of paths to parse, and outputs any matches along
with a series of 2-way diffs if enabled. Any directories among the paths are
walked recursively, and only `.js` files are analyzed. Any `node_modules` dirs
are also ignored.

## Installation

It can be installed via `npm` using:

```
npm install -g js-inspector
```

## Usage

```
Usage: js-inspector [options] <paths ...>

Options:

  -h, --help                output usage information
  -V, --version             output the version number
  -i, --identifiers         enforce matching identifiers
  -l, --literals            enforce matching literals
  -f, --fuzzy <number>      max edit distance for fuzzy matching (default: 0)
  -t, --threshold <number>  minimum size of nodes (default: 15)
  -D, --no-diff             disable 2-way diffs
  -C, --no-color            disable colors
```

## Integration

It's simple to run js-inspector on your library source as part of a build
process. It will exit with an error code of 0 when no matches are found,
resulting in a passing step, and a positive error code corresponding to its
failure. For example, with Travis CI, you could add the following two entries
to your `.travis.yml`:

``` yaml
before_script:
  - "npm install -g js-inspector"

script:
  - "js-inspector -t 25 ./path/to/src"       # Look for structural similarities
  - "js-inspector -i -l -t 15 ./path/to/src" # Look for copy-pasted code
```

Note that in the above example, we're using a threshold of 25 for detecting
structurally similar code. A lower threshold may work for your build process,
but ~25 should help identify both duplicate code and unnecessary boilerplate,
while avoiding excessive output.
