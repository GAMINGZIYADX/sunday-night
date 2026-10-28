import { el, button, TULIP_SVG } from './dom.js';
import { card } from './manager.js';
import { recipeCard } from './recipeCard.js';
import { BAKE_STEPS, BAKE_ITEMS, CLUES, LABELS } from '../config.js';
import { fill } from '../engine/text.js';
import * as R from '../bake/recipe.js';
import * as A from './bakeArt.js';

// The baking screen: the strawberry shortcake, one real step at a time
// (BAKE_STEPS in config.js; the rules in bake/recipe.js). Every task is one
// gesture on an SVG scene: tap, hold to pour, swipe to cut, scribble to stir,
// drag. Finished steps are saved (gs.bakeStep); a half-done step is not.
//
// Three layers: the kitchen (drawn once), the scene (redrawn when something
// changes or eases) and the effects (every frame: the tool in the hand,
// falling sugar, the pour, steam, sparkles).

// What each task shows, by "step.task".
const LOOK = {
  'macerate.sugar': { jar: 'sugar', label: 'Sugar', bowl: 'berries', grain: '#ffffff' },
  'macerate.toss': { bowl: 'berries', tool: 'spoon' },
  'dry.flour': { pourer: 'bag', label: 'Flour', bowl: 'flour', scale: true },
  'dry.bakingPowder': { jar: 'bakingPowder', label: 'Baking powder', bowl: 'mix', grain: '#f1ece2' },
  'dry.sugar': { jar: 'sugar', label: 'Sugar', bowl: 'mix', grain: '#ffffff' },
  'dry.salt': { jar: 'salt', label: 'Salt', bowl: 'mix', grain: '#f8fbff' },
  'dry.whisk': { bowl: 'mix', tool: 'whisk', dust: '#ffffff' },
  'butter.rub': { bowl: 'crumbs', tool: 'fork', dust: '#fff6dc' },
  'milk.milk': { pourer: 'jug', label: 'Milk', bowl: 'wetCrumbs', liquid: '#fbfcfd' },
  'milk.stir': { bowl: 'dough', tool: 'fork' },
  'cream.cream': { pourer: 'carton', label: 'Cream', bowl: 'cream', liquid: '#fffdf6' },
  'cream.sugar': { jar: 'sugar', label: 'Sugar', bowl: 'cream', grain: '#ffffff' },
  'cream.vanilla': { jar: 'vanilla', label: 'Vanilla', bowl: 'cream', grain: '#6b3a1e' },
  'cream.whip': { bowl: 'whipped', tool: 'whisk', dust: '#ffffff' },
};

const OVEN = { x: 115, y: 14 };
const DRAG_OVEN = { x: 220, y: 14 };
const BOWL = { x: 255, y: 150, w: 150 }; // beside a jar or a pourer
const BIG_BOWL = { x: 200, y: 150, w: 190 }; // stirring
const JAR = { x: 82, y: 140 };
const POURER = { x: 92, y: 140 }; // resting on the counter
const POUR_AT = { x: 168, y: 74 }; // lifted over the bowl
// Where the bag (jug, carton) is: lift 0 resting, 1 tipped over the bowl.
const pourerAt = (lift) => ({ x: POURER.x + (POUR_AT.x - POURER.x) * lift, y: POURER.y + (POUR_AT.y - POURER.y) * lift, tilt: 75 * lift });

const ease = (k) => 1 - Math.pow(1 - A.clamp01(k), 3);
const easeBack = (k) => {
  const t = A.clamp01(k) - 1;
  return 1 + t * t * (2.7 * t + 1.7);
};
const bounce = (k) => {
  const t = A.clamp01(k);
  if (t < 0.6) return (t / 0.6) ** 2;
  return 1 - Math.abs(Math.sin((t - 0.6) * 7.85)) * 0.12 * (1 - t) * 2.5;
};

