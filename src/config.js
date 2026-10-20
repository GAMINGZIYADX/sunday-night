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
  'Living room, under the vase',
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

// Final gate lock. One digit is collected per opened door, in room order:
// door of room 1 gives LOCK_CODE[0], room 2 gives LOCK_CODE[1], and so on.
export const LOCK_CODE = '2007';

// Kitchen cipher. The card shows the word shifted forward by CIPHER_SHIFT.
// CIPHER_ENCODED is worked out for you, so only change the word and the shift.
export const CIPHER_WORD = 'SUNDAY';
export const CIPHER_SHIFT = 3;
export const CIPHER_ENCODED = caesarEncode(CIPHER_WORD, CIPHER_SHIFT); // 'VXQGDB'

// Kitchen oven dials (0-9 each). The recipe card text below must match.
export const DIAL_SOLUTION = [6, 5, 3];
export const DIAL_RECIPE =
  'Set the three oven dials so that they add up to 14.\nThe first dial is double the last.\nThe middle is one less than the first.';

// Living room vase stand: a growing run of alternating colours.
// 1 blue, 1 white, 2 blue, 2 white, 3 blue, 3 white...
export const VASE_SLOTS = 9;
export const VASE_PREFILLED = 6;

// Living room books, left to right, as shown on the stained-glass window.
export const BOOK_ORDER = ['red', 'orange', 'yellow', 'green', 'blue', 'indigo', 'violet', 'pink'];

// Study chalkboard sudoku (4x4, digits 1-4, 0 = empty). Must have one solution
// (the unit tests check this).
// prettier-ignore
export const SUDOKU_GIVENS = [
  0, 0, 4, 3,
  4, 0, 0, 0,
  1, 0, 0, 0,
  0, 2, 0, 4,
];

// Telescope constellation: number of stars in the heart.
export const CONSTELLATION_STARS = 12;

// Study hide-and-seek spots.
export const HIDING_SPOTS = [
  { id: 'desk', label: 'under the desk' },
  { id: 'curtain', label: 'behind the curtain' },
  { id: 'cushions', label: 'in the cushion corner' },
  { id: 'box', label: 'in the cardboard box' },
];

// -----------------------------------------------------------------------------
//  Clue cards (short printed cards next to puzzles; kept in the journal)
// -----------------------------------------------------------------------------
export const CLUES = {
  frames: { title: 'A note by the lamp', text: 'We started far away, then closer, then together.' },
  vase: { title: 'A faded note', text: 'Each time, a little more.' },
  cipherCard: { title: 'A pinned card', text: CIPHER_ENCODED },
  cipherWheel: { title: 'The wheel poster', text: 'A → D\nB → E\nC → F\n...and so on, every letter three steps along.' },
  recipe: { title: 'Recipe card', text: DIAL_RECIPE },
  gate: { title: 'A note on the gate', text: 'Remember what each room gave you.' },
};

