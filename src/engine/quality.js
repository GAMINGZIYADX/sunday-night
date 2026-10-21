import { readJSON, SETTINGS_KEY } from './save.js';

// Graphics quality, decided once at startup (before anything is built):
//   'full'  - soft shadows, physically based materials, edge smoothing
//   'light' - for weak tablets and older PCs: simple lit materials, no
//             shadows, no edge smoothing, lower resolution, fewer tulips
// The player's choice lives in the settings ('auto', 'full' or 'light');
// 'auto' looks at the graphics chip and the processor. `?quality=light` or
// `?quality=full` overrides everything (handy for testing).

// Graphics chips that struggle with the full look.
const WEAK_GPU = [
  /swiftshader|llvmpipe|softpipe|software|microsoft basic render/i,
  /intel.*\b(hd|uhd)\b(?!.*\bxe\b)/i, // Intel HD / UHD (not Iris Xe)
  /intel.*(atom|celeron|pentium|bay ?trail|cherry ?trail|gemini ?lake|apollo ?lake|jasper ?lake)/i,
  /mali-(4|t|g[1-5]\d\b)/i, // Mali-400/T-series/G31..G57
  /adreno[^0-9]*([2-5]\d\d|6[0-3]\d)\b/i, // Adreno 200-639
  /powervr|vivante|videocore|imagination/i,
];

export function gpuName() {
  try {
    const c = document.createElement('canvas');
    const gl = c.getContext('webgl2') || c.getContext('webgl');
    if (!gl) return '';
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const name = String(ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER));
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return name;
  } catch {
    return '';
  }
}

// What 'auto' picks on this device.
export function autoQuality() {
  const gpu = gpuName();
  if (WEAK_GPU.some((re) => re.test(gpu))) return 'light';
  const cores = navigator.hardwareConcurrency || 8;
  const memory = navigator.deviceMemory || 8; // Chrome only; others report nothing
  if (cores <= 4 || memory <= 4) return 'light';
  return 'full';
}

function decide() {
  const q = new URLSearchParams(location.search).get('quality');
  if (q === 'light' || q === 'full') return q;
  const saved = readJSON(SETTINGS_KEY)?.graphics;
  if (saved === 'light' || saved === 'full') return saved;
  return autoQuality();
}

export const QUALITY = decide();
export const LIGHT = QUALITY === 'light';
