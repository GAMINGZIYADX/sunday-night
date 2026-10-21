// localStorage persistence, wrapped so that a blocked or full storage never
// breaks the game. Also handles the export/import backup code.

export const SAVE_KEY = 'sundayNight.save.v2';
export const SETTINGS_KEY = 'sundayNight.settings.v1';

let storage = null;
function store() {
  if (storage) return storage;
  try {
    storage = globalThis.localStorage || null;
  } catch {
    storage = null;
  }
  return storage;
}

// For tests: swap in an in-memory storage.
export function useStorage(s) {
  storage = s;
}

export function readJSON(key) {
  try {
    const raw = store()?.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function writeJSON(key, value) {
  try {
    store()?.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function removeKey(key) {
  try {
    store()?.removeItem(key);
  } catch {
    /* storage unavailable: nothing to remove */
  }
}

export function saveGame(gameState) {
  return writeJSON(SAVE_KEY, gameState.serialize());
}

export function loadSave() {
  const obj = readJSON(SAVE_KEY);
  return obj && typeof obj === 'object' ? obj : null;
}

export function hasSave() {
  const s = loadSave();
  return !!(s && s.version);
}

export function clearSave() {
  removeKey(SAVE_KEY);
}

// ---- backup code --------------------------------------------------------
// Format: "SN1." + base64url(deflate(json)), or "SN1j." + base64url(json) when
// the browser has no CompressionStream.

function toB64url(bytes) {
  let s = '';
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function fromB64url(str) {
  const b = atob(str.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((str.length + 3) % 4));
  const out = new Uint8Array(b.length);
  for (let i = 0; i < b.length; i++) out[i] = b.charCodeAt(i);
  return out;
}
async function pipe(bytes, stream) {
  const res = new Response(new Blob([bytes]).stream().pipeThrough(stream));
  return new Uint8Array(await res.arrayBuffer());
}

export async function exportCode(obj) {
  const json = new TextEncoder().encode(JSON.stringify(obj));
  if (typeof CompressionStream === 'function') {
    try {
      return 'SN1.' + toB64url(await pipe(json, new CompressionStream('deflate-raw')));
    } catch {
      /* fall through to the uncompressed form */
    }
  }
  return 'SN1j.' + toB64url(json);
}

export async function importCode(code) {
  try {
    code = String(code).trim().replace(/\s+/g, '');
    let bytes;
    if (code.startsWith('SN1.')) {
      bytes = await pipe(fromB64url(code.slice(4)), new DecompressionStream('deflate-raw'));
    } else if (code.startsWith('SN1j.')) {
      bytes = fromB64url(code.slice(5));
    } else return null;
    const obj = JSON.parse(new TextDecoder().decode(bytes));
    return obj && typeof obj === 'object' ? obj : null;
  } catch {
    return null;
  }
}
