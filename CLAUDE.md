# Sunday Night: handoff notes for Claude Code

A cosy first-person puzzle game built as a **personal gift** (for "H", from the
author, who signs the letter "Zizou"). Three.js + Vite + vanilla JS, everything
procedural (no asset files, no CDN; the one exception is the author's photo in
`src/photo/`, inlined by Vite), built into **one file**, `dist/index.html`, that
works from `file://`. Read `README.md` for the player-facing description.

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
npm test               # vitest: puzzles, randomiser, saves, updates, attic (76 tests)
npm run build          # -> dist/index.html (the shippable file)
npm run build:debug    # -> dist-debug/index.html (used by the browser tests)
npm run e2e            # builds both, then runs every browser test
node e2e/<name>.mjs    # one browser test (needs the debug build first)
npm run app            # the Windows desktop app from source (Electron)
npm run build:app      # -> dist-app/Sunday-Night-Setup-X.Y.Z.exe + latest.yml
npm run build:apk      # -> dist-apk/Sunday-Night-vX.Y.Z.apk (Android, Capacitor)
```

Browser tests use `playwright-core` + Chromium with software rendering, so they
are slow (the full playthrough takes minutes). On the author's Windows PC,
Playwright's own Chromium download hangs; set `CHROME_PATH` to an installed
Chromium (`%LOCALAPPDATA%\ms-playwright\chromium-1228\chrome-win64\chrome.exe`).
Electron is pinned to 44.5.1 because that zip is already in the Electron cache
there; a fresh Electron download failed the same way. Pass a directory as the first
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
  drawer, cushion, cookie jar, book, the little finds), `maze.js` (hedge maze),
  `attic.js` (the attic and the bedroom ladder), `photo.js` (the attic photo
  from `src/photo/`, or a drawn stand-in).
- `puzzles/`: one pure-logic module per puzzle extending `Puzzle` in `base.js`
  (`PUZZLE_IDS` are the ten key puzzles, `ATTIC_IDS` the attic's `piano` and
  `trunk`, `ALL_IDS` both):
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

| Room    | Gold key                                         | Silver key                           |
| ------- | ------------------------------------------------ | ------------------------------------ |
| Bedroom | 5 frames ordered by distance and season          | 4x4 sliding picture                  |
| Living  | 12-vase tulip pattern                            | Books that only turn three at a time |
| Kitchen | Caesar-cipher sentence, spell the last word      | 4 oven dials from a riddle           |
| Study   | Hide and seek (cats move after each wrong guess) | 6x6 sudoku                           |
| Garden  | 4-digit gate lock (the memory digits)            | Constellation of month letters       |

Extras: 6 optional **little finds** (paper star in the dresser drawer, toy mouse
under the striped sofa cushion, cookie in the kitchen jar, pressed tulip in the
study book, jar of fireflies in the middle of the **hedge maze**, the photo in
the **attic** trunk), kept in the journal; the maze is east of the garden.

**The attic** (zone/room index 6, optional, open from the start): a cord in
the bedroom ceiling (`HATCH` in `layout.js`) brings a ladder down
(`gs.data.attic.ladder`, saved). The attic is built apart from the house at
z 18-25 (`ATTIC`; `zoneAt` returns 6 south of z 12) and `game.travel()` fades
the player between the two; `_cull` shows only the attic while in it. Its
puzzles give no keys: they emit `atticSolved`, not `solved`. The piano
(`piano.js`) plays a growing tune to play back (a wrong key only replays);
solved, it shows the `atticRiddle` clue, whose text `syncText` writes from the
trunk's answer. The trunk (`trunk.js`) is a picture lock: four wheels, the
answer is the four finds in the card's order. Inside is the photo (find
`photo`), shown full size by `photoOverlay` and again from the journal.

## The randomiser (`RANDOMIZE` in config.js)

Each new game picks: cipher sentence (`CIPHER_SENTENCES`) + shift, dial riddle
(`DIAL_RIDDLES`, rules in `DIAL_RULES` in `puzzles/dials.js`), vase pattern
(`VASE_VARIANTS`), a reshuffle of `SUDOKU_GIVENS`, decoy stars, and the maze
(`mazeSeed`, ways to the middle are 40+ cells). The chosen version is stored in
the save; old saves fall back to the first variants. Clue cards and textures are
redrawn from the current puzzle (`GameState.syncText`). When adding a variant,
**make sure it has exactly one answer** and add it to `tests/randomiser.test.js`
(brute force for dials, family-of-rules check for vases).

## Updates

`src/engine/updateCheck.js` asks the GitHub releases API for the latest tag
(cached a day in `sundayNight.update.v1`) and the main menu offers it if it is
newer than `__APP_VERSION__` (package.json's version, baked in by
`vite.config.js`, which also stamps `<meta name="sunday-night-version">`).
`updatesEnabled()` is off in debug builds unless `?updatecheck=1` (browser
tests stay offline) and in the desktop app. The repo must stay public.

- **Self-update** (`src/engine/selfUpdate.js`): "Update now" fetches
  `raw.githubusercontent.com/<repo>/vX.Y.Z/dist/index.html` (release assets
  have no CORS), checks the meta version, and stores it in IndexedDB
  (`sundayNight` / `builds` / `latest`). `src/main.js` calls `bootStored()`
  before creating the game: a newer stored build is `document.write`n over
  the page (same origin, so saves carry over). Crash guard:
  `sundayNight.update.pending` is set before the swap and cleared by
  `markBooted()`; still set on the next launch means it failed, so it is
  deleted. `e2e/selfupdate.mjs` covers it all with faked GitHub replies.
- **Desktop app** (`desktop/main.cjs`, `preload.cjs`, `icon.png`): Electron
  loads `dist/index.html`; electron-updater reads `latest.yml` from the latest
  GitHub release, downloads in the background and asks Restart now / Later.
  The preload sets `window.sundayNightApp.desktop` so the game's own checks
  stay off. The app has its own saves. Unsigned (SmartScreen warning).
  `three` is a devDependency so the installer only ships `electron-updater`.
- **Android app** (`android/`, Capacitor 6, `capacitor.config.json`): the built
  `dist/` in a WebView served from `https://localhost`, landscape and full
  screen (`MainActivity.java`). The game's own update check and self-update
  work there unchanged, so installed apps get Update now.
  `scripts/build-apk.mjs` syncs and runs Gradle; versionName and versionCode
  (major·10000 + minor·100 + patch) come from package.json. Release signing
  reads `%USERPROFILE%\.sunday-night\keystore.properties` (never in the repo;
  losing it means the next APK can't install over the old one). Capacitor 6
  because the machine has JDK 17; the SDK is in `%LOCALAPPDATA%\Android\Sdk`.

Publish with `npm run release -- patch|minor|major "notes"`
(`scripts/release.mjs`): it bumps, tests, builds, commits, tags, pushes, runs
`gh release create` with the HTML, then builds and uploads the Windows
installer with `latest.yml`, then the Android APK. Don't bump the version by hand in a normal commit. The full
"Restart now" cycle of the desktop app can only be checked across two real
releases (install one, release the next).

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

All unit tests (76) and browser tests (prod, props, playthrough, continue,
collision, touch, quality, hybrid, cozy, maze, selfupdate, attic) pass as of the last commit. The
playthrough also passes with random scrambles. Ideas not done: a Cozy/Brainy
difficulty choice, personal photos in the bedroom frames, a spectator mode for
the author. The attic is built and waiting for the author's photo (and an
optional caption in `PHOTO.caption`; the caption is the author's to write).
