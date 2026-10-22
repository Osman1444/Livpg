# Livpg - project guide for AI agents

Read this first. It explains the idea, the decisions already made, how the code is organised, and where things live. Update it when you change the architecture.

## 1. The idea

Livpg is a **visual page editor and a PDF alternative**. The user designs fixed-size pages (A4, Letter, 9:16 ...) by placing elements (text, image/GIF/SVG, video, YouTube, custom HTML blocks), then exports **one standalone HTML file** that:

- looks the same on desktop and phone (each page is scaled like a PDF viewer),
- keeps media playing and HTML blocks interactive,
- prints one page per sheet,
- shows only the pages plus a small floating page counter (current page / total, type a number to jump),
- embeds the project data, so the file can be reopened in the editor and edited again.

Name: **Livpg** (live page). Short description: *"Pages that do more than a PDF."*

Goals: no build step, no dependencies, works from `file://` by double-clicking `index.html`, clean readable code.

## 2. Decisions already made (do not undo without asking)

- **Plain classic `<script>` tags**, one shared global scope. No ES modules (they break on `file://`), no bundler, no npm runtime dependencies.
- **UI language: English**, LTR layout. Exported files use `lang="en"`; text inside pages can be any language (Arabic works, text uses `dir="auto"`).
- **Design: flat, Material-inspired.** Solid colours only; no gradients, borders, shadows, glass or transparency (exceptions: selection outline, the slider-fill trick). Very rounded shapes: 28px cards, 18px tiles, 14px fields, pill buttons. One accent colour. Every colour is a CSS variable in `css/theme.css`; dark theme only overrides variables. Subtle springy motion (`--sp` easing, `pop` blur-scale fade-in), all disabled under `prefers-reduced-motion`.
- **Phone layout (<=900px):** bottom dock (icon + title), properties panel expands from the dock, editor area has a fixed height and scrolls inside, the body never scrolls. **Desktop:** side dock, side properties panel that slides out to the right when the *Properties* tile is clicked.
- **Export must stay standalone** (single file, media embedded as base64 or linked by URL).
- **HTML blocks** run in `<iframe sandbox="allow-scripts">`. The AI prompt always asks for one `<div>` with its own CSS/JS and mandatory size-hint meta tags.
- The owner wants big features **discussed and planned before implementation**.

## 3. How to run and test

- Run: open `index.html` in a browser. Nothing to install.
- State regression checks: `node tests/editor.test.cjs` (history, group actions and imports). Earlier smoke tests used **jsdom** (outside the repo): load `index.html` with `runScripts:'dangerously'`, `resources:'usable'`, `pretendToBeVisual:true`, stub `ResizeObserver` and `matchMedia`, then call functions through `window.eval(...)` (top-level `let`/`const` are not window properties). Layout/visual behaviour cannot be verified that way; check in a real browser.
- Format with Prettier (`--print-width 100`). Syntax check: `for file in js/*.js; do node --check "$file"; done`.

## 4. Structure

```
index.html            Editor shell: app bar, dock, stage, page tabs, panel, dialog, preview overlay, home screen
css/theme.css         Colour variables (light + dark)
css/layout.css        App shell, dock, stage, panel, preview overlay, phone/desktop rules
css/components.css    Buttons, fields, sliders, page elements, resize handles, segmented tabs, animations
css/home.css          Home screen
js/                   Loaded in the order below (see the script tags in index.html)
  state.js            Page size + app state
  icons.js            Shared SVG controls and toolbar icon updates
  render.js           renderElement()  (SHARED with exported files)
  limits.js           Size hints / resize limits for HTML blocks
  theme.js            Light/dark theme
  history.js          Undo/redo snapshots and IndexedDB draft recovery (before panel listeners)
  stage.js            Page canvas fitting, element rendering, page tabs
  media.js            Adding elements, file picker, link dialog
  drawing.js          Shape insertion and pressure-sensitive vector ink
  rich-text.js        Compact rich text toolbar, selection and inline canvas editing
  alignment.js        Alignment, distribution, grid overlay and group snapping
  constraints.js      Enforced margins across placement operations
  background.js       Per-page/shared background settings and exported CSS
  ai-prompt.js        Task-specific offline HTML-widget prompt builder
  selection.js        Live selection chrome and properties-context tracking
  panel.js            Properties/Layout/Background panel + AI prompt UI
  interactions.js     Pointer drag/resize, Delete key
  viewer-template.js  Strings that form the exported file's runtime
  exporter.js         buildExport(), preview
  project.js          newProject / openProject / loadState
  home.js             Home screen
  clipboard.js        Clipboard and drag/drop imports
  app.js              Central click handler, dock tiles, start-up
README.md  LICENSE  AGENTS.md
```

