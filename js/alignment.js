/** Livpg - Simple alignment, spacing and an editor-only snapping grid. */
let panelView = 'properties', alignmentTarget = 'auto';

/** Reads bounded project grid settings, including defaults for old projects. */
function gridSettings() {
  const grid = M.grid || {};
  return { mode: ['block', 'clip', 'guide'].includes(grid.mode) ? grid.mode : 'block', visible: !!grid.visible, snap: !!grid.snap, spacing: Math.max(4, Math.min(200, +grid.spacing || 20)), margin: Math.max(0, Math.min(Math.min(W, H) / 2 - 1, +grid.margin || 0)) };
}

/** Returns the page-space visual bounds of a rotated element. */
function elementBounds(e) {
  const angle = (e.a || 0) * Math.PI / 180, co = Math.abs(Math.cos(angle)), si = Math.abs(Math.sin(angle));
  const width = e.w * co + e.h * si, height = e.w * si + e.h * co;
  return { left: e.x + e.w / 2 - width / 2, top: e.y + e.h / 2 - height / 2, right: e.x + e.w / 2 + width / 2, bottom: e.y + e.h / 2 + height / 2, width, height };
}

/** Finds a group's visual bounds without altering its relative positions. */
function selectionBounds(elements) {
  let left = Infinity, top = Infinity, right = -Infinity, bottom = -Infinity;
  for (const e of elements) {
    const bounds = elementBounds(e);
    left = Math.min(left, bounds.left); top = Math.min(top, bounds.top);
    right = Math.max(right, bounds.right); bottom = Math.max(bottom, bounds.bottom);
  }
  return { left, top, right, bottom, width: right - left, height: bottom - top };
}

/** Applies selected positions to existing DOM nodes and commits one undo step. */
function commitAlignment(elements) {
  for (const e of elements) {
    constrainElement(e);
    const node = $(`#pg [data-i="${e.id}"]`);
    if (node) { node.style.left = e.x + 'px'; node.style.top = e.y + 'px'; }
  }
  checkpoint();
}

/** Aligns visual edges or centers to the page margins or selected bounds. */
function alignElements(action) {
  const elements = selectedElements();
  if (!elements.length || !['left','center','right','top','middle','bottom'].includes(action)) return;
  finishTextEditing(); checkpoint();
  const margin = gridSettings().margin;
  const target = alignmentTarget === 'page' || elements.length === 1 ? { left: margin, top: margin, right: W - margin, bottom: H - margin } : selectionBounds(elements);
  for (const e of elements) {
    const bounds = elementBounds(e);
    const delta = action === 'left' ? target.left - bounds.left : action === 'center' ? (target.left + target.right - bounds.left - bounds.right) / 2 : action === 'right' ? target.right - bounds.right : action === 'top' ? target.top - bounds.top : action === 'middle' ? (target.top + target.bottom - bounds.top - bounds.bottom) / 2 : target.bottom - bounds.bottom;
    if (['left','center','right'].includes(action)) e.x += delta;
    else e.y += delta;
  }
  commitAlignment(elements);
}

/** Makes equal visual gaps between at least three elements, keeping endpoints fixed. */
function distributeElements(axis) {
  const elements = selectedElements();
  if (elements.length < 3 || !['x','y'].includes(axis)) return;
  finishTextEditing(); checkpoint();
  const horizontal = axis === 'x', start = horizontal ? 'left' : 'top', end = horizontal ? 'right' : 'bottom', size = horizontal ? 'width' : 'height';
  const ordered = elements.map(e => ({ e, bounds: elementBounds(e) })).sort((a,b) => a.bounds[start] - b.bounds[start] || a.e.id - b.e.id);
  const first = ordered[0], last = ordered.at(-1);
  const gap = (last.bounds[start] - first.bounds[end] - ordered.slice(1,-1).reduce((sum,item) => sum + item.bounds[size], 0)) / (ordered.length - 1);
  let position = first.bounds[end] + gap;
  for (const item of ordered.slice(1,-1)) {
    item.e[axis] += position - item.bounds[start];
    position += item.bounds[size] + gap;
  }
  commitAlignment(elements);
}

