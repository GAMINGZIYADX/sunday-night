import * as THREE from 'three';
import { COLORS } from '../config.js';
import { WEBGL2 } from './quality.js';

// All textures are painted on canvases at start-up. No image files.

export const hex = (c) => '#' + c.toString(16).padStart(6, '0');

export function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

export function canvasTexture(canvas, { repeat = null, srgb = true, anisotropy = 4 } = {}) {
  const t = new THREE.CanvasTexture(canvas);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = anisotropy;
  if (repeat) {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(repeat[0], repeat[1]);
  } else if (!WEBGL2 && !(isPow2(canvas.width) && isPow2(canvas.height))) {
    // WebGL 1 only mipmaps power-of-two sizes, and three.js would shrink the
    // canvas to one (blurring the writing on cards), so skip mipmaps instead.
    t.generateMipmaps = false;
    t.minFilter = THREE.LinearFilter;
  }
  return t;
}

const isPow2 = (n) => (n & (n - 1)) === 0;

export function paint(w, h, fn, opts) {
  const c = makeCanvas(w, h);
  fn(c.getContext('2d'), w, h);
  return canvasTexture(c, opts);
}

// Deterministic pseudo-random for textures, so the house looks the same each time.
let seed = 1234567;
export function rand() {
  seed = (seed * 16807) % 2147483647;
  return (seed - 1) / 2147483646;
}
export function rr(a, b) {
  return a + rand() * (b - a);
}

export const HAND_FONT = '"Segoe Print", "Bradley Hand", "Ink Free", "Chalkboard SE", "Comic Sans MS", "Marker Felt", cursive';
export const ROUND_FONT = '"Nunito", "Quicksand", "Segoe UI Rounded", "Arial Rounded MT Bold", "Trebuchet MS", "Segoe UI", sans-serif';

export function roundRect(g, x, y, w, h, r) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}

// A little tulip drawn in 2D: used on rugs, frames, the painting and the UI.
export function drawTulip(g, x, y, size, color, { stem = true, leaf = true, stemColor = hex(COLORS.stem), outline = null } = {}) {
  const s = size;
  g.save();
  g.translate(x, y);
  if (stem) {
    g.strokeStyle = stemColor;
    g.lineWidth = Math.max(1, s * 0.09);
    g.lineCap = 'round';
    g.beginPath();
    g.moveTo(0, 0);
    g.quadraticCurveTo(s * 0.05, s * 0.6, 0, s * 1.15);
    g.stroke();
    if (leaf) {
      g.fillStyle = stemColor;
      g.beginPath();
      g.moveTo(0, s * 1.1);
      g.quadraticCurveTo(-s * 0.55, s * 0.75, -s * 0.38, s * 0.35);
      g.quadraticCurveTo(-s * 0.12, s * 0.75, 0, s * 1.1);
      g.fill();
      g.beginPath();
      g.moveTo(0, s * 1.05);
      g.quadraticCurveTo(s * 0.5, s * 0.8, s * 0.42, s * 0.48);
      g.quadraticCurveTo(s * 0.15, s * 0.8, 0, s * 1.05);
      g.fill();
    }
  }
  // Cup with three pointed petals.
  g.fillStyle = color;
  g.beginPath();
  g.moveTo(-s * 0.36, -s * 0.5);
  g.lineTo(-s * 0.2, -s * 0.25);
  g.lineTo(0, -s * 0.56);
  g.lineTo(s * 0.2, -s * 0.25);
  g.lineTo(s * 0.36, -s * 0.5);
  g.quadraticCurveTo(s * 0.42, s * 0.05, 0, s * 0.06);
  g.quadraticCurveTo(-s * 0.42, s * 0.05, -s * 0.36, -s * 0.5);
  g.fill();
  if (outline) {
    g.strokeStyle = outline;
    g.lineWidth = Math.max(1, s * 0.05);
    g.stroke();
  }
  g.fillStyle = 'rgba(255,255,255,0.28)';
  g.beginPath();
  g.ellipse(-s * 0.12, -s * 0.22, s * 0.07, s * 0.18, -0.3, 0, Math.PI * 2);
  g.fill();
  g.restore();
}

export function drawHeart(g, x, y, s, color) {
  g.save();
  g.translate(x, y);
  g.fillStyle = color;
  g.beginPath();
  g.moveTo(0, s * 0.35);
  g.bezierCurveTo(-s * 0.9, -s * 0.25, -s * 0.45, -s * 0.85, 0, -s * 0.4);
  g.bezierCurveTo(s * 0.45, -s * 0.85, s * 0.9, -s * 0.25, 0, s * 0.35);
  g.fill();
  g.restore();
}

// ---------------------------------------------------------------- surfaces

