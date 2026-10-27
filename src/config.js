// =============================================================================
//  SUNDAY NIGHT - everything you might want to change lives in this file.
//
//  - All text the player reads (notes, the letter, clues, hints, UI labels).
//  - Puzzle answers and codes.
//  - Colours and the cats' names.
//
//  You never need to touch the game logic to change any of this. After editing,
//  run `npm run build` and send the new dist/index.html.
// =============================================================================

import { caesarEncode } from './puzzles/cipherMath.js';

export const GAME_TITLE = 'Sunday Night';

// -----------------------------------------------------------------------------
//  Updates: the main menu asks GitHub (at most once a day) whether a newer
//  release exists and shows a download link if so. Offline it stays quiet.
//  To publish an update: `npm run release -- patch` (see README).
// -----------------------------------------------------------------------------
export const UPDATES = {
  check: true,
  repo: 'GAMINGZIYADX/sunday-night',
  everyHours: 24,
};

// -----------------------------------------------------------------------------
//  The cats
// -----------------------------------------------------------------------------
export const CATS = {
  tchobin: { name: 'Tchobin', meowPitch: 1.0 }, // cream / orange tabby
  zizo: { name: 'Zizo', meowPitch: 1.22 }, // black-and-white tuxedo, green eyes
};

// Sign-off used on the final letter.
export const SIGNATURE_NAME = 'Zizou';
// The letter on the envelope in the ending.
export const ENVELOPE_LETTER = 'H';

// -----------------------------------------------------------------------------
//  Story text
// -----------------------------------------------------------------------------
export const INTRO_LINE = 'Tchobin and Zizo hid the keys. Come find them.';

// The five handwritten notes, one per room, in room order.
// Use "\n" for a new line. Keep them exactly as you want them to read.
export const NOTES = [
  // 1. Bedroom - on the nightstand
  "Before you, the days just passed. I'd sit and stare at the wall and wait for them to be over.\nI used to care. I used to try.\nThen there was a stranger. Then there wasn't.",
  // 2. Living room - tucked under the vase
  "Blue and white.\nI can't see them anymore without seeing you.\nAsk me to name another flower. I can't.",
  // 3. Kitchen - on the fridge
  "Sundays used to be nothing. Just another day to get through.\nNow it's the day my chest stops being heavy.\nI count down to it.",
  // 4. Study - on the desk next to the cats
  "I used to think I was a wildfire in an iced biome, and the snow was slowly killing the fire.\nThen you sat next to me.\nThe fire didn't die. The snow started melting.",
  // 5. Garden - on the bench
  "I'm still not good at this. I still have bad nights.\nBut they're shorter now.\nAnd somewhere in them, you're there.",
];

// Where each note sits (shown in the journal).
export const NOTE_PLACES = [
  'Bedroom, on the nightstand',
  'Living room, under the vase on the mantel',
  'Kitchen, on the fridge',
  'Study, on the desk',
  'Garden, on the bench',
];

// The final letter. A blank line starts a new paragraph (longer pause).
// The last line starting with "—" is treated as the signature and fades in last.
export const FINAL_MESSAGE = `My dear H,

Congrats on finishing my cute little game. I made you something again, because the words in my head never land right, and this is the only way I know how to make them land.

I carried my pain so long I forgot what my hands were for.
Then you showed up, and I finally had something to hold that wasn't heavy.

I used to sit in front of a wall and wait for the days to be over.
Now I wait for Sunday. I wait for your messages. I wait for the sound you make when you laugh.

Because of you I feel better. Not fixed. Better.
I laugh without checking if I'm allowed to.
The noise in my head is quieter when you're in it.

I'm not the easy one. You know that.
Your eyes make me lose every argument I never had.
Your smile feels like warm blood coming back into a frozen hand.

I love you more than you can imagine.

— ${SIGNATURE_NAME}`;

// Letter pacing (seconds).
export const LETTER_TIMING = {
  perLine: 1.2, // fade-in time for each line
  betweenLines: 0.55, // pause after a normal line
  betweenParagraphs: 1.6, // pause after the last line of a paragraph
  beforeLastLine: 3.2, // extra pause before "I love you more than you can imagine."
  beforeSignature: 2.0, // pause before the signature
};

export const ROOM_NAMES = ['Bedroom', 'Living room', 'Kitchen', 'Study', 'Garden'];
export const ROOM_TITLES = ['Strangers', 'Tulips', 'Sunday', 'The Cats', 'The Last Door'];

