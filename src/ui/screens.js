import { el, button, TULIP_SVG } from './dom.js';
import { card } from './manager.js';
import { GAME_TITLE, UI, NOTES, NOTE_PLACES, PUZZLE_NAMES, ROOM_NAMES, CLUES, FINDS } from '../config.js';
import { PUZZLE_IDS } from '../puzzles/index.js';
import { KEY_SVG } from './dom.js';
import { exportCode, importCode } from '../engine/save.js';
import { LABELS, TOASTS } from '../config.js';
import { fill } from '../engine/text.js';
import { device, enterFullscreen, isFullscreen } from '../engine/device.js';
import { autoQuality } from '../engine/quality.js';
import { updateNotice, updatesEnabled } from '../engine/updateCheck.js';
import { canSelfUpdate, downloadUpdate } from '../engine/selfUpdate.js';

const tulips = () => el('div.tulip-row', { html: TULIP_SVG('#6f9be0', 26) + TULIP_SVG('#fbf7f0', 26) + TULIP_SVG('#6f9be0', 26) });

// ----------------------------------------------------------- title screens
export function clickToStart(game, onStart) {
  const c = el('div.card', [tulips(), el('h1', GAME_TITLE), el('p.sub', UI.subtitle), el('div.start-hint', UI.clickToStart)]);
  const m = game.modals.show(c, { name: 'start', escClose: false });
  const go = () => {
    m.el.removeEventListener('click', go);
    window.removeEventListener('keydown', key);
    game.modals.close(m, { silent: true });
    enterFullscreen();
    onStart();
  };
  const key = (e) => {
    if (e.code === 'Enter' || e.code === 'Space') go();
  };
  // A tap has to finish (click) before the browser allows sound and full screen.
  m.el.addEventListener('click', go);
  window.addEventListener('keydown', key);
}

export function mainMenu(game) {
  const hasSave = game.hasSave();
  const items = [];
  if (hasSave) items.push(button(UI.continue, () => game.continueGame(), 'primary'));
  items.push(
    button(
      UI.newGame,
      () => {
        if (hasSave) confirmBox(game, LABELS.confirmNewGame, () => game.newGame());
        else game.newGame();
      },
      hasSave ? '' : 'primary',
    ),
  );
  items.push(button(UI.settings, () => settingsPanel(game)));
  const foot = el('p.version', fill(UI.version, { V: __APP_VERSION__ }));
  const c = el('div.card', [tulips(), el('h1', GAME_TITLE), el('p.sub', UI.subtitle), el('div.menu', items), foot]);
  if (updatesEnabled()) updateNotice().then((u) => u && showUpdate(game, foot, u));
  return game.modals.show(c, { name: 'main', escClose: false });
}

// "A new version is ready" with Update now (self-update, see selfUpdate.js)
// and, on Windows, a link to the desktop app. The plain download link is the
// fallback when this browser cannot keep a downloaded build.
async function showUpdate(game, foot, u) {
  const link = (text) => el('a.update-link', { href: u.url, target: '_blank', rel: 'noopener' }, text);
  const actions = el('div.update-actions');
  foot.replaceChildren(el('span.update', fill(UI.updateReady, { V: u.version })), actions);
  if (!(await canSelfUpdate())) {
    actions.append(link(UI.updateDownload));
    return;
  }
  const now = button(
    UI.updateNow,
    async () => {
      now.disabled = true;
      now.textContent = UI.updating;
      if (await downloadUpdate(u.version)) {
        location.reload(); // the new build takes over on the way back in
        return;
      }
      now.disabled = false;
      now.textContent = UI.updateNow;
      game.toast(TOASTS.updateFailed, { ms: 5000 });
      if (!actions.querySelector('.download')) actions.append(el('span.download', [link(UI.updateDownload)]));
    },
    'small.primary',
  );
  actions.append(now);
  if (/Windows/.test(navigator.userAgent) && !device.touch) actions.append(link(UI.getDesktopApp));
}

export function pauseMenu(game) {
  if (game.modals.has('pause')) return;
  let m;
  const close = () => game.modals.close(m);
  const c = card(
    LABELS.paused,
    [
      el('div.menu', [
        button(UI.resume, close, 'primary'),
        button(UI.journal, () => journal(game)),
        button(UI.settings, () => settingsPanel(game)),
        button(LABELS.backupCode, () => backupPanel(game)),
        device.touch && !isFullscreen()
          ? button(LABELS.fullscreen, () => {
              enterFullscreen();
              close();
            })
          : null,
        button(LABELS.mainMenu, () => {
          game.saveNow('menu');
          game.toMainMenu();
        }),
      ]),
      el('p.note-small', { style: { textAlign: 'center', marginTop: '14px' } }, LABELS.autosaveNote),
    ],
    { icon: TULIP_SVG('#6f9be0', 26), onClose: close },
  );
  m = game.modals.show(c, { name: 'pause' });
  game.saveNow('pause');
}

