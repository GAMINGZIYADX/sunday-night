import { el, button } from './dom.js';
import { FINAL_MESSAGE, LETTER_TIMING, ENVELOPE_LETTER, UI } from '../config.js';
import { LABELS } from '../config.js';

// The ending: envelope opens, the letter slides out, and the text fades in
// line by line. Clicking speeds it up. Calls onDone(choice) with
// 'again' or 'wander'.
export function playLetter(game, { onDone }) {
  const reduced = game.settings.data.reducedMotion;
  const screen = el('div.letter-screen');
  const env = el('div.envelope', [el('div.back'), el('div.peek'), el('div.front'), el('div.flap'), el('div.seal', ENVELOPE_LETTER)]);
  const letter = el('div.letter');
  const petal = el('div.petal', {
    html: '<svg viewBox="0 0 60 80" width="54" height="70"><path d="M30 4C14 18 8 40 14 58c4 12 12 18 16 18s12-6 16-18C52 40 46 18 30 4z" fill="rgba(111,155,224,0.55)"/><path d="M30 10c-2 20-2 44 0 64" stroke="rgba(60,90,150,0.35)" stroke-width="1.5" fill="none"/><path d="M30 30c-6 4-9 10-10 16M30 42c6 3 9 8 10 13" stroke="rgba(60,90,150,0.25)" stroke-width="1" fill="none"/></svg>',
  });
  screen.append(env, letter);
  const modal = game.modals.show(screen, { name: 'letter', escClose: false, clear: true, onKey: () => (speed(), true) });
  // The .screen wrapper adds a blur we do not want here.
  modal.el.classList.add('clear');

  let fast = false;
  let wake = null;
  const speed = () => {
    fast = true;
    if (wake) wake();
  };
  screen.addEventListener('pointerdown', speed);
  const wait = (sec) =>
    new Promise((res) => {
      const ms = (fast ? sec / 6 : sec) * 1000 * (reduced ? 0.6 : 1);
      const t = setTimeout(res, ms);
      wake = () => {
        clearTimeout(t);
        res();
      };
    });

  // Parse the letter: paragraphs split by blank lines; signature = last line starting with a dash.
  const raw = FINAL_MESSAGE.replace(/\r/g, '').split('\n');
  const lines = [];
  raw.forEach((text, i) => {
    if (text.trim() === '') {
      if (lines.length && !lines[lines.length - 1].gap) lines.push({ gap: true });
      return;
    }
    lines.push({ text, endPara: raw[i + 1] === undefined || raw[i + 1].trim() === '' });
  });
  const sigIndex = lines.map((l) => !l.gap && /^[—–-]/.test(l.text.trim())).lastIndexOf(true);
  const lastLineIndex = (() => {
    for (let i = (sigIndex >= 0 ? sigIndex : lines.length) - 1; i >= 0; i--) if (!lines[i].gap) return i;
    return -1;
  })();
  const nodes = lines.map((l, i) => {
    if (l.gap) return el('div.gap');
    const n = el(`div.line${i === sigIndex ? '.sig' : ''}`, l.text);
    n.style.transitionDuration = `${LETTER_TIMING.perLine}s`;
    return n;
  });
  nodes.forEach((n) => letter.appendChild(n));
  letter.appendChild(petal);
  const hint = el('span.speed', LABELS.readFaster);
  letter.appendChild(hint);

  const run = async () => {
    game.audio.pageFlip();
    await wait(0.9);
    env.classList.add('open');
    game.audio.pageFlip();
    await wait(1.2);
    env.classList.add('out');
    await wait(1.3);
    env.classList.add('gone');
    letter.classList.add('on');
    game.audio.swell();
    await wait(1.6);
    for (let i = 0; i < lines.length; i++) {
      const l = lines[i];
      if (l.gap) continue;
      if (i === lastLineIndex) await wait(LETTER_TIMING.beforeLastLine);
      if (i === sigIndex) await wait(LETTER_TIMING.beforeSignature);
      nodes[i].style.transitionDuration = `${fast ? 0.35 : LETTER_TIMING.perLine}s`;
      nodes[i].classList.add('on');
      // keep the newest line in view on small screens
      const bottom = nodes[i].offsetTop + nodes[i].offsetHeight + 40;
      if (bottom > letter.scrollTop + letter.clientHeight)
        letter.scrollTo({ top: bottom - letter.clientHeight, behavior: reduced ? 'auto' : 'smooth' });
      if (i === lastLineIndex) game.audio.swell();
      await wait(LETTER_TIMING.perLine + (l.endPara ? LETTER_TIMING.betweenParagraphs : LETTER_TIMING.betweenLines));
    }
    hint.remove();
    await wait(2.2);
    const end = el('div.the-end', [
      el('div.t', UI.theEnd),
      el('div.btn-row', [button(UI.playAgain, () => finish('again')), button(UI.keepWandering, () => finish('wander'), 'primary')]),
    ]);
    screen.appendChild(end);
    screen.classList.add('done');
    letter.scrollTo({ top: letter.scrollHeight, behavior: reduced ? 'auto' : 'smooth' });
    requestAnimationFrame(() => end.classList.add('on'));
    game.gs.finish();
  };
  let finished = false;
  const finish = (choice) => {
    if (finished) return;
    finished = true;
    game.modals.close(modal, { silent: true });
    onDone(choice);
  };
  run();
  return modal;
}