// -----------------------------------------------------------------------------
//  Puzzle answers and codes
// -----------------------------------------------------------------------------

// The randomiser: every new game picks new versions of several puzzles (the
// kitchen sentence and its shift, the dial riddle, the vase pattern, a
// reshuffled sudoku, the decoy stars) and a new hedge maze. Set to false to
// always play the first version of each (the ones written first below).
export const RANDOMIZE = true;

// Final gate lock. One digit is collected per opened door, in room order:
// door of room 1 gives LOCK_CODE[0], room 2 gives LOCK_CODE[1], and so on.
export const LOCK_CODE = '2007';

// Kitchen cipher. The pinned card shows CIPHER_SENTENCE with every letter
// moved CIPHER_SHIFT steps forward, and nothing on it says how far. The fridge
// strip wants CIPHER_WORD, which must be a word of the sentence (the last one
// reads best). CIPHER_ENCODED is worked out for you.
// Tip: keep a one-letter word ("I" or "A") in the sentence; it is the way in.
export const CIPHER_SENTENCE = 'I WAIT FOR SUNDAY';
export const CIPHER_WORD = 'SUNDAY';
export const CIPHER_SHIFT = 3;
export const CIPHER_ENCODED = caesarEncode(CIPHER_SENTENCE, CIPHER_SHIFT); // 'L ZDLW IRU VXQGDB'
// More sentences for the randomiser: [sentence, word]. The first is the one
// above. Each needs a one-letter word (I or A); the shift is picked at random.
export const CIPHER_SENTENCES = [
  [CIPHER_SENTENCE, CIPHER_WORD],
  ['A CAT SLEPT ON MY BOOK', 'BOOK'],
  ['I SAVED YOU THE WARM SEAT', 'SEAT'],
  ['TWO CATS AND A BLUE TULIP', 'TULIP'],
  ['I MADE TEA FOR US', 'TEA'],
];

// Kitchen oven dials (0-9 each). The recipe card text below must match; if you
// change it, also change dialRuleHolds() in src/puzzles/dials.js (the unit
// tests check the riddle has exactly one answer, and that it is this one).
export const DIAL_SOLUTION = [4, 9, 5, 2];
export const DIAL_RECIPE =
  'Four dials, and no two show the same number.\nThe first is the last one doubled.\nThe third is odd.\nThe second is the biggest of them all.\nTogether they make 20.';
// More riddles for the randomiser. Each id has a matching rule in
// src/puzzles/dials.js (the tests check every riddle has exactly one answer).
// `hint` is the middle hint for that riddle.
export const DIAL_RIDDLES = [
  {
    id: 'double',
    text: DIAL_RECIPE,
    solution: DIAL_SOLUTION,
    hint: 'The first dial is the last one doubled, so try the last dial small: 1, 2, 3 or 4. The second must be bigger than all the others.',
  },
  {
    id: 'triple',
    text: 'Four dials, and no two show the same number. None of them is 0.\nThe second is three times the third.\nThe first and the last make 9.\nThe last is the biggest of them all.\nTogether they make 17.',
    solution: [1, 6, 2, 8],
    hint: 'The second is three times the third, so the pair can only be 3 and 1, 6 and 2, or 9 and 3. Then the first and last share what is left of 17.',
  },
  {
    id: 'odd',
    text: 'Four dials, every one of them odd, and no two the same.\nThe last one is 1.\nThe first two add up to the same as the last two.\nThe first is bigger than the second, and the third is bigger than the first.\nTogether they make 16.',
    solution: [5, 3, 7, 1],
    hint: 'If the halves are equal and everything makes 16, each pair makes 8. The last is 1, so the third is 7. Which two odd numbers make 8?',
  },
  {
    id: 'doubleSecond',
    text: 'Four dials, and no two show the same number.\nThe first is the second one doubled.\nThe third is three more than the second.\nThe first and the third together make ten more than the last.\nThe last is not 0.',
    solution: [8, 4, 7, 5],
    hint: 'Everything follows from the second dial. Try 1, 2, 3, 4: the first is double it, the third three more, and the last must come out between 1 and 9.',
  },
];

