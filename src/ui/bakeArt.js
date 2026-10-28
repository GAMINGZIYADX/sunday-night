// Drawings for the baking screen (ui/bake.js): small SVG pieces, all drawn
// in code. Scene units: a 400 x 250 box, the counter top from y 178 down.
// Anything the hand can use carries data-k (and data-i for one of many).

const NS = 'http://www.w3.org/2000/svg';
export const W = 400;
export const H = 250;
export const COUNTER_Y = 178;

export const C = {
  wall: '#f6e8d8',
  tile: '#ead6c2',
  wood: '#c98f5e',
  woodDark: '#a8713f',
  bowl: '#fdf7ec',
  bowlRim: '#e3cfb9',
  bowlShade: '#efe1cf',
  blue: '#6f9be0',
  berry: '#e04a5a',
  berryDark: '#b8323f',
  berryInside: '#f7b5bd',
  leaf: '#6aa84f',
  butter: '#f7e08a',
  butterEdge: '#e6c65c',
  flour: '#faf6ee',
  dough: '#efd9a8',
  doughEdge: '#d9bd84',
  pale: '#f1dcae',
  golden: '#d79b45',
  cream: '#fffaf0',
  creamShade: '#f1e6d2',
  milk: '#fbfbf8',
  metal: '#c9ced6',
  metalDark: '#8d96a3',
  ink: '#4a3a33',
  oven: '#f2c4c0',
  ovenDark: '#d9a39e',
  glass: '#3a2d3a',
  glow: '#ffb35c',
};

// One SVG element: s('circle', { cx, cy, r, fill }, [children]).
export function s(tag, attrs = {}, children = []) {
  const n = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) if (v !== undefined && v !== null && v !== false) n.setAttribute(k, v);
  for (const c of children) if (c) n.appendChild(c);
  return n;
}
export const g = (attrs, children) => s('g', attrs, children);
export function text(x, y, str, { size = 14, fill = C.ink, anchor = 'middle', weight = 'bold', cls = 'bk-text' } = {}) {
  const t = s('text', { x, y, 'font-size': size, fill, 'text-anchor': anchor, 'font-weight': weight, class: cls });
  t.textContent = str;
  return t;
}
const mix = (a, b, k) => {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const ch = (sh) => Math.round(((pa >> sh) & 255) * (1 - k) + ((pb >> sh) & 255) * k);
  return `rgb(${ch(16)},${ch(8)},${ch(0)})`;
};
export { mix };

// The kitchen behind everything: tiled wall and a wooden counter.
export function backdrop() {
  const tiles = [];
  for (let y = 0; y < COUNTER_Y; y += 26) tiles.push(s('line', { x1: 0, y1: y, x2: W, y2: y, stroke: C.tile, 'stroke-width': 1.5 }));
  for (let x = 0; x < W; x += 26) tiles.push(s('line', { x1: x, y1: 0, x2: x, y2: COUNTER_Y, stroke: C.tile, 'stroke-width': 1.5 }));
  return g({}, [
    s('rect', { x: 0, y: 0, width: W, height: COUNTER_Y, fill: C.wall }),
    ...tiles,
    s('rect', { x: 0, y: COUNTER_Y, width: W, height: H - COUNTER_Y, fill: C.wood }),
    s('rect', { x: 0, y: COUNTER_Y, width: W, height: 6, fill: C.woodDark }),
  ]);
}

