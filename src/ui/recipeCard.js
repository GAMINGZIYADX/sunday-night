import { el, button } from './dom.js';
import { BAKE_INGREDIENTS, BAKE_STEPS, BAKE_GROUPS, BAKE_CARD, BAKE_OVEN, CLUES, LABELS } from '../config.js';

// The strawberry shortcake's recipe card: an index card with the
// ingredients (by group) on the left and the method on the right, finished
// steps ticked. Opened from the baking screen, the counter and the journal.
export function recipeCard(game) {
  game.audio.pageFlip();
  game.gs.readClue('bake');
  const done = game.gs.data.bake.step;
  let m;
  const close = () => game.modals.close(m);

  const groups = Object.entries(BAKE_GROUPS).map(([g, title]) =>
    el('div.rc-group', [
      el('h4', title),
      el(
        'ul',
        BAKE_INGREDIENTS.filter((i) => i.group === g).map((i) =>
          el('li', [el('span.rc-amt', [i.metric, i.us !== i.metric ? el('small', ` ${i.us}`) : null]), el('span.rc-name', i.name)]),
        ),
      ),
    ]),
  );
  const method = el(
    'ol',
    BAKE_STEPS.map((s, n) =>
      el(`li${n < done ? '.done' : n === done ? '.now' : ''}`, { title: n < done ? BAKE_CARD.done : '' }, [el('b', `${s.title}. `), s.why]),
    ),
  );
  const card = el('div.recipe-card', [
    el('button.close-x', { type: 'button', onclick: close, 'aria-label': LABELS.close }, '×'),
    el('div.rc-head', [
      el('h2', CLUES.bake.title),
      el('p.rc-meta', `${BAKE_CARD.makes} · ${BAKE_OVEN.c} °C (${BAKE_OVEN.f} °F) · ${BAKE_CARD.time}`),
    ]),
    el('div.rc-cols', [
      el('section.rc-need', [el('h3', BAKE_CARD.ingredients), ...groups]),
      el('section.rc-method', [el('h3', BAKE_CARD.method), method]),
    ]),
    el('div.paper-actions', [button(LABELS.okay, close)]),
  ]);
  m = game.modals.show(card, { name: 'recipe', backdropClose: true });
  // Show the step she is on.
  requestAnimationFrame(() => method.querySelector('li.now')?.scrollIntoView({ block: 'nearest' }));
  return m;
}
