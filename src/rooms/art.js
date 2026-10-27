import { drawTulip, drawHeart, hex, roundRect, HAND_FONT, ROUND_FONT } from '../engine/textures.js';
import { COLORS } from '../config.js';
import { WORLD_TEXT } from '../config.js';
import { shape } from '../puzzles/sudokuMath.js';

// Procedural artwork shared by the 3D world and the 2D puzzle overlays.

const BLUE = hex(COLORS.tulipBlue);
const WHITE = '#fbf8f2';

// Seeded random so a painting always looks the same.
function rng(seed) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

// The tulip field at dusk (Room 1 sliding puzzle). Composed so that every
// one of the sixteen tiles has something of its own to recognise.
export function drawTulipField(g, w, h) {
  const r = rng(42);
  const H0 = h * 0.52; // horizon
  const sky = g.createLinearGradient(0, 0, 0, H0);
  sky.addColorStop(0, '#2f2f6e');
  sky.addColorStop(0.45, '#8a64a2');
  sky.addColorStop(0.8, '#f09a88');
  sky.addColorStop(1, '#ffd29a');
  g.fillStyle = sky;
  g.fillRect(0, 0, w, h);
  for (let i = 0; i < 60; i++) {
    g.fillStyle = `rgba(255,250,235,${0.4 + r() * 0.6})`;
    g.beginPath();
    g.arc(r() * w, r() * h * 0.28, r() * 1.8 + 0.5, 0, Math.PI * 2);
    g.fill();
  }
  // Top left: a crescent moon (a disc with a second disc cut out of it, so
  // the sky shows through instead of a darker patch).
  const mr = w * 0.07;
  const moon = document.createElement('canvas');
  moon.width = moon.height = Math.ceil(mr * 2 + 8);
  const mg = moon.getContext('2d');
  const mc = moon.width / 2;
  mg.fillStyle = '#fff3d2';
  mg.shadowColor = 'rgba(255,240,200,0.8)';
  mg.shadowBlur = mr * 0.25;
  mg.beginPath();
  mg.arc(mc, mc, mr, 0, Math.PI * 2);
  mg.fill();
  mg.shadowBlur = 0;
  mg.globalCompositeOperation = 'destination-out';
  mg.beginPath();
  mg.arc(mc + mr * 0.42, mc - mr * 0.3, mr * 0.88, 0, Math.PI * 2);
  mg.fill();
  g.drawImage(moon, w * 0.17 - mc, h * 0.15 - mc);
  // Top middle: soft pink clouds and three birds.
  const cloud = (cx, cy, s, c) => {
    g.fillStyle = c;
    for (const [dx, dy, rr2] of [
      [0, 0, 1],
      [0.9, 0.15, 0.8],
      [-0.9, 0.2, 0.75],
      [0.3, -0.45, 0.7],
    ]) {
      g.beginPath();
      g.ellipse(cx + dx * s, cy + dy * s, rr2 * s * 1.2, rr2 * s * 0.75, 0, 0, Math.PI * 2);
      g.fill();
    }
  };
  cloud(w * 0.5, h * 0.2, w * 0.05, 'rgba(255,190,200,0.85)');
  cloud(w * 0.44, h * 0.27, w * 0.03, 'rgba(255,215,215,0.7)');
  g.strokeStyle = '#3d2f52';
  g.lineWidth = 3;
  for (const [bx, by, bs] of [
    [0.55, 0.08, 1],
    [0.6, 0.11, 0.8],
    [0.5, 0.1, 0.7],
  ]) {
    const x = bx * w;
    const y = by * h;
    const s = bs * w * 0.025;
    g.beginPath();
    g.moveTo(x - s, y);
    g.quadraticCurveTo(x - s / 2, y - s * 0.7, x, y);
    g.quadraticCurveTo(x + s / 2, y - s * 0.7, x + s, y);
    g.stroke();
  }
  // Top right: a big evening star with a sparkle.
  const ex = w * 0.83;
  const ey = h * 0.14;
  const sg = g.createRadialGradient(ex, ey, 1, ex, ey, w * 0.09);
  sg.addColorStop(0, 'rgba(255,250,220,1)');
  sg.addColorStop(1, 'rgba(255,250,220,0)');
  g.fillStyle = sg;
  g.fillRect(ex - w * 0.1, ey - w * 0.1, w * 0.2, w * 0.2);
  g.fillStyle = '#fffbe8';
  g.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const rad = i % 2 ? w * 0.012 : w * 0.045;
    g.lineTo(ex + Math.cos(a) * rad, ey + Math.sin(a) * rad);
  }
  g.closePath();
  g.fill();
  cloud(w * 0.86, h * 0.3, w * 0.035, 'rgba(255,200,180,0.75)');
  // Middle centre: the setting sun on the horizon.
  const sx = w * 0.5;
  const glow = g.createRadialGradient(sx, H0, 4, sx, H0, w * 0.3);
  glow.addColorStop(0, 'rgba(255,230,170,0.9)');
  glow.addColorStop(1, 'rgba(255,200,150,0)');
  g.fillStyle = glow;
  g.fillRect(0, H0 - w * 0.3, w, w * 0.3);
  g.fillStyle = '#ffe2a0';
  g.beginPath();
  g.arc(sx, H0, w * 0.085, Math.PI, 0);
  g.fill();
  // Hills: a rounded one on the left for the house, a gentle one on the right.
  const hill = (x) => {
    const bump = (c, wd, ht) => ht * Math.exp(-(((x - c) / wd) ** 2));
    return h * (bump(w * 0.2, w * 0.2, 0.085) + bump(w * 0.82, w * 0.22, 0.035));
  };
  g.fillStyle = '#6c5c88';
  g.beginPath();
  g.moveTo(0, h);
  for (let x = 0; x <= w; x += 4) g.lineTo(x, H0 + 2 - hill(x));
  g.lineTo(w, h);
  g.closePath();
  g.fill();
  // Middle left: the little house with a lit window, sitting on the hill.
  const hx = w * 0.13;
  const hy = H0 - hill(w * 0.185) + h * 0.015;
  g.fillStyle = '#4b3f5e';
  g.fillRect(hx, hy - h * 0.06, w * 0.11, h * 0.07);
  g.beginPath();
  g.moveTo(hx - w * 0.015, hy - h * 0.055);
  g.lineTo(hx + w * 0.055, hy - h * 0.11);
  g.lineTo(hx + w * 0.125, hy - h * 0.055);
  g.fill();
  g.fillRect(hx + w * 0.075, hy - h * 0.12, w * 0.015, h * 0.04);
  g.fillStyle = '#ffd38a';
  g.fillRect(hx + w * 0.02, hy - h * 0.04, w * 0.025, h * 0.025);
  g.fillRect(hx + w * 0.065, hy - h * 0.04, w * 0.025, h * 0.025);
  // Middle right: a round tree on the right-hand hill. Each puff of the
  // crown is its own circle so they join cleanly.
  const ground = H0 - hill(w * 0.826) + 3;
  g.fillStyle = '#3e3850';
  g.fillRect(w * 0.818, ground - h * 0.09, w * 0.016, h * 0.09);
  const puffs = [
    [0.826, 0.125, 0.05],
    [0.795, 0.1, 0.034],
    [0.858, 0.1, 0.034],
    [0.81, 0.145, 0.03],
    [0.845, 0.145, 0.03],
  ];
  for (const [col, dy] of [
    ['#4f5a6a', 0],
    ['#5d6a7a', -0.008],
  ]) {
    g.fillStyle = col;
    for (const [px, py, pr] of puffs) {
      g.beginPath();
      g.arc(w * px - (dy ? pr * w * 0.25 : 0), ground - h * py + dy * h, w * pr * (dy ? 0.7 : 1), 0, Math.PI * 2);
      g.fill();
    }
  }
  // Field.
  const field = g.createLinearGradient(0, H0, 0, h);
  field.addColorStop(0, '#5c7a5a');
  field.addColorStop(1, '#2f4a35');
  g.fillStyle = field;
  g.fillRect(0, H0, w, h - H0);
  // A winding path from the bottom middle to the sun.
  const path = new Path2D();
  path.moveTo(w * 0.485, H0);
  path.bezierCurveTo(w * 0.44, h * 0.7, w * 0.62, h * 0.8, w * 0.42, h);
  path.lineTo(w * 0.62, h);
  path.bezierCurveTo(w * 0.78, h * 0.8, w * 0.5, h * 0.7, w * 0.515, H0);
  path.closePath();
  g.fillStyle = '#d8b994';
  g.fill(path);
  // Tulip rows: blue on the left, white on the right, mixed in the middle.
  // Rows follow the curve of the path instead of stopping in straight lines.
  const onPath = (x, y, size) => g.isPointInPath(path, x - size * 0.45, y) || g.isPointInPath(path, x + size * 0.45, y);
  for (let row = 0; row < 9; row++) {
    const t = row / 8;
    const y = H0 + h * 0.035 + t * t * (h - H0 - h * 0.02);
    const size = 5 + t * t * w * 0.048;
    const step = size * 1.3;
    for (let x = -step + (row % 2) * step * 0.5; x < w + step; x += step) {
      const u = x / w;
      const jx = x + (r() - 0.5) * step * 0.3;
      if (onPath(jx, y, size) || onPath(jx, y + size * 0.8, size)) continue; // keep the path clear
      let color = u < 0.38 ? BLUE : u > 0.66 ? WHITE : r() < 0.5 ? BLUE : WHITE;
      if (r() < 0.08) color = color === BLUE ? WHITE : BLUE;
      // Far rows fade into the dusk so they read as distance, not dotted lines.
      g.globalAlpha = 0.45 + 0.55 * Math.min(1, t * 1.6);
      drawTulip(g, jx, y, size, color, { stem: size > 6, leaf: size > 12 });
      g.globalAlpha = 1;
    }
  }
  // Bottom right: a small cat sitting among the white tulips, seen from
  // behind, looking towards the sun. One smooth silhouette (haunches,
  // shoulders, head, ears) with the tail curled round its feet, and a warm
  // rim of sunset light along the side that faces the sun.
  const u = w * 0.01;
  const cx = w * 0.845;
  const by = h * 0.955; // where it sits
  const catShape = () => {
    const p = new Path2D();
    // body: wide haunches narrowing to the shoulders
    p.moveTo(cx, by);
    p.bezierCurveTo(cx - 3.2 * u, by + 0.2 * u, cx - 4.6 * u, by - 1.6 * u, cx - 4.2 * u, by - 4.2 * u);
    p.bezierCurveTo(cx - 3.9 * u, by - 6.4 * u, cx - 2.2 * u, by - 7.6 * u, cx - 1.7 * u, by - 9.2 * u);
    p.lineTo(cx + 1.5 * u, by - 9.2 * u);
    p.bezierCurveTo(cx + 2.1 * u, by - 7.6 * u, cx + 3.9 * u, by - 6.4 * u, cx + 4.2 * u, by - 4.2 * u);
    p.bezierCurveTo(cx + 4.6 * u, by - 1.6 * u, cx + 3.2 * u, by + 0.2 * u, cx, by);
    p.closePath();
    // head, turned a little towards the sun
    const hx = cx - 0.35 * u;
    const hy = by - 11.2 * u;
    p.moveTo(hx + 2.6 * u, hy);
    p.ellipse(hx, hy, 2.6 * u, 2.3 * u, 0, 0, Math.PI * 2);
    // ears: soft-sided triangles
    for (const side of [-1, 1]) {
      p.moveTo(hx + side * 2.45 * u, hy - 0.4 * u);
      p.quadraticCurveTo(hx + side * 2.6 * u, hy - 2.6 * u, hx + side * 2.0 * u, hy - 3.9 * u);
      p.quadraticCurveTo(hx + side * 1.2 * u, hy - 2.9 * u, hx + side * 0.45 * u, hy - 2.15 * u);
      p.closePath();
    }
    return p;
  };
  const tail = (dx) => {
    g.beginPath();
    g.moveTo(cx + 3.3 * u + dx, by - 0.9 * u);
    g.bezierCurveTo(cx + 6.4 * u + dx, by - 0.2 * u, cx + 7.2 * u + dx, by - 2.8 * u, cx + 6.0 * u + dx, by - 4.6 * u);
    g.stroke();
  };
  g.save();
  g.lineCap = 'round';
  g.lineWidth = 1.25 * u;
  // a soft shadow on the ground
  g.fillStyle = 'rgba(20,15,30,0.35)';
  g.beginPath();
  g.ellipse(cx + 1 * u, by + 0.2 * u, 5.5 * u, 1.1 * u, 0, 0, Math.PI * 2);
  g.fill();
  // the rim light, then the cat on top, shifted away from the sun
  g.translate(-0.45 * u, 0);
  g.fillStyle = g.strokeStyle = '#f2a98c';
  g.fill(catShape());
  tail(0);
  g.translate(0.45 * u, 0);
  g.fillStyle = g.strokeStyle = '#2a2433';
  g.fill(catShape());
  tail(0);
  g.restore();
  // a couple of tulips in front of it, so it sits among them
  for (const [tx, ty, ts] of [
    [-6.2, 0.2, 4.6],
    [8.9, 0.5, 4.8],
  ])
    drawTulip(g, cx + tx * u, by + ty * u, ts * u, WHITE, { stem: true, leaf: true });
  // soft painterly vignette
  const v = g.createRadialGradient(w / 2, h / 2, w * 0.3, w / 2, h / 2, w * 0.75);
  v.addColorStop(0, 'rgba(0,0,0,0)');
  v.addColorStop(1, 'rgba(40,20,40,0.3)');
  g.fillStyle = v;
  g.fillRect(0, 0, w, h);
}

