/**
 * Livpg - Adding elements: files, links and dialogs
 */

/**
 * Adds an element to the current page, centred, and selects it.
 */
function addElement(t, v, w, h) {
  const e = {
    id: nid++,
    t,
    v,
    x: Math.round((W - w) / 2),
    y: 60,
    w: Math.round(w),
    h: Math.round(h),
  };
  constrainElement(e);
  pageEls().push(e);
  selection.clear();
  sel = e.id;
  draw();
}

/**
 * Opens the file picker and returns the file as a data URL (or text when txt is true).
 */
function pickFile(acc, cb, txt) {
  const i = document.createElement("input");
  i.type = "file";
  i.accept = acc;
  i.onchange = () => {
    if (!i.files[0]) return;
    const r = new FileReader();
    r.onload = () => cb(r.result);
    txt ? r.readAsText(i.files[0]) : r.readAsDataURL(i.files[0]);
  };
  i.click();
}

/**
 * Small dialog asking for a link (and optionally offering a file picker).
 */
function askDialog(h, file, cb, fcb) {
  const D = $("#dl");
  $("#dh").textContent = h;
  $("#du").value = "";
  $("#du").placeholder = "Video URL or YouTube link";
  $("#df").hidden = !file;
  D.showModal();
  $("#dg").onclick = () => {
    const u = $("#du").value.trim();
    if (u) {
      D.close();
      cb(u);
    }
  };
  $("#df").onclick = () => {
    D.close();
    fcb();
  };
  $("#dx").onclick = () => D.close();
}

/** Recognises supported YouTube URLs, leaving other video links unchanged. */
function youtubeEmbedURL(value) {
  try {
    const url = new URL(value);
    if (!['http:', 'https:'].includes(url.protocol)) return null;
    const host = url.hostname.toLowerCase().replace(/^www\./, '');
    let id;
    if (host === 'youtu.be') id = url.pathname.split('/')[1];
    else if (['youtube.com', 'm.youtube.com', 'music.youtube.com', 'youtube-nocookie.com'].includes(host)) {
      const parts = url.pathname.split('/');
      id = url.pathname === '/watch' ? url.searchParams.get('v') : ['embed', 'shorts', 'live'].includes(parts[1]) ? parts[2] : null;
    }
    return /^[\w-]{11}$/.test(id || '') ? 'https://www.youtube.com/embed/' + id : null;
  } catch (_) { return null; }
}

/** Adds either a YouTube embed or a direct video URL through the same action. */
function addVideoLink(value) {
  const embed = youtubeEmbedURL(value);
  if (embed) addElement('yt', embed, 480, 270);
  else {
    try {
      const url = new URL(value);
      if (!['http:', 'https:', 'data:', 'blob:'].includes(url.protocol)) throw new Error();
      if (/^(?:www\.|m\.|music\.)?youtube\.com$|^(?:www\.)?youtu\.be$/i.test(url.hostname)) return alert('Enter a valid YouTube video link.');
      addElement('vid', value, 480, 270);
    } catch (_) { alert('Enter a video URL or YouTube link.'); }
  }
}

const imageReplacements = new WeakMap();

/** Loads replacement images first; stale, failed or deleted requests leave the model untouched. */
async function replaceImageSource(element, value) {
  if (!element || element.t !== 'img') return false;
  const token = {}, source = String(value || '').trim();
  imageReplacements.set(element, token);
  const status = message => {
    if (selectedEl() === element && $('#image-status')) $('#image-status').textContent = message;
  };
  try {
    if (!source) throw new Error('Enter an image URL/path or choose a file.');
    const url = new URL(source, document.baseURI);
    if (!['https:', 'http:', 'file:', 'data:', 'blob:'].includes(url.protocol) || (url.protocol === 'data:' && !/^data:image\//i.test(source))) throw new Error('Use an image URL/path or choose a file.');
    status('Loading image…');
    const image = new Image();
    await new Promise((resolve, reject) => {
      image.onload = resolve;
      image.onerror = () => reject(new Error('Could not load this image. Check the path or choose a file.'));
      image.src = source;
    });
    if (imageReplacements.get(element) !== token || !P.some(page => page.e.includes(element))) return false;
    checkpoint();
    element.v = source;
    const node = $(`#pg [data-i="${element.id}"] > img`);
    if (node && pageEls().includes(element)) node.src = source;
    if (selectedEl() === element && $('#image-path')) $('#image-path').value = /^(data:|blob:)/i.test(source) ? '' : source;
    checkpoint();
    status('Image replaced.');
    return true;
  } catch (error) {
    if (imageReplacements.get(element) === token) status(error.message);
    return false;
  }
}