// A mixing bowl seen from the front, with its contents (null = empty).
// Returns a group; its hand area is the bowl (data-k="bowl").
export function bowl(cx, cy, w, contents = null, { k = 'bowl', lumps = 0, peaks = 0 } = {}) {
  const h = w * 0.5;
  const top = cy - h * 0.55;
  const parts = [s('ellipse', { cx, cy: cy + h * 0.45, rx: w * 0.36, ry: h * 0.12, fill: 'rgba(60,30,20,0.15)' })];
  parts.push(
    s('path', {
      d: `M ${cx - w / 2} ${top} Q ${cx - w / 2} ${cy + h * 0.45} ${cx} ${cy + h * 0.45} Q ${cx + w / 2} ${cy + h * 0.45} ${cx + w / 2} ${top} Z`,
      fill: C.bowl,
      stroke: C.bowlRim,
      'stroke-width': 2,
    }),
  );
  parts.push(s('ellipse', { cx, cy: top, rx: w / 2, ry: h * 0.18, fill: C.bowlShade, stroke: C.bowlRim, 'stroke-width': 2 }));
  if (contents) {
    parts.push(s('ellipse', { cx, cy: top + 2, rx: w * 0.44, ry: h * 0.14, fill: contents }));
    // Crumbs, berry slices or a dough lump on top.
    for (let i = 0; i < lumps; i++) {
      const a = (i * 2.399) % (Math.PI * 2);
      const r = (0.15 + ((i * 37) % 10) / 14) * w * 0.32;
      parts.push(
        s('circle', { cx: cx + Math.cos(a) * r, cy: top + 2 + Math.sin(a) * r * 0.28, r: 2.2 + (i % 3), fill: mix(contents, '#a07040', 0.25) }),
      );
    }
    for (let i = 0; i < peaks; i++) {
      const x = cx - w * 0.3 + (i * w * 0.6) / Math.max(1, peaks - 1);
      parts.push(
        s('path', {
          d: `M ${x - 7} ${top + 4} Q ${x} ${top - 14} ${x + 3} ${top - 9} Q ${x + 4} ${top - 4} ${x + 7} ${top + 4} Z`,
          fill: C.cream,
          stroke: C.creamShade,
        }),
      );
    }
  }
  parts.push(s('rect', { x: cx - w / 2, y: top - h * 0.2, width: w, height: h * 1.2, fill: 'transparent', 'data-k': k }));
  return g({ class: 'bk-bowl' }, parts);
}

// A strawberry; cut ones show their pale insides.
export function berry(cx, cy, r, { cut = false, i = null, k = null } = {}) {
  const parts = [];
  if (!cut) {
    parts.push(
      s('path', {
        d: `M ${cx} ${cy + r * 1.2} C ${cx - r * 1.4} ${cy + r * 0.2} ${cx - r * 1.1} ${cy - r} ${cx} ${cy - r * 0.7} C ${cx + r * 1.1} ${cy - r} ${cx + r * 1.4} ${cy + r * 0.2} ${cx} ${cy + r * 1.2} Z`,
        fill: C.berry,
        stroke: C.berryDark,
        'stroke-width': 1.2,
      }),
    );
    for (let j = 0; j < 6; j++)
      parts.push(s('circle', { cx: cx + ((j % 3) - 1) * r * 0.45, cy: cy + (j < 3 ? -0.1 : 0.45) * r, r: 0.9, fill: '#ffe9a8' }));
    parts.push(
      s('path', {
        d: `M ${cx - r * 0.7} ${cy - r * 0.75} L ${cx} ${cy - r * 0.45} L ${cx + r * 0.7} ${cy - r * 0.75} L ${cx + r * 0.25} ${cy - r * 1.05} L ${cx} ${cy - r * 1.3} L ${cx - r * 0.25} ${cy - r * 1.05} Z`,
        fill: C.leaf,
      }),
    );
  } else {
    for (const dx of [-r * 0.6, r * 0.6]) {
      parts.push(s('ellipse', { cx: cx + dx, cy, rx: r * 0.55, ry: r * 0.95, fill: C.berry, stroke: C.berryDark }));
      parts.push(s('ellipse', { cx: cx + dx, cy, rx: r * 0.32, ry: r * 0.65, fill: C.berryInside }));
    }
  }
  const attrs = k ? { 'data-k': k, 'data-i': i } : {};
  return g(attrs, parts);
}

