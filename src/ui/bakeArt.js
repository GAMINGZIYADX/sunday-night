// Drawings for the baking screen (ui/bake.js): SVG pieces, all drawn in code,
// shaded with the gradients in defs(). Scene units: a 400 x 250 box, the
// counter top from COUNTER_Y down. Anything the hand can use carries data-k
// (and data-i for one of many). Animated things take 0..1 amounts.

const NS = 'http://www.w3.org/2000/svg';
export const W = 400;
export const H = 250;
export const COUNTER_Y = 178;

export const C = {
  ink: '#4a3a33',
  berry: '#e2394c',
  berryDark: '#a91d2c',
  flour: '#fbf8f1',
  cream: '#fffaf0',
  creamShade: '#efe2cb',
  milk: '#fbfcfd',
  dough: '#f2dfb4',
  doughEdge: '#d7bb83',
  pale: '#f4e2b8',
  golden: '#d38f3c',
  crust: '#a8652a',
  metal: '#c9ced6',
  metalDark: '#8d96a3',
  leaf: '#5fa043',
  butter: '#fbe38c',
  ovenDark: '#cf938d',
};

// One SVG element: s('circle', { cx, cy, r, fill }, [children]).
export function s(tag, attrs = {}, children = []) {
  const n = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) if (v !== undefined && v !== null && v !== false) n.setAttribute(k, v);
  for (const c of children) if (c) n.appendChild(c);
  return n;
}
export const g = (attrs, children) => s('g', attrs, children);
const P = (d, attrs) => s('path', { d, ...attrs });
export function text(x, y, str, { size = 14, fill = C.ink, anchor = 'middle', weight = 'bold', cls = 'bk-text', family = null } = {}) {
  const t = s('text', { x, y, 'font-size': size, fill, 'text-anchor': anchor, 'font-weight': weight, class: cls, 'font-family': family });
  t.textContent = str;
  return t;
}
export const mix = (a, b, k) => {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const ch = (sh) => Math.round(((pa >> sh) & 255) * (1 - k) + ((pb >> sh) & 255) * k);
  return `rgb(${ch(16)},${ch(8)},${ch(0)})`;
};
// The same "random" every time for the same seed (crumbs stay put).
export function rng(seed) {
  let a = seed >>> 0 || 1;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export const clamp01 = (k) => Math.max(0, Math.min(1, k));

// ---------------------------------------------------------------- shading
const lin = (id, stops, { x2 = 0, y2 = 1 } = {}) =>
  s(
    'linearGradient',
    { id, x1: 0, y1: 0, x2, y2 },
    stops.map(([o, c, op = 1]) => s('stop', { offset: o, 'stop-color': c, 'stop-opacity': op })),
  );
const rad = (id, stops, { cx = 0.5, cy = 0.5, r = 0.5, fx = null, fy = null } = {}) =>
  s(
    'radialGradient',
    { id, cx, cy, r, fx: fx ?? cx, fy: fy ?? cy },
    stops.map(([o, c, op = 1]) => s('stop', { offset: o, 'stop-color': c, 'stop-opacity': op })),
  );
export function defs() {
  return s('defs', {}, [
    lin('bk-wall', [
      [0, '#fbf2e6'],
      [1, '#f0dfcb'],
    ]),
    rad(
      'bk-light',
      [
        [0, '#fffbf0', 0.85],
        [1, '#fffbf0', 0],
      ],
      { cx: 0.22, cy: 0.05, r: 0.75 },
    ),
    lin('bk-wood', [
      [0, '#d9a26c'],
      [0.6, '#c58c58'],
      [1, '#ad7444'],
    ]),
    lin('bk-woodEdge', [
      [0, '#b67a46'],
      [1, '#8a5630'],
    ]),
    lin('bk-board', [
      [0, '#efc38f'],
      [1, '#d9a56c'],
    ]),
    rad(
      'bk-ceramic',
      [
        [0, '#ffffff'],
        [0.55, '#f7efe3'],
        [1, '#dfccb4'],
      ],
      { cx: 0.3, cy: 0.25, r: 0.85 },
    ),
    lin('bk-ceramicIn', [
      [0, '#e8dac6'],
      [1, '#fbf6ee'],
    ]),
    rad(
      'bk-berry',
      [
        [0, '#ff8b93'],
        [0.45, '#e8394d'],
        [1, '#a51a2a'],
      ],
      { cx: 0.35, cy: 0.3, r: 0.8 },
    ),
    rad(
      'bk-slice',
      [
        [0, '#fff4f2'],
        [0.45, '#f9b9c0'],
        [0.8, '#ec5867'],
        [1, '#c42638'],
      ],
      { cx: 0.5, cy: 0.45, r: 0.6 },
    ),
    lin('bk-leaf', [
      [0, '#9bd774'],
      [1, '#468c32'],
    ]),
    lin('bk-butter', [
      [0, '#fff3b0'],
      [1, '#f0cf5f'],
    ]),
    lin(
      'bk-foil',
      [
        [0, '#f4f6f9'],
        [0.5, '#c9d0da'],
        [1, '#eef1f5'],
      ],
      { x2: 1, y2: 0 },
    ),
    lin(
      'bk-metal',
      [
        [0, '#f3f5f8'],
        [0.35, '#c5ccd6'],
        [0.6, '#f6f8fa'],
        [1, '#a7b0bc'],
      ],
      { x2: 1, y2: 0 },
    ),
    lin('bk-metalV', [
      [0, '#f3f5f8'],
      [1, '#aab3bf'],
    ]),
    rad(
      'bk-dough',
      [
        [0, '#f9ead0'],
        [1, '#e6cc96'],
      ],
      { cx: 0.4, cy: 0.35, r: 0.75 },
    ),
    rad(
      'bk-golden',
      [
        [0, '#f6cf83'],
        [0.55, '#d99540'],
        [1, '#a9662a'],
      ],
      { cx: 0.4, cy: 0.3, r: 0.8 },
    ),
    lin('bk-side', [
      [0, '#f3dcab'],
      [1, '#d9b67a'],
    ]),
    lin('bk-sideBaked', [
      [0, '#e6ae5c'],
      [1, '#b0702f'],
    ]),
    rad(
      'bk-cream',
      [
        [0, '#ffffff'],
        [0.7, '#fdf6e8'],
        [1, '#ecdcc2'],
      ],
      { cx: 0.4, cy: 0.3, r: 0.8 },
    ),
    rad(
      'bk-flour',
      [
        [0, '#ffffff'],
        [1, '#ece4d4'],
      ],
      { cx: 0.45, cy: 0.35, r: 0.75 },
    ),
    lin('bk-milk', [
      [0, '#ffffff'],
      [1, '#e9edf1'],
    ]),
    lin('bk-oven', [
      [0, '#f8d6d2'],
      [1, '#e3aaa4'],
    ]),
    lin('bk-glass', [
      [0, '#4b3542'],
      [1, '#241a22'],
    ]),
    rad(
      'bk-ovenGlow',
      [
        [0, '#ffd27c', 0.95],
        [0.6, '#ff9a45', 0.55],
        [1, '#ff7a30', 0],
      ],
      { cx: 0.5, cy: 0.35, r: 0.75 },
    ),
    lin('bk-handle', [
      [0, '#8a5a46'],
      [1, '#4e3128'],
    ]),
    rad(
      'bk-plate',
      [
        [0, '#ffffff'],
        [0.75, '#f6f2ec'],
        [1, '#e0d8cc'],
      ],
      { cx: 0.45, cy: 0.35, r: 0.7 },
    ),
    rad(
      'bk-skin',
      [
        [0, '#fde0c8'],
        [1, '#eab796'],
      ],
      { cx: 0.4, cy: 0.35, r: 0.8 },
    ),
    s('filter', { id: 'bk-blur', x: '-50%', y: '-50%', width: '200%', height: '200%' }, [s('feGaussianBlur', { stdDeviation: 2.4 })]),
    s('filter', { id: 'bk-blur-sm', x: '-50%', y: '-50%', width: '200%', height: '200%' }, [s('feGaussianBlur', { stdDeviation: 0.9 })]),
  ]);
}
const U = (id) => `url(#${id})`;

// A soft contact shadow.
export const shadow = (cx, cy, rx, ry, op = 0.3) => s('ellipse', { cx, cy, rx, ry, fill: `rgba(70,35,15,${op})`, filter: U('bk-blur') });

// The kitchen behind everything: tiled wall with window light, a wooden
// counter with grain.
export function backdrop() {
  const r = rng(7);
  const parts = [s('rect', { x: 0, y: 0, width: W, height: COUNTER_Y, fill: U('bk-wall') })];
  for (let y = 0; y < COUNTER_Y; y += 24)
    for (let x = (y / 24) % 2 ? -12 : 0; x < W; x += 24)
      parts.push(
        s('rect', {
          x: x + 1,
          y: y + 1,
          width: 22,
          height: 22,
          rx: 3,
          fill: '#ffffff',
          'fill-opacity': 0.18 + r() * 0.12,
          stroke: '#e4ccb3',
          'stroke-opacity': 0.55,
          'stroke-width': 0.8,
        }),
      );
  parts.push(s('rect', { x: 0, y: 0, width: W, height: COUNTER_Y, fill: U('bk-light') }));
  parts.push(s('rect', { x: 0, y: COUNTER_Y - 6, width: W, height: 8, fill: 'rgba(90,50,20,0.12)', filter: U('bk-blur') }));
  parts.push(s('rect', { x: 0, y: COUNTER_Y, width: W, height: H - COUNTER_Y, fill: U('bk-wood') }));
  for (let i = 0; i < 9; i++) {
    const y = COUNTER_Y + 12 + i * 7.5 + r() * 3;
    const a = 2 + r() * 3;
    parts.push(
      P(`M 0 ${y} C 90 ${y - a} 160 ${y + a} 240 ${y} S 360 ${y - a} 400 ${y + 1}`, {
        fill: 'none',
        stroke: '#8a5630',
        'stroke-opacity': 0.13,
        'stroke-width': 0.9,
      }),
    );
  }
  parts.push(s('rect', { x: 0, y: COUNTER_Y, width: W, height: 5, fill: U('bk-woodEdge') }));
  parts.push(s('rect', { x: 0, y: COUNTER_Y, width: W, height: 1.2, fill: '#ffe8c8', 'fill-opacity': 0.6 }));
  return g({}, parts);
}

// A wooden cutting board.
export function board(x, y, w, h) {
  return g({}, [
    shadow(x + w / 2, y + h + 2, w / 2, 6, 0.35),
    s('rect', { x, y, width: w, height: h, rx: 12, fill: U('bk-board'), stroke: '#c48f58', 'stroke-width': 1.2 }),
    s('rect', { x: x + 4, y: y + 3, width: w - 8, height: 3, rx: 1.5, fill: '#fff3df', 'fill-opacity': 0.5 }),
    s('circle', { cx: x + w - 14, cy: y + h / 2, r: 4.5, fill: '#b98552' }),
    s('circle', { cx: x + w - 14, cy: y + h / 2, r: 2.5, fill: '#8e5d32' }),
  ]);
}

// ---------------------------------------------------------------- berries
const berryPath = (cx, cy, r) =>
  `M ${cx} ${cy + r * 1.25} C ${cx - r * 0.55} ${cy + r * 1.05} ${cx - r * 1.2} ${cy + r * 0.3} ${cx - r * 1.05} ${cy - r * 0.35} C ${cx - r * 0.95} ${cy - r * 0.85} ${cx - r * 0.35} ${cy - r * 0.9} ${cx} ${cy - r * 0.72} C ${cx + r * 0.35} ${cy - r * 0.9} ${cx + r * 0.95} ${cy - r * 0.85} ${cx + r * 1.05} ${cy - r * 0.35} C ${cx + r * 1.2} ${cy + r * 0.3} ${cx + r * 0.55} ${cy + r * 1.05} ${cx} ${cy + r * 1.25} Z`;
function calyx(cx, cy, r) {
  const leaves = [];
  for (let i = 0; i < 5; i++) {
    const a = -Math.PI / 2 + (i - 2) * 0.62;
    const lx = cx + Math.cos(a) * r * 0.75;
    const ly = cy + Math.sin(a) * r * 0.42 + r * 0.05;
    leaves.push(
      P(
        `M ${cx} ${cy} Q ${(cx + lx) / 2 - Math.sin(a) * r * 0.18} ${(cy + ly) / 2 + Math.cos(a) * r * 0.12} ${lx} ${ly} Q ${(cx + lx) / 2 + Math.sin(a) * r * 0.18} ${(cy + ly) / 2 - Math.cos(a) * r * 0.08} ${cx} ${cy} Z`,
        { fill: U('bk-leaf'), stroke: '#3d7a2b', 'stroke-width': 0.5 },
      ),
    );
  }
  leaves.push(
    P(`M ${cx} ${cy} q ${r * 0.08} ${-r * 0.35} ${r * 0.3} ${-r * 0.5}`, {
      fill: 'none',
      stroke: '#4a8a33',
      'stroke-width': r * 0.12,
      'stroke-linecap': 'round',
    }),
  );
  return g({}, leaves);
}
// A whole strawberry, glossy, seeded, with its green top.
export function strawberry(cx, cy, r, { rot = 0, top = true } = {}) {
  const seeds = [];
  const rows = [
    [-0.45, [-0.55, -0.15, 0.25, 0.62]],
    [0.05, [-0.6, -0.2, 0.2, 0.6]],
    [0.5, [-0.38, 0, 0.38]],
    [0.88, [-0.12, 0.16]],
  ];
  for (const [yy, xs] of rows)
    for (const xx of xs)
      seeds.push(
        s('ellipse', { cx: cx + xx * r, cy: cy + yy * r, rx: r * 0.055, ry: r * 0.09, fill: '#ffe08a', stroke: '#c9963a', 'stroke-width': 0.3 }),
      );
  return g({ transform: rot ? `rotate(${rot} ${cx} ${cy})` : null }, [
    P(berryPath(cx, cy, r), { fill: U('bk-berry'), stroke: C.berryDark, 'stroke-width': 0.6 }),
    ...seeds,
    s('ellipse', {
      cx: cx - r * 0.45,
      cy: cy - r * 0.2,
      rx: r * 0.22,
      ry: r * 0.38,
      fill: '#ffffff',
      'fill-opacity': 0.35,
      transform: `rotate(-25 ${cx - r * 0.45} ${cy - r * 0.2})`,
    }),
    top ? calyx(cx, cy - r * 0.72, r) : null,
  ]);
}
// A strawberry being cut: k = 0 whole, 1 two halves lying apart, the top
// flown off. Half-cut faces show the pale heart.
export function cutStrawberry(cx, cy, r, k) {
  if (k <= 0) return strawberry(cx, cy, r);
  const off = r * 0.55 * k;
  const half = (side) => {
    const sx = cx + side * off;
    const face = P(berryPath(sx, cy, r * 0.92), { fill: U('bk-slice'), stroke: '#c42638', 'stroke-width': 0.6 });
    const heart = P(berryPath(sx, cy + r * 0.05, r * 0.42), { fill: '#fff4f2', 'fill-opacity': 0.85 });
    const dots = [0, 1, 2, 3, 4, 5].map((i) => {
      const a = (i / 6) * Math.PI * 2;
      return s('circle', { cx: sx + Math.cos(a) * r * 0.62, cy: cy + Math.sin(a) * r * 0.75, r: r * 0.05, fill: '#ffe08a' });
    });
    return g({ transform: `rotate(${side * 18 * k} ${sx} ${cy + r})` }, [face, heart, ...dots]);
  };
  return g({}, [
    shadow(cx, cy + r * 1.2, r * (1.1 + k * 0.6), r * 0.25, 0.25),
    half(-1),
    half(1),
    g({ transform: `translate(${r * 1.4 * k} ${-r * 1.6 * k}) rotate(${50 * k} ${cx} ${cy - r * 0.72})`, opacity: 1 - k * 0.85 }, [
      calyx(cx, cy - r * 0.72, r),
    ]),
  ]);
}
// A slice for bowls and the cake (small heart, cut face up).
export const berrySlice = (cx, cy, r, rot = 0) =>
  g({ transform: `rotate(${rot} ${cx} ${cy})` }, [
    P(berryPath(cx, cy, r), { fill: U('bk-slice'), stroke: '#b8283a', 'stroke-width': 0.4 }),
    P(berryPath(cx, cy + r * 0.05, r * 0.45), { fill: '#fff1ef', 'fill-opacity': 0.8 }),
  ]);

// ------------------------------------------------------------------ bowls
// What can be in a bowl (front view, from a little above): `fill` is one of
// 'flour', 'mix' (flour + powders), 'crumbs', 'wetCrumbs', 'dough',
// 'berries', 'milk', 'cream', 'whipped'; k is how far it has gone (stirred,
// whipped, rubbed in), `swirl` an angle for the stirring marks.
export function bowl(cx, cy, w, { fill = null, k = 0, swirl = 0, level = 1, k2 = 0 } = {}) {
  const h = w * 0.48;
  const rimY = cy - h * 0.5;
  const rx = w / 2;
  const ry = w * 0.13;
  const parts = [shadow(cx, cy + h * 0.5, w * 0.36, w * 0.05, 0.4)];
  parts.push(s('ellipse', { cx, cy: rimY, rx, ry, fill: U('bk-ceramicIn') }));
  if (fill && level > 0.01) parts.push(contents(cx, rimY, rx * 0.9, ry * 0.85, fill, k, swirl, level, k2));
  parts.push(
    P(
      `M ${cx - rx} ${rimY} A ${rx} ${ry} 0 0 0 ${cx + rx} ${rimY} C ${cx + rx} ${rimY + h * 0.75} ${cx + rx * 0.55} ${cy + h * 0.5} ${cx} ${cy + h * 0.5} C ${cx - rx * 0.55} ${cy + h * 0.5} ${cx - rx} ${rimY + h * 0.75} ${cx - rx} ${rimY} Z`,
      {
        fill: U('bk-ceramic'),
        stroke: '#d8c3a8',
        'stroke-width': 0.8,
      },
    ),
  );
  // A blue band and the rim's shine.
  parts.push(
    P(`M ${cx - rx * 0.985} ${rimY + h * 0.14} Q ${cx} ${rimY + h * 0.14 + ry * 2.1} ${cx + rx * 0.985} ${rimY + h * 0.14}`, {
      fill: 'none',
      stroke: '#8fb3e6',
      'stroke-width': w * 0.025,
    }),
  );
  parts.push(
    P(`M ${cx - rx} ${rimY} A ${rx} ${ry} 0 0 0 ${cx + rx} ${rimY}`, { fill: 'none', stroke: '#ffffff', 'stroke-width': 1.6, 'stroke-opacity': 0.9 }),
  );
  parts.push(s('ellipse', { cx, cy: rimY, rx, ry, fill: 'none', stroke: '#d8c3a8', 'stroke-width': 0.8 }));
  parts.push(
    P(`M ${cx - rx * 0.7} ${rimY + h * 0.35} Q ${cx - rx * 0.62} ${rimY + h * 0.75} ${cx - rx * 0.3} ${rimY + h * 0.88}`, {
      fill: 'none',
      stroke: '#ffffff',
      'stroke-width': w * 0.03,
      'stroke-opacity': 0.55,
      'stroke-linecap': 'round',
    }),
  );
  parts.push(s('rect', { x: cx - rx, y: rimY - ry * 2, width: w, height: h + ry * 3, fill: 'transparent', 'data-k': 'bowl' }));
  return g({ class: 'bk-bowl' }, parts);
}
function contents(cx, cy, rx, ry, fill, k, swirl, level, k2) {
  const r = rng(fill.length * 97 + 13);
  const y = cy + ry * 0.35 * (1 - level);
  const parts = [];
  const surface = (paint, extra = {}) =>
    s('ellipse', { cx, cy: y, rx: rx * (0.75 + 0.25 * level), ry: ry * (0.75 + 0.25 * level), fill: paint, ...extra });
  const swirlMarks = (color, op) => {
    const marks = [];
    for (let i = 0; i < 3; i++) {
      const a = swirl + (i * Math.PI * 2) / 3;
      const r1 = rx * (0.25 + i * 0.2);
      marks.push(
        P(
          `M ${cx + Math.cos(a) * r1} ${y + Math.sin(a) * r1 * (ry / rx)} A ${r1} ${r1 * (ry / rx)} 0 0 1 ${cx + Math.cos(a + 2) * r1} ${y + Math.sin(a + 2) * r1 * (ry / rx)}`,
          { fill: 'none', stroke: color, 'stroke-opacity': op, 'stroke-width': 1.4, 'stroke-linecap': 'round' },
        ),
      );
    }
    return marks;
  };
  if (fill === 'flour' || fill === 'mix') {
    parts.push(surface(U('bk-flour')));
    parts.push(
      P(`M ${cx - rx * 0.55} ${y} Q ${cx} ${y - ry * 1.6} ${cx + rx * 0.55} ${y} Z`, { fill: U('bk-flour'), 'fill-opacity': 0.9 * (1 - k) }),
    );
    for (let i = 0; i < (fill === 'mix' ? 26 : 12); i++)
      parts.push(
        s('circle', {
          cx: cx + (r() - 0.5) * rx * 1.5,
          cy: y + (r() - 0.5) * ry * 1.4,
          r: 0.6,
          fill: i % 3 ? '#e9dfcc' : '#d9cdb6',
          'fill-opacity': 0.8 * (1 - k * 0.6),
        }),
      );
    if (k > 0) parts.push(...swirlMarks('#c9b99c', 0.5));
  } else if (fill === 'crumbs' || fill === 'wetCrumbs') {
    parts.push(surface(U('bk-flour')));
    const n = 14 + Math.round(30 * k);
    for (let i = 0; i < n; i++) {
      const big = i < 10 * (1 - k);
      parts.push(
        s('ellipse', {
          cx: cx + (r() - 0.5) * rx * 1.5,
          cy: y + (r() - 0.5) * ry * 1.3,
          rx: big ? 4 + r() * 3 : 1.3 + r() * 1.6,
          ry: big ? 2.6 + r() * 1.5 : 1 + r() * 1,
          fill: big ? U('bk-butter') : fill === 'wetCrumbs' ? '#efdcb0' : '#f6e7c0',
          stroke: big ? '#e2c066' : 'none',
          'stroke-width': 0.4,
        }),
      );
    }
    if (fill === 'wetCrumbs') parts.push(surface('#ffffff', { 'fill-opacity': 0.35 * (1 - k) }));
  } else if (fill === 'dough') {
    // From shaggy wet crumbs to one soft ball.
    const lump = [];
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2;
      const rr = (0.5 + 0.35 * k) * (0.9 + r() * 0.2);
      lump.push(`${cx + Math.cos(a) * rx * rr} ${y - ry * 0.6 * k + Math.sin(a) * ry * rr * 1.6}`);
    }
    parts.push(surface('#f1e2bd'));
    parts.push(
      P(`M ${lump.join(' L ')} Z`, {
        fill: U('bk-dough'),
        stroke: C.doughEdge,
        'stroke-width': 0.8,
        'stroke-linejoin': 'round',
        'fill-opacity': 0.4 + 0.6 * k,
      }),
    );
    for (let i = 0; i < Math.round(18 * (1 - k)); i++)
      parts.push(
        s('circle', {
          cx: cx + (r() - 0.5) * rx * 1.5,
          cy: y + (r() - 0.5) * ry * 1.2,
          r: 1 + r() * 1.5,
          fill: '#f6e7c0',
          stroke: '#dcc38c',
          'stroke-width': 0.3,
        }),
      );
  } else if (fill === 'berries') {
    parts.push(surface(`rgba(200,30,50,${0.25 + 0.5 * k})`));
    for (let i = 0; i < 16; i++) {
      const a = r() * Math.PI * 2;
      const d = Math.sqrt(r()) * 0.8;
      parts.push(berrySlice(cx + Math.cos(a) * rx * d, y + Math.sin(a) * ry * d - 1, 4.5 + r() * 1.5, r() * 360));
    }
    if (k2 > 0)
      for (let i = 0; i < 18 * k2; i++)
        parts.push(
          s('circle', { cx: cx + (r() - 0.5) * rx * 1.4, cy: y + (r() - 0.5) * ry, r: 0.7, fill: '#ffffff', 'fill-opacity': 0.9 * (1 - k) }),
        );
    parts.push(s('ellipse', { cx: cx - rx * 0.3, cy: y - ry * 0.3, rx: rx * 0.3, ry: ry * 0.18, fill: '#ffffff', 'fill-opacity': 0.25 * k }));
    if (k > 0) parts.push(...swirlMarks('#ffffff', 0.25));
  } else if (fill === 'milk' || fill === 'cream') {
    parts.push(surface(U('bk-milk')));
    if (k2 > 0)
      parts.push(
        s('ellipse', { cx: cx + rx * 0.2, cy: y, rx: rx * 0.12, ry: ry * 0.18, fill: '#7a4a2a', 'fill-opacity': 0.5 * k2, filter: U('bk-blur-sm') }),
      );
    parts.push(s('ellipse', { cx: cx - rx * 0.35, cy: y - ry * 0.25, rx: rx * 0.25, ry: ry * 0.15, fill: '#ffffff', 'fill-opacity': 0.9 }));
  } else if (fill === 'whipped') {
    // Thin cream thickening into soft peaks.
    parts.push(surface(mix('#f7f9fb', '#fffaf0', k)));
    const peaks = Math.round(9 * k);
    for (let i = 0; i < peaks; i++) {
      const px = cx + (r() - 0.5) * rx * 1.3;
      const py = y + (r() - 0.5) * ry * 0.9;
      const ph = 3 + 7 * k * (0.6 + r() * 0.4);
      parts.push(
        P(
          `M ${px - 6} ${py + 2} Q ${px - 2} ${py - ph} ${px + 1} ${py - ph * 0.8} Q ${px + 3} ${py - ph * 0.5} ${px + 2} ${py - ph * 0.3} Q ${px + 5} ${py - 1} ${px + 6} ${py + 2} Z`,
          { fill: U('bk-cream'), stroke: C.creamShade, 'stroke-width': 0.4 },
        ),
      );
    }
    parts.push(...swirlMarks(C.creamShade, 0.7));
  }
  return g({}, parts);
}

