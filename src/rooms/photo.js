import { drawTulip, hex, rr } from '../engine/textures.js';
import { COLORS } from '../config.js';

// The photo kept in the attic trunk. Any one picture (jpg, png or webp) in
// src/photo/ is built into the game file (Vite inlines it, so the single file
// still works offline). Without one, a drawing stands in: the two cats at a
// window under the moon.
const files = import.meta.glob('../photo/*.{jpg,jpeg,png,webp,JPG,JPEG,PNG,WEBP}', { eager: true, query: '?url', import: 'default' });
export const PHOTO_URL = Object.values(files)[0] || null;

let _image = null;
// Resolves to something drawable (an <img>, or the placeholder canvas).
export function photoImage() {
  if (_image) return _image;
  _image = new Promise((resolve) => {
    if (!PHOTO_URL) return resolve(placeholder());
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(placeholder());
    img.src = PHOTO_URL;
  });
  return _image;
}

export const sizeOf = (img) => [img.naturalWidth || img.width, img.naturalHeight || img.height];

// The stand-in picture, 600 x 750.
let _placeholder = null;
function placeholder() {
  if (_placeholder) return _placeholder;
  const w = 600;
  const h = 750;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d');
  const sky = g.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, '#1d2347');
  sky.addColorStop(0.65, '#4b4a7a');
  sky.addColorStop(1, '#8a6d8a');
  g.fillStyle = sky;
  g.fillRect(0, 0, w, h);
  for (let i = 0; i < 120; i++) {
    g.fillStyle = `rgba(255,248,230,${rr(0.3, 0.9)})`;
    g.beginPath();
    g.arc(rr(0, w), rr(0, h * 0.55), rr(0.6, 1.8), 0, Math.PI * 2);
    g.fill();
  }
  // The moon, softly glowing.
  const glow = g.createRadialGradient(410, 170, 20, 410, 170, 170);
  glow.addColorStop(0, 'rgba(255,240,200,0.45)');
  glow.addColorStop(1, 'rgba(255,240,200,0)');
  g.fillStyle = glow;
  g.fillRect(0, 0, w, h);
  g.fillStyle = '#fff3d4';
  g.beginPath();
  g.arc(410, 170, 62, 0, Math.PI * 2);
  g.fill();
  // The windowsill and the frame around the night.
  g.fillStyle = '#c99a6b';
  g.fillRect(0, h * 0.74, w, 26);
  g.fillStyle = '#8f6a4c';
  g.fillRect(0, h * 0.74 + 26, w, h);
  g.strokeStyle = '#f3e7d3';
  g.lineWidth = 22;
  g.strokeRect(11, 11, w - 22, h * 0.74 - 11);
  g.beginPath();
  g.moveTo(w / 2, 0);
  g.lineTo(w / 2, h * 0.74);
  g.stroke();
  // Two cats on the sill, side by side, looking up at the moon.
  const cat = (x, scale, body, chest) => {
    const y = h * 0.74;
    g.save();
    g.translate(x, y);
    g.scale(scale, scale);
    g.fillStyle = body;
    g.beginPath();
    g.ellipse(0, -70, 62, 78, 0, 0, Math.PI * 2);
    g.fill();
    g.beginPath();
    g.arc(4, -168, 46, 0, Math.PI * 2);
    g.fill();
    for (const ex of [-1, 1]) {
      g.beginPath();
      g.moveTo(4 + ex * 18, -200);
      g.lineTo(4 + ex * 40, -238);
      g.lineTo(4 + ex * 44, -186);
      g.fill();
    }
    // A tail curling around the paws.
    g.strokeStyle = body;
    g.lineWidth = 16;
    g.lineCap = 'round';
    g.beginPath();
    g.moveTo(50, -14);
    g.bezierCurveTo(110, -10, 100, 20, 30, 8);
    g.stroke();
    if (chest) {
      g.fillStyle = chest;
      g.beginPath();
      g.ellipse(6, -96, 26, 40, 0, 0, Math.PI * 2);
      g.fill();
    }
    g.restore();
  };
  cat(220, 0.95, '#d9a066', '#f3d9b0'); // Tchobin, the tabby
  cat(370, 0.9, '#2c2a30', '#f4f0ea'); // Zizo, the tuxedo
  // Tulips in a little pot at the end of the sill.
  g.fillStyle = hex(COLORS.blushDeep);
  g.fillRect(500, h * 0.74 - 52, 54, 52);
  drawTulip(g, 516, h * 0.74 - 120, 34, hex(COLORS.tulipBlue));
  drawTulip(g, 540, h * 0.74 - 108, 30, '#fbf8f2');
  _placeholder = c;
  return c;
}
