import { el, TULIP_SVG, KEY_SVG } from './dom.js';
import { UI, ROOM_NAMES, ROOM_TITLES, PROMPTS, SIDE_ROOMS } from '../config.js';
import { LABELS } from '../config.js';
import { device } from '../engine/device.js';

const BOOK_SVG =
  '<svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5c3-1 6-1 8 1v14c-2-2-5-2-8-1zM20 5c-3-1-6-1-8 1v14c2-2 5-2 8-1z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>';
const BULB_SVG =
  '<svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 17h6M10 20h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const PAUSE_SVG =
  '<svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6v12M15 6v12" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/></svg>';

// Always-on overlay: crosshair, prompt, key slots, toasts, controls card,
// room banners, the intro line and the fade. On touch screens also the thumb
// stick and the journal / hint / pause buttons.
export class Hud {
  constructor(root) {
    this.root = root;
    this.touch = device.touch;
    // Set by the game: what the touch buttons and the tappable prompt do.
    this.actions = { use: () => {}, journal: () => {}, hint: () => {}, pause: () => {} };
    this.vignette = el('div.vignette');
    this.fade = el('div.fade.on');
    this.cross = el('div.crosshair');
    this.prompt = el('div.prompt.hidden');
    this.toasts = el('div.toasts');
    this.saved = el('div.saved', { html: `${TULIP_SVG('#fff4dc', 16)}<span>${UI.saved}</span>` });
    this.clickLook = el('div.click-look.hidden', LABELS.clickToLook);
    this.keyRoom = el('span.room');
    this.goldSlot = el('div.slot', { html: KEY_SVG('#e9b640'), title: LABELS.goldKey });
    this.silverSlot = el('div.slot', { html: KEY_SVG('#aeb7c4'), title: LABELS.silverKey });
    this.keys = el('div.keys.hidden', [this.keyRoom, this.goldSlot, this.silverSlot]);
    this.controls = el('div.controls.hidden');
    this._fillControls();
    this.banner = el('div.banner', [el('div.small'), el('div.big')]);
    this.intro = el('div.intro-line');
    for (const n of [
      this.vignette,
      this.cross,
      this.prompt,
      this.keys,
      this.controls,
      this.saved,
      this.clickLook,
      this.banner,
      this.intro,
      this.toasts,
      this.fade,
    ])
      root.appendChild(n);
    if (this.touch) this._buildTouch(root);
    this.setPlaying(false);
    this._lastPrompt = '';
    this._lastHot = false;
  }

  _fillControls() {
    this.controls.replaceChildren(el('div.t', LABELS.controlsTitle), ...UI.controls.flatMap(([k, v]) => [el('kbd', k), el('span', v)]));
  }

  // A controller was picked up or put down: its words on the controls card
  // and beside the prompt.
  setPad() {
    this._fillControls();
    this._lastPrompt = null;
    this.setClickToLook(false);
  }

  // 2-in-1 PCs: switch the on-screen controls between touch and mouse.
  setTouch(on) {
    if (on === this.touch) return;
    this.touch = on;
    if (on && !this.touchBar) this._buildTouch(this.root);
    if (!on && this.touchBar) {
      this.touchBar.classList.add('hidden');
      this.stickBase.classList.add('hidden');
      this.stickHint.classList.add('hidden');
    }
    this._fillControls();
    this._lastPrompt = null; // redraw the prompt in the new style
    this.setPlaying(this._playing);
  }

  _buildTouch(root) {
    const tb = (svg, label, fn) =>
      el('button.tbtn', { type: 'button', 'aria-label': label, title: label, html: svg, onclick: (e) => (e.stopPropagation(), fn()) });
    this.touchBar = el('div.touch-bar.hidden', [
      tb(BOOK_SVG, UI.journal, () => this.actions.journal()),
      tb(BULB_SVG, LABELS.hintShort, () => this.actions.hint()),
      tb(PAUSE_SVG, LABELS.pause, () => this.actions.pause()),
    ]);
    this.stickBase = el('div.stick.hidden', [el('div.knob')]);
    this.stickHint = el('div.stick-hint.hidden');
    this.rotate = el('div.rotate', [el('div.phone'), el('p', LABELS.rotate)]);
    for (const n of [this.touchBar, this.stickHint, this.stickBase, this.rotate]) root.appendChild(n);
  }

