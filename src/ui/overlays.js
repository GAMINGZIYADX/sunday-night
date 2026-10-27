import { el, button, TULIP_SVG } from './dom.js';
import { card } from './manager.js';
import { drawTulipField, drawStarField, drawLockPicture, drawCardPicture } from '../rooms/art.js';
import { photoImage, sizeOf } from '../rooms/photo.js';
import { heartStars } from '../puzzles/constellation.js';
import { N as SN } from '../puzzles/sliding.js';
import { PUZZLE_NAMES, COLORS, CLUES, PIANO_KEYS, TRUNK_PICTURES, PHOTO, HUNT_COUPON } from '../config.js';
import { hex } from '../engine/textures.js';
import { LABELS } from '../config.js';
import { fill } from '../engine/text.js';
import { shape } from '../puzzles/sudokuMath.js';
import { showClue } from './screens.js';

// Shared: H inside an overlay shows the next hint for that puzzle.
function hintKey(game, id, e) {
  if (e.code === 'KeyH') {
    game.showHint(id);
    return true;
  }
  if (e.code === 'KeyM') {
    game.toggleMute();
    return true;
  }
  return false;
}

function header(title, icon = TULIP_SVG('#6f9be0', 26)) {
  return el('div.pz-head', { html: icon }, [el('h2', title)]);
}

// ----------------------------------------------------------- sliding picture
let _painting = null;
export function paintingCanvas() {
  if (_painting) return _painting;
  _painting = document.createElement('canvas');
  _painting.width = _painting.height = 600;
  drawTulipField(_painting.getContext('2d'), 600, 600);
  return _painting;
}

export function slidingOverlay(game, puzzle, { onSolvedClose } = {}) {
  const art = paintingCanvas();
  const board = el('div.slide-board');
  const peek = el('div.slide-peek');
  const peekCanvas = document.createElement('canvas');
  peekCanvas.width = peekCanvas.height = 600;
  peekCanvas.getContext('2d').drawImage(art, 0, 0);
  peek.appendChild(peekCanvas);
  let numbers = false;
  const tiles = new Map();
  const makeTile = (v) => {
    const c = document.createElement('canvas');
    const ts = 600 / SN;
    c.width = c.height = ts;
    const sx = ((v - 1) % SN) * ts;
    const sy = Math.floor((v - 1) / SN) * ts;
    c.getContext('2d').drawImage(art, sx, sy, ts, ts, 0, 0, ts, ts);
    const t = el('div.slide-tile', [c, el('span.num.hidden', String(v))]);
    t.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      const idx = puzzle.tiles.indexOf(v);
      if (puzzle.move(idx)) game.audio.slide();
      else game.audio.soft();
      layout();
    });
    board.appendChild(t);
    return t;
  };
  const LAST = SN * SN;
  for (let v = 1; v <= LAST; v++) tiles.set(v, makeTile(v));
  board.appendChild(peek);
  const msg = el('div.pz-msg');
  const gentle = button(
    LABELS.gentleShuffle,
    () => {
      puzzle.gentleShuffle(Math.random);
      game.audio.slide();
      layout();
    },
    'small',
  );

  // Pieces fill the same 6px-inset square as the Peek picture, with a 2px
  // gap around each one, so peeking lines up exactly with the pieces.
  const place = (t, i) => {
    const cell = `(100% - 12px) / ${SN}`;
    t.style.left = `calc(6px + ${cell} * ${i % SN} + 2px)`;
    t.style.top = `calc(6px + ${cell} * ${Math.floor(i / SN)} + 2px)`;
    t.style.width = t.style.height = `calc(${cell} - 4px)`;
  };
  const layout = () => {
    puzzle.tiles.forEach((v, i) => {
      if (v === 0) return;
      const t = tiles.get(v);
      place(t, i);
      t.querySelector('.num').classList.toggle('hidden', !numbers);
    });
    // The last piece is the missing corner: it only appears once solved.
    const last = tiles.get(LAST);
    last.style.display = puzzle.isSolved() ? '' : 'none';
    if (puzzle.isSolved()) place(last, LAST - 1);
    gentle.classList.toggle('hidden', (game.gs.data.hintTier.r1b ?? -1) < 2 || puzzle.isSolved());
    msg.textContent = puzzle.isSolved() ? LABELS.paintingWhole : fill(LABELS.moves, { N: puzzle.moves });
  };

  let m;
  const close = () => game.modals.close(m);
  const peekBtn = button(LABELS.peek, () => {}, 'small');
  const showPeek = (on) => peek.classList.toggle('on', on);
  // Held down with a mouse or a finger.
  peekBtn.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    showPeek(true);
  });
  for (const ev of ['pointerup', 'pointerleave', 'pointercancel']) peekBtn.addEventListener(ev, () => showPeek(false));
  const numBtn = button(
    LABELS.numbers,
    () => {
      numbers = !numbers;
      layout();
    },
    'small',
  );
  const c = card(
    null,
    [
      el('div.pz-main', [board]),
      el('div.pz-side', [
        header(PUZZLE_NAMES.r1b),
        msg,
        el('div.pz-tools', [
          peekBtn,
          numBtn,
          gentle,
          button(
            LABELS.hint,
            () => {
              game.showHint('r1b');
              layout(); // the third hint unlocks the gentle shuffle
            },
            'small',
          ),
          button(LABELS.close, close, 'small'),
        ]),
        el('p.note-small', { style: { textAlign: 'center' } }, LABELS.slidingHelp),
      ]),
    ],
    { onClose: close, cls: 'pz' },
  );
  const offChange = puzzle.onChange((p, just) => {
    layout();
    if (just) {
      board.classList.add('solved-glow');
      setTimeout(() => {
        if (game.modals.top() === m) close();
        if (onSolvedClose) onSolvedClose();
      }, 1700);
    }
  });
  // "A bigger hint" on the hint card can unlock the gentle shuffle too.
  const offHint = game.gs.on('hint', ({ id }) => id === 'r1b' && layout());
  const off = () => (offChange(), offHint());
  m = game.modals.show(c, {
    name: 'sliding',
    onClose: off,
    onKey: (e) => {
      if (hintKey(game, 'r1b', e)) {
        layout();
        return true;
      }
      const dir = { ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down', ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right' }[
        e.code
      ];
      if (dir) {
        if (puzzle.moveDir(dir)) game.audio.slide();
        layout();
        return true;
      }
      if (e.code === 'Space') showPeek(!peek.classList.contains('on'));
      return true;
    },
  });
  layout();
  return m;
}

