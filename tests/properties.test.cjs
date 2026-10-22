/** Regression checks for targeted property updates and safe image replacement. */
const fs = require('node:fs'), vm = require('node:vm'), assert = require('node:assert/strict');
const nodes = new Map(), frames = [], imageRequests = [];
const getNode = key => {
  if (!nodes.has(key)) nodes.set(key, { value: '', style: { setProperty() {} }, addEventListener() {} });
  return nodes.get(key);
};
const context = vm.createContext({
  URL, console, checkpoint() {}, queueCheckpoint() {},
  document: { baseURI: 'file:///project/index.html', querySelector: getNode },
  ResizeObserver: class { observe() {} },
  Image: class { set src(value) { this.source = value; imageRequests.push(this); } },
  requestAnimationFrame: callback => { frames.push(callback); return frames.length; },
  setTimeout: () => 1, clearTimeout() {},
});
for (const file of ['state', 'limits', 'alignment', 'constraints', 'media', 'panel', 'stage']) vm.runInContext(fs.readFileSync(`js/${file}.js`, 'utf8'), context);
const run = source => vm.runInContext(source, context);
run(`
function checkpoint() {}
function queueCheckpoint() {}
stage = () => { throw Error('Property updates must not rebuild the stage'); };
P = [{e: Array.from({length: 2000}, (_, i) => ({id:i+1,t:'img',v:'old.png',x:10,y:20,w:300,h:200}))}];
sel=1999;
setProp('r', 25, 'rr');
setProp('a', 45, 'ra');
`);
const target = getNode('#pg [data-i="1999"]');
assert.equal(target.style.borderRadius, '25px');
assert.equal(target.style.transform, 'rotate(45deg)');
assert.equal(run('P[0].e[0].r'), undefined);
assert.equal(frames.length, 0, 'Ordinary transforms need no content rendering');
run(`
$('#pn').oninput({target: {id:'ra', value:'60', type:'range', min:'-180', max:'180', dataset:{}, style:{setProperty(){}}, closest(){return null;}}});
`);
assert.equal(target.style.transform, 'rotate(60deg)');
run(`
selectedEl().t='shape'; selectedEl().v='triangle';
let refreshCount = 0;
refreshElementContent = e => { if (e !== selectedEl()) throw Error('Unexpected sibling update'); refreshCount++; };
for (let i=0;i<100;i++) setProp('r', i, 'rr');
`);
assert.equal(frames.length, 1, 'Shape changes coalesce into one animation frame');
frames.shift()();
assert.equal(run('refreshCount'), 1);
assert.equal(target.style.borderRadius, '0px', 'Shape wrapper does not clip polygon corners');
run("selectedEl().t='img'; selectedEl().v='old.png'");
(async () => {
  const before = JSON.parse(run('JSON.stringify(selectedEl())'));
  let pending = run("replaceImageSource(selectedEl(), 'images/replacement.png')");
  assert.equal(run('selectedEl().v'), 'old.png', 'Source remains intact while loading');
  imageRequests.shift().onload();
  assert.equal(await pending, true);
  assert.equal(run('selectedEl().v'), 'images/replacement.png');
  for (const field of ['x','y','w','h','a','r']) assert.equal(run(`selectedEl().${field}`), before[field]);
  pending = run("replaceImageSource(selectedEl(), 'missing.png')");
  imageRequests.shift().onerror();
  assert.equal(await pending, false);
  assert.equal(run('selectedEl().v'), 'images/replacement.png');
  const older = run("replaceImageSource(selectedEl(), 'older.png')");
  const newer = run("replaceImageSource(selectedEl(), 'newer.png')");
  const first = imageRequests.shift(), second = imageRequests.shift();
  second.onload(); await newer;
  first.onload(); await older;
  assert.equal(run('selectedEl().v'), 'newer.png', 'Stale image requests cannot overwrite newer replacements');
  assert.equal(await run("replaceImageSource(selectedEl(), 'javascript:alert(1)')"), false);
  run(`selectedEl().t='html'; selectedEl().us=true; selectedEl().w=400; selectedEl().h=200;
    selectedEl().v='<meta name="livpg:width" content="560"><meta name="livpg:height" content="480">';
    $('#pn').onclick({target:{closest:selector=>selector==='[data-a]'?{dataset:{a:'html-fit'}}:null}});`);
  assert.equal(run('selectedEl().w'),560);
  assert.equal(run('selectedEl().h'),480);
  assert.equal(run('selectedEl().us'),false,'Suggested-size action overrides an earlier manual-size lock');
  console.log('Passed: targeted properties, frame batching, image replacement and suggested HTML size');
})().catch(error => { console.error(error); process.exitCode = 1; });
