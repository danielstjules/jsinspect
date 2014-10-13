![jsinspect](http://danielstjules.com/github/jsinspect-logo.png)

Detect copy-pasted and structurally similar code. The inspector identifies
duplicate code, even if modified, as well as common boilerplate or logic that
should be the target of refactoring.

[![Build Status](https://travis-ci.org/danielstjules/jsinspect.svg?branch=master)](https://travis-ci.org/danielstjules/jsinspect)

* [Overview](#overview)
* [Installation](#installation)
* [Usage](#usage)
* [Integration](#integration)

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
recursively, and only `.js` files are analyzed. Any `node_modules` dirs are
also ignored. Being built for JavaScript, it also ignores CommonJS require
statements, and AMD define expressions.

![screenshot](http://danielstjules.com/github/jsinspect-screenshot.png)

## Installation

It can be installed via `npm` using:

``` bash
npm install -g jsinspect
```

## Usage

```
Usage: jsinspect [options] <paths ...>

Duplicate code and structure detection for JavaScript.
Identifier matching is disabled by default. Example use:
jsinspect -t 30 -i ./path/to/src


Options:

  -h, --help                output usage information
  -V, --version             output the version number
  -t, --threshold <number>  minimum size of nodes (default: 15)
  -i, --identifiers         match identifiers
  -D, --no-diff             disable 2-way diffs
  -C, --no-color            disable colors
```

On first use with a project, you may want to run the tool with the following
options, while running explicitly on the lib/src directories, and not the
test/spec dir.

```
jsinspect -t 30 -i ./path/to/src
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
  - "jsinspect -t 30 ./path/to/src"
```

Note that in the above example, we're using a threshold of 30 for detecting
structurally similar code. A lower threshold may work for your build process,
but ~30 should help detect unnecessary boilerplate, while avoiding excessive
output.