// ------------------------------------------------------------------- sudoku
export function sudokuOverlay(game, puzzle) {
  let sel = puzzle.grid.findIndex((v) => v === 0);
  const grid = el('div.sudoku');
  const cells = [];
  const msg = el('div.pz-msg', LABELS.sudokuStart);
  let wrong = new Set();
  const n = puzzle.n;
  const { br, bc } = shape(n);
  const total = n * n;
  grid.style.gridTemplateColumns = `repeat(${n}, 1fr)`;
  grid.classList.add(`n${n}`);
  for (let i = 0; i < total; i++) {
    const r = Math.floor(i / n);
    const c = i % n;
    // Wider gaps mark the boxes.
    const cell = el(`div.cell${c > 0 && c % bc === 0 ? '.bl' : ''}${r > 0 && r % br === 0 ? '.bt' : ''}`);
    cell.addEventListener('pointerdown', () => {
      if (!puzzle.isGiven(i)) {
        sel = i;
        render();
        game.audio.click();
      }
    });
    cells.push(cell);
    grid.appendChild(cell);
  }
  const render = () => {
    cells.forEach((cell, i) => {
      cell.textContent = puzzle.grid[i] || '';
      cell.classList.toggle('given', puzzle.isGiven(i));
      cell.classList.toggle('sel', i === sel && !puzzle.isSolved());
      cell.classList.toggle('wrong', wrong.has(i));
    });
  };
  const put = (v) => {
    if (sel < 0 || puzzle.isSolved()) return;
    wrong.delete(sel);
    puzzle.set(sel, v);
    game.audio.click();
    render();
  };
  const check = () => {
    if (puzzle.isSolved()) return;
    const empty = puzzle.grid.filter((v) => v === 0).length;
    wrong = new Set(puzzle.wrongCells());
    if (wrong.size) msg.textContent = wrong.size === 1 ? LABELS.sudokuOneWrong : fill(LABELS.sudokuWrong, { N: wrong.size });
    else if (empty) msg.textContent = fill(LABELS.sudokuLeft, { N: empty });
    render();
    game.audio.soft();
  };
  let m;
  const close = () => game.modals.close(m);
  const pad = el(
    'div.numpad',
    Array.from({ length: n }, (_, k) => button(String(k + 1), () => put(k + 1))),
  );
  const c = card(
    null,
    [
      el('div.pz-main', [grid]),
      el('div.pz-side', [
        header(PUZZLE_NAMES.r4b),
        pad,
        msg,
        el('div.pz-tools', [
          button(LABELS.clear, () => put(0), 'small'),
          button(LABELS.check, check, 'small'),
          button(LABELS.hint, () => game.showHint('r4b'), 'small'),
          button(LABELS.close, close, 'small'),
        ]),
      ]),
    ],
    { onClose: close, cls: 'pz' },
  );
  const off = puzzle.onChange((p, just) => {
    render();
    if (just) {
      msg.textContent = LABELS.sudokuSolved;
      grid.classList.add('solved-glow');
      setTimeout(() => game.modals.top() === m && close(), 1600);
    }
  });
  m = game.modals.show(c, {
    name: 'sudoku',
    onClose: off,
    onKey: (e) => {
      if (hintKey(game, 'r4b', e)) return true;
      const d = /^(Digit|Numpad)(\d)$/.exec(e.code);
      if (d && Number(d[2]) >= 1 && Number(d[2]) <= n) put(Number(d[2]));
      if (['Backspace', 'Delete', 'Digit0', 'Numpad0'].includes(e.code)) put(0);
      const mv = { ArrowUp: -n, ArrowDown: n, ArrowLeft: -1, ArrowRight: 1 }[e.code];
      if (mv) {
        let s = sel;
        for (let k = 0; k < total; k++) {
          s = (s + mv + total) % total;
          if (!puzzle.isGiven(s)) break;
        }
        sel = s;
        render();
      }
      if (e.code === 'Enter') check();
      return true;
    },
  });
  render();
  return m;
}

// ---------------------------------------------------------------- gate lock
export function lockOverlay(game, puzzle) {
  const nums = [];
  const lock = el('div.lock');
  const msg = el('div.pz-msg', LABELS.lockStart);
  let cursor = 0;
  for (let i = 0; i < 4; i++) {
    const n = el('div.num', String(puzzle.digits[i]));
    nums.push(n);
    lock.appendChild(el('div.wheel', [button('▲', () => spin(i, 1), 'small'), n, button('▼', () => spin(i, -1), 'small')]));
  }
  const spin = (i, d) => {
    puzzle.spin(i, d);
    game.audio.click();
    render();
  };
  const render = () => nums.forEach((n, i) => (n.textContent = String(puzzle.digits[i])));
  const tryIt = () => {
    if (puzzle.tryOpen()) return;
    game.audio.soft();
    lock.classList.remove('lock-shake');
    void lock.offsetWidth;
    lock.classList.add('lock-shake');
    msg.textContent = puzzle.attempts > 1 ? LABELS.lockNotYet : LABELS.lockNotQuite;
  };
  let m;
  const close = () => game.modals.close(m);
  const c = card(
    null,
    [
      el('div.pz-main', [lock]),
      el('div.pz-side', [
        header(PUZZLE_NAMES.r5a),
        msg,
        el('div.pz-tools', [
          button(LABELS.lockOpen, tryIt, 'primary'),
          button(LABELS.lockJournal, () => game.openJournal(), 'small'),
          button(LABELS.hint, () => game.showHint('r5a'), 'small'),
          button(LABELS.close, close, 'small'),
        ]),
        el('p.note-small', { style: { textAlign: 'center' } }, LABELS.lockHelp),
      ]),
    ],
    { onClose: close, cls: 'pz' },
  );
  const off = puzzle.onChange((p, just) => {
    render();
    if (just) {
      msg.textContent = LABELS.lockOpened;
      game.audio.keyTurn();
      lock.classList.add('solved-glow');
      setTimeout(() => game.modals.top() === m && close(), 1300);
    }
  });
  m = game.modals.show(c, {
    name: 'lock',
    onClose: off,
    onKey: (e) => {
      if (hintKey(game, 'r5a', e)) return true;
      if (e.code === 'Tab') {
        game.openJournal();
        return true;
      }
      const d = /^(Digit|Numpad)(\d)$/.exec(e.code);
      if (d) {
        puzzle.setDigit(cursor, Number(d[2]));
        cursor = (cursor + 1) % 4;
        game.audio.click();
        render();
      }
      if (e.code === 'Enter') tryIt();
      if (e.code === 'ArrowLeft') cursor = (cursor + 3) % 4;
      if (e.code === 'ArrowRight') cursor = (cursor + 1) % 4;
      return true;
    },
  });
  return m;
}