// Two tulips at a distance, in a season (Room 1 frames). kind is
// '<season>-<distance>': winter/spring/summer/autumn and far/closer/together.
export function drawFramePicture(g, w, h, kind) {
  const [season, dist] = kind.split('-');
  const r = rng(kind.length * 31 + kind.charCodeAt(0) * 7 + kind.charCodeAt(kind.length - 1));
  const look = {
    winter: { sky: ['#dfe8f3', '#c9d6e6'], ground: '#ffffff', edge: '#e2e9f2' },
    spring: { sky: ['#fbe8ef', '#f6d6e2'], ground: '#b7d8a4', edge: '#a3c98f' },
    summer: { sky: ['#ffeec2', '#ffe1a0'], ground: '#9cc77f', edge: '#88b56c' },
    autumn: { sky: ['#f9dcc0', '#efc09a'], ground: '#c79a6a', edge: '#b3855a' },
  }[season];
  const bg = g.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0, look.sky[0]);
  bg.addColorStop(1, look.sky[1]);
  g.fillStyle = bg;
  g.fillRect(0, 0, w, h);
  // Season details in the sky.
  if (season === 'summer') {
    g.fillStyle = '#ffd25a';
    g.beginPath();
    g.arc(w * 0.78, h * 0.18, w * 0.11, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = 'rgba(255,200,80,0.7)';
    g.lineWidth = 3;
    for (let k = 0; k < 10; k++) {
      const a = (k / 10) * Math.PI * 2;
      g.beginPath();
      g.moveTo(w * 0.78 + Math.cos(a) * w * 0.14, h * 0.18 + Math.sin(a) * w * 0.14);
      g.lineTo(w * 0.78 + Math.cos(a) * w * 0.18, h * 0.18 + Math.sin(a) * w * 0.18);
      g.stroke();
    }
  }
  if (season === 'spring') {
    // a blossom branch and falling petals
    g.strokeStyle = '#8a6a5a';
    g.lineWidth = 5;
    g.beginPath();
    g.moveTo(w, h * 0.08);
    g.quadraticCurveTo(w * 0.7, h * 0.12, w * 0.5, h * 0.06);
    g.stroke();
    for (let k = 0; k < 9; k++) {
      g.fillStyle = k % 2 ? '#f7a8c0' : '#ffd0de';
      g.beginPath();
      g.arc(w * (0.55 + k * 0.05), h * (0.07 + (k % 3) * 0.02), w * 0.025, 0, Math.PI * 2);
      g.fill();
    }
  }
  const flakes = season === 'winter' ? 40 : season === 'spring' || season === 'autumn' ? 14 : 0;
  for (let k = 0; k < flakes; k++) {
    const x = r() * w;
    const y = r() * h * 0.78;
    if (season === 'winter') {
      g.fillStyle = 'rgba(255,255,255,0.95)';
      g.beginPath();
      g.arc(x, y, 2 + r() * 2.5, 0, Math.PI * 2);
      g.fill();
    } else {
      g.save();
      g.translate(x, y);
      g.rotate(r() * 6);
      g.fillStyle = season === 'spring' ? (r() < 0.5 ? '#f7a8c0' : '#ffd0de') : r() < 0.5 ? '#d9772f' : '#b8552a';
      g.beginPath();
      g.ellipse(0, 0, season === 'spring' ? 4 : 7, season === 'spring' ? 2.5 : 3.5, 0, 0, Math.PI * 2);
      g.fill();
      g.restore();
    }
  }
  // Ground.
  g.fillStyle = look.ground;
  g.beginPath();
  g.moveTo(0, h * 0.74);
  g.quadraticCurveTo(w * 0.5, h * 0.66, w, h * 0.74);
  g.lineTo(w, h);
  g.lineTo(0, h);
  g.fill();
  g.strokeStyle = look.edge;
  g.lineWidth = 3;
  g.beginPath();
  g.moveTo(0, h * 0.74);
  g.quadraticCurveTo(w * 0.5, h * 0.66, w, h * 0.74);
  g.stroke();
  if (season === 'winter') {
    // little snow drifts
    g.fillStyle = '#f3f7fb';
    for (let k = 0; k < 4; k++) {
      g.beginPath();
      g.ellipse(w * (0.12 + k * 0.26), h * 0.8, w * 0.09, h * 0.025, 0, 0, Math.PI * 2);
      g.fill();
    }
  }
  if (season === 'autumn') {
    for (let k = 0; k < 10; k++) {
      g.fillStyle = k % 2 ? '#d9772f' : '#e7a03c';
      g.beginPath();
      g.ellipse(r() * w, h * (0.78 + r() * 0.18), 6, 3, r() * 3, 0, Math.PI * 2);
      g.fill();
    }
  }
  const gap = { far: 0.33, closer: 0.17, together: 0.088 }[dist];
  const size = w * 0.24;
  const y = h * 0.47;
  drawTulip(g, w * (0.5 - gap), y, size, BLUE, { outline: 'rgba(0,0,0,0.12)' });
  drawTulip(g, w * (0.5 + gap), y, size, WHITE, { outline: 'rgba(0,0,0,0.18)' });
  if (dist === 'together') {
    // a tiny heart where the petals touch
    g.fillStyle = '#e2a29d';
    g.beginPath();
    const hx = w / 2;
    const hy = y - size * 0.95;
    const s = size * 0.22;
    g.moveTo(hx, hy + s * 0.35);
    g.bezierCurveTo(hx - s, hy - s * 0.3, hx - s * 0.45, hy - s, hx, hy - s * 0.45);
    g.bezierCurveTo(hx + s * 0.45, hy - s, hx + s, hy - s * 0.3, hx, hy + s * 0.35);
    g.fill();
  }
}

