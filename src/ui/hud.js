import { el, TULIP_SVG, KEY_SVG } from './dom.js';
import { UI, ROOM_NAMES, ROOM_TITLES } from '../config.js';
import { LABELS } from '../config.js';

// Always-on overlay: crosshair, prompt, key slots, toasts, controls card,
// room banners, the intro line and the fade.
export class Hud {
  constructor(root) {
    this.root = root;
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
    this.controls = el('div.controls.hidden', [el('div.t', LABELS.controlsTitle), ...UI.controls.flatMap(([k, v]) => [el('kbd', k), el('span', v)])]);
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
    this.setPlaying(false);
    this._lastPrompt = '';
    this._lastHot = false;
  }

  setPlaying(on) {
    for (const n of [this.cross, this.keys]) n.classList.toggle('hidden', !on);
    if (!on) this.setPrompt(null);
  }

  setFade(on) {
    this.fade.classList.toggle('on', on);
  }

  setPrompt(text) {
    const t = text || '';
    if (t === this._lastPrompt) return;
    this._lastPrompt = t;
    this.prompt.classList.toggle('hidden', !t);
    this.prompt.innerHTML = '';
    if (t) this.prompt.append(el('kbd', 'E'), el('span', t));
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
    small.textContent = ROOM_NAMES[room] || '';
    big.textContent = ROOM_TITLES[room] || '';
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
