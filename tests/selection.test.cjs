/** Selection clicks must retain live canvas nodes and stable properties controls. */
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const classes=()=>{const values=new Set();return{add:value=>values.add(value),remove:value=>values.delete(value),contains:value=>values.has(value)}};
const elements=new Map();
for(const id of [1,2]){
 const handles=[];
 elements.set(id,{dataset:{i:String(id)},classList:classes(),style:{},media:{id},handles,
  insertAdjacentHTML(where,html){for(const match of html.matchAll(/data-h="([^"]+)"/g)){const handle={remove(){handles.splice(handles.indexOf(handle),1)}};handles.push(handle);}},
 });
}
const pg={
 handlers:{},setPointerCapture(){},addEventListener(name,fn){this.handlers[name]=fn;},
 querySelector(selector){const id=selector.match(/data-i="(\d+)"/);return id?elements.get(+id[1]):null;},
 querySelectorAll(selector){return selector==='.hd'?[...elements.values()].flatMap(e=>e.handles):[...elements.values()].filter(e=>e.classList.contains('sl'));},
};
Object.defineProperty(pg,'innerHTML',{set(){throw Error('Selection must not replace canvas HTML');}});
let panelRenders=0;
const panel={classList:classes(),addEventListener(){}};
Object.defineProperty(panel,'innerHTML',{set(value){panelRenders++;this.html=value;},get(){return this.html;}});
const fields=new Map();
const node=selector=>{
 if(selector==='#pg')return pg;
 if(selector==='#pn')return panel;
 if(selector==='#ais')return null;
 if(!fields.has(selector))fields.set(selector,{style:{},addEventListener(){}});
 return fields.get(selector);
};
const context=vm.createContext({document:{querySelector:node},checkpoint(){},queueCheckpoint(){},addEventListener(){},
 draw(){throw Error('Selection must not call draw');},stage(){throw Error('Selection must not call stage');},
 richTextPanel:()=>'',mountRichText(){},beginTextEditing(){},
});
for(const file of ['state','icons','alignment','selection','panel'])vm.runInContext(fs.readFileSync(`js/${file}.js`,'utf8'),context);
vm.runInContext("let inkMode=false,activeInk=null;P=[{e:[{id:1,t:'img',v:'one.png',x:0,y:0,w:100,h:100},{id:2,t:'vid',v:'two.mp4',x:120,y:0,w:100,h:100}]}];",context);
vm.runInContext(fs.readFileSync('js/interactions.js','utf8'),context);
const click=(id,extra={})=>{const target={dataset:{},closest:selector=>selector==='.el'&&id?elements.get(id):null};pg.onpointerdown({button:0,pointerId:1,clientX:10,clientY:10,target,...extra});};
const run=source=>vm.runInContext(source,context), media=[...elements.values()].map(e=>e.media);
click(null);assert.equal(panelRenders,0,'Repeated blank-canvas clicks do nothing');
click(1);assert.equal(panelRenders,1);assert.equal(elements.get(1).handles.length,8);
click(1);assert.equal(panelRenders,1,'Clicking the selected element keeps the properties DOM');
click(2);assert.equal(panelRenders,2);assert.equal(elements.get(1).handles.length,0);assert.equal(elements.get(2).handles.length,8);
click(1,{shiftKey:true});assert.equal(panelRenders,3);assert.equal(elements.get(1).handles.length,0);assert.equal(elements.get(2).handles.length,0);
click(2);assert.equal(panelRenders,3,'Moving the same group keeps its panel controls');
click(null);assert.equal(panelRenders,4);
click(null);assert.equal(panelRenders,4,'Repeated deselection retains file-settings inputs');
for(const [index,element]of [...elements.values()].entries())assert.equal(element.media,media[index]);
run("P[0].e[0].t='txt'");
pg.handlers.dblclick({target:{closest:selector=>selector==='.el'?elements.get(1):null},preventDefault(){}});
assert.equal(run('sel'),1,'Double click selects text without redrawing the stage');
console.log('Passed: live canvas/media retention, stable properties on repeated/group/empty clicks, handles and double-click selection');
