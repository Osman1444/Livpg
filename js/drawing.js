/** Livpg - Shape insertion and pressure-aware vector ink. */
let inkMode = false, activeInk = null, inkFrame = null;
const penSettings = { color: '#212121', weight: 6, pressure: true };

/** Creates a vector shape using the normal selection, history and export flows. */
function addShape(kind) {
  if (!['rect', 'ellipse', 'triangle', 'diamond', 'line', 'arrow'].includes(kind)) return;
  setInkMode(false);
  const e = { id: nid++, t: 'shape', v: kind, x: Math.round((W - 240) / 2), y: 60, w: 240, h: kind === 'line' || kind === 'arrow' ? 80 : 160, fill: '#1976d2', stroke: '#212121', weight: 3 };
  constrainElement(e);
  pageEls().push(e);
  selection.clear(); sel = e.id;
  draw();
}

/** Switches between page selection and freehand drawing. */
function setInkMode(on) {
  cancelInk();
  finishTextEditing();
  inkMode = on;
  if (on) panelView = 'properties';
  d = null;
  $('#pg').classList.toggle('drawing', on);
  const button = $('[data-k="pen"]');
  if (button) button.setAttribute('aria-pressed', String(on));
  draw();
}

/** Compact pen controls, visible while the drawing tool is active. */
function penPanel() {
  return `<div class="panel-content"><h4>Freehand drawing</h4><div class="vector-settings"><label>Ink<input type="color" data-pen="color" value="${penSettings.color}"></label><label>Width (px)<input type="number" data-pen="weight" min="1" max="80" value="${penSettings.weight}"></label></div><label class="check-field"><input type="checkbox" data-pen="pressure" ${penSettings.pressure ? 'checked' : ''}> Pen pressure</label><p class="text-hint">Draw on the page. Pen pressure changes stroke thickness on supported devices. Mouse and touch use a steady width.</p><div class="bt"><button data-k="pen">Done drawing</button></div></div>`;
}

/** Shape and stroke appearance controls for the selected vector element. */
function vectorPanel(e) {
  const shape = e.t === 'shape', filled = shape && !['line', 'arrow'].includes(e.v);
  return `<h4>${shape ? 'Shape' : 'Drawing'}</h4><div class="vector-settings">${filled ? `<label>Fill<input type="color" data-vector="fill" value="${/^#[\da-f]{6}$/i.test(e.fill) ? e.fill : '#1976d2'}"></label>` : ''}<label>${shape ? 'Outline' : 'Ink'}<input type="color" data-vector="${shape ? 'stroke' : 'color'}" value="${/^#[\da-f]{6}$/i.test(shape ? e.stroke : e.color) ? (shape ? e.stroke : e.color) : '#212121'}"></label>${shape ? `<label>Width (px)<input type="number" data-vector="weight" min="1" max="80" value="${+e.weight || 3}"></label>` : ''}</div>${filled ? `<label class="check-field"><input type="checkbox" data-vector="noFill" ${e.fill === 'none' ? 'checked' : ''}> No fill</label>` : ''}`;
}

/** Converts a pointer sample into clamped page coordinates and a width multiplier. */
function inkPoint(ev) {
  const bounds = $('#pg').getBoundingClientRect();
  const pressure = penSettings.pressure && ev.pointerType === 'pen' ? Math.max(0.05, Math.min(1, ev.pressure || 0.05)) : 0.5;
  const margin = blockingMargin(), pad = margin ? penSettings.weight / 2 + 1 : 0;
  const left = Math.min(W / 2, margin + pad), top = Math.min(H / 2, margin + pad);
  return [Math.max(left, Math.min(W - left, (ev.clientX - bounds.left) / s)), Math.max(top, Math.min(H - top, (ev.clientY - bounds.top) / s)), pressure];
}

/** Starts a stroke without adding unfinished work to the document history. */
function startInk(ev) {
  if (ev.button !== 0 || activeInk) return;
  const bounds = $('#pg').getBoundingClientRect(), margin = blockingMargin();
  const x = (ev.clientX - bounds.left) / s, y = (ev.clientY - bounds.top) / s;
  if (margin && (x < margin || y < margin || x > W - margin || y > H - margin)) return;
  ev.preventDefault();
  checkpoint();
  const e = { t: 'draw', id: 0, x: 0, y: 0, w: W, h: H, color: penSettings.color, weight: penSettings.weight, v: { bw: W, bh: H, points: [inkPoint(ev)] } };
  const host = document.createElement('div');
  host.className = 'ink-preview';
  host.innerHTML = renderElement(e);
  ($('#page-content') || $('#pg')).appendChild(host);
  activeInk = { element: e, page: P[c], pointerId: ev.pointerId, host };
  $('#pg').setPointerCapture(ev.pointerId);
}

/** Appends coalesced pen samples and renders at most once per animation frame. */
function moveInk(ev) {
  if (!activeInk || activeInk.pointerId !== ev.pointerId) return;
  ev.preventDefault();
  const samples = ev.getCoalescedEvents?.();
  for (const sample of samples?.length ? samples : [ev]) {
    const point = inkPoint(sample), points = activeInk.element.v.points, last = points.at(-1);
    if (Math.hypot(point[0] - last[0], point[1] - last[1]) >= 0.5 || Math.abs(point[2] - last[2]) > 0.05) points.push(point);
  }
  if (inkFrame === null) inkFrame = requestAnimationFrame(() => {
    inkFrame = null;
    if (activeInk) activeInk.host.innerHTML = renderElement(activeInk.element);
  });
}

/** Crops a stroke to its bounds, retaining pressure and editable vector geometry. */
function cropInk(element) {
  const points = element.v.points, pad = element.weight / 2 + 1;
  let left = Infinity, top = Infinity, right = -Infinity, bottom = -Infinity;
  for (const [x, y] of points) { left = Math.min(left, x); top = Math.min(top, y); right = Math.max(right, x); bottom = Math.max(bottom, y); }
  left = Math.max(0, left - pad); top = Math.max(0, top - pad);
  right = Math.min(W, right + pad); bottom = Math.min(H, bottom + pad);
  return { ...element, x: left, y: top, w: Math.max(1, right - left), h: Math.max(1, bottom - top), v: { bw: Math.max(1, right - left), bh: Math.max(1, bottom - top), points: points.map(([x, y, p]) => [x - left, y - top, p]) } };
}

/** Commits exactly one undoable element for a completed stroke. */
function finishInk(ev) {
  if (!activeInk || activeInk.pointerId !== ev.pointerId) return;
  const stroke = activeInk;
  const last = stroke.element.v.points.at(-1), endpoint = inkPoint(ev);
  if (Math.hypot(endpoint[0] - last[0], endpoint[1] - last[1]) >= 0.5) {
    endpoint[2] = last[2]; // Pointer-up pressure is zero even for a firm final mark.
    stroke.element.v.points.push(endpoint);
  }
  cancelInk();
  if (!P.includes(stroke.page)) return;
  const e = cropInk(stroke.element);
  e.id = nid++;
  constrainElement(e);
  stroke.page.e.push(e);
  selection.clear(); sel = e.id;
  draw();
}

/** Cancels unfinished ink on pointer cancellation, mode changes or navigation. */
function cancelInk() {
  if (inkFrame !== null) cancelAnimationFrame(inkFrame);
  inkFrame = null;
  if (!activeInk) return;
  const { host, pointerId } = activeInk;
  activeInk = null;
  host.remove();
  if ($('#pg').hasPointerCapture(pointerId)) $('#pg').releasePointerCapture(pointerId);
}
