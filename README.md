# Sunday Night

A small, cosy first-person puzzle house. Five rooms, two puzzles each, two cats
(Tchobin and Zizo), no timers, no fail states. About 20 minutes, plus a hedge
maze, four optional side rooms (an attic with a photo in it, a greenhouse, a
basement and a balcony), little things to find, and a treasure hunt after the
ending. Every new game changes the puzzles, the lock code and the maze.

## Play it

Double-click **`dist/index.html`**. That's the whole game in one file. It works
offline, with no server and nothing downloaded. Use a desktop browser (Chrome,
Edge or Firefox).

Controls: **WASD** move · **mouse** look · **E / click** interact (right-click
turns books, the cipher wheel and the oven dials back) · **Shift** run ·
**Tab** journal · **H** hint · **M** mute · **Esc** pause.

## Play it on a phone (Android)

The same `dist/index.html` switches to touch controls by itself on a phone or
tablet. Hold the phone sideways; it goes full screen when you start.

- **Left thumb:** a stick appears where you touch. Walk with it, and push
  past its ring to run (it turns pink).
- **Right thumb:** drag to look around.
- **Tap** something to use it, or tap the button under the dot. Books, the
  cipher wheel and the oven dials also get a **Turn back** button.
- **Top right:** journal, hint and pause buttons.
- **2-in-1 PCs** (a laptop with a touchscreen) switch by themselves: touch the
  screen for touch controls, use the mouse or trackpad to switch back.
- If it stutters, set Pause → Settings → **Graphics** to **Light** (see below).
- Leaving the app pauses and saves the game.

**Getting it onto the phone: the Android app (easiest).** Every release has
`Sunday-Night-vX.Y.Z.apk`. Open the release page on the phone, download the
APK and tap it. Android asks to allow installing apps from the browser (allow
it once); Play Protect may warn about an app it doesn't know, because it isn't
from the Play Store: choose _Install anyway_. The app opens straight into the
game, full screen and sideways. It updates itself like the game file: when a
new release is out, the main menu offers **Update now**. The app keeps its own
save, separate from the browser's.

It runs on Android 5.0 and newer, so phones from 2013-14 on. An old phone
also needs its **Android System WebView** brought up to date in the Play
Store (version 80 or newer, free); if it is older, the app says so and opens
the Play Store page. Phones whose graphics chip only has WebGL 1 (most cheap
phones from before about 2015) play with Light graphics. A phone with no 3D
support at all gets a short explanation instead of a blank screen.

To build it yourself: `npm run build:apk` (into `dist-apk/`). It needs the
Android SDK (`ANDROID_HOME`, or `%LOCALAPPDATA%\Android\Sdk`), JDK 17, and the
release key: `release.jks` and `keystore.properties` in
`%USERPROFILE%\.sunday-night\`. **Back those two files up.** A new APK only
installs over the old one if it is signed with the same key; without it,
people would have to uninstall first and lose their save. (Thanks to Update
now, a new APK is rarely needed anyway.)

**Or a web link.** Phones are bad at opening HTML files saved on the phone
itself (saving progress may not work), so a link works better than the file:

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
- budget and older Android graphics chips (Adreno 616 and below, Mali-400,
  T-series and G31–G57, PowerVR), and any chip with only WebGL 1
- devices with 4 processor cores or fewer, or 4 GB of memory or less

Mid-range phones get **Full**, even when they report 4 GB: Adreno 618 and up
(for example the Redmi Note 12 Pro 4G), Mali-G68 and up, Samsung Xclipse.
On phones the game draws at most 60 frames a second, even on 90 and 120 Hz
screens. Twice the frames would barely look smoother, but would double the
work and the heat; this headroom is what keeps Full smooth there.

Some phones' graphics drivers break parts of Full. The Pixel 10 on Android 17
is one: its driver crashes 3D whenever shadows are drawn (a known driver bug,
three.js issue #34311). Everything else in Full works there at a full 60
frames a second, so on that chip auto picks Full and leaves the shadows out. If Full fails anyway (a white picture, shaders that
fail, or 3D lost), the game turns off shadows, then edge smoothing, then
switches to Light, restarting as needed, and remembers what this device
needed. Settings → Graphics then says what was adjusted. If the screen says
3D is off, close the app completely and open it again: after a crash, the
browser keeps 3D off until it restarts.

To see what a phone can handle, open the game with `?gfxtest` in Chrome on
it (for example
`https://raw.githack.com/GAMINGZIYADX/sunday-night/v1.3.2/dist/index.html?gfxtest`).
It runs the bedroom with each setting, from the safest up, and gives results
to copy.

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
- **Baking:** the ingredients on the kitchen counter (between the jars and the
  stove) open a hands-on strawberry shortcake: the real recipe, in eleven real
  steps (heat the oven, slice and sugar the berries, rub in the butter, add
  the milk, cut the rounds, bake, whip the cream, then build it). Tap, hold to
  pour, swipe to cut, stir, drag. Nothing can go wrong for good, and finished
  steps are kept. The cake ends up on the kitchen table, and the cats come to
  look.
