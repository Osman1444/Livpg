/** Livpg - Inline canvas text editing and a compact formatting toolbar. */
let textRange = null, editingText = null;

/** Builds compact controls with accessible names and hover descriptions. */
function richTextPanel() {
  const commands = [
    ['bold', 'Bold', '<b>B</b>'], ['italic', 'Italic', '<i>I</i>'],
    ['underline', 'Underline', '<u>U</u>'], ['strikeThrough', 'Strike-through', '<s>S</s>'],
    ['insertUnorderedList', 'Bulleted list', '•≡'], ['insertOrderedList', 'Numbered list', '1≡'],
    ['justifyLeft', 'Align left', '<svg viewBox="0 0 20 20"><path d="M3 4h14M3 8h9M3 12h14M3 16h9"/></svg>'],
    ['justifyCenter', 'Align center', '<svg viewBox="0 0 20 20"><path d="M3 4h14M6 8h8M3 12h14M6 16h8"/></svg>'],
    ['justifyRight', 'Align right', '<svg viewBox="0 0 20 20"><path d="M3 4h14M8 8h9M3 12h14M8 16h9"/></svg>'],
    ['removeFormat', 'Clear formatting', 'T×'],
  ];
  return `<section data-rich><div class="text-toolbar" role="toolbar" aria-label="Text formatting">
    <div class="text-tools text-fonts"><select aria-label="Font family" title="Font family" data-text-style="font-family"><option value="sans-serif">Sans serif</option><option value="serif">Serif</option><option value="monospace">Monospace</option><option value="Arial">Arial</option><option value="Georgia">Georgia</option><option value="Tahoma">Tahoma</option></select><input aria-label="Font size in pixels" title="Font size (px)" type="number" min="8" max="200" value="24" data-text-style="font-size"></div>
    <div class="text-tools">${commands.map(([cmd, label, icon]) => `<button type="button" data-format="${cmd}" aria-label="${label}" title="${label}">${icon}</button>`).join('')}</div>
    <div class="text-tools"><label class="text-color" title="Text color"><span aria-hidden="true">A</span><input aria-label="Text color" type="color" value="#111111" data-text-style="color"></label><div class="text-color"><button type="button" data-highlight-toggle aria-label="Toggle highlight" title="Toggle highlight" aria-pressed="false">▰</button><input aria-label="Highlight color" type="color" value="#ffff00" data-text-style="background-color" title="Highlight color"></div><select aria-label="Text direction" title="Text direction" data-text-style="direction"><option value="auto">↔ Auto</option><option value="ltr">→ LTR</option><option value="rtl">← RTL</option></select><input aria-label="Line spacing" title="Line spacing" type="number" min="0.8" max="4" step="0.1" value="1.2" data-text-style="line-height"></div>
    </div><p class="text-hint">Double-click text on the page to edit. Esc to finish.</p></section>`;
}

/** Gets sanitized rich markup using the same self-contained renderer as export. */
function cleanTextHTML(html) {
  const template = document.createElement('template');
  template.innerHTML = renderElement({ t:'txt', rich:true, v:html, id:0, x:0, y:0, w:1, h:1 });
  return template.content.querySelector('.rich-text').innerHTML;
}

/** Stores sanitized text immediately without replacing the live canvas selection. */
function saveRichText() {
  if (!editingText) return;
  const { node, element } = editingText;
  element.v = cleanTextHTML(node.innerHTML);
  element.rich = true;
  queueCheckpoint();
}

/** Ends editing before navigation or a redraw, leaving only sanitized markup. */
function finishTextEditing() {
  if (!editingText) return;
  const { node, element, wrapper, changed } = editingText;
  if (changed) saveRichText();
  editingText = null;
  textRange = null;
  node.removeAttribute('contenteditable');
  node.removeAttribute('role');
  node.removeAttribute('aria-label');
  node.removeAttribute('aria-multiline');
  node.removeAttribute('id');
  node.oninput = node.onpaste = node.ondrop = node.onkeydown = null;
  wrapper.classList.remove('text-editing');
  if (element.rich) node.innerHTML = cleanTextHTML(element.v);
  if (document.activeElement === node) node.blur();
  checkpoint();
}

