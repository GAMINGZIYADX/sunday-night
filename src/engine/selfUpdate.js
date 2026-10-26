// Self-updating single file. "Update now" downloads the newer build from the
// release tag on GitHub and keeps it in IndexedDB. On every launch, before the
// game starts, the file looks there: if a newer build is stored it writes that
// build over its own page, so the player always runs the newest version (also
// offline) while the file on disk stays as it was. Same page, same storage, so
// saves and settings carry over.
//
// Crash guard: the swap notes the version it is about to run; the new build
// clears the note once it has booted. A note still there on the next launch
// means that build never booted, so it is thrown away.
import { UPDATES } from '../config.js';
import { isNewer, parseVersion } from './updateCheck.js';

const DB_NAME = 'sundayNight';
const STORE = 'builds';
const KEY = 'latest';
export const PENDING_KEY = 'sundayNight.update.pending';
export const MIN_SIZE = 200000; // the real game is ~800 KB; anything tiny is an error page

export const buildUrl = (version, repo = UPDATES.repo) => `https://raw.githubusercontent.com/${repo}/v${version}/dist/index.html`;

// The version stamped into a build by vite.config.js, or null.
export function buildVersion(html) {
  const m = /<meta name="sunday-night-version" content="([^"]+)"/.exec(String(html ?? '').slice(0, 4000));
  return m ? m[1] : null;
}

// Is this downloaded text really the game build for `version`?
export function validBuild(html, version) {
  return typeof html === 'string' && html.length > MIN_SIZE && buildVersion(html) === version && !!parseVersion(version);
}

// Which stored build (if any) should replace the running one.
export function pickBuild({ stored, current, pending }) {
  if (!stored || !validBuild(stored.html, stored.version)) return null;
  if (!isNewer(stored.version, current)) return null;
  if (pending === stored.version) return null; // it did not boot last time
  return stored;
}

// ------------------------------------------------------------- storage (I/O)
let local = null;
function ls() {
  if (local) return local;
  try {
    local = globalThis.localStorage || null;
  } catch {
    local = null;
  }
  return local;
}
// For tests: swap in an in-memory localStorage.
export function useLocal(s) {
  local = s;
}
const getPending = () => {
  try {
    return ls()?.getItem(PENDING_KEY) ?? null;
  } catch {
    return null;
  }
};
const setPending = (v) => {
  try {
    if (v) ls()?.setItem(PENDING_KEY, v);
    else ls()?.removeItem(PENDING_KEY);
  } catch {
    /* storage unavailable */
  }
};

function openDb() {
  return new Promise((resolve, reject) => {
    const idb = globalThis.indexedDB;
    if (!idb) return reject(new Error('no IndexedDB'));
    const q = idb.open(DB_NAME, 1);
    q.onupgradeneeded = () => q.result.createObjectStore(STORE);
    q.onsuccess = () => resolve(q.result);
    q.onerror = () => reject(q.error);
  });
}
async function dbDo(mode, fn) {
  const db = await openDb();
  try {
    return await new Promise((resolve, reject) => {
      const t = db.transaction(STORE, mode);
      const q = fn(t.objectStore(STORE));
      t.oncomplete = () => resolve(q?.result);
      t.onerror = () => reject(t.error);
      t.onabort = () => reject(t.error);
    });
  } finally {
    db.close();
  }
}
const readStored = () => dbDo('readonly', (s) => s.get(KEY)).catch(() => null);
const writeStored = (rec) => dbDo('readwrite', (s) => s.put(rec, KEY));
const clearStored = () => dbDo('readwrite', (s) => s.delete(KEY)).catch(() => {});

// Can this browser keep a downloaded build? (IndexedDB can be blocked.)
export async function canSelfUpdate() {
  try {
    (await openDb()).close();
    return true;
  } catch {
    return false;
  }
}

// ------------------------------------------------------------------ launch
// Runs before the game is created. Resolves true when it has replaced the page
// with a newer stored build (the caller must then do nothing more).
export async function bootStored(current = __APP_VERSION__) {
  const stored = await readStored();
  if (!stored) return false;
  const pending = getPending();
  const pick = pickBuild({ stored, current, pending });
  if (!pick) {
    // Failed to boot, or the file itself is now as new: drop the stored copy.
    if (pending === stored.version || !isNewer(stored.version, current)) {
      await clearStored();
      setPending(null);
    }
    return false;
  }
  setPending(pick.version);
  delete globalThis.__THREE__; // three.js warns if it sees an earlier copy
  document.open();
  document.write(pick.html);
  document.close();
  return true;
}

// The running build got far enough to show the game: it works.
export function markBooted() {
  setPending(null);
}

// Downloads and stores the build for `version`. Resolves true on success,
// never rejects.
export async function downloadUpdate(version, { fetchFn = globalThis.fetch, timeoutMs = 20000 } = {}) {
  if (typeof fetchFn !== 'function') return false;
  const ctrl = typeof AbortController === 'function' ? new AbortController() : null;
  const timer = ctrl && setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetchFn(buildUrl(version), { cache: 'no-store', signal: ctrl?.signal });
    if (!res.ok) return false;
    const html = await res.text();
    if (!validBuild(html, version)) return false;
    await writeStored({ version, html, at: Date.now() });
    setPending(null);
    return true;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}
