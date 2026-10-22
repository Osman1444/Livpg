/**
 * Livpg - Pointer interactions: move and resize
 */

/**
 * Drag to move; drag a corner/edge handle to resize. Resizing keeps the opposite side fixed, even when rotated.
 */
const pg = $("#pg");

pg.onpointerdown = (ev) => {
  if (inkMode) { startInk(ev); return; }
  if (ev.button !== 0 || ev.target.closest('[contenteditable="true"]')) return;
  checkpoint();
  const el = ev.target.closest(".el");
  if (!el) {
    if (sel === null && !selection.size) return;
    selection.clear();
    sel = null;
    refreshSelection();
    return;
  }
  const id = +el.dataset.i;
  if (multiSelect || ev.shiftKey || ev.ctrlKey || ev.metaKey) {
    if (sel) selection.add(sel);
    if (selection.has(id)) selection.delete(id);
    else selection.add(id);
    sel = [...selection].at(-1) || null;
    refreshSelection();
    return;
  }
  if (!selection.has(id) && sel !== id) selection.clear();
  selection.add(id);
  sel = id;
  const e = selectedEl();
  d = {
    h: ev.target.dataset.h,
    x: ev.clientX,
    y: ev.clientY,
    ox: e.x,
    oy: e.y,
    ow: e.w,
    oh: e.h,
    e,
    bounds: selectionBounds(selectedElements()),
    group: selectedElements().map(item => ({ item, x: item.x, y: item.y })),
  };
  refreshSelection();
  pg.setPointerCapture(ev.pointerId);
};

pg.onpointermove = (ev) => {
  if (activeInk) { moveInk(ev); return; }
  if (!d) return;
  const dx = (ev.clientX - d.x) / s,
    dy = (ev.clientY - d.y) / s,
    e = d.e;
  if (d.h) {
    const a = ((e.a || 0) * Math.PI) / 180,
      co = Math.cos(a),
      si = Math.sin(a),
      u = dx * co + dy * si, // pointer movement along the element's own axes
      v = dy * co - dx * si,
      h = d.h,
      grow = (neg, pos, delta) => (h.includes(pos) ? delta : h.includes(neg) ? -delta : 0),
      size = limitSize(e, d.ow + grow("w", "e", u), d.oh + grow("n", "s", v), h),
      // Move the centre so the side opposite the handle stays in place.
      sx = grow("w", "e", size.w - d.ow) / 2,
      sy = grow("n", "s", size.h - d.oh) / 2,
      cx = d.ox + d.ow / 2 + sx * co - sy * si,
      cy = d.oy + d.oh / 2 + sx * si + sy * co;
    e.us = true; // the user sized it by hand: stop applying the block's preferred size
    e.w = size.w;
    e.h = size.h;
    e.x = cx - size.w / 2;
    e.y = cy - size.h / 2;
    constrainResize(e, d);
    if (e.t === "shape") queueElementRefresh(e);
  } else {
    const snapped = snapDrag(dx, dy, d.bounds, ev.altKey);
    for (const { item, x, y } of d.group) {
      item.x = x + snapped.dx;
      item.y = y + snapped.dy;
      const node = pg.querySelector(`[data-i="${item.id}"]`);
      node.style.left = item.x + "px";
      node.style.top = item.y + "px";
    }
  }
  const n = pg.querySelector(`[data-i="${e.id}"]`);
  Object.assign(n.style, {
    left: e.x + "px",
    top: e.y + "px",
    width: e.w + "px",
    height: e.h + "px",
  });
};

pg.onpointerup = (ev) => {
  if (activeInk) { finishInk(ev); return; }
  d = null;
  checkpoint();
};
pg.onpointercancel = pg.onlostpointercapture = (ev) => {
  if (activeInk && activeInk.pointerId !== ev.pointerId) return;
  cancelInk();
  d = null;
  checkpoint();
};

/** Keyboard document actions; editable fields keep native clipboard and undo behavior. */
addEventListener("keydown", (e) => {
  if (!started || !$('#home').hidden || !$('#pv').hidden || $('#dl').open || $('#shape-dialog')?.open || isEditing(e.target)) return;
  if (e.key === 'Escape' && inkMode) { setInkMode(false); return; }
  const modifier = e.ctrlKey || e.metaKey;
  if (modifier && ['z', 'y'].includes(e.key.toLowerCase())) {
    e.preventDefault();
    undoRedo(e.key.toLowerCase() === 'y' || e.shiftKey ? 1 : -1);
  }
  if (modifier && e.key.toLowerCase() === 'a') {
    e.preventDefault();
    pageEls().forEach(item => selection.add(item.id));
    sel = pageEls().at(-1)?.id || null;
    refreshSelection();
  }
  if (e.key === 'Escape') { selection.clear(); sel = null; refreshSelection(); }
  if (e.key === 'Delete' || e.key === 'Backspace') {
    e.preventDefault();
    selectionAction('del');
  }
});


/** Double-clicking a text element enters editing instead of canvas dragging. */
pg.addEventListener('dblclick', ev => {
  if (inkMode) return;
  const wrapper = ev.target.closest('.el') || document.elementFromPoint(ev.clientX, ev.clientY)?.closest('.el');
  const element = wrapper && pageEls().find(item => item.id === +wrapper.dataset.i);
  if (!element || element.t !== 'txt' || ev.target.closest('[contenteditable="true"]')) return;
  ev.preventDefault();
  selection.clear();
  selection.add(element.id);
  sel = element.id;
  d = null;
  refreshSelection();
  beginTextEditing(element);
});
