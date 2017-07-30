const unified = require('unified');
const remarkParse = require('remark-parse')

const mdParser = unified().use(remarkParse);

function markdownToSnapshot(content) {
  const tree = mdParser.parse(content);

  const state = {
    name: null,
    suite: null,
    suiteStack: [],
    currentSuite: null,
    currentSnapshotList: null,
    depth: 0
  };

  const children = tree.children;
  for (let i = 0; i < children.length; i++) {
    const c = children[i];
    switch (c.type) {
      case 'heading':
        if (c.depth === 1) {
          enterRootSuite(state, c);
        } else if (c.depth === 2) {
          tryExit(state, suiteDepth(c));
          enterSuite(state, c);
        } else if (c.depth === 4) {
          enterSnapshot(state, c);
        }
        break;
      case 'code':
        pushSnapshotCode(state, c);
        break;
    }
  }

  return { name: state.name, suite: state.suite };
};

function tryExit(state, depth) {
  while (state.depth >= depth) {
    state.suiteStack.pop();
    state.currentSuite = state.suiteStack[state.suiteStack.length - 1];
    state.currentSnapshotList = null;
    state.depth--;
  }
}

function suiteDepth(node) {
  const inlineCode = node.children[0];
  return ((inlineCode.position.start.column - 4) >> 1) + 1;
}

function snapshotDepth(node) {
  const inlineCode = node.children[0];
  return ((inlineCode.position.start.column - 6) >> 1) + 1;
}

function enterRootSuite(state, node) {
  const inlineCode = node.children[0];
  const name = inlineCode.value;
  const suite = {
    children: {},
    snapshots: {}
  }
  state.name = name;
  state.suite = suite;
  state.suiteStack.push(suite);
  state.currentSuite = suite;
  state.currentSnapshotList = null;
  state.depth = 0;
}

function enterSuite(state, node) {
  const inlineCode = node.children[0];
  const name = inlineCode.value;
  const suite = {
    children: {},
    snapshots: {}
  }
  state.currentSuite.children[name] = suite;
  state.suiteStack.push(suite);
  state.currentSuite = suite;
  state.currentSnapshotList = null;
  state.depth++;
}

function enterSnapshot(state, node) {
  const inlineCode = node.children[0];
  const name = inlineCode.value;
  const snapshotList = [];
  state.currentSuite.snapshots[name] = snapshotList;
  state.currentSnapshotList = snapshotList;
}

function normalizeNewlines(string) {
  return string.replace(/\r\n|\r/g, "\n");
}

function pushSnapshotCode(state, node) {
  state.currentSnapshotList.push({
    lang: node.lang,
    code: normalizeNewlines(node.value)
  });
}

module.exports = markdownToSnapshot;
