/**
 * Livpg - Properties panel
 */

/**
 * Builds the properties panel for the selected element (or the file settings when nothing is selected).
 */
function renderPanel() {
  selectionPanelContext = currentSelectionContext();
  const e = selectedEl(),
    p = $("#pn");
  if (panelView === 'background') {
    p.innerHTML = backgroundPanel();
    const bg = currentBackground();
    $('#bg-image').value = /^(data:|blob:)/i.test(bg.image) ? '' : bg.image;
    return;
  }
  if (panelView === 'layout' && !inkMode) { p.innerHTML = alignmentPanel(); return; }
  if (e || inkMode) p.classList.add("open");
  if (inkMode) { p.innerHTML = penPanel(); return; }
  if (selectedElements().length > 1) {
    p.innerHTML = `<div class="panel-content"><h4>${selectedElements().length} elements selected</h4><p class="note">Drag to move together. Shift-click to toggle selection.</p>${elementActions()}</div>${layerActions()}`;
    return;
  }
  if (!e) {
    p.innerHTML =
      '<div class="panel-content"><h4>File settings</h4><label>Page title<input id="mt"></label><label>Export file name<input id="mf"></label><p class="note">Add an element from the dock, drag it to move it, and drag the circle to resize it.</p><div class="bt"><button data-k="background">Page background</button></div></div>';
    $("#mt").value = M.t;
    $("#mf").value = M.f;
    return;
  }
  p.innerHTML = '<div class="panel-content">' +
    (e.t == "html" ? '<textarea id="tv" rows="8"></textarea>' : "") +
    (e.t == "txt" ? richTextPanel() : "") +
    (e.t == "img" ? imageProperties() : "") +
    (["shape", "draw"].includes(e.t) ? vectorPanel(e) : "") +
    (e.t == "html" ? '<div class="bt"><button data-a="html-fit">Use suggested size</button></div>' + aiHelperHtml() : "") +
    (e.t === "shape" && ["arrow", "ellipse", "line"].includes(e.v) ? "" : `<label>Corner radius<div class="row"><input id="rr" type="range" min="0" max="400" value="${e.r || 0}" style="--v:${(e.r || 0) / 4}%"><input id="rn" type="number" value="${e.r || 0}"><button data-a="r0">Reset</button></div></label>`) + `<label>Rotation<div class="row"><input id="ra" type="range" min="-180" max="180" value="${e.a || 0}" style="--v:${((e.a || 0) + 180) / 3.6}%"><input id="an" type="number" value="${e.a || 0}"><button data-a="a0">Reset</button></div></label>` +
    elementActions() + '</div>' + layerActions();
  if (e.t === "txt") mountRichText(e);
  if (e.t === "img") $("#image-path").value = /^(data:|blob:)/i.test(e.v) ? "" : e.v;
  const t = $("#tv");
  if (t) t.value = e.v;
  if ($("#ais")) {
    $("#ais").value = AI.style;
    $("#ai").value = AI.req;
    $("#ai-size").value = AI.sizing;
    updatePromptCopyState();
  }
}

/** Options of the AI helper (kept while you select other elements). */
const AI = { style: "", req: "", ask: false, sizing: "auto" };

const aiLabel = () => (AI.ask ? "Mode: AI asks questions first" : "Mode: AI builds it right away");

/** Markup of the AI helper section shown for HTML blocks. */
function aiHelperHtml() {
  return `<h4 style="margin-top:16px">AI helper</h4>
<p class="note">Recommended: Gemini or Claude.</p>
<p class="text-hint">Describe the block, copy the prompt, then paste the generated HTML above. Complete HTML code fences are accepted.</p>
<label>Block size<select id="ai-size"><option value="auto">AI chooses a usable size</option><option value="current">Keep current dimensions</option></select></label>
<label>Style (optional)<input id="ais" placeholder="Leave blank for a modern light theme"></label>
<label>What do you want?<textarea id="ai" rows="3" required aria-describedby="ai-copy-status" placeholder="e.g. an animated bar chart of monthly sales"></textarea></label>
<div class="bt"><button data-a="ask">${aiLabel()}</button></div>
<div class="bt"><button data-a="cp" ${AI.req.trim() ? '' : 'disabled'}>Copy prompt</button></div><p id="ai-copy-status" class="text-hint" role="status"></p>`;
}

/**
 * Sets corner radius (k="r") or rotation (k="a"), keeping slider, number field and element in sync.
 */
