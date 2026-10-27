// Asks GitHub whether a newer release of the game exists. The game works fully
// offline, so every failure (no network, timeout, rate limit, odd reply) just
// means "no update". The answer is cached in localStorage so GitHub is asked at
// most once every UPDATES.everyHours.
import { UPDATES } from '../config.js';
import { readJSON, writeJSON } from './save.js';

export const UPDATE_KEY = 'sundayNight.update.v1';

export const releasesUrl = (repo = UPDATES.repo) => `https://github.com/${repo}/releases/latest`;
const apiUrl = (repo) => `https://api.github.com/repos/${repo}/releases/latest`;

// Off in the desktop app (it updates itself), in the graphics test's runs
// (?probe) and in debug builds (browser tests, npm run dev) unless
// ?updatecheck is set.
export function updatesEnabled() {
  const q = new URLSearchParams(globalThis.location?.search ?? '');
  if (!UPDATES.check || globalThis.sundayNightApp?.desktop || q.has('probe')) return false;
  return !__DEBUG__ || q.has('updatecheck');
}

// 'v1.2.3' or '1.2.3' -> [1, 2, 3]; anything else -> null.
export function parseVersion(s) {
  const m = /^v?(\d+)\.(\d+)\.(\d+)/.exec(String(s ?? '').trim());
  return m ? m.slice(1).map(Number) : null;
}

export function isNewer(latest, current) {
  const a = parseVersion(latest);
  const b = parseVersion(current);
  if (!a || !b) return false;
  for (let i = 0; i < 3; i++) if (a[i] !== b[i]) return a[i] > b[i];
  return false;
}

async function fetchLatest(fetchFn, repo, timeoutMs) {
  const ctrl = typeof AbortController === 'function' ? new AbortController() : null;
  const timer = ctrl && setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetchFn(apiUrl(repo), { headers: { Accept: 'application/vnd.github+json' }, signal: ctrl?.signal });
    if (!res.ok) return null;
    const tag = (await res.json())?.tag_name;
    return parseVersion(tag) ? String(tag).replace(/^v/, '') : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

// Resolves to { version, url } when a newer release exists, otherwise null.
// Never rejects.
export async function checkForUpdate({
  current = __APP_VERSION__,
  fetchFn = globalThis.fetch,
  now = Date.now(),
  timeoutMs = 6000,
  repo = UPDATES.repo,
  everyHours = UPDATES.everyHours,
} = {}) {
  if (!UPDATES.check || typeof fetchFn !== 'function') return null;
  const cache = readJSON(UPDATE_KEY);
  let latest = cache && typeof cache.version === 'string' ? cache.version : null;
  const fresh = cache && typeof cache.at === 'number' && now - cache.at >= 0 && now - cache.at < everyHours * 3600e3;
  if (!fresh) {
    const got = await fetchLatest(fetchFn, repo, timeoutMs);
    if (got) {
      latest = got;
      writeJSON(UPDATE_KEY, { at: now, version: got });
    }
  }
  return latest && isNewer(latest, current) ? { version: latest, url: releasesUrl(repo) } : null;
}

// One check per page load, shared by every visit to the main menu.
let pending = null;
export function updateNotice() {
  if (!pending) pending = checkForUpdate();
  return pending;
}