// Living room vase stand: a growing run of alternating colours.
// 1 blue, 1 white, 2 blue, 2 white, 3 blue, 3 white...
// VASE_GIVEN are the vases (0-based) already planted; she fills the rest.
// The rug shows the first RUG_SHOWN tulips of the pattern.
export const VASE_SLOTS = 12;
export const VASE_GIVEN = [0, 1, 4];
export const RUG_SHOWN = 4;
// More patterns for the randomiser. rule 'pairs': 1, 1, 2, 2, 3, 3 ... of each
// colour in turn; rule 'growing': 1, 2, 3, 4 ... (each run one longer, colours
// alternating). start: the first colour. given: the vases already planted.
export const VASE_VARIANTS = [
  { rule: 'pairs', start: 'B', given: VASE_GIVEN },
  { rule: 'pairs', start: 'W', given: [0, 1, 7] },
  { rule: 'growing', start: 'B', given: [0, 6, 10] },
  { rule: 'growing', start: 'W', given: [0, 5, 11] },
];

// Living room books, left to right, as shown on the stained-glass window.
export const BOOK_ORDER = ['red', 'orange', 'yellow', 'green', 'blue', 'indigo', 'violet', 'pink'];

// Study chalkboard sudoku (6x6, digits 1-6, boxes of 2 rows x 3 columns,
// 0 = empty). Must have exactly one solution (the unit tests check this).
// prettier-ignore
export const SUDOKU_GIVENS = [
  0, 0, 0, 0, 0, 2,
  0, 0, 0, 0, 1, 0,
  0, 5, 6, 0, 0, 0,
  0, 0, 0, 0, 3, 0,
  4, 0, 0, 6, 0, 0,
  0, 2, 0, 0, 0, 0,
];

// Telescope constellation: the heart's stars, in drawing order from the
// bottom tip (one per month), and a few loose lettered stars to mislead
// ([x, y, letter] in a 0..1 box).
export const CONSTELLATION_LABELS = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];
export const CONSTELLATION_DECOYS = [
  [0.5, 0.46, 'J'],
  [0.07, 0.88, 'A'],
  [0.93, 0.9, 'M'],
  [0.5, 0.05, 'S'],
  [0.96, 0.7, 'J'],
];

// Study hide-and-seek spots.
export const HIDING_SPOTS = [
  { id: 'desk', label: 'under the desk' },
  { id: 'curtain', label: 'behind the curtain' },
  { id: 'cushions', label: 'in the cushion corner' },
  { id: 'box', label: 'in the cardboard box' },
  { id: 'armchair', label: 'behind the pink armchair' },
  { id: 'plant', label: 'behind the big plant' },
];

// -----------------------------------------------------------------------------
//  The attic (optional, up the ladder in the bedroom ceiling): an old piano that
//  plays a tune to play back, then a picture lock on a trunk that keeps a photo.
// -----------------------------------------------------------------------------
export const ATTIC_NAME = 'Attic';
export const ATTIC_TITLE = 'Kept Things';
// One octave of white keys. The tune starts with PIANO_START notes and grows by
// one each time it is played back, up to PIANO_LENGTH.
export const PIANO_KEYS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
export const PIANO_START = 3;
export const PIANO_LENGTH = 6;
export const PIANO_TUNE = [2, 4, 0, 5, 3, 1]; // when RANDOMIZE is off: E G C A F D
// The trunk's picture lock: four wheels of these pictures. The answer is the
// four little finds, in the order the card from the piano names them.
export const TRUNK_PICTURES = [
  { id: 'star', name: 'the paper star' },
  { id: 'mouse', name: 'the toy mouse' },
  { id: 'cookie', name: 'the cookie' },
  { id: 'tulip', name: 'the tulip' },
  { id: 'moon', name: 'the moon' },
  { id: 'heart', name: 'the heart' },
];
export const TRUNK_RIDDLE = {
  star: 'what the dresser drawer keeps',
  mouse: 'what Tchobin hides under a cushion',
  cookie: 'what waits in the kitchen jar',
  tulip: 'what the little book is pressing',
};
export const TRUNK_ORDER_WORDS = ['First', 'Then', 'Then', 'Last'];
export const TRUNK_ANSWER = ['cookie', 'star', 'tulip', 'mouse']; // when RANDOMIZE is off
// The photo in the trunk: put one picture (jpg, png or webp) in src/photo/ and
// it is built into the game. The caption is optional, written under the photo.
export const PHOTO = { caption: "I mistake your beauty for the sun's." };

