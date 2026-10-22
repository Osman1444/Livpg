/** Livpg - Native clipboard and drag/drop imports. */

/** Identifies fields that should retain native editing behavior. */
function isEditing(target) {
  return target instanceof Element && !!target.closest('input, textarea, select, [contenteditable]:not([contenteditable="false"])');
}

/** Reads a local file without uploading it. */
function readImportFile(file, text = false) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Could not read ' + file.name));
    text ? reader.readAsText(file) : reader.readAsDataURL(file);
  });
}

/** Imports a transfer into the page that was active when the operation began. */
async function importTransfer(files, text, point) {
  const destination = P[c], pages = P;
  const imports = [];
  try {
    for (const file of files) {
      if (file.type.startsWith('image/')) {
        const value = await readImportFile(file);
        const image = new Image();
        await new Promise((resolve, reject) => { image.onload = resolve; image.onerror = reject; image.src = value; });
        const scale = Math.min(1, 600 / image.width, H / image.height);
        imports.push({ t: 'img', v: value, w: image.width * scale, h: image.height * scale });
      } else if (file.type.startsWith('video/')) {
        imports.push({ t: 'vid', v: await readImportFile(file), w: 480, h: 270 });
      } else if (file.type.startsWith('text/') || /\.(txt|md|csv|html?)$/i.test(file.name)) {
        const value = await readImportFile(file, true);
        imports.push({ t: /\.html?$/i.test(file.name) ? 'html' : 'txt', v: value, w: 400, h: 200 });
      } else {
        alert('Unsupported file: ' + file.name + '. Use images, videos, HTML or text files.');
      }
    }
    if (!files.length && text.trim()) {
      const value = text.trim(), youtube = youtubeEmbedURL(value);
      const url = /^https?:\/\/\S+$/i.test(value);
      const type = youtube ? 'yt' : url && /\.(mp4|webm|ogv|mov)(?:[?#].*)?$/i.test(value) ? 'vid' : url && /\.(png|jpe?g|gif|webp|svg|avif)(?:[?#].*)?$/i.test(value) ? 'img' : 'txt';
      imports.push({ t: type, v: youtube || text, w: type === 'txt' ? 400 : 480, h: type === 'txt' ? 160 : 270 });
    }
    if (P !== pages || !P.includes(destination) || !imports.length) return;
    checkpoint();
    selection.clear();
    imports.forEach((item, i) => {
      const e = { ...item, id: nid++, x: Math.round(point ? point.x + i * 20 : (W - item.w) / 2 + i * 20), y: Math.round(point ? point.y + i * 20 : 60 + i * 20) };
      if (e.t === 'html') fitToLimits(e);
      constrainElement(e);
      destination.e.push(e);
      if (P[c] === destination) { selection.add(e.id); sel = e.id; }
    });
    draw();
  } catch (error) { alert('Import failed: ' + error.message); }
}

/** Pastes files or plain text onto the canvas while preserving field paste. */
document.addEventListener('paste', ev => {
  if (!started || !$('#home').hidden || !$('#pv').hidden || $('#dl').open || $('#shape-dialog')?.open || isEditing(ev.target)) return;
  const data = ev.clipboardData;
  if (!data || (!data.files.length && !data.getData('text/plain'))) return;
  ev.preventDefault();
  importTransfer([...data.files], data.getData('text/plain'));
});

/** Accepts file and text drops over the workspace. */
$('#st').addEventListener('dragover', ev => { if (started) { ev.preventDefault(); ev.dataTransfer.dropEffect = 'copy'; } });
$('#st').addEventListener('drop', ev => {
  ev.preventDefault();
  if (!started) return;
  const bounds = $('#pg').getBoundingClientRect();
  importTransfer([...ev.dataTransfer.files], ev.dataTransfer.getData('text/plain') || ev.dataTransfer.getData('text/uri-list').split('\n').find(line => line && !line.startsWith('#')) || '', {
    x: Math.max(0, Math.min(W, (ev.clientX - bounds.left) / s)),
    y: Math.max(0, Math.min(H, (ev.clientY - bounds.top) / s)),
  });
});
