/** Livpg - Small shared SVG icons for editor controls. */
const ICON_PATHS = {
  alignLeft: 'M4 3v18M8 7h12v4H8zM8 15h8v3H8z',
  alignCenter: 'M12 2v20M4 6h16v4H4zM7 14h10v4H7z',
  alignRight: 'M20 3v18M4 7h12v4H4zM8 15h8v3H8z',
  alignTop: 'M3 4h18M6 8h4v12H6zM14 8h4v8h-4z',
  alignMiddle: 'M2 12h20M6 4h4v16H6zM14 7h4v10h-4z',
  alignBottom: 'M3 20h18M6 4h4v12H6zM14 8h4v8h-4z',
  distributeX: 'M3 3v18M21 3v18M7 7h3v10H7zM14 7h3v10h-3z',
  distributeY: 'M3 3h18M3 21h18M7 7h10v3H7zM7 14h10v3H7z',
  home: 'm3 10 9-7 9 7M5 9v12h14V9M9 21v-7h6v7',
  undo: 'M9 5 4 10l5 5M4 10h10a6 6 0 0 1 6 6v3',
  redo: 'm15 5 5 5-5 5M20 10H10a6 6 0 0 0-6 6v3',
  select: 'M9 3H3v6m12-6h6v6M3 15v6h6m12-6v6h-6M8 12l3 3 5-6',
  minus: 'M5 12h14', plus: 'M5 12h14M12 5v14',
  fitWidth: 'M3 4v16M21 4v16M7 12h10m-7-3-3 3 3 3m4-6 3 3-3 3',
  fitPage: 'M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5M8 8h8v8H8z',
  desktop: 'M3 4h18v13H3zM8 21h8m-4-4v4',
  phone: 'M7 2h10v20H7zM11 18h2',
  open: 'M3 7V4h6l3 3h9v3M3 7v13h15l4-10H7L3 20',
  theme: 'M21 13a9 9 0 0 1-10-10 9 9 0 1 0 10 10Z',
  export: 'M12 3v12m-4-4 4 4 4-4M4 15v6h16v-6',
  copy: 'M8 8h12v13H8zM16 8V3H3v13h5',
  trash: 'M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7',
  forward: 'm8 8 4-4 4 4M12 4v10M4 12v9h16v-9',
  backward: 'm8 12 4 4 4-4M12 3v13M4 12v9h16v-9',
};

/** Returns a decorative icon; its enclosing button supplies the accessible label. */
function icon(name) {
  return `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="${ICON_PATHS[name] || ICON_PATHS.select}"/></svg>`;
}

/** Updates a toolbar icon and its description without replacing it with visible text. */
function updateToolbarButton(button, label, name = button.dataset.icon) {
  button.dataset.icon = name;
  button.title = label;
  button.setAttribute('aria-label', label);
  button.innerHTML = icon(name);
}
