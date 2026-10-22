/** State-level regression checks; run with node tests/editor.test.cjs. */
const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const nodes = new Map();
const node = q => {
  if (!nodes.has(q)) nodes.set(q, { hidden: q !== '#home', addEventListener() {}, style: {}, setAttribute() {} });
  return nodes.get(q);
};
const context = vm.createContext({
  console, URL, setTimeout: () => 1, clearTimeout() {},
  document: { querySelector: node, addEventListener() {} },
  addEventListener() {}, Element: class {}, alert: message => { throw Error(message); },
});
for (const file of ['state', 'icons', 'alignment', 'constraints', 'history', 'media', 'panel', 'clipboard']) {
  vm.runInContext(fs.readFileSync(`js/${file}.js`, 'utf8'), context);
}
vm.runInContext(`
let started = true;
function draw() { checkpoint(); }
resetHistory();
P[0].e.push({id: nid++, t:'txt', v:'one', x:0, y:0, w:100, h:50});
checkpoint();
P[0].e.push({id: nid++, t:'txt', v:'two', x:20, y:20, w:100, h:50});
checkpoint();
`, context);
const evaluate = source => vm.runInContext(source, context);
assert.equal(evaluate('P[0].e.length'), 2);
evaluate('undoRedo(-1)');
assert.equal(evaluate('P[0].e.length'), 1);
evaluate('undoRedo(1)');
assert.equal(evaluate('P[0].e.length'), 2);
evaluate("selection.add(1); selection.add(2); sel=2; selectionAction('dup')");
assert.equal(evaluate('P[0].e.length'), 4);
assert.equal(evaluate('selectedElements().length'), 2);
evaluate("selectionAction('del')");
assert.equal(evaluate('P[0].e.length'), 2);
evaluate('undoRedo(-1)');
assert.equal(evaluate('P[0].e.length'), 4);
evaluate('undoRedo(-1); P[0].e[0].v="new branch"; checkpoint()');
assert.equal(evaluate('historyIndex'), evaluate('history.length - 1'));
evaluate('undoRedo(1)');
assert.equal(evaluate('P[0].e[0].v'), 'new branch');
(async () => {
  await evaluate("importTransfer([], 'Hello from clipboard', {x:40,y:80})");
  assert.equal(evaluate('P[0].e.at(-1).v'), 'Hello from clipboard');
  assert.equal(evaluate('P[0].e.at(-1).x'), 40);
  await evaluate("importTransfer([], 'https://example.com/movie.mp4')");
  assert.equal(evaluate('P[0].e.at(-1).t'), 'vid');
  await evaluate("importTransfer([], 'https://youtu.be/abcdefghijk')");
  assert.equal(evaluate('P[0].e.at(-1).t'), 'yt');
  evaluate('undoRedo(-1)');
  assert.equal(evaluate('P[0].e.at(-1).t'), 'vid');
  for (const url of [
    'https://www.youtube.com/watch?feature=share&v=abcdefghijk',
    'https://youtu.be/abcdefghijk?t=20',
    'https://m.youtube.com/shorts/abcdefghijk',
    'https://www.youtube.com/live/abcdefghijk',
    'https://www.youtube-nocookie.com/embed/abcdefghijk',
  ]) assert.equal(evaluate(`youtubeEmbedURL(${JSON.stringify(url)})`), 'https://www.youtube.com/embed/abcdefghijk');
  assert.equal(evaluate("youtubeEmbedURL('https://example.com/watch?v=abcdefghijk')"), null);
  assert.equal(evaluate("youtubeEmbedURL('https://www.youtube.com/watch?v=invalid')"), null);
  evaluate("addVideoLink('https://youtube.com/watch?v=abcdefghijk')");
  assert.equal(evaluate('P[0].e.at(-1).t'), 'yt');
  evaluate("addVideoLink('https://example.com/movie.webm')");
  assert.equal(evaluate('P[0].e.at(-1).t'), 'vid');
  console.log('Passed: history, groups, clipboard imports, unified video/YouTube links');
})().catch(error => { console.error(error); process.exitCode = 1; });