export function woodPlanks(base = COLORS.wood, { w = 512, h = 512, planks = 6, repeat = [2, 2] } = {}) {
  return paint(
    w,
    h,
    (g) => {
      const ph = h / planks;
      for (let i = 0; i < planks; i++) {
        const c = new THREE.Color(base).offsetHSL(rr(-0.01, 0.01), rr(-0.05, 0.05), rr(-0.06, 0.05));
        g.fillStyle = c.getStyle();
        g.fillRect(0, i * ph, w, ph);
        // grain
        for (let k = 0; k < 14; k++) {
          g.strokeStyle = `rgba(60,30,10,${rr(0.04, 0.11)})`;
          g.lineWidth = rr(0.6, 2);
          g.beginPath();
          const yy = i * ph + rr(2, ph - 2);
          g.moveTo(0, yy);
          for (let x = 0; x <= w; x += 32) g.lineTo(x, yy + Math.sin(x * 0.02 + k) * rr(0.5, 2.5));
          g.stroke();
        }
        // knot
        if (rand() < 0.5) {
          g.fillStyle = 'rgba(80,40,15,0.18)';
          g.beginPath();
          g.ellipse(rr(30, w - 30), i * ph + ph / 2, rr(6, 12), rr(3, 6), 0, 0, Math.PI * 2);
          g.fill();
        }
        // plank ends
        const off = rr(0, w);
        g.fillStyle = 'rgba(50,25,10,0.35)';
        g.fillRect(off, i * ph, 2, ph);
        g.fillStyle = 'rgba(40,20,8,0.45)';
        g.fillRect(0, i * ph, w, 2);
      }
    },
    { repeat },
  );
}

export function woodGrain(base = COLORS.wood, repeat = [1, 1]) {
  return paint(
    256,
    256,
    (g, w, h) => {
      g.fillStyle = hex(base);
      g.fillRect(0, 0, w, h);
      for (let k = 0; k < 40; k++) {
        g.strokeStyle = `rgba(70,35,12,${rr(0.03, 0.1)})`;
        g.lineWidth = rr(0.5, 2);
        g.beginPath();
        const yy = rr(0, h);
        g.moveTo(0, yy);
        for (let x = 0; x <= w; x += 16) g.lineTo(x, yy + Math.sin(x * 0.03 + k) * 2);
        g.stroke();
      }
    },
    { repeat },
  );
}

// Wallpaper: soft base with tiny tulips or stripes.
export function wallpaper(base, accent, style = 'tulips', repeat = [3, 1.4]) {
  return paint(
    256,
    256,
    (g, w, h) => {
      g.fillStyle = hex(base);
      g.fillRect(0, 0, w, h);
      if (style === 'stripes') {
        for (let x = 0; x < w; x += 32) {
          g.fillStyle = 'rgba(255,255,255,0.18)';
          g.fillRect(x, 0, 12, h);
          g.fillStyle = hex(accent) + '33';
          g.fillRect(x + 14, 0, 2, h);
        }
      } else if (style === 'dots') {
        g.fillStyle = hex(accent) + '55';
        for (let y = 16; y < h; y += 32)
          for (let x = (y / 32) % 2 ? 0 : 16; x < w + 16; x += 32) {
            g.beginPath();
            g.arc(x, y, 3, 0, Math.PI * 2);
            g.fill();
          }
      } else if (style === 'tulips') {
        for (let y = 0; y < 2; y++)
          for (let x = 0; x < 2; x++) {
            const cx = x * 128 + (y % 2 ? 64 : 0) + 32;
            const cy = y * 128 + 40;
            drawTulip(g, cx, cy, 16, (x + y) % 2 ? 'rgba(111,155,224,0.55)' : 'rgba(255,255,255,0.75)', {
              stemColor: 'rgba(111,157,90,0.5)',
            });
          }
      } else if (style === 'tiles') {
        g.strokeStyle = 'rgba(120,100,80,0.25)';
        g.lineWidth = 3;
        for (let i = 0; i <= 4; i++) {
          g.beginPath();
          g.moveTo(i * 64, 0);
          g.lineTo(i * 64, h);
          g.stroke();
          g.beginPath();
          g.moveTo(0, i * 64);
          g.lineTo(w, i * 64);
          g.stroke();
        }
        g.fillStyle = 'rgba(255,255,255,0.15)';
        for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) g.fillRect(x * 64 + 6, y * 64 + 6, 20, 6);
      } else if (style === 'books') {
        // Wainscot-like plain with faint texture.
      }
      // soft paper noise
      for (let i = 0; i < 900; i++) {
        g.fillStyle = `rgba(${rand() < 0.5 ? '255,255,255' : '90,60,40'},${rr(0.02, 0.05)})`;
        g.fillRect(rr(0, w), rr(0, h), 2, 2);
      }
    },
    { repeat },
  );
}

