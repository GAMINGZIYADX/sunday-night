import { el, button, TULIP_SVG } from './dom.js';
import { card } from './manager.js';
import { drawTulipField, drawStarField } from '../rooms/art.js';
import { heartStars, decoyStars } from '../puzzles/constellation.js';
import { N as SN } from '../puzzles/sliding.js';
import { PUZZLE_NAMES, CIPHER_ENCODED, COLORS, CLUES } from '../config.js';
import { hex } from '../engine/textures.js';
import { LABELS } from '../config.js';
import { fill } from '../engine/text.js';
import { shape } from '../puzzles/sudokuMath.js';

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
  const off = puzzle.onChange((p, just) => {
    layout();
    if (just) {
      board.classList.add('solved-glow');
      setTimeout(() => {
        if (game.modals.top() === m) close();
        if (onSolvedClose) onSolvedClose();
      }, 1700);
    }
  });
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
  const loose = decoyStars().map((d, k) => ({ ...place(d), label: d.label, index: -1 - k }));
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
  const msg = el('div.pz-msg', fill(LABELS.stripCard, { CODE: CIPHER_ENCODED }));
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
