const path = require('path');
const fs = require('fs');
const mkdirp = require('mkdirp');

function pattern(path) {
  return {
    pattern: path,
    included: true,
    served: true,
    watched: false,
  };
}

function snapshotFramework(files, config, emitter, loggerFactory) {
  const logger = loggerFactory.create('framework.snapshot');

  // inject snapshot adapter
  files.unshift(pattern(path.join(__dirname, 'adapter.js')));

  const snapshotConfig = Object.assign({
    update: false,
    path: '__snapshot__/karma.js',
  }, config.snapshot);

  const snapshotPath = path.join(config.basePath, snapshotConfig.path);
  logger.debug('Snapshot path: ' + snapshotPath);

  const snapshotDir = path.dirname(snapshotPath);
  if (!fs.existsSync(snapshotDir)) {
    mkdirp.sync(snapshotDir);
  }

  if (fs.existsSync(snapshotPath)) {
    // inject snapshot
    files.unshift(pattern(snapshotPath));
  }

  if (snapshotConfig.update) {
    files.unshift(pattern(path.join(__dirname, 'snapshot-state-update.js')));
  } else {
    files.unshift(pattern(path.join(__dirname, 'snapshot-state.js')));
  }

  emitter.on('browser_complete', function (clientInfo, data) {
    const lastResult = clientInfo.lastResult;
    if (!lastResult.disconnected) {
      if (data && data.snapshot) {
        const snapshotData = data.snapshot.data;
        const visited = data.snapshot.visited;
        let dirty = data.snapshot.dirty;

        // prune snapshots for removed tests
        if (!lastResult.error && lastResult.skipped === 0) {
          const snapshotKeys = Object.keys(snapshotData);
          const visitedKeys = Object.keys(visited);
          if (visitedKeys.length < snapshotKeys.length) {
            for (let i = 0; i < snapshotKeys.length; i++) {
              const key = snapshotKeys[i];
              if (!visited.hasOwnProperty(key)) {
                delete snapshotData[key];
                dirty = true;
              }
            }
          }
        }

        if (dirty) {
          const serializedData = 'window.__snapshot__=' + JSON.stringify(snapshotData) + ';';
          fs.writeFileSync(snapshotPath, serializedData);
        }
      } else {
        logger.warn('Snapshot data is unavailable');
      }
    }
  });
}

snapshotFramework.$inject = ['config.files', 'config', 'emitter', 'logger'];

module.exports = {
  'framework:snapshot': ['factory', snapshotFramework],
}