export function fabric(base, { stripes = null, checks = null, repeat = [1, 1], knit = false } = {}) {
  return paint(
    256,
    256,
    (g, w, h) => {
      g.fillStyle = hex(base);
      g.fillRect(0, 0, w, h);
      if (stripes) {
        g.fillStyle = hex(stripes);
        for (let y = 0; y < h; y += 64) g.fillRect(0, y, w, 20);
      }
      if (checks) {
        g.fillStyle = hex(checks) + '66';
        for (let y = 0; y < h; y += 64) g.fillRect(0, y, w, 32);
        for (let x = 0; x < w; x += 64) g.fillRect(x, 0, 32, h);
      }
      if (knit) {
        g.strokeStyle = 'rgba(255,255,255,0.12)';
        g.lineWidth = 2;
        for (let y = 0; y < h; y += 8)
          for (let x = 0; x < w; x += 8) {
            g.beginPath();
            g.moveTo(x, y);
            g.lineTo(x + 4, y + 6);
            g.lineTo(x + 8, y);
            g.stroke();
          }
      }
      for (let i = 0; i < 2500; i++) {
        g.fillStyle = `rgba(${rand() < 0.5 ? '255,255,255' : '0,0,0'},${rr(0.02, 0.06)})`;
        g.fillRect(rr(0, w), rr(0, h), 1.5, 1.5);
      }
    },
    { repeat },
  );
}

// Rug with border and a centre motif. drawCenter(g, w, h) optional.
export function rug(base, border, accent, drawCenter = null, size = [512, 340]) {
  return paint(size[0], size[1], (g, w, h) => {
    g.fillStyle = hex(border);
    roundRect(g, 0, 0, w, h, 40);
    g.fill();
    g.fillStyle = hex(base);
    roundRect(g, 18, 18, w - 36, h - 36, 30);
    g.fill();
    g.strokeStyle = hex(accent);
    g.lineWidth = 6;
    g.setLineDash([14, 10]);
    roundRect(g, 34, 34, w - 68, h - 68, 22);
    g.stroke();
    g.setLineDash([]);
    if (drawCenter) drawCenter(g, w, h);
    for (let i = 0; i < 5000; i++) {
      g.fillStyle = `rgba(${rand() < 0.5 ? '255,255,255' : '60,30,20'},${rr(0.02, 0.07)})`;
      g.fillRect(rr(0, w), rr(0, h), 2, 2);
    }
  });
}

export function brick(base = 0xb7826b, repeat = [4, 1]) {
  return paint(
    256,
    256,
    (g, w, h) => {
      g.fillStyle = '#8c6a5a';
      g.fillRect(0, 0, w, h);
      const bh = 32;
      for (let row = 0; row < h / bh; row++) {
        const off = row % 2 ? 32 : 0;
        for (let x = -64; x < w; x += 64) {
          const c = new THREE.Color(base).offsetHSL(rr(-0.02, 0.02), rr(-0.08, 0.05), rr(-0.08, 0.06));
          g.fillStyle = c.getStyle();
          roundRect(g, x + off + 2, row * bh + 2, 60, bh - 4, 4);
          g.fill();
        }
      }
    },
    { repeat },
  );
}

export function grass(repeat = [8, 8]) {
  return paint(
    256,
    256,
    (g, w, h) => {
      g.fillStyle = '#4c6b45';
      g.fillRect(0, 0, w, h);
      for (let i = 0; i < 3000; i++) {
        const c = new THREE.Color(0x5f8a52).offsetHSL(rr(-0.03, 0.03), rr(-0.1, 0.1), rr(-0.12, 0.08));
        g.strokeStyle = c.getStyle();
        g.lineWidth = rr(1, 2);
        const x = rr(0, w);
        const y = rr(0, h);
        g.beginPath();
        g.moveTo(x, y);
        g.lineTo(x + rr(-3, 3), y - rr(4, 9));
        g.stroke();
      }
    },
    { repeat },
  );
}

// Night sky for windows: gradient, stars and a moon.
export function nightSky(w = 512, h = 512, { moon = true } = {}) {
  return paint(w, h, (g) => {
    const grad = g.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, '#141a3a');
    grad.addColorStop(0.6, '#2b2f5e');
    grad.addColorStop(1, '#5a4a74');
    g.fillStyle = grad;
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 220; i++) {
      const r = rr(0.4, 1.6);
      g.fillStyle = `rgba(255,248,230,${rr(0.4, 1)})`;
      g.beginPath();
      g.arc(rr(0, w), rr(0, h * 0.85), r, 0, Math.PI * 2);
      g.fill();
    }
    if (moon) {
      const mx = w * 0.72;
      const my = h * 0.26;
      const glow = g.createRadialGradient(mx, my, 10, mx, my, 90);
      glow.addColorStop(0, 'rgba(255,240,200,0.5)');
      glow.addColorStop(1, 'rgba(255,240,200,0)');
      g.fillStyle = glow;
      g.fillRect(0, 0, w, h);
      g.fillStyle = '#fff4d6';
      g.beginPath();
      g.arc(mx, my, 30, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = '#2b2f5e';
      g.beginPath();
      g.arc(mx + 13, my - 8, 26, 0, Math.PI * 2);
      g.fill();
    }
    // distant hills and a few warm windows
    g.fillStyle = '#1d1c35';
    g.beginPath();
    g.moveTo(0, h);
    for (let x = 0; x <= w; x += 16) g.lineTo(x, h * 0.86 - Math.sin(x * 0.012) * 18 - Math.sin(x * 0.04) * 6);
    g.lineTo(w, h);
    g.fill();
    for (let i = 0; i < 6; i++) {
      g.fillStyle = 'rgba(255,200,120,0.85)';
      g.fillRect(rr(0, w), rr(h * 0.88, h * 0.95), 3, 3);
    }
  });
}