/** Activates the actual page text without creating a second panel editor. */
function beginTextEditing(element = selectedEl(), selectAll = false) {
  if (!element || element.t !== 'txt') return null;
  if (editingText?.element === element && editingText.node.isConnected) return editingText.node;
  finishTextEditing();
  const wrapper = $(`#pg [data-i="${element.id}"]`), node = wrapper?.firstElementChild;
  if (!node) return null;
  d = null;
  wrapper.querySelectorAll('.hd').forEach(handle => handle.remove());
  wrapper.classList.add('text-editing');
  node.id = 'text-editor';
  node.contentEditable = 'true';
  node.setAttribute('role', 'textbox');
  node.setAttribute('aria-label', 'Page text');
  node.setAttribute('aria-multiline', 'true');
  editingText = { element, node, wrapper, changed: false };
  textRange = null;
  node.oninput = () => {
    editingText.changed = true;
    rememberTextRange();
    saveRichText();
  };
  node.onpaste = ev => {
    ev.preventDefault();
    document.execCommand('insertText', false, ev.clipboardData.getData('text/plain'));
    editingText.changed = true;
    saveRichText();
  };
  node.ondrop = ev => { ev.preventDefault(); ev.stopPropagation(); };
  node.onkeydown = ev => {
    if (ev.key === 'Escape') {
      ev.preventDefault(); ev.stopPropagation();
      finishTextEditing();
      updateSelectionUI();
    }
  };
  node.focus({ preventScroll: true });
  const range = document.createRange();
  range.selectNodeContents(node);
  if (!selectAll) range.collapse(false);
  window.getSelection().removeAllRanges();
  window.getSelection().addRange(range);
  rememberTextRange();
  return node;
}

/** Remembers a canvas range before a formatting control receives focus. */
function rememberTextRange() {
  const editor = editingText?.node, selection = window.getSelection();
  if (editor && selection.rangeCount && editor.contains(selection.anchorNode) && editor.contains(selection.focusNode)) {
    textRange = selection.getRangeAt(0).cloneRange();
    updateTextToolbar();
  }
}

/** Restores selected text, defaulting to the entire box for a collapsed range. */
function restoreTextRange() {
  const editor = beginTextEditing(selectedEl(), true);
  if (!editor) return null;
  const selection = window.getSelection();
  const range = textRange && editor.contains(textRange.commonAncestorContainer) ? textRange.cloneRange() : document.createRange();
  if (!textRange || range.collapsed || !editor.contains(range.commonAncestorContainer)) range.selectNodeContents(editor);
  editor.focus({ preventScroll: true });
  selection.removeAllRanges();
  selection.addRange(range);
  return range;
}

/** Applies a safe style to selected text; direction and spacing affect the box. */
function formatTextStyle(key, value) {
  checkpoint();
  const range = restoreTextRange(), editor = editingText?.node;
  if (!range || !editor) return;
  if (key === 'background-color') {
    applyTextHighlight(range, editor, value);
  } else if (key === 'direction' || key === 'line-height' || key === 'text-align') {
    const wrapper = textBoxWrapper(editor);
    if (key === 'text-align') {
      for (const child of editor.querySelectorAll('*')) child.style.removeProperty('text-align');
      wrapper.style.textAlign = value;
    }
    if (key === 'direction') wrapper.dir = value;
    else if (key === 'line-height') wrapper.style.lineHeight = String(Math.max(0.8, Math.min(4, +value || 1.2)));
    textRange = null;
  } else {
    const span = document.createElement('span');
    span.style.setProperty(key, key === 'font-size' ? Math.max(8, Math.min(200, +value || 24)) + 'px' : value);
    if (range.collapsed) span.appendChild(document.createElement('br'));
    else span.appendChild(range.extractContents());
    range.insertNode(span);
    range.selectNodeContents(span);
    window.getSelection().removeAllRanges();
    window.getSelection().addRange(range);
  }
  editingText.changed = true;
  rememberTextRange();
  saveRichText();
  checkpoint();
  updateTextToolbar();
}

