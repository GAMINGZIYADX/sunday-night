import { el, button, TULIP_SVG } from './dom.js';
import { card } from './manager.js';
import { showClue } from './screens.js';
import { BAKE_STEPS, BAKE_ITEMS, CLUES, LABELS } from '../config.js';
import { fill } from '../engine/text.js';
import * as R from '../bake/recipe.js';
import * as A from './bakeArt.js';

// The baking screen: the strawberry shortcake, one real step at a time
// (BAKE_STEPS in config.js; the rules in bake/recipe.js). Every task is one
// gesture on an SVG scene: tap, hold to pour, swipe to cut, scribble to stir,
// drag. Finished steps are saved (gs.bakeStep); a half-done step is not.

const { C } = A;

// What each task shows, by "step.task": the bowl's colours, the tool, labels.
const LOOK = {
  'macerate.sugar': { tool: 'spoon', label: 'Sugar', bowl: C.berry, lumps: 10 },
  'macerate.toss': { bowl: C.berry, bowl2: C.berryDark, lumps: 10 },
  'dry.flour': { source: 'bag', label: 'Flour', bowl: null },
  'dry.bakingPowder': { tool: 'spoon', label: 'Baking powder', bowl: C.flour },
  'dry.sugar': { tool: 'spoon', label: 'Sugar', bowl: C.flour },
  'dry.salt': { tool: 'spoon', label: 'Salt', bowl: C.flour },
  'dry.whisk': { bowl: C.flour, bowl2: '#f6efe0' },
  'butter.cubes': { butter: true },
  'butter.rub': { bowl: C.flour, bowl2: '#f3e3bd', lumps: 6, lumps2: 22 },
  'milk.milk': { source: 'jug', label: 'Milk', bowl: '#f3e3bd', lumps: 22 },
  'milk.stir': { bowl: '#f3e3bd', bowl2: C.dough, lumps: 22, lumps2: 4 },
  'shape.pat': { tool: 'hand', dough: true },
  'shape.brush': { tool: 'brush', tray: C.pale },
  'shape.sprinkle': { tool: 'shaker', tray: C.pale },
  'cream.cream': { source: 'carton', label: 'Cream', bowl: null },
  'cream.sugar': { tool: 'spoon', label: 'Sugar', bowl: C.cream },
  'cream.vanilla': { tool: 'spoon', label: 'Vanilla', bowl: C.cream },
  'cream.whip': { bowl: C.milk, bowl2: C.cream, peaks: 4 },
  'cool.split': { split: true },
};

const OVEN = { x: 115, y: 18 };
const BOWL = { x: 250, y: 150, w: 150 };

