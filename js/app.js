/**
 * Livpg - Wiring: actions and start-up
 */

/**
 * Central click handler: every toolbar, dock and page-tab button carries a data-k action name.
 */
document.onclick = (ev) => {
  const b = ev.target.closest("[data-k]"),
    k = b && b.dataset.k;
  if (!k) return;
  if (k == "multi") {
    multiSelect = !multiSelect;
    b.setAttribute("aria-pressed", String(multiSelect));
    updateToolbarButton(b, multiSelect ? "Finish selection" : "Select multiple");
  }
  if (k == "undo" || k == "redo") undoRedo(k == "undo" ? -1 : 1);
  if (k === 'layout' || k === 'background') {
    if (inkMode) setInkMode(false);
    finishTextEditing();
    panelView = k;
    renderPanel();
    $('#pn').classList.remove('hide');
    $('#pn').classList.add('open');
  }
  if (k === 'shapes') { setInkMode(false); $('#shape-dialog').showModal(); }
  if (k === 'pen') setInkMode(!inkMode);
  if (k === 'shape-close') $('#shape-dialog').close();
  if (k.startsWith('shape-') && k !== 'shape-close') {
    $('#shape-dialog').close();
    addShape(k.slice(6));
  }
  if (['txt', 'img', 'vid', 'html', 'np', 'dp', 'op', 'home'].includes(k) && inkMode) setInkMode(false);
  if (k == "txt") addElement("txt", "Type here", 300, 60);
  if (k == "img")
    pickFile("image/*", (v) => {
      const m = new Image();
      m.onload = () => {
        const r = Math.min(1, 600 / m.width);
        addElement("img", v, m.width * r, m.height * r);
      };
      m.src = v;
    });
  if (k == "vid")
    askDialog(
      "Add video or YouTube",
      1,
      addVideoLink,
      () => pickFile("video/*", (v) => addElement("vid", v, 480, 270)),
    );
  if (k == "zi" || k == "zo" || k == "zf") {
    if (k == "zf") {
      fw = !fw;
      updateToolbarButton(b, fw ? "Fit page" : "Fit width", fw ? "fitPage" : "fitWidth");
      b.setAttribute("aria-pressed", String(fw));
    }
    z = k == "zf" ? 1 : Math.min(3, Math.max(0.3, z * (k == "zi" ? 1.2 : 1 / 1.2)));
    fitStage();
  }
  if (k == "html")
    addElement("html", '<h2 style="font-family:sans-serif">Custom HTML</h2>', Math.min(560, W), Math.min(420, H));
  if (k == "th") toggleTheme();
  if (k == "home") showHome(true);
  // Phone: expand/collapse the panel above the dock. Desktop: slide it out to the right.
  if (k == "pp") {
    if (panelView !== 'properties') {
      panelView = 'properties'; renderPanel();
      $('#pn').classList.remove('hide'); $('#pn').classList.add('open');
    } else $('#pn').classList.toggle(matchMedia('(max-width:900px)').matches ? 'open' : 'hide');
  }
  if (k === "page-prev" || k === "page-next") movePage(c, c + (k === "page-prev" ? -1 : 1));
  if (k == "np") {
    P.splice(c + 1, 0, { e: [] });
    c++;
    sel = null;
    selection.clear();
    draw();
  }
  if (k == "dp" && P.length > 1 && confirm("Delete this page?")) {
    P.splice(c, 1);
    c = Math.max(0, c - 1);
    sel = null;
    selection.clear();
    draw();
  }
  if (k == "pc" || k == "ph") openPreview(k);
  if (k == "op") pickFile(".html", openProject, 1);
  if (k == "ex") {
    const b = new Blob([buildExport()], { type: "text/html" }),
      a = document.createElement("a");
    a.href = URL.createObjectURL(b);
    a.download = (M.f || "summary").replace(/\.html$/i, "") + ".html";
    a.click();
    alert(
      "Size: " +
        (b.size / 1048576).toFixed(1) +
        " MB" +
        (b.size > 2e7 ? " — large, consider linking videos" : ""),
    );
  }
};

/**
 * Dock tiles: key -> [label, SVG path].
 */
const IC = {
  txt: ["Text", "M5 4v3h5.5v12h3V7H19V4z"],
  img: [
    "Image",
    "M21 19V5a2 2 0 00-2-2H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2zM8.5 13.5l2.5 3 3.5-4.5 4.5 6H5z",
  ],
  vid: [
    "Video",
    "M17 10.5V7a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h12a1 1 0 001-1v-3.5l4 4v-11z",
  ],
  html: ["HTML", "M9.4 16.6L4.8 12l4.6-4.6L8 6l-6 6 6 6zm5.2 0l4.6-4.6-4.6-4.6L16 6l6 6-6 6z"],
  shapes: ['Shapes', 'M3 3h8v8H3zM17 3l5 8H12zM3 17a5 5 0 1 0 10 0 5 5 0 0 0-10 0M17 14l5 4-5 4-5-4z'],
  pen: ['Draw', 'm4 15 10-10 5 5L9 20H4zm12-12 2-2 5 5-2 2z'],
  background: ['Background', 'M3 3h18v18H3zM5 5v14h14V5zm1 12 4-5 3 3 2-2 3 4z'],
  layout: ['Layout', 'M3 3h2v18H3zM8 5h13v4H8zM8 12h8v4H8zM8 19h13v2H8z'],
  pp: [
    "Properties",
    "M3 17v2h6v-2zM3 5v2h10V5zm10 16v-2h8v-2h-8v-2h-2v6zM7 9v2H3v2h4v2h2V9zm14 4v-2H11v2zm-6-4h2V7h4V5h-4V3h-2z",
  ],
};

$("#dock").innerHTML = Object.entries(IC)
  .map(
    ([k, [n, d]]) =>
      `<button class="tile" data-k="${k}" aria-label="${n}"${k === "pen" ? ' aria-pressed="false"' : ""}><svg viewBox="0 0 24 24" aria-hidden="true"><path fill-rule="evenodd" d="${d}"/></svg><span>${n}</span></button>`,
  )
  .join("");

/** Initialises toolbar icons while preserving accessible action names. */
document.querySelectorAll('#tb [data-icon]').forEach(button => updateToolbarButton(button, button.getAttribute('aria-label')));
$('[data-export-icon]').innerHTML = icon('export');

/**
 * First render.
 */
draw();
restoreDraft();