// ------------------------------------------------------------------ butter
// A block of cold butter on its paper, cut along the first `cuts` of n lines;
// sep (0..1) opens each cut into a gap.
export function butterBlock(x, y, w, h, n, cuts, sep = []) {
  const parts = [shadow(x + w / 2, y + h + 3, w * 0.55, 5, 0.3)];
  parts.push(
    P(`M ${x - 14} ${y + h + 4} L ${x - 6} ${y - 6} L ${x + w + 8} ${y - 4} L ${x + w + 16} ${y + h + 5} Z`, {
      fill: U('bk-foil'),
      stroke: '#c6cdd7',
      'stroke-width': 0.6,
    }),
  );
  const edges = [0];
  for (let i = 0; i < n; i++) edges.push(((i + 1) * w) / (n + 1));
  edges.push(w);
  let shift = 0;
  for (let i = 0; i <= n; i++) {
    if (i > 0 && cuts.includes(i - 1)) shift += 5 * (sep[i - 1] ?? 1);
    const px = x + edges[i] + shift;
    const pw = edges[i + 1] - edges[i];
    parts.push(s('rect', { x: px, y, width: pw, height: h, rx: 3, fill: U('bk-butter'), stroke: '#e0bd55', 'stroke-width': 0.8 }));
    parts.push(s('rect', { x: px + 2, y: y + 2, width: pw - 4, height: 3, rx: 1.5, fill: '#fffbe0', 'fill-opacity': 0.8 }));
    if (i < n && !cuts.includes(i))
      parts.push(
        s('line', {
          x1: px + pw,
          y1: y + 4,
          x2: px + pw,
          y2: y + h - 4,
          stroke: '#d9b54e',
          'stroke-opacity': 0.5,
          'stroke-width': 0.8,
          'stroke-dasharray': '3 3',
        }),
      );
  }
  return g({}, parts);
}

