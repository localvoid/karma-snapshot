# Karma Plugin for Snapshot Testing

`karma-snapshot` provides a communication layer between browser and [Karma](http://karma-runner.github.io/) to store and
retrieve snapshots.

## Snapshot Format

Snapshots are stored in a [Markdown](https://en.wikipedia.org/wiki/Markdown) format to improve readability.

````md
# `src/html.js`

## `Sub Suite`

####   `HTML Snapshot`

```html
<div>
  <span />
</div>
```
````

## Snapshot File Path

Snapshot file path is extracted from the name of the root suit cases and stored alongside with a tested files in a
`__snapshots__` directory.

## Usage Example with Mocha and Chai

```sh
$ npm install karma karma-webpack karma-sourcemap-loader karma-snapshot karma-mocha \
              karma-mocha-snapshot karma-mocha-reporter karma-chrome-launcher mocha \
              chai chai-karma-snapshot webpack --save-dev
```

Karma configuration: 

```js
// karma.conf.js
const webpack = require("webpack");

module.exports = function (config) {
  config.set({
    browsers: ["ChromeHeadless"],
    frameworks: ["mocha", "snapshot", "mocha-snapshot"],
    reporters: ["mocha"],
    preprocessors: {
      "**/__snapshots__/**/*.md": ["snapshot"],
      "__tests__/index.js": ["webpack", "sourcemap"]
    },
    files: [
      "**/__snapshots__/**/*.md",
      "__tests__/index.js"
    ],

    colors: true,
    autoWatch: true,

    webpack: {
      plugins: [
        new webpack.SourceMapDevToolPlugin({
          test: /\.js$/,
        }),
      ],
      performance: {
        hints: false
      },
    },

    webpackMiddleware: {
      stats: "errors-only",
      noInfo: true
    },

    snapshot: {
      update: !!process.env.UPDATE,
    },

    mochaReporter: {
      showDiff: true,
    },

    client: {
      mocha: {
        reporter: "html",
        ui: "bdd",
      }
    },
  });
};
```

Source file:

```js
// src/index.js

export function test() {
  return "Snapshot Test";
}
```

Test file:

```js
// __tests__/index.js
import { use, expect } from "chai";
import { matchSnapshot } from "chai-karma-snapshot";
import { test } from "../src/index.js";
use(matchSnapshot);

describe("src/index.js", () => {
  it("check snapshot", () => {
    expect(test()).to.matchSnapshot();
  });
});
```

Run tests:

```sh
$ karma start
```

Update snapshots:

```sh
$ UPDATE=1 karma start --single-run
```

## Config

```js
function resolve(basePath, suiteName) {
  return path.join(basePath, "__snapshots__", suiteName);
}

config.set({
  ...
  snapshot: {
    update: true,           // Run snapshot tests in UPDATE mode (default: false)
    prune: true,            // Prune snapshots for removed tests (default: true)
    indentCodeBlocks: true, // Indent code blocks instead of using ``` delimiters (default: false)
    checkSourceFile: true,  // Checks existince of the source file associated with tests (default: false)
    pathResolver: resolve,  // Custom path resolver
  }
});
```