// -----------------------------------------------------------------------------
//  Clue cards (short printed cards next to puzzles; kept in the journal)
// -----------------------------------------------------------------------------
export const CLUES = {
  frames: {
    title: 'A note by the lamp',
    text: 'We started far away, then closer, then together.\nThe year turned once around us, from one snow to the next.',
  },
  vase: { title: 'A faded note', text: 'Each time, a little more.' },
  cipherCard: { title: 'A pinned card', text: CIPHER_ENCODED },
  cipherWheel: { title: 'The wheel poster', text: 'Two rings of letters. Turn the inner one to move every letter by the same number of steps.' },
  telescope: { title: 'A card on the telescope', text: 'A year of us.\nOne star for every month.' },
  recipe: { title: 'Recipe card', text: DIAL_RECIPE },
  gate: { title: 'A note on the gate', text: 'Remember what each room gave you.' },
  // Written from the trunk's answer when a game starts (see puzzles/trunk.js).
  atticRiddle: { title: 'A card from the piano', text: '' },
};

// -----------------------------------------------------------------------------
//  Hints: three tiers per puzzle (nudge, bigger nudge, near-answer).
//  Placeholders in {CURLY} are filled in by the game from the answers above.
// -----------------------------------------------------------------------------
export const HINTS = {
  r1a: [
    'The little card by the nightstand lamp tells the story. Look closely at two things in every frame.',
    'The gap between the tulips leaves ties, and so do the seasons. Use both: the year runs winter, spring, summer, autumn, and back to winter.',
    'Left to right: snowy and far apart, spring blossom and far apart, summer sun and closer, autumn leaves and closer, snowy and together. Click one frame, then another, to swap them.',
  ],
  r1b: [
    'The tulip painting fell off the wall in sixteen pieces. They are on the floor by the window.',
    'Use Peek to see the whole picture, and Numbers to see where each piece belongs. Finish the top row, then the second row, and only then the last two rows together.',
    'Place 1 and 2, then slide 3 and 4 in as a pair (4 above 3 first, then turn them in). Do the same for each row. The last two rows: fix the left column a pair at a time, then cycle the final pieces. Gentle shuffle gives an easier start.',
  ],
  r2a: [
    'The rug in front of the sofa shows how the tulips began. The faded note says each time, a little more.',
    'Count the colours in runs: {RULE}. Keep the rule going and the planted vases will agree with you.',
    'All twelve, left to right: {ANSWER}.',
  ],
  r2b: [
    'The coloured window above the bookshelf knows the right order. But the shelf is tight: a book only moves by turning with its two neighbours.',
    'Click a book to turn it with the ones either side (right-click turns the other way). One turn moves a book two places; two turns of the same three swap two books around the third.',
    'Red, orange, yellow, green, blue, indigo, violet, pink. Work from the left: bring red to the first place by turning triples it sits in, then never touch it again. Then orange, and so on. The last few fall in with a turn or two.',
  ],
  r3a: [
    'The pinned card is a sentence where every letter was moved the same number of steps. Nothing says how many. The wheel poster turns to try them.',
    'Look at the one-letter word: in English it can only be I or A. That tells you the step.',
    '{LONE} is {LONEPLAIN}, so every letter moved {SHIFT} steps forward. Moving them back reads: {SENTENCE}. The fridge wants the last word, {WORD}.',
  ],
  r3b: [
    'The recipe card on the wall is a little riddle for the four oven dials.',
    '{RIDDLEHINT}',
    'Set the dials to {DIALS}. Click a dial to turn it up, right-click to turn it down.',
  ],
  r4a: [
    'Tchobin and Zizo are hiding somewhere in the study. They hear you looking in the wrong place and sneak somewhere new, so do not guess. Stand still and listen.',
    'Turn slowly until the meow sounds straight ahead, and look low: a tail tip or a pair of ears gives them away.',
    '{SPOTS}',
  ],
  r4b: [
    'The chalkboard holds a 6×6 sudoku. Every row, column and box (two rows by three columns) needs 1 to 6 exactly once.',
    'Look for a number that can only go in one place inside a box, or a cell that can only hold one number. Each answer opens up the next.',
    '{SUDOKU}',
  ],
  r5a: [
    'The gate lock wants four digits. The note on the gate says to remember what each room gave you.',
    'Every door you opened made a memory tulip glow and gave you a digit. Open your journal with Tab.',
    'Enter the digits in room order: {CODE}.',
  ],
  r5b: [
    'The card on the telescope says a year of us. The lettered stars are the months, by their first letters.',
    'January, February, March... Letters repeat, and some stars are not part of it. Each month sits right next to the one before it, so follow the shape.',
    'Start at the J at the bottom point of the heart, next to the F. Go up the left side: J F M A M J, over the top: J A S O N D. Wrong stars just fade.',
  ],
  piano: [
    'Press Listen and watch which keys light up, then play them back in the same order. Each time it adds one more note. A wrong key only plays that part again.',
    'The tune starts {START}. Every key has its letter on it.',
    'The whole tune: {TUNE}.',
  ],
  trunk: [
    'The lock wants four pictures. The old piano knows more: play its tune back and it gives you a card.',
    'Each line of the card is one of the little finds around the house: the dresser drawer keeps the paper star, the cushion hides the toy mouse, the kitchen jar holds the cookie, the little book presses the tulip.',
    'Set the wheels, left to right, to {ANSWER}, then Open.',
  ],
};

