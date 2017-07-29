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

function defaultPathResolver(basePath, suiteName) {
  const suiteSourcePath = path.join(basePath, suiteName);
  const suiteSourceDir = path.dirname(suiteSourcePath);
  const sourceFileName = path.basename(suiteName);

  return path.join(suiteSourceDir, "__snapshots__", sourceFileName + ".md");
}

function snapshotFramework(files, config, emitter, loggerFactory) {
  const logger = loggerFactory.create('framework.snapshot');

  // inject snapshot adapter
  files.unshift(pattern(path.join(__dirname, 'adapter.js')));

  const snapshotConfig = Object.assign({
    update: false,
    prune: true,
    pathResolver: defaultPathResolver
  }, config.snapshot);


  if (snapshotConfig.update) {
    files.unshift(pattern(path.join(__dirname, 'snapshot-state-update.js')));
  }
  files.unshift(pattern(path.join(__dirname, 'snapshot-state.js')));

  emitter.on('browser_complete', function (clientInfo, data) {
    const lastResult = clientInfo.lastResult;
    if (!lastResult.disconnected) {
      if (data && data.snapshot) {
        let rootSuite = data.snapshot;
        let dirty = rootSuite.dirty;

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
          const suiteNames = Object.keys(rootSuite.children);
          for (let i = 0; i < suiteNames.length; i++) {
            const suiteName = suiteNames[i];

            const suiteFilePath = path.join(config.basePath, suiteName);
            if (!fs.existsSync(suiteFilePath)) {
              logger.error('Failed to save snapshot file. File "' + suiteFilePath + '" does not exist.');
              return;
            }

            const snapshotPath = snapshotConfig.pathResolver(config.basePath, suiteName);
            const snapshotDir = path.dirname(snapshotPath);
            if (!fs.existsSync(snapshotDir)) {
              mkdirp.sync(snapshotDir);
            }
            fs.writeFileSync(snapshotPath, toMarkdown(suiteName, rootSuite.children[suiteName]));
          }
        }
      } else {
        logger.warn('Snapshot data is unavailable');
      }
    }
  });
}

snapshotFramework.$inject = ['config.files', 'config', 'emitter', 'logger'];

function iifeWrapper(content) {
  return "(function(window){\"use strict\";" + content + "})(window);"
}

function snapshotPreprocessor(basePath, config, loggerFactory) {
  const logger = loggerFactory.create('preprocessor.snapshot');

  return function (content, file, done) {
    const root = fromMarkdown(content);
    done(iifeWrapper('window.__snapshot__.addSuite("' + root.name + '",' + JSON.stringify(root.suite) + ');'));
  };
}

snapshotPreprocessor.$inject = ['config.basePath', 'config.snapshot', 'logger'];

module.exports = {
  'framework:snapshot': ['factory', snapshotFramework],
  'preprocessor:snapshot': ['factory', snapshotPreprocessor]
}
