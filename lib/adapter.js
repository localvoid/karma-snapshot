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

  var snapshot = window.__snapshot__;

  function copyRemovedSnapshots(prev, next) {
    var key;
    var c;
    var ss;
    var i;

    for (key in prev.children) {
      c = next.children[key];
      if (c === undefined) {
        next.children[key] = prev.children[key];
      } else {
        copyRemovedSnapshots(prev.children[key], c);
      }
    }

    for (key in prev.snapshots) {
      c = next.snapshots[key];
      if (c === undefined) {
        next.snapshots[key] = prev.snapshots[key];
      } else {
        ss = prev.snapshots[key];
        if (c.length < ss.length) {
          for (i = c.length; i < ss.length; i++) {
            c.push(ss[i]);
          }
        }
      }
    }
  }

  var complete = window.__karma__.complete;
  window.__karma__.complete = function (data) {
    copyRemovedSnapshots(snapshot.suite, window.__snapshot__.suite);
    var arg = { snapshot: window.__snapshot__.suite };
    if (data !== undefined) {
      arg = __assign({}, data, arg)
    }
    return complete.call(window.__karma__, arg);
  };
})(window);
