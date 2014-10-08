![jsinspect](http://danielstjules.com/github/jsinspector-logo.png)

Detect copy-pasted and structurally similar code. The inspector identifies
duplicate code, even if modified, as well as common boilerplate or logic that
should be the target of refactoring.

[![Build Status](https://travis-ci.org/danielstjules/jsinspect.svg?branch=master)](https://travis-ci.org/danielstjules/jsinspect)

* [Overview](#overview)
* [Installation](#installation)
* [Usage](#usage)
* [Integration](#integration)

## Overview

We've all had to deal with code smell, and duplicated code is a common source.
While some instances are easy to spot, this type of searching is the perfect
use-case for a helpful CLI tool.

Existing solutions do exist for this purpose, but are often token-based and
rely on string searching methods such as the Rabin–Karp algorithm. Why isn't
this ideal? Those tools tend to struggle with code that has wildly varying
identifiers, despite having the same structure and behavior.

And copy-pasted code is but one type of code duplication. Common boilerplate
and repeated logic can be identified as well using jsinspect, since it
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

``` bash
npm install -g jsinspect
```

## Usage

```
Usage: jsinspect [options] <paths ...>

Duplicate code and structure detection. By default, the
tool is ran using the following options:
jsinspect -f 0 -t 20 -i fn,var -l bool,int,float,string

Available identifier types for matching consist of both
variables and functions. The following literals can also
be specified: bool, int, float, and string.

Options:

  -h, --help                 output usage information
  -V, --version              output the version number
  -f, --fuzzy <number>       max distance for fuzzy matching (default: 0)
  -t, --threshold <number>   minimum size of nodes (default: 20)
  -i, --identifiers <types>  match identifiers (default: fn,var)
  -l, --literals <types>     match literals (default: bool,int,float,string)
  -I, --no-identifiers       disable enforcing matching identifiers
  -L, --no-literals          disable enforcing matching literals
  -D, --no-diff              disable 2-way diffs
  -C, --no-color             disable colors
```

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
  - "jsinspect -t 15 ./path/to/src"       # Look for copy-pasted code
  - "jsinspect -I -L -t 30 ./path/to/src" # Look for structural similarities
```

Note that in the above example, we're using a threshold of 30 for detecting
structurally similar code. A lower threshold may work for your build process,
but ~30 should help identify both duplicate code and unnecessary boilerplate,
while avoiding excessive output.
