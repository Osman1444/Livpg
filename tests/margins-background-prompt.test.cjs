/** Margin enforcement, shared page backgrounds and prompt-contract checks. */
const fs=require('node:fs'), vm=require('node:vm'), assert=require('node:assert/strict');
const nodes=new Map();
const node=id=>{ if(!nodes.has(id)) nodes.set(id,{style:{},addEventListener(){}}); return nodes.get(id); };
const context=vm.createContext({URL,document:{baseURI:'file:///project/index.html',querySelector:node},checkpoint(){}});
for(const name of ['state','alignment','constraints','background','ai-prompt','viewer-template']) vm.runInContext(fs.readFileSync(`js/${name}.js`,'utf8'),context);
const run=source=>vm.runInContext(source,context);
run('W=800;H=1000;M.grid={margin:40};');
for(const angle of [0,30,90,135,270]) {
 context.element={id:1,x:-100,y:900,w:1200,h:500,a:angle};
 run('constrainElement(element)');
 const bounds=run('elementBounds(element)');
 assert.ok(bounds.left>=40-1e-8 && bounds.top>=40-1e-8 && bounds.right<=760+1e-8 && bounds.bottom<=960+1e-8);
 assert.ok(Math.abs(context.element.w/context.element.h-2.4)<1e-8,'Oversized content retains aspect ratio');
}
context.element={x:60,y:80,w:1500,h:100,a:0};
run('constrainResize(element,{ox:60,oy:80,ow:100,oh:100})');
assert.equal(context.element.x,60,'Resize retains the fixed left edge');
assert.ok(Math.abs(context.element.x+context.element.w-760)<1e-8,'Resize stops at the right margin');
run('M.grid={margin:40,snap:false}');
let delta=run('snapDrag(-500,1000,{left:100,top:100,right:300,bottom:200})');
assert.equal(delta.dx,-60);assert.equal(delta.dy,760);
run('M.grid.snap=true');
delta=run('snapDrag(-500,1000,{left:100,top:100,right:300,bottom:200},true)');
assert.equal(delta.dx,-60,'Alt bypasses snapping but not margins');
run('P=[{e:[]},{e:[]}];c=0;applyPageBackground({color:"#123456",image:"",fit:"cover"},"page")');
assert.equal(run('P[0].bg.color'),'#123456');assert.equal(run('P[1].bg'),undefined);
run('applyPageBackground({color:"#654321",image:"",fit:"contain"},"all")');
assert.equal(run('P[1].bg'),undefined);assert.equal(run('M.background.color'),'#654321');assert.equal(run('pageBackgroundStyle(P[1],M)'),'#654321');
run('P.push({e:[]});c=2');
assert.equal(run('currentBackground().color'),'#654321','New pages inherit the shared background');
run('c=0;applyPageBackground({color:"#112233",image:"",fit:"cover"},"page")');
assert.equal(run('P[0].bg.color'),'#112233');assert.equal(run('pageBackgroundStyle(P[1],M)'),'#654321');
assert.equal(run('pageBackgroundStyle({bg:{color:"bad",image:"javascript:alert(1)"}}, {})'),'#ffffff');
assert.ok(run('pageBackgroundStyle({bg:{color:"#123456",image:"images/photo.png",fit:"contain"}}, {})').includes('file:///project/images/photo.png'));
const standalone=vm.runInNewContext('('+run('pageBackgroundStyle.toString()')+')',{URL,document:{baseURI:'file:///output/export.html'}});
assert.ok(standalone({bg:{color:'#123456',image:'bg.png',fit:'cover'}},{}).includes('file:///output/bg.png'));
const viewer=run('VIEWER_JS').replaceAll('__PW__','800');
new vm.Script(viewer);
assert.ok(viewer.includes('pageBackgroundStyle(p, project.m || {})'),'Viewer applies each page background');
const viewerNodes={proj:{textContent:JSON.stringify({m:{background:{color:'#654321'},grid:{mode:'clip',margin:40}},p:[{e:[],bg:{color:'#112233'}},{e:[]}]})},b:{},n:{},t:{}};
vm.runInNewContext(viewer,{
  document:{getElementById:id=>viewerNodes[id],querySelectorAll:()=>[],documentElement:{clientWidth:800,style:{setProperty(){}}}},
  pageBackgroundStyle:run('pageBackgroundStyle'),marginClipStyle:run('marginClipStyle'),renderElement:()=>'',addEventListener(){},innerHeight:1000,
});
assert.ok(viewerNodes.b.innerHTML.includes('background:#112233') && viewerNodes.b.innerHTML.includes('background:#654321'),'Actual exported runtime renders per-page and inherited backgrounds');
assert.ok(viewerNodes.b.innerHTML.includes('clip-path:inset(40px)'), 'Exported runtime clips content separately from page backgrounds');

run('const AI={style:"Flat green card",req:"Build an Arabic quiz with a score and reset button",ask:false};P[0].e=[{id:1,t:"html",w:520,h:240}];sel=1');
const prompt=run('buildPrompt()');
for(const term of ['520 × 240','Build an Arabic quiz','Flat green card','container-type:size','document.currentScript.closest','No network requests'.toLowerCase(),'@container','prefers-reduced-motion','SILENT PRE-FLIGHT CHECK']) assert.ok(prompt.toLowerCase().includes(term.toLowerCase()),term);
for(const name of ['width','height','min-width','min-height','max-width','max-height']) assert.ok(prompt.includes(`name="livpg:${name}"`));
assert.ok(prompt.includes('Implement now.'));
run('AI.ask=true');assert.ok(run('buildPrompt()').includes('Do not include code in your first response.'));
console.log('Passed: rotated/oversized margins, bounded group dragging, page/all-page backgrounds, export CSS and prompt contract');