function setProp(k, v, src) {
  const e = selectedEl(),
    n = k == "r" ? ["rr", "rn", 0, 400] : ["ra", "an", -180, 180];
  v = Math.max(n[2], Math.min(n[3], +v || 0));
  e[k] = v;
  const oldWidth = e.w, oldHeight = e.h;
  constrainElement(e);
  const s = $("#" + n[0]);
  s.value = v;
  s.style.setProperty("--v", ((v - n[2]) / (n[3] - n[2])) * 100 + "%");
  if (src != n[1]) $("#" + n[1]).value = v;
  updateElementStyle(e);
  if (e.t === "shape" && (k === "r" || e.w !== oldWidth || e.h !== oldHeight)) queueElementRefresh(e);
}

/**
 * Live edits from the panel (text, sliders, numbers, file settings).
 */
$("#pn").oninput = (ev) => {
  if (ev.target.closest("[data-rich]")) return;
  const i = ev.target,
    e = selectedEl(),
    v = i.value;
  if (i.id === 'ai-size') { AI.sizing = v; return; }
  if (i.id?.startsWith('bg-')) return;
  if (i.id === 'align-target') { alignmentTarget = v; return; }
  if (i.dataset.grid) {
    const key = i.dataset.grid;
    M.grid = { ...gridSettings(), [key]: i.type === 'checkbox' ? i.checked : key === 'mode' ? v : +v };
    M.grid = gridSettings();
    if (key === 'margin' || key === 'mode') {
      enforceDocumentMargins();
      updateMarginClip();
    }
    updateGridOverlay();
    queueCheckpoint();
    return;
  }
  if (i.id === 'image-path') return;
  if (i.dataset.pen) {
    const key = i.dataset.pen;
    penSettings[key] = key === 'pressure' ? i.checked : key === 'weight' ? Math.max(1, Math.min(80, +v || 6)) : v;
    return;
  }
  if (i.dataset.vector && e) {
    const key = i.dataset.vector;
    if (key === 'noFill') e.fill = i.checked ? 'none' : $('[data-vector="fill"]').value;
    else {
      e[key] = key === 'weight' ? Math.max(1, Math.min(80, +v || 3)) : v;
      if (key === 'fill') $('[data-vector="noFill"]').checked = false;
    }
    queueCheckpoint();
    queueElementRefresh(e);
    return;
  }
  if (i.id === 'ai' || i.id === 'ais') {
    AI[i.id === 'ai' ? 'req' : 'style'] = v;
    if (i.id === 'ai') updatePromptCopyState();
    return;
  }
  if (i.type == "range") {
    i.style.setProperty("--v", ((v - i.min) / (i.max - i.min)) * 100 + "%");
    i.style.setProperty("--sx", 1 + Math.min(0.8, Math.abs(v - (+i.dataset.p || v)) / 12));
    i.dataset.p = v;
    clearTimeout(i.t);
    i.t = setTimeout(() => i.style.setProperty("--sx", 1), 120);
  }
  queueCheckpoint();
  if (i.id == "mt") return (M.t = v);
  if (i.id == "mf") return (M.f = v);
  if (i.id == "tv") {
    e.v = e.t === "html" ? unwrapHTMLCode(v) : v;
    if (e.t == "html") {
      if (e.v !== v) i.value = e.v;
      fitToLimits(e); constrainElement(e);
    }
  }
  if (i.id == "fs") e.fs = +v || 24;
  if (i.id == "rr" || i.id == "rn") return setProp("r", v, i.id);
  if (i.id == "ra" || i.id == "an") return setProp("a", v, i.id);
  stage();
};

/**
 * Panel buttons: copy AI prompt, reset, duplicate, delete, layer order.
 */
