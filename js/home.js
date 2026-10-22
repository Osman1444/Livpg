/**
 * Livpg - Home screen: create a document (choose a page size) or open a project
 */

/** Page presets in portrait px (96 dpi): [label, width, height]. */
const SIZES = [
  ["A4", 794, 1123],
  ["A5", 559, 794],
  ["Letter", 816, 1056],
  ["Legal", 816, 1344],
  ["9:16 / 16:9", 540, 960],
  ["3:4 / 4:3", 768, 1024],
  ["1:1", 800, 800],
];
let pickedSize = 0, // index of the highlighted preset (-1 = custom size)
  started = false; // true once a document exists, so "Back to editor" can be offered

/** Draws the preset tiles; the mini page shows each preset's proportions and orientation. */
function renderSizes() {
  const land = +$("#cw").value > +$("#ch").value;
  $("#sizes").innerHTML = SIZES.map(([name, pw, ph], i) => {
    const [a, b] = land ? [ph, pw] : [pw, ph];
    return `<button class="size${i == pickedSize ? " on" : ""}" data-i="${i}"><i style="aspect-ratio:${a}/${b}"></i><b>${name}</b><span>${a}×${b}</span></button>`;
  }).join("");
}

/** Picks a preset, keeping the current orientation. */
function chooseSize(i) {
  const land = +$("#cw").value > +$("#ch").value,
    [, w, h] = SIZES[i];
  pickedSize = i;
  $("#cw").value = land ? h : w;
  $("#ch").value = land ? w : h;
  renderSizes();
}

/** Shows or hides the home screen. */
function showHome(on) {
  $("#home").hidden = !on;
  $("#hback").hidden = !started;
}

$("#sizes").onclick = (ev) => {
  const b = ev.target.closest("[data-i]");
  if (b) chooseSize(+b.dataset.i);
};
$("#orient").onclick = () => {
  const w = $("#cw").value;
  $("#cw").value = $("#ch").value;
  $("#ch").value = w;
  renderSizes();
};
["#cw", "#ch"].forEach((q) => {
  $(q).oninput = () => {
    pickedSize = -1;
    renderSizes();
  };
});
$("#hnew").onclick = () => {
  const clamp = (v) => Math.min(3000, Math.max(200, Math.round(+v) || 794));
  newProject(clamp($("#cw").value), clamp($("#ch").value));
};
$("#hopen").onclick = () => pickFile(".html", openProject, 1);
$("#hback").onclick = () => showHome(false);

chooseSize(0);
showHome(true);