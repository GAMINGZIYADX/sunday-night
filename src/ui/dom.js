// Tiny DOM helper: el('div.card#id', {onclick}, [children or text]).
export function el(spec, attrs = {}, children = []) {
  const m = /^([a-z0-9]+)?((?:[.#][\w-]+)*)$/i.exec(spec) || [];
  const node = document.createElement(m[1] || 'div');
  for (const part of (m[2] || '').match(/[.#][\w-]+/g) || []) {
    if (part[0] === '.') node.classList.add(part.slice(1));
    else node.id = part.slice(1);
  }
  if (Array.isArray(attrs) || typeof attrs === 'string') {
    children = attrs;
    attrs = {};
  }
  for (const [k, v] of Object.entries(attrs)) {
    if (k.startsWith('on')) node.addEventListener(k.slice(2), v);
    else if (k === 'html') node.innerHTML = v;
    else if (k === 'text') node.textContent = v;
    else if (k === 'style' && typeof v === 'object') Object.assign(node.style, v);
    else if (v === true) node.setAttribute(k, '');
    else if (v !== false && v !== null && v !== undefined) node.setAttribute(k, v);
  }
  for (const c of [].concat(children)) {
    if (c === null || c === undefined || c === false) continue;
    node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
  }
  return node;
}

export const TULIP_SVG = (color = '#6f9be0', size = 22) =>
  `<svg class="tulip-ico" width="${size}" height="${size}" viewBox="0 0 64 64" aria-hidden="true"><path d="M32 60V34" stroke="#78a07a" stroke-width="4" stroke-linecap="round"/><path d="M32 52c-8-2-12-8-13-14 6 1 11 5 13 10" fill="#8fb487"/><path d="M18 12l7 10 7-14 7 14 7-10c2 14-3 24-14 24S16 26 18 12z" fill="${color}" stroke="rgba(0,0,0,.08)" stroke-width="1.5"/></svg>`;

export const KEY_SVG = (color, size = 34) =>
  `<svg width="${size}" height="${size}" viewBox="0 0 64 64" aria-hidden="true"><circle cx="18" cy="32" r="11" fill="none" stroke="${color}" stroke-width="6"/><path d="M29 32h28M50 32v9M42 32v6" stroke="${color}" stroke-width="6" stroke-linecap="round"/></svg>`;

export function button(label, onClick, cls = '') {
  return el(`button.btn${cls ? '.' + cls : ''}`, { type: 'button', onclick: onClick }, label);
}
