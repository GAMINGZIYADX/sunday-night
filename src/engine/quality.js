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
  /adreno[^0-9]*([2-5]\d\d|60\d|61[0-6])\b/i, // Adreno 200-616
  /powervr|vivante|videocore|imagination/i,
];

// Phone graphics chips that handle the full look at phone resolution (with
// the 60 fps cap in game.js), even though the phone may report only 4 GB:
// Adreno 618 and up (Redmi Note 12 Pro 4G, Pixel 4a...), Mali-G68/G7x,
// Mali-G610 and newer, Samsung Xclipse.
const GOOD_PHONE_GPU = [
  /adreno[^0-9]*(61[7-9]|6[2-9]\d|[7-9]\d\d)(?!\d)/i,
  /mali-g(6[89]|[7-9]\d)\b/i,
  /mali-g(6[1-9]\d|[7-9]\d\d)|immortalis|xclipse/i,
];

// One look at the graphics chip at startup: its name, and whether it has
// WebGL 2 (phones from before about 2015 often only have WebGL 1) or any
// WebGL at all.
function probe() {
  try {
    const c = document.createElement('canvas');
    const gl2 = c.getContext('webgl2');
    const gl = gl2 || c.getContext('webgl') || c.getContext('experimental-webgl');
    if (!gl) return { name: '', webgl: false, webgl2: false };
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const name = String(ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER));
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return { name, webgl: true, webgl2: !!gl2 };
  } catch {
    return { name: '', webgl: false, webgl2: false };
  }
}
const GPU = probe();

// Graphics test flags (they work in every build; src/gfxtest.js uses them):
// ?shadows=0|1 ?msaa=0|1 ?tonemap=0 ?ratio=1 ?webgl1=1 ?probe=1
export const FLAGS = new URLSearchParams(typeof location === 'undefined' ? '' : location.search);
const flag = (k) => (FLAGS.get(k) === '1' ? true : FLAGS.get(k) === '0' ? false : null);

export const WEBGL = GPU.webgl;
export const WEBGL2 = GPU.webgl2 && !FLAGS.has('webgl1');

export function gpuName() {
  return GPU.name;
}

// What 'auto' picks on this device.
export function autoQuality() {
  // deviceMemory is Chrome only; others report nothing.
  return pickQuality({ gpu: gpuName(), webgl2: WEBGL2, cores: navigator.hardwareConcurrency || 8, memory: navigator.deviceMemory || 8 });
}

// The rule itself (tests/quality.test.js).
export function pickQuality({ gpu, webgl2, cores, memory }) {
  if (!webgl2 || WEAK_GPU.some((re) => re.test(gpu))) return 'light';
  if (GOOD_PHONE_GPU.some((re) => re.test(gpu))) return memory <= 2 ? 'light' : 'full';
  if (cores <= 4 || memory <= 4) return 'light';
  return 'full';
}

function decide() {
  if (typeof location === 'undefined') return 'full'; // unit tests
  const q = new URLSearchParams(location.search).get('quality');
  if (q === 'light' || q === 'full') return q;
  const saved = readJSON(SETTINGS_KEY)?.graphics;
  if (saved === 'light' || saved === 'full') return saved;
  if (readJSON(SETTINGS_KEY)?.gfxFix >= 3) return 'light';
  return autoQuality();
}

export const QUALITY = decide();
export const LIGHT = QUALITY === 'light';

// Some phone drivers draw parts of the full look wrong (a Pixel 10 showed a
// white screen). Game._checkPicture notices and steps down, remembering the
// step for this device in the settings: 1 = no shadows, 2 = also no edge
// smoothing (MSAA), 3 = the full look doesn't work here, so light graphics.
export const GFX_FIX = typeof location === 'undefined' ? 0 : Number(readJSON(SETTINGS_KEY)?.gfxFix) || 0;
// The Pixel 10's PowerVR D-Series driver (Android 17) crashes on shadow
// shaders (three.js issue #34311), so Full starts without them there.
const SHADOW_BUG = /powervr.*(d-series|dxt)/i.test(GPU.name);
export const SHADOWS = flag('shadows') ?? (!LIGHT && GFX_FIX < 1 && !SHADOW_BUG);
export const MSAA = flag('msaa') ?? (!LIGHT && GFX_FIX < 2);
export const TONEMAP = flag('tonemap') ?? true;
export const MAX_RATIO = Number(FLAGS.get('ratio')) || 0; // 0: the usual caps (game.js)
export const PROBE = FLAGS.has('probe');