export const PUZZLE_NAMES = {
  r1a: 'The three frames',
  r1b: 'The fallen painting',
  r2a: 'The vase stand',
  r2b: 'The rainbow books',
  r3a: 'The secret word',
  r3b: 'The oven dials',
  r4a: 'Hide and seek',
  r4b: 'The chalkboard sudoku',
  r5a: 'The gate lock',
  r5b: 'The telescope',
  piano: 'The old piano',
  trunk: 'The picture lock',
};

// -----------------------------------------------------------------------------
//  Small UI strings
// -----------------------------------------------------------------------------
export const UI = {
  subtitle: 'a small house, two cats, ten puzzles',
  clickToStart: 'Click to start',
  version: 'Version {V}',
  updateReady: 'A new version ({V}) is ready.',
  updateDownload: 'Download it',
  updateNow: 'Update now',
  updating: 'Updating…',
  getDesktopApp: 'Get the desktop app',
  continue: 'Continue',
  newGame: 'New game',
  settings: 'Settings',
  resume: 'Resume',
  journal: 'Journal',
  controls: [
    ['W A S D', 'move'],
    ['Mouse', 'look around'],
    ['E / Click', 'interact'],
    ['Shift', 'walk slowly'],
    ['Tab', 'journal'],
    ['H', 'hint'],
    ['M', 'mute'],
    ['Esc', 'pause'],
  ],
  doorNeedsBoth: 'This door has two keyholes, one gold and one silver.',
  doorMissingGold: 'The gold keyhole is still empty. Solve the other puzzle in this room.',
  doorMissingSilver: 'The silver keyhole is still empty. Solve the other puzzle in this room.',
  doorMissingBoth: 'Two keyholes: gold and silver. Both keys are hidden in this room.',
  gateLocked: 'The gate needs its two keys.',
  memoryTulip: 'A memory tulip glows. You wrote the digit {D} in your journal.',
  emptySpot: ['Just a dust bunny.', 'Nobody here. Listen again.', 'Empty, but warm.'],
  foundCat: '{NAME} found.',
  bothFound: 'Found them both.',
  noHintHere: 'Everything nearby is already solved. Walk to a room with an open puzzle.',
  saved: 'Saved',
  theEnd: 'The End',
  playAgain: 'Play again',
  keepWandering: 'Keep wandering',
  mazeSign: 'The hedge maze\n→',
  graphicsRestart: 'The game restarts to change the graphics, right where you are now. Your progress is saved.',
  graphicsOffer:
    'This device is finding the full graphics hard work. Switch to light graphics? It looks a little simpler and runs much smoother. The game restarts right where you are.',
  graphicsSwitch: 'Switch to light',
  graphicsKeep: 'Keep full',
};

