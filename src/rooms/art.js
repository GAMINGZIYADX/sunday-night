import { drawTulip, hex, roundRect, HAND_FONT, ROUND_FONT } from '../engine/textures.js';
import { COLORS } from '../config.js';
import { WORLD_TEXT } from '../config.js';

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
// one of the nine tiles has something of its own to recognise.
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
  // Top left: a crescent moon.
  g.fillStyle = '#fff3d2';
  g.beginPath();
  g.arc(w * 0.17, h * 0.15, w * 0.07, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = '#3a3577';
  g.beginPath();
  g.arc(w * 0.2, h * 0.13, w * 0.062, 0, Math.PI * 2);
  g.fill();
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
  // Hills.
  g.fillStyle = '#6c5c88';
  g.beginPath();
  g.moveTo(0, H0);
  for (let x = 0; x <= w; x += 8) g.lineTo(x, H0 - Math.max(0, Math.sin((x / w) * Math.PI * 1.1 - 0.2)) * h * 0.06 * (x < w * 0.4 ? 1.6 : 0.6));
  g.lineTo(w, h);
  g.lineTo(0, h);
  g.fill();
  // Middle left: the little house with a lit window.
  const hx = w * 0.13;
  const hy = H0 - h * 0.06;
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
  // Middle right: a round tree.
  g.fillStyle = '#3e3850';
  g.fillRect(w * 0.82, H0 - h * 0.1, w * 0.012, h * 0.1);
  g.fillStyle = '#4f5a6a';
  g.beginPath();
  g.arc(w * 0.826, H0 - h * 0.12, w * 0.05, 0, Math.PI * 2);
  g.arc(w * 0.8, H0 - h * 0.1, w * 0.035, 0, Math.PI * 2);
  g.arc(w * 0.855, H0 - h * 0.095, w * 0.035, 0, Math.PI * 2);
  g.fill();
  // Field.
  const field = g.createLinearGradient(0, H0, 0, h);
  field.addColorStop(0, '#5c7a5a');
  field.addColorStop(1, '#2f4a35');
  g.fillStyle = field;
  g.fillRect(0, H0, w, h - H0);
  // A winding path from the bottom middle to the sun.
  g.fillStyle = '#d8b994';
  g.beginPath();
  g.moveTo(w * 0.47, H0);
  g.bezierCurveTo(w * 0.44, h * 0.7, w * 0.62, h * 0.8, w * 0.42, h);
  g.lineTo(w * 0.62, h);
  g.bezierCurveTo(w * 0.78, h * 0.8, w * 0.5, h * 0.7, w * 0.53, H0);
  g.closePath();
  g.fill();
  // Tulip rows: blue on the left, white on the right, mixed in the middle.
  for (let row = 0; row < 9; row++) {
    const t = row / 8;
    const y = H0 + h * 0.03 + t * t * (h - H0 - h * 0.02);
    const size = 3 + t * t * w * 0.05;
    const step = size * 1.25;
    for (let x = -step + (row % 2) * step * 0.5; x < w + step; x += step) {
      const u = x / w;
      if (u > 0.4 && u < 0.66 && row > 2) continue; // keep the path clear
      let color = u < 0.38 ? BLUE : u > 0.66 ? WHITE : r() < 0.5 ? BLUE : WHITE;
      if (r() < 0.08) color = color === BLUE ? WHITE : BLUE;
      drawTulip(g, x + (r() - 0.5) * step * 0.3, y, size, color, { stem: size > 6, leaf: size > 12 });
    }
  }
  // Bottom right: a small cat sitting among the white tulips, looking at the sun.
  const cx = w * 0.84;
  const cy = h * 0.9;
  g.fillStyle = '#2a2433';
  g.beginPath();
  g.ellipse(cx, cy, w * 0.035, h * 0.05, 0, 0, Math.PI * 2);
  g.fill();
  g.beginPath();
  g.arc(cx, cy - h * 0.06, w * 0.024, 0, Math.PI * 2);
  g.fill();
  g.beginPath();
  g.moveTo(cx - w * 0.022, cy - h * 0.07);
  g.lineTo(cx - w * 0.016, cy - h * 0.1);
  g.lineTo(cx - w * 0.004, cy - h * 0.078);
  g.moveTo(cx + w * 0.022, cy - h * 0.07);
  g.lineTo(cx + w * 0.016, cy - h * 0.1);
  g.lineTo(cx + w * 0.004, cy - h * 0.078);
  g.fill();
  g.strokeStyle = '#2a2433';
  g.lineWidth = w * 0.01;
  g.lineCap = 'round';
  g.beginPath();
  g.moveTo(cx + w * 0.03, cy + h * 0.035);
  g.quadraticCurveTo(cx + w * 0.08, cy + h * 0.02, cx + w * 0.07, cy - h * 0.03);
  g.stroke();
  // soft painterly vignette
  const v = g.createRadialGradient(w / 2, h / 2, w * 0.3, w / 2, h / 2, w * 0.75);
  v.addColorStop(0, 'rgba(0,0,0,0)');
  v.addColorStop(1, 'rgba(40,20,40,0.3)');
  g.fillStyle = v;
  g.fillRect(0, 0, w, h);
}