// A cutting board.
export function board(x, y, w, h) {
  return g({}, [
    s('rect', { x, y: y + 4, width: w, height: h, rx: 10, fill: 'rgba(60,30,20,0.18)' }),
    s('rect', { x, y, width: w, height: h, rx: 10, fill: '#e2b07a', stroke: '#c48f58', 'stroke-width': 2 }),
    s('circle', { cx: x + w - 14, cy: y + h / 2, r: 5, fill: '#c48f58' }),
  ]);
}

// A block of butter, cut along `cuts` of its `n` lines.
export function butter(x, y, w, h, n, cuts) {
  const parts = [s('rect', { x, y, width: w, height: h, rx: 4, fill: C.butter, stroke: C.butterEdge, 'stroke-width': 2 })];
  for (let i = 0; i < n; i++) {
    const lx = x + ((i + 1) * w) / (n + 1);
    parts.push(
      s('line', {
        x1: lx,
        y1: y + 2,
        x2: lx,
        y2: y + h - 2,
        stroke: cuts.includes(i) ? C.butterEdge : 'rgba(0,0,0,0.12)',
        'stroke-width': cuts.includes(i) ? 3 : 1,
        'stroke-dasharray': cuts.includes(i) ? null : '4 4',
      }),
    );
  }
  return g({}, parts);
}

// Things to tap: a measuring spoon over a tin, a pastry brush, a sugar shaker,
// the cook's hand (patting) and a knife.
export function tool(kind, x, y, label = null) {
  const parts = [];
  if (kind === 'spoon') {
    parts.push(s('rect', { x: x - 26, y: y - 6, width: 52, height: 40, rx: 8, fill: '#e9e2f5', stroke: '#cfc4e4', 'stroke-width': 2 }));
    parts.push(s('ellipse', { cx: x + 10, cy: y - 12, rx: 14, ry: 8, fill: C.metal, stroke: C.metalDark }));
    parts.push(s('rect', { x: x - 32, y: y - 15, width: 32, height: 6, rx: 3, fill: C.metal, stroke: C.metalDark }));
  } else if (kind === 'brush') {
    parts.push(s('rect', { x: x - 30, y: y - 4, width: 40, height: 8, rx: 4, fill: '#c98f5e' }));
    parts.push(
      s('path', { d: `M ${x + 10} ${y - 7} L ${x + 30} ${y - 9} L ${x + 30} ${y + 9} L ${x + 10} ${y + 7} Z`, fill: '#f7e9c8', stroke: '#d8c49a' }),
    );
  } else if (kind === 'shaker') {
    parts.push(s('rect', { x: x - 14, y: y - 18, width: 28, height: 40, rx: 8, fill: C.cream, stroke: C.creamShade, 'stroke-width': 2 }));
    parts.push(s('rect', { x: x - 14, y: y - 26, width: 28, height: 10, rx: 4, fill: C.metal, stroke: C.metalDark }));
  } else if (kind === 'hand') {
    parts.push(
      s('path', {
        d: `M ${x - 22} ${y + 10} Q ${x - 24} ${y - 14} ${x - 8} ${y - 18} Q ${x + 14} ${y - 22} ${x + 22} ${y - 6} Q ${x + 26} ${y + 10} ${x + 10} ${y + 14} Z`,
        fill: '#f3c9a8',
        stroke: '#d9a985',
        'stroke-width': 2,
      }),
    );
  } else if (kind === 'knife') {
    parts.push(s('path', { d: `M ${x - 34} ${y} L ${x + 18} ${y - 6} L ${x + 24} ${y} L ${x + 18} ${y + 3} Z`, fill: C.metal, stroke: C.metalDark }));
    parts.push(s('rect', { x: x + 22, y: y - 4, width: 22, height: 8, rx: 3, fill: '#5a4038' }));
  }
  if (label) parts.push(text(x, y + 50, label, { size: 12 }));
  return g({ 'data-k': 'tool', class: 'bk-tool' }, parts);
}