// -----------------------------------------------------------------------------
//  What the little prompt under the crosshair says for each object.
//  {N}, {CH}, {V}, {D}, {NAME}, {SPOT} are filled in by the game.
// -----------------------------------------------------------------------------
export const PROMPTS = {
  readNote: 'Read the note',
  slideNote: 'Slide out the note',
  door: 'Use the keys',
  doorLocked: 'Locked door',
  memoryLit: 'Memory tulip: {D}',
  memorySleepy: 'A sleepy tulip',
  petCat: 'Pet {NAME}',
  hiddenCat: 'Is that {NAME}?',
  // bedroom
  framesClue: 'Read the little card',
  framePick: 'Pick up this frame',
  framePutBack: 'Put it back',
  frameSwap: 'Swap the frames',
  painting: 'Piece the painting together',
  // living room
  vaseClue: 'Read the faded note',
  rug: 'Look at the rug pattern',
  bookTurn: 'Turn these three books',
  glass: 'Look at the coloured window',
  vaseFixed: 'Already planted',
  vaseChange: 'Change this tulip',
  vaseEmpty: 'Plant a tulip here',
  basket: 'A basket of tulips',
  // kitchen
  dial: 'Turn dial {N} (now {V})',
  recipe: 'Read the recipe card',
  magnet: 'Put {CH} on the strip',
  strip: 'Type the word on the strip',
  eraser: 'Take the last letter off',
  wheel: 'Turn the wheel (now A → {TO})',
  // Added after the prompts of things that can also turn the other way.
  altMouse: 'right-click turns back',
  card: 'Read the pinned card',
  // study
  chalkboard: 'Solve the chalkboard puzzle',
  spot: 'Look {SPOT}',
  // garden
  telescope: 'Look through the telescope',
  lock: 'Try the 4-digit lock',
  gateNote: 'Read the note on the gate',
  envelope: 'Open the envelope',
  // little things to fiddle with
  lampOff: 'Switch the lamp off',
  lampOn: 'Switch the lamp on',
  musicBox: 'Wind up the music box',
  musicBoxPlaying: 'Listen',
  kettle: 'Put the kettle on',
  kettleBusy: 'The kettle is on',
  windowOpen: 'Open the window',
  windowClose: 'Close the window',
  fire: 'Poke the fire',
  globe: 'Spin the globe',
  drawerOpen: 'Open the drawer',
  drawerClose: 'Close the drawer',
  cushionLift: 'Lift the cushion',
  cushionDown: 'Put the cushion back',
  cookieJar: 'Peek in the cookie jar',
  bookOpen: 'Open the little book',
  bookClose: 'Close the book',
  // the hedge maze
  mazeSign: 'Read the sign',
  jar: 'Open the jar of fireflies',
  jarOpened: 'The fireflies are out',
  envelopeAgain: 'Read the letter again',
  // the attic
  atticCord: 'Pull the cord',
  atticUp: 'Climb up to the attic',
  atticDown: 'Climb down',
  piano: 'Play the old piano',
  riddleCard: 'Read the card',
  trunk: 'Open the old trunk',
  photoTake: 'Take the photo',
  photoLook: 'Look at the photo',
};

// Little messages that pop up at the top of the screen.
export const TOASTS = {
  memoryWaiting: 'It is waiting for this door to open.',
  stripFull: 'The strip is full. Use the little eraser magnet to take a letter off.',
  rug: '{SEQ}... and then?',
  glass: 'Red, orange, yellow, green, blue, indigo, violet... and pink.',
  vaseFixed: 'This one was planted already. Work out the rest from the rug and the planted vases.',
  basket: 'Blue and white tulips. Choose an empty vase on the stand to plant one.',
  alreadyFound: '{NAME} was already found here.',
  keyFound: '{TYPE} key found.',
  gold: 'Gold',
  silver: 'Silver',
  badSave: 'That save could not be read, so a new game was started.',
  saveErased: 'Save erased.',
  saveRestored: 'Save restored.',
  updateFailed: 'The update could not be downloaded. Try again later.',
  soundOff: 'Sound off (M)',
  soundOn: 'Sound on',
  wandering: 'The garden is yours. Stay as long as you like.',
  catFollow: '{NAME} has decided to follow you around for a while.',
  catPurr: '{NAME} purrs.',
  found: 'A little find: {NAME} ({N}/{TOTAL})',
  allFound: 'Every little find is found. The journal keeps them all.',
  nothingMore: 'Nothing else in here.',
  mazeSign: 'A hedge maze. Something is waiting in the middle.',
  mazeSignBest: 'A hedge maze. Your best time to the middle: {BEST}.',
  mazeFirst: 'You found the middle of the maze in {TIME}.',
  mazeBest: 'The middle again, in {TIME}: a new best time.',
  mazeAgain: 'The middle again, in {TIME} (best {BEST}).',
  mazeHint: 'The fireflies show you the way, just for a moment.',
  ladder: 'A ladder unfolds from the ceiling.',
};