// Rug pattern: the first six tulips B W B B W W, then three dotted outlines.
export function drawPatternRug(g, w, h, seq) {
  const n = seq.length + 3;
  const cell = (w - 120) / n;
  const y = h * 0.42;
  seq.forEach((c, i) => {
    const x = 60 + cell * (i + 0.5);
    g.fillStyle = 'rgba(255,255,255,0.18)';
    g.beginPath();
    g.arc(x, y + cell * 0.25, cell * 0.42, 0, Math.PI * 2);
    g.fill();
    drawTulip(g, x, y - cell * 0.05, cell * 0.62, c === 'B' ? BLUE : WHITE, { outline: 'rgba(60,40,30,0.25)' });
  });
  for (let i = seq.length; i < n; i++) {
    const x = 60 + cell * (i + 0.5);
    g.strokeStyle = 'rgba(255,250,240,0.55)';
    g.setLineDash([6, 6]);
    g.lineWidth = 3;
    g.beginPath();
    g.arc(x, y + cell * 0.25, cell * 0.36, 0, Math.PI * 2);
    g.stroke();
    g.setLineDash([]);
    g.fillStyle = 'rgba(255,250,240,0.7)';
    g.font = `bold ${cell * 0.4}px ${ROUND_FONT}`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText('?', x, y + cell * 0.25);
  }
  // little border of leaves
  g.strokeStyle = 'rgba(169,191,157,0.7)';
  g.lineWidth = 4;
  for (let x = 70; x < w - 60; x += 36) {
    g.beginPath();
    g.ellipse(x, h * 0.82, 10, 4, 0.5, 0, Math.PI * 2);
    g.stroke();
  }
}