// A bag, jug or carton to pour from (tilted while pouring).
export function source(kind, x, y, tilt, label) {
  const parts = [];
  if (kind === 'bag') {
    parts.push(
      s('path', {
        d: `M ${x - 26} ${y - 34} L ${x + 26} ${y - 34} L ${x + 30} ${y + 34} L ${x - 30} ${y + 34} Z`,
        fill: '#f4ecdc',
        stroke: '#d8c9ae',
        'stroke-width': 2,
      }),
    );
    parts.push(s('rect', { x: x - 20, y: y - 8, width: 40, height: 18, rx: 3, fill: C.blue }));
  } else if (kind === 'jug') {
    parts.push(
      s('path', {
        d: `M ${x - 22} ${y - 30} L ${x + 18} ${y - 30} L ${x + 26} ${y - 38} L ${x + 22} ${y - 26} L ${x + 22} ${y + 32} L ${x - 22} ${y + 32} Z`,
        fill: 'rgba(255,255,255,0.75)',
        stroke: C.metalDark,
        'stroke-width': 2,
      }),
    );
    parts.push(s('rect', { x: x - 20, y: y - 6, width: 40, height: 36, fill: C.milk }));
    parts.push(
      s('path', { d: `M ${x - 22} ${y - 18} Q ${x - 40} ${y - 10} ${x - 22} ${y + 8}`, fill: 'none', stroke: C.metalDark, 'stroke-width': 3 }),
    );
  } else {
    parts.push(
      s('path', {
        d: `M ${x - 20} ${y - 26} L ${x} ${y - 40} L ${x + 20} ${y - 26} L ${x + 20} ${y + 34} L ${x - 20} ${y + 34} Z`,
        fill: '#ffffff',
        stroke: '#cfd8e6',
        'stroke-width': 2,
      }),
    );
    parts.push(s('rect', { x: x - 20, y: y - 6, width: 40, height: 16, fill: C.blue }));
  }
  parts.push(text(x, y + 52, label, { size: 12 }));
  return g({ 'data-k': 'source', class: 'bk-tool', transform: `rotate(${tilt} ${x} ${y})` }, parts);
}

// A kitchen scale showing a weight (or a measuring jug's mark).
export function readout(x, y, value, unit, target, tolerance) {
  const ok = Math.abs(value - target) <= tolerance;
  return g({ class: 'bk-readout', 'data-value': Math.round(value) }, [
    s('rect', { x: x - 46, y: y - 18, width: 92, height: 30, rx: 8, fill: '#fffaf2', stroke: ok ? '#7fb26b' : C.bowlRim, 'stroke-width': 3 }),
    text(x, y + 4, `${Math.round(value)} ${unit}`, { size: 17, fill: ok ? '#4f8a3c' : C.ink }),
    text(x, y + 28, `${target} ${unit}`, { size: 11, fill: '#8a776c', weight: 'normal' }),
  ]);
}

// A progress meter under a bowl.
export function meter(x, y, w, p, marks = []) {
  const parts = [
    s('rect', { x, y, width: w, height: 8, rx: 4, fill: '#ead9c6' }),
    s('rect', { x, y, width: Math.max(0.001, w * p), height: 8, rx: 4, fill: '#7fb26b' }),
  ];
  for (const m of marks) parts.push(s('line', { x1: x + w * m, y1: y - 3, x2: x + w * m, y2: y + 11, stroke: C.ink, 'stroke-width': 1.5 }));
  return g({}, parts);
}