// -----------------------------------------------------------------------------
//  Hints: three tiers per puzzle (nudge, bigger nudge, near-answer).
//  Placeholders in {CURLY} are filled in by the game from the answers above.
// -----------------------------------------------------------------------------
export const HINTS = {
  r1a: [
    'The little note by the nightstand lamp tells a story in three steps.',
    'Look at the gap between the two tulips in each frame. Read the wall from left to right, like the note.',
    'Left: tulips far apart. Middle: a little closer. Right: side by side, touching. Click one frame, then another, to swap them.',
  ],
  r1b: [
    'The tulip painting fell off the wall in pieces. It is on the floor by the window.',
    'Use Peek to see the whole picture. Finish the top row first, then the left column, then the last four.',
    'Turn on Numbers in the puzzle. Put 1, 2, 3 in the top row, then 4 and 7 down the left, then slide the last ones round in a circle. If it feels tangled, press Gentle shuffle for an easier start.',
  ],
  r2a: [
    'The rug in front of the sofa shows how the tulips began.',
    'Count the colours in runs: one blue, one white, then two blue, two white. The faded note says each time, a little more.',
    'After two whites come three blues. The last three slots are blue, blue, blue.',
  ],
  r2b: [
    'The coloured window above the bookshelf knows the right order.',
    'It is a rainbow, read from left to right, with one extra colour at the end.',
    'Red, orange, yellow, green, blue, indigo, violet, pink. Click one book, then another, to swap them.',
  ],
  r3a: [
    'The card pinned by the wheel poster is a secret word. The poster shows how its letters were moved.',
    'Every letter was moved {SHIFT} steps forward in the alphabet. Move each one {SHIFT} steps back, then spell it with the fridge magnets.',
    '{MAP}. The word is {WORD}. Click the magnets in order, or click the strip to type it.',
  ],
  r3b: [
    'The recipe card on the wall has the rules for the three oven dials.',
    'Start with the last dial. The first is double it, the middle is one less than the first. Try small numbers until they add up.',
    'Set the dials to {DIALS}. Click a dial to turn it up, right-click to turn it down.',
  ],
  r4a: [
    'Tchobin and Zizo are hiding somewhere in the study. Stand still and listen.',
    'The meows get louder when you are close, and come from one side. Look for a tail tip or a pair of ears peeking out.',
    '{SPOTS}',
  ],
  r4b: [
    'The chalkboard holds a tiny sudoku. Every row, column and 2×2 box needs 1, 2, 3 and 4 exactly once.',
    'Look for a row, column or box that is missing just one or two numbers. Fill those first, then look again.',
    '{SUDOKU}',
  ],
  r5a: [
    'The gate lock wants four digits. The note on the gate says to remember what each room gave you.',
    'Every door you opened made a memory tulip glow and gave you a digit. Open your journal with Tab.',
    'Enter the digits in room order: {CODE}.',
  ],
  r5b: [
    'The telescope is pointed at a constellation hiding among the stars.',
    'The bright stars are numbered. Connect them from 1 upwards, in order.',
    'Star 1 is the bottom point of the heart. Go up the left side and round to 12. A wrong star just fades, try the next number.',
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
};

// -----------------------------------------------------------------------------
//  Small UI strings
// -----------------------------------------------------------------------------
export const UI = {
  subtitle: 'a small house, two cats, ten puzzles',
  clickToStart: 'Click to start',
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
  bookPick: 'Pick up this book',
  bookPutBack: 'Put it back',
  bookSwap: 'Swap the books',
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
  wheel: 'Look at the wheel poster',
  card: 'Read the pinned card',
  // study
  chalkboard: 'Solve the chalkboard puzzle',
  spot: 'Look {SPOT}',
  // garden
  telescope: 'Look through the telescope',
  lock: 'Try the 4-digit lock',
  gateNote: 'Read the note on the gate',
  envelope: 'Open the envelope',
  envelopeAgain: 'Read the letter again',
};

// Little messages that pop up at the top of the screen.
export const TOASTS = {
  memoryWaiting: 'It is waiting for this door to open.',
  stripFull: 'The strip is full. Use the little eraser magnet to take a letter off.',
  rug: 'Blue, white, blue, blue, white, white... and then?',
  glass: 'Red, orange, yellow, green, blue, indigo, violet... and pink.',
  vaseFixed: 'These first six were planted already. The last three are up to you.',
  basket: 'Blue and white tulips. Choose an empty vase on the stand to plant one.',
  alreadyFound: '{NAME} was already found here.',
  keyFound: '{TYPE} key found.',
  gold: 'Gold',
  silver: 'Silver',
  badSave: 'That save could not be read, so a new game was started.',
  saveErased: 'Save erased.',
  saveRestored: 'Save restored.',
  soundOff: 'Sound off (M)',
  soundOn: 'Sound on',
  wandering: 'The garden is yours. Stay as long as you like.',
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
  starsStart: 'Connect the numbered stars in order.',
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
};

// Words painted on things in the world.
export const WORLD_TEXT = {
  noteCover: 'For you.\n\n(open me)',
  noteCoverShort: 'for you',
  recipeTitle: 'Sunday cake',
  stickyNotes: ['milk', 'tulips', 'Sunday'],
  chalkboardRule: ['1 2 3 4', 'once in every', 'row, column', 'and box'],
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