// Words on buttons, menus and puzzle screens.
export const LABELS = {
  close: 'Close',
  hint: 'Hint (H)',
  hintShort: 'Hint',
  cancel: 'Cancel',
  yes: 'Yes',
  done: 'Done',
  okay: 'Okay',
  putDown: 'Put it down',
  clickToLook: 'Click to look around',
  controlsTitle: 'Controls',
  goldKey: 'Gold key',
  silverKey: 'Silver key',
  // pause / settings / backup
  paused: 'Paused',
  backupCode: 'Backup code',
  mainMenu: 'Main menu',
  autosaveNote: 'Your progress is saved automatically.',
  areYouSure: 'Are you sure?',
  confirmNewGame: 'Start a new game? Your current progress will be replaced.',
  confirmReset: 'This erases all progress (keys, puzzles, notes). Settings stay. There is no undo.',
  masterVolume: 'Master volume',
  musicVolume: 'Music volume',
  sfxVolume: 'Effects volume',
  sensitivity: 'Mouse sensitivity',
  invertY: 'Invert Y',
  headBob: 'Head bob',
  reducedMotion: 'Reduced motion',
  mute: 'Mute (M)',
  resetSave: 'Reset save',
  backupIntro: 'Copy this code somewhere safe. Pasting it back later restores your game exactly.',
  backupMaking: 'Making your code...',
  backupPaste: 'Paste a backup code here',
  copy: 'Copy',
  copied: 'Copied.',
  copySelected: 'Selected. Press Ctrl+C to copy.',
  restoreTitle: 'Restore from a code',
  restore: 'Restore',
  restoreFailed: 'That code did not work. Check that it was copied completely.',
  // journal
  keys: 'Keys',
  open: '(open)',
  memoryTulips: 'Memory tulips',
  digitsNote: 'One digit for every door you open, in room order.',
  notes: 'Notes',
  finds: 'Little finds',
  mazeBest: 'Hedge maze: you found the middle. Best time {BEST}.',
  notFound: 'not found yet',
  clues: 'Clues',
  puzzles: 'Puzzles',
  hintLine: 'Hint {T}/3: {TEXT}',
  // hint card
  hintTitle: 'Hint {T} of 3 · {NAME}',
  hintMore: 'Press H for more',
  biggerHint: 'A bigger hint',
  thanks: 'Thanks',
  // sliding
  peek: 'Peek',
  numbers: 'Numbers',
  gentleShuffle: 'Gentle shuffle',
  moves: 'Moves: {N}',
  paintingWhole: 'The painting is whole again.',
  slidingHelp: 'Click a piece next to the gap, or use the arrow keys. Hold Peek to see the painting.',
  // sudoku
  sudokuStart: 'Pick a square, then a number.',
  clear: 'Clear',
  check: 'Check',
  sudokuOneWrong: 'One number does not fit yet. It is marked.',
  sudokuWrong: '{N} numbers do not fit yet. They are marked.',
  sudokuLeft: 'Looking good so far. {N} to go.',
  sudokuSolved: 'Solved. Every row, column and box is happy.',
  // lock
  lockStart: 'Four digits. One from each room.',
  lockOpen: 'Open',
  lockJournal: 'Journal (Tab)',
  lockNotQuite: 'The lock does not move. Not quite.',
  lockNotYet: 'Not yet. Your journal (Tab) has the digits from each door.',
  lockHelp: 'Use the arrows, or type the digits and press Enter.',
  lockOpened: 'Click. The lock opens.',
  // telescope
  starsStart: 'Connect the months in order.',
  starsDone: 'A heart, hiding in the sky.',
  // vase
  slot: 'Slot {N}',
  vaseIntro: 'Take a tulip from the basket for this slot.',
  blue: 'Blue',
  white: 'White',
  takeOut: 'Take it out',
  // cipher
  stripTitle: 'The fridge strip',
  stripIntro: 'Type the secret word and the magnets will spell it.',
  stripCard: 'The card says {CODE}.',
  stripNeeds: 'It needs {N} letters.',
  stripWrong: 'The magnets slide back. Not that word yet.',
  stripSolved: 'Click, click, click. The word sticks.',
  spellIt: 'Spell it',
  readCard: 'Read the card',
  // letter
  readFaster: 'click to read faster',
  // touch screens
  use: 'Use',
  turnBack: 'Turn back',
  pause: 'Pause',
  fullscreen: 'Full screen',
  rotate: 'Turn your phone sideways to play',
  graphics: 'Graphics',
  graphicsAuto: 'Auto ({Q})',
  graphicsFull: 'Full',
  graphicsLight: 'Light',
  // the attic
  pianoListen: 'Listen',
  pianoIntro: 'Press Listen. Watch the keys light up, then play them back.',
  pianoYourTurn: 'Your turn: {N} notes.',
  pianoWrong: 'Not quite. Listen again.',
  pianoMore: 'Yes. One more note this time.',
  pianoSolved: 'That was the whole tune. Something drops out from under the lid.',
  pianoFree: 'Play anything you like.',
  pianoHelp: 'Click the keys, or press 1 to 7.',
  trunkOpen: 'Open',
  trunkStart: 'Four wheels of little pictures.',
  trunkNotQuite: 'The lock does not move.',
  trunkOpened: 'Click. The lid lifts a little.',
  trunkHelp: 'Turn each wheel with the arrows, then Open.',
  photoTitle: 'A photo',
};

