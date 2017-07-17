(function (window) {
  "use strict";

  // Object.assign polyfill copied from https://github.com/Microsoft/tslib/
  var __assign = Object.assign || function (t) {
    for (var s, i = 1, n = arguments.length; i < n; i++) {
      s = arguments[i];
      for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p)) t[p] = s[p];
    }
    return t;
  };

  if (window.__snapshot__ === undefined) {
    window.__snapshot__ = {};
  }

  var complete = window.__karma__.complete;
  window.__karma__.complete = function (data) {
    var snapshot = {
      snapshot: {
        dirty: window.__snapshot_state__.dirty,
        visited: window.__snapshot_state__.visited,
        data: window.__snapshot__
      }
    };
    if (data !== undefined) {
      snapshot = __assign({}, data, snapshot)
    }
    return complete.call(window.__karma__, snapshot);
  };
})(window);
