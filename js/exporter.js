/**
 * Livpg - Export, preview and the viewer template
 */

/**
 * Builds the standalone HTML file: viewer template + project JSON + the shared renderElement().
 */
/** Fills the page-size tokens of the viewer template. */
const sized = (s) => s.replaceAll("__PW__", M.pw).replaceAll("__PH__", M.ph);

function buildExport() {
  const json = JSON.stringify({ m: M, p: P }).replace(/</g, "\\u003c");
  const title = M.t.replace(/</g, "&lt;");
  return (
    `<!doctype html><html lang="en" dir="ltr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title>` +
    `<script>${sized(VIEWER_BOOT)}<\/script><style>${sized(VIEWER_CSS)}</style></head><body>${VIEWER_BODY}` +
    `<script type="application/json" id="proj">${json}<\/script>` +
    `<script>const renderElement=${renderElement};const pageBackgroundStyle=${pageBackgroundStyle};const marginClipStyle=${marginClipStyle};\n${sized(VIEWER_JS)}<\/script></body></html>`
  );
}

/**
 * Shows the exported file in an iframe (full width = desktop, 390px = phone).
 */
function openPreview(k) {
  const f = $("#fr");
  f.style.width = k == "ph" ? "390px" : "96vw";
  f.srcdoc = buildExport();
  $("#pv").hidden = false;
}

/**
 * Click outside the preview (or Close) to dismiss it.
 */
$("#pv").onclick = (e) => {
  if (e.target.id == "pv" || e.target.id == "cl") {
    $("#pv").hidden = true;
    $("#fr").srcdoc = "";
  }
};