// The strawberry shortcake, baked like a player would: open the ingredients on
// the kitchen counter and do every step with real pointer gestures (tap, hold
// to pour, swipe, scribble, drag). Reloads halfway to check finished steps
// are kept, then checks the cake find, the cake on the table and the journal.
//   node e2e/bake.mjs [screenshot dir] [--phone]   (--phone: 800x360, touch)
import { launch, fileUrl, openGame, startNew } from './lib.mjs';
import { BAKE_STEPS, FINDS } from '../src/config.js';

const args = process.argv.slice(2);
const PHONE = args.includes('--phone');
const SHOTS = args.find((a) => !a.startsWith('--')) || null;
const log = (...a) => console.log('  ·', ...a);
const fail = (msg) => {
  throw new Error(msg);
};

const browser = await launch();
const URL = fileUrl('dist-debug/index.html', `?debug=1&nolock=1&dtmax=0.25&quality=light${PHONE ? '&touch=1' : ''}`);
const size = PHONE ? { width: 800, height: 360 } : { width: 1280, height: 720 };
const { page, problems } = await openGame(browser, URL, size);
const ev = (fn, arg) => page.evaluate(fn, arg);
const waitFor = (fn, arg, timeout = 30000) => page.waitForFunction(fn, arg, { timeout, polling: 100 });
let shotN = 0;
const shot = async (name) =>
  SHOTS && page.screenshot({ path: `${SHOTS}/bake-${PHONE ? 'phone-' : ''}${String(++shotN).padStart(2, '0')}-${name}.png` });
const text = (sel) => page.locator(sel).first().textContent();

// The hand: a mouse, or (--phone) a finger, through Chrome's touch events, so
// the game stays in touch mode (any mouse use switches it back to mouse).
const cdp = PHONE ? await page.context().newCDPSession(page) : null;
if (cdp) await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
const finger = (type, x, y) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y }] });
const hand = {
  at: { x: 0, y: 0 },
  pressed: false,
  async move(x, y, { steps = 1 } = {}) {
    if (!PHONE) return page.mouse.move(x, y, { steps });
    const from = this.at;
    for (let i = 1; i <= steps && this.pressed; i++)
      await finger('touchMove', from.x + ((x - from.x) * i) / steps, from.y + ((y - from.y) * i) / steps);
    this.at = { x, y };
  },
  async down() {
    if (!PHONE) return page.mouse.down();
    this.pressed = true;
    await finger('touchStart', this.at.x, this.at.y);
  },
  async up() {
    if (!PHONE) return page.mouse.up();
    this.pressed = false;
    await finger('touchEnd');
  },
  async click(sel) {
    if (!PHONE) return page.locator(sel).click();
    const p = await mid(sel);
    await this.move(p.x, p.y);
    await this.down();
    await this.up();
  },
};

// The middle of an element on screen.
async function mid(sel, i = 0) {
  const b = await page.locator(sel).nth(i).boundingBox();
  if (!b) fail(`nothing at ${sel}`);
  return { x: b.x + b.width / 2, y: b.y + b.height / 2, w: b.width, h: b.height };
}
const svg = '.bake-stage .bk-svg';
async function tap(sel, i = 0) {
  const p = await mid(sel, i);
  await hand.move(p.x, p.y);
  await hand.down();
  await hand.up();
}
// Waits for the task to change (the label, or the step line, moves on).
async function nextTask(before) {
  await waitFor(
    ([b]) => `${document.querySelector('.bk-step')?.textContent}|${document.querySelector('.bk-label')?.textContent}` !== b,
    [before],
    20000,
  ).catch(() => fail(`stuck on "${before}"`));
}
const where = () => ev(() => `${document.querySelector('.bk-step')?.textContent}|${document.querySelector('.bk-label')?.textContent}`);

// Opens the baking screen from the counter.
async function openBench(expect) {
  const prompt = await ev(() => {
    const g = window.__game;
    g.teleport(2.15, -20.1, 0, 0);
    const h = g.lookAt(3.1, 0.95, -20.1);
    return h ? (typeof h.prompt === 'function' ? h.prompt() : h.prompt) : null;
  });
  if (!prompt || !prompt.includes(expect)) fail(`at the counter: expected "${expect}", saw "${prompt}"`);
  await ev(() => window.__game.use());
}