/** Applies native inline formatting and immediately saves its canonical markup. */
function formatTextCommand(command) {
  const alignment = { justifyLeft: 'left', justifyCenter: 'center', justifyRight: 'right' }[command];
  if (alignment) return formatTextStyle('text-align', alignment);
  checkpoint();
  if (!restoreTextRange()) return;
  document.execCommand('styleWithCSS', false, true);
  document.execCommand(command, false, null);
  editingText.changed = true;
  rememberTextRange();
  saveRichText();
  checkpoint();
}

/** Reuses a full-width block for persistent box-level paragraph settings. */
function textBoxWrapper(editor) {
  if (editor.childNodes.length === 1 && editor.firstChild.nodeName === 'DIV') return editor.firstChild;
  const wrapper = document.createElement('div');
  while (editor.firstChild) wrapper.appendChild(editor.firstChild);
  editor.appendChild(wrapper);
  return wrapper;
}

/** Detects whether every selected text run has a visible highlight. */
function hasTextHighlight(range, editor) {
  const highlighted = node => {
    let element = node.nodeType === 1 ? node : node.parentElement;
    while (element && editor.contains(element)) {
      const color = getComputedStyle(element).backgroundColor;
      if (color && color !== 'transparent' && !/^rgba\([^)]*,\s*0(?:\.0+)?\)$/.test(color)) return true;
      if (element === editor) break;
      element = element.parentElement;
    }
    return false;
  };
  if (range.collapsed) return highlighted(range.startContainer);
  const walker = document.createTreeWalker(editor, NodeFilter.SHOW_TEXT);
  let node, found = false;
  while ((node = walker.nextNode())) {
    if (!node.length || !range.intersectsNode(node)) continue;
    if (node === range.startContainer && range.startOffset === node.length) continue;
    if (node === range.endContainer && range.endOffset === 0) continue;
    found = true;
    if (!highlighted(node)) return false;
  }
  return found;
}

/** Restores a character selection after splitting formatting text nodes. */
function textCharacterRange(editor, start, end) {
  const range = document.createRange(), walker = document.createTreeWalker(editor, NodeFilter.SHOW_TEXT);
  let node, offset = 0, first = false;
  while ((node = walker.nextNode())) {
    const next = offset + node.length;
    if (!first && start <= next) { range.setStart(node, Math.max(0, start - offset)); first = true; }
    if (first && end <= next) { range.setEnd(node, Math.max(0, end - offset)); return range; }
    offset = next;
  }
  range.selectNodeContents(editor);
  return range;
}

/** Applies highlight to text runs only, preserving the exact range and other styles. */
function applyTextHighlight(range, editor, color) {
  const prefix = document.createRange();
  prefix.selectNodeContents(editor);
  prefix.setEnd(range.startContainer, range.startOffset);
  const start = prefix.toString().length, end = start + range.toString().length;
  if (end === start) return;
  const runs = [], walker = document.createTreeWalker(editor, NodeFilter.SHOW_TEXT);
  let node, offset = 0;
  while ((node = walker.nextNode())) {
    let parent = node.parentElement, background = '';
    while (parent && parent !== editor) {
      const value = getComputedStyle(parent).backgroundColor;
      if (value && value !== 'transparent' && !/^rgba\([^)]*,\s*0(?:\.0+)?\)$/.test(value)) { background = value; break; }
      parent = parent.parentElement;
    }
    runs.push({ node, start: offset, end: offset + node.length, background });
    offset += node.length;
  }
  // Distribute existing backgrounds down to text so clearing a subrange cannot
  // reveal an ancestor background or accidentally paint a full paragraph.
  for (const element of editor.querySelectorAll('*')) element.style.removeProperty('background-color');
  for (const run of runs) {
    const fragment = document.createDocumentFragment();
    const cuts = [...new Set([0, Math.max(0, Math.min(run.node.length, start - run.start)), Math.max(0, Math.min(run.node.length, end - run.start)), run.node.length])].sort((a, b) => a - b);
    for (let i = 1; i < cuts.length; i++) {
      const from = cuts[i - 1], to = cuts[i];
      if (to <= from) continue;
      const selected = run.start + from >= start && run.start + to <= end;
      const background = selected ? color : run.background;
      const text = document.createTextNode(run.node.data.slice(from, to));
      if (background) {
        const span = document.createElement('span');
        span.style.backgroundColor = background;
        span.appendChild(text); fragment.appendChild(span);
      } else fragment.appendChild(text);
    }
    run.node.replaceWith(fragment);
  }
  const restored = textCharacterRange(editor, start, end), selection = window.getSelection();
  selection.removeAllRanges(); selection.addRange(restored);
  textRange = restored.cloneRange();
}