export function bakeOverlay(game) {
  const gs = game.gs;
  const audio = game.audio;
  const scene = A.g({ class: 'bk-scene' });
  const fx = A.g({ class: 'bk-fx', 'pointer-events': 'none' });
  const svg = A.s('svg', { viewBox: `0 0 ${A.W} ${A.H}`, class: 'bk-svg' }, [A.defs(), A.backdrop(), scene, fx]);
  const stage = el('div.bake-stage', [svg]);
  const stepLine = el('div.bk-step');
  const title = el('h3.bk-title');
  const label = el('p.bk-label');
  const why = el('p.note-small.bk-why');
  const msg = el('div.pz-msg');
  const taskTools = el('div.pz-tools.bk-task-tools');
  const panel = el('div.bk-panel', [stepLine, title, label, why]);
  let m;
  const close = () => game.modals.close(m);
  const hint = () => {
    if (st) msg.textContent = st.step.hint;
  };
  const hintBtn = button(LABELS.hint, hint, 'small');
  const tools = el('div.pz-tools', [hintBtn, button(LABELS.bakeRecipe, () => recipeCard(game), 'small'), button(LABELS.close, close, 'small')]);
  const side = el('div.pz-side', [
    el('div.pz-head', { html: TULIP_SVG('#e04a5a', 26) }, [el('h2', CLUES.bake.title)]),
    panel,
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
  let now = 0;
  let hand = null; // what the pointer is doing: { kind, ... }
  const ptr = { x: 0, y: 0, over: false, down: false, angle: 0, vx: 0 };
  let swirl = 0;
  let dirty = true;

  const task = () => R.currentTask(st);
  const key = () => `${st.step.id}.${task().id}`;
  const look = () => LOOK[key()] || {};

  // ------------------------------------------------- easing and moments
  // tw: values that ease towards a target (redrawing the scene as they go).
  let tw = {};
  function val(k, to, rate = 3, from = to) {
    let t = tw[k];
    if (!t) t = tw[k] = { v: from, to };
    t.to = to;
    t.rate = rate;
    return t.v;
  }
  function stepTweens(dt) {
    let moving = false;
    for (const t of Object.values(tw)) {
      if (t.v === t.to) continue;
      const d = t.to - t.v;
      const step = t.rate * dt;
      t.v = Math.abs(d) <= step ? t.to : t.v + Math.sign(d) * step;
      moving = true;
    }
    return moving;
  }
  // Pulses: a short there-and-back (0..1..0) started now.
  const pulses = {};
  const pulse = (k, dur = 0.5) => (pulses[k] = { t0: now, dur });
  function pulseK(k) {
    const p = pulses[k];
    if (!p) return 0;
    const t = (now - p.t0) / p.dur;
    if (t >= 1) {
      delete pulses[k];
      return 0;
    }
    return Math.sin(t * Math.PI);
  }

  // ----------------------------------------------------------- particles
  const parts = [];
  const pool = [];
  function spawn(n, { x, y, vx = 0, vy = 0, spread = 10, g = 300, life = 0.8, r = 1, color = '#ffffff', grow = 0, floor = null, op = 1 }) {
    for (let i = 0; i < n && parts.length < 160; i++)
      parts.push({
        x: x + (Math.random() - 0.5) * spread,
        y: y + (Math.random() - 0.5) * spread * 0.4,
        vx: vx + (Math.random() - 0.5) * 30,
        vy: vy + (Math.random() - 0.5) * 20,
        g,
        life: life * (0.7 + Math.random() * 0.6),
        age: 0,
        r: r * (0.6 + Math.random() * 0.8),
        color,
        grow,
        floor,
        op,
      });
  }
  function drawParticles(dt) {
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i];
      p.age += dt;
      p.vy += p.g * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.r += p.grow * dt;
      if (p.age > p.life || (p.floor !== null && p.y > p.floor)) parts.splice(i, 1);
    }
    while (pool.length < parts.length) pool.push(A.s('circle'));
    parts.forEach((p, i) => {
      const n = pool[i];
      n.setAttribute('cx', p.x.toFixed(1));
      n.setAttribute('cy', p.y.toFixed(1));
      n.setAttribute('r', Math.max(0.2, p.r).toFixed(2));
      n.setAttribute('fill', p.color);
      n.setAttribute('fill-opacity', (p.op * (1 - p.age / p.life)).toFixed(2));
      fx.appendChild(n);
    });
  }

  // ------------------------------------------------------------- the scene
  function draw() {
    dirty = false;
    scene.replaceChildren();
    const add = (n) => n && scene.appendChild(n);
    if (!st) {
      add(A.plate(200, 214, 230));
      add(A.shortcake(200, 212, 6, 1.55));
      return;
    }
    const t = task();
    const s = st.state;
    const L = look();
    switch (t.kind) {
      case 'dial': {
        const span = (s.value - t.min) / (t.max - t.min);
        const timer = t.id === 'timer';
        const win = A.ovenWindow(OVEN.x, OVEN.y);
        add(
          A.oven(OVEN.x, OVEN.y, {
            glow: timer ? 1 : ease(val('glow', span, 1.5)),
            inside: timer ? A.tray(win.x + 7, win.y + 14, {}) : null,
            display: `${s.value} ${t.unit}`,
            knobAngle: val('knob', -135 + span * 270, 600),
          }),
        );
        break;
      }
      case 'swipe': {
        add(A.board(30, 116, 340, 88));
        if (t.id === 'cubes') {
          const sep = s.hit.map((i) => ease(val(`sep${i}`, 1, 3, 0)));
          add(A.butterBlock(122, 132, 156, 50, t.count, s.hit, sep.length ? Object.fromEntries(s.hit.map((h, j) => [h, sep[j]])) : {}));
        } else
          for (let i = 0; i < t.count; i++) {
            const cut = s.hit.includes(i) ? ease(val(`cut${i}`, 1, 2.2, 0)) : 0;
            add(A.cutStrawberry(swipeTarget(t, i).cx, 160, 15, cut));
          }
        // Where each cut goes (the hand only feels them through swipeTarget).
        for (let i = 0; i < t.count; i++) {
          const r = swipeTarget(t, i);
          if (!s.hit.includes(i))
            add(
              A.s('rect', { x: r.x, y: r.y, width: r.w, height: r.h, fill: 'transparent', 'pointer-events': 'none', 'data-k': 'cut', 'data-i': i }),
            );
        }
        break;
      }
      case 'taps': {
        const n = s.n;
        const count = R.tapsFor(t);
        if (t.id === 'pat') {
          add(A.board(40, 122, 320, 92));
          add(A.doughSlab(200, 164, ease(val('spread', n / count, 1.6, 0))));
        } else if (t.id === 'split') {
          add(A.board(90, 128, 220, 84));
          add(A.biscuit(200, 186, 30, { bake: 1, rise: 0.6, split: ease(val('split', n ? 1 : 0, 1.8, 0)), seed: 7, k: 'tool' }));
        } else if (t.id === 'brush' || t.id === 'sprinkle') {
          const look2 = {
            shine: val('shine', t.id === 'sprinkle' || n ? 1 : 0, 1.5, t.id === 'sprinkle' ? 1 : 0),
            sugar: t.id === 'sprinkle' ? val('sugar', n ? 1 : 0, 1.2, 0) : 0,
          };
          add(A.board(110, 122, 180, 92));
          const tr = A.tray(140, 136, look2);
          tr.setAttribute('data-k', 'tool');
          add(tr);
        } else {
          add(A.bowl(BOWL.x, BOWL.y, BOWL.w, { fill: L.bowl, k2: L.bowl === 'berries' ? n / count : L.jar === 'vanilla' ? n / count : 0 }));
          add(A.jar(L.jar, JAR.x, JAR.y, `${L.label}  ${n}/${count}`, { k: pulseK('dip') }));
        }
        break;
      }
      case 'tapEach': {
        add(A.board(30, 108, 340, 108));
        const holes = s.hit.map((i) => roundAt(i));
        add(A.doughSlab(200, 160, 1, holes));
        for (let i = 0; i < t.count; i++) {
          const { cx, cy } = roundAt(i);
          if (s.hit.includes(i)) {
            const k = easeBack(val(`pop${i}`, 1, 3, 0));
            add(A.g({ transform: `translate(${cx} ${cy}) scale(${k}) translate(${-cx} ${-cy})` }, [A.biscuit(cx, cy + 2, 13.5, { seed: i + 2 })]));
          } else
            add(
              A.s('ellipse', {
                cx,
                cy,
                rx: 15,
                ry: 8.5,
                fill: 'transparent',
                stroke: '#b99258',
                'stroke-width': 1,
                'stroke-dasharray': '3 2.5',
                'data-k': 'spot',
                'data-i': i,
              }),
            );
        }
        break;
      }
      case 'pour': {
        const target = R.pourTarget(t);
        const level = A.clamp01(s.level / target);
        if (L.scale) add(A.scalePad(BOWL.x, BOWL.y + 38));
        const fillKind = t.id === 'milk' ? (level > 0.03 ? 'wetCrumbs' : 'crumbs') : L.bowl;
        add(A.bowl(BOWL.x, BOWL.y, BOWL.w, { fill: fillKind, level: t.id === 'milk' ? 1 : level, k: 0 }));
        const at = pourerAt(ease(val('lift', s.pouring ? 1 : 0, 3.5)));
        add(A.pourer(L.pourer, at.x, at.y, at.tilt, L.label));
        add(A.readout(BOWL.x, 34, s.level, R.pourUnit(t), target, t.tolerance));
        break;
      }
      case 'scribble': {
        const p = s.p;
        add(A.bowl(BIG_BOWL.x, BIG_BOWL.y, BIG_BOWL.w, { fill: L.bowl, k: p, swirl, k2: 1 }));
        add(A.meter(130, 226, 140, p));
        break;
      }
      case 'drag': {
        if (t.id === 'tray') {
          const slide = ease(val('slide', s.done ? 1 : 0, 2.2, 0));
          const win = A.ovenWindow(DRAG_OVEN.x, DRAG_OVEN.y);
          const inside = slide > 0 ? A.g({ opacity: Math.min(1, slide * 2) }, [A.tray(win.x + 7, win.y + 14 + (1 - slide) * 30, {})]) : null;
          add(A.oven(DRAG_OVEN.x, DRAG_OVEN.y, { glow: 1, display: '220 °C', knobAngle: 100, inside }));
          if (!s.done) add(placed(A.chip('tray', 90, 150)));
        } else {
          add(A.plate(275, 206, 160));
          add(A.shortcake(275, 204, s.next, 1, s.next ? bounce(val('drop', 1, 2.4, 1)) : 1));
          t.items.forEach((id, i) => {
            if (i >= s.next) add(placed(A.chip(id, 46 + (i % 2) * 62, 50 + Math.floor(i / 2) * 62)));
          });
        }
        break;
      }
      case 'wait': {
        const k = A.clamp01(s.t / t.seconds);
        if (t.id === 'golden') {
          const win = A.ovenWindow(OVEN.x, OVEN.y);
          const mins = Math.max(0, 12 * (1 - k));
          add(
            A.oven(OVEN.x, OVEN.y, {
              glow: 0.85 + Math.sin(now * 3) * 0.15,
              inside: A.tray(win.x + 7, win.y + 14, { bake: ease(k), rise: ease(Math.min(1, k * 1.6)) }),
              display: `${Math.floor(mins)}:${String(Math.floor((mins % 1) * 60)).padStart(2, '0')}`,
              knobAngle: 100,
            }),
          );
        } else {
          // A wire rack, a back row and a front row.
          add(A.rack(95, 200, 210));
          for (let i = 0; i < 6; i++) {
            const row = i < 3 ? 0 : 1;
            add(A.biscuit(140 + (i % 3) * 60 + row * 30 - 15, 178 + row * 22, 16, { bake: 1, rise: 1, shine: 1, sugar: 1, seed: i + 3 }));
          }
        }
        add(A.meter(130, 232, 140, k));
        break;
      }
    }
  }
  // A dragged thing follows the hand (with a bigger shadow while lifted).
  function placed(node) {
    if (hand && hand.kind === 'drag' && node.getAttribute('data-i') === hand.id) {
      node.setAttribute('transform', `translate(${hand.dx} ${hand.dy - 4})`);
      node.setAttribute('class', 'bk-item lifted');
    }
    return node;
  }
  const swipeTarget = (t, i) => {
    if (t.id === 'cubes') {
      const lx = 122 + ((i + 1) * 156) / (t.count + 1);
      return { x: lx - 9, y: 112, w: 18, h: 84, cx: lx };
    }
    const cx = 62 + i * 55;
    return { x: cx - 19, y: 132, w: 38, h: 52, cx };
  };
  const roundAt = (i) => ({ cx: 120 + (i % 3) * 80, cy: 146 + Math.floor(i / 3) * 30 });
  const inRect = (p, r) => p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;

  // ------------------------------------------------------------ effects
  function drawFx(dt) {
    fx.replaceChildren();
    const add = (n) => n && fx.appendChild(n);
    if (st) {
      const t = task();
      const s = st.state;
      const L = look();
      const shown = ptr.over || ptr.down;
      // The pour: a stream from the mouth to the bowl.
      const lift = t.kind === 'pour' ? ease(val('lift', s.pouring ? 1 : 0, 3.5)) : 0;
      if (t.kind === 'pour' && s.pouring && lift > 0.9) {
        const at = pourerAt(lift);
        const m0 = A.mouth(L.pourer, at.x, at.y, at.tilt);
        const bx = BOWL.x - 18;
        const by = BOWL.y - 34;
        const wob = Math.sin(now * 23) * 1.5;
        if (L.liquid) {
          add(
            A.s('path', {
              d: `M ${m0.x} ${m0.y} Q ${m0.x + 14} ${m0.y + 6} ${bx + wob} ${by}`,
              fill: 'none',
              stroke: L.liquid,
              'stroke-width': 5,
              'stroke-linecap': 'round',
            }),
          );
          add(
            A.s('path', {
              d: `M ${m0.x} ${m0.y} Q ${m0.x + 14} ${m0.y + 6} ${bx + wob} ${by}`,
              fill: 'none',
              stroke: '#d6dde6',
              'stroke-width': 1,
              'stroke-dasharray': '6 5',
              'stroke-dashoffset': (-now * 60).toFixed(1),
            }),
          );
          if (Math.random() < 0.5) spawn(1, { x: bx, y: by, vy: -40, g: 400, life: 0.4, r: 1.2, color: L.liquid, floor: by + 6 });
        } else {
          add(
            A.s('path', {
              d: `M ${m0.x} ${m0.y} Q ${m0.x + 14} ${m0.y + 4} ${bx + wob} ${by}`,
              fill: 'none',
              stroke: '#ffffff',
              'stroke-width': 6,
              'stroke-linecap': 'round',
              'stroke-opacity': 0.9,
              'stroke-dasharray': '2 3',
              'stroke-dashoffset': (-now * 80).toFixed(1),
            }),
          );
          spawn(2, { x: m0.x + 4, y: m0.y + 2, vx: 50, vy: 10, g: 280, life: 0.5, r: 1, color: '#ffffff', floor: by + 4 });
          if (Math.random() < 0.3) spawn(1, { x: bx, y: by, vy: -20, g: -15, life: 1.2, r: 3, grow: 4, color: '#ffffff', op: 0.35 });
        }
      }
      // The spoon carrying sugar (or vanilla) from the jar to the bowl.
      if (t.kind === 'taps' && L.jar) {
        const k = pulseK('dip');
        if (k > 0) {
          const x = JAR.x + 14 + (BOWL.x - 30 - JAR.x - 14) * k;
          const y = JAR.y - 22 - Math.sin(k * Math.PI) * 18 + (BOWL.y - 42 - JAR.y + 22) * k;
          add(A.spoon(x, y, -180 + k * 140, L.grain));
        }
      }
      // The tool in the hand (it replaces the mouse pointer).
      const tool = t.kind === 'swipe' || t.kind === 'scribble' || t.kind === 'tapEach' || ['pat', 'brush', 'sprinkle'].includes(t.id);
      svg.classList.toggle('bk-nocursor', tool);
      if (shown && !busy) {
        if (t.kind === 'swipe') add(A.knife(ptr.x, ptr.y, Math.max(-40, Math.min(40, ptr.angle))));
        else if (t.kind === 'scribble')
          add(
            L.tool === 'whisk'
              ? A.whisk(ptr.x, ptr.y, 18 + Math.sin(now * 20) * (ptr.down ? 6 : 0))
              : L.tool === 'fork'
                ? A.fork(ptr.x, ptr.y, 22)
                : A.spoon(ptr.x, ptr.y, -30),
          );
        else if (t.kind === 'tapEach') add(A.cutter(ptr.x, ptr.y + 8, pulseK('press')));
        else if (t.id === 'pat') add(A.hand(ptr.x, ptr.y - 6, pulseK('press')));
        else if (t.id === 'brush') add(A.brush(ptr.x, ptr.y, -25 + pulseK('press') * 50));
        else if (t.id === 'sprinkle') add(A.shaker(ptr.x, ptr.y - 6, Math.sin(now * 40) * 25 * pulseK('press') + 160));
      }
      // Steam from the cooling biscuits.
      if (t.kind === 'wait' && t.id === 'cool') {
        const k = 1 - A.clamp01(s.t / t.seconds);
        for (let i = 0; i < 4; i++) {
          const x0 = 150 + i * 34;
          const o = (now * 18 + i * 13) % 40;
          add(
            A.s('path', {
              d: `M ${x0} ${150 - o} q 6 -10 0 -18 q -6 -9 0 -18`,
              fill: 'none',
              stroke: '#ffffff',
              'stroke-width': 2.4,
              'stroke-linecap': 'round',
              'stroke-opacity': (0.55 * k * (1 - o / 40)).toFixed(2),
            }),
          );
        }
      }
    } else if (Math.random() < dt * 4) {
      // The finished cake twinkles.
      spawn(1, { x: 200 + (Math.random() - 0.5) * 120, y: 130 + (Math.random() - 0.5) * 70, g: -10, life: 1.1, r: 1.6, color: '#fff3b0' });
    }
    drawParticles(dt);
  }

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
    if (t.kind === 'dial')
      taskTools.append(
        button('−', () => dialBy(-1), 'small.bk-minus'),
        button('+', () => dialBy(1), 'small.bk-plus'),
      );
    if (t.kind === 'pour' && s.status === 'less') taskTools.append(button(LABELS.bakeScoop, scoop, 'small.bk-scoop'));
    if (t.kind === 'wait' && t.action && !s.done) taskTools.append(button(t.action, act, 'small.bk-act'));
  }
  const render = () => {
    draw();
    side_();
  };
  // A new step slides in.
  function freshStep() {
    tw = {};
    for (const n of [scene, panel]) {
      n.classList.remove('bk-in');
      void n.getBoundingClientRect();
      n.classList.add('bk-in');
    }
  }

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
    spawn(5, { x: BOWL.x, y: BOWL.y - 40, vy: -60, g: 200, life: 0.6, r: 1.4, color: look().liquid || '#ffffff' });
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
  function track(e) {
    const p = point(e);
    const dx = p.x - ptr.x;
    if (Math.abs(dx) > 0.5) ptr.angle = ptr.angle * 0.7 + Math.max(-40, Math.min(40, -dx * 3)) * 0.3;
    ptr.x = p.x;
    ptr.y = p.y;
    ptr.over = true;
    return p;
  }

  function down(e) {
    track(e);
    ptr.down = true;
    if (busy || !st) return;
    e.preventDefault();
    const p = point(e);
    const t = task();
    const s = st.state;
    const L = look();
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
          pulse('press', 0.35);
          if (L.jar) {
            pulse('dip', 0.6);
            setTimeout(
              () =>
                spawn(L.jar === 'vanilla' ? 4 : 14, {
                  x: BOWL.x - 34,
                  y: BOWL.y - 46,
                  vy: 20,
                  g: 420,
                  life: 0.6,
                  r: L.jar === 'vanilla' ? 1.5 : 0.9,
                  color: L.grain,
                  floor: BOWL.y - 30,
                }),
              300,
            );
          } else if (t.id === 'pat') spawn(6, { x: p.x, y: p.y + 10, vy: -30, g: -20, life: 0.9, r: 2.5, grow: 5, color: '#ffffff', op: 0.5 });
          else if (t.id === 'sprinkle')
            spawn(26, { x: p.x, y: p.y + 6, vy: 30, spread: 40, g: 300, life: 0.5, r: 0.8, color: '#ffffff', floor: p.y + 30 });
          else if (t.id === 'split') spawn(8, { x: 200, y: 168, vy: -60, g: 260, life: 0.6, r: 1, color: '#f3dcab' });
          after();
        }
        break;
      case 'tapEach': {
        const n = at(e, 'spot');
        pulse('press', 0.3);
        if (n && R.hitOne(t, s, Number(n.getAttribute('data-i')))) {
          audio.click();
          spawn(6, { x: p.x, y: p.y, vy: -40, g: 200, life: 0.5, r: 1, color: '#f3e2b8' });
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
        if (n) {
          hand = { kind: 'drag', id: n.getAttribute('data-i'), x0: p.x, y0: p.y, dx: 0, dy: 0 };
          audio.slide();
          draw();
        }
        break;
      }
    }
  }
  function move(e) {
    const p = track(e);
    if (!hand || !st) return;
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
            const cx = swipeTarget(t, i).cx;
            if (t.id === 'cubes') spawn(5, { x: cx, y: 150, vy: -50, g: 300, life: 0.5, r: 1.1, color: '#fbe38c' });
            else spawn(7, { x: cx, y: 160, vy: -70, g: 400, life: 0.6, r: 1.2, color: '#e2394c', floor: 200 });
            after();
            if (busy) return;
          }
        }
      }
    } else if (hand.kind === 'scribble') {
      const d = Math.hypot(p.x - hand.x, p.y - hand.y);
      hand.x = p.x;
      hand.y = p.y;
      const inBowl = Math.abs(p.x - BIG_BOWL.x) < 100 && p.y > 90 && p.y < 200;
      if (inBowl && d < 60) {
        const before = Math.floor(s.p * 12);
        R.scribble(t, s, d, 190);
        swirl += d / 25;
        const L = look();
        if (L.dust && Math.random() < 0.25) spawn(1, { x: p.x, y: p.y - 4, vy: -30, g: -10, life: 0.8, r: 2, grow: 3, color: L.dust, op: 0.4 });
        if (Math.floor(s.p * 12) !== before) audio.slide();
        dirty = true;
        if (s.done) after();
      }
    } else if (hand.kind === 'drag') {
      hand.dx = p.x - hand.x0;
      hand.dy = p.y - hand.y0;
      dirty = true;
    }
  }
  function up(e) {
    ptr.down = false;
    if (e.pointerType !== 'mouse') ptr.over = false;
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
      const zone = t.id === 'tray' ? { x: 230, y: 70, w: 150, h: 120 } : { x: 185, y: 130, w: 180, h: 100 };
      if (inRect(p, zone)) {
        const r = R.drop(t, s, h.id);
        if (r === 'first') {
          audio.soft();
          msg.textContent = fill(LABELS.bakeFirst, { ITEM: BAKE_ITEMS[t.items[s.next]] });
        } else {
          audio.click();
          msg.textContent = '';
          if (t.id === 'stack') {
            tw.drop = { v: 0, to: 1, rate: 2.4 };
            spawn(6, { x: 275, y: 200 - s.next * 10, vy: -40, g: 200, life: 0.5, r: 1.2, color: '#fff3d0' });
          }
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
      spawn(18, { x: 200, y: 110, vy: -60, spread: 120, g: 60, life: 1.1, r: 1.5, color: '#fff3b0' });
      if (gs.bakeDone()) {
        st = null;
        audio.sparkle();
        msg.textContent = '';
      } else {
        st = R.newStep(st.index + 1);
        msg.textContent = '';
      }
      freshStep();
      render();
    }, 750);
  }

  // Every frame: pouring and waiting move with time, things ease, effects.
  function frame(t) {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(0.1, last ? (t - last) / 1000 : 0);
    last = t;
    now = t / 1000;
    if (st && !busy) {
      const tk = task();
      const s = st.state;
      if (tk.kind === 'pour' && s.pouring) {
        R.pourTick(tk, s, dt);
        dirty = true;
      } else if (tk.kind === 'wait' && !s.done) {
        const was = R.waitReady(tk, s);
        R.waitTick(tk, s, dt);
        if (!was && R.waitReady(tk, s)) {
          audio.ding();
          spawn(10, { x: OVEN.x + 85, y: OVEN.y + 100, vy: -50, spread: 60, g: 30, life: 1, r: 1.4, color: '#fff3b0' });
        }
        if (s.done) after();
        else dirty = true;
      }
    }
    if (stepTweens(dt)) dirty = true;
    if (Object.keys(pulses).length && st && task().kind === 'taps') dirty = true;
    if (dirty) draw();
    drawFx(dt);
  }

  svg.addEventListener('pointerdown', down);
  svg.addEventListener('pointermove', move);
  svg.addEventListener('pointerup', up);
  svg.addEventListener('pointercancel', up);
  svg.addEventListener('pointerleave', (e) => {
    if (!ptr.down || e.pointerType !== 'mouse') ptr.over = false;
  });

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
  freshStep();
  render();
  raf = requestAnimationFrame(frame);
  return m;
}
