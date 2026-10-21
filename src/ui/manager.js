import { el } from './dom.js';
import { LABELS } from '../config.js';

// Modal stack. Opening a modal releases the pointer and pauses gameplay
// input; closing the last one hands control back to the game.
export class Modals {
  constructor(root, game) {
    this.root = root;
    this.game = game;
    this.stack = [];
  }

  get open() {
    return this.stack.length > 0;
  }
  top() {
    return this.stack[this.stack.length - 1] || null;
  }
  has(name) {
    return this.stack.some((m) => m.name === name);
  }

  // content: a DOM node (usually a .card). opts: { name, onClose, escClose, clear }
  show(content, opts = {}) {
    const screen = el(`div.screen${opts.clear ? '.clear' : ''}`, [content]);
    const modal = { name: opts.name || '', el: screen, content, onClose: opts.onClose, escClose: opts.escClose !== false, onKey: opts.onKey };
    if (opts.backdropClose) screen.addEventListener('pointerdown', (e) => e.target === screen && this.close(modal));
    this.root.appendChild(screen);
    this.stack.push(modal);
    this.game.onModalChange(true);
    return modal;
  }

  close(modal = this.top(), { silent = false } = {}) {
    if (!modal) return;
    const i = this.stack.indexOf(modal);
    if (i === -1) return;
    this.stack.splice(i, 1);
    modal.el.remove();
    if (modal.onClose && !silent) modal.onClose();
    if (!this.stack.length) this.game.onModalChange(false);
  }

  closeAll() {
    while (this.stack.length) this.close(this.top(), { silent: true });
  }

  // Returns true if the key was used by a modal.
  key(e) {
    const m = this.top();
    if (!m) return false;
    if (e.code === 'Escape' && m.escClose) {
      this.close(m);
      return true;
    }
    if (m.onKey) return m.onKey(e) !== false;
    return true;
  }
}

// A standard card with a title and a close button.
// cls 'pz' marks a puzzle card: a .pz-main board and a .pz-side column, side by
// side on short landscape screens (phones).
export function card(title, children, { wide = false, onClose = null, icon = '', cls = '' } = {}) {
  const c = el(`div.card${wide ? '.wide' : ''}${cls ? '.' + cls : ''}`);
  if (onClose) c.appendChild(el('button.close-x', { type: 'button', onclick: onClose, 'aria-label': LABELS.close }, '×'));
  if (title) c.appendChild(el('h2', { html: `${icon}<span></span>` }));
  if (title) c.querySelector('h2 span').textContent = title;
  for (const ch of [].concat(children)) if (ch) c.appendChild(ch);
  return c;
}
