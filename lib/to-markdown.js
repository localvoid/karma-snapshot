function snapshotToMarkdown(name, suite) {
  return transformSuite(name, suite, -1);
}

function indent(depth) {
  let result = '';
  for (let i = 0; i < depth; i++) {
    result += '  ';
  }
  return result;
}

function suiteHeader(name, depth) {
  if (depth === -1) {
    return "# " + serializeName(name) + "\n\n";
  }
  return "## " + indent(depth) + serializeName(name) + "\n\n";
}

function snapshotHeader(name, depth) {
  return "#### " + indent(depth) + serializeName(name) + "\n\n";
}

function transformSuite(name, suite, depth) {
  const children = suite.children;
  const snapshots = suite.snapshots;
  const nextDepth = depth + 1;

  let result = suiteHeader(name, depth);
  let keys, i;

  keys = Object.keys(snapshots);
  for (i = 0; i < keys.length; i++) {
    const key = keys[i];
    const snapshot = snapshots[key];
    for (let j = 0; j < snapshot.length; j++) {
      result += transformSnapshot(key, j, snapshot[j], nextDepth);
    }
  }

  keys = Object.keys(children);
  for (i = 0; i < keys.length; i++) {
    const key = keys[i];
    result += transformSuite(key, children[key], nextDepth);
  }
  return result;
}

function transformSnapshot(name, index, snapshot, depth) {
  const lang = snapshot.lang;
  const code = snapshot.code;
  const delimiter = safeDelimiter(code);

  let result = snapshotHeader(name, depth);

  result += delimiter;
  if (lang !== null) {
    result += lang;
  }
  result += '\n' + code + '\n' + delimiter + '\n\n';
  return result;
}

function safeDelimiter(s, delimiter) {
  if (delimiter === undefined) {
    delimiter = '```';
  }
  while (s.indexOf(delimiter) !== -1) {
    delimiter += '`';
  }
  return delimiter;
}

function serializeName(name) {
  const delimiter = safeDelimiter(name, '`');
  return delimiter + name + delimiter;
}

module.exports = snapshotToMarkdown;