// opts: { title, yes, no, onNo } to reword the buttons.
export function confirmBox(game, text, onYes, { title = LABELS.areYouSure, yes = LABELS.yes, no = LABELS.cancel, onNo = null } = {}) {
  let m;
  const c = card(title, [
    el('p', text),
    el('div.btn-row', [
      button(no, () => game.modals.close(m)),
      button(
        yes,
        () => {
          game.modals.close(m, { silent: true });
          onYes();
        },
        'primary',
      ),
    ]),
  ]);
  // Cancel, Esc and the backdrop all count as no.
  m = game.modals.show(c, { name: 'confirm', onClose: onNo || undefined });
}

// ------------------------------------------------------------------ settings
export function settingsPanel(game) {
  const s = game.settings;
  let m;
  const slider = (label, key, min, max, step) => {
    const input = el('input', { type: 'range', min, max, step, value: s.data[key] });
    input.addEventListener('input', () => s.set(key, Number(input.value)));
    return el('label.setting', [el('span', label), input]);
  };
  const toggle = (label, key) => {
    const b = el(`button.toggle${s.data[key] ? '.on' : ''}`, { type: 'button', 'aria-pressed': String(!!s.data[key]) });
    b.addEventListener('click', () => {
      s.set(key, !s.data[key]);
      b.classList.toggle('on', s.data[key]);
      b.setAttribute('aria-pressed', String(s.data[key]));
    });
    return el('div.setting', [el('span', label), b]);
  };
  const c = card(
    UI.settings,
    [
      slider(LABELS.masterVolume, 'master', 0, 1, 0.01),
      slider(LABELS.musicVolume, 'music', 0, 1, 0.01),
      slider(LABELS.sfxVolume, 'sfx', 0, 1, 0.01),
      slider(LABELS.sensitivity, 'sensitivity', 0.2, 3, 0.05),
      toggle(LABELS.invertY, 'invertY'),
      toggle(LABELS.headBob, 'headBob'),
      toggle(LABELS.reducedMotion, 'reducedMotion'),
      toggle(LABELS.mute, 'muted'),
      graphicsChoice(game),
      el('div.btn-row', [
        button(LABELS.resetSave, () =>
          confirmBox(game, LABELS.confirmReset, () => {
            game.resetSave();
          }),
        ),
        button(LABELS.done, () => game.modals.close(m), 'primary'),
      ]),
    ],
    { icon: TULIP_SVG('#fbf7f0', 26), onClose: () => game.modals.close(m), cls: 'settings' },
  );
  m = game.modals.show(c, { name: 'settings' });
}

// Graphics: Auto / Full / Light. Changing to a different look restarts the
// page (after asking), because materials are chosen at startup.
function graphicsChoice(game) {
  const cur = game.settings.data.graphics || 'auto';
  const auto = autoQuality();
  const opts = [
    ['auto', fill(LABELS.graphicsAuto, { Q: auto === 'light' ? LABELS.graphicsLight : LABELS.graphicsFull })],
    ['full', LABELS.graphicsFull],
    ['light', LABELS.graphicsLight],
  ];
  const row = el('div.seg', { role: 'radiogroup', 'aria-label': LABELS.graphics });
  const render = (v) => {
    for (const b of row.children) {
      const on = b.dataset.v === v;
      b.classList.toggle('on', on);
      b.setAttribute('aria-checked', String(on));
    }
  };
  for (const [v, label] of opts)
    row.append(
      el(
        'button.seg-b',
        {
          type: 'button',
          role: 'radio',
          'data-v': v,
          onclick: () => {
            const before = game.settings.data.graphics || 'auto';
            render(v);
            game.setGraphics(v, { onCancel: () => render(before) });
          },
        },
        label,
      ),
    );
  render(cur);
  return el('div.setting.graphics', [el('span', LABELS.graphics), row]);
}

