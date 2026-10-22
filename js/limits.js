/**
 * Livpg - Size limits for HTML blocks
 *
 * An AI-generated block can carry invisible hints in its <head>:
 *   <meta name="livpg:aspect-ratio" content="16/9">
 *   <meta name="livpg:min-width" content="200">   (also max-width, min-height, max-height; px)
 *   <meta name="livpg:width" content="400"> + livpg:height = preferred starting size (px)
 * Livpg reads them and restricts resizing. No hints = resizing is fully free.
 */
const MIN_SIZE = 20;

/** Reads the hints from an HTML block; returns null when there are none. */
function blockLimits(e) {
  if (e.t != "html") return null;
  const L = {},
    re = /<meta[^>]*name=["']livpg:([a-z-]+)["'][^>]*content=["']([^"']+)["']/gi;
  let m;
  while ((m = re.exec(e.v))) {
    const key = m[1],
      val = m[2];
    if (key == "aspect-ratio") {
      const [a, b = 1] = val.split(/[\/:]/).map(parseFloat);
      if (a > 0 && b > 0) L.ar = a / b;
    } else if (
      ["width", "height", "min-width", "max-width", "min-height", "max-height"].includes(key)
    ) {
      const n = parseFloat(val);
      if (n > 0) L[key] = n;
    }
  }
  return Object.keys(L).length ? L : null;
}

/**
 * Applies the limits to a requested size. `handle` is the dragged handle (n, s, e, w, ne...);
 * with an aspect ratio, the dragged side decides and the other side follows.
 */
function limitSize(e, w, h, handle) {
  w = Math.max(MIN_SIZE, w);
  h = Math.max(MIN_SIZE, h);
  const L = blockLimits(e);
  if (!L) return { w, h };
  const ar = L.ar;
  if (ar) {
    if (handle == "n" || handle == "s") w = h * ar;
    else h = w / ar;
  }
  const minW = Math.max(L["min-width"] || MIN_SIZE, ar ? (L["min-height"] || MIN_SIZE) * ar : 0),
    maxW = Math.min(
      L["max-width"] || Infinity,
      ar && L["max-height"] ? L["max-height"] * ar : Infinity,
    );
  w = Math.min(maxW, Math.max(minW, w));
  h = ar ? w / ar : Math.min(L["max-height"] || Infinity, Math.max(L["min-height"] || MIN_SIZE, h));
  return { w, h };
}

/**
 * Applies the block's preferred size (unless the user already resized it by hand)
 * and snaps the size into the block's limits. Used when new code is pasted.
 */
function fitToLimits(e) {
  const L = blockLimits(e);
  if (L && !e.us) {
    if (L.width) e.w = L.width;
    if (L.height) e.h = L.height;
  }
  const r = limitSize(e, e.w, e.h, "se");
  e.w = Math.round(r.w);
  e.h = Math.round(r.h);
}

/** Accepts a copied HTML code fence while leaving raw HTML and script literals intact. */
function unwrapHTMLCode(value) {
  const text = String(value).trim();
  const match = text.match(/^(`{3,}|~{3,})(?:html)?[ \t]*\r?\n([\s\S]*?)\r?\n\1[ \t]*$/i);
  return match ? match[2] : String(value);
}