// Paper with handwriting, for notes and cards drawn in the 3D world.
export function paperTexture(
  text,
  {
    w = 256,
    h = 320,
    font = HAND_FONT,
    size = 20,
    color = '#4a3a33',
    bg = '#fbf3e4',
    title = null,
    lines = true,
    rotate = 0,
    center = false,
    stain = true,
  } = {},
) {
  return paint(w, h, (g) => {
    g.fillStyle = bg;
    g.fillRect(0, 0, w, h);
    if (lines) {
      g.strokeStyle = 'rgba(120,150,200,0.25)';
      g.lineWidth = 1;
      for (let y = 46; y < h; y += size * 1.35) {
        g.beginPath();
        g.moveTo(10, y);
        g.lineTo(w - 10, y);
        g.stroke();
      }
    }
    if (stain) {
      g.fillStyle = 'rgba(120,80,40,0.08)';
      g.beginPath();
      g.arc(w * 0.8, h * 0.82, 26, 0, Math.PI * 2);
      g.fill();
    }
    g.save();
    g.translate(w / 2, h / 2);
    g.rotate(rotate);
    g.translate(-w / 2, -h / 2);
    g.fillStyle = color;
    let y = 30;
    if (title) {
      g.font = `bold ${size * 1.1}px ${font}`;
      g.textAlign = 'center';
      g.fillText(title, w / 2, y + 6);
      y += size * 1.8;
    }
    g.font = `${size}px ${font}`;
    g.textAlign = center ? 'center' : 'left';
    const words = String(text).split(/(\s+)/);
    let line = '';
    const maxW = w - 30;
    const flush = () => {
      g.fillText(line.trim(), center ? w / 2 : 16, y);
      y += size * 1.35;
      line = '';
    };
    for (const word of words) {
      if (word.includes('\n')) {
        flush();
        continue;
      }
      if (g.measureText(line + word).width > maxW && line.trim()) flush();
      line += word;
    }
    if (line.trim()) flush();
    g.restore();
  });
}

// A small "letter tile" texture for fridge magnets.
export function magnetTexture(ch, color) {
  return paint(96, 96, (g, w, h) => {
    g.fillStyle = hex(color);
    g.fillRect(0, 0, w, h);
    g.fillStyle = '#ffffff';
    g.font = `bold 70px ${ROUND_FONT}`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(ch, w / 2, h / 2 + 4);
  });
}

// Generic text label texture (transparent background).
export function labelTexture(text, { w = 256, h = 128, font = ROUND_FONT, size = 64, color = '#ffffff', bg = null, bold = true } = {}) {
  return paint(w, h, (g) => {
    if (bg) {
      g.fillStyle = bg;
      g.fillRect(0, 0, w, h);
    }
    g.fillStyle = color;
    g.font = `${bold ? 'bold ' : ''}${size}px ${font}`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(text, w / 2, h / 2 + size * 0.05);
  });
}

// Soft round glow sprite used for lamps, sparkles and string lights.
let _glowTex = null;
export function glowTexture() {
  if (_glowTex) return _glowTex;
  _glowTex = paint(64, 64, (g, w, h) => {
    const grad = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    grad.addColorStop(0, 'rgba(255,255,255,1)');
    grad.addColorStop(0.25, 'rgba(255,255,255,0.6)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, w, h);
  });
  return _glowTex;
}

let _heartTex = null;
export function heartTexture() {
  if (_heartTex) return _heartTex;
  _heartTex = paint(64, 64, (g) => drawHeart(g, 32, 36, 40, '#ff8fa3'));
  return _heartTex;
}

let _petalTex = null;
export function petalTexture() {
  if (_petalTex) return _petalTex;
  _petalTex = paint(64, 64, (g) => {
    g.fillStyle = '#ffffff';
    g.beginPath();
    g.ellipse(32, 32, 12, 24, 0.4, 0, Math.PI * 2);
    g.fill();
  });
  return _petalTex;
}