// Two tulips at a distance: 'far', 'closer', 'together' (Room 1 frames).
export function drawFramePicture(g, w, h, kind) {
  const bg = g.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0, '#fbeee2');
  bg.addColorStop(1, '#f2d9cf');
  g.fillStyle = bg;
  g.fillRect(0, 0, w, h);
  // a soft ground line
  g.fillStyle = '#d9c3a5';
  g.beginPath();
  g.ellipse(w / 2, h * 0.86, w * 0.48, h * 0.08, 0, 0, Math.PI * 2);
  g.fill();
  const gap = { far: 0.33, closer: 0.18, together: 0.088 }[kind];
  const size = w * 0.24;
  const y = h * 0.42;
  drawTulip(g, w * (0.5 - gap), y, size, BLUE, { outline: 'rgba(0,0,0,0.08)' });
  drawTulip(g, w * (0.5 + gap), y, size, WHITE, { outline: 'rgba(0,0,0,0.12)' });
  if (kind === 'together') {
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

// Cipher wheel poster (Room 3).
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

// Chalkboard (Room 4) with the sudoku grid.
export function drawChalkboard(g, w, h, puzzle) {
  g.fillStyle = '#2f4a3e';
  g.fillRect(0, 0, w, h);
  for (let i = 0; i < 600; i++) {
    g.fillStyle = `rgba(255,255,255,${Math.random() * 0.03})`;
    g.fillRect(Math.random() * w, Math.random() * h, 3, 1);
  }
  const size = h * 0.78;
  const x0 = w * 0.08;
  const y0 = (h - size) / 2;
  const cs = size / 4;
  g.strokeStyle = 'rgba(244,241,230,0.85)';
  g.lineCap = 'round';
  for (let i = 0; i <= 4; i++) {
    g.lineWidth = i % 2 === 0 ? 5 : 2;
    g.beginPath();
    g.moveTo(x0 + i * cs, y0);
    g.lineTo(x0 + i * cs + 1, y0 + size);
    g.stroke();
    g.beginPath();
    g.moveTo(x0, y0 + i * cs);
    g.lineTo(x0 + size, y0 + i * cs - 1);
    g.stroke();
  }
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  for (let i = 0; i < 16; i++) {
    const v = puzzle.grid[i];
    if (!v) continue;
    const given = puzzle.isGiven(i);
    g.fillStyle = given ? '#ffe9b0' : '#f4f1e6';
    g.font = `${given ? 'bold ' : ''}${cs * 0.62}px ${HAND_FONT}`;
    g.fillText(String(v), x0 + (i % 4) * cs + cs / 2, y0 + Math.floor(i / 4) * cs + cs / 2 + 2);
  }
  g.fillStyle = 'rgba(244,241,230,0.85)';
  g.font = `${h * 0.08}px ${HAND_FONT}`;
  g.textAlign = 'left';
  const [first, ...rest] = WORLD_TEXT.chalkboardRule;
  g.fillText(first, w * 0.66, h * 0.25);
  g.font = `${h * 0.055}px ${HAND_FONT}`;
  rest.forEach((line, k) => g.fillText(line, w * 0.62, h * (0.4 + k * 0.1)));
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
