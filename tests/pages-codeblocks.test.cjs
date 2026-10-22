/** Page-order history and copyable HTML-block regression checks. */
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const nodes=new Map();
const node=id=>{if(!nodes.has(id))nodes.set(id,{style:{},addEventListener(){}});return nodes.get(id);};
const context=vm.createContext({
  document:{querySelector:node,addEventListener(){}},addEventListener(){},
  setTimeout:()=>1,clearTimeout(){},ResizeObserver:class{observe(){}},
  finishTextEditing(){},cancelInk(){},
});
for(const name of ['state','limits','history','stage','ai-prompt'])vm.runInContext(fs.readFileSync(`js/${name}.js`,'utf8'),context);
const run=source=>vm.runInContext(source,context);
run(`let started=true;let tabRefreshes=0;tabs=()=>tabRefreshes++;draw=()=>checkpoint();
P=[{e:[{id:1,t:'txt',v:'first'}],bg:{color:'#123456'}},{e:[{id:2,t:'txt',v:'second'}]},{e:[]}];c=0;sel=1;resetHistory();
const activePage=P[0];movePage(0,2);`);
assert.equal(run('P[2]===activePage'),true,'Moving preserves the original page object');
assert.equal(run('c'),2,'Active page follows its new position');
assert.equal(run('sel'),1,'Element selection stays with its page');
assert.equal(run('P[2].bg.color'),'#123456');
assert.equal(run('P[0].e[0].v'),'second');
run('undoRedo(-1)');assert.equal(run('P[0].e[0].v'),'first');
run('undoRedo(1)');assert.equal(run('P[2].e[0].v'),'first');
run('c=0; const retained=P[c]; movePage(2,1)');
assert.equal(run('P[c]===retained'),true,'Moving another page does not switch the active canvas');
const snapshot=run('JSON.stringify(P)');
run('movePage(-1,0);movePage(0,9);movePage(0,0)');
assert.equal(run('JSON.stringify(P)'),snapshot);
assert.equal(JSON.parse(run('documentSnapshot()')).p[1].e[0].v,'first','Saved/exported state retains the reordered pages');
const raw='<meta name="livpg:width" content="560">\n<div><script>const x="```";</script></div>';
context.raw=raw;
assert.equal(run('unwrapHTMLCode("```html\\n"+raw+"\\n```")'),raw);
assert.equal(run('unwrapHTMLCode("~~~html\\n"+raw+"\\n~~~")'),raw);
assert.equal(run('unwrapHTMLCode(raw)'),raw);
run('const AI={req:"A quiz",style:"",ask:false};sel=null');
const prompt=run('buildPrompt()');
assert.ok(prompt.includes('ONE fenced code block labeled html'));
assert.ok(prompt.includes('Modern light theme'));
run('AI.style="Dark monochrome"');assert.ok(run('buildPrompt()').includes('Dark monochrome'));
console.log('Passed: page reordering, active page/selection, undo/redo, saved order, HTML fences and default light prompt');