/** Toggles the same text range without relying on browser highlight commands. */
function toggleTextHighlight() {
  checkpoint();
  const range = restoreTextRange(), editor = editingText?.node;
  if (!range || !editor) return;
  const color = hasTextHighlight(range, editor) ? '' : $('[data-text-style="background-color"]').value;
  applyTextHighlight(range, editor, color);
  editingText.changed = true;
  saveRichText();
  checkpoint();
  updateTextToolbar();
}

/** Keeps neutral pressed states in sync with the canvas selection and alignment. */
function updateTextToolbar() {
  const toolbar = $('[data-rich]');
  if (!toolbar) return;
  const editor = editingText?.node || $(`#pg [data-i="${sel}"]`)?.firstElementChild;
  if (!editor) return;
  const range = textRange && editor.contains(textRange.commonAncestorContainer) ? textRange : document.createRange();
  if (!textRange || !editor.contains(range.commonAncestorContainer)) range.selectNodeContents(editor);
  const anchor = range.startContainer.nodeType === 1 ? range.startContainer : range.startContainer.parentElement;
  const alignment = getComputedStyle(anchor === editor ? editor.firstElementChild || editor : anchor).textAlign;
  for (const button of toolbar.querySelectorAll('[data-format]')) {
    const command = button.dataset.format;
    const align = { justifyLeft: 'left', justifyCenter: 'center', justifyRight: 'right' }[command];
    if (align) button.setAttribute('aria-pressed', String(alignment === align));
    else if (['bold', 'italic', 'underline', 'strikeThrough'].includes(command)) {
      button.setAttribute('aria-pressed', String(!!editingText && document.queryCommandState(command)));
    }
  }
  toolbar.querySelector('[data-highlight-toggle]').setAttribute('aria-pressed', String(hasTextHighlight(range, editor)));
}

/** Wires the small panel toolbar without mounting another editable text box. */
function mountRichText(e) {
  $('[data-text-style="font-size"]').value = +e.fs || 24;
  const toolbar = $('[data-rich]');
  updateTextToolbar();
  toolbar.onpointerdown = ev => {
    rememberTextRange();
    if (ev.target.closest('[data-format], [data-highlight-toggle]')) ev.preventDefault();
  };
  toolbar.onclick = ev => {
    const button = ev.target.closest('[data-format]');
    if (button) formatTextCommand(button.dataset.format);
    if (ev.target.closest('[data-highlight-toggle]')) toggleTextHighlight();
  };
  toolbar.onchange = ev => {
    const key = ev.target.dataset.textStyle;
    if (key) formatTextStyle(key, ev.target.value);
  };
}

/** Tracks mouse, keyboard and touch ranges in the canvas text. */
document.addEventListener('selectionchange', rememberTextRange);

/** Clicking outside the text and toolbar commits editing before other actions. */
document.addEventListener('pointerdown', ev => {
  if (editingText && !editingText.node.contains(ev.target) && !ev.target.closest('[data-rich]')) finishTextEditing();
}, true);