// ------------------------------------------------------------------- tools
// The tools in the hand; (x, y) is where they touch, angle in degrees.
export function knife(x, y, angle = -15) {
  return g({ transform: `rotate(${angle} ${x} ${y})`, class: 'bk-hand' }, [
    P(`M ${x - 6} ${y} L ${x + 50} ${y - 7} L ${x + 50} ${y + 2} L ${x + 2} ${y + 3} Z`, {
      fill: U('bk-metalV'),
      stroke: '#8d96a3',
      'stroke-width': 0.6,
    }),
    P(`M ${x - 4} ${y + 1.6} L ${x + 50} ${y + 1.2}`, { stroke: '#ffffff', 'stroke-width': 0.8, 'stroke-opacity': 0.9 }),
    s('rect', { x: x + 50, y: y - 8, width: 32, height: 11, rx: 4, fill: U('bk-handle') }),
    s('circle', { cx: x + 58, cy: y - 2.5, r: 1.3, fill: '#d7dce3' }),
    s('circle', { cx: x + 72, cy: y - 2.5, r: 1.3, fill: '#d7dce3' }),
  ]);
}
export function whisk(x, y, angle = 20) {
  const loops = [];
  for (let i = 0; i < 4; i++)
    loops.push(s('ellipse', { cx: x, cy: y - 16, rx: 4 + i * 2.6, ry: 18, fill: 'none', stroke: '#b9c1cc', 'stroke-width': 0.9 }));
  return g({ transform: `rotate(${angle} ${x} ${y})`, class: 'bk-hand' }, [
    ...loops,
    s('rect', { x: x - 3.5, y: y - 62, width: 7, height: 30, rx: 3.5, fill: U('bk-handle') }),
  ]);
}
export function fork(x, y, angle = 20) {
  const tines = [-4.5, -1.5, 1.5, 4.5].map((dx) => s('rect', { x: x + dx - 0.8, y: y - 14, width: 1.6, height: 14, rx: 0.8, fill: '#c9d0da' }));
  return g({ transform: `rotate(${angle} ${x} ${y})`, class: 'bk-hand' }, [
    ...tines,
    P(`M ${x - 5.5} ${y - 14} Q ${x} ${y - 24} ${x + 5.5} ${y - 14} Z`, { fill: '#c9d0da' }),
    s('rect', { x: x - 2.2, y: y - 50, width: 4.4, height: 30, rx: 2.2, fill: U('bk-metal') }),
  ]);
}
export function spoon(x, y, angle = 0, heap = null) {
  return g({ transform: `rotate(${angle} ${x} ${y})`, class: 'bk-hand' }, [
    s('ellipse', { cx: x, cy: y, rx: 9, ry: 5.5, fill: U('bk-metalV'), stroke: '#8d96a3', 'stroke-width': 0.6 }),
    heap ? s('ellipse', { cx: x, cy: y - 1.5, rx: 7.5, ry: 3.6, fill: heap }) : null,
    s('rect', { x: x + 8, y: y - 2, width: 34, height: 4, rx: 2, fill: U('bk-metal') }),
  ]);
}
// A flat hand from above, fingers up (patting the dough): press squashes it
// down a little.
export function hand(x, y, press = 0) {
  const oy = y + 20;
  const finger = (dx, len, w, rot) =>
    s('rect', {
      x: x + dx - w / 2,
      y: y - 6 - len,
      width: w,
      height: len + 8,
      rx: w / 2,
      fill: U('bk-skin'),
      stroke: '#d59f7f',
      'stroke-width': 0.7,
      transform: `rotate(${rot} ${x + dx} ${y - 2})`,
    });
  return g({ transform: `translate(0 ${press * 8}) translate(${x} ${oy}) scale(1 ${1 - press * 0.12}) translate(${-x} ${-oy})`, class: 'bk-hand' }, [
    shadow(x, y + 22 - press * 6, 24, 5, 0.18 + press * 0.15),
    finger(-12, 16, 7.5, -8),
    finger(-4, 20, 8, -3),
    finger(4.5, 19, 8, 2),
    finger(12.5, 14, 7, 8),
    s('rect', { x: x - 17, y: y - 6, width: 34, height: 28, rx: 12, fill: U('bk-skin'), stroke: '#d59f7f', 'stroke-width': 0.8 }),
    s('rect', {
      x: x - 26,
      y: y + 2,
      width: 18,
      height: 8,
      rx: 4,
      fill: U('bk-skin'),
      stroke: '#d59f7f',
      'stroke-width': 0.7,
      transform: `rotate(-35 ${x - 14} ${y + 8})`,
    }),
    s('rect', { x: x - 15, y: y - 4, width: 30, height: 6, rx: 3, fill: U('bk-skin') }),
    s('ellipse', { cx: x - 4, cy: y + 6, rx: 8, ry: 5, fill: '#ffffff', 'fill-opacity': 0.18 }),
  ]);
}
export function brush(x, y, angle = -20) {
  const bristles = [];
  for (let i = 0; i < 7; i++)
    bristles.push(s('line', { x1: x - 6 + i * 2, y1: y - 10, x2: x - 7 + i * 2.2, y2: y + 2, stroke: '#f3e2b8', 'stroke-width': 1.4 }));
  return g({ transform: `rotate(${angle} ${x} ${y})`, class: 'bk-hand' }, [
    ...bristles,
    s('rect', { x: x - 8, y: y - 16, width: 16, height: 7, rx: 2, fill: U('bk-metal') }),
    s('rect', { x: x - 3.5, y: y - 50, width: 7, height: 35, rx: 3.5, fill: U('bk-handle') }),
  ]);
}
export function shaker(x, y, angle = 0) {
  return g({ transform: `rotate(${angle} ${x} ${y})`, class: 'bk-hand' }, [
    s('rect', { x: x - 11, y: y - 30, width: 22, height: 32, rx: 7, fill: '#ffffff', 'fill-opacity': 0.7, stroke: '#c9d3df', 'stroke-width': 0.8 }),
    s('rect', { x: x - 9, y: y - 14, width: 18, height: 14, rx: 5, fill: '#ffffff' }),
    P(`M ${x - 11} ${y - 30} Q ${x} ${y - 44} ${x + 11} ${y - 30} Z`, { fill: U('bk-metalV') }),
    ...[-4, 0, 4].map((dx) => s('circle', { cx: x + dx, cy: y - 35, r: 0.9, fill: '#6f7884' })),
  ]);
}
// A round fluted cutter, pressed down by `press`.
export function cutter(x, y, press = 0) {
  const flutes = [];
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    flutes.push(`${x + Math.cos(a) * 17} ${y - press * 0 + Math.sin(a) * 9.5}`, `${x + Math.cos(a + 0.2) * 15.5} ${y + Math.sin(a + 0.2) * 8.6}`);
  }
  const lift = (1 - press) * 10;
  return g({ transform: `translate(0 ${-lift})`, class: 'bk-hand' }, [
    shadow(x, y + lift + 4, 16, 4, 0.25 * (1 - press * 0.6)),
    s('rect', { x: x - 17, y: y - 8, width: 34, height: 8, fill: U('bk-metal') }),
    P(`M ${flutes.join(' L ')} Z`, { fill: 'none', stroke: '#9aa4b1', 'stroke-width': 1.2 }),
    s('ellipse', { cx: x, cy: y - 8, rx: 17, ry: 9.5, fill: 'none', stroke: '#e8ecf1', 'stroke-width': 1.2 }),
  ]);
}

