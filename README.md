# Karma Plugin for Snapshot Testing

## Usage Example with Mocha and Chai

```sh
$ npm install karma-snapshot karma-mocha karma-chai karma-mocha-snapshot mocha chai --save-dev
```

Karma configuration: 

```js
// karma.conf.js
module.exports = function (config) {
  config.set({
    browsers: ["ChromeHeadless"],
    frameworks: ["mocha", "chai", "snapshot", "mocha-snapshot"],
    reporters: ["mocha"],

    files: ["__tests__/*.js"],

    colors: true,
    autoWatch: true,

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
// __tests__/hello.js
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
