(function (window) {
  "use strict";
  if (window.__snapshot__) {
    window.__snapshot__.update = false;
    window.__snapshot__.dirty = false;
  } else {
    window.__snapshot__ = {
      update: false,
      dirty: false,
      suite: {
        children: {},
        snapshots: {}
      }
    };
  }
})(window);