// The jars a spoon dips into (the tap target with its spoon).
export function jar(kind, x, y, label, { k = 0 } = {}) {
  const parts = [shadow(x, y + 30, 22, 4, 0.3)];
  if (kind === 'vanilla') {
    parts.push(s('rect', { x: x - 9, y: y - 12, width: 18, height: 42, rx: 4, fill: '#6b3a1e', 'fill-opacity': 0.9, stroke: '#4a2814' }));
    parts.push(s('rect', { x: x - 5, y: y - 24, width: 10, height: 13, rx: 2, fill: '#2a2a2a' }));
    parts.push(s('rect', { x: x - 8, y: y + 2, width: 16, height: 14, rx: 2, fill: '#f6eedd' }));
    parts.push(text(x, y + 11.5, 'V', { size: 8, fill: '#6b3a1e' }));
  } else {
    const tint = { sugar: '#ffffff', bakingPowder: '#f4f1ea', salt: '#f8fbff' }[kind] || '#ffffff';
    const lid = { sugar: '#e2a29d', bakingPowder: '#e57373', salt: '#6f9be0' }[kind] || '#e2a29d';
    parts.push(
      s('rect', {
        x: x - 22,
        y: y - 12,
        width: 44,
        height: 42,
        rx: 9,
        fill: '#eef4f8',
        'fill-opacity': 0.75,
        stroke: '#c9d3df',
        'stroke-width': 0.8,
      }),
    );
    parts.push(s('rect', { x: x - 19, y: y + 4, width: 38, height: 24, rx: 6, fill: tint }));
    for (let i = 0; i < 10; i++) parts.push(s('circle', { cx: x - 15 + ((i * 37) % 30), cy: y + 7 + ((i * 17) % 18), r: 0.6, fill: '#d9dee5' }));
    parts.push(s('rect', { x: x - 24, y: y - 16, width: 48, height: 8, rx: 3, fill: lid }));
    parts.push(s('rect', { x: x - 21, y: y - 15, width: 18, height: 2, rx: 1, fill: '#ffffff', 'fill-opacity': 0.5 }));
    parts.push(s('rect', { x: x - 14, y: y - 4, width: 28, height: 10, rx: 2, fill: '#fffaf0', stroke: '#e6d6c4', 'stroke-width': 0.5 }));
  }
  // The spoon rests in the jar (the screen draws it while it carries).
  if (!k) parts.push(spoon(x + 14, y - 22, -140));
  parts.push(text(x, y + 46, label, { size: 10 }));
  return g({ 'data-k': 'tool', class: 'bk-tool' }, parts);
}