- **Ten little finds**, kept in the journal:
  - a paper star in the bedroom dresser's top drawer
  - a toy mouse under a sofa cushion
  - a cookie in the kitchen cookie jar
  - a pressed tulip in the little book on the study desk
  - a jar of fireflies in the middle of the hedge maze
  - a photo in the attic trunk
  - a tulip in bloom in the greenhouse, a wind-up cat in the basement and a
    wish lantern on the balcony, each once both puzzles there are solved
  - the strawberry shortcake, once it is baked
- **The hedge maze:** go through the gap in the garden's east wall. A new maze
  grows every new game. Reaching the middle records your time (the best one is
  kept in the journal), and **H** shows a short firefly trail.
- **The attic:** pull the cord in the bedroom ceiling and a ladder comes down.
  Up there, under the roof, an old piano plays the start of a tune and lights
  its keys: play it back and it adds a note, until the whole tune is played
  (a wrong key just plays that part again). It gives a card that names four
  of the little finds in some order; those are the four pictures that open the
  trunk under the round window. Inside is a photo. It is all optional, and
  open from the very start.
- **The greenhouse** (the glass door in the garden's west wall): water six
  thirsty plants, thirstiest first (each tag says the day it was last
  watered, and today is Sunday), and light a 4×4 grid of grow lamps where each
  lamp also flips the ones beside it.
- **The basement** (the hatch in the kitchen floor, south-west corner): dark
  until the fuse box is fixed. Set five switches so every rule on its card
  holds, then pull the lever; and turn the pipe pieces until water runs from
  the tap to the boiler.
- **The balcony** (the glass doors in the study's east wall), under the
  stars: light a 5×5 net of lanterns to match the numbers on each row and
  column (they draw a picture), and match six pairs of star cards.
- **The treasure hunt:** after the letter, a folded note waits by the
  envelope. Each note lies on the floor by a puzzle somewhere and says where
  the next one is; the last place has an envelope with a coupon. A new order
  every game. The coupon's words are `HUNT_COUPON` in `src/config.js`; until
  they are written, the hunt stays hidden.

### Your photo in the trunk

Put one picture (jpg, png or webp) in **`src/photo/`** and rebuild: it is built
into the game file, so `dist/index.html` still works on its own. Keep it under
about 500 KB (a phone photo resized to 1600 px on its long side is plenty), as
it makes the game file that much bigger. Without a picture, a drawing of the two
cats at a window stands in. An optional caption under it: `PHOTO.caption` in
`src/config.js`.

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
| Attic          | the piano's tune and the order of the four pictures on the trunk                                                |
| Lock code      | the four digits the memory tulips give and the gate wants                                                       |
| Greenhouse     | which plants, and the day on each tag; the grow lamps' starting tangle                                          |
| Basement       | the switch names, the answer, and a card of rules that only that answer keeps; the pipe route                   |
| Balcony        | the lantern picture (from `LANTERN_PICTURES`, maybe mirrored); the star cards and where they lie                |
| Treasure hunt  | which places the notes are in, and their order                                                                  |

These were already random: the frame order, the sliding picture, the book
order and where the cats hide. The notes and the letter never change. Saves remember which version you are playing, and `npm test` checks
every version has exactly one answer. Set `RANDOMIZE = false` to always play
the first version of each.

## Change the text, codes and names

Everything you'd want to change is in **`src/config.js`**, with comments:

| What                                                      | Where in `config.js`                                                                                                                                                            |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| The final letter                                          | `FINAL_MESSAGE` (blank line = new paragraph, last line starting with `—` is the signature)                                                                                      |
| The five room notes                                       | `NOTES`                                                                                                                                                                         |
| Letter pacing                                             | `LETTER_TIMING`                                                                                                                                                                 |
| Kitchen secret sentence                                   | `CIPHER_SENTENCE`, `CIPHER_WORD` (a word of the sentence) and `CIPHER_SHIFT`, plus more in `CIPHER_SENTENCES`. Keep a one-letter word in each sentence: it is how she cracks it |
| Oven dial riddles                                         | `DIAL_RIDDLES` (text, answer, middle hint). Each riddle's rule is in `DIAL_RULES` in `src/puzzles/dials.js`; `npm test` checks every riddle has exactly one answer              |
| Cozy / Normal / Brainy settings                           | `DIFFICULTY` (what each level changes; the words are `UI.levels`)                                                                                                               |
| Randomiser on or off                                      | `RANDOMIZE`                                                                                                                                                                     |
| Little finds                                              | `FINDS`                                                                                                                                                                         |
| The side rooms' names                                     | `SIDE_ROOMS`                                                                                                                                                                    |
| Greenhouse, basement, balcony                             | `WATER_DAYS`, `WATER_PLANTS`, `FUSE_NAMES`, `FUSE_RULES`, `LANTERN_PICTURES` (each needs one answer: `npm test` checks), `PAIR_PICTURES`                                        |
| The treasure hunt                                         | `HUNT_COUPON` (your coupon), `HUNT_LENGTH`, `HUNT_RIDDLES`, `HUNT_TEXT`                                                                                                         |
| The attic                                                 | `PIANO_KEYS`, `PIANO_START`, `PIANO_LENGTH`, `TRUNK_PICTURES`, `TRUNK_RIDDLE`, `PHOTO` (the photo itself goes in `src/photo/`)                                                  |
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
interaction and find (`e2e/cozy.mjs`), a walk through the hedge maze
(`e2e/maze.mjs`) and older phones: WebGL 1, the 60 fps cap and no WebGL at all
(`e2e/oldphones.mjs`; `WEBGL1=1 node e2e/playthrough.mjs` plays the whole game
on WebGL 1). It uses the Chromium that
`playwright-core` finds. In a normal setup, run `npx playwright-core install chromium`
once first, or set `CHROME_PATH` to a Chromium you already have.

## Updates

The main menu shows the game's version. When a copy is online, it asks GitHub
(at most once an hour) for the newest release of
`GAMINGZIYADX/sunday-night`. Offline, or if GitHub can't be reached, nothing
shows and the game plays as usual. The repo has to stay public for this to
work.

**The game file updates itself.** When there's a newer release, the menu says
_A new version (1.2.0) is ready_ with an **Update now** button. It downloads
the new version (under 1 MB), keeps it in the browser and reopens the game
in it, with the save kept. From then on that file opens the newest version it
has downloaded, offline too, even though the file itself doesn't change. If
an update ever fails to start, the next launch goes back to the file's own
version. Copies from before 1.2.0 can't do this: they only show a download
link, so send those people the new file once. To try it without publishing
anything, run `npm run build` then `node scripts/try-update.mjs`: it opens the
game in a browser window where GitHub seems to have version 9.9.9.

**Or the Windows desktop app.** On Windows the menu also offers
**Get the desktop app**: the release page's `Sunday-Night-Setup-X.Y.Z.exe`
installs Sunday Night like any program, with its own window and Start menu
entry (F11 for full screen). It downloads new versions in the background and
asks _Restart now_ or _Later_ (Later updates it the next time it closes).
Two things to know: Windows warns about an unknown publisher on the first
install, because the app isn't code-signed (_More info_ → _Run anyway_); and
the app keeps its own saves, separate from the browser, so use Pause →
_Backup code_ to bring a game across. To try it from the source folder:
`npm run app`; to build the installer: `npm run build:app` (into `dist-app/`).

To publish an update, from a clean `main` with the GitHub CLI signed in
(`gh auth login`):

```
npm run release -- patch "Fixed the kettle"    # 1.0.0 -> 1.0.1
npm run release -- minor "A new room"          # 1.0.0 -> 1.1.0
```

That bumps the version, runs the tests, builds `dist/index.html`, commits,
tags `vX.Y.Z`, pushes, and creates a GitHub release with the game attached as
`Sunday-Night-vX.Y.Z.html`, then builds the desktop app and attaches its
installer and `latest.yml` (which installed apps check). Leave out the notes
to have GitHub write them from the commits. The check can be switched off with `UPDATES.check` in
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

**Cozy, Normal or Brainy.** New game asks how hard the puzzles should be (the
journal shows the choice). Normal is the game as it was made. Cozy starts the
frames, sliding picture and books less scrambled, gives five more sudoku numbers,
two loose stars instead of five, cats that sneak off only every second wrong look,
and a short maze. Brainy starts no frame in place, the books 12 to 14 turns away,
eight loose stars, a cat that sneaks off when the other is found, a longer maze
with no loops, and a minute's wait before each bigger hint. Every setting still
has exactly one answer per puzzle (`tests/difficulty.test.js`). The side rooms,
the cipher, the dials, the vases and the lock are the same on all three.

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
