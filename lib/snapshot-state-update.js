(function (window) {
  "use strict";
  if (window.__snapshot__) {
    window.__snapshot__.update = true;
    window.__snapshot__.dirty = false;
  } else {
    window.__snapshot__ = {
      update: true,
      dirty: false,
      suite: {
        children: {},
        snapshots: {}
      }
    };
  }
})(window);