// Does the current task the way a hand would.
async function doTask(stepIndex, taskIndex) {
  const step = BAKE_STEPS[stepIndex];
  const t = step.tasks[taskIndex];
  const before = await where();
  switch (t.kind) {
    case 'dial': {
      // Drag the knob a little, then the arrows to the mark.
      const k = await mid(`${svg} [data-k="knob"]`);
      await hand.move(k.x, k.y);
      await hand.down();
      await hand.move(k.x - k.w, k.y - k.h * 0.2, { steps: 4 });
      await hand.up();
      for (let i = 0; i < 40 && (await where()) === before; i++) {
        const shown = Number((await text(`${svg} .bk-text`)).split(' ')[0]);
        if (shown === t.target) break;
        await hand.click(shown < t.target ? '.bk-plus' : '.bk-minus');
      }
      break;
    }
    case 'swipe':
      for (let i = 0; i < t.count; i++) {
        const c = await mid(`${svg} [data-k="cut"]`, 0);
        await hand.move(c.x - c.w * 1.4, c.y);
        await hand.down();
        await hand.move(c.x + c.w * 1.4, c.y, { steps: 8 });
        await hand.up();
      }
      break;
    case 'taps':
      for (let i = 0; i < (t.count ?? 2) + 1 && (await where()) === before; i++) {
        await tap(`${svg} [data-k="tool"]`);
        await page.waitForTimeout(120);
      }
      break;
    case 'tapEach':
      for (let i = 0; i < t.count; i++) await tap(`${svg} [data-k="spot"]`, 0);
      break;
    case 'pour': {
      const p = await mid(`${svg} [data-k="source"]`);
      await hand.move(p.x, p.y);
      await hand.down();
      const target = Number(t.label.match(/(\d+)/)[1]);
      await waitFor(([v]) => Number(document.querySelector('.bk-readout')?.getAttribute('data-value')) >= v, [target - t.tolerance / 2], 30000);
      await hand.up();
      break;
    }
    case 'scribble': {
      const b = await mid(`${svg} [data-k="bowl"]`);
      const r = Math.min(b.w, b.h) * 0.22;
      await hand.move(b.x + r, b.y);
      await hand.down();
      for (let n = 0; n < 60 && (await where()) === before; n++) {
        for (let a = 1; a <= 12; a++) await hand.move(b.x + Math.cos((a / 12) * Math.PI * 2) * r, b.y + Math.sin((a / 12) * Math.PI * 2) * r * 0.5);
      }
      await hand.up();
      break;
    }
    case 'drag':
      for (const [n, id] of t.items.entries()) {
        // Once, try the top half first: it should wait its turn.
        if (t.id === 'stack' && n === 1) {
          await dragTo(`${svg} [data-k="item"][data-i="top"]`, `${svg} [data-k="plate"]`);
          const said = await text('.pz-msg');
          if (!/First/.test(said)) fail(`a layer out of order said "${said}"`);
          log('a layer out of order waits its turn');
        }
        await dragTo(`${svg} [data-k="item"][data-i="${id}"]`, `${svg} [data-k="${t.id === 'tray' ? 'door' : 'plate'}"]`);
      }
      break;
    case 'wait':
      if (t.action) {
        await hand.click('.bk-act');
        const said = await text('.pz-msg');
        if (said !== t.early) fail(`taking them out early said "${said}"`);
        log('too early: they stay in');
        await page.waitForTimeout(t.seconds * 1000 + 500);
        // Golden now: one press takes them out (wait for the next task).
        for (let i = 0; i < 10; i++) {
          await hand.click('.bk-act');
          const moved = await waitFor(
            ([b]) => `${document.querySelector('.bk-step')?.textContent}|${document.querySelector('.bk-label')?.textContent}` !== b,
            [before],
            2000,
          ).then(
            () => true,
            () => false,
          );
          if (moved) break;
        }
      }
      break;
  }
  await nextTask(before);
}
async function dragTo(from, to) {
  const a = await mid(from);
  const b = await mid(to);
  await hand.move(a.x, a.y);
  await hand.down();
  await hand.move(b.x, b.y, { steps: 10 });
  await hand.up();
  await page.waitForTimeout(150);
}

