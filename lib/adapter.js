(function (window) {
  "use strict";

  var hasOwnProperty = Object.prototype.hasOwnProperty;

  // Object.assign polyfill copied from https://github.com/Microsoft/tslib/
  var assign = Object.assign || function (t) {
    for (var s, i = 1, n = arguments.length; i < n; i++) {
      s = arguments[i];
      for (var p in s) if (hasOwnProperty.call(s, p)) t[p] = s[p];
    }
    return t;
  };

  // Store reference to the prev snapshot, assertion plugin should assign a new snapshot to this variable.
  var snapshot = window.__snapshot__;

  function copyMissingSnapshots(prevSuite, nextSuite) {
    var snapshotList, nextChild, key, i;

    var pChildren = prevSuite.children;
    var pSnapshots = prevSuite.snapshots;

    for (key in pChildren) {
      if (hasOwnProperty.call(pChildren, key)) {
        nextChild = nextSuite.children[key];
        if (nextChild === undefined) {
          nextSuite.children[key] = pChildren[key];
        } else {
          copyMissingSnapshots(pChildren[key], nextChild);
        }
      }
    }

    for (key in pSnapshots) {
      if (hasOwnProperty.call(pSnapshots, key)) {
        nextChild = nextSuite.snapshots[key];
        if (nextChild === undefined) {
          nextSuite.snapshots[key] = pSnapshots[key];
        } else {
          snapshotList = pSnapshots[key];
          if (nextChild.length < snapshotList.length) {
            for (i = nextChild.length; i < snapshotList.length; i++) {
              nextChild.push(snapshotList[i]);
            }
          }
        }
      }
    }
  }

  // Patch `karma.complete()` method and add snapshot data to the end result.
  var complete = window.__karma__.complete;
  window.__karma__.complete = function (data) {
    // We need to copy missing snapshots to detect which one should be pruned. Missing snapshots won't have `visited`
    // flag.
    copyMissingSnapshots(snapshot.suite, window.__snapshot__.suite);

    var arg = { snapshot: window.__snapshot__.suite };
    if (data !== undefined) {
      arg = assign({}, data, arg)
    }
    return complete.call(window.__karma__, arg);
  };
})(window);