// ------------------------------------------------------- things to pour
// A bag, jug or carton; tilt in degrees. mouth() says where it pours from.
export function pourer(kind, x, y, tilt, label) {
  const parts = [];
  if (kind === 'bag') {
    parts.push(
      P(`M ${x - 22} ${y - 30} L ${x + 22} ${y - 30} L ${x + 26} ${y + 34} L ${x - 26} ${y + 34} Z`, {
        fill: '#f6efe0',
        stroke: '#d8c9ae',
        'stroke-width': 0.8,
      }),
    );
    parts.push(
      P(`M ${x - 22} ${y - 30} L ${x - 14} ${y - 38} L ${x + 14} ${y - 38} L ${x + 22} ${y - 30}`, {
        fill: '#ece2cc',
        stroke: '#d8c9ae',
        'stroke-width': 0.8,
      }),
    );
    parts.push(s('rect', { x: x - 18, y: y - 6, width: 36, height: 22, rx: 3, fill: '#6f9be0' }));
    parts.push(text(x, y + 3, 'FLOUR', { size: 6.5, fill: '#ffffff' }));
    parts.push(P(`M ${x - 6} ${y + 13} q 6 -6 12 0`, { fill: 'none', stroke: '#f2d58a', 'stroke-width': 1.2 }));
    parts.push(P(`M ${x - 22} ${y - 30} L ${x - 25} ${y + 30}`, { stroke: '#ffffff', 'stroke-width': 1.5, 'stroke-opacity': 0.6 }));
  } else if (kind === 'jug') {
    parts.push(
      P(
        `M ${x - 20} ${y - 28} L ${x + 16} ${y - 28} L ${x + 24} ${y - 35} L ${x + 21} ${y - 24} L ${x + 21} ${y + 30} Q ${x + 21} ${y + 34} ${x + 17} ${y + 34} L ${x - 16} ${y + 34} Q ${x - 20} ${y + 34} ${x - 20} ${y + 30} Z`,
        { fill: '#ffffff', 'fill-opacity': 0.45, stroke: '#aab6c4', 'stroke-width': 1 },
      ),
    );
    parts.push(s('rect', { x: x - 18, y: y - 4, width: 37, height: 36, rx: 3, fill: U('bk-milk') }));
    for (let i = 0; i < 4; i++)
      parts.push(s('line', { x1: x + 8, y1: y - 18 + i * 12, x2: x + 18, y2: y - 18 + i * 12, stroke: '#7d8ea3', 'stroke-width': 0.8 }));
    parts.push(
      P(`M ${x - 20} ${y - 18} C ${x - 38} ${y - 16} ${x - 38} ${y + 10} ${x - 20} ${y + 14}`, {
        fill: 'none',
        stroke: '#aab6c4',
        'stroke-width': 3,
      }),
    );
    parts.push(P(`M ${x - 15} ${y - 24} L ${x - 15} ${y + 28}`, { stroke: '#ffffff', 'stroke-width': 2, 'stroke-opacity': 0.7 }));
  } else {
    parts.push(s('rect', { x: x - 18, y: y - 22, width: 36, height: 56, rx: 2, fill: '#ffffff', stroke: '#cfd8e6', 'stroke-width': 0.8 }));
    parts.push(P(`M ${x - 18} ${y - 22} L ${x} ${y - 38} L ${x + 18} ${y - 22} Z`, { fill: '#f1f5fa', stroke: '#cfd8e6', 'stroke-width': 0.8 }));
    parts.push(s('rect', { x: x - 3, y: y - 44, width: 6, height: 8, fill: '#f1f5fa', stroke: '#cfd8e6', 'stroke-width': 0.6 }));
    parts.push(s('rect', { x: x - 18, y: y - 4, width: 36, height: 20, fill: '#6f9be0' }));
    parts.push(text(x, y + 9, 'CREAM', { size: 6.5, fill: '#ffffff' }));
    parts.push(s('rect', { x: x - 16, y: y - 20, width: 4, height: 50, fill: '#ffffff', 'fill-opacity': 0.6 }));
  }
  return g({ 'data-k': 'source', class: 'bk-tool' }, [
    shadow(x, y + 36, 24, 4, tilt ? 0.12 : 0.3),
    g({ transform: `rotate(${tilt} ${x} ${y})` }, parts),
    text(x, y + 52, label, { size: 10 }),
  ]);
}
export function mouth(kind, x, y, tilt) {
  const [mx, my] = kind === 'bag' ? [x + 18, y - 34] : kind === 'jug' ? [x + 24, y - 35] : [x, y - 44];
  const a = (tilt * Math.PI) / 180;
  const dx = mx - x;
  const dy = my - y;
  return { x: x + dx * Math.cos(a) - dy * Math.sin(a), y: y + dx * Math.sin(a) + dy * Math.cos(a) };
}

