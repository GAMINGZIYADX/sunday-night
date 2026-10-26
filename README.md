# Sunday Night

A small, cosy first-person puzzle house. Five rooms, two puzzles each, two cats
(Tchobin and Zizo), no timers, no fail states. About 20 minutes, plus a hedge
maze and little things to find. Every new game changes several puzzles and
grows a new maze.

## Play it

Double-click **`dist/index.html`**. That's the whole game in one file. It works
offline, with no server and nothing downloaded. Use a desktop browser (Chrome,
Edge or Firefox).

Controls: **WASD** move · **mouse** look · **E / click** interact (right-click
turns books, the cipher wheel and the oven dials back) · **Shift** walk slowly ·
**Tab** journal · **H** hint · **M** mute · **Esc** pause.

## Play it on a phone (Android)

The same `dist/index.html` switches to touch controls by itself on a phone or
tablet. Hold the phone sideways; it goes full screen when you start.

- **Left thumb:** a stick appears where you touch. Walk with it, and push
  further to go faster.
- **Right thumb:** drag to look around.
- **Tap** something to use it, or tap the button under the dot. Books, the
  cipher wheel and the oven dials also get a **Turn back** button.
- **Top right:** journal, hint and pause buttons.
- **2-in-1 PCs** (a laptop with a touchscreen) switch by themselves: touch the
  screen for touch controls, use the mouse or trackpad to switch back.
- If it stutters, set Pause → Settings → **Graphics** to **Light** (see below).
- Leaving the app pauses and saves the game.

**Getting it onto the phone.** Phones are bad at opening HTML files saved on
the phone itself (saving progress may not work), so give it a web link instead:

1. Go to <https://app.netlify.com/drop> on a computer.
2. Drag the `dist` folder onto the page. You get a link like
   `https://something-random.netlify.app`. Make the free account it offers,
   or the link only lasts a short while.
3. Open that link in Chrome on the phone. Optional: Chrome menu → _Add to Home
   screen_ gives it an app icon.

The link is public but random, so only people you send it to will find it.
Each phone keeps its own save, so use Pause → _Backup code_ to move a game
between devices.

## Weak tablets and older PCs

There are two graphics settings, under Settings → **Graphics**:

- **Full:** soft shadows, realistic materials, smooth edges.
- **Light:** simpler lighting with no shadows, lower resolution and fewer
  tulips in the garden. It runs about 2.5–3× faster, and the rooms look
  nearly the same.

**Auto** (the default) picks Light by itself on weak hardware:

- Intel HD/UHD graphics, Atom, Celeron and Pentium chips
- budget Android graphics chips
- devices with 4 processor cores or fewer, or 4 GB of memory or less

If Full still runs slowly, the game offers to switch to Light. Changing the
setting restarts the game exactly where you were, and nothing is lost.
Separately, the resolution always lowers itself a little when frames get slow.

## Besides the puzzles

- **Cats:** pet one and it meows. Pet it again for a purr and a slow blink. A
  third time and it follows you around for a while.
- **Things to fiddle with:**
  - lamps switch off and on, and the room gets darker
  - the bedroom music box plays a tune
  - poke the living-room fire
  - put the kettle on
  - open the kitchen window to hear the crickets
  - spin the study globe
- **Five little finds**, kept in the journal:
  - a paper star in the bedroom dresser's top drawer
  - a toy mouse under a sofa cushion
  - a cookie in the kitchen cookie jar
  - a pressed tulip in the little book on the study desk
  - a jar of fireflies in the middle of the hedge maze
- **The hedge maze:** go through the gap in the garden's east wall. A new maze
  grows every new game. Reaching the middle records your time (the best one is
  kept in the journal), and **H** shows a short firefly trail.

## Every game is different

With `RANDOMIZE = true` in `src/config.js` (the default), each new game picks:

