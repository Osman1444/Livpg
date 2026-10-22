/** Livpg - Enforced content margins shared by all placement operations. */

/** Fits rotated geometry inside positive page margins; zero leaves placement unrestricted. */
function constrainElement(e) {
  const margin = blockingMargin();
  if (!margin) return false;
  let bounds = elementBounds(e), changed = false;
  const scale = Math.min(1, (W - margin * 2) / bounds.width, (H - margin * 2) / bounds.height);
  if (scale < 1) {
    const cx = e.x + e.w / 2, cy = e.y + e.h / 2;
    e.w *= scale; e.h *= scale;
    e.x = cx - e.w / 2; e.y = cy - e.h / 2;
    e.us = true; changed = true;
    bounds = elementBounds(e);
  }
  const dx = Math.max(margin - bounds.left, Math.min(0, W - margin - bounds.right));
  const dy = Math.max(margin - bounds.top, Math.min(0, H - margin - bounds.bottom));
  if (dx || dy) { e.x += dx; e.y += dy; changed = true; }
  return changed;
}

/** Clamps a group drag without changing distances between selected elements. */
function constrainDrag(dx, dy, bounds) {
  const margin = blockingMargin();
  if (!margin) return { dx, dy };
  return {
    dx: Math.max(margin - bounds.left, Math.min(W - margin - bounds.right, dx)),
    dy: Math.max(margin - bounds.top, Math.min(H - margin - bounds.bottom, dy)),
  };
}

/** Applies a margin change to existing pages without rebuilding unaffected media. */
function enforceDocumentMargins() {
  const current = new Set(pageEls());
  for (const page of P) for (const element of page.e) {
    if (!constrainElement(element) || !current.has(element)) continue;
    updateElementStyle(element);
    if (element.t === 'shape') queueElementRefresh(element);
  }
}

/** Stops resize at the margin while preserving the opposite edge and rotated axes. */
function constrainResize(e, drag) {
  const margin = blockingMargin();
  if (!margin) return;
  const original = { x: drag.ox, y: drag.oy, w: drag.ow, h: drag.oh, a: e.a };
  const before = elementBounds(original), after = elementBounds(e);
  if (before.left < margin - 1e-7 || before.top < margin - 1e-7 || before.right > W - margin + 1e-7 || before.bottom > H - margin + 1e-7) { constrainElement(e); return; }
  let fraction = 1;
  for (const [edge, limit, crossed] of [['left', margin, after.left < margin], ['top', margin, after.top < margin], ['right', W - margin, after.right > W - margin], ['bottom', H - margin, after.bottom > H - margin]]) {
    if (crossed) fraction = Math.min(fraction, Math.max(0, (limit - before[edge]) / (after[edge] - before[edge])));
  }
  if (fraction < 1) for (const key of ['x','y','w','h']) e[key] = original[key] + (e[key] - original[key]) * fraction;
}


/** Only blocking margins change geometry or stop drawing samples. */
function blockingMargin() {
  const grid = gridSettings();
  return grid.mode === 'block' ? grid.margin : 0;
}

/** Self-contained clipping CSS shared with standalone exports. */
function marginClipStyle(meta) {
  const grid = meta.grid || {};
  const width = Number.isFinite(+meta.pw) && +meta.pw > 0 ? +meta.pw : 794;
  const height = Number.isFinite(+meta.ph) && +meta.ph > 0 ? +meta.ph : 1123;
  const margin = Math.max(0, Math.min(Math.min(width, height) / 2 - 1, +grid.margin || 0));
  return grid.mode === 'clip' && margin > 0 ? `inset(${margin}px)` : 'none';
}

/** Changes clipping without rebuilding any page content or affecting the background. */
function updateMarginClip() {
  const content = $('#page-content');
  if (content) content.style.clipPath = marginClipStyle(M);
}
