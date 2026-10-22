/** Livpg - Per-page backgrounds with optional shared defaults. */
let backgroundRequest = 0;

/** Returns safe CSS for editor and exported backgrounds without editor dependencies. */
function pageBackgroundStyle(page, meta) {
  const bg = page.bg || meta.background || {};
  const color = /^#[\da-f]{6}$/i.test(bg.color || '') ? bg.color : '#ffffff';
  if (typeof bg.image !== 'string' || !bg.image.trim()) return color;
  try {
    const url = new URL(bg.image, document.baseURI);
    if (!['https:', 'http:', 'file:', 'data:', 'blob:'].includes(url.protocol) || (url.protocol === 'data:' && !/^data:image\//i.test(bg.image))) return color;
    return `${color} url(${JSON.stringify(url.href)}) center / ${bg.fit === 'contain' ? 'contain' : 'cover'} no-repeat`;
  } catch (_) { return color; }
}

/** Reads a page background while keeping old documents white. */
function currentBackground() {
  return { color: '#ffffff', image: '', fit: 'cover', ...(P[c].bg || M.background || {}) };
}

/** Updates only the current page's background, leaving all elements intact. */
function updatePageBackground() {
  $('#pg').style.background = pageBackgroundStyle(P[c], M);
}

/** Commits color/image settings to one page or all pages and future page defaults. */
function applyPageBackground(background, scope = 'page') {
  checkpoint();
  const bg = { color: /^#[\da-f]{6}$/i.test(background.color) ? background.color : '#ffffff', image: String(background.image || ''), fit: background.fit === 'contain' ? 'contain' : 'cover' };
  if (scope === 'all') {
    M.background = { ...bg };
    for (const page of P) delete page.bg;
  } else P[c].bg = bg;
  updatePageBackground();
  checkpoint();
}

/** Shows background settings independently of the current element selection. */
function backgroundPanel() {
  const bg = currentBackground();
  return `<div class="panel-content"><h4>Page background</h4><label>Apply to<select id="bg-scope"><option value="page">Current page</option><option value="all">All pages</option></select></label><label>Color<input type="color" id="bg-color" value="${/^#[\da-f]{6}$/i.test(bg.color) ? bg.color : '#ffffff'}"></label><label>Image URL or path<input id="bg-image" dir="ltr" placeholder="Image URL/path or choose a file"></label><label>Image sizing<select id="bg-fit"><option value="cover" ${bg.fit === 'cover' ? 'selected' : ''}>Cover page</option><option value="contain" ${bg.fit === 'contain' ? 'selected' : ''}>Fit inside page</option></select></label><div class="bt"><button data-a="bg-apply">Apply</button><button data-a="bg-file">Choose image</button><button data-a="bg-clear">Remove image</button><button data-a="bg-reset">Reset to white</button></div><p id="bg-status" class="text-hint" role="status">Backgrounds cover the full page, including margins.</p></div>`;
}

/** Loads a new background before committing; obsolete requests cannot overwrite newer work. */
async function replaceBackgroundImage(source, scope) {
  if (!$('#bg-color') || !$('#bg-fit')) return;
  const request = ++backgroundRequest, page = P[c], pages = P;
  const bg = { ...currentBackground(), color: $('#bg-color').value, fit: $('#bg-fit').value, image: source };
  const status = message => { if ($('#bg-status') && P[c] === page) $('#bg-status').textContent = message; };
  try {
    if (source) {
      const url = new URL(source, document.baseURI);
      if (!['http:', 'https:', 'file:', 'data:', 'blob:'].includes(url.protocol) || (url.protocol === 'data:' && !/^data:image\//i.test(source))) throw new Error('Use an image URL/path or choose a file.');
      status('Loading background…');
      const image = new Image();
      await new Promise((resolve, reject) => {
        image.onload = resolve; image.onerror = () => reject(new Error('Could not load this background image.'));
        image.src = source;
      });
    }
    if (request !== backgroundRequest || pages !== P || page !== P[c]) return;
    applyPageBackground(bg, scope);
    if ($('#bg-image')) $('#bg-image').value = /^(data:|blob:)/i.test(source) ? '' : source;
    status('Background updated.');
  } catch (error) { if (request === backgroundRequest) status(error.message); }
}
