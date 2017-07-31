const path = require('path');
const fs = require('fs');
const mkdirp = require('mkdirp');
const glob = require('glob');
const createMarkdownSerializer = require('./format/markdown');
const prune = require('./prune');

/**
 * filePattern creates a Karma file pattern object that should be included and non-watched.
 * 
 * @param {string} path File path.
 * @returns Karma file pattern object.
 */
function filePattern(path) {
  return {
    pattern: path,
    included: true,
    served: true,
    watched: false,
  };
}

/**
 * defaultPathResolver is a default path resolver for snapshot files.
 * 
 * @param {string} basePath Base path.
 * @param {string} suiteName Name of the suite.
 * @returns Full path to snapshot file.
 */
function defaultPathResolver(basePath, suiteName) {
  const suiteSourcePath = path.join(basePath, suiteName);
  const suiteSourceDir = path.dirname(suiteSourcePath);
  const sourceFileName = path.basename(suiteName);

  return path.join(suiteSourceDir, "__snapshots__", sourceFileName + ".md");
}

/**
 * findSnapshotFiles uses glob to find files matching the pattern.
 * 
 * @param {string} basePath Base path.
 * @param {string} pattern Minimatch pattern.
 * @returns Set object with all files that matched the pattern.
 */
function findSnapshotFiles(basePath, pattern) {
  const result = new Set();
  const files = glob.sync(path.join(basePath, pattern));
  if (files !== null) {
    for (let i = 0; i < files.length; i++) {
      result.add(files[i]);
    }
  }
  return result;
}

let snapshotSerializer;

/**
 * snapshotFramework
 * 
 * @param {*} files Karma file patterns.
 * @param {*} config Karma config.
 * @param {*} emitter Karma emitter.
 * @param {*} loggerFactory Karma logger factory.
 */
function snapshotFramework(files, config, emitter, loggerFactory) {
  const logger = loggerFactory.create('framework.snapshot');

  const snapshotConfig = Object.assign({
    update: false,
    prune: true,
    format: "md",
    checkSourceFile: false,
    pathResolver: defaultPathResolver
  }, config.snapshot);

  if (typeof snapshotConfig.format === "string") {
    switch (snapshotConfig.format) {
      case "indented-md":
        snapshotSerializer = createMarkdownSerializer(true);
        break;
      case "md":
      default:
        snapshotSerializer = createMarkdownSerializer(false);
    }
  } else {
    snapshotSerializer = snapshotConfig.format;
  }

  // inject snapshot adapter
  files.unshift(filePattern(path.join(__dirname, 'adapter.js')));

  // inject default state
  if (snapshotConfig.update) {
    files.unshift(filePattern(path.join(__dirname, 'snapshot-state-update.js')));
  }
  files.unshift(filePattern(path.join(__dirname, 'snapshot-state.js')));

  emitter.on('browser_complete', (clientInfo, data) => {
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

          // prune snapshot files
          if (typeof snapshotConfig.prune === "string") {
            const snapshotFiles = findSnapshotFiles(config.basePath, snapshotConfig.prune);
            Object.keys(rootSuite.children).forEach((suiteName) => {
              const suite = rootSuite.children[suiteName];
              if (suite.visited) {
                snapshotFiles.delete(snapshotConfig.pathResolver(config.basePath, suiteName));
              }
            });
            snapshotFiles.forEach((f) => {
              fs.unlinkSync(f);
            });
          }
        }

        if (dirty) {
          Object.keys(rootSuite.children).forEach((suiteName) => {
            const suite = rootSuite.children[suiteName];
            if (suite.dirty) {
              if (snapshotConfig.checkSourceFile) {
                const suiteSourceFilePath = path.join(config.basePath, suiteName);
                if (!fs.existsSync(suiteSourceFilePath)) {
                  logger.error(
                    'Failed to save snapshot file. ' +
                    'Source file "' + suiteSourceFilePath + '" does not exist.'
                  );
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
                snapshotSerializer.serialize(suiteName, suite)
              );
            }
          });
        }
      } else {
        logger.warn('Snapshot data is unavailable');
      }
    }
  });
}

snapshotFramework.$inject = ['config.files', 'config', 'emitter', 'logger'];

/**
 * iifeWrapper wraps javascript into IIFE.
 * 
 * @param {string} content 
 * @returns Javascript wrapped into IIFE.
 */
function iifeWrapper(content) {
  return "(function(window){\"use strict\";" + content + "})(window);"
}

/**
 * Snapshot preprocessor.
 * 
 * @param {string} basePath Base path.
 * @param {*} loggerFactory Karma logger factory.
 * @returns Karma preprocessor.
 */
function snapshotPreprocessor(basePath, loggerFactory) {
  const logger = loggerFactory.create('preprocessor.snapshot');

  return function (content, file, done) {
    const root = snapshotSerializer.deserialize(content);
    done(iifeWrapper('window.__snapshot__.addSuite("' + root.name + '",' + JSON.stringify(root.suite) + ');'));
  };
}

snapshotPreprocessor.$inject = ['config.basePath', 'logger'];

module.exports = {
  'framework:snapshot': ['factory', snapshotFramework],
  'preprocessor:snapshot': ['factory', snapshotPreprocessor]
}
