import { describe, it, expect, beforeEach } from 'vitest';
import { useStorage, readJSON } from '../src/engine/save.js';
import { parseVersion, isNewer, checkForUpdate, releasesUrl, UPDATE_KEY } from '../src/engine/updateCheck.js';

function memoryStorage() {
  const m = new Map();
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, String(v)),
    removeItem: (k) => m.delete(k),
  };
}

// A fake fetch that answers with the given release tag and counts its calls.
function fakeFetch(tag, { ok = true } = {}) {
  const f = async (url) => {
    f.calls.push(url);
    return { ok, json: async () => ({ tag_name: tag }) };
  };
  f.calls = [];
  return f;
}

const HOUR = 3600e3;

describe('update check: versions', () => {
  it('parses tags with or without a v', () => {
    expect(parseVersion('v1.2.3')).toEqual([1, 2, 3]);
    expect(parseVersion('10.0.1')).toEqual([10, 0, 1]);
    expect(parseVersion('nightly')).toBe(null);
    expect(parseVersion(undefined)).toBe(null);
  });

  it('compares number by number, not as text', () => {
    expect(isNewer('1.10.0', '1.9.0')).toBe(true);
    expect(isNewer('v2.0.0', '1.99.99')).toBe(true);
    expect(isNewer('1.0.0', '1.0.0')).toBe(false);
    expect(isNewer('1.0.0', '1.0.1')).toBe(false);
    expect(isNewer('junk', '1.0.0')).toBe(false);
  });
});

describe('update check: asking GitHub', () => {
  beforeEach(() => useStorage(memoryStorage()));

  it('reports a newer release with a link to the releases page', async () => {
    const fetchFn = fakeFetch('v1.1.0');
    const u = await checkForUpdate({ current: '1.0.0', fetchFn, now: 0 });
    expect(u).toEqual({ version: '1.1.0', url: releasesUrl() });
    expect(fetchFn.calls[0]).toContain('api.github.com/repos/');
  });

  it('stays quiet when this build is current or newer', async () => {
    expect(await checkForUpdate({ current: '1.1.0', fetchFn: fakeFetch('v1.1.0'), now: 0 })).toBe(null);
    useStorage(memoryStorage());
    expect(await checkForUpdate({ current: '2.0.0', fetchFn: fakeFetch('v1.1.0'), now: 0 })).toBe(null);
  });

  it('never throws: offline, error status, bad reply', async () => {
    const offline = async () => {
      throw new TypeError('Failed to fetch');
    };
    expect(await checkForUpdate({ current: '1.0.0', fetchFn: offline, now: 0 })).toBe(null);
    expect(await checkForUpdate({ current: '1.0.0', fetchFn: fakeFetch('v9.0.0', { ok: false }), now: 0 })).toBe(null);
    expect(await checkForUpdate({ current: '1.0.0', fetchFn: fakeFetch(null), now: 0 })).toBe(null);
    expect(await checkForUpdate({ current: '1.0.0', fetchFn: null, now: 0 })).toBe(null);
  });

  it('gives up on a slow reply', async () => {
    const hang = (url, { signal }) => new Promise((_, reject) => signal.addEventListener('abort', () => reject(new Error('aborted'))));
    expect(await checkForUpdate({ current: '1.0.0', fetchFn: hang, now: 0, timeoutMs: 20 })).toBe(null);
  });

  it('asks at most once an hour and remembers the answer', async () => {
    const fetchFn = fakeFetch('v1.2.0');
    await checkForUpdate({ current: '1.0.0', fetchFn, now: 0 });
    const again = await checkForUpdate({ current: '1.0.0', fetchFn, now: 0.5 * HOUR });
    expect(fetchFn.calls.length).toBe(1);
    expect(again?.version).toBe('1.2.0'); // still shown from the cache
    await checkForUpdate({ current: '1.0.0', fetchFn, now: 1.5 * HOUR });
    expect(fetchFn.calls.length).toBe(2);
    expect(readJSON(UPDATE_KEY)).toEqual({ at: 1.5 * HOUR, version: '1.2.0' });
  });

  it('a cached notice disappears once the player has the new build', async () => {
    await checkForUpdate({ current: '1.0.0', fetchFn: fakeFetch('v1.2.0'), now: 0 });
    expect(await checkForUpdate({ current: '1.2.0', fetchFn: fakeFetch('v1.2.0'), now: HOUR })).toBe(null);
  });
});