  // stick: { ox, oy, dx, dy } in screen pixels, or null when no thumb is down.
  setStick(stick) {
    if (!this.touch) return;
    const on = !!stick && this._playing;
    this.stickBase.classList.toggle('hidden', !on);
    this.stickHint.classList.toggle('hidden', on || !this._playing);
    if (!on) return;
    this.stickBase.style.transform = `translate(${stick.ox}px, ${stick.oy}px)`;
    this.stickBase.classList.toggle('run', !!stick.run);
    const d = Math.hypot(stick.dx, stick.dy);
    const k = d > 56 ? 56 / d : 1;
    this.stickBase.firstChild.style.transform = `translate(${stick.dx * k}px, ${stick.dy * k}px)`;
  }

  setPlaying(on) {
    this._playing = on;
    for (const n of [this.cross, this.keys]) n.classList.toggle('hidden', !on);
    if (this.touch && this.touchBar) {
      this.touchBar.classList.toggle('hidden', !on);
      this.setStick(null);
    }
    if (!on) this.setPrompt(null);
  }

  // quick: the short fade of the attic ladder.
  setFade(on, quick = false) {
    this.fade.classList.toggle('quick', quick);
    this.fade.classList.toggle('on', on);
  }

  // alt: the thing can also be turned the other way (right-click, or a
  // second button on touch screens).
  setPrompt(text, alt = false) {
    const t = text || '';
    const key = t + (alt ? '|alt' : '');
    if (key === this._lastPrompt) return;
    this._lastPrompt = key;
    this.prompt.classList.toggle('hidden', !t);
    this.prompt.innerHTML = '';
    if (t && this.touch) {
      // On touch screens the prompt is the button.
      const use = el('button.puse', { type: 'button', onclick: () => this.actions.use(false) }, [el('span', t)]);
      this.prompt.append(use);
      if (alt) this.prompt.append(el('button.puse.alt', { type: 'button', onclick: () => this.actions.use(true) }, `↺ ${LABELS.turnBack}`));
    } else if (t) this.prompt.append(el('kbd', UI.useKey), el('span', alt ? `${t} · ${PROMPTS.altMouse}` : t));
    const hot = !!t;
    if (hot !== this._lastHot) {
      this.cross.classList.toggle('hot', hot);
      this._lastHot = hot;
    }
  }

  toast(text, { ms = 3600, icon = true } = {}) {
    // Avoid stacking the same message.
    for (const t of this.toasts.children) if (t.dataset.text === text) return;
    const t = el('div.toast', { html: icon ? TULIP_SVG('#6f9be0', 20) : '' });
    t.dataset.text = text;
    t.append(el('span', text));
    this.toasts.appendChild(t);
    while (this.toasts.children.length > 3) this.toasts.firstChild.remove();
    setTimeout(() => t.classList.add('out'), ms);
    setTimeout(() => t.remove(), ms + 600);
  }

  flashSaved() {
    this.saved.classList.add('on');
    clearTimeout(this._savedT);
    this._savedT = setTimeout(() => this.saved.classList.remove('on'), 1400);
  }

  // room: index 0-4 or -1 to hide. state: {gold, silver, used}
  setKeys(room, state) {
    if (room < 0 || room > 4) {
      this.keys.classList.add('hidden-room');
      this.keys.style.display = 'none';
      return;
    }
    this.keys.style.display = '';
    this.keyRoom.textContent = ROOM_NAMES[room];
    for (const [slot, have] of [
      [this.goldSlot, state.gold],
      [this.silverSlot, state.silver],
    ]) {
      const was = slot.classList.contains('have');
      slot.classList.toggle('have', !!have);
      slot.classList.toggle('used', !!state.used);
      if (have && !was && state.animate) {
        slot.classList.remove('pop');
        void slot.offsetWidth;
        slot.classList.add('pop');
      }
    }
  }

  showControls(ms = 60000) {
    this.controls.classList.remove('hidden', 'out');
    clearTimeout(this._ctlT);
    this._ctlT = setTimeout(() => this.controls.classList.add('out'), ms);
  }

  showBanner(room) {
    const [small, big] = this.banner.children;
    const side = SIDE_ROOMS[room];
    small.textContent = side ? side.name : ROOM_NAMES[room] || '';
    big.textContent = side ? side.title : ROOM_TITLES[room] || '';
    this.banner.classList.add('on');
    clearTimeout(this._banT);
    this._banT = setTimeout(() => this.banner.classList.remove('on'), 2600);
  }

  showIntro(text, ms = 5200) {
    this.intro.textContent = text;
    this.intro.classList.add('on');
    clearTimeout(this._introT);
    this._introT = setTimeout(() => this.intro.classList.remove('on'), ms);
  }

  setClickToLook(on) {
    this.clickLook.classList.toggle('hidden', !on);
  }
}
