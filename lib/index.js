const path = require('path');
const fs = require('fs');
const mkdirp = require('mkdirp');
const glob = require('glob');
const toMarkdown = require('./to-markdown');
const fromMarkdown = require('./from-markdown');
const prune = require('./prune');

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

function snapshotFiles(cwd, pattern) {
  const index = new Set();
  const files = glob.sync(path.join(cwd, pattern));
  if (files !== null) {
    for (let i = 0; i < files.length; i++) {
      index.add(files[i]);
    }
  }
  return index;
}

function snapshotFramework(files, config, emitter, loggerFactory) {
  const logger = loggerFactory.create('framework.snapshot');

  // inject snapshot adapter
  files.unshift(pattern(path.join(__dirname, 'adapter.js')));

  const snapshotConfig = Object.assign({
    update: false,
    prune: true,
    indentCodeBlocks: false,
    checkSourceFile: false,
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
          const r = prune.pruneSnapshots(rootSuite);
          if (r.pruned > 0) {
            rootSuite = r.suite;
            dirty = true;
          }
          if (typeof snapshotConfig.prune === "string") {
            const sFiles = snapshotFiles(config.basePath, snapshotConfig.prune);
            const suiteNames = Object.keys(rootSuite.children);
            for (let i = 0; i < suiteNames.length; i++) {
              const suiteName = suiteNames[i];
              const suite = rootSuite.children[suiteName];
              const path = snapshotConfig.pathResolver(config.basePath, suiteName);
              if (suite.visited) {
                sFiles.delete(path);
              }
            }
            sFiles.forEach(function (f) {
              fs.unlinkSync(f);
            });
          }
        }

        if (dirty) {
          const suiteNames = Object.keys(rootSuite.children);
          for (let i = 0; i < suiteNames.length; i++) {
            const suiteName = suiteNames[i];
            const suite = rootSuite.children[suiteName];
            if (suite.dirty) {
              if (snapshotConfig.checkSourceFile) {
                const suiteFilePath = path.join(config.basePath, suiteName);
                if (!fs.existsSync(suiteFilePath)) {
                  logger.error('Failed to save snapshot file. Source file "' + suiteFilePath + '" does not exist.');
                  return;
                }
              }

              const snapshotPath = snapshotConfig.pathResolver(config.basePath, suiteName);
              const snapshotDir = path.dirname(snapshotPath);
              if (!fs.existsSync(snapshotDir)) {
                mkdirp.sync(snapshotDir);
              }
              fs.writeFileSync(
                snapshotPath,
                toMarkdown(suiteName, suite, snapshotConfig.indentCodeBlocks)
              );
            }
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
