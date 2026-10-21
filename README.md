# Sunday Night

A small, cosy first-person puzzle house. Five rooms, two puzzles each, two cats
(Tchobin and Zizo), no timers, no fail states. About 20 minutes.

## Play it

Double-click **`dist/index.html`**. That's the whole game in one file. It works
offline, with no server and nothing downloaded. Use a desktop browser (Chrome,
Edge or Firefox).

Controls: **WASD** move · **mouse** look · **E / click** interact (right-click
turns an oven dial back) · **Shift** walk slowly · **Tab** journal · **H** hint ·
**M** mute · **Esc** pause.

## Change the text, codes and names

Everything you'd want to change is in **`src/config.js`**, with comments:

| What | Where in `config.js` |
| --- | --- |
| Final lock code (now `2007`) | `LOCK_CODE`. Door 1 gives the 1st digit, door 2 the 2nd, and so on. |
| The final letter | `FINAL_MESSAGE` (blank line = new paragraph, last line starting with `—` is the signature) |
| The five room notes | `NOTES` |
| Letter pacing | `LETTER_TIMING` |
| Kitchen secret sentence | `CIPHER_SENTENCE`, `CIPHER_WORD` (a word of the sentence) and `CIPHER_SHIFT`; the card text is worked out for you. Keep a one-letter word in the sentence: it is how she cracks it |
| Oven dial answer and riddle | `DIAL_SOLUTION`, `DIAL_RECIPE` (if you change the riddle, also change `dialRuleHolds` in `src/puzzles/dials.js`; `npm test` checks it has one answer) |
| Sudoku (6×6) | `SUDOKU_GIVENS` (keep it to one solution: run `npm test` to check) |
| Vase pattern, rug, constellation, hiding spots | `VASE_GIVEN`, `RUG_SHOWN`, `CONSTELLATION_LABELS`, `CONSTELLATION_DECOYS`, `HIDING_SPOTS` |
| Hints (3 per puzzle) | `HINTS` |
| Cat names, envelope letter | `CATS`, `ENVELOPE_LETTER`, `SIGNATURE_NAME` |
| Every other word on screen | `UI`, `PROMPTS`, `TOASTS`, `LABELS`, `WORLD_TEXT`, `CLUES` |
| Colours | `COLORS` |

After editing, rebuild (see below) and send the new `dist/index.html`.

## Build it yourself

Needs Node 18+.

```
npm install
npm run dev          # development server (debug tools on, see below)
npm run build        # -> dist/index.html (the single file to share)
npm test             # unit tests (puzzles, sudoku uniqueness, save/load...)
npm run e2e          # builds both versions, then runs the browser tests
```

`npm run e2e` drives Chromium through Playwright. It uses the Chromium that
`playwright-core` finds. In a normal setup, run `npx playwright install chromium`
once first.

## The puzzles

| Room | Gold key (themed) | Silver key (classic) |
| --- | --- | --- |
| Bedroom | Five frames: order them by distance *and* season (each clue alone has ties) | 4×4 sliding picture (the fifteen puzzle) |
| Living room | Twelve vases: work out the growing pattern from the rug and three planted vases | Rainbow books that only move by turning three at a time |
| Kitchen | A whole sentence in a Caesar cipher with no key given; crack it from the one-letter word, spell the last word | Four oven dials from a five-clue riddle |
| Study | Hide and seek: six spots, and the cats sneak elsewhere after every wrong guess, so she has to listen | 6×6 sudoku |
| Garden | The four memory digits on the gate lock | Constellation of month letters (J F M A M J J A S O N D) with repeats and decoys |

Every puzzle has three hints (H, or from the journal), and the last always gives the answer away.

## Saving

The game saves itself after every solved puzzle, key, door, room change and when
you pause. The main menu then offers **Continue**.

- **Reset the save:** Settings → *Reset save* (asks first). Settings are kept.
- **Backup:** Pause → *Backup code* gives a short text code; paste it back there
  to restore. Useful when moving to another computer or browser.
- The save lives in the browser's `localStorage` for this file. If the browser
  blocks storage (some private windows), the game still runs but won't remember.

## Debug tools (never in `dist/index.html`)

Debug code only exists in `npm run dev` and in `npm run build:debug`
(→ `dist-debug/index.html`). Open it with `?debug=1`:

- **Shift+1…6** jump to a room (6 = the clearing)
- **Shift+K** solve both puzzles in the current room (grants both keys)
- **Shift+O** open the current room's door
- `window.__game` scripting API used by the tests

The production build is checked so that none of this is in it.

## How it's built

- `src/config.js`: all text, answers, colours
- `src/main.js`: bootstrap
- `src/engine/`: renderer + light pool, input/pointer lock, AABB collision, player,
  interaction (raycast + glow), WebAudio synth, `GameState` (event emitter, single
  source of truth), save/backup, procedural textures, props, static-mesh batching
- `src/rooms/`: one file per room, plus the shell (walls/hallways), doors, art
- `src/puzzles/`: one pure-logic module per puzzle (`getState`, `setState`,
  `isSolved`, `hint(tier)`)
- `src/cats/`: cat model/rig and the behaviour director
- `src/ui/`: HUD, menus, journal, notes, hints, puzzle overlays, the letter
- `tests/`: Vitest unit tests; `e2e/`: Playwright browser tests

Everything is procedural: geometry built in code, textures painted on canvases,
music and sounds synthesised. There are no asset files.