// ------------------------------------------------------------ constellation
export function constellationOverlay(game, puzzle) {
  const W = 800;
  const H = 640;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const g = canvas.getContext('2d');
  const bgc = document.createElement('canvas');
  bgc.width = W;
  bgc.height = H;
  drawStarField(bgc.getContext('2d'), W, H);
  const place = (p) => ({ x: (p.x - 0.5) * W * 0.66 + W * 0.5, y: (p.y - 0.5) * H * 0.78 + H * 0.5 });
  const stars = heartStars(puzzle.count).map((p, i) => ({ ...place(p), label: puzzle.labels[i], index: i }));
  // Loose lettered stars that belong to no month.
  const loose = puzzle.decoys.map((d, k) => ({ ...place(d), label: d.label, index: -1 - k }));
  const all = stars.concat(loose);
  game.gs.readClue('telescope');
  const flash = new Map(); // index -> time
  let done = puzzle.isSolved();
  let glow = 0;
  let raf = 0;
  const draw = () => {
    const now = performance.now();
    g.drawImage(bgc, 0, 0);
    // lines
    const n = puzzle.progress;
    g.lineWidth = 3;
    g.strokeStyle = done ? `rgba(255,190,200,${0.8 + glow * 0.2})` : 'rgba(255,240,200,0.85)';
    g.shadowColor = 'rgba(255,220,160,0.9)';
    g.shadowBlur = 10 + glow * 25;
    g.beginPath();
    for (let i = 0; i < n; i++) {
      const s = stars[i];
      if (i === 0) g.moveTo(s.x, s.y);
      else g.lineTo(s.x, s.y);
    }
    if (done) g.closePath();
    g.stroke();
    g.shadowBlur = 0;
    // stars
    all.forEach((s) => {
      const i = s.index;
      const lit = i >= 0 && (i < n || done);
      const f = flash.get(i);
      const ft = f ? Math.max(0, 1 - (now - f) / 700) : 0;
      const r = lit ? 7 : 5.5;
      const grad = g.createRadialGradient(s.x, s.y, 0, s.x, s.y, r * 4);
      grad.addColorStop(0, ft > 0 ? `rgba(255,160,150,${0.5 + ft * 0.5})` : lit ? 'rgba(255,240,200,0.95)' : 'rgba(220,230,255,0.75)');
      grad.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = grad;
      g.beginPath();
      g.arc(s.x, s.y, r * 4, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = ft > 0 ? `rgba(255,${180 - ft * 60},${170 - ft * 60},${1 - ft * 0.6})` : lit ? '#fff3cf' : '#e8eeff';
      g.beginPath();
      g.arc(s.x, s.y, r, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = lit ? 'rgba(255,240,200,0.95)' : 'rgba(230,236,255,0.85)';
      g.font = 'bold 20px "Segoe UI", sans-serif';
      g.textAlign = 'center';
      g.fillText(s.label, s.x + (s.x < W / 2 ? -20 : 20), s.y - 12);
    });
    if (done) glow = Math.min(1, glow + 0.02);
    raf = requestAnimationFrame(draw);
  };
  const wrap = el('div.sky-wrap', [canvas]);
  const msg = el('div.pz-msg', CLUES.telescope.text.replace('\n', ' '));
  canvas.addEventListener('pointerdown', (e) => {
    if (done) return;
    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * W;
    const y = ((e.clientY - rect.top) / rect.height) * H;
    let best = null;
    let bd = e.pointerType === 'mouse' ? 40 : 56; // fingers are wider than a mouse pointer
    all.forEach((s) => {
      const d = Math.hypot(s.x - x, s.y - y);
      if (d < bd) {
        bd = d;
        best = s.index;
      }
    });
    if (best === null) return;
    if (best >= 0 && best < puzzle.progress) return; // already connected: ignore kindly
    const res = puzzle.pick(best);
    if (res === 'wrong') {
      flash.set(best, performance.now());
      game.audio.soft();
    } else game.audio.smallChime(best);
  });
  let m;
  const close = () => game.modals.close(m);
  const c = card(
    null,
    [
      el('div.pz-main', [wrap]),
      el('div.pz-side', [
        header(PUZZLE_NAMES.r5b, TULIP_SVG('#fbf7f0', 26)),
        msg,
        el('div.pz-tools', [button(LABELS.hint, () => game.showHint('r5b'), 'small'), button(LABELS.close, close, 'small')]),
      ]),
    ],
    { wide: true, onClose: close, cls: 'pz' },
  );
  const off = puzzle.onChange((p, just) => {
    if (just) {
      done = true;
      msg.textContent = LABELS.starsDone;
      setTimeout(() => game.modals.top() === m && close(), 2400);
    }
  });
  m = game.modals.show(c, {
    name: 'constellation',
    onClose: () => {
      off();
      cancelAnimationFrame(raf);
    },
    onKey: (e) => hintKey(game, 'r5b', e) || true,
  });
  draw();
  // For automated testing: star positions in client coordinates.
  canvas.dataset.stars = JSON.stringify(stars.map((s) => [s.x / W, s.y / H]));
  canvas.dataset.loose = JSON.stringify(loose.map((s) => [s.x / W, s.y / H]));
  return m;
}

// --------------------------------------------------------------- vase slots
export function vasePicker(game, puzzle, slot) {
  let m;
  const close = () => game.modals.close(m);
  const row = el('div.vase-row');
  const renderRow = () => {
    row.innerHTML = '';
    puzzle.slots.forEach((c, i) => {
      const dot = el('span', String(i + 1));
      dot.style.background = c === 'B' ? hex(COLORS.tulipBlue) : c === 'W' ? '#efe8dc' : 'transparent';
      dot.style.color = c === 'W' ? '#7a665b' : '#fff';
      dot.style.border = i === slot ? '3px solid #e2a29d' : c ? '0' : '2px dashed #c9b9a8';
      if (!c) dot.style.color = '#b7a594';
      row.appendChild(dot);
    });
  };
  const choose = (color) => {
    puzzle.place(slot, color);
    game.audio.click();
    renderRow();
    setTimeout(() => game.modals.top() === m && close(), 250);
  };
  const c = card(
    fill(LABELS.slot, { N: slot + 1 }),
    [
      el('p', LABELS.vaseIntro),
      row,
      el('div.vase-pick', [
        el('button.btn', { type: 'button', onclick: () => choose('B'), html: TULIP_SVG('#6f9be0', 40) }, [el('span', LABELS.blue)]),
        el('button.btn', { type: 'button', onclick: () => choose('W'), html: TULIP_SVG('#fbf7f0', 40) }, [el('span', LABELS.white)]),
      ]),
      el('div.btn-row', [
        puzzle.slots[slot] ? button(LABELS.takeOut, () => choose(null), 'small') : null,
        button(LABELS.hint, () => game.showHint('r2a'), 'small'),
        button(LABELS.close, close, 'small'),
      ]),
    ],
    { icon: TULIP_SVG('#6f9be0', 26), onClose: close },
  );
  m = game.modals.show(c, {
    name: 'vase',
    onKey: (e) => {
      if (hintKey(game, 'r2a', e)) return true;
      if (e.code === 'KeyB' || e.code === 'Digit1') choose('B');
      if (e.code === 'KeyW' || e.code === 'Digit2') choose('W');
      return true;
    },
  });
  renderRow();
  return m;
}

// ----------------------------------------------------------- cipher typing
export function cipherOverlay(game, puzzle) {
  let m;
  const close = () => game.modals.close(m);
  const input = el('input.cipher-input', {
    maxlength: String(puzzle.length),
    spellcheck: 'false',
    autocomplete: 'off',
    autocorrect: 'off',
    autocapitalize: 'characters',
    enterkeyhint: 'done',
    value: puzzle.text,
  });
  const msg = el('div.pz-msg', fill(LABELS.stripCard, { CODE: puzzle.encoded }));
  const submit = () => {
    if (puzzle.setText(input.value)) return;
    if (input.value.replace(/[^a-z]/gi, '').length < puzzle.length) msg.textContent = fill(LABELS.stripNeeds, { N: puzzle.length });
    else msg.textContent = LABELS.stripWrong;
    game.audio.soft();
  };
  input.addEventListener('keydown', (e) => {
    // Phone keyboards often leave e.code empty, so check e.key too.
    if (e.code === 'Enter' || e.key === 'Enter') submit();
    e.stopPropagation();
    if (e.code === 'Escape') close();
  });
  const c = card(
    LABELS.stripTitle,
    [
      el('p', LABELS.stripIntro),
      input,
      msg,
      el('div.btn-row', [
        button(LABELS.spellIt, submit, 'primary'),
        button(LABELS.readCard, () => game.openClue('cipherCard', true), 'small'),
        button(LABELS.hint, () => game.showHint('r3a'), 'small'),
        button(LABELS.close, close, 'small'),
      ]),
    ],
    { icon: TULIP_SVG('#6f9be0', 26), onClose: close },
  );
  const off = puzzle.onChange((p, just) => {
    if (just) {
      msg.textContent = LABELS.stripSolved;
      setTimeout(() => game.modals.top() === m && close(), 1200);
    }
  });
  m = game.modals.show(c, { name: 'cipher', onClose: off });
  setTimeout(() => input.focus(), 50);
  return m;
}

export { CLUES };

// ------------------------------------------------------------ attic: piano
// Seven white keys with their letters (and the black keys painted between).
// It plays the current part of the tune, lighting each key; then it is your
// turn. Once solved it is just a piano. opts.onSolved runs after it closes.
export function pianoOverlay(game, puzzle, { onSolved } = {}) {
  const keys = PIANO_KEYS.map((name, k) =>
    el('button.pkey', { type: 'button', 'data-key': k, 'aria-label': name, onpointerdown: (e) => (e.preventDefault(), press(k)) }, [
      el('span', name),
    ]),
  );
  const blacks = [0, 1, 3, 4, 5].map((k) => el('i.pblack', { style: { left: `calc(${((k + 1) / 7) * 100}% - 4.5%)` } }));
  const board = el('div.piano', [...keys, ...blacks]);
  const msg = el('div.pz-msg', puzzle.isSolved() ? LABELS.pianoFree : LABELS.pianoIntro);
  let busy = false; // the piano is playing (or about to): keys wait
  const setBusy = (on) => {
    busy = on;
    board.classList.toggle('busy', on);
  };
  let timers = [];
  const later = (fn, ms) => timers.push(setTimeout(fn, ms));
  const light = (k, ms = 360) => {
    keys[k].classList.add('lit');
    setTimeout(() => keys[k].classList.remove('lit'), ms);
  };
  const play = () => {
    timers.forEach(clearTimeout);
    timers = [];
    puzzle.restart();
    const notes = puzzle.isSolved() ? puzzle.tune : puzzle.current();
    setBusy(true);
    msg.textContent = '…';
    notes.forEach((k, i) =>
      later(
        () => {
          game.audio.pianoNote(k);
          light(k, 420);
        },
        350 + i * 620,
      ),
    );
    later(
      () => {
        setBusy(false);
        msg.textContent = puzzle.isSolved() ? LABELS.pianoFree : fill(LABELS.pianoYourTurn, { N: notes.length });
      },
      350 + notes.length * 620,
    );
  };
  const press = (k) => {
    if (busy) return;
    game.audio.pianoNote(k);
    light(k);
    const r = puzzle.press(k);
    if (r === 'wrong') {
      msg.textContent = LABELS.pianoWrong;
      board.classList.remove('lock-shake');
      void board.offsetWidth;
      board.classList.add('lock-shake');
      setBusy(true);
      later(play, 1100);
    } else if (r === 'round') {
      msg.textContent = LABELS.pianoMore;
      setBusy(true);
      later(play, 1000);
    } else if (r === 'solved') {
      msg.textContent = LABELS.pianoSolved;
      board.classList.add('solved-glow');
      setBusy(true);
      later(() => {
        if (game.modals.top() === m) close();
        if (onSolved) onSolved();
      }, 1900);
    }
  };
  let m;
  const close = () => game.modals.close(m);
  const c = card(
    null,
    [
      el('div.pz-main', [board]),
      el('div.pz-side', [
        header(PUZZLE_NAMES.piano),
        msg,
        el('div.pz-tools', [
          button(LABELS.pianoListen, () => !busy && play(), 'primary'),
          puzzle.isSolved() ? null : button(LABELS.hint, () => game.showHint('piano'), 'small'),
          button(LABELS.close, close, 'small'),
        ]),
        el('p.note-small', { style: { textAlign: 'center' } }, LABELS.pianoHelp),
      ]),
    ],
    { onClose: close, cls: 'pz' },
  );
  m = game.modals.show(c, {
    name: 'piano',
    onClose: () => timers.forEach(clearTimeout),
    onKey: (e) => {
      if (hintKey(game, 'piano', e)) return true;
      const d = /^(Digit|Numpad)([1-7])$/.exec(e.code);
      if (d) press(Number(d[2]) - 1);
      if (e.code === 'Space' || e.code === 'KeyL') !busy && play();
      return true;
    },
  });
  if (!puzzle.isSolved()) {
    setBusy(true);
    later(play, 500);
  }
  return m;
}

// ------------------------------------------------------- attic: the trunk
// Four wheels of little pictures; Open tries the lock.
export function trunkOverlay(game, puzzle) {
  const faces = [];
  const lock = el('div.lock.picture-lock');
  const msg = el('div.pz-msg', LABELS.trunkStart);
  let cursor = 0;
  const draw = (i) => {
    const cv = faces[i];
    const x = cv.getContext('2d');
    x.clearRect(0, 0, cv.width, cv.height);
    drawLockPicture(x, puzzle.picture(i), cv.width / 2, cv.height / 2, cv.width * 0.86);
    cv.setAttribute('aria-label', TRUNK_PICTURES[puzzle.wheels[i]].name);
  };
  for (let i = 0; i < 4; i++) {
    const cv = el('canvas.pic', { width: 120, height: 120, role: 'img' });
    faces.push(cv);
    lock.appendChild(el('div.wheel', [button('▲', () => spin(i, 1), 'small'), cv, button('▼', () => spin(i, -1), 'small')]));
  }
  const spin = (i, d) => {
    puzzle.spin(i, d);
    game.audio.click();
  };
  const render = () => faces.forEach((_, i) => draw(i));
  const tryIt = () => {
    if (puzzle.tryOpen()) return;
    game.audio.soft();
    lock.classList.remove('lock-shake');
    void lock.offsetWidth;
    lock.classList.add('lock-shake');
    msg.textContent = LABELS.trunkNotQuite;
  };
  let m;
  const close = () => game.modals.close(m);
  const c = card(
    null,
    [
      el('div.pz-main', [lock]),
      el('div.pz-side', [
        header(PUZZLE_NAMES.trunk),
        msg,
        el('div.pz-tools', [
          button(LABELS.trunkOpen, tryIt, 'primary'),
          button(LABELS.lockJournal, () => game.openJournal(), 'small'),
          button(LABELS.hint, () => game.showHint('trunk'), 'small'),
          button(LABELS.close, close, 'small'),
        ]),
        el('p.note-small', { style: { textAlign: 'center' } }, LABELS.trunkHelp),
      ]),
    ],
    { onClose: close, cls: 'pz' },
  );
  const off = puzzle.onChange((p, just) => {
    render();
    if (just) {
      msg.textContent = LABELS.trunkOpened;
      game.audio.keyTurn();
      lock.classList.add('solved-glow');
      setTimeout(() => game.modals.top() === m && close(), 1300);
    }
  });
  m = game.modals.show(c, {
    name: 'trunk',
    onClose: off,
    onKey: (e) => {
      if (hintKey(game, 'trunk', e)) return true;
      if (e.code === 'Tab') {
        game.openJournal();
        return true;
      }
      if (e.code === 'ArrowLeft') cursor = (cursor + 3) % 4;
      if (e.code === 'ArrowRight') cursor = (cursor + 1) % 4;
      if (e.code === 'ArrowUp') spin(cursor, 1);
      if (e.code === 'ArrowDown') spin(cursor, -1);
      if (e.code === 'Enter') tryIt();
      faces.forEach((f, i) => f.classList.toggle('cur', i === cursor));
      return true;
    },
  });
  render();
  return m;
}

// --------------------------------------------------------- attic: the photo
export function photoOverlay(game) {
  game.audio.pageFlip();
  const holder = el('div.photo-pic');
  photoImage().then((img) => {
    const [w, h] = sizeOf(img);
    const cv = el('canvas', { width: w, height: h, role: 'img', 'aria-label': LABELS.photoTitle });
    cv.getContext('2d').drawImage(img, 0, 0);
    holder.appendChild(cv);
  });
  let m;
  const close = () => game.modals.close(m);
  const polaroid = el('div.photo', [holder, PHOTO.caption ? el('p.photo-caption', PHOTO.caption) : null]);
  const wrap = el('div.paper-wrap', [polaroid, el('div.paper-actions', [button(LABELS.okay, close)])]);
  m = game.modals.show(wrap, { name: 'photo', backdropClose: true });
  return m;
}

// Shared by the side rooms' screens: a puzzle card with the usual side panel.
function sideCard(game, id, main, msg, tools, help) {
  return card(
    null,
    [
      el('div.pz-main', [main]),
      el('div.pz-side', [
        header(PUZZLE_NAMES[id]),
        msg,
        el('div.pz-tools', [...tools, game.gs.puzzles[id].isSolved() ? null : button(LABELS.hint, () => game.showHint(id), 'small')]),
        el('p.note-small', { style: { textAlign: 'center' } }, help),
      ]),
    ],
    { cls: 'pz', onClose: () => game.modals.close(game.modals.top()) },
  );
}
function shake(node) {
  node.classList.remove('lock-shake');
  void node.offsetWidth;
  node.classList.add('lock-shake');
}
function solvedThenClose(game, getM, node, ms = 1500) {
  node.classList.add('solved-glow');
  setTimeout(() => game.modals.top() === getM() && game.modals.close(getM()), ms);
}
const capFirst = (s) => s.charAt(0).toUpperCase() + s.slice(1);

// A little potted plant, drawn for the watering screen.
function drawPot(cv, plantId, wet) {
  const g = cv.getContext('2d');
  const w = cv.width;
  const h = cv.height;
  g.clearRect(0, 0, w, h);
  const leaf = { cactus: '#7aa86a', tomato: '#5f8f55', lemon: '#4f7a4a', daisy: '#6f9d5a' }[plantId] || '#5f8f55';
  g.save();
  g.translate(w / 2, h * 0.62);
  if (!wet) g.rotate(0.12);
  g.fillStyle = leaf;
  for (let i = 0; i < 7; i++) {
    const a = -Math.PI / 2 + (i - 3) * 0.38;
    g.beginPath();
    g.ellipse(Math.cos(a) * w * 0.16, Math.sin(a) * w * 0.2, w * 0.07, w * 0.17, a + Math.PI / 2, 0, Math.PI * 2);
    g.fill();
  }
  if (plantId === 'daisy' || plantId === 'orchid')
    for (const [x, y] of [
      [-0.12, -0.3],
      [0.1, -0.36],
    ]) {
      g.fillStyle = plantId === 'daisy' ? '#ffffff' : '#e7a3d0';
      g.beginPath();
      g.arc(x * w, y * w, w * 0.05, 0, Math.PI * 2);
      g.fill();
    }
  if (plantId === 'lemon' || plantId === 'tomato') {
    g.fillStyle = plantId === 'lemon' ? '#f2d24a' : '#e0533e';
    g.beginPath();
    g.arc(w * 0.12, -w * 0.12, w * 0.05, 0, Math.PI * 2);
    g.fill();
  }
  g.restore();
  g.fillStyle = wet ? '#b5654a' : '#d99a6c';
  g.beginPath();
  g.moveTo(w * 0.28, h * 0.6);
  g.lineTo(w * 0.72, h * 0.6);
  g.lineTo(w * 0.66, h * 0.95);
  g.lineTo(w * 0.34, h * 0.95);
  g.closePath();
  g.fill();
  if (wet) {
    g.fillStyle = '#6fa8dc';
    g.beginPath();
    g.arc(w * 0.82, h * 0.2, w * 0.05, 0, Math.PI * 2);
    g.fill();
  }
}

// ------------------------------------------------------ greenhouse: watering
export function waterOverlay(game, puzzle) {
  const pots = [];
  const grid = el('div.pots');
  const msg = el('div.pz-msg', puzzle.isSolved() ? LABELS.waterSolved : LABELS.waterStart);
  for (let i = 0; i < 6; i++) {
    const cv = el('canvas', { width: 120, height: 120 });
    const b = el('button.pot', { type: 'button', onclick: () => water(i) }, [
      cv,
      el('b', puzzle.plant(i).name),
      el('span.tag', fill(LABELS.waterTag, { DAY: puzzle.day(i) })),
    ]);
    pots.push({ b, cv });
    grid.append(b);
  }
  const render = () =>
    pots.forEach(({ b, cv }, i) => {
      const wet = puzzle.isWatered(i) || puzzle.isSolved();
      b.classList.toggle('wet', wet);
      drawPot(cv, puzzle.plant(i).id, wet);
    });
  const water = (i) => {
    const r = puzzle.water(i);
    const name = capFirst(puzzle.plant(i).name);
    if (r === 'wrong') {
      game.audio.soft();
      msg.textContent = fill(LABELS.waterWrong, { NAME: name });
      shake(grid);
    } else if (r === 'ok') {
      game.audio.click();
      msg.textContent = fill(LABELS.waterOk, { NAME: name });
    } else if (r === 'solved') {
      msg.textContent = LABELS.waterSolved;
      solvedThenClose(game, () => m, grid);
    }
    render();
  };
  let m;
  const close = () => game.modals.close(m);
  const c = sideCard(
    game,
    'water',
    grid,
    msg,
    [button(LABELS.readCard, () => showClue(game, 'waterCard'), 'small'), button(LABELS.close, close, 'small')],
    LABELS.waterHelp,
  );
  m = game.modals.show(c, {
    name: 'water',
    onKey: (e) => {
      if (hintKey(game, 'water', e)) return true;
      const d = /^(Digit|Numpad)([1-6])$/.exec(e.code);
      if (d) water(Number(d[2]) - 1);
      return true;
    },
  });
  render();
  return m;
}

// --------------------------------------------------- greenhouse: grow lamps
export function lampsOverlay(game, puzzle) {
  const grid = el('div.lamp-grid');
  const msg = el('div.pz-msg', LABELS.lampsStart);
  const flip = (i) => {
    if (puzzle.isSolved()) return;
    puzzle.flip(i);
    game.audio.click();
  };
  const cells = Array.from({ length: 16 }, (_, i) =>
    el(
      'button.lamp',
      { type: 'button', 'aria-label': `${Math.floor(i / 4) + 1}-${(i % 4) + 1}`, onpointerdown: (e) => (e.preventDefault(), flip(i)) },
      [el('i')],
    ),
  );
  grid.append(...cells);
  const render = () => {
    cells.forEach((c, i) => c.classList.toggle('on', puzzle.isOn(i)));
    msg.textContent = puzzle.isSolved() ? LABELS.lampsSolved : fill(LABELS.lampsMoves, { N: puzzle.moves });
  };
  let m;
  const close = () => game.modals.close(m);
  const c = sideCard(game, 'lamps', grid, msg, [button(LABELS.close, close, 'small')], LABELS.lampsHelp);
  const off = puzzle.onChange((p, just) => {
    render();
    if (just) solvedThenClose(game, () => m, grid);
  });
  m = game.modals.show(c, { name: 'lamps', onClose: off, onKey: (e) => hintKey(game, 'lamps', e) || true });
  render();
  return m;
}

// ----------------------------------------------------- basement: fuse box
export function fusesOverlay(game, puzzle) {
  const switches = [];
  const row = el('div.fuse-row');
  const toggle = (i) => {
    if (puzzle.isSolved()) return;
    puzzle.toggle(i);
    game.audio.click();
    render();
  };
  for (let i = 0; i < 5; i++) {
    const b = el('button.fuse', { type: 'button', onclick: () => toggle(i) }, [el('i'), el('span', puzzle.name(i))]);
    switches.push(b);
    row.append(b);
  }
  const items = puzzle.card.map((line) => el('li', line));
  const rules = el('ol.fuse-card', items);
  const box = el('div.fuse-box', [row, rules]);
  const msg = el('div.pz-msg', puzzle.isSolved() ? LABELS.fusesSolved : LABELS.fusesStart);
  const render = () => {
    switches.forEach((b, i) => b.classList.toggle('on', puzzle.isOn(i)));
    const broken = puzzle.broken();
    items.forEach((li, i) => li.classList.toggle('broken', broken[i]));
  };
  const pull = () => {
    if (puzzle.isSolved()) return;
    if (puzzle.pull()) {
      game.audio.keyTurn();
      msg.textContent = LABELS.fusesSolved;
      solvedThenClose(game, () => m, box);
      return;
    }
    game.audio.soft();
    msg.textContent = LABELS.fusesWrong;
    shake(box);
  };
  let m;
  const close = () => game.modals.close(m);
  const c = sideCard(
    game,
    'fuses',
    box,
    msg,
    [puzzle.isSolved() ? null : button(LABELS.fusesLever, pull, 'primary'), button(LABELS.close, close, 'small')],
    LABELS.fusesHelp,
  );
  m = game.modals.show(c, {
    name: 'fuses',
    onKey: (e) => {
      if (hintKey(game, 'fuses', e)) return true;
      const d = /^(Digit|Numpad)([1-5])$/.exec(e.code);
      if (d) toggle(Number(d[2]) - 1);
      if (e.code === 'Enter') pull();
      return true;
    },
  });
  render();
  return m;
}

// ------------------------------------------------------- basement: pipes
// The board: 5×5 pieces with the tap on the left edge and the boiler on the
// right, drawn on a canvas `size` pixels square (the wall board uses it too).
const PIPE_N = 5;
const pipeGeom = (size) => {
  const cell = size / (PIPE_N + 1);
  return { cell, x0: cell / 2, y0: cell / 2 };
};
export function drawPipes(g, puzzle, size, { wet = new Set() } = {}) {
  const { cell, x0, y0 } = pipeGeom(size);
  g.fillStyle = '#e9dfcc';
  g.fillRect(0, 0, size, size);
  g.strokeStyle = 'rgba(120,100,80,0.25)';
  g.lineWidth = 1;
  for (let i = 0; i <= PIPE_N; i++) {
    g.beginPath();
    g.moveTo(x0 + i * cell, y0);
    g.lineTo(x0 + i * cell, y0 + PIPE_N * cell);
    g.moveTo(x0, y0 + i * cell);
    g.lineTo(x0 + PIPE_N * cell, y0 + i * cell);
    g.stroke();
  }
  // The tap (red) and the boiler (blue once the water gets there).
  const tapY = y0 + (puzzle.tapRow + 0.5) * cell;
  const boilY = y0 + (puzzle.boilerRow + 0.5) * cell;
  g.fillStyle = '#c0392b';
  g.beginPath();
  g.arc(x0 * 0.55, tapY, cell * 0.2, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = puzzle.isSolved() ? '#3d8bfd' : '#8a8178';
  g.fillRect(x0 + PIPE_N * cell + cell * 0.08, boilY - cell * 0.32, cell * 0.36, cell * 0.64);
  const dirs = [
    [1, 0, -1],
    [2, 1, 0],
    [4, 0, 1],
    [8, -1, 0],
  ];
  g.lineCap = 'round';
  for (let i = 0; i < PIPE_N * PIPE_N; i++) {
    const cx = x0 + ((i % PIPE_N) + 0.5) * cell;
    const cy = y0 + (Math.floor(i / PIPE_N) + 0.5) * cell;
    const m = puzzle.masks[i];
    const color = wet.has(i) ? '#3d8bfd' : '#8a6a50';
    g.strokeStyle = color;
    g.lineWidth = cell * 0.24;
    for (const [bit, dx, dy] of dirs) {
      if (!(m & bit)) continue;
      g.beginPath();
      g.moveTo(cx, cy);
      g.lineTo(cx + (dx * cell) / 2, cy + (dy * cell) / 2);
      g.stroke();
    }
    g.fillStyle = color;
    g.beginPath();
    g.arc(cx, cy, cell * 0.12, 0, Math.PI * 2);
    g.fill();
  }
}
export function pipesOverlay(game, puzzle) {
  const size = 480;
  const cv = el('canvas.pipes', { width: size, height: size, role: 'img' });
  const msg = el('div.pz-msg', puzzle.isSolved() ? LABELS.pipesSolved : LABELS.pipesStart);
  const render = () => drawPipes(cv.getContext('2d'), puzzle, size, { wet: puzzle.wet() });
  cv.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    const r = cv.getBoundingClientRect();
    const { cell, x0, y0 } = pipeGeom(r.width);
    const x = Math.floor((e.clientX - r.left - x0) / cell);
    const y = Math.floor((e.clientY - r.top - y0) / cell);
    if (x < 0 || y < 0 || x >= PIPE_N || y >= PIPE_N || puzzle.isSolved()) return;
    puzzle.rotate(y * PIPE_N + x);
    game.audio.click();
  });
  let m;
  const close = () => game.modals.close(m);
  const c = sideCard(game, 'pipes', cv, msg, [button(LABELS.close, close, 'small')], LABELS.pipesHelp);
  const off = puzzle.onChange((p, just) => {
    render();
    if (just) {
      msg.textContent = LABELS.pipesSolved;
      solvedThenClose(game, () => m, cv);
    }
  });
  m = game.modals.show(c, { name: 'pipes', onClose: off, onKey: (e) => hintKey(game, 'pipes', e) || true });
  render();
  return m;
}

// ------------------------------------------------------ balcony: lanterns
export function lanternsOverlay(game, puzzle) {
  const N = 5;
  const grid = el('div.lantern-grid');
  const clues = puzzle.clues;
  const colHeads = [];
  const rowHeads = [];
  const cells = [];
  const toggle = (i) => {
    if (puzzle.isSolved()) return;
    puzzle.toggle(i);
    game.audio.click();
  };
  grid.append(el('span.corner'));
  for (let c = 0; c < N; c++) {
    const h = el(
      'span.clue.col',
      (clues.cols[c].length ? clues.cols[c] : [0]).map((n) => el('b', String(n))),
    );
    colHeads.push(h);
    grid.append(h);
  }
  for (let r = 0; r < N; r++) {
    const h = el('span.clue.row', clues.rows[r].length ? clues.rows[r].join(' ') : '0');
    rowHeads.push(h);
    grid.append(h);
    for (let c = 0; c < N; c++) {
      const i = r * N + c;
      const b = el('button.lantern', { type: 'button', onpointerdown: (e) => (e.preventDefault(), toggle(i)) }, [el('i')]);
      cells.push(b);
      grid.append(b);
    }
  }
  const msg = el('div.pz-msg', LABELS.lanternsStart);
  const render = () => {
    cells.forEach((b, i) => b.classList.toggle('on', !!(puzzle.lit[i] || (puzzle.isSolved() && puzzle.target[i]))));
    for (let k = 0; k < N; k++) {
      rowHeads[k].classList.toggle('done', puzzle.lineDone(k, false));
      colHeads[k].classList.toggle('done', puzzle.lineDone(k, true));
    }
    if (puzzle.isSolved()) msg.textContent = fill(LABELS.lanternsSolved, { NAME: puzzle.name });
  };
  let m;
  const close = () => game.modals.close(m);
  const c = sideCard(game, 'lanterns', grid, msg, [button(LABELS.close, close, 'small')], LABELS.lanternsHelp);
  const off = puzzle.onChange((p, just) => {
    render();
    if (just) solvedThenClose(game, () => m, grid, 2200);
  });
  m = game.modals.show(c, { name: 'lanterns', onClose: off, onKey: (e) => hintKey(game, 'lanterns', e) || true });
  render();
  return m;
}

// ------------------------------------------------------ balcony: star cards
function drawCardBack(g, w, h) {
  g.fillStyle = '#2b3566';
  g.fillRect(0, 0, w, h);
  g.fillStyle = '#f2c14e';
  for (const [x, y, r] of [
    [0.3, 0.3, 0.05],
    [0.7, 0.45, 0.04],
    [0.45, 0.72, 0.06],
  ]) {
    g.beginPath();
    g.arc(x * w, y * h, r * w, 0, Math.PI * 2);
    g.fill();
  }
}
// The cards as they lie on the balcony table (matched ones face up).
export function drawPairsTable(g, puzzle, w, h) {
  g.fillStyle = '#c9a27a';
  g.fillRect(0, 0, w, h);
  const cw = w / 4.6;
  const ch = h / 3.4;
  for (let i = 0; i < 12; i++) {
    const x = (w - 4 * cw) / 2 + (i % 4) * cw + cw * 0.08;
    const y = (h - 3 * ch) / 2 + Math.floor(i / 4) * ch + ch * 0.08;
    g.save();
    g.translate(x, y);
    if (puzzle.matched.includes(i)) {
      g.fillStyle = '#fbf3e4';
      g.fillRect(0, 0, cw * 0.84, ch * 0.84);
      drawCardPicture(g, puzzle.picture(i).id, cw * 0.42, ch * 0.42, Math.min(cw, ch) * 0.7);
    } else drawCardBack(g, cw * 0.84, ch * 0.84);
    g.restore();
  }
}
export function pairsOverlay(game, puzzle) {
  const grid = el('div.pairs-grid');
  const msg = el('div.pz-msg', puzzle.isSolved() ? fill(LABELS.pairsSolved, { N: puzzle.turns }) : LABELS.pairsStart);
  let peek = []; // a missed pair, shown for a moment
  let busy = false;
  const pick = (i) => {
    if (busy) return;
    const first = puzzle.open;
    const r = puzzle.pick(i);
    if (!r) return;
    game.audio.pageFlip();
    if (r === 'miss') {
      peek = [first, i];
      busy = true;
      msg.textContent = LABELS.pairsMiss;
      setTimeout(() => {
        peek = [];
        busy = false;
        render();
        msg.textContent = fill(LABELS.pairsTurns, { N: puzzle.turns });
      }, 950);
    } else if (r === 'pair') {
      game.audio.chime();
      msg.textContent = LABELS.pairsPair;
    } else if (r === 'done') {
      msg.textContent = fill(LABELS.pairsSolved, { N: puzzle.turns });
      solvedThenClose(game, () => m, grid, 1800);
    }
    render();
  };
  const cards = Array.from({ length: 12 }, (_, i) => {
    const cv = el('canvas', { width: 110, height: 140 });
    const b = el('button.scard', { type: 'button', onpointerdown: (e) => (e.preventDefault(), pick(i)) }, [cv]);
    grid.append(b);
    return { b, cv };
  });
  const render = () =>
    cards.forEach(({ b, cv }, i) => {
      const up = puzzle.isUp(i) || peek.includes(i);
      const g = cv.getContext('2d');
      g.clearRect(0, 0, cv.width, cv.height);
      if (up) {
        g.fillStyle = '#fbf3e4';
        g.fillRect(0, 0, cv.width, cv.height);
        drawCardPicture(g, puzzle.picture(i).id, cv.width / 2, cv.height / 2, cv.width * 0.78);
      } else drawCardBack(g, cv.width, cv.height);
      b.classList.toggle('up', up);
      b.classList.toggle('matched', puzzle.matched.includes(i));
    });
  let m;
  const close = () => game.modals.close(m);
  const c = sideCard(game, 'pairs', grid, msg, [button(LABELS.close, close, 'small')], LABELS.pairsHelp);
  m = game.modals.show(c, {
    name: 'pairs',
    onClose: () => {
      // A half-turned pair goes back over when the cards are left.
      if (puzzle.open !== null) {
        puzzle.open = null;
        puzzle.changed();
      }
    },
    onKey: (e) => hintKey(game, 'pairs', e) || true,
  });
  render();
  return m;
}

// ------------------------------------------------- the treasure hunt's end
export function couponOverlay(game) {
  game.audio.sparkle();
  let m;
  const close = () => game.modals.close(m);
  const coupon = el('div.coupon', [el('span.title', HUNT_COUPON.title), el('p', HUNT_COUPON.text), el('div.coupon-heart', '♥')]);
  m = game.modals.show(el('div.paper-wrap', [coupon, el('div.paper-actions', [button(LABELS.okay, close)])]), {
    name: 'coupon',
    backdropClose: true,
  });
  return m;
}