// Stained-glass rainbow (Room 2 books order).
export function drawRainbowWindow(g, w, h, order, palette) {
  g.fillStyle = '#3a2f36';
  g.fillRect(0, 0, w, h);
  const n = order.length;
  const pad = 14;
  const cw = (w - pad * 2) / n;
  order.forEach((name, i) => {
    const x = pad + i * cw;
    const grad = g.createLinearGradient(0, pad, 0, h - pad);
    grad.addColorStop(0, palette[name].glow);
    grad.addColorStop(1, palette[name].css);
    g.fillStyle = grad;
    roundRect(g, x + 3, pad + (i % 2) * 6, cw - 6, h - pad * 2 - 6, 8);
    g.fill();
    g.fillStyle = 'rgba(255,255,255,0.35)';
    g.fillRect(x + 8, pad + 10, 4, h * 0.4);
  });
  // a small arc of lead lines on top
  g.strokeStyle = '#3a2f36';
  g.lineWidth = 5;
  g.beginPath();
  g.arc(w / 2, h * 1.1, h * 0.95, Math.PI * 1.12, Math.PI * 1.88);
  g.stroke();
  g.beginPath();
  g.arc(w / 2, h * 1.1, h * 0.6, Math.PI * 1.1, Math.PI * 1.9);
  g.stroke();
}