let ok = false;
try {
  await startNew(page);
  await page.waitForTimeout(3500); // the wake-up (eyes rise from the pillow)
  console.log(`Baking${PHONE ? ' (phone size, touch)' : ''}`);
  await ev(() => window.__game.unlockThrough(2));
  await openBench('Bake');
  await waitFor(() => window.__game.modal() === 'bake');
  if (PHONE) {
    // Starting the game used the mouse: a touch switches back to touch
    // controls (and wording), which the screen shows the next time it opens.
    await hand.click('.card.bake h2');
    await hand.click('.card.bake .close-x');
    await waitFor(() => !window.__game.modal());
    await openBench('Bake');
    await waitFor(() => window.__game.modal() === 'bake');
    const help = await ev(() => [...document.querySelectorAll('.card.bake .pz-side > p.note-small')].pop()?.textContent);
    if (!/Tap/.test(help)) fail(`touch wording is missing: "${help}"`);
  }
  const half = 4;
  for (let i = 0; i < BAKE_STEPS.length; i++) {
    if (i === half) {
      // Leave and reload: finished steps are kept.
      if ((await ev(() => window.__game.gs.data.bake.step)) !== half) fail('steps were not saved');
      await page.reload();
      await page.waitForSelector('.start-hint');
      await page.click('.start-hint');
      await page.waitForSelector('.menu .btn');
      await page.getByRole('button', { name: 'Continue' }).click();
      await waitFor(() => window.__game?.state() === 'playing');
      await openBench('Bake');
      await waitFor(() => window.__game.modal() === 'bake');
      const line = await text('.bk-step');
      if (!line.includes(`${half + 1}`)) fail(`after a reload the screen says "${line}"`);
      log(`reloaded after ${half} steps: carries on at "${line}"`);
    }
    for (let k = 0; k < BAKE_STEPS[i].tasks.length; k++) {
      if (k === 0) await shot(BAKE_STEPS[i].id);
      await doTask(i, k);
    }
    log(`${i + 1}. ${BAKE_STEPS[i].title}`);
  }
  await waitFor(() => window.__game.gs.bakeDone());
  await shot('done');
  if (!(await ev(() => window.__game.gs.hasFind('cake')))) fail('the cake is not a find');
  await ev(() => window.__game.closeModals());
  // The cake on the table, and the counter now offers the recipe.
  await waitFor(() => window.__game.game.rooms[2] && window.__game.gs.hasFind('cake'));
  const onTable = await waitFor(
    () => {
      let seen = false;
      window.__game.game.roomGroups[2].traverse((o) => {
        if (o.userData.dynamic && o.visible && o.position.distanceTo(new window.__game.THREE.Vector3(-0.6, 0.749, -18.65)) < 0.05) seen = true;
      });
      return seen;
    },
    null,
    10000,
  ).then(
    () => true,
    () => false,
  );
  if (!onTable) {
    const near = await ev(() =>
      window.__game.game.roomGroups[2].children
        .filter((o) => o.userData.dynamic && o.position.distanceTo(new window.__game.THREE.Vector3(-0.6, 0.749, -18.65)) < 0.5)
        .map((o) => `${o.position.toArray().map((v) => v.toFixed(3))} visible=${o.visible}`),
    );
    fail(`no shortcake on the kitchen table (near it: ${near.join('; ') || 'nothing'}); console: ${problems.join(' | ')}`);
  }
  await ev(() => {
    const g = window.__game;
    g.teleport(-0.6, -17.6, 0, 0);
    g.lookAt(-0.6, 0.8, -18.65);
  });
  await page.waitForTimeout(800);
  await shot('table');
  await openBench('recipe');
  await waitFor(() => window.__game.modal() !== null);
  await ev(() => window.__game.closeModals());
  // The journal counts it.
  await ev(() => window.__game.game.openJournal());
  const heads = await page.locator('.journal h3').allTextContents();
  const finds = heads.find((h) => /\d+\/\d+/.test(h) && h.includes(`/${FINDS.length}`));
  if (!finds || !finds.includes(`1/${FINDS.length}`)) fail(`journal finds heading: ${heads.join(' | ')}`);
  log(`journal: ${finds.trim()}`);
  await ev(() => window.__game.closeModals());

  if (problems.length) fail(`console problems:\n${problems.join('\n')}`);
  ok = true;
} catch (e) {
  console.error('  ✗', e.message);
  await shot('failure');
} finally {
  await browser.close();
}
console.log(ok ? 'BAKE PASSED' : 'BAKE FAILED');
process.exitCode = ok ? 0 : 1;
