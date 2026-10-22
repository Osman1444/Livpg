/**
 * Livpg - Element rendering (shared with exported files)
 */

/**
 * Turns one element {id,t,v,x,y,w,h,fs,r,a,rich?} into HTML.
 *  Shared by the editor AND the exported file, so it must stay self-contained.
 *  Rich text uses allowlisted HTML when rich=true; old text remains escaped plain text.
 */
function renderElement(e) {
  const q = (t) => String(t).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;"),
    f = 'style="width:100%;height:100%;';
  let i;
  if (e.t == "img") i = `<img src="${q(e.v)}" ${f}object-fit:contain">`;
  else if (e.t == "vid")
    i = `<video src="${q(e.v)}" controls playsinline ${f}object-fit:contain"></video>`;
  else if (e.t == "yt") {
    const y = e.v.split("embed/")[1];
    i = /^https?:$/.test(location.protocol)
      ? `<iframe src="${q(e.v)}" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen ${f}border:0"></iframe>`
      : `<a href="https://youtu.be/${y}" target="_blank" style="display:flex;align-items:center;justify-content:center;width:100%;height:100%;background:#000 url(https://i.ytimg.com/vi/${y}/hqdefault.jpg) center/cover;color:#fff;font-size:56px;text-decoration:none">▶</a>`;
  } else if (e.t == "html")
    i = `<iframe sandbox="allow-scripts" srcdoc="${q(/<html[\s>]|<!doctype/i.test(e.v) ? e.v : "<!doctype html><style>html,body{margin:0;width:100%;height:100%}</style>" + e.v)}" ${f}border:0"></iframe>`;
  else if (e.t === "shape" || e.t === "draw") {
    const number = (value, fallback = 0) => Number.isFinite(+value) ? +value : fallback;
    const color = (value, fallback) => /^#[\da-f]{6}$/i.test(value || '') ? value : fallback;
    const weight = Math.max(1, Math.min(80, number(e.weight, 3)));
    let body = '', viewBox = '0 0 100 100';
    if (e.t === 'shape') {
      const stroke = color(e.stroke, '#212121'), fill = e.fill === 'none' ? 'none' : color(e.fill, '#1976d2');
      const attributes = `fill="${['line', 'arrow'].includes(e.v) ? 'none' : fill}" stroke="${stroke}" stroke-width="${weight}" vector-effect="non-scaling-stroke" stroke-linejoin="round" stroke-linecap="round"`;
      // Use page-pixel geometry so corner radii stay circular in non-square shapes.
      const width = Math.max(1, number(e.w, 240)), height = Math.max(1, number(e.h, 160));
      viewBox = `0 0 ${width} ${height}`;
      const left = Math.min(width * 0.45, weight / 2 + 1), right = width - left;
      const top = Math.min(height * 0.45, weight / 2 + 1), bottom = height - top;
      const radius = Math.max(0, number(e.r));
      /** Rounds polygon vertices with tangent circular arcs, clamped to edge lengths. */
      function roundedPolygon(vertices) {
        if (!radius) return `<polygon points="${vertices.map(p => p.join(',')).join(' ')}" ${attributes}/>`;
        const corners = vertices.map((point, index) => {
          const previous = vertices[(index + vertices.length - 1) % vertices.length], next = vertices[(index + 1) % vertices.length];
          const ax = previous[0] - point[0], ay = previous[1] - point[1], bx = next[0] - point[0], by = next[1] - point[1];
          const al = Math.hypot(ax, ay), bl = Math.hypot(bx, by);
          const angle = Math.acos(Math.max(-1, Math.min(1, (ax * bx + ay * by) / (al * bl))));
          const tangent = Math.tan(angle / 2), distance = Math.min(radius / tangent, al / 2, bl / 2);
          return { before: [point[0] + ax / al * distance, point[1] + ay / al * distance], after: [point[0] + bx / bl * distance, point[1] + by / bl * distance], radius: distance * tangent, sweep: ax * by - ay * bx < 0 ? 1 : 0 };
        });
        const path = corners.map((corner, index) => `${index ? 'L' : 'M'}${corner.before.join(',')}A${corner.radius},${corner.radius} 0 0 ${corner.sweep} ${corner.after.join(',')}`).join('') + 'Z';
        return `<path d="${path}" ${attributes}/>`;
      }
      if (e.v === 'ellipse') body = `<ellipse cx="${width / 2}" cy="${height / 2}" rx="${(right - left) / 2}" ry="${(bottom - top) / 2}" ${attributes}/>`;
      else if (e.v === 'triangle') body = roundedPolygon([[width / 2, top], [right, bottom], [left, bottom]]);
      else if (e.v === 'diamond') body = roundedPolygon([[width / 2, top], [right, height / 2], [width / 2, bottom], [left, height / 2]]);
      else if (e.v === 'line' || e.v === 'arrow') body = `<path d="M${left} ${height / 2}H${right}${e.v === 'arrow' ? `M${Math.max(left, right - width * 0.22)} ${top + (bottom - top) * 0.1}L${right} ${height / 2}L${Math.max(left, right - width * 0.22)} ${bottom - (bottom - top) * 0.1}` : ''}" ${attributes}/>`;
      else body = `<rect x="${left}" y="${top}" width="${right - left}" height="${bottom - top}" rx="${Math.min(radius, (right - left) / 2, (bottom - top) / 2)}" ry="${Math.min(radius, (right - left) / 2, (bottom - top) / 2)}" ${attributes}/>`;
    } else {
      const data = e.v || {}, bw = Math.max(1, number(data.bw, e.w)), bh = Math.max(1, number(data.bh, e.h));
      viewBox = `0 0 ${bw} ${bh}`;
      const points = (Array.isArray(data.points) ? data.points : []).filter(p => Array.isArray(p) && p.length >= 2 && Number.isFinite(+p[0]) && Number.isFinite(+p[1])).map(p => [number(p[0]), number(p[1]), weight * (0.2 + 0.8 * Math.max(0.05, Math.min(1, number(p[2], 0.5)))) / 2]);
      const ink = color(e.color, '#212121');
      let outline = '';
      for (let j = 0; j < points.length; j++) {
        const [x, y, radius] = points[j];
        body += `<circle cx="${x}" cy="${y}" r="${radius}"/>`;
        if (!j) continue;
        const [px, py, previousRadius] = points[j - 1], length = Math.hypot(x - px, y - py);
        if (!length) continue;
        const nx = -(y - py) / length, ny = (x - px) / length;
        outline += `M${px + nx * previousRadius},${py + ny * previousRadius}L${x + nx * radius},${y + ny * radius}L${x - nx * radius},${y - ny * radius}L${px - nx * previousRadius},${py - ny * previousRadius}Z`;
      }
      body = `<g fill="${ink}"><path d="${outline}"/>${body}</g>`;
    }
    i = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" preserveAspectRatio="none" ${f}" aria-hidden="true">${body}</svg>`;
  }
  else if (e.rich) {
    // Rebuild a small allowlist rather than trusting stored or pasted markup.
    const source = document.createElement("template"), output = document.createElement("div");
    source.innerHTML = String(e.v);
    const tags = new Set(["B", "STRONG", "I", "EM", "U", "S", "STRIKE", "SPAN", "DIV", "P", "BR", "UL", "OL", "LI", "FONT"]);
    const styles = ["font-family", "font-size", "font-weight", "font-style", "text-decoration", "text-decoration-line", "text-decoration-style", "text-decoration-color", "text-decoration-thickness", "color", "background-color", "text-align", "direction", "line-height"];
    /** Copies only text, formatting tags and safe style values. */
    function clean(node, parent) {
      if (node.nodeType === 3) { parent.appendChild(document.createTextNode(node.data)); return; }
      if (node.nodeType !== 1 || ["SCRIPT", "STYLE", "IFRAME", "OBJECT", "SVG", "MATH", "TEMPLATE"].includes(node.tagName)) return;
      const target = tags.has(node.tagName) ? document.createElement(node.tagName === "FONT" ? "span" : node.tagName.toLowerCase()) : parent;
      if (target !== parent) {
        for (const key of styles) {
          const value = node.style.getPropertyValue(key);
          if (value && !/url|expression|var\(|[<>\\]/i.test(value)) target.style.setProperty(key, value);
        }
        if (["rtl", "ltr", "auto"].includes(node.getAttribute("dir"))) target.dir = node.getAttribute("dir");
        if (node.tagName === "FONT") {
          const color = node.getAttribute("color"), face = node.getAttribute("face");
          if (color && /^(#[0-9a-f]{3,8}|[a-z]+)$/i.test(color)) target.style.color = color;
          if (face && /^[\w ,'-]+$/.test(face)) target.style.fontFamily = face;
          const sizes = [10, 13, 16, 18, 24, 32, 48];
          if (node.hasAttribute("size")) target.style.fontSize = (sizes[Math.max(0, Math.min(6, (+node.getAttribute("size") || 3) - 1))]) + "px";
        }
        parent.appendChild(target);
      }
      for (const child of node.childNodes) clean(child, target);
    }
    for (const child of source.content.childNodes) clean(child, output);
    i = `<div class="rich-text" dir="auto" style="font-size:${+e.fs || 24}px;white-space:pre-wrap;overflow-wrap:anywhere">${output.innerHTML}</div>`;
  }
  else i = `<div dir="auto" style="font-size:${e.fs || 24}px;white-space:pre-wrap">${q(e.v)}</div>`;
  return `<div class="el" data-i="${e.id}" style="left:${e.x}px;top:${e.y}px;width:${e.w}px;height:${e.h}px;border-radius:${e.t === "shape" ? 0 : e.r || 0}px;transform:rotate(${e.a || 0}deg)">${i}</div>`;
}