// --------------------------------------------------------------- backup code
export function backupPanel(game) {
  let m;
  const out = el('textarea.code', { readonly: true, placeholder: LABELS.backupMaking });
  const inp = el('textarea.code', { placeholder: LABELS.backupPaste });
  const msg = el('p.note-small');
  game.saveNow('backup');
  exportCode(game.gs.serialize()).then((code) => (out.value = code));
  const c = card(
    LABELS.backupCode,
    [
      el('p.note-small', LABELS.backupIntro),
      out,
      el('div.btn-row', [
        button(
          LABELS.copy,
          async () => {
            out.select();
            try {
              await navigator.clipboard.writeText(out.value);
              msg.textContent = LABELS.copied;
            } catch {
              document.execCommand?.('copy');
              msg.textContent = LABELS.copySelected;
            }
          },
          'small',
        ),
      ]),
      el('h3', LABELS.restoreTitle),
      inp,
      msg,
      el('div.btn-row', [
        button(
          LABELS.restore,
          async () => {
            const obj = await importCode(inp.value);
            if (!obj || !game.importSave(obj)) {
              msg.textContent = LABELS.restoreFailed;
              return;
            }
            game.modals.closeAll();
            game.toast(TOASTS.saveRestored);
          },
          'primary',
        ),
        button(LABELS.close, () => game.modals.close(m)),
      ]),
    ],
    { onClose: () => game.modals.close(m) },
  );
  m = game.modals.show(c, { name: 'backup' });
}

// -------------------------------------------------------------------- journal
export function journal(game) {
  if (game.modals.has('journal')) return game.modals.close(game.modals.stack.find((x) => x.name === 'journal'));
  game.audio.pageFlip();
  const gs = game.gs;
  let m;
  // Keys
  const keys = el('div.jkeys');
  for (let r = 0; r < 5; r++) {
    if (!gs.data.visited[r] && r > 0) continue;
    const g = el(`span.k${gs.hasKey(r, 'gold') ? '.on' : ''}`, { html: KEY_SVG('#e9b640', 26), title: LABELS.goldKey });
    const s = el(`span.k${gs.hasKey(r, 'silver') ? '.on' : ''}`, { html: KEY_SVG('#aeb7c4', 26), title: LABELS.silverKey });
    keys.append(el('span', ROOM_NAMES[r] + (gs.isDoorOpen(r) ? ' ' + LABELS.open : '')), g, s);
  }
  // Digits
  const digits = el('div.digits');
  gs.collectedDigits().forEach((d) => digits.append(el(`div.digit${d === null ? '.empty' : ''}`, d === null ? '?' : d)));
  // Puzzles with hints
  const plist = el('ul.plist');
  for (const id of PUZZLE_IDS) {
    const p = gs.puzzles[id];
    if (!gs.data.visited[p.room]) continue;
    const hintBox = el('div.hint-inline.hidden');
    const li = el(`li${p.isSolved() ? '.done' : ''}`, [
      el('span.nm', `${PUZZLE_NAMES[id]} `),
      p.isSolved()
        ? null
        : button(
            LABELS.hintShort,
            () => {
              const h = gs.nextHint(id);
              hintBox.classList.remove('hidden');
              hintBox.textContent = fill(LABELS.hintLine, { T: h.tier + 1, TEXT: h.text });
            },
            'small',
          ),
    ]);
    plist.append(li, hintBox);
  }
  // Notes
  const notes = el('ul.notes-list');
  NOTES.forEach((text, i) => {
    if (gs.data.notes.includes(i)) notes.append(el('li', { onclick: () => showNote(game, i) }, `${i + 1}. ${NOTE_PLACES[i]}`));
    else notes.append(el('li.locked', `${i + 1}. ${LABELS.notFound}`));
  });
  // Little finds: found ones with their story, the rest as question marks.
  const finds = el('ul.finds-list');
  for (const f of FINDS) {
    if (gs.hasFind(f.id)) finds.append(el('li', [el('b', f.name.charAt(0).toUpperCase() + f.name.slice(1)), el('span', f.text)]));
    else finds.append(el('li.locked', '?'));
  }
  const clues = el('ul.notes-list');
  for (const id of gs.data.clues) if (CLUES[id]) clues.append(el('li', { onclick: () => showClue(game, id) }, CLUES[id].title));
  const c = card(
    UI.journal,
    [
      el('div.journal', [
        el('section', [
          el('h3', LABELS.keys),
          keys,
          el('h3', LABELS.memoryTulips),
          digits,
          el('p.note-small', LABELS.digitsNote),
          el('h3', LABELS.notes),
          notes,
          gs.data.clues.length ? el('h3', LABELS.clues) : null,
          gs.data.clues.length ? clues : null,
          el('h3', `${LABELS.finds}  ${gs.data.finds.length}/${FINDS.length}`),
          finds,
          gs.data.maze?.done
            ? el(
                'p.note-small',
                fill(LABELS.mazeBest, { BEST: `${Math.floor(gs.data.maze.best / 60)}:${String(gs.data.maze.best % 60).padStart(2, '0')}` }),
              )
            : null,
        ]),
        el('section', [el('h3', `${LABELS.puzzles}  ${gs.solvedCount()}/10`), plist]),
      ]),
    ],
    { wide: true, icon: TULIP_SVG('#6f9be0', 26), onClose: () => game.modals.close(m) },
  );
  m = game.modals.show(c, {
    name: 'journal',
    onKey: (e) => {
      if (e.code === 'Tab') {
        game.modals.close(m);
        return true;
      }
      return false;
    },
  });
}

