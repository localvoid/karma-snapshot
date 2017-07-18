# Karma Plugin for Snapshot Testing

`karma-snapshot` provides a communication layer between browser and karma to store and retrieve snapshot data.

## Usage Example with Mocha and Chai

```sh
$ npm install karma karma-webpack karma-sourcemap-loader karma-snapshot karma-mocha \
              karma-mocha-snapshot mocha chai chai-karma-snapshot --save-dev
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
    preprocessors: { "__tests__/index.js": ["webpack", "sourcemap"] },
    files: ["__tests__/index.js"],

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

Test file:

```js
// __tests__/index.js
import { use, expect } from "chai";
import { matchSnapshot } from "chai-karma-snapshot";
use(matchSnapshot);

it("check snapshot", () => {
  expect("Hello World").to.matchSnapshot();
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
config.set({
  ...
  snapshot: {
    update: true,       // Run snapshot tests in UPDATE mode (default: false)
    pretty: true,       // Serialize snapshot in a pretty format (default: true)
    path: "snapshot.js" // Path to snapshot data file (default: __snapshot__/karma.js)
  }
});
```
