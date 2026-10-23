# Sunday Night: handoff notes for Claude Code

A cosy first-person puzzle game built as a **personal gift** (for "H", from the
author, who signs the letter "Zizou"). Three.js + Vite + vanilla JS, everything
procedural (no asset files, no CDN), built into **one file**, `dist/index.html`,
that works from `file://`. Read `README.md` for the player-facing description.

## Rules that matter

- **Never soften or rewrite** `FINAL_MESSAGE`, `NOTES` or `LOCK_CODE` (`2007`)
  in `src/config.js`. They are the author's own words. A test checks the
  letter has no `!` and ends with `— Zizou`.
- **All text, answers, colours and tuning live in `src/config.js`.** Add new
  strings there (`PROMPTS`, `TOASTS`, `LABELS`, `UI`), not inline.
- **Debug code must never ship.** `__DEBUG__` is a build-time flag (true only
  for `npm run dev` and `npm run build:debug`). `e2e/prod.mjs` checks that
  `dist/index.html` has none of it.
- **`dist/index.html` is generated.** Never edit it by hand; run `npm run build`
  and commit the result (the author sends that single file).
- Commit as the author (their own git name and email), keep commits focused,
  and don't force-push `main` unless asked.

## Commands

```
npm install
npm run dev            # dev server, debug tools on
npm test               # vitest: puzzles, randomiser, saves (45 tests)
npm run build          # -> dist/index.html (the shippable file)
npm run build:debug    # -> dist-debug/index.html (used by the browser tests)
npm run e2e            # builds both, then runs every browser test
node e2e/<name>.mjs    # one browser test (needs the debug build first)
```

Browser tests use `playwright-core` + Chromium with software rendering, so they
are slow (the full playthrough takes minutes). Pass a directory as the first
argument to some tests to save screenshots. Debug URL flags: `?debug=1`,
`&nolock=1` (no pointer lock), `&dtmax=0.25` (needed for slow rendering),
`&nomerge`, `&touch=1|0`, `&quality=full|light`.

## Architecture (src/)

- `engine/`: renderer + light pool (3 point lights, 1 shadowed spot, 1
  hemisphere, re-dressed per room), `input.js` (mouse/pointer lock, touch stick
  and taps), `device.js` (touch vs mouse, switches live on 2-in-1 PCs and swaps
  wording from `TOUCH_TEXT`), `quality.js` (Full vs Light graphics, chosen at
  startup), `interact.js` (centre raycast + tap picking), `collision.js` (2D
  AABBs), `audio.js` (all sound is WebAudio synthesis), `gamestate.js` (single
  source of truth, event emitter), `save.js`, `merge.js` (batches static meshes
  by material), `props.js` / `materials.js` / `textures.js`.
- `rooms/`: one file per room (bedroom, living, kitchen, study, garden,
  clearing) + `shell.js` (walls/halls), `door.js`, `art.js` (canvas drawings),
  `notes.js` (the five notes), `cozy.js` (lamps, music box, kettle, window,
  drawer, cushion, cookie jar, book, the little finds), `maze.js` (hedge maze).
- `puzzles/`: one pure-logic module per puzzle extending `Puzzle` in `base.js`:
  `getState/setState/isSolved/hint(tier)/newGame(rng)`. Hints are 3 tiers in
  `HINTS` with `{PLACEHOLDER}` variables filled by `hintVars()`.
- `cats/`: `catModel.js` (rig), `tail.js` (tube tail), `catDirector.js`
  (waypoint graph, hide-and-seek, petting: meow, then purr + slow blink, then
  follow you for 40 s).
- `ui/`: HUD, menus, journal, overlays for each puzzle screen, styles.css.

## Game structure

Five rooms in a line (bedroom, living, kitchen, study, garden), each with a
gold-key puzzle (themed) and a silver-key puzzle (classic); both keys open that
room's door and give one digit of the lock code. Then the clearing and the
ending (the cats' tails form a heart; the letter fades in line by line).
Two cats: Tchobin (tabby), Zizo (tuxedo).

| Room | Gold key | Silver key |
| --- | --- | --- |
| Bedroom | 5 frames ordered by distance and season | 4x4 sliding picture |
| Living | 12-vase tulip pattern | Books that only turn three at a time |
| Kitchen | Caesar-cipher sentence, spell the last word | 4 oven dials from a riddle |
| Study | Hide and seek (cats move after each wrong guess) | 6x6 sudoku |
| Garden | 4-digit gate lock (the memory digits) | Constellation of month letters |

Extras: 5 optional **little finds** (paper star in the dresser drawer, toy mouse
under the striped sofa cushion, cookie in the kitchen jar, pressed tulip in the
study book, jar of fireflies in the middle of the **hedge maze**), kept in the
journal; the maze is east of the garden.

## The randomiser (`RANDOMIZE` in config.js)

Each new game picks: cipher sentence (`CIPHER_SENTENCES`) + shift, dial riddle
(`DIAL_RIDDLES`, rules in `DIAL_RULES` in `puzzles/dials.js`), vase pattern
(`VASE_VARIANTS`), a reshuffle of `SUDOKU_GIVENS`, decoy stars, and the maze
(`mazeSeed`, ways to the middle are 40+ cells). The chosen version is stored in
the save; old saves fall back to the first variants. Clue cards and textures are
redrawn from the current puzzle (`GameState.syncText`). When adding a variant,
**make sure it has exactly one answer** and add it to `tests/randomiser.test.js`
(brute force for dials, family-of-rules check for vases).

## Things that bite

- Saves: key `sundayNight.save.v2`, `SAVE_VERSION = 2`. Bump it only if old
  saves truly can't load; adding fields with safe defaults needs no bump.
- Static meshes are merged at load. Anything shown/hidden or moved later needs
  `userData.dynamic = true` (see the toy mouse), and glows must not be
  clickable (`sprite.raycast = () => {}`).
- Light graphics swaps materials at startup, so changing quality reloads the
  page (the game resumes where you were). Test both with `?quality=`.
- Keep the draw-call count modest (roughly 200-450 per frame); batch small
  things (fairy-light glows are one `Points` per string).
- The e2e tests read each game's randomised answers from `window.__game`; never
  hard-code a puzzle answer in a test.
- Prettier is configured (`.prettierrc`, width 150); run `npx prettier --write`
  on what you touch.
- Not verifiable in the cloud sandbox: how audio sounds, real-GPU frame rate,
  handwriting fonts on Windows/Mac, real phones. Say so rather than claiming it.

## Status

All unit tests (45) and browser tests (prod, props, playthrough, continue,
collision, touch, quality, hybrid, cozy, maze) pass as of the last commit. The
playthrough also passes with random scrambles. Ideas not done: a Cozy/Brainy
difficulty choice, personal photos in the bedroom frames, a spectator mode for
the author.