Load order matters only for top-level statements; functions are called later. New scripts go before `app.js`.

## 5. State and data model (`js/state.js`)

| Variable | Meaning |
|---|---|
| `W`, `H` | Current page size in CSS px (A4 = 794x1123 at 96 dpi) |
| `P` | Pages: `[{ e: [element, ...] }]` (array order = layer order, last is on top) |
| `c` | Current page index |
| `sel` | Selected element id (or `null`) |
| `s` | Stage scale (page px -> screen px) |
| `z` | Zoom multiplier on top of the fit scale |
| `fw` | `true` = "Fit width" mode, `false` = "Fit page" |
| `nid` | Next element id |
| `d` | Active pointer drag (set in `interactions.js`) |
| `M` | Project meta `{ t: title, f: file name, pw, ph }` |

Helpers: `$(q)` = `querySelector`, `pageEls()` = elements of the current page, `selectedEl()` = selected element.

**Element:** `{ id, t, v, x, y, w, h, fs?, r?, a?, us? }`
- `t`: `txt | img | vid | yt | html | shape | draw`
- `v`: text, data-URL/URL (img, vid), embed URL `https://www.youtube.com/embed/<id>` (yt), HTML source (html)
- `x,y,w,h`: position and size in page px (top-left of the unrotated box)
- `fs`: font size (txt); `r`: corner radius px; `a`: rotation degrees (about the centre)
- Shape: `v` = `rect|ellipse|triangle|diamond|line|arrow`; `fill` = hex or `none`, `stroke` = hex, `weight` = outline px.
- Drawing: `v` = `{ bw, bh, points: [[x,y,pressure], ...] }` in original stroke coordinates; `color` = ink hex, `weight` = original brush size. SVG scales with the element box.
- `us`: set when the user resized by hand (stops an HTML block's preferred size from being re-applied)

**Project file / JSON:** `{ m: M, p: P }`. Old files may be a bare array of pages (`openProject` handles both) and may lack `pw/ph` (defaults to A4).

## 6. Key flows

- **Start:** `home.js` shows the home screen. User picks a preset (A4, A5, Letter, Legal, 9:16/16:9, 3:4/4:3, 1:1) or custom 200-3000 px, orientation via *Rotate*, then *Create* -> `newProject(w,h)`; or *Open project* -> `pickFile('.html', openProject, true)`. `loadState()` resets state, calls `draw()`, re-fits on the next frame, hides home.
- **Draw:** `draw()` = `stage()` + `tabs()` + `renderPanel()`. `stage()` calls `fitStage()` then renders the current page's elements via `renderElement` and adds 8 resize handles to the selected one. `fitStage()` only changes sizes/scale (a `ResizeObserver` on `#st` calls it, so resizing never reloads media).
- **Fit:** scale = `min(1.5, availW/W, availH/H) * z` (height ignored in fit-width mode). The page is absolutely positioned inside `#pw`, which is sized to the scaled page and centred by flex auto-margins.
- **Interactions** (`interactions.js`): pointer events on `#pg`. Press an element -> select + drag; press a handle (`data-h` = `n s e w nw ne sw se`) -> resize. Resize math projects the pointer delta onto the element's rotated axes and moves the centre so the opposite side stays fixed. `limitSize()` applies HTML-block limits. Touch: `touch-action:none` only on `.el`, so empty page area still scrolls.
- **Panel** (`panel.js`): `renderPanel()` builds the panel for the selected element (or file settings when nothing is selected). Inputs by id: `tv` HTML-block source, `rr/rn` radius slider/number, `ra/an` rotation slider/number, `mt/mf` title/file name, `ais/ai` AI style/request. Buttons by `data-a`: `dup del up dn r0 a0 ask cp`. `setProp(k,v,src)` keeps slider, number and element in sync.
- **Central click handler** (`app.js`): any element with `data-k` triggers an action: `txt img vid html shapes pen` (add element/draw; video accepts YouTube links), `np dp` (new/delete page), `zo zf zi` (zoom out / fit toggle / zoom in), `pc ph` (preview), `op` (open), `ex` (export), `th` (theme), `home`, `pp` (properties panel: toggles `.open` on phone, `.hide` on desktop). Dock tiles are generated from the `IC` map in `app.js`.
- **Page tabs:** segmented control with a sliding "lens"; pointer drag across tabs selects pages (`hit()`).
- **Theme:** `html[data-theme]`, follows the system until the user toggles; choice stored in `localStorage` key `th`.

## 7. Rendering and export

- `renderElement(e)` (`render.js`) returns the HTML of one element. It is **injected as source text into exported files** (`${renderElement}`), so it must stay **self-contained** (no outside variables). Notes: YouTube shows an iframe only on `http(s):` and a thumbnail link otherwise (YouTube refuses `file://`); HTML blocks are wrapped (`html,body{margin:0;width:100%;height:100%}`) unless the code already contains `<html>`/doctype; wrapper style carries `border-radius` and `transform: rotate()`.
- `buildExport()` (`exporter.js`) assembles: viewer boot script + CSS + body from `viewer-template.js` (tokens `__PW__`/`__PH__` replaced by `sized()`), the project JSON in `<script type="application/json" id="proj">` (`<` escaped as `\u003c`), and the viewer runtime that renders every page with `renderElement`. Print CSS makes one page per sheet at the document's page size.
- `openPreview('pc'|'ph')` shows the export in an iframe (full width or 390 px).
- Reopening: `openProject` finds `id="proj"` in the file text.

## 8. HTML blocks, AI helper and size hints

- `panel.js`: `AI = { style, req, ask, sizing }`; `ai-prompt.js` provides `buildPrompt()` using the selected HTML element dimensions. Options: free-text style (blank = modern light theme), mode toggle (AI builds right away / asks questions first). Output is always a single `<div>`.
- `limits.js`: `blockLimits(e)` parses `<meta name="livpg:...">` tags from the block's code: `width`, `height` (starting size), `min-width`, `max-width`, `min-height`, `max-height` (px), `aspect-ratio` (`16/9`, `4:3`, `1.5`). `limitSize()` enforces them while resizing (aspect ratio: the dragged side drives the other). `fitToLimits()` runs when code changes: applies preferred size unless `e.us`, then clamps. No meta tags = free resizing.

## 9. Known limitations

- Browser drafts autosave to IndexedDB and restore on startup. Storage failures appear in the toolbar; exporting remains the portable backup. Undo/redo retains up to 60 document snapshots during the session.
- Rich text supports direct canvas editing on double-click and a compact properties toolbar; embedded fonts and auto-grow are not implemented.
- Local video/images are embedded as base64 (+33% size). Video files can make exports huge.
- YouTube does not play inline from `file://` (works when hosted over https).
- HTML blocks: sandboxed (no localStorage, popups, network); external scripts only from cdnjs / jsDelivr.
- Multi-select supports Shift/Ctrl/Cmd-click, Ctrl/Cmd+A, or the Select multiple button on touch screens. Selected elements move, duplicate, delete and change layers together. No copy/paste between pages or numeric X/Y/W/H fields.
- Resizing a rotated element keeps the opposite side fixed; verify visually after changes.

## 10. Roadmap and open plans

1. **Rich text editor (first version implemented).** Canvas text boxes use native contenteditable on double-click, with a compact icon toolbar in the properties panel and system fonts. Selection formatting, lists, alignment, direction, line height, color and highlighting are implemented. `rich: true` marks sanitized HTML text; legacy text remains plain until edited. Next steps to discuss with the owner: a floating toolbar, background/padding/vertical alignment/auto-grow, links and heading presets. Bundled Latin/Arabic fonts or uploaded fonts still require a font strategy decision. Browser-native editing is used for this first dependency-free version; a vendored editor library remains an option if richer editing requires it.
2. **Simple alignment/grid implemented:** Layout dock section provides page/selection alignment, equal-gap distribution, grid spacing, margins and drag snapping. Column grids, gutters, smart guides and rulers remain future options to discuss.
3. Numeric X/Y/W/H fields and copy/paste between pages.

## 11. Conventions for contributors

- Keep files small and single-purpose; JSDoc-style comment above every function and every top-level handler; file header comment.
- Keep `renderElement` self-contained and keep the exported file dependency-free.
- Add colours only as variables in `theme.css`; follow the flat design rules above.
- Keep the UI text in English and the layout working on both phone (<=900px) and desktop.
- Prefer small, targeted edits; update this file and `README.md` when behaviour or structure changes.
- Ask the owner before large features; they prefer a short plan and a decision first. They want edited files delivered individually (not zipped).

## 12. History, drafts and imports

- `js/history.js` records document snapshots after mutations; text typing is grouped by a 500ms pause or finishing editing; panel fields also commit on change/focusout. Dragging is one undo step. New/open projects reset history. IndexedDB (`livpg`, `drafts`, `current`) stores the latest project including embedded media; startup restores it automatically. Browser storage availability and quotas vary, including under `file://`.
- `js/media.js` provides `youtubeEmbedURL` shared by Add video and clipboard imports. The video dialog accepts YouTube/watch/shorts/live/embed links or direct video URLs, and offers a local video picker. There is no separate YouTube dock tile.
- `js/clipboard.js` accepts paste and workspace drops: plain text, image/video files, HTML/text files, direct image/video URLs and YouTube links. Text fields retain native paste/undo. Pasted rich HTML is treated as plain text; explicit HTML files become sandboxed blocks. File reads happen locally.
- `selection` holds selected IDs; `sel` is the primary selection. Only a single selected element shows resize handles and editable properties. Ctrl/Cmd+Z undoes; Ctrl/Cmd+Shift+Z or Ctrl/Cmd+Y redoes outside editable fields.


## 13. Rich text implementation

- `js/rich-text.js` loads before `panel.js`. `richTextPanel`/`mountRichText` build a compact formatting toolbar with icons, tooltips and accessible names; there is no duplicate panel editor. `beginTextEditing` activates the rendered page text on double-click or when a formatting control is used. `finishTextEditing` commits, sanitizes and removes edit-only attributes before redraw/navigation. Escape or a pointer outside text/toolbar finishes editing.
- Rich text elements keep `t: "txt"`, set `rich: true`, and store formatting HTML in `v`. `fs` is the inherited default. Plain legacy elements remain escaped until edited. `renderElement` stays self-contained and rebuilds allowed tags/styles from an inert template. Decoration shorthand and longhands, including `text-decoration-line`, must survive sanitization for underline/strike-through generated by native commands. `cleanTextHTML` reuses the renderer sanitizer.
- Live typing and formatting update the model without rebuilding the focused canvas node. While editing, CSS enables pointer interaction, native text selection and touch gestures for that text only; the page pointer handler bypasses dragging. `stage()` finishes editing before replacing page DOM. Selection ranges are retained across toolbar focus; alignment/direction/line height affect the whole box. Alignment uses a persistent full-width block and clears conflicting nested alignments, rather than native justify commands. Highlight has a separate on/off button beside the color swatch; toolbar pressed states use neutral theme variables. Clipboard content in the editor becomes plain text.
- Open `tests/rich-text.html` for browser regression checks of actual double-click editing, selection formatting, decoration persistence, sanitized rendering, standalone output and edit lifecycle. Browser-native editing commands require real-browser verification.


## 14. Editor controls and properties layout

- The top bar groups icon controls by edit, zoom, preview and project actions. `icons.js` owns the small stroke SVG set and `updateToolbarButton`, used by fit/multi-select state updates and project reset to retain icons, tooltips and accessible names. Export is the one accent action. Below 700px tools occupy a horizontally scrollable second row.
- `#pn` is a flex column with overflow hidden. `.panel-content` scrolls independently and holds the balanced `.bt` actions; `.panel-footer` stays at the bottom edge with Backward/Forward layer actions for single and group selections. Delegated panel clicks use `closest('[data-a]')` so SVG and span clicks work.


## 15. Shapes, ink and highlight ranges

- `js/drawing.js` loads before `rich-text.js`/`panel.js`/`interactions.js`. `inkMode` selects the draw tool; `activeInk` holds an unfinished stroke outside `P`. Pointer Events use page coordinates corrected by `s`, optional coalesced samples and pen pressure (mouse/touch use 0.5). Live ink redraws at most once per animation frame. `finishInk` crops points to bounds, adds one document element and records one history step; `cancelInk` discards the preview and releases capture. Pointer cancellation/lost capture, stage redraws and project loads cancel unfinished ink. Project loads exit drawing mode.
- `renderElement` renders validated geometric shape primitives and pressure-weighted ink paths/circles in inline SVG, self-contained for exports. Drawing geometry is preserved on resizing; ink color can change, while brush width/pressure settings apply to new strokes. Shapes expose fill, no fill, stroke color and stroke width. All vectors participate in the existing selection/history/draft/layer flows.
- The highlight toggle and swatch use `applyTextHighlight`, not `execCommand('hiliteColor')`. It captures character offsets, distributes inherited highlight backgrounds to text runs, applies/removes color on selected text only, then restores the range. This prevents a second click from expanding highlighting to a whole text box. Do not reintroduce block-background highlights or lose the range after toggling.
- Run `node tests/vectors.test.cjs` alongside state tests. Browser checks in `tests/rich-text.html` cover partial highlight on/off, unchanged unselected text and no block background fills. Real stylus pressure and pointer capture still require device/browser testing.


## 16. Targeted properties, rounded geometry and image sources

- Radius/rotation slider and number inputs must return after `setProp`; never call `stage()` there. `updateElementStyle` changes only the target wrapper styles. Shape radius/appearance/resize changes use `queueElementRefresh`, batched per element per animation frame; `refreshElementContent` replaces only that element's content, retaining wrapper/handles and all siblings. Reset buttons use the same fast path. History/draft serialization remains debounced.
- Shape SVG viewBoxes use the element's page-pixel width/height. Rectangles use equal `rx`/`ry`; triangle/diamond vertices use clamped tangent circular arcs. Shape wrappers always have zero CSS radius, preventing rectangular clipping of geometric corners. The self-contained renderer produces identical export geometry.
- Image properties expose a path field and replacement/file actions. `replaceImageSource` preloads the image, validates supported URL protocols, guards stale/deleted requests with a WeakMap token, retains geometry and commits one undoable change. Failed loads leave the old source intact. Relative paths remain linked; file picker data URLs remain embedded.
- `history.js` must load before `panel.js` because the panel registers checkpoint listeners at top level. Run `node tests/properties.test.cjs`, `node tests/vectors.test.cjs` and `node tests/editor.test.cjs` for these regression checks.


## 17. Alignment and grid

- `alignment.js` loads before `panel.js`. The Layout dock tile sets `panelView = "layout"`; Properties returns to `"properties"`. Selecting elements preserves this panel view. Drawing/new/open switch to Properties.
- `elementBounds` computes rotated axis-aligned bounds. Alignment uses page margins for single selections or explicit Page target; Auto/Selection use the selection union for multiple elements. Equal-gap distribution requires three selections and retains endpoint positions. These operations patch element positions directly and commit one history step.
- `M.grid = {visible,snap,spacing,margin,mode}` persists in exports/drafts/history; defaults work on old documents. Grid visibility and snapping are independent. Spacing clamps to 4–200 px; margin stays below half the smaller page dimension. `updateGridOverlay` inserts a pointer-transparent SVG at the back of the editor page, never in the shared renderer/viewer. Grid changes update only that overlay.
- Drag state captures selection bounds. `snapDrag` applies a common delta from the group's visual top-left, offset from the page margin; Alt bypasses it. Resizing, drawing and text editing do not snap. Dock tiles scroll horizontally on phones to retain usable touch targets.
- Corner-radius controls are omitted for shape arrows, ellipses and lines; rotation remains available. Tests: `node tests/alignment.test.cjs` plus existing property/vector/state suites. Browser/device layout verification is still required.


## 18. Enforced margins, backgrounds and HTML-prompt evaluation

- `constraints.js` uses rotated visual bounds. Positive `M.grid.margin` constrains elements; zero keeps legacy free placement. `constrainElement` proportionally fits oversized geometry and clamps position. It runs on inserts/imports/duplicates, rotation, HTML sizing and project load. `constrainDrag` bounds the common group delta, even when snapping is off/Alt is held. `constrainResize` interpolates to the first boundary without moving the opposite edge. Changing margins calls `enforceDocumentMargins` across pages and patches current-page nodes without reloading media. Drawing starts inside margins, clamps samples with brush padding and fits completed strokes.
- `background.js` exposes a Background dock panel. Per-page `page.bg = {color,image,fit}` overrides `M.background`; all-page application stores one shared default and removes page overrides to avoid duplicating embedded images. New pages inherit defaults. Apply validates/preloads images, guards stale/page-switched requests, and commits undoable state. Color defaults to white; fit is cover/contain. Backgrounds ignore content margins.
- `pageBackgroundStyle(page,meta)` is self-contained and injected into exported HTML beside `renderElement`. It validates colors/protocols and returns safe background CSS; the viewer escapes it for HTML attributes. `stage` applies the same helper to the editor. Print CSS requests exact color adjustment.
- `ai-prompt.js` replaces the old generic prompt with concrete context, offline dependency rules, scoped structure, responsive layout guidance and five test dimensions. Script initialization captures `document.currentScript` synchronously. The AI helper still supports immediate output or questions first. Clipboard errors are handled, including rejected async writes and the file-compatible fallback.
- Tests: `node tests/margins-background-prompt.test.cjs` covers enforced geometry, fixed-edge resize, group drag, per-page/shared backgrounds, actual viewer-runtime output and the prompt contract. The browser-only `tests/html-block-harness.html` checks pasted generated outputs at five sizes. `tests/prompt-evaluation.md` documents briefs/scoring. No connected text-generation endpoint exists in this session, so no live model A/B comparison was run; do not claim the prompt is proven best or browser tested.


## 19. Content-first prompt sizing and physics regression

- A supplied AI result squeezed five physics scenes into 400×200 with 220×110 minimums and microscopic controls. The prompt now treats placeholder dimensions as advisory unless `AI.sizing === "current"`; default is `"auto"`. The sizing selector is in the HTML AI helper. Prompts request one focused component, usable type/control sizes, honest minimums and scientifically consistent simulations/readouts. Hardcoded half-size hints and miniature sidebar layouts should not return.
- New HTML elements start at up to 560×420, bounded by page dimensions/margins. The Use suggested size action clears `e.us`, applies `fitToLimits`, re-enforces margins and patches the element geometry without recreating its iframe. It remains undoable.
- `examples/pendulum.html` is a hand-written reference with an ideal 10° small-angle model: period and animation both derive from `T=2π√(L/g)` with SI units. It updates stable SVG nodes, pauses scheduled frames, supports reduced motion and cleans up on removal. Its declared minimum protects readable controls. It is not AI-generated benchmark evidence.
- `tests/prompt-quality.test.cjs` checks adaptive/fixed sizing, page budgets, numerical cases, elapsed time and actual reference handlers through a simulated DOM. `tests/properties.test.cjs` checks manually resized HTML can adopt suggested hints. No browser visual verification or live model A/B comparison is claimed. Evaluation notes/source attribution live in `tests/prompt-evaluation.md`.


## 20. AI preference note, fenced output and page reordering

- The HTML helper recommends Gemini/Claude based explicitly on the owner's repeated tests versus ChatGPT. Do not present this as an independently verified universal ranking. Default generated widget styling is modern light; custom style text still overrides it.
- The prompt now requests ONE copyable fenced `html` code block. `unwrapHTMLCode` in `limits.js` removes only a complete surrounding HTML/bare backtick or tilde fence. `panel.js` normalizes pasted HTML before storing/rendering/reading size hints; raw HTML and backticks inside code remain intact. The browser output harness uses the same normalizer.
- `movePage(from,to)` in `stage.js` moves the full page object, retains active page identity and selection, updates tabs only (no canvas/media reload), and commits one history change. Desktop page tabs are native draggable targets; pointer-drag tab selection remains for touch/pen. Earlier/later icon buttons work on touch/keyboard and disable at endpoints. Autosave/export use the reordered P array.
- Scrollbars use `--scroll-thumb` theme values, transparent tracks and rounded thumbs; formerly hidden tab/toolbar scrollbars are thin. `tests/pages-codeblocks.test.cjs` verifies ordering, active identity, history, serialization, fence normalization and prompt theme/format.


## 21. Required AI description and margin modes

- Copy prompt is disabled unless `AI.req.trim()` is nonempty. `updatePromptCopyState` runs on render/input; the delegated copy handler guards the operation as well, focusing `#ai` when empty. Keep this separate from the prompt builder, which may still be exercised directly in tests.
- `M.grid.mode` is `block`, `clip` or `guide`, defaulting to block for compatibility. `blockingMargin` returns a positive margin only in block mode; all geometry constraints and pen sampling use it. Grid/alignment targets keep the numeric margin in every mode. Mode/margin changes fit content only when blocking, then update the clip and overlay without rebuilding media.
- Editor elements and in-progress ink live in an absolute `.page-content` layer. Self-contained `marginClipStyle(meta)` returns an inset only for clip mode. It is injected into exports and applied to the viewer content layer; backgrounds remain on the parent page and grid guides remain outside it. Clip/guide modes must not mutate element geometry.
- `tests/margin-modes-prompt-required.test.cjs` covers mode behavior, persistence, clipping CSS and copy gating. Viewer tests verify actual exported runtime includes clipping independently of backgrounds.


## 22. Selection without canvas/panel flicker

- `selection.js` loads before `panel.js`. `updateSelectionUI` changes only `.sl` outlines and resize handles. `refreshSelection` compares page identity, selected IDs, primary single selection, panel view and draw mode before calling `renderPanel`; real panel renders record the context. Group-primary changes alone do not rebuild the same multi-selection controls.
- Pointer selection, modifier selection, deselection, select-all, Escape and double-click use this lightweight path. Repeated empty-page clicks return immediately. These paths must not call `draw`/`stage`, replace media nodes or restart iframe scripts. Zoom calls `fitStage` only. Inline-edit Escape restores selection handles without a stage redraw.
- Removed the `#pn > *` pop animation and the multi-selection panel's intermediate HTML assignment. Retain normal panel open/close layout behavior, but do not replay content entrance animations on selection.
- `tests/selection.test.cjs` covers retained live canvas nodes, stable panel render counts, multi-selection, empty clicks, handles and double-click. The full suite currently also references `examples/pendulum.html`; if that optional reference has been removed, its fixture-dependent physics checks cannot run until restored or intentionally revised. Do not silently recreate deleted user assets.

## 23. Public README and scrollbar arrows

- Keep README.md visitor-facing: purpose, features, getting started, editing tips, HTML helper, sharing, contribution links and license. Architecture, agent instructions and test-session reports belong here or under tests, not in the public README. The empty Live app URL field is intentional until the owner provides a deployment URL. Repository: https://github.com/osman1444/livpg.
- Modern WebKit/Blink browsers may prioritize standard scrollbar-color/width over custom pseudo-elements, restoring native arrow buttons. The WebKit-support CSS block resets those native styles and explicitly zeros/hides scrollbar buttons; rounded gray thumbs and transparent tracks remain. Other engines retain thin gray standard scrollbars. Browser visual verification is still required.
