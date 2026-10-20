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
| Kitchen secret word | `CIPHER_WORD` and `CIPHER_SHIFT`; the card text is worked out for you |
| Oven dial answer and recipe | `DIAL_SOLUTION`, `DIAL_RECIPE` |
| Sudoku | `SUDOKU_GIVENS` (keep it to one solution: run `npm test` to check) |
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
