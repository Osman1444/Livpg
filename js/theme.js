/**
 * Livpg - Light / dark theme
 */

/**
 * Theme: follows the system setting until the user picks one; the choice is remembered.
 */
const rt = document.documentElement,
  mq = matchMedia("(prefers-color-scheme:dark)");

let tm = null;

try {
  tm = localStorage.getItem("th");
} catch (e) {}

const ap = () => (rt.dataset.theme = tm || (mq.matches ? "dark" : "light"));

ap();

mq.onchange = ap;

/** Flips light/dark and remembers the choice. */
function toggleTheme() {
  tm = rt.dataset.theme == "dark" ? "light" : "dark";
  try {
    localStorage.setItem("th", tm);
  } catch (e) {}
  ap();
}