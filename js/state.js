/**
 * Livpg - State & constants
 */

/**
 * Page size in CSS px (set per document; A4 by default), and a querySelector shortcut.
 */
let W = 794,
  H = 1123;
const $ = (q) => document.querySelector(q);

/**
 * App state.
 *  P: pages [{e: elements}] | c: current page index | sel: selected element id
 *  s: stage scale | nid: next element id | d: active pointer drag
 *  z: zoom multiplier | fw: fit-width mode | M: project meta {t: title, f: file name, pw/ph: page size}
 */
let P = [{ e: [] }],
  c = 0,
  sel = null,
  s = 1,
  nid = 1,
  d = null,
  z = 1,
  fw = false,
  M = { t: "Summary", f: "summary", pw: 794, ph: 1123 };

/**
 * Helpers: elements of the current page / the selected element.
 */
const pageEls = () => P[c].e,
  selectedEl = () => pageEls().find((e) => e.id == sel);

/** Selected IDs on the current page; sel identifies the primary element. */
const selection = new Set();
let multiSelect = false;

/** Returns the currently selected elements. */
function selectedElements() {
  return pageEls().filter(e => selection.has(e.id) || e.id === sel);
}