// A biscuit seen from above (r) in a colour from raw to golden.
export function biscuit(cx, cy, r, color, { split = false, k = null, i = null } = {}) {
  const parts = split
    ? [
        s('ellipse', { cx: cx - r * 0.55, cy, rx: r * 0.9, ry: r * 0.55, fill: color, stroke: mix(color, '#7a4a20', 0.3), 'stroke-width': 1.5 }),
        s('ellipse', {
          cx: cx + r * 0.75,
          cy: cy + 2,
          rx: r * 0.9,
          ry: r * 0.55,
          fill: C.pale,
          stroke: mix(C.pale, '#7a4a20', 0.3),
          'stroke-width': 1.5,
        }),
      ]
    : [
        s('circle', { cx, cy, r, fill: color, stroke: mix(color, '#7a4a20', 0.3), 'stroke-width': 1.5 }),
        s('circle', { cx: cx - r * 0.2, cy: cy - r * 0.25, r: r * 0.35, fill: 'rgba(255,255,255,0.18)' }),
      ];
  return g(k ? { 'data-k': k, 'data-i': i } : {}, parts);
}

// A baking tray with n biscuits.
export function tray(x, y, color, n = 6, { k = null, cut = n } = {}) {
  const parts = [s('rect', { x, y, width: 120, height: 64, rx: 6, fill: C.metal, stroke: C.metalDark, 'stroke-width': 2 })];
  for (let i = 0; i < Math.min(n, cut); i++) parts.push(biscuit(x + 22 + (i % 3) * 38, y + 18 + Math.floor(i / 3) * 28, 12, color));
  return g(k ? { 'data-k': k, 'data-i': 'tray' } : {}, parts);
}

// The oven: a door with a window (glowing when on), a knob and a display.
// The knob sits at (x + KNOB.dx, y + KNOB.dy).
export const KNOB = { dx: 136, dy: 24 };
export function oven(x, y, { on = false, inside = null, display = '', knobAngle = -135 } = {}) {
  const w = 170;
  const h = 170;
  const kx = x + KNOB.dx;
  const ky = y + KNOB.dy;
  const parts = [
    s('rect', { x, y, width: w, height: h, rx: 10, fill: C.oven, stroke: C.ovenDark, 'stroke-width': 3 }),
    s('rect', { x: x + 8, y: y + 8, width: w - 16, height: 34, rx: 6, fill: '#f8dad6' }),
    s('rect', {
      x: x + 18,
      y: y + 56,
      width: w - 36,
      height: h - 76,
      rx: 8,
      fill: on ? '#5a3a30' : C.glass,
      stroke: C.ovenDark,
      'stroke-width': 3,
      'data-k': 'door',
    }),
  ];
  if (on) parts.push(s('rect', { x: x + 24, y: y + 62, width: w - 48, height: h - 88, rx: 6, fill: C.glow, opacity: 0.35 }));
  if (inside) parts.push(inside);
  parts.push(s('rect', { x: x + 30, y: y + 46, width: w - 60, height: 6, rx: 3, fill: C.metal }));
  parts.push(
    g({ 'data-k': 'knob', class: 'bk-knob' }, [
      s('circle', { cx: kx, cy: ky, r: 15, fill: '#fffaf2', stroke: C.ovenDark, 'stroke-width': 3 }),
      s('line', {
        x1: kx,
        y1: ky,
        x2: kx,
        y2: ky - 12,
        stroke: C.ink,
        'stroke-width': 3,
        'stroke-linecap': 'round',
        transform: `rotate(${knobAngle} ${kx} ${ky})`,
      }),
    ]),
  );
  parts.push(text(x + 30, y + 30, display, { size: 13, anchor: 'start' }));
  return g({}, parts);
}

// A plate (from the front, a little from above).
export function plate(cx, cy, w) {
  return g({ 'data-k': 'plate' }, [
    s('ellipse', { cx, cy: cy + 4, rx: w / 2, ry: w * 0.16, fill: 'rgba(60,30,20,0.15)' }),
    s('ellipse', { cx, cy, rx: w / 2, ry: w * 0.16, fill: '#ffffff', stroke: '#d9cfc2', 'stroke-width': 2 }),
    s('ellipse', { cx, cy, rx: w * 0.32, ry: w * 0.1, fill: 'none', stroke: '#e9e1d6', 'stroke-width': 2 }),
  ]);
}

