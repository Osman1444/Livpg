/** Non-destructive margin behavior and mandatory prompt-description checks. */
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const nodes=new Map();
const node=id=>{if(!nodes.has(id))nodes.set(id,{style:{},addEventListener(){},focus(){this.focused=true;}});return nodes.get(id);};
const context=vm.createContext({document:{querySelector:node},checkpoint(){},queueCheckpoint(){}});
for(const name of ['state','alignment','constraints','panel'])vm.runInContext(fs.readFileSync(`js/${name}.js`,'utf8'),context);
const run=source=>vm.runInContext(source,context);
run('W=800;H=1000;M.pw=W;M.ph=H;M.grid={margin:40,mode:"block"};');
for(const mode of ['block','clip','guide']){
 run(`M.grid.mode='${mode}';`);
 context.element={x:0,y:0,w:100,h:100};
 run('constrainElement(element)');
 assert.equal(context.element.x,mode==='block'?40:0);
 const delta=run('constrainDrag(-100,-100,{left:50,top:50,right:150,bottom:150})');
 assert.equal(delta.dx,mode==='block'?-10:-100);
 const clip=run('marginClipStyle(M)');
 assert.equal(clip,mode==='clip'?'inset(40px)':'none');
 run('updateMarginClip()');assert.equal(node('#page-content').style.clipPath,clip);
 const saved=JSON.parse(run('JSON.stringify({m:M,p:P})'));
 assert.equal(saved.m.grid.mode,mode);
}
run('M.grid={margin:40}');assert.equal(run('blockingMargin()'),40,'Old documents retain blocking behavior');
run('M.grid={margin:40,mode:"bogus"}');assert.equal(run('gridSettings().mode'),'block');
run('AI.req="";updatePromptCopyState()');assert.equal(node('[data-a="cp"]').disabled,true);
run('AI.req="   ";updatePromptCopyState()');assert.equal(node('[data-a="cp"]').disabled,true);
(async()=>{
 await run(`$('#pn').onclick({target:{closest:selector=>selector==='[data-a]'?{dataset:{a:'cp'}}:null}})`);
 assert.equal(node('#ai').focused,true,'Copy without a description focuses the required field');
 assert.ok(node('#ai-copy-status').textContent.includes('Describe'));
 run(`$('#pn').oninput({target:{id:'ai',value:'Make a pendulum',dataset:{},closest(){return null;}}});`);
 assert.equal(node('[data-a="cp"]').disabled,false);
 assert.equal(node('#ai-copy-status').textContent,'');
 run(`$('#pn').oninput({target:{id:'ai',value:'  ',dataset:{},closest(){return null;}}});`);
 assert.equal(node('[data-a="cp"]').disabled,true);
 console.log('Passed: block/clip/guide modes, non-destructive clipping, persistence and required AI description');
})().catch(error=>{console.error(error);process.exitCode=1;});
