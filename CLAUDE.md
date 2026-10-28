# Sunday Night: handoff notes for Claude Code

A cosy first-person puzzle game built as a **personal gift** (for "H", from the
author, who signs the letter "Zizou"). Three.js + Vite + vanilla JS, everything
procedural (no asset files, no CDN; the one exception is the author's photo in
`src/photo/`, inlined by Vite), built into **one file**, `dist/index.html`, that
works from `file://`. Read `README.md` for the player-facing description.

## Rules that matter

- **Never soften or rewrite** `FINAL_MESSAGE` or `NOTES` in `src/config.js`.
  They are the author's own words. A test checks the letter has no `!` and
  ends with `— Zizou`. The gate lock code is random every game (the author
  asked for nothing fixed; it was `2007`): `LockPuzzle.code`, saved with it.
- **The coupon** at the end of the treasure hunt (`HUNT_COUPON.text`) is the
  author's own words, like the letter: never rewrite it. Empty, the hunt
  does not appear.
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
npm test               # vitest: puzzles, randomiser, saves, updates, side rooms, quality, baking (113 tests)
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
  hemisphere, re-dressed per room), `shadows.js` (the spot's shadow map is
  drawn again only when something on screen moved), `input.js` (mouse/pointer lock, touch stick
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

Extras: 10 optional **little finds** (paper star in the dresser drawer, toy mouse
under the striped sofa cushion, cookie in the kitchen jar, pressed tulip in the
study book, jar of fireflies in the middle of the **hedge maze**, the photo in
the **attic** trunk, one in each side room, and the baked shortcake), kept in
the journal; the maze is east of the garden.

**Baking** (optional, kitchen): the ingredients on the counter
(`rooms/bake.js`, `bakingStation`) open `bakeOverlay` (`ui/bake.js`, drawings
in `ui/bakeArt.js`): a strawberry shortcake in the **real recipe and real
steps** (`BAKE_INGREDIENTS`, `BAKE_STEPS` in config.js; the author asked for
that, so the amounts are the same every game; don't randomise or "game-ify"
them). Each step is tasks, each task one gesture kind with its rules in
`bake/recipe.js` (dial, swipe, tapEach, taps, pour, scribble, drag, wait).
Nothing fails: wrong moves only say so. Finished steps are saved
(`gs.data.bake.step`, `gs.bakeStep(n)`); the last one gives the find `cake`,
which shows on the kitchen table (`tableShortcake`) and sends the cats over
(`CatDirector.visit`). The scene is SVG with real DOM pieces (`data-k`), so
`e2e/bake.mjs` drives it with real pointer gestures (`--phone`: 800x360 with
touch events through the DevTools protocol).

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
(cached an hour in `sundayNight.update.v1`; a day before 1.3.1, so older
copies can take that long to notice a release) and the main menu offers it if it is
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
  minSdk is 21 (Android 5.0; the manifest overrides Cordova's 22, unused).
  `android.minWebViewVersion` is 80: older, `MainActivity` asks for the Play
  Store update. Emulators there: `sundaynight` (API 34) and `lollipop` (API
  21, WebView 37, so it shows that prompt).

## Old and mid-range phones

- **three.js is pinned to 0.162.0**, the last release that still runs on
  WebGL 1 (r163 dropped it). Many 2013-15 phone chips (Mali-400, PowerVR
  SGX) have no WebGL 2. Don't upgrade three without a plan for those.
  `renderer.js` hands three a WebGL 1 context itself when there is no WebGL 2;
  `textures.js` turns off mipmaps on non-power-of-two canvases there (else
  three shrinks them and the card writing blurs). No WebGL at all: `main.js`
  shows `UI.noWebGL`.
- **Oldest browser: Chrome 80** (`build.target` / `cssTarget` in
  `vite.config.js`). esbuild lowers syntax and `inset`, but not newer APIs or
  CSS such as `aspect-ratio` (use explicit heights) or `Array.at`.
- `quality.js`: `pickQuality()` is the 'auto' rule (`tests/quality.test.js`).
  No WebGL 2 or a `WEAK_GPU` means Light; `GOOD_PHONE_GPU` (Adreno 618+: the phone
  the game is meant for is a Redmi Note 12 Pro 4G) means Full even at 4 GB.
- `game._tick` caps touch devices at 60 fps (90/120 Hz screens).
- **Broken drivers.** The Pixel 10 (PowerVR D-Series DXT, Android 17) loses
  the WebGL context as soon as a shadow map is drawn, in Full or Light, and
  Chrome then blocks WebGL for the site until it is fully restarted (three.js
  issue #34311, closed: a driver bug). The author's `?gfxtest` on it: Full
  without shadows draws fine at ~58 fps (with or without MSAA); WebGL 1 came
  out far too dark (unused there). So `SHADOW_BUG` turns shadows off on that
  chip and auto picks Full (`GOOD_PHONE_GPU`; older PowerVR stays Light). `Game._watchGraphics` catches
  `onShaderError`, `webglcontextlost` and a white picture (`_checkPicture`,
  `pictureIsWhite`), and `_graphicsFailed` steps down and saves
  `settings.gfxFix`: 1 = shadows off, 2 = also no MSAA, 3 = Light (restart;
  white turns shadows off live first). A context loss after 90 s or while
  hidden just restarts. `SHADOWS` / `MSAA` in `quality.js` read it; Settings
  shows a note; choosing Full again resets 3. `UI.noWebGL` says to restart
  the app fully. `e2e/gfxcheck.mjs` fakes each failure.
- **Graphics test page**: `?gfxtest` (any build; for a phone, open
  `https://raw.githack.com/GAMINGZIYADX/sunday-night/vX.Y.Z/dist/index.html?gfxtest`
  in Chrome, then tap "Open the page"). `src/gfxtest.js` runs the game 8
  times, safest first, in an iframe with `?probe=1` plus flags from
  `quality.js` (`shadows`, `msaa`, `tonemap`, `ratio`, `webgl1`);
  `Game._probeFrame` posts back a snapshot, fps, errors and whether it was
  white, or that 3D was lost. Progress is saved (`sundayNight.gfxtest.v1`), so
  after a crash the page asks for a browser restart and carries on. Results
  copy as text. Its words are inline (an author's tool, like debug.js).
  `e2e/gfxtest.mjs` covers it.
- `WEBGL1=1` makes the browser tests run without WebGL 2;
  `e2e/oldphones.mjs` covers all of the above.

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
- Keep the draw-call count modest (roughly 200-450 per frame, shadow pass
  included: three.js's `renderer.info` does not count it; `e2e/perf.mjs`
  measures both); batch small things (fairy-light glows are one `Points` per
  string) and give a box one material, not one per face (each face would be a
  draw call: see `faceBox` for the fridge magnets).
- **Culling** (`Game._cull`): a next room is drawn only when its door is open
  and the doorway is on screen (or from the hallway), and then only the parts
  in view through the doorway; the rest go on layer `BEYOND` (the shadow pass
  draws every layer). Walls are one-sided, so this only works because rooms
  join through doorways alone: a new window or opening between two rooms
  needs `_canSee` to know about it.
- **Shadows are cached** (`ShadowCache`): the map is drawn again when a caster
  on screen moves more than 6 mm, the set of visible casters changes, the
  spot moves, or every 3 s. A change that alters a shadow without moving,
  showing or hiding a mesh (say a new `alphaTest`) needs
  `game.shadows.invalidate()`. `scene.matrixWorldAutoUpdate` is off:
  `ShadowCache.update` updates every matrix once, just before `render()`.
- The e2e tests read each game's randomised answers from `window.__game`; never
  hard-code a puzzle answer in a test.
- Prettier is configured (`.prettierrc`, width 150); run `npx prettier --write`
  on what you touch.
- Not verifiable in the cloud sandbox: how audio sounds, real-GPU frame rate,
  handwriting fonts on Windows/Mac, real phones. Say so rather than claiming it.

## The other side rooms and the treasure hunt

Like the attic, built apart from the house (south of it) and reached by
`game.travel()` fades; each zone is shown only while you are in it
(`isSideZone`). `SIDE_ROOMS` (config) names them; `SIDE_IDS`
(puzzles/index.js) lists each room's two puzzles (no keys: they emit
`sideSolved`); `gs.sideDone(room)` brings out the room's little find.
Shared bits in `rooms/side.js` (`wallDoor`, `skyDome`, `tween`, `boxIn`).

| Zone | Room        | Way in                       | Puzzles                                   | Find         |
| ---- | ----------- | ---------------------------- | ----------------------------------------- | ------------ |
| 7    | Greenhouse  | glass door, garden west wall | `water` (thirstiest first), `lamps` (4×4) | a tulip      |
| 8    | Basement    | hatch in the kitchen floor   | `fuses` (rule card), `pipes` (5×5)        | wind-up cat  |
| 9    | Balcony     | glass doors, study east wall | `lanterns` (5×5 picture), `pairs` (12)    | wish lantern |

All are randomised per game and saved. The fuse card is generated so only
one setting fits (`makeRules`, checked in `tests/rooms.test.js`); the basement
stays dark until the fuses are right (`room.rig` swaps). Lantern pictures in
`LANTERN_PICTURES` must each have one answer (tested, mirrored too).

**Treasure hunt** (`engine/hunt.js`, `rooms/hunt.js`): after the letter and
only once `HUNT_COUPON.text` has words, a note by the envelope starts a chain
of `HUNT_LENGTH` notes by puzzles (spots = `HUNT_RIDDLES` keys, a new order
every game, `gs.data.hunt`). Notes lie on the floor a step in front of their
puzzle; the last spot holds the coupon (`couponOverlay`). The current note's
text is the `hunt` clue in the journal. `e2e/siderooms.mjs` plays all of this
and checks every spot can be reached.

## Status

All unit tests (113) and browser tests (prod, props, playthrough, continue,
collision, touch, quality, hybrid, cozy, maze, selfupdate, attic, oldphones,
gfxcheck, gfxtest, siderooms, perf, bake, bake --phone) pass as of the last commit, and the playthrough passes on WebGL 1. The
playthrough also passes with random scrambles. Ideas not done: a Cozy/Brainy
difficulty choice, personal photos in the bedroom frames, a spectator mode for
the author. The coupon (`HUNT_COUPON.text`) has the author's words: never rewrite them.
