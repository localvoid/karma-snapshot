function pruneSnapshots(suite) {
  const children = suite.children;
  const snapshots = suite.snapshots;
  const result = {
    pruned: 0,
    alive: 0,
    suite: {
      dirty: false,
      children: {},
      snapshots: {}
    }
  };
  let keys, key, i;

  keys = Object.keys(children);
  for (i = 0; i < keys.length; i++) {
    key = keys[i];
    const c = children[key];
    const p = pruneSnapshots(c);
    if (p.pruned > 0) {
      result.suite.dirty = true;
      result.pruned += p.pruned;
    }
    if (p.alive > 0) {
      result.alive += p.alive;
      result.suite.children[key] = p.suite;
    }
  }

  keys = Object.keys(snapshots);
  for (i = 0; i < keys.length; i++) {
    key = keys[i];
    const snapshotList = snapshots[key];
    const newSnapshotList = [];
    for (let j = 0; j < snapshotList.length; j++) {
      const s = snapshotList[j];
      if (s.visited === true) {
        newSnapshotList.push(s);
        result.alive++;
      } else {
        result.suite.dirty = true;
        result.pruned++;
      }
    }
    if (newSnapshotList.length > 0) {
      result.suite.snapshots[key] = newSnapshotList;
    }
  }

  return result;
}

module.exports = pruneSnapshots;