| Puzzle         | What changes                                                                                                    |
| -------------- | --------------------------------------------------------------------------------------------------------------- |
| Kitchen cipher | the sentence (from `CIPHER_SENTENCES`) and the shift                                                            |
| Oven dials     | the riddle (from `DIAL_RIDDLES`)                                                                                |
| Vases          | the pattern (from `VASE_VARIANTS`): which colour starts, and pairs (1, 1, 2, 2...) or growing runs (1, 2, 3...) |
| Sudoku         | a reshuffle of `SUDOKU_GIVENS` (rows, columns and numbers moved around): same difficulty, still one solution    |
| Telescope      | where the decoy stars are, and their letters                                                                    |
| Hedge maze     | the whole layout                                                                                                |

These were already random: the frame order, the sliding picture, the book
order and where the cats hide. The lock code, the notes and the letter never
change. Saves remember which version you are playing, and `npm test` checks
every version has exactly one answer. Set `RANDOMIZE = false` to always play
the first version of each.

## Change the text, codes and names

Everything you'd want to change is in **`src/config.js`**, with comments:

| What                                                      | Where in `config.js`                                                                                                                                                            |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Final lock code (now `2007`)                              | `LOCK_CODE`. Door 1 gives the 1st digit, door 2 the 2nd, and so on.                                                                                                             |
| The final letter                                          | `FINAL_MESSAGE` (blank line = new paragraph, last line starting with `—` is the signature)                                                                                      |
| The five room notes                                       | `NOTES`                                                                                                                                                                         |
| Letter pacing                                             | `LETTER_TIMING`                                                                                                                                                                 |
| Kitchen secret sentence                                   | `CIPHER_SENTENCE`, `CIPHER_WORD` (a word of the sentence) and `CIPHER_SHIFT`, plus more in `CIPHER_SENTENCES`. Keep a one-letter word in each sentence: it is how she cracks it |
| Oven dial riddles                                         | `DIAL_RIDDLES` (text, answer, middle hint). Each riddle's rule is in `DIAL_RULES` in `src/puzzles/dials.js`; `npm test` checks every riddle has exactly one answer              |
| Randomiser on or off                                      | `RANDOMIZE`                                                                                                                                                                     |
| Little finds                                              | `FINDS`                                                                                                                                                                         |
| Sudoku (6×6)                                              | `SUDOKU_GIVENS` (keep it to one solution: run `npm test` to check)                                                                                                              |
| Vase patterns, rug, constellation, hiding spots           | `VASE_VARIANTS`, `RUG_SHOWN`, `CONSTELLATION_LABELS`, `CONSTELLATION_DECOYS`, `HIDING_SPOTS`                                                                                    |
| Hints (3 per puzzle)                                      | `HINTS`                                                                                                                                                                         |
| Cat names, envelope letter                                | `CATS`, `ENVELOPE_LETTER`, `SIGNATURE_NAME`                                                                                                                                     |
| Every other word on screen                                | `UI`, `PROMPTS`, `TOASTS`, `LABELS`, `WORLD_TEXT`, `CLUES`                                                                                                                      |
| Words that change on phones ("Tap" instead of "Click"...) | `TOUCH_TEXT`                                                                                                                                                                    |
| Colours                                                   | `COLORS`                                                                                                                                                                        |

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

`npm run e2e` drives Chromium through Playwright, including a run on an
emulated Android phone held sideways (`e2e/touch.mjs`), a 2-in-1 PC
(`e2e/hybrid.mjs`), the graphics switching (`e2e/quality.mjs`), every little
interaction and find (`e2e/cozy.mjs`) and a walk through the hedge maze
(`e2e/maze.mjs`). It uses the Chromium that
`playwright-core` finds. In a normal setup, run `npx playwright install chromium`
once first.

## Updates

