/** Livpg - Selection chrome and stable properties-panel updates. */

/** Changes outlines and handles without replacing page elements or their media. */
function updateSelectionUI() {
  const g = $('#pg');
  g.querySelectorAll('.el.sl').forEach(node => node.classList.remove('sl'));
  g.querySelectorAll('.hd').forEach(handle => handle.remove());
  for (const e of selectedElements()) {
    $("#pg").querySelector(`[data-i="${e.id}"]`)?.classList.add("sl");
  }
  const el = $("#pg").querySelector(`[data-i="${sel}"]`);
  if (el && selectedElements().length === 1 && !inkMode && !el.classList.contains('text-editing')) {
    el.classList.add("sl");
    el.insertAdjacentHTML(
      "beforeend",
      ["n", "s", "e", "w"].map((h) => `<i class="hd" data-h="${h}"></i>`).join("") +
        ["nw", "ne", "sw", "se"].map((h) => `<i class="hd c" data-h="${h}"></i>`).join(""),
    );
  }
}

let selectionPanelContext = null;

/** Captures only the context that affects selection-dependent panel controls. */
function currentSelectionContext() {
  const elements = selectedElements();
  return { page: P[c], ids: elements.map(e => e.id).join(','), primary: elements.length > 1 ? null : sel, view: panelView, ink: inkMode };
}

/** Refreshes selection chrome, rebuilding properties only when its context changes. */
function refreshSelection() {
  updateSelectionUI();
  const next = currentSelectionContext(), previous = selectionPanelContext;
  if (!previous || Object.keys(next).some(key => next[key] !== previous[key])) renderPanel();
}