// The shortcake, built up from its layers (from the bottom): `layers` is how
// many are on so far.
export function shortcake(cx, base, layers, scale = 1) {
  const k = scale;
  const parts = [];
  let y = base;
  const half = (top) => {
    parts.push(
      s('path', {
        d: top
          ? `M ${cx - 40 * k} ${y} Q ${cx - 42 * k} ${y - 26 * k} ${cx} ${y - 28 * k} Q ${cx + 42 * k} ${y - 26 * k} ${cx + 40 * k} ${y} Z`
          : `M ${cx - 42 * k} ${y} L ${cx - 40 * k} ${y - 16 * k} L ${cx + 40 * k} ${y - 16 * k} L ${cx + 42 * k} ${y} Z`,
        fill: top ? C.golden : C.pale,
        stroke: mix(C.golden, '#7a4a20', 0.3),
        'stroke-width': 1.5,
      }),
    );
    y -= top ? 26 * k : 16 * k;
  };
  const berries = () => {
    for (let i = 0; i < 6; i++)
      parts.push(s('ellipse', { cx: cx - 36 * k + i * 14.5 * k, cy: y - 4 * k, rx: 8 * k, ry: 6 * k, fill: i % 2 ? C.berry : C.berryDark }));
    parts.push(
      s('path', {
        d: `M ${cx - 38 * k} ${y} Q ${cx} ${y + 6 * k} ${cx + 38 * k} ${y}`,
        fill: 'none',
        stroke: 'rgba(200,40,60,0.6)',
        'stroke-width': 3,
      }),
    );
    y -= 9 * k;
  };
  const cream = (w) => {
    parts.push(
      s('path', {
        d: `M ${cx - w * k} ${y + 2} Q ${cx - w * 0.6 * k} ${y - 16 * k} ${cx - w * 0.2 * k} ${y - 8 * k} Q ${cx} ${y - 20 * k} ${cx + w * 0.25 * k} ${y - 8 * k} Q ${cx + w * 0.65 * k} ${y - 16 * k} ${cx + w * k} ${y + 2} Z`,
        fill: C.cream,
        stroke: C.creamShade,
        'stroke-width': 1.5,
      }),
    );
    y -= 11 * k;
  };
  const steps = [() => half(false), berries, () => cream(44), () => half(true), () => cream(26), () => parts.push(berry(cx, y - 8 * k, 9 * k))];
  steps.slice(0, layers).forEach((f) => f());
  return g({}, parts);
}

// The things to stack, as small pictures to drag.
export function item(id, cx, cy) {
  const k = 0.55;
  const parts = [s('circle', { cx, cy, r: 26, fill: 'rgba(255,255,255,0.55)', stroke: C.bowlRim, 'stroke-width': 1.5 })];
  if (id === 'tray') return tray(cx - 60, cy - 32, C.pale, 6, { k: 'item' });
  if (id === 'bottom') parts.push(shortcake(cx, cy + 8, 1, k));
  if (id === 'top')
    parts.push(
      s('path', {
        d: `M ${cx - 22} ${cy + 6} Q ${cx - 23} ${cy - 10} ${cx} ${cy - 11} Q ${cx + 23} ${cy - 10} ${cx + 22} ${cy + 6} Z`,
        fill: C.golden,
        stroke: '#a8713f',
      }),
    );
  if (id === 'berries') {
    parts.push(bowl(cx, cy + 6, 44, C.berry, { k: 'x', lumps: 5 }));
  }
  if (id === 'cream' || id === 'cream2') parts.push(bowl(cx, cy + 6, 44, C.cream, { k: 'x', peaks: id === 'cream' ? 3 : 2 }));
  if (id === 'berry') parts.push(berry(cx, cy, 11));
  return g({ 'data-k': 'item', 'data-i': id, class: 'bk-item' }, parts);
}