// A kitchen scale (or jug mark) display: the amount, and the target mark.
export function readout(x, y, value, unit, target, tolerance) {
  const ok = Math.abs(value - target) <= tolerance;
  return g({ class: 'bk-readout', 'data-value': Math.round(value) }, [
    shadow(x, y + 16, 44, 4, 0.18),
    s('rect', { x: x - 48, y: y - 18, width: 96, height: 32, rx: 9, fill: '#3a3238', stroke: ok ? '#9bd774' : '#6a5e66', 'stroke-width': 2 }),
    text(x, y + 5, `${Math.round(value)} ${unit}`, { size: 17, fill: ok ? '#b7f08d' : '#ffd38a', family: 'ui-monospace, Consolas, monospace' }),
    text(x, y + 30, `${target} ${unit}`, { size: 10, fill: '#8a776c', weight: 'normal' }),
  ]);
}
// The scale under the flour bowl.
export const scalePad = (cx, y) =>
  g({}, [
    shadow(cx, y + 12, 86, 5, 0.3),
    s('rect', { x: cx - 84, y, width: 168, height: 12, rx: 5, fill: U('bk-metal'), stroke: '#9aa4b1', 'stroke-width': 0.6 }),
    s('rect', { x: cx - 20, y: y + 3, width: 40, height: 6, rx: 2, fill: '#3a3238' }),
  ]);

// --------------------------------------------------------------- the dough
// A slab of dough on the board: spread 0..1 from a ball to 2 cm thick; holes
// are cut rounds (where the cutter went).
export function doughSlab(cx, cy, spread, holes = []) {
  const rx = 50 + 80 * spread;
  const ry = 26 + 14 * spread;
  const thick = 16 - 9 * spread;
  const r = rng(5);
  const edge = [];
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    const j = 0.94 + r() * 0.08;
    edge.push(`${cx + Math.cos(a) * rx * j} ${cy + Math.sin(a) * ry * j}`);
  }
  const parts = [shadow(cx, cy + ry * 0.7 + thick, rx * 0.95, 6, 0.35)];
  parts.push(s('ellipse', { cx, cy: cy + thick * 0.6, rx: rx * 0.99, ry: ry * 0.95, fill: '#dcc18a' }));
  parts.push(P(`M ${edge.join(' L ')} Z`, { fill: U('bk-dough'), stroke: C.doughEdge, 'stroke-width': 0.8, 'stroke-linejoin': 'round' }));
  for (let i = 0; i < 14; i++)
    parts.push(s('circle', { cx: cx + (r() - 0.5) * rx * 1.4, cy: cy + (r() - 0.5) * ry * 1.2, r: 0.9, fill: '#e3c993', 'fill-opacity': 0.7 }));
  for (const h of holes) parts.push(s('ellipse', { cx: h.cx, cy: h.cy, rx: 15, ry: 8.5, fill: '#cba86d', stroke: '#b99258', 'stroke-width': 0.6 }));
  parts.push(s('ellipse', { cx: cx - rx * 0.3, cy: cy - ry * 0.35, rx: rx * 0.35, ry: ry * 0.18, fill: '#ffffff', 'fill-opacity': 0.25 }));
  return g({ 'data-k': 'tool' }, parts);
}