// ------------------------------------------------------------- notes & clues
function decorate(paper, seed) {
  const r = (n) => {
    seed = (seed * 9301 + 49297) % 233280;
    return (seed / 233280) * n;
  };
  const stain = el('span.stain');
  const size = 90 + r(40);
  Object.assign(stain.style, { width: size + 'px', height: size + 'px', right: 10 + r(40) + 'px', bottom: 10 + r(50) + 'px' });
  paper.appendChild(stain);
  for (let i = 0; i < 3; i++) {
    const b = el(`span.blot${i ? '.b2' : ''}`);
    // Ink blots stay in the margins so they never sit on the words.
    Object.assign(b.style, i % 2 ? { left: 10 + r(18) + 'px', top: 60 + r(220) + 'px' } : { right: 12 + r(16) + 'px', top: 30 + r(40) + 'px' });
    paper.appendChild(b);
  }
}

export function showNote(game, index) {
  game.audio.pageFlip();
  game.gs.readNote(index);
  let m;
  const paper = el('div.paper', NOTES[index]);
  decorate(paper, index * 17 + 5);
  const wrap = el('div.paper-wrap', [paper, el('div.paper-actions', [button(LABELS.putDown, () => game.modals.close(m))])]);
  m = game.modals.show(wrap, { name: 'note', backdropClose: true });
}

export function showClue(game, id, { mono = false } = {}) {
  const clue = CLUES[id];
  if (!clue) return;
  game.audio.pageFlip();
  game.gs.readClue(id);
  let m;
  const paper = el(`div.paper.clue${mono ? '.mono' : ''}`, [el('span.title', clue.title), document.createTextNode(clue.text)]);
  const wrap = el('div.paper-wrap', [paper, el('div.paper-actions', [button(LABELS.okay, () => game.modals.close(m))])]);
  m = game.modals.show(wrap, { name: 'clue', backdropClose: true });
}

// ---------------------------------------------------------------- hint card
export class HintCard {
  constructor(root, game) {
    this.root = root;
    this.game = game;
    this.node = null;
    this.id = null;
  }
  show(id) {
    const gs = this.game.gs;
    const sameCard = this.node && this.id === id;
    const h = sameCard ? gs.nextHint(id) : { tier: Math.max(0, gs.data.hintTier[id] ?? 0), text: null };
    if (!sameCard) h.text = gs.hintAt(id, h.tier);
    this.id = id;
    this.render(id, h.tier, h.text);
  }
  render(id, tier, text) {
    this.hide();
    const dots = el(
      'div.tiers',
      [0, 1, 2].map((i) => el(`i${i <= tier ? '.on' : ''}`)),
    );
    const more = tier < 2 ? button(LABELS.biggerHint, () => this.show(id), 'small') : null;
    this.node = el('div.hint-card', [
      el('div.hd', { html: TULIP_SVG('#6f9be0', 20) }, []),
      el('div.tx', text),
      el('div.act', [el('span.muted', LABELS.hintMore), more, button(LABELS.thanks, () => this.hide(), 'small')]),
    ]);
    const hd = this.node.querySelector('.hd');
    hd.append(el('span', fill(LABELS.hintTitle, { T: tier + 1, NAME: PUZZLE_NAMES[id] })), dots);
    this.root.appendChild(this.node);
    clearTimeout(this._t);
    this._t = setTimeout(() => this.hide(), 22000);
  }
  hide() {
    if (this.node) this.node.remove();
    this.node = null;
  }
}
