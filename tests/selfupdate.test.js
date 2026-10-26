import { describe, it, expect } from 'vitest';
import { buildVersion, validBuild, pickBuild, downloadUpdate, buildUrl, MIN_SIZE } from '../src/engine/selfUpdate.js';

// A stand-in for a real build: the version meta tag plus enough bulk.
const fakeBuild = (version, size = MIN_SIZE + 10) =>
  `<!doctype html><html><head><meta name="sunday-night-version" content="${version}">`.padEnd(size, ' ');

describe('self-update: checking a downloaded build', () => {
  it('reads the stamped version', () => {
    expect(buildVersion(fakeBuild('1.2.0'))).toBe('1.2.0');
    expect(buildVersion('<html>404: Not Found</html>')).toBe(null);
    expect(buildVersion(undefined)).toBe(null);
  });

  it('accepts only the right version at a sane size', () => {
    expect(validBuild(fakeBuild('1.2.0'), '1.2.0')).toBe(true);
    expect(validBuild(fakeBuild('1.1.0'), '1.2.0')).toBe(false);
    expect(validBuild(fakeBuild('1.2.0', 500), '1.2.0')).toBe(false);
    expect(validBuild(null, '1.2.0')).toBe(false);
  });
});

describe('self-update: which build runs at launch', () => {
  const stored = { version: '1.2.0', html: fakeBuild('1.2.0') };

  it('runs a stored build that is newer than the file', () => {
    expect(pickBuild({ stored, current: '1.1.0', pending: null })).toBe(stored);
  });

  it('keeps the file when it is as new or newer', () => {
    expect(pickBuild({ stored, current: '1.2.0', pending: null })).toBe(null);
    expect(pickBuild({ stored, current: '1.3.0', pending: null })).toBe(null);
  });

  it('skips a stored build that did not boot last time', () => {
    expect(pickBuild({ stored, current: '1.1.0', pending: '1.2.0' })).toBe(null);
    // A note left for some other version does not block this one.
    expect(pickBuild({ stored, current: '1.1.0', pending: '1.1.5' })).toBe(stored);
  });

  it('ignores missing or damaged stored builds', () => {
    expect(pickBuild({ stored: null, current: '1.1.0', pending: null })).toBe(null);
    expect(pickBuild({ stored: { version: '1.2.0', html: 'oops' }, current: '1.1.0', pending: null })).toBe(null);
  });
});

describe('self-update: downloading', () => {
  it('asks GitHub for the tagged build', async () => {
    const calls = [];
    const fetchFn = async (url) => {
      calls.push(url);
      return { ok: false };
    };
    expect(await downloadUpdate('1.2.0', { fetchFn })).toBe(false);
    expect(calls).toEqual([buildUrl('1.2.0')]);
    expect(calls[0]).toMatch(/raw\.githubusercontent\.com\/.+\/v1\.2\.0\/dist\/index\.html$/);
  });

  it('never throws: offline, wrong file, no fetch', async () => {
    const offline = async () => {
      throw new TypeError('Failed to fetch');
    };
    const wrong = async () => ({ ok: true, text: async () => fakeBuild('1.1.0') });
    expect(await downloadUpdate('1.2.0', { fetchFn: offline })).toBe(false);
    expect(await downloadUpdate('1.2.0', { fetchFn: wrong })).toBe(false);
    expect(await downloadUpdate('1.2.0', { fetchFn: null })).toBe(false);
  });

  it('a right build with nowhere to keep it is a failure, not a crash', async () => {
    // Node has no IndexedDB, like a browser that blocks it.
    const right = async () => ({ ok: true, text: async () => fakeBuild('1.2.0') });
    expect(await downloadUpdate('1.2.0', { fetchFn: right })).toBe(false);
  });
});