export function bakeOverlay(game) {
  const gs = game.gs;
  const audio = game.audio;
  const svg = A.s('svg', { viewBox: `0 0 ${A.W} ${A.H}`, class: 'bk-svg' });
  const stage = el('div.bake-stage', [svg]);
  const stepLine = el('div.bk-step');
  const title = el('h3.bk-title');
  const label = el('p.bk-label');
  const why = el('p.note-small.bk-why');
  const msg = el('div.pz-msg');
  const taskTools = el('div.pz-tools.bk-task-tools');
  let m;
  const close = () => game.modals.close(m);
  const hint = () => {
    if (st) msg.textContent = st.step.hint;
  };
  const hintBtn = button(LABELS.hint, hint, 'small');
  const tools = el('div.pz-tools', [hintBtn, button(LABELS.bakeRecipe, () => showClue(game, 'bake'), 'small'), button(LABELS.close, close, 'small')]);
  const side = el('div.pz-side', [
    el('div.pz-head', { html: TULIP_SVG('#e04a5a', 26) }, [el('h2', CLUES.bake.title)]),
    stepLine,
    title,
    label,
    why,
    msg,
    taskTools,
    tools,
    el('p.note-small', { style: { textAlign: 'center' } }, LABELS.bakeHelp),
  ]);
  const c = card(null, [el('div.pz-main', [stage]), side], { cls: 'pz.bake', onClose: close });

  let st = gs.bakeDone() ? null : R.newStep(gs.data.bake.step);
  let busy = false; // between a finished task and the next
  let timer = 0;
  let raf = 0;
  let last = 0;
  let hand = null; // what the pointer is doing: { kind, ... }

  const task = () => R.currentTask(st);
  const key = () => `${st.step.id}.${task().id}`;
  const look = () => LOOK[key()] || {};

  // ------------------------------------------------------------- drawing
  function draw() {
    svg.replaceChildren(A.backdrop());
    if (!st) return drawFinished();
    const t = task();
    const s = st.state;
    const L = look();
    const add = (n) => n && svg.appendChild(n);
    switch (t.kind) {
      case 'dial': {
        const span = (s.value - t.min) / (t.max - t.min);
        const timerSet = t.id === 'timer';
        add(
          A.oven(OVEN.x, OVEN.y, {
            on: timerSet,
            inside: timerSet ? A.tray(OVEN.x + 25, OVEN.y + 100, C.pale) : null,
            display: `${s.value} ${t.unit}`,
            knobAngle: -135 + span * 270,
          }),
        );
        break;
      }
      case 'swipe': {
        add(A.board(40, 112, 320, 92));
        if (L.butter || t.id === 'cubes') {
          add(A.butter(120, 128, 160, 52, t.count, s.hit));
        } else for (let i = 0; i < t.count; i++) add(A.berry(swipeTarget(t, i).cx, 158, 15, { cut: s.hit.includes(i) }));
        // Where each cut goes (seen by the hand only through swipeTarget).
        for (let i = 0; i < t.count; i++) {
          const r = swipeTarget(t, i);
          if (!s.hit.includes(i))
            add(
              A.s('rect', { x: r.x, y: r.y, width: r.w, height: r.h, fill: 'transparent', 'pointer-events': 'none', 'data-k': 'cut', 'data-i': i }),
            );
        }
        add(A.tool('knife', 330, 92));
        break;
      }
      case 'taps': {
        if (L.dough) {
          add(A.board(60, 120, 280, 90));
          const k = Math.min(1, s.n / R.tapsFor(t));
          add(
            A.s('rect', {
              x: 170 - 40 * k,
              y: 140 + 8 * k,
              width: 100 + 80 * k,
              height: 48 - 18 * k,
              rx: 18,
              fill: C.dough,
              stroke: C.doughEdge,
              'stroke-width': 2,
              'data-k': 'tool',
            }),
          );
          add(A.tool('hand', 220, 110));
        } else if (L.split) {
          add(A.board(90, 120, 220, 90));
          add(A.biscuit(200, 165, 26, C.golden, { split: s.n > 0, k: 'tool' }));
        } else if (L.tray) {
          add(A.tray(160, 140, C.pale));
          if (t.id === 'brush' && s.n) add(A.s('rect', { x: 160, y: 140, width: 120, height: 64, rx: 6, fill: 'rgba(255,255,255,0.18)' }));
          add(A.tool(L.tool, 90, 120));
        } else {
          add(A.bowl(BOWL.x, BOWL.y, BOWL.w, L.bowl, { lumps: L.lumps || 0 }));
          add(A.tool(L.tool, 90, 125, `${L.label} ${s.n}/${R.tapsFor(t)}`));
        }
        break;
      }
      case 'tapEach': {
        add(A.board(40, 108, 320, 104));
        add(A.s('rect', { x: 70, y: 122, width: 260, height: 76, rx: 22, fill: C.dough, stroke: C.doughEdge, 'stroke-width': 2 }));
        for (let i = 0; i < t.count; i++) {
          const { cx, cy } = roundAt(i);
          if (s.hit.includes(i)) add(A.biscuit(cx, cy, 15, C.pale));
          else
            add(
              A.s('circle', {
                cx,
                cy,
                r: 15,
                fill: 'transparent',
                stroke: C.doughEdge,
                'stroke-width': 2,
                'stroke-dasharray': '4 3',
                'data-k': 'spot',
                'data-i': i,
              }),
            );
        }
        break;
      }
      case 'pour': {
        const target = R.pourTarget(t);
        const k = Math.min(1, s.level / target);
        // Flour fills an empty bowl; milk wets the crumbs; cream fills a bowl.
        const fillColor = L.bowl ? A.mix(L.bowl, C.milk, k * 0.5) : k > 0.02 ? (t.id === 'flour' ? C.flour : C.milk) : null;
        add(A.bowl(BOWL.x, BOWL.y, BOWL.w, fillColor, { lumps: L.bowl ? L.lumps || 0 : 0 }));
        if (t.id === 'flour') add(A.s('rect', { x: BOWL.x - 80, y: BOWL.y + 36, width: 160, height: 10, rx: 4, fill: C.metal, stroke: C.metalDark }));
        const tilt = s.pouring ? -55 : 0;
        if (s.pouring)
          add(
            A.s('path', {
              d: `M 120 70 Q ${BOWL.x - 40} 60 ${BOWL.x - 10} ${BOWL.y - 40}`,
              fill: 'none',
              stroke: t.id === 'flour' ? C.flour : C.milk,
              'stroke-width': 7,
              'stroke-linecap': 'round',
              opacity: 0.9,
            }),
          );
        add(A.source(L.source, 90, 95, tilt, L.label));
        add(A.readout(BOWL.x, 40, s.level, R.pourUnit(t), target, t.tolerance));
        break;
      }
      case 'scribble': {
        const p = s.p;
        const color = L.bowl2 ? A.mix(L.bowl, L.bowl2, p) : L.bowl;
        const lumps = Math.round((L.lumps || 0) + ((L.lumps2 ?? L.lumps ?? 0) - (L.lumps || 0)) * p);
        add(A.bowl(200, 150, 190, color, { lumps, peaks: L.peaks ? Math.round(L.peaks * p) : 0 }));
        add(A.meter(130, 222, 140, p));
        if (hand && hand.kind === 'scribble')
          add(A.s('circle', { cx: hand.x, cy: hand.y, r: 9, fill: 'none', stroke: C.metalDark, 'stroke-width': 3 }));
        break;
      }
      case 'drag': {
        if (t.id === 'tray') {
          add(A.oven(220, 18, { on: true, display: '220 °C', knobAngle: 100 }));
          if (!s.done) add(placed(A.item('tray', 90, 150)));
        } else {
          add(A.plate(270, 200, 150));
          add(A.shortcake(270, 198, s.next));
          task().items.forEach((id, i) => {
            if (i >= s.next) add(placed(A.item(id, 50 + (i % 2) * 62, 52 + Math.floor(i / 2) * 64)));
          });
        }
        break;
      }
      case 'wait': {
        const k = Math.min(1, s.t / t.seconds);
        if (t.id === 'golden') {
          add(
            A.oven(OVEN.x, OVEN.y, {
              on: true,
              inside: A.tray(OVEN.x + 25, OVEN.y + 100, A.mix(C.pale, C.golden, k)),
              display: `${Math.ceil(12 * (1 - k))} min`,
              knobAngle: 100,
            }),
          );
        } else {
          add(A.tray(140, 130, C.golden));
          for (let i = 0; i < 3; i++)
            add(
              A.s('path', {
                d: `M ${175 + i * 38} 120 q 8 -14 0 -26 q -8 -12 0 -24`,
                fill: 'none',
                stroke: '#ffffff',
                'stroke-width': 3,
                opacity: 0.6 * (1 - k),
              }),
            );
        }
        add(A.meter(130, 226, 140, k));
        break;
      }
    }
  }
  function drawFinished() {
    svg.appendChild(A.plate(200, 205, 200));
    svg.appendChild(A.shortcake(200, 203, 6, 1.5));
  }
  // A dragged thing follows the hand.
  function placed(node) {
    if (hand && hand.kind === 'drag' && node.getAttribute('data-i') === hand.id) node.setAttribute('transform', `translate(${hand.dx} ${hand.dy})`);
    return node;
  }
  const swipeTarget = (t, i) => {
    if (t.id === 'cubes') {
      const lx = 120 + ((i + 1) * 160) / (t.count + 1);
      return { x: lx - 9, y: 112, w: 18, h: 84, cx: lx };
    }
    const cx = 75 + i * 50;
    return { x: cx - 19, y: 132, w: 38, h: 50, cx };
  };
  const roundAt = (i) => ({ cx: 105 + (i % 3) * 95, cy: 142 + Math.floor(i / 3) * 34 });
  const inRect = (p, r) => p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;

  // ------------------------------------------------------------ the side
  function side_() {
    taskTools.replaceChildren();
    hintBtn.style.display = st ? '' : 'none';
    if (!st) {
      stepLine.textContent = '';
      title.textContent = '';
      label.textContent = LABELS.bakeDone;
      why.textContent = '';
      return;
    }
    const t = task();
    stepLine.textContent = fill(LABELS.bakeStep, { N: st.index + 1, TOTAL: BAKE_STEPS.length });
    title.textContent = st.step.title;
    label.textContent = t.label;
    why.textContent = st.step.why;
    const s = st.state;
    if (t.kind === 'dial') {
      taskTools.append(
        button('−', () => dialBy(-1), 'small.bk-minus'),
        button('+', () => dialBy(1), 'small.bk-plus'),
      );
    }
    if (t.kind === 'pour' && s.status === 'less') taskTools.append(button(LABELS.bakeScoop, scoop, 'small.bk-scoop'));
    if (t.kind === 'wait' && t.action && !s.done) taskTools.append(button(t.action, act, 'small.bk-act'));
  }
  const render = () => {
    draw();
    side_();
  };

  // ------------------------------------------------------- the gestures
  function dialBy(dir) {
    if (busy) return;
    R.dialTurn(task(), st.state, dir);
    audio.click();
    R.dialRelease(task(), st.state);
    after();
  }
  function scoop() {
    if (busy) return;
    const r = R.pourScoop(task(), st.state);
    audio.slide();
    say(r);
    after();
  }
  function act() {
    if (busy) return;
    if (R.waitAct(task(), st.state) === 'early') {
      audio.soft();
      msg.textContent = task().early;
    }
    after();
  }
  const say = (status) =>
    (msg.textContent = status === 'right' ? LABELS.bakeRight : status === 'more' ? LABELS.bakeMore : status === 'less' ? LABELS.bakeLess : '');

  const point = (e) => {
    const r = svg.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * A.W, y: ((e.clientY - r.top) / r.height) * A.H };
  };
  const at = (e, k) => e.target.closest && e.target.closest(`[data-k="${k}"]`);

  function down(e) {
    if (busy || !st) return;
    e.preventDefault();
    const p = point(e);
    const t = task();
    const s = st.state;
    try {
      svg.setPointerCapture(e.pointerId);
    } catch {
      /* not every pointer can be captured */
    }
    switch (t.kind) {
      case 'dial':
        if (at(e, 'knob')) hand = { kind: 'dial' };
        break;
      case 'swipe':
        hand = { kind: 'swipe', inside: new Set() };
        move(e);
        break;
      case 'taps':
        if (at(e, 'tool')) {
          R.tap(t, s);
          audio.click();
          after();
        }
        break;
      case 'tapEach': {
        const n = at(e, 'spot');
        if (n && R.hitOne(t, s, Number(n.getAttribute('data-i')))) {
          audio.click();
          after();
        }
        break;
      }
      case 'pour':
        if (at(e, 'source')) {
          R.pourStart(t, s);
          hand = { kind: 'pour' };
          msg.textContent = '';
          audio.pour();
          render();
        }
        break;
      case 'scribble':
        if (at(e, 'bowl')) hand = { kind: 'scribble', x: p.x, y: p.y };
        break;
      case 'drag': {
        const n = at(e, 'item');
        if (n) hand = { kind: 'drag', id: n.getAttribute('data-i'), x0: p.x, y0: p.y, dx: 0, dy: 0 };
        break;
      }
    }
  }
  function move(e) {
    if (!hand || !st) return;
    const p = point(e);
    const t = task();
    const s = st.state;
    if (hand.kind === 'dial') {
      const cx = OVEN.x + A.KNOB.dx;
      const cy = OVEN.y + A.KNOB.dy;
      const ang = Math.max(-135, Math.min(135, (Math.atan2(p.x - cx, cy - p.y) * 180) / Math.PI));
      const before = s.value;
      R.dialSet(t, s, t.min + ((ang + 135) / 270) * (t.max - t.min));
      if (s.value !== before) {
        audio.click();
        render();
      }
    } else if (hand.kind === 'swipe') {
      for (let i = 0; i < t.count; i++) {
        const inside = inRect(p, swipeTarget(t, i));
        if (inside) hand.inside.add(i);
        else if (hand.inside.has(i)) {
          hand.inside.delete(i);
          if (R.hitOne(t, s, i)) {
            audio.slide();
            after();
            if (busy) return;
          }
        }
      }
    } else if (hand.kind === 'scribble') {
      const d = Math.hypot(p.x - hand.x, p.y - hand.y);
      hand.x = p.x;
      hand.y = p.y;
      const inBowl = Math.abs(p.x - 200) < 100 && p.y > 90 && p.y < 200;
      if (inBowl && d < 60) {
        const before = Math.floor(s.p * 12);
        R.scribble(t, s, d, 190);
        if (Math.floor(s.p * 12) !== before) audio.slide();
        after();
      }
      draw();
    } else if (hand.kind === 'drag') {
      hand.dx = p.x - hand.x0;
      hand.dy = p.y - hand.y0;
      draw();
    }
  }
  function up(e) {
    if (!hand || !st) return;
    const h = hand;
    hand = null;
    const t = task();
    const s = st.state;
    if (h.kind === 'dial') {
      R.dialRelease(t, s);
      after();
    } else if (h.kind === 'pour') {
      say(R.pourStop(t, s));
      after();
    } else if (h.kind === 'drag') {
      const p = point(e);
      const zone = t.id === 'tray' ? { x: 230, y: 70, w: 150, h: 120 } : { x: 180, y: 140, w: 180, h: 90 };
      if (inRect(p, zone)) {
        const r = R.drop(t, s, h.id);
        if (r === 'first') {
          audio.soft();
          msg.textContent = fill(LABELS.bakeFirst, { ITEM: BAKE_ITEMS[t.items[s.next]] });
        } else {
          audio.click();
          msg.textContent = '';
        }
      }
      after();
    } else render();
  }

  // After every change: redraw, and move on once the task is done.
  function after() {
    render();
    if (!st || !st.state.done || busy) return;
    busy = true;
    hand = null;
    audio.smallChime(Math.min(11, st.task + 3));
    timer = setTimeout(() => {
      busy = false;
      if (!R.advance(st)) {
        render();
        return;
      }
      gs.bakeStep(st.index);
      audio.chime();
      if (gs.bakeDone()) {
        st = null;
        audio.sparkle();
        msg.textContent = '';
      } else {
        st = R.newStep(st.index + 1);
        msg.textContent = '';
      }
      render();
    }, 650);
  }

  // Pouring and waiting move with time.
  function frame(now) {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(0.1, last ? (now - last) / 1000 : 0);
    last = now;
    if (!st || busy) return;
    const t = task();
    const s = st.state;
    if (t.kind === 'pour' && s.pouring) {
      R.pourTick(t, s, dt);
      draw();
    } else if (t.kind === 'wait' && !s.done) {
      const was = R.waitReady(t, s);
      R.waitTick(t, s, dt);
      if (!was && R.waitReady(t, s)) audio.ding();
      if (s.done) after();
      else draw();
    }
  }

  svg.addEventListener('pointerdown', down);
  svg.addEventListener('pointermove', move);
  svg.addEventListener('pointerup', up);
  svg.addEventListener('pointercancel', up);

  m = game.modals.show(c, {
    name: 'bake',
    onClose: () => {
      cancelAnimationFrame(raf);
      clearTimeout(timer);
    },
    onKey: (e) => {
      if (e.code === 'KeyH') return (hint(), true);
      if (e.code === 'KeyM') return (game.toggleMute(), true);
      return true;
    },
  });
  render();
  raf = requestAnimationFrame(frame);
  return m;
}