The main menu shows the game's version. When a copy is online, it asks GitHub
(at most once a day) for the newest release of
`GAMINGZIYADX/sunday-night`. If there's a newer one, the menu says
_A new version (1.1.0) is ready. Download it_, and the link opens the release
page. Offline, or if GitHub can't be reached, nothing shows and the game plays
as usual. The repo has to stay public for the check to work. Saves are kept by
the browser, so a downloaded new version opened in the same browser continues
the same game.

To publish an update, from a clean `main` with the GitHub CLI signed in
(`gh auth login`):

```
npm run release -- patch "Fixed the kettle"    # 1.0.0 -> 1.0.1
npm run release -- minor "A new room"          # 1.0.0 -> 1.1.0
```

That bumps the version, runs the tests, builds `dist/index.html`, commits,
tags `vX.Y.Z`, pushes, and creates a GitHub release with the game attached as
`Sunday-Night-vX.Y.Z.html`. Leave out the notes to have GitHub write them from
the commits. The check can be switched off with `UPDATES.check` in
`src/config.js`.

## The puzzles

| Room        | Gold key (themed)                                                                                             | Silver key (classic)                                                             |
| ----------- | ------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| Bedroom     | Five frames: order them by distance _and_ season (each clue alone has ties)                                   | 4×4 sliding picture (the fifteen puzzle)                                         |
| Living room | Twelve vases: work out the growing pattern from the rug and three planted vases                               | Rainbow books that only move by turning three at a time                          |
| Kitchen     | A whole sentence in a Caesar cipher with no key given; crack it from the one-letter word, spell the last word | Four oven dials from a five-clue riddle                                          |
| Study       | Hide and seek: six spots, and the cats sneak elsewhere after every wrong guess, so she has to listen          | 6×6 sudoku                                                                       |
| Garden      | The four memory digits on the gate lock                                                                       | Constellation of month letters (J F M A M J J A S O N D) with repeats and decoys |

Every puzzle has three hints (H, or from the journal), and the last always gives the answer away.

## Saving

The game saves itself after every solved puzzle, key, door, room change and when
you pause. The main menu then offers **Continue**.

- **Reset the save:** Settings → _Reset save_ (asks first). Settings are kept.
- **Backup:** Pause → _Backup code_ gives a short text code; paste it back there
  to restore. Useful when moving to another computer or browser.
- The save lives in the browser's `localStorage` for this file. If the browser
  blocks storage (some private windows), the game still runs but won't remember.

## Debug tools (never in `dist/index.html`)

Debug code only exists in `npm run dev` and in `npm run build:debug`
(→ `dist-debug/index.html`). Open it with `?debug=1`:

- `?touch=1` / `?touch=0` force touch controls on or off, `?quality=full` / `?quality=light` force the graphics (both work in every build)
- **Shift+1…6** jump to a room (6 = the clearing)
- **Shift+K** solve both puzzles in the current room (grants both keys)
- **Shift+O** open the current room's door
- `window.__game` scripting API used by the tests

The production build is checked so that none of this is in it.

## How it's built

- `src/config.js`: all text, answers, colours
- `src/main.js`: bootstrap
- `src/engine/`: renderer + light pool, input (pointer lock, or thumb stick and taps on touch
  screens; `device.js` decides which), AABB collision, player,
  interaction (raycast + glow), WebAudio synth, `GameState` (event emitter, single
  source of truth), save/backup, procedural textures, props, static-mesh batching
- `src/rooms/`: one file per room, plus the shell (walls/hallways), doors, art,
  the things to fiddle with and the finds (`cozy.js`) and the hedge maze (`maze.js`)
- `src/puzzles/`: one pure-logic module per puzzle (`getState`, `setState`,
  `isSolved`, `hint(tier)`)
- `src/cats/`: cat model/rig and the behaviour director
- `src/ui/`: HUD, menus, journal, notes, hints, puzzle overlays, the letter
- `tests/`: Vitest unit tests; `e2e/`: Playwright browser tests

Everything is procedural: geometry built in code, textures painted on canvases,
music and sounds synthesised. There are no asset files.
