// Try "Update now" by hand without publishing anything: opens dist/index.html
// in a visible Chromium where GitHub seems to have version 9.9.9 (both replies
// are faked here, the newer build is this one with its version changed).
// Close the window to stop. Storage is thrown away afterwards.
//
//   npm run build
//   node scripts/try-update.mjs
import { readFileSync } from 'node:fs';
import { chromium } from 'playwright-core';
import { fileUrl } from '../e2e/lib.mjs';

const NEXT = '9.9.9';
const current = JSON.parse(readFileSync('package.json', 'utf8')).version;
const nextHtml = readFileSync('dist/index.html', 'utf8').replaceAll(`"${current}"`, `"${NEXT}"`);

const browser = await chromium.launch({ headless: false, executablePath: process.env.CHROME_PATH || undefined, args: ['--start-maximized'] });
const page = await browser.newPage({ viewport: null });
await page.route('https://api.github.com/**', (route) =>
  route.fulfill({ status: 200, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: `{"tag_name":"v${NEXT}"}` }),
);
await page.route('https://raw.githubusercontent.com/**', (route) => {
  console.log('  · the game is downloading the update');
  route.fulfill({ status: 200, contentType: 'text/plain', headers: { 'Access-Control-Allow-Origin': '*' }, body: nextHtml });
});
await page.goto(fileUrl('dist/index.html'));
console.log(`Opened ${current}. Click to start: the menu offers ${NEXT}. Click "Update now".`);
console.log('Afterwards, reload (F5): it keeps running 9.9.9. Close the window to finish.');
await new Promise((resolve) => page.on('close', resolve));
await browser.close();