// Little finds: small things hidden around the house (in a drawer, under a
// cushion, in the cookie jar, in a book, in the middle of the garden maze, and
// in the attic's trunk). They are optional and kept in the journal.
export const FINDS = [
  { id: 'star', room: 0, name: 'a paper star', text: 'Folded very carefully from a page of a notebook. Someone kept it.' },
  { id: 'mouse', room: 1, name: 'a toy mouse', text: "Tchobin's favourite toy. It has clearly been through a lot." },
  { id: 'cookie', room: 2, name: 'a cookie shaped like a cat', text: 'The ears came out a little burnt. Still perfect.' },
  { id: 'tulip', room: 3, name: 'a pressed tulip', text: 'Flattened between two pages, still a little blue.' },
  { id: 'fireflies', room: 4, name: 'a jar of fireflies', text: 'Waiting in the middle of the hedge maze.' },
  { id: 'photo', room: 6, name: 'a photo', text: 'Kept in the old trunk in the attic.' },
];

// On phones and tablets these replace the keyboard-and-mouse wording above.
// Same names as above; for hints, the number is which of the three to replace.
export const TOUCH_TEXT = {
  UI: {
    clickToStart: 'Tap to start',
    controls: [
      ['Left thumb', 'walk (push further to go faster)'],
      ['Right thumb', 'drag to look around'],
      ['Tap', 'use what you tap, or the button under the dot'],
      ['Buttons', 'journal, hint and pause, top right'],
    ],
  },
  LABELS: {
    hint: 'Hint',
    mute: 'Mute',
    sensitivity: 'Look sensitivity',
    copySelected: 'Selected. Long-press it to copy.',
    hintMore: '',
    slidingHelp: 'Tap a piece next to the gap. Hold Peek to see the painting.',
    lockJournal: 'Journal',
    lockNotYet: 'Not yet. Your journal has the digits from each door.',
    lockHelp: 'Tap the arrows to set each digit, then Open.',
    pianoHelp: 'Tap the keys.',
    readFaster: 'tap to read faster',
  },
  TOASTS: {
    soundOff: 'Sound off',
  },
  HINTS: {
    r1a: {
      2: 'Left to right: snowy and far apart, spring blossom and far apart, summer sun and closer, autumn leaves and closer, snowy and together. Tap one frame, then another, to swap them.',
    },
    r2b: {
      1: 'Tap a book to turn it with the ones either side (Turn back goes the other way). One turn moves a book two places; two turns of the same three swap two books around the third.',
    },
    r3b: { 2: 'Set the dials to {DIALS}. Tap a dial to turn it up, or Turn back to turn it down.' },
    r5a: { 1: 'Every door you opened made a memory tulip glow and gave you a digit. Open your journal with the book button, top right.' },
  },
};

// Words painted on things in the world.
export const WORLD_TEXT = {
  noteCover: 'For you.\n\n(open me)',
  noteCoverShort: 'for you',
  recipeTitle: 'Sunday cake',
  stickyNotes: ['milk', 'tulips', 'Sunday'],
  chalkboardRule: ['1 to 6', 'once in every', 'row, column', 'and box', '(2 rows × 3)'],
  wheelCaption: 'outside → inside',
};

// -----------------------------------------------------------------------------
//  Colours (hex). Change the mood here.
// -----------------------------------------------------------------------------
export const COLORS = {
  blush: 0xf2c4c0,
  blushDeep: 0xe2a29d,
  cream: 0xf7ecd9,
  creamDark: 0xe8d6b8,
  sage: 0xa9bf9d,
  sageDeep: 0x7f9c78,
  wood: 0xb07a4f,
  woodDark: 0x7d5236,
  woodLight: 0xd3a679,
  lamp: 0xffd38a,
  lampWarm: 0xffb866,
  tulipBlue: 0x6f9be0,
  tulipBlueDeep: 0x4a73c4,
  tulipWhite: 0xfaf7f0,
  stem: 0x6f9d5a,
  night: 0x1c2140,
  nightDeep: 0x10132a,
  gold: 0xf2c14e,
  silver: 0xd5dbe3,
};