// A biscuit from a little above: raw to golden (bake), risen (rise), with a
// milk shine and a sugar sparkle; split shows the two halves apart.
export function biscuit(cx, cy, r, { bake = 0, rise = 0, shine = 0, sugar = 0, split = 0, seed = 1, k = null, i = null } = {}) {
  const ry = r * 0.56;
  const side = r * (0.42 + 0.38 * rise);
  const rr = rng(seed);
  const one = (x, y, top) => {
    const parts = [
      shadow(x, y + side + ry * 0.4, r * 1.02, ry * 0.45, 0.32),
      P(`M ${x - r} ${y} L ${x - r * 0.98} ${y + side} A ${r * 0.98} ${ry} 0 0 0 ${x + r * 0.98} ${y + side} L ${x + r} ${y} Z`, {
        fill: U('bk-side'),
      }),
      P(`M ${x - r} ${y} L ${x - r * 0.98} ${y + side} A ${r * 0.98} ${ry} 0 0 0 ${x + r * 0.98} ${y + side} L ${x + r} ${y} Z`, {
        fill: U('bk-sideBaked'),
        'fill-opacity': bake * 0.9,
      }),
    ];
    // Flaky layers along the side.
    for (let l = 1; l < 3; l++)
      parts.push(
        P(`M ${x - r * 0.97} ${y + (side * l) / 3} A ${r * 0.97} ${ry} 0 0 0 ${x + r * 0.97} ${y + (side * l) / 3}`, {
          fill: 'none',
          stroke: '#8a5630',
          'stroke-opacity': 0.12 + bake * 0.12,
          'stroke-width': 0.6,
        }),
      );
    if (top) {
      parts.push(s('ellipse', { cx: x, cy: y, rx: r, ry, fill: U('bk-dough') }));
      parts.push(s('ellipse', { cx: x, cy: y, rx: r, ry, fill: U('bk-golden'), 'fill-opacity': bake }));
      for (let f = 0; f < 7; f++)
        parts.push(
          s('circle', {
            cx: x + (rr() - 0.5) * r * 1.4,
            cy: y + (rr() - 0.5) * ry * 1.2,
            r: 0.6 + rr() * 0.7,
            fill: '#7a4a20',
            'fill-opacity': bake * 0.35,
          }),
        );
      if (shine)
        parts.push(s('ellipse', { cx: x - r * 0.25, cy: y - ry * 0.3, rx: r * 0.45, ry: ry * 0.35, fill: '#ffffff', 'fill-opacity': 0.35 * shine }));
      if (sugar)
        for (let f = 0; f < 9; f++)
          parts.push(
            s('circle', { cx: x + (rr() - 0.5) * r * 1.3, cy: y + (rr() - 0.5) * ry * 1.1, r: 0.7, fill: '#ffffff', 'fill-opacity': 0.95 * sugar }),
          );
    } else {
      // The inside: soft crumb.
      parts.push(s('ellipse', { cx: x, cy: y, rx: r, ry, fill: '#f8e8c6', stroke: '#e1c38c', 'stroke-width': 0.6 }));
      for (let f = 0; f < 10; f++)
        parts.push(s('circle', { cx: x + (rr() - 0.5) * r * 1.3, cy: y + (rr() - 0.5) * ry * 1.1, r: 0.8, fill: '#e6cf9f' }));
    }
    return parts;
  };
  if (!split) return g(k ? { 'data-k': k, 'data-i': i } : {}, one(cx, cy - side, true));
  // Split: the top half lifts off and settles beside, face up.
  const tx = cx + r * 1.25 * split;
  const ty = cy - side - r * 0.9 * Math.sin(split * Math.PI) - side * 0.2;
  return g(k ? { 'data-k': k, 'data-i': i } : {}, [...one(cx - r * 0.6 * split, cy - side * 0.55, false), ...one(tx, ty, split < 0.6)]);
}
const BISCUIT_AT = [0, 1, 2, 3, 4, 5].map((i) => ({ dx: 22 + (i % 3) * 38, dy: 20 + Math.floor(i / 3) * 26 }));
// A baking tray on parchment, with up to six biscuits.
export function tray(x, y, look = {}, { k = null, n = 6 } = {}) {
  const parts = [shadow(x + 60, y + 66, 64, 6, 0.35)];
  parts.push(s('rect', { x, y, width: 120, height: 64, rx: 6, fill: U('bk-metal'), stroke: '#8d96a3', 'stroke-width': 0.8 }));
  parts.push(
    P(`M ${x + 6} ${y + 5} L ${x + 114} ${y + 4} L ${x + 115} ${y + 59} L ${x + 5} ${y + 60} Z`, {
      fill: '#f7efdc',
      stroke: '#e6d8bb',
      'stroke-width': 0.5,
    }),
  );
  for (let i = 0; i < n; i++) parts.push(biscuit(x + BISCUIT_AT[i].dx, y + BISCUIT_AT[i].dy, 11.5, { ...look, seed: i + 3 }));
  return g(k ? { 'data-k': k, 'data-i': 'tray' } : {}, parts);
}
export function rack(x, y, w) {
  const parts = [shadow(x + w / 2, y + 10, w / 2, 4, 0.25)];
  for (let i = 0; i <= 12; i++)
    parts.push(s('line', { x1: x + (i * w) / 12, y1: y - 4, x2: x + (i * w) / 12, y2: y + 6, stroke: '#9aa4b1', 'stroke-width': 0.9 }));
  parts.push(s('rect', { x, y: y - 5, width: w, height: 12, rx: 3, fill: 'none', stroke: '#8d96a3', 'stroke-width': 1.4 }));
  return g({}, parts);
}

// --------------------------------------------------------------- the oven
// The knob sits at (x + KNOB.dx, y + KNOB.dy).
export const KNOB = { dx: 136, dy: 26 };
export const OVEN_W = 170;
export function oven(x, y, { glow = 0, inside = null, display = '', knobAngle = -135, door = 0 } = {}) {
  const w = OVEN_W;
  const h = 172;
  const kx = x + KNOB.dx;
  const ky = y + KNOB.dy;
  const parts = [shadow(x + w / 2, y + h + 2, w * 0.52, 6, 0.45)];
  parts.push(s('rect', { x, y, width: w, height: h, rx: 12, fill: U('bk-oven'), stroke: C.ovenDark, 'stroke-width': 1.2 }));
  parts.push(s('rect', { x: x + 4, y: y + 3, width: w - 8, height: 4, rx: 2, fill: '#ffffff', 'fill-opacity': 0.45 }));
  // Control panel: a little display and the knob with its marks.
  parts.push(s('rect', { x: x + 8, y: y + 9, width: w - 16, height: 36, rx: 7, fill: '#fbe4e1', stroke: '#e6bbb6', 'stroke-width': 0.6 }));
  parts.push(s('rect', { x: x + 16, y: y + 16, width: 74, height: 22, rx: 4, fill: '#2f282d' }));
  parts.push(text(x + 53, y + 32, display, { size: 13, fill: '#ffb35c', family: 'ui-monospace, Consolas, monospace' }));
  for (let i = 0; i <= 9; i++) {
    const a = ((-135 + i * 30) * Math.PI) / 180;
    parts.push(
      s('line', {
        x1: kx + Math.sin(a) * 16,
        y1: ky - Math.cos(a) * 16,
        x2: kx + Math.sin(a) * 19,
        y2: ky - Math.cos(a) * 19,
        stroke: '#b9817b',
        'stroke-width': 0.8,
      }),
    );
  }
  parts.push(
    g({ 'data-k': 'knob', class: 'bk-knob' }, [
      s('circle', { cx: kx, cy: ky + 1.5, r: 14, fill: 'rgba(80,30,30,0.25)', filter: U('bk-blur-sm') }),
      s('circle', { cx: kx, cy: ky, r: 13.5, fill: U('bk-metalV'), stroke: '#9aa4b1', 'stroke-width': 0.8 }),
      s('circle', { cx: kx, cy: ky, r: 9.5, fill: '#fbfbfc' }),
      s('rect', { x: kx - 1.6, y: ky - 12, width: 3.2, height: 10, rx: 1.6, fill: '#c2414f', transform: `rotate(${knobAngle} ${kx} ${ky})` }),
    ]),
  );
  // The handle, then the door with its window.
  parts.push(s('rect', { x: x + 26, y: y + 52, width: w - 52, height: 6, rx: 3, fill: U('bk-metal'), stroke: '#9aa4b1', 'stroke-width': 0.5 }));
  const wx = x + 18;
  const wy = y + 64;
  const ww = w - 36;
  const wh = h - 84;
  parts.push(s('rect', { x: wx - 4, y: wy - 4, width: ww + 8, height: wh + 8, rx: 10, fill: '#efc3be', stroke: C.ovenDark, 'stroke-width': 0.8 }));
  parts.push(s('rect', { x: wx, y: wy, width: ww, height: wh, rx: 7, fill: U('bk-glass'), 'data-k': 'door' }));
  if (glow > 0) parts.push(s('rect', { x: wx, y: wy, width: ww, height: wh, rx: 7, fill: U('bk-ovenGlow'), opacity: glow }));
  parts.push(s('line', { x1: wx + 8, y1: wy + wh * 0.62, x2: wx + ww - 8, y2: wy + wh * 0.62, stroke: '#7a6a72', 'stroke-width': 1, opacity: 0.8 }));
  if (inside) parts.push(inside);
  // The glass: a reflection band (the door, when open, lifts away).
  parts.push(
    P(`M ${wx + 10} ${wy} L ${wx + 34} ${wy} L ${wx + 14} ${wy + wh} L ${wx - 10} ${wy + wh} Z`, {
      fill: '#ffffff',
      'fill-opacity': 0.08 * (1 - door),
    }),
  );
  parts.push(s('rect', { x: wx, y: wy, width: ww, height: wh, rx: 7, fill: 'none', stroke: '#1d151a', 'stroke-width': 1.2 }));
  parts.push(s('rect', { x: x + 14, y: y + h - 2, width: 14, height: 5, rx: 2, fill: '#8a5a52' }));
  parts.push(s('rect', { x: x + w - 28, y: y + h - 2, width: 14, height: 5, rx: 2, fill: '#8a5a52' }));
  return g({}, parts);
}
export const ovenWindow = (x, y) => ({ x: x + 18, y: y + 64, w: OVEN_W - 36, h: 172 - 84 });