// Cipher wheel poster (Room 3). `shift` is how far the inner ring is turned:
// the inner letter under each outer letter is that letter moved `shift` steps.
export function drawCipherWheel(g, w, h, shift) {
  g.fillStyle = '#fbf1de';
  g.fillRect(0, 0, w, h);
  const cx = w / 2;
  const cy = h * 0.47;
  const R = w * 0.42;
  g.fillStyle = '#f2c4c0';
  g.beginPath();
  g.arc(cx, cy, R, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = '#a9bf9d';
  g.beginPath();
  g.arc(cx, cy, R * 0.72, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = '#fbf1de';
  g.beginPath();
  g.arc(cx, cy, R * 0.44, 0, Math.PI * 2);
  g.fill();
  // A pointer at the top so the pairing under it is easy to read.
  g.fillStyle = '#e2a29d';
  g.beginPath();
  g.moveTo(cx - 10, cy - R - 6);
  g.lineTo(cx + 10, cy - R - 6);
  g.lineTo(cx, cy - R + 10);
  g.fill();
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  for (let i = 0; i < 26; i++) {
    const a = (i / 26) * Math.PI * 2 - Math.PI / 2;
    g.fillStyle = '#4a3a33';
    g.font = `bold ${w * 0.042}px ${ROUND_FONT}`;
    g.fillText(String.fromCharCode(65 + i), cx + Math.cos(a) * R * 0.86, cy + Math.sin(a) * R * 0.86);
    g.fillStyle = '#2f4a35';
    g.fillText(String.fromCharCode(65 + ((i + shift) % 26)), cx + Math.cos(a) * R * 0.58, cy + Math.sin(a) * R * 0.58);
  }
  g.fillStyle = '#4a3a33';
  g.font = `${w * 0.07}px ${HAND_FONT}`;
  g.fillText(`A → ${String.fromCharCode(65 + shift)}`, cx, cy);
  g.font = `${w * 0.05}px ${HAND_FONT}`;
  g.fillText(WORLD_TEXT.wheelCaption, cx, h * 0.93);
}

// Constellation star map background (Room 5), drawn behind the numbered stars.
export function drawStarField(g, w, h, seed = 7) {
  const r = rng(seed);
  const bg = g.createRadialGradient(w / 2, h / 2, 10, w / 2, h / 2, w * 0.7);
  bg.addColorStop(0, '#1d2350');
  bg.addColorStop(1, '#0a0d24');
  g.fillStyle = bg;
  g.fillRect(0, 0, w, h);
  // milky way smear
  for (let i = 0; i < 260; i++) {
    const t = r();
    const x = t * w;
    const y = h * 0.2 + t * h * 0.6 + (r() - 0.5) * h * 0.25;
    g.fillStyle = `rgba(200,190,255,${0.03 + r() * 0.04})`;
    g.beginPath();
    g.arc(x, y, 6 + r() * 16, 0, Math.PI * 2);
    g.fill();
  }
  for (let i = 0; i < 380; i++) {
    g.fillStyle = `rgba(255,250,235,${0.25 + r() * 0.6})`;
    g.beginPath();
    g.arc(r() * w, r() * h, r() * 1.3 + 0.3, 0, Math.PI * 2);
    g.fill();
  }
}

// Chalkboard (Room 4) with the sudoku grid (any size; boxes from sudokuMath).
export function drawChalkboard(g, w, h, puzzle) {
  g.fillStyle = '#2f4a3e';
  g.fillRect(0, 0, w, h);
  for (let i = 0; i < 600; i++) {
    g.fillStyle = `rgba(255,255,255,${Math.random() * 0.03})`;
    g.fillRect(Math.random() * w, Math.random() * h, 3, 1);
  }
  const n = puzzle.n;
  const { br, bc } = shape(n);
  const size = h * 0.84;
  const x0 = w * 0.06;
  const y0 = (h - size) / 2;
  const cs = size / n;
  g.strokeStyle = 'rgba(244,241,230,0.85)';
  g.lineCap = 'round';
  for (let i = 0; i <= n; i++) {
    g.lineWidth = i % bc === 0 ? 5 : 1.5;
    g.beginPath();
    g.moveTo(x0 + i * cs, y0);
    g.lineTo(x0 + i * cs + 1, y0 + size);
    g.stroke();
    g.lineWidth = i % br === 0 ? 5 : 1.5;
    g.beginPath();
    g.moveTo(x0, y0 + i * cs);
    g.lineTo(x0 + size, y0 + i * cs - 1);
    g.stroke();
  }
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  for (let i = 0; i < n * n; i++) {
    const v = puzzle.grid[i];
    if (!v) continue;
    const given = puzzle.isGiven(i);
    g.fillStyle = given ? '#ffe9b0' : '#f4f1e6';
    g.font = `${given ? 'bold ' : ''}${cs * 0.62}px ${HAND_FONT}`;
    g.fillText(String(v), x0 + (i % n) * cs + cs / 2, y0 + Math.floor(i / n) * cs + cs / 2 + 2);
  }
  g.fillStyle = 'rgba(244,241,230,0.85)';
  g.font = `${h * 0.075}px ${HAND_FONT}`;
  g.textAlign = 'left';
  const [first, ...rest] = WORLD_TEXT.chalkboardRule;
  g.fillText(first, w * 0.64, h * 0.22);
  g.font = `${h * 0.052}px ${HAND_FONT}`;
  rest.forEach((line, k) => g.fillText(line, w * 0.62, h * (0.36 + k * 0.09)));
  // a doodle cat
  g.strokeStyle = 'rgba(244,241,230,0.6)';
  g.lineWidth = 3;
  const cx = w * 0.78;
  const cy = h * 0.8;
  g.beginPath();
  g.arc(cx, cy, h * 0.06, 0, Math.PI * 2);
  g.moveTo(cx - h * 0.05, cy - h * 0.035);
  g.lineTo(cx - h * 0.045, cy - h * 0.1);
  g.lineTo(cx - h * 0.015, cy - h * 0.06);
  g.moveTo(cx + h * 0.05, cy - h * 0.035);
  g.lineTo(cx + h * 0.045, cy - h * 0.1);
  g.lineTo(cx + h * 0.015, cy - h * 0.06);
  g.stroke();
}

// ------------------------------------------------------- the attic trunk lock
// One picture of the trunk's picture lock, centred at (x, y), about s across.
// Drawn on canvas so the lock screen and the 3D trunk share the same art.
export function drawLockPicture(g, id, x, y, s) {
  const ink = '#4a3a3a';
  g.save();
  g.translate(x, y);
  g.lineJoin = 'round';
  g.lineCap = 'round';
  if (id === 'star') {
    // A folded paper star: five points, a crease down each one.
    const pts = [];
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + (i * Math.PI) / 5;
      const r = i % 2 ? s * 0.2 : s * 0.46;
      pts.push([Math.cos(a) * r, Math.sin(a) * r]);
    }
    g.fillStyle = '#f4d77a';
    g.beginPath();
    pts.forEach(([px, py], i) => (i ? g.lineTo(px, py) : g.moveTo(px, py)));
    g.closePath();
    g.fill();
    g.strokeStyle = 'rgba(150,110,40,0.55)';
    g.lineWidth = Math.max(1, s * 0.025);
    g.stroke();
    for (let i = 0; i < 10; i += 2) {
      g.beginPath();
      g.moveTo(0, 0);
      g.lineTo(pts[i][0], pts[i][1]);
      g.stroke();
    }
  } else if (id === 'mouse') {
    // A toy mouse: round body, two ears, a long curly tail.
    g.strokeStyle = '#b98f9a';
    g.lineWidth = Math.max(1, s * 0.04);
    g.beginPath();
    g.moveTo(s * 0.3, s * 0.12);
    g.bezierCurveTo(s * 0.55, s * 0.1, s * 0.5, s * 0.38, s * 0.3, s * 0.36);
    g.stroke();
    g.fillStyle = '#a9a0a8';
    g.beginPath();
    g.ellipse(0, s * 0.08, s * 0.33, s * 0.22, 0, 0, Math.PI * 2);
    g.fill();
    g.beginPath();
    g.moveTo(-s * 0.3, s * 0.02);
    g.lineTo(-s * 0.46, s * 0.1);
    g.lineTo(-s * 0.28, s * 0.2);
    g.fill();
    for (const ex of [-s * 0.16, s * 0.02]) {
      g.fillStyle = '#a9a0a8';
      g.beginPath();
      g.arc(ex, -s * 0.14, s * 0.11, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = '#f2b8c2';
      g.beginPath();
      g.arc(ex, -s * 0.14, s * 0.06, 0, Math.PI * 2);
      g.fill();
    }
    g.fillStyle = ink;
    g.beginPath();
    g.arc(-s * 0.25, s * 0.04, s * 0.03, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#e88aa0';
    g.beginPath();
    g.arc(-s * 0.45, s * 0.1, s * 0.035, 0, Math.PI * 2);
    g.fill();
  } else if (id === 'cookie') {
    // A cookie shaped like a cat's head, with chocolate chips.
    g.fillStyle = '#d9a35f';
    g.beginPath();
    g.moveTo(-s * 0.36, -s * 0.05);
    g.lineTo(-s * 0.32, -s * 0.42);
    g.lineTo(-s * 0.1, -s * 0.24);
    g.lineTo(s * 0.1, -s * 0.24);
    g.lineTo(s * 0.32, -s * 0.42);
    g.lineTo(s * 0.36, -s * 0.05);
    g.arc(0, s * 0.02, s * 0.37, -0.2, Math.PI + 0.2);
    g.closePath();
    g.fill();
    g.strokeStyle = '#b07a3c';
    g.lineWidth = Math.max(1, s * 0.03);
    g.stroke();
    g.fillStyle = '#6b4128';
    for (const [cx, cy] of [
      [-s * 0.15, -s * 0.02],
      [s * 0.15, -s * 0.02],
      [0, s * 0.15],
      [-s * 0.2, s * 0.2],
      [s * 0.21, s * 0.19],
    ]) {
      g.beginPath();
      g.arc(cx, cy, s * 0.045, 0, Math.PI * 2);
      g.fill();
    }
  } else if (id === 'tulip') {
    drawTulip(g, 0, -s * 0.12, s * 0.62, BLUE, { stemColor: hex(COLORS.stem) });
  } else if (id === 'moon') {
    // A crescent, cut out on its own little canvas so it never erases what
    // is behind it.
    const n = Math.max(8, Math.ceil(s));
    const c = document.createElement('canvas');
    c.width = c.height = n;
    const m = c.getContext('2d');
    m.fillStyle = '#f3e4b0';
    m.beginPath();
    m.arc(n / 2, n / 2, n * 0.36, 0, Math.PI * 2);
    m.fill();
    m.globalCompositeOperation = 'destination-out';
    m.beginPath();
    m.arc(n / 2 + n * 0.17, n / 2 - n * 0.1, n * 0.3, 0, Math.PI * 2);
    m.fill();
    g.drawImage(c, -s / 2, -s / 2, s, s);
  } else if (id === 'heart') {
    drawHeart(g, 0, s * 0.06, s * 0.62, '#e98b9c');
  }
  g.restore();
}
