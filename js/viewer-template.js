/**
 * Livpg - viewer template
 * Plain strings that make up the exported file's runtime.
 */

// Runs before first paint so the page never flashes at the wrong scale.
const VIEWER_BOOT = `document.documentElement.style.setProperty('--s',Math.min(1.4,document.documentElement.clientWidth/__PW__))`;

// Floating page counter (current page + jump-to-page input).
const VIEWER_BODY = `<div class="pill"><input id="n" type="number" value="1" min="1"><span>/ <b id="t"></b></span></div><div id="b"></div>`;

const VIEWER_CSS = `
:root {
  --s: 0.4;
}
html {
  overflow-x: hidden;
}
body {
  margin: 0;
  padding-top: 44px;
  background: #e4e6ea;
}
.w {
  width: calc(__PW__px * var(--s));
  height: calc(__PH__px * var(--s));
  margin: 0 auto 12px;
}
.p {
  width: __PW__px;
  height: __PH__px;
  transform: scale(var(--s));
  transform-origin: 0 0;
  background: #fff;
  position: relative;
  overflow: hidden;
  box-shadow: 0 1px 8px #0003;
  print-color-adjust: exact;
  -webkit-print-color-adjust: exact;
}
.el {
  position: absolute;
  color: #111;
  font-family: "Segoe UI", Tahoma, sans-serif;
}
.el > * {
  border-radius: inherit;
  overflow: hidden;
}
.w {
  overflow: hidden;
}
.pill {
  position: fixed;
  top: max(8px, env(safe-area-inset-top));
  left: 50%;
  transform: translateX(-50%);
  background: #212121;
  color: #fff;
  border-radius: 99px;
  padding: 5px 14px;
  z-index: 5;
  font: 14px sans-serif;
  display: flex;
  gap: 6px;
  align-items: center;
}
.pill input {
  width: 42px;
  text-align: center;
  border: 0;
  border-radius: 6px;
  padding: 2px;
  font: inherit;
}
@media (max-width: 700px) {
  .pill {
    font-size: 16px;
    padding: 5px 16px;
    gap: 12px;
  }
  .pill input {
    /* width: 90px; */
    font-size: 16px;
  }
  body {
    padding-top: 96px;
  }
}
@page {
  size: __PW__px __PH__px;
  margin: 0;
}
@media print {
  .pill {
    display: none;
  }
  body {
    padding: 0;
    background: #fff;
  }
  .w {
    width: __PW__px;
    height: __PH__px;
    margin: 0;
    break-after: page;
  }
  .p {
    transform: none;
    box-shadow: none;
  }
}
`;

// Builds the pages from the embedded project JSON and wires the counter.
const VIEWER_JS = `
const project = JSON.parse(document.getElementById("proj").textContent),
  P = project.p,
  B = document.getElementById("b"),
  I = document.getElementById("n");
document.getElementById("t").textContent = P.length;
B.innerHTML = P.map(
  (p) => '<div class="w"><div class="p" style="background:' + pageBackgroundStyle(p, project.m || {}).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;') + '"><div class="page-content" style="position:absolute;inset:0;clip-path:' + marginClipStyle(project.m || {}) + '">' + p.e.map(renderElement).join("") + "</div></div></div>",
).join("");
const ws = [...document.querySelectorAll(".w")];
const fit = () =>
  document.documentElement.style.setProperty(
    "--s",
    Math.min(1.4, document.documentElement.clientWidth / __PW__),
  );
fit();
addEventListener("resize", fit);
addEventListener("scroll", () => {
  let k = 0;
  ws.forEach((w, i) => {
    if (w.getBoundingClientRect().top < innerHeight / 2) k = i;
  });
  I.value = k + 1;
});
I.onchange = () => {
  const k = Math.min(ws.length, Math.max(1, +I.value || 1));
  ws[k - 1].scrollIntoView({ behavior: "smooth" });
};
`;