// --------------------------------------------------------------- the cake
export function plate(cx, cy, w) {
  return g({ 'data-k': 'plate' }, [
    shadow(cx, cy + 5, w * 0.48, w * 0.06, 0.35),
    s('ellipse', { cx, cy, rx: w / 2, ry: w * 0.16, fill: U('bk-plate'), stroke: '#d9cfc2', 'stroke-width': 0.8 }),
    s('ellipse', { cx, cy: cy + 1, rx: w * 0.33, ry: w * 0.1, fill: '#f3eee6', stroke: '#e5ddd1', 'stroke-width': 0.8 }),
    P(`M ${cx - w * 0.42} ${cy - w * 0.05} Q ${cx - w * 0.2} ${cy - w * 0.15} ${cx + w * 0.1} ${cy - w * 0.14}`, {
      fill: 'none',
      stroke: '#ffffff',
      'stroke-width': 1.5,
    }),
  ]);
}
// The shortcake from the bottom up: `layers` (0..6) are on; the last one
// drops in by `drop` (0 = just let go, high above; 1 = settled).
export function shortcake(cx, base, layers, scale = 1, drop = 1) {
  const k = scale;
  const parts = [];
  let y = base;
  const bottom = () => {
    const sh = 15 * k;
    parts.push(shadow(cx, y + 1, 42 * k, 5 * k, 0.3));
    parts.push(
      P(
        `M ${cx - 42 * k} ${y - 3 * k} L ${cx - 41 * k} ${y - sh} A ${41 * k} ${9 * k} 0 0 0 ${cx + 41 * k} ${y - sh} L ${cx + 42 * k} ${y - 3 * k} A ${42 * k} ${9 * k} 0 0 1 ${cx - 42 * k} ${y - 3 * k} Z`,
        { fill: U('bk-sideBaked') },
      ),
    );
    parts.push(s('ellipse', { cx, cy: y - sh, rx: 41 * k, ry: 9 * k, fill: '#f8e8c6', stroke: '#e1c38c', 'stroke-width': 0.6 }));
    y -= sh;
  };
  const berries = () => {
    const r = rng(31);
    for (let i = 0; i < 9; i++) {
      const a = Math.PI + (i / 8) * Math.PI;
      parts.push(berrySlice(cx + Math.cos(a) * 34 * k, y - 3 * k + Math.sin(a) * -4 * k, 7.5 * k, (r() - 0.5) * 60));
    }
    for (let i = 0; i < 4; i++)
      parts.push(
        P(`M ${cx - 30 * k + i * 19 * k} ${y + 2 * k} q ${1.5 * k} ${5 * k} 0 ${7 * k}`, {
          fill: 'none',
          stroke: '#c42638',
          'stroke-opacity': 0.55,
          'stroke-width': 2 * k,
          'stroke-linecap': 'round',
        }),
      );
    y -= 8 * k;
  };
  const cream = (w, peaks) => {
    const pts = [];
    for (let i = 0; i <= peaks; i++) {
      const px = cx - w * k + (i * 2 * w * k) / peaks;
      pts.push(`Q ${px - (w * k) / peaks} ${y - 15 * k} ${px} ${y - 5 * k}`);
    }
    parts.push(
      P(`M ${cx - w * k} ${y + 3 * k} ${pts.join(' ')} L ${cx + w * k} ${y + 3 * k} Q ${cx} ${y + 7 * k} ${cx - w * k} ${y + 3 * k} Z`, {
        fill: U('bk-cream'),
        stroke: C.creamShade,
        'stroke-width': 0.6,
      }),
    );
    y -= 10 * k;
  };
  const top = () => {
    parts.push(
      P(
        `M ${cx - 40 * k} ${y + 2 * k} C ${cx - 43 * k} ${y - 22 * k} ${cx - 18 * k} ${y - 30 * k} ${cx} ${y - 30 * k} C ${cx + 18 * k} ${y - 30 * k} ${cx + 43 * k} ${y - 22 * k} ${cx + 40 * k} ${y + 2 * k} Q ${cx} ${y + 6 * k} ${cx - 40 * k} ${y + 2 * k} Z`,
        { fill: U('bk-golden'), stroke: C.crust, 'stroke-width': 0.7 },
      ),
    );
    const r = rng(41);
    for (let i = 0; i < 10; i++)
      parts.push(s('circle', { cx: cx + (r() - 0.5) * 60 * k, cy: y - 10 * k - r() * 14 * k, r: 0.8 * k, fill: '#ffffff', 'fill-opacity': 0.9 }));
    parts.push(
      P(`M ${cx - 20 * k} ${y - 22 * k} q ${8 * k} ${-6 * k} ${18 * k} ${-4 * k}`, {
        fill: 'none',
        stroke: '#fff3d0',
        'stroke-width': 1.6 * k,
        'stroke-opacity': 0.7,
      }),
    );
    y -= 26 * k;
  };
  const dollop = () => {
    parts.push(
      P(
        `M ${cx - 16 * k} ${y + 4 * k} Q ${cx - 18 * k} ${y - 6 * k} ${cx - 6 * k} ${y - 8 * k} Q ${cx - 4 * k} ${y - 16 * k} ${cx + 4 * k} ${y - 13 * k} Q ${cx + 16 * k} ${y - 10 * k} ${cx + 16 * k} ${y + 4 * k} Z`,
        { fill: U('bk-cream'), stroke: C.creamShade, 'stroke-width': 0.6 },
      ),
    );
    y -= 12 * k;
  };
  const steps = [bottom, berries, () => cream(43, 7), top, dollop, () => parts.push(strawberry(cx + 1 * k, y - 6 * k, 9 * k, { rot: 8 }))];
  steps.slice(0, layers).forEach((f, i) => {
    const before = parts.length;
    f();
    if (i === layers - 1 && drop < 1) {
      const added = parts.splice(before);
      parts.push(g({ transform: `translate(0 ${-(1 - drop) * 40 * k})`, opacity: Math.min(1, 0.4 + drop) }, added));
    }
  });
  return g({}, parts);
}

// The things to stack, as round chips to drag.
export function chip(id, cx, cy) {
  if (id === 'tray') return tray(cx - 60, cy - 32, {}, { k: 'item' });
  const parts = [shadow(cx, cy + 22, 22, 4, 0.25), s('circle', { cx, cy, r: 25, fill: '#fffaf0', stroke: '#ead8c0', 'stroke-width': 1 })];
  if (id === 'bottom') parts.push(biscuit(cx, cy + 6, 16, { bake: 1, split: 1, seed: 9 }));
  if (id === 'top') parts.push(biscuit(cx, cy + 6, 16, { bake: 1, rise: 0.6, seed: 4 }));
  if (id === 'berries') parts.push(bowl(cx, cy + 4, 40, { fill: 'berries', k: 1 }));
  if (id === 'cream' || id === 'cream2') parts.push(bowl(cx, cy + 4, 40, { fill: 'whipped', k: 1 }));
  if (id === 'berry') parts.push(strawberry(cx, cy + 2, 10));
  // The bowls inside a chip are pictures, not places to stir.
  for (const n of parts) n.querySelectorAll?.('[data-k="bowl"]').forEach((b) => b.remove());
  return g({ 'data-k': 'item', 'data-i': id, class: 'bk-item' }, parts);
}

// A progress meter.
export function meter(x, y, w, p) {
  return g({}, [
    s('rect', { x, y, width: w, height: 7, rx: 3.5, fill: '#ead9c6' }),
    s('rect', { x, y, width: Math.max(0.001, w * p), height: 7, rx: 3.5, fill: '#7fb26b' }),
    s('rect', { x: x + 2, y: y + 1, width: Math.max(0.001, w * p - 4), height: 2, rx: 1, fill: '#ffffff', 'fill-opacity': 0.4 }),
  ]);
}
