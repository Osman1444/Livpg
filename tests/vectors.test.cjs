/** Vector geometry and pressure regression checks; no browser dependencies. */
const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const context = vm.createContext({
  document: { querySelector: () => ({ getBoundingClientRect: () => ({ left: 10, top: 20 }) }) },
});
for (const file of ['state', 'render', 'alignment', 'constraints', 'drawing']) vm.runInContext(fs.readFileSync(`js/${file}.js`, 'utf8'), context);
const evaluate = source => vm.runInContext(source, context);
evaluate('s = 0.5');
const light = evaluate("inkPoint({clientX: 60, clientY: 70, pointerType: 'pen', pressure: 0.1})");
const firm = evaluate("inkPoint({clientX: 60, clientY: 70, pointerType: 'pen', pressure: 0.9})");
assert.equal(light[0], 100);
assert.equal(light[1], 100);
assert.ok(firm[2] > light[2]);
assert.equal(evaluate("inkPoint({clientX: 60, clientY: 70, pointerType: 'mouse', pressure: 1})[2]"), 0.5);
evaluate('penSettings.pressure = false');
assert.equal(evaluate("inkPoint({clientX: 60, clientY: 70, pointerType: 'pen', pressure: 1})[2]"), 0.5);
evaluate('M.grid={margin:20}');
assert.equal(evaluate("inkPoint({clientX:0,clientY:0,pointerType:'pen',pressure:0.5})[0]"),24,'Ink stays inside margin plus brush padding');
evaluate('M.grid={}');
const original = { t:'draw', id:1, x:0, y:0, w:794, h:1123, color:'#123456', weight:10, v:{ bw:794, bh:1123, points:[[100,200,0.1],[150,250,0.9]] } };
context.stroke = original;
const cropped = evaluate('cropInk(stroke)');
assert.equal(cropped.x, 94);
assert.equal(cropped.y, 194);
assert.equal(cropped.w, 62);
assert.equal(cropped.h, 62);
assert.equal(cropped.v.points[0][2], 0.1);
assert.equal(cropped.v.points[1][2], 0.9);
assert.equal(cropped.x + cropped.v.points[0][0], 100);
assert.equal(cropped.y + cropped.v.points[1][1], 250);
context.cropped = cropped;
const html = evaluate('renderElement(cropped)');
const radii = [...html.matchAll(/ r="([\d.]+)"/g)].map(match => +match[1]);
assert.equal(radii.length, 2);
assert.ok(radii[1] > radii[0], 'Higher pressure produces a wider rendered mark');
assert.ok(html.includes('viewBox="0 0 62 62"'));
assert.ok(html.includes('fill="#123456"'));
const renderer = evaluate('renderElement.toString()');
const standalone = vm.runInNewContext(`(${renderer})`);
assert.equal(standalone(cropped), html, 'Standalone renderer retains stroke geometry without editor globals');
for (const shape of ['rect','ellipse','triangle','diamond','line','arrow']) {
  const output = standalone({t:'shape',id:2,v:shape,x:0,y:0,w:200,h:100,fill:'#123456',stroke:'#654321',weight:4});
  assert.ok(output.includes('<svg'));
  assert.ok(output.includes('stroke="#654321"'));
  assert.ok(!output.includes('NaN'));
}
const rounded = standalone({t:'shape',id:3,v:'rect',x:0,y:0,w:200,h:100,r:20,weight:4});
assert.ok(rounded.includes('rx="20" ry="20"'), 'Rectangle uses circular radius in page pixels');
assert.ok(rounded.includes('border-radius:0px'), 'Shape corners are not clipped by the outer box');
for (const [kind, count] of [['triangle',3], ['diamond',4]]) {
  const svg = standalone({t:'shape',id:3,v:kind,x:0,y:0,w:200,h:100,r:20,weight:4});
  assert.equal((svg.match(/A[0-9]/g) || []).length, count, 'Every polygon corner has a circular arc');
  const tiny = standalone({t:'shape',id:3,v:kind,x:0,y:0,w:1,h:1,r:400,weight:80});
  assert.ok(!/NaN|Infinity/.test(tiny), 'Oversized radii clamp on short edges');
}
context.stroke = {...original, v:{...original.v, points:[[50,60,0.5]]}};
assert.ok(evaluate('cropInk(stroke).w') > 0, 'A pen tap produces a valid dot');
console.log('Passed: pen pressure, mouse fallback, coordinates, cropped strokes, dots, shapes and standalone SVG rendering');
