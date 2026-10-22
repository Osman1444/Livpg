/**
 * Livpg - Project lifecycle: create and open documents
 */

/** Starts an empty document with the given page size (CSS px). */
function newProject(w, h) {
  P = [{ e: [] }];
  M = { t: "Summary", f: "summary", pw: w, ph: h };
  loadState(w, h, 1);
}

/** Opens a project from the text of an exported Livpg file. */
function openProject(text) {
  const m = text.match(/id="proj">([\s\S]*?)<\/script>/);
  if (!m) return alert("This file is not a Livpg project");
  const o = JSON.parse(m[1]);
  P = o.p || o;
  M = Object.assign({ t: "Summary", f: "summary", pw: 794, ph: 1123 }, o.m);
  loadState(M.pw, M.ph, 1 + Math.max(0, ...P.flatMap((p) => p.e.map((e) => e.id))));
}

/** Resets the editor state around the freshly loaded project and leaves the home screen. */
function loadState(w, h, nextId) {
  cancelInk();
  inkMode = false;
  panelView = 'properties';
  $('#pg').classList.remove('drawing');
  $('[data-k="pen"]')?.setAttribute('aria-pressed', 'false');
  // Sanitise rich text again when opening a file or recovering a draft.
  for (const page of P) {
    for (const element of page.e) {
      if (element.t === "txt" && element.rich) element.v = cleanTextHTML(element.v);
    }
  }
  W = w;
  H = h;
  for (const page of P) for (const element of page.e) constrainElement(element);
  c = 0;
  d = null;
  sel = null;
  selection.clear();
  nid = nextId;
  z = 1;
  fw = false;
  started = true;
  updateToolbarButton($('[data-k="zf"]'), 'Fit width', 'fitWidth');
  $('[data-k="zf"]').setAttribute('aria-pressed', 'false');
  resetHistory();
  draw();
  requestAnimationFrame(fitStage); // re-fit once the layout has settled
  showHome(false);
}