/** Snaps a drag delta at the group's visual top-left, retaining group offsets. */
function snapDrag(dx, dy, bounds, bypass = false) {
  const grid = gridSettings();
  if (!grid.snap || bypass) return constrainDrag(dx, dy, bounds);
  const snap = value => grid.margin + Math.round((value - grid.margin) / grid.spacing) * grid.spacing;
  return constrainDrag(snap(bounds.left + dx) - bounds.left, snap(bounds.top + dy) - bounds.top, bounds);
}

/** Updates only the non-interactive editor grid; it is never included in exports. */
function updateGridOverlay() {
  $('#editor-grid')?.remove();
  const grid = gridSettings();
  if (!grid.visible) return;
  $('#pg').insertAdjacentHTML('afterbegin', `<svg id="editor-grid" class="editor-grid" viewBox="0 0 ${W} ${H}" aria-hidden="true"><defs><pattern id="editor-grid-pattern" x="${grid.margin}" y="${grid.margin}" width="${grid.spacing}" height="${grid.spacing}" patternUnits="userSpaceOnUse"><path d="M${grid.spacing} 0H0V${grid.spacing}" fill="none" stroke="var(--grid)" stroke-width="0.6"/></pattern></defs><rect width="${W}" height="${H}" fill="url(#editor-grid-pattern)"/>${grid.margin ? `<rect x="${grid.margin}" y="${grid.margin}" width="${W - grid.margin * 2}" height="${H - grid.margin * 2}" fill="none" stroke="var(--mu)" stroke-dasharray="5 5"/>` : ''}</svg>`);
}

/** Compact Figma-style alignment and customizable grid controls. */
function alignmentPanel() {
  const grid = gridSettings(), count = selectedElements().length;
  const controls = [['left','Align left','alignLeft'],['center','Center horizontally','alignCenter'],['right','Align right','alignRight'],['top','Align top','alignTop'],['middle','Center vertically','alignMiddle'],['bottom','Align bottom','alignBottom']];
  return `<div class="panel-content"><h4>Align & grid</h4><p class="text-hint">${count ? `${count} selected` : 'Select elements on the page to align them.'}</p><label>Align to<select id="align-target"><option value="auto" ${alignmentTarget === 'auto' ? 'selected' : ''}>Auto: page / selection</option><option value="page" ${alignmentTarget === 'page' ? 'selected' : ''}>Page margins</option><option value="selection" ${alignmentTarget === 'selection' ? 'selected' : ''}>Selection bounds</option></select></label><div class="alignment-tools" role="group" aria-label="Align elements">${controls.map(([action,label,name]) => `<button data-align="${action}" aria-label="${label}" title="${label}" ${!count ? 'disabled' : ''}>${icon(name)}</button>`).join('')}</div><div class="alignment-tools distribution" role="group" aria-label="Distribute elements"><button data-distribute="x" title="Distribute horizontal gaps" aria-label="Distribute horizontal gaps" ${count < 3 ? 'disabled' : ''}>${icon('distributeX')}</button><button data-distribute="y" title="Distribute vertical gaps" aria-label="Distribute vertical gaps" ${count < 3 ? 'disabled' : ''}>${icon('distributeY')}</button></div><h4>Grid</h4><label class="check-field"><input type="checkbox" data-grid="visible" ${grid.visible ? 'checked' : ''}> Show grid</label><label class="check-field"><input type="checkbox" data-grid="snap" ${grid.snap ? 'checked' : ''}> Snap when dragging</label><div class="vector-settings"><label>Spacing (px)<input type="number" min="4" max="200" data-grid="spacing" value="${grid.spacing}"></label><label>Page margin (px)<input type="number" min="0" max="${Math.floor(Math.min(W,H)/2-1)}" data-grid="margin" value="${grid.margin}"></label></div><label>Margin behavior<select data-grid="mode"><option value="block" ${grid.mode === 'block' ? 'selected' : ''}>Block content</option><option value="clip" ${grid.mode === 'clip' ? 'selected' : ''}>Hide parts outside margins</option><option value="guide" ${grid.mode === 'guide' ? 'selected' : ''}>Grid guide only</option></select></label><p class="text-hint">One element aligns to the page; multiple align to their selection bounds in Auto. Distribution needs three or more. Hold Alt while dragging to bypass snapping. Block prevents crossing margins; Hide clips content without moving it; Grid guide only leaves content unrestricted. The grid is editor-only.</p></div>`;
}
