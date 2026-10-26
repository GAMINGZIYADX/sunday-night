import { chromium } from 'playwright-core';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const CANDIDATES = ['/opt/pw-browsers/chromium-1194/chrome-linux/chrome', '/opt/pw-browsers/chromium'];

// CHROME_PATH=/path/to/chrome uses a Chromium of your choice instead.
export async function launch() {
  const executablePath = process.env.CHROME_PATH || CANDIDATES.find((p) => existsSync(p) && !p.endsWith('chromium')) || undefined;
  return chromium.launch({
    executablePath,
    args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'],
  });
}

export function fileUrl(rel, query = '') {
  return pathToFileURL(path.resolve(rel)).href + query;
}

// Opens the game page and records console problems.
export async function openGame(browser, url, { width = 1280, height = 720 } = {}) {
  const page = await browser.newPage({ viewport: { width, height } });
  const problems = [];
  page.on('console', (m) => {
    if (m.type() === 'error' || m.type() === 'warning') problems.push(`[${m.type()}] ${m.text()}`);
  });
  page.on('pageerror', (e) => problems.push(`[pageerror] ${e.message}`));
  await page.goto(url);
  await page.waitForSelector('.start-hint', { timeout: 30000 });
  return { page, problems };
}

export async function startNew(page) {
  await page.click('.start-hint');
  await page.waitForSelector('.menu .btn');
  await page.getByRole('button', { name: 'New game' }).click();
  const confirm = page.getByRole('button', { name: 'Yes' });
  if (await confirm.count()) await confirm.click();
  await page.waitForFunction(() => window.__game && window.__game.state() === 'playing');
  await page.waitForTimeout(400);
}

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
