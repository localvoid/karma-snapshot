(function (window) {
  "use strict";
  var rootSuite = {
    visited: false,
    dirty: false,
    children: {},
    snapshots: {}
  };
  window.__snapshot__ = {
    update: false,
    suite: rootSuite,
    addSuite: function (name, suite) {
      rootSuite.children[name] = suite;
    }
  };
})(window);
