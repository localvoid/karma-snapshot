const path = require('path');
const fs = require('fs');
const mkdirp = require('mkdirp');
const toMarkdown = require('./to-markdown');
const fromMarkdown = require('./from-markdown');
const pruneSnapshots = require('./prune');

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
    path: '__snapshot__/index.md',
    prune: true,
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
        let rootSuite = data.snapshot.suite;
        let dirty = data.snapshot.dirty;

        // prune snapshots for removed tests
        if (snapshotConfig.prune && !lastResult.error && lastResult.skipped === 0) {
          const r = pruneSnapshots(rootSuite);
          if (r.pruned > 0) {
            rootSuite = r.suite;
            dirty = true;
            logger.info(r.pruned + ' snapshots were pruned');
          }
        }

        if (dirty) {
          fs.writeFileSync(snapshotPath, toMarkdown(rootSuite));
        }
      } else {
        logger.warn('Snapshot data is unavailable');
      }
    }
  });
}

snapshotFramework.$inject = ['config.files', 'config', 'emitter', 'logger'];

function snapshotPreprocessor(basePath, config, loggerFactory) {
  const logger = loggerFactory.create('preprocessor.snapshot');

  return function (content, file, done) {
    const rootSuite = fromMarkdown(content);
    const c = 'window.__snapshot__={update:false,dirty:false,suite:' + JSON.stringify(rootSuite) + '};';
    done(c);
  };
}

snapshotPreprocessor.$inject = ['config.basePath', 'config.snapshot', 'logger'];

function snapshotMiddleware(config, logger) {
}

snapshotMiddleware.$inject = ['config', 'logger'];

module.exports = {
  'framework:snapshot': ['factory', snapshotFramework],
  'preprocessor:snapshot': ['factory', snapshotPreprocessor],
  'middleware:snapshot': ['factory', snapshotMiddleware]
}
