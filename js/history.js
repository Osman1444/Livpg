/** Livpg - Document history and persistent browser drafts. */
let history = [], historyIndex = -1, historyTimer, draftTimer, draftDB;

/** Serialises document content; selection and viewport are not edits. */
function documentSnapshot() {
  return JSON.stringify({ m: M, p: P });
}

/** Starts a separate history for a newly created or opened document. */
function resetHistory() {
  clearTimeout(historyTimer);
  history = [documentSnapshot()];
  historyIndex = 0;
  updateHistoryButtons();
  scheduleDraft();
}

/** Records a complete edit, discarding the redo branch after a new edit. */
function checkpoint() {
  clearTimeout(historyTimer);
  if (!started || historyIndex < 0) return;
  const snapshot = documentSnapshot();
  if (snapshot !== history[historyIndex]) {
    history.splice(historyIndex + 1);
    history.push(snapshot);
    if (history.length > 60) history.shift();
    historyIndex = history.length - 1;
    scheduleDraft();
  }
  updateHistoryButtons();
}

/** Groups successive input events into one undo operation. */
function queueCheckpoint() {
  clearTimeout(historyTimer);
  historyTimer = setTimeout(checkpoint, 500);
  scheduleDraft();
}

/** Restores an edit while retaining a valid current page and element IDs. */
function undoRedo(delta) {
  checkpoint();
  const index = historyIndex + delta;
  if (index < 0 || index >= history.length) return;
  historyIndex = index;
  const state = JSON.parse(history[index]);
  M = state.m;
  P = state.p;
  W = M.pw;
  H = M.ph;
  c = Math.min(c, P.length - 1);
  sel = null;
  selection.clear();
  nid = 1 + Math.max(0, ...P.flatMap(p => p.e.map(e => e.id)));
  draw();
  scheduleDraft();
}

/** Updates the visible undo and redo controls. */
function updateHistoryButtons() {
  $('[data-k="undo"]').disabled = historyIndex <= 0;
  $('[data-k="redo"]').disabled = historyIndex >= history.length - 1;
}

/** Debounces draft writes; IndexedDB accommodates embedded image and video data. */
function scheduleDraft() {
  clearTimeout(draftTimer);
  draftTimer = setTimeout(saveDraft, 250);
}

/** Saves the latest document and reports storage failures in the toolbar. */
function saveDraft() {
  if (!started || !draftDB) return;
  try {
    const tx = draftDB.transaction('drafts', 'readwrite');
    tx.objectStore('drafts').put({ m: M, p: P }, 'current');
    tx.oncomplete = () => $('#save-status').textContent = 'Saved locally';
    tx.onerror = () => $('#save-status').textContent = 'Autosave failed — export your project';
    tx.onabort = tx.onerror;
  } catch (_) {
    $('#save-status').textContent = 'Autosave unavailable — export your project';
  }
}

/** Opens browser storage and restores the latest draft unless the user already started. */
function restoreDraft() {
  try {
    const request = indexedDB.open('livpg', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('drafts');
    request.onerror = () => $('#save-status').textContent = 'Autosave unavailable — export your project';
    request.onsuccess = () => {
      draftDB = request.result;
      const read = draftDB.transaction('drafts').objectStore('drafts').get('current');
      read.onsuccess = () => {
        if (started) return void saveDraft();
        const saved = read.result;
        if (!saved || !Array.isArray(saved.p) || !saved.p.length) return;
        M = saved.m;
        P = saved.p;
        loadState(M.pw, M.ph, 1 + Math.max(0, ...P.flatMap(p => p.e.map(e => e.id))));
      };
    };
  } catch (_) {
    $('#save-status').textContent = 'Autosave unavailable — export your project';
  }
}

/** Flushes drafts when leaving or backgrounding the editor. */
addEventListener('pagehide', saveDraft);
document.addEventListener('visibilitychange', () => { if (document.hidden) saveDraft(); });
