/**
 * Livpg - Stage (page canvas, zoom/fit) and page tabs
 */

/**
 * Fits the page into the stage, renders its elements and draws handles on the selected one.
 */
function stage() {
  cancelInk();
  finishTextEditing();
  fitStage();
  updatePageBackground();
  const g = $("#pg");
  g.innerHTML = '<div id="page-content" class="page-content">' + pageEls().map(renderElement).join("") + '</div>';
  updateMarginClip();
  updateGridOverlay();
  updateSelectionUI();
}

/**
 * Scales and sizes the page to fit the stage, using the document's own page size (W x H).
 * Only touches sizes, never the elements, so resizing the window or opening the panel
 * does not restart videos or reload HTML blocks.
 */
function fitStage() {
  const st = $("#st"),
    cs = getComputedStyle(st),
    availW = st.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight),
    availH = st.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
  // Fit page: the whole page is visible. Fit width: only the width is fitted, scroll for the rest.
  s = Math.max(0.1, Math.min(1.5, availW / W, fw ? Infinity : availH / H)) * z;
  $("#pw").style.cssText = `width:${W * s}px;height:${H * s}px`;
  const g = $("#pg");
  g.style.transform = `scale(${s})`;
  g.style.width = W + "px";
  g.style.height = H + "px";
}

/**
 * Full refresh: stage + page tabs + properties panel.
 */
function draw() {
  stage();
  tabs();
  renderPanel();
  checkpoint();
}

/**
 * Rebuilds the page tabs when the page count changes, then slides the accent lens to the current tab.
 */
function tabs() {
  const g = $("#seg");
  if (g.querySelectorAll("button").length != P.length) {
    g.querySelectorAll("button").forEach((b) => b.remove());
    P.forEach((_, i) => {
      const b = document.createElement("button");
      b.dataset.p = i;
      b.textContent = i + 1;
      b.draggable = true;
      b.title = `Page ${i + 1} — drag to reorder`;
      b.setAttribute('aria-label', `Page ${i + 1}`);
      g.append(b);
    });
  }
  g.querySelectorAll("button").forEach((b) => b.classList.toggle("on", +b.dataset.p == c));
  $('[data-k="page-prev"]').disabled = c === 0;
  $('[data-k="page-next"]').disabled = c === P.length - 1;
  const b = g.querySelector(".on"),
    Ln = $("#lens"),
    x = b.offsetLeft;
  b.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
  Ln.style.width = b.offsetWidth + "px";
  Ln.style.transform = `translateX(${x}px) scaleX(1.15)`;
  clearTimeout(Ln.t);
  Ln.t = setTimeout(() => (Ln.style.transform = `translateX(${x}px)`), 160);
}

/**
 * Selects a page from a pointer position (so a finger can drag across the tabs).
 */
const hit = (ev) => {
  if (pageDrag) return;
  const b = document.elementFromPoint(ev.clientX, ev.clientY),
    q = b && b.closest("[data-p]");
  if (q && +q.dataset.p != c) {
    c = +q.dataset.p;
    sel = null;
    selection.clear();
    draw();
  }
};

$("#seg").onpointerdown = hit;

$("#seg").onpointermove = (ev) => {
  if (ev.buttons && ev.pointerType !== 'mouse') hit(ev);
};

/**
 * Re-fit the page whenever the stage changes size (window resize, properties panel opening).
 */
new ResizeObserver(fitStage).observe($("#st"));

/** Updates one element's styles without recreating media, text or sibling elements. */
function updateElementStyle(e) {
  const node = $(`#pg [data-i="${e.id}"]`);
  if (!node) return;
  Object.assign(node.style, { left: e.x + 'px', top: e.y + 'px', width: e.w + 'px', height: e.h + 'px' });
  node.style.transform = `rotate(${e.a || 0}deg)`;
  node.style.borderRadius = (e.t === 'shape' ? 0 : e.r || 0) + 'px';
}

let elementRefreshFrame = null;
const elementRefreshes = new Map();

/** Coalesces geometric/content changes to each affected element once per frame. */
function queueElementRefresh(e) {
  elementRefreshes.set(e.id, e);
  if (elementRefreshFrame !== null) return;
  elementRefreshFrame = requestAnimationFrame(() => {
    elementRefreshFrame = null;
    for (const element of elementRefreshes.values()) {
      if (pageEls().includes(element)) refreshElementContent(element);
    }
    elementRefreshes.clear();
  });
}

/** Replaces only the selected element's content, preserving its wrapper and handles. */
function refreshElementContent(e) {
  const node = $(`#pg [data-i="${e.id}"]`);
  if (!node) return;
  const template = document.createElement('template');
  template.innerHTML = renderElement(e);
  const content = template.content.firstElementChild.firstElementChild;
  node.firstElementChild.replaceWith(content);
  updateElementStyle(e);
}


let pageDrag = null;

/** Moves a page as one edit, preserving its elements, background and active canvas. */
function movePage(from, to) {
  if (!Number.isInteger(from) || !Number.isInteger(to) || from < 0 || to < 0 || from >= P.length || to >= P.length || from === to) return;
  finishTextEditing();
  cancelInk();
  checkpoint();
  const active = P[c], [page] = P.splice(from, 1);
  P.splice(to, 0, page);
  c = P.indexOf(active);
  tabs();
  checkpoint();
}

/** Begins desktop tab reordering; touch and keyboard use the move-arrow controls. */
$('#seg').addEventListener('dragstart', ev => {
  const tab = ev.target.closest('[data-p]');
  if (!tab) return;
  pageDrag = P[+tab.dataset.p];
  ev.dataTransfer.effectAllowed = 'move';
  ev.dataTransfer.setData('application/x-livpg-page', tab.dataset.p);
  tab.classList.add('page-dragging');
});

/** Marks the target tab without changing the active page during a drag. */
$('#seg').addEventListener('dragover', ev => {
  if (!pageDrag) return;
  const tab = ev.target.closest('[data-p]');
  if (!tab) return;
  ev.preventDefault();
  ev.dataTransfer.dropEffect = 'move';
  $('#seg').querySelectorAll('.page-drop').forEach(node => node.classList.remove('page-drop'));
  tab.classList.add('page-drop');
});

/** Drops a page into the target tab position. */
$('#seg').addEventListener('drop', ev => {
  if (!pageDrag) return;
  ev.preventDefault();
  const tab = ev.target.closest('[data-p]'), from = P.indexOf(pageDrag);
  pageDrag = null;
  if (tab) movePage(from, +tab.dataset.p);
  clearPageDrag();
});

/** Clears drag indicators after drops or cancelled drags. */
function clearPageDrag() {
  pageDrag = null;
  $('#seg').querySelectorAll('.page-dragging, .page-drop').forEach(node => node.classList.remove('page-dragging', 'page-drop'));
}
$('#seg').addEventListener('dragend', clearPageDrag);