$("#pn").onclick = async (ev) => {
  const align = ev.target.closest('[data-align]'), distribute = ev.target.closest('[data-distribute]');
  if (align) return alignElements(align.dataset.align);
  if (distribute) return distributeElements(distribute.dataset.distribute);
  const button = ev.target.closest("[data-a]"),
    a = button?.dataset.a,
    e = selectedEl(),
    L = pageEls(),
    i = L.indexOf(e);
  if (!a) return;
  if (a?.startsWith('bg-')) {
    const scope = $('#bg-scope').value;
    if (a === 'bg-file') {
      const pages = P, page = P[c];
      pickFile('image/*', source => {
        if (pages === P && page === P[c] && panelView === 'background') replaceBackgroundImage(source, scope);
      });
    } else if (a === 'bg-clear' || a === 'bg-reset') {
      backgroundRequest++;
      applyPageBackground({ ...currentBackground(), image: '', ...(a === 'bg-reset' ? { color: '#ffffff' } : {}) }, scope);
      $('#bg-image').value = '';
      if (a === 'bg-reset') $('#bg-color').value = '#ffffff';
    } else if (a === 'bg-apply') {
      const source = $('#bg-image').value.trim() || (/^(data:|blob:)/i.test(currentBackground().image) ? currentBackground().image : '');
      replaceBackgroundImage(source, scope);
    }
    return;
  }
  if (a === 'html-fit' && e?.t === 'html') {
    checkpoint();
    e.us = false; fitToLimits(e); constrainElement(e); updateElementStyle(e);
    checkpoint();
    return;
  }
  if (a === 'image-path') { replaceImageSource(e, $('#image-path').value); return; }
  if (a === 'image-file') { pickFile('image/*', value => replaceImageSource(e, value)); return; }
  if (a == "ask") {
    AI[a] = !AI[a];
    button.textContent = aiLabel();
    return;
  }
  if (a == "cp") {
    if (!AI.req.trim()) {
      updatePromptCopyState();
      $('#ai')?.focus();
      return;
    }
    const x = buildPrompt(),
      ta = document.createElement("textarea"),
      bt = button;
    ta.value = x;
    document.body.append(ta);
    ta.select();
    let copied = false;
    try { await navigator.clipboard.writeText(x); copied = true; }
    catch (_) { try { copied = document.execCommand("copy"); } catch (_) {} }
    ta.remove();
    bt.textContent = copied ? "Copied!" : "Copy failed — try again";
    setTimeout(() => (bt.textContent = "Copy prompt"), 1500);
    return;
  }
  checkpoint();
  if (["del", "dup", "up", "dn"].includes(a)) return selectionAction(a);
  if (a == "r0" || a == "a0") { setProp(a[0], 0); checkpoint(); return; }
  draw();
};

/** Applies delete, duplicate or layer movement to the entire selection. */
function selectionAction(action) {
  checkpoint();
  const items = selectedElements(), ids = new Set(items.map(e => e.id)), list = pageEls();
  if (action === 'del') {
    P[c].e = list.filter(e => !ids.has(e.id));
    selection.clear(); sel = null;
  }
  if (action === 'dup') {
    selection.clear();
    for (const e of items) {
      const copy = { ...e, id: nid++, x: e.x + 20, y: e.y + 20 };
      constrainElement(copy);
      list.push(copy); selection.add(copy.id); sel = copy.id;
    }
  }
  if (action === 'up') {
    for (let i = list.length - 2; i >= 0; i--) {
      if (ids.has(list[i].id) && !ids.has(list[i + 1].id)) [list[i], list[i + 1]] = [list[i + 1], list[i]];
    }
  }
  if (action === 'dn') {
    for (let i = 1; i < list.length; i++) {
      if (ids.has(list[i].id) && !ids.has(list[i - 1].id)) [list[i], list[i - 1]] = [list[i - 1], list[i]];
    }
  }
  draw();
}

/** Finishes a text or slider edit before another control receives focus. */
$('#pn').addEventListener('change', checkpoint);
$('#pn').addEventListener('focusout', checkpoint);


/** Renders balanced primary element actions without mixing in layer controls. */
function elementActions() {
  return `<div class="bt element-actions"><button data-a="dup">${icon('copy')}<span>Duplicate</span></button><button data-a="del" class="dg">${icon('trash')}<span>Delete</span></button></div>`;
}

/** Keeps one-step layer controls at the lower edge of the properties panel. */
function layerActions() {
  return `<div class="panel-footer" role="group" aria-label="Layer order"><button data-a="dn" title="Send backward">${icon('backward')}<span>Backward</span></button><button data-a="up" title="Bring forward">${icon('forward')}<span>Forward</span></button></div>`;
}


/** Image source replacement keeps layout and geometry intact. */
function imageProperties() {
  return `<label>Image URL or path<input id="image-path" type="text" placeholder="https://… or images/photo.png" dir="ltr"></label><div class="bt"><button data-a="image-path">Replace image</button><button data-a="image-file">Choose file</button></div><p id="image-status" class="text-hint" role="status"></p>`;
}

/** Enter applies the image path without submitting other editor controls. */
$('#pn').addEventListener('keydown', ev => {
  if (ev.target.id === 'image-path' && ev.key === 'Enter') {
    ev.preventDefault();
    replaceImageSource(selectedEl(), ev.target.value);
  }
});


/** A description is mandatory before copying a prompt, including whitespace-only input. */
function updatePromptCopyState() {
  const button = $('[data-a="cp"]'), status = $('#ai-copy-status');
  const ready = !!AI.req.trim();
  if (button) button.disabled = !ready;
  if (status) status.textContent = ready ? '' : 'Describe what you want before copying the prompt.';
  return ready;
}
