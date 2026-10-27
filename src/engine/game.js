import * as THREE from 'three';
import { createRenderer, LightPool, pictureIsWhite } from './renderer.js';
import { Collision } from './collision.js';
import { Input } from './input.js';
import { Player } from './player.js';
import { Interactions } from './interact.js';
import { AudioEngine } from './audio.js';
import { Particles } from './particles.js';
import { KeyFx } from './keyfx.js';
import { Settings } from './settings.js';
import { GameState } from './gamestate.js';
import { saveGame, loadSave, hasSave, clearSave } from './save.js';
import { zoneAt, ROOMS, ATTIC_ZONE } from './layout.js';
import { Hud } from '../ui/hud.js';
import { Modals } from '../ui/manager.js';
import { clickToStart, mainMenu, pauseMenu, journal, showNote, showClue, HintCard, confirmBox } from '../ui/screens.js';
import { playLetter } from '../ui/letter.js';
import { CatDirector } from '../cats/catDirector.js';
import { buildWorld } from '../rooms/world.js';
import { INTRO_LINE, UI } from '../config.js';
import { PUZZLE_IDS, ALL_IDS } from '../puzzles/index.js';
import { TOASTS } from '../config.js';
import { fill } from './text.js';
import { device, enterFullscreen, setTouchMode, onTouchModeChange } from './device.js';
import { QUALITY, LIGHT, autoQuality, MAX_RATIO, PROBE } from './quality.js';

export const START = { x: -0.25, z: 1.55, yaw: 0.35 };
// Set just before a graphics restart, so the game carries on after the reload.
const RESUME_KEY = 'sundayNight.resume';

// A graphics test run (?probe) reports the errors and warnings it saw, such
// as a shader the graphics driver would not compile.
const probeErrors = [];
if (PROBE)
  for (const k of ['error', 'warn']) {
    const orig = console[k];
    console[k] = (...a) => {
      if (probeErrors.length < 8) probeErrors.push(a.map(String).join(' ').slice(0, 500));
      orig.apply(console, a);
    };
  }

export class Game {
  constructor(container) {
    this.container = container;
    const { renderer, scene, camera } = createRenderer(container);
    this.renderer = renderer;
    this.scene = scene;
    this.camera = camera;
    this.lights = new LightPool(scene);
    this.collision = new Collision();
    this.settings = new Settings();
    this.input = new Input(renderer.domElement);
    this.player = new Player(camera, this.input, this.collision, this.settings);
    this.interact = new Interactions(camera);
    this.audio = new AudioEngine();
    this.particles = new Particles(scene);
    this.keyfx = new KeyFx(scene, camera, this.audio, this.particles, this.settings);
    this.gs = new GameState();

    this.uiRoot = document.createElement('div');
    this.uiRoot.id = 'ui-root';
    document.body.appendChild(this.uiRoot);
    this.hud = new Hud(this.uiRoot);
    this.modals = new Modals(this.uiRoot, this);
    this.hints = new HintCard(this.uiRoot, this);

    this.state = 'boot'; // boot -> menu -> playing
    this.zone = 0;
    this.time = 0;
    this.keyAnimating = new Set();
    this.pendingKeys = [];
    this.updaters = [];
    this.roomGroups = [];
    this.occluders = this.interact.occluders;
    this.doors = [];
    this.rooms = [];

    // Debug builds can skip mesh batching (?nomerge) so props keep their identity.
    this.noMerge = __DEBUG__ && new URLSearchParams(location.search).has('nomerge');
    this.ctx = this._makeCtx();
    this.cats = new CatDirector(this.ctx);
    this.ctx.cats = this.cats;
    buildWorld(this.ctx);

    this._bindEvents();
    this._applySettings();
    this._applyResolution();
    this.settings.onChange(() => this._applySettings());
    this.player.onStep = (slow) => this.audio.footstep(this.zone === 4 || this.zone === 5 ? 'grass' : 'wood', slow);

    this.maxDt = 0.05; // frame-time cap (debug tests raise it for slow software rendering)
    this.clock = new THREE.Clock();
    this._fwd = new THREE.Vector3();
    this._nextFrame = 0;
    this._check = LIGHT || PROBE ? null : { frames: 0 };
    this._probe = PROBE ? { frames: 0, times: [] } : null;
    this._watchGraphics();
    this.renderer.setAnimationLoop((now) => this._tick(now));
  }

  // Phones with 90 or 120 Hz screens: draw at most 60 frames a second. Twice
  // the frames barely looks smoother but doubles the work (and the heat), and
  // that headroom is what lets a mid-range phone keep the full graphics.
  _tick(now) {
    if (device.touch && now < this._nextFrame - 2) return;
    this._nextFrame = Math.max(this._nextFrame + 1000 / 60, now);
    this._frame();
  }

  _makeCtx() {
    const game = this;
    return {
      game,
      scene: this.scene,
      camera: this.camera,
      collision: this.collision,
      occluders: this.occluders,
      interact: this.interact,
      gs: this.gs,
      audio: this.audio,
      hud: this.hud,
      particles: this.particles,
      keyfx: this.keyfx,
      settings: this.settings,
      doors: this.doors,
      rooms: this.rooms,
      roomGroup: (i) => {
        if (!this.roomGroups[i]) {
          const g = new THREE.Group();
          g.name = `room-${i}`;
          this.scene.add(g);
          this.roomGroups[i] = g;
        }
        return this.roomGroups[i];
      },
      addUpdate: (fn) => this.updaters.push(fn),
      playerZone: () => this.zone,
      playerPos: () => this.camera.position,
      showNote: (i) => showNote(this, i),
      showClue: (id, mono) => showClue(this, id, { mono }),
    };
  }

  // ------------------------------------------------------------ lifecycle
  boot() {
    this._placeMenuCamera();
    this.hud.setFade(false);
    this.state = 'menu';
    let resume = false;
    try {
      resume = sessionStorage.getItem(RESUME_KEY) === '1';
      sessionStorage.removeItem(RESUME_KEY);
    } catch {
      /* no session storage */
    }
    clickToStart(this, () => {
      this.audio.init();
      this._applySettings();
      if (resume && this.hasSave()) this.continueGame();
      else mainMenu(this);
    });
  }

  hasSave() {
    return hasSave();
  }

  newGame() {
    this.modals.closeAll();
    this.gs.reset();
    clearSave();
    this._syncWorld();
    this.player.place(START.x, START.z, START.yaw, -0.05);
    this.zone = 0;
    this.gs.data.room = 0;
    this._startPlaying(true);
    this.saveNow('new');
  }

  continueGame() {
    const data = loadSave();
    if (!data || !this.gs.load(data)) {
      this.toast(TOASTS.badSave);
      return this.newGame();
    }
    this.modals.closeAll();
    this._syncWorld();
    const p = this.gs.data.player;
    this.player.place(p.x, p.z, p.yaw, p.pitch);
    // Safety: never start inside furniture.
    if (this.collision.hits(p.x, p.z, 0.2)) this.player.place(START.x, START.z, START.yaw);
    this._startPlaying(false);
  }

  importSave(obj) {
    if (!this.gs.load(obj)) return false;
    this._syncWorld();
    const p = this.gs.data.player;
    this.player.place(p.x, p.z, p.yaw, p.pitch);
    if (this.collision.hits(p.x, p.z, 0.2)) this.player.place(START.x, START.z, START.yaw);
    this.saveNow('import');
    if (this.state !== 'playing') this._startPlaying(false);
    return true;
  }

  resetSave() {
    clearSave();
    this.gs.reset();
    this._syncWorld();
    this.modals.closeAll();
    this.toMainMenu();
    this.toast(TOASTS.saveErased);
  }

  toMainMenu() {
    this.modals.closeAll();
    this.hints.hide();
    this.state = 'menu';
    this.input.enabled = false;
    this.input.unlock();
    this.hud.setPlaying(false);
    this.hud.setClickToLook(false);
    this._placeMenuCamera();
    mainMenu(this);
  }

  _startPlaying(fresh) {
    this.state = 'playing';
    this.hud.setPlaying(true);
    this.hud.setFade(true);
    this.zone = zoneAt(this.player.pos.z);
    this.lights.apply(this.rooms[Math.min(this.zone, this.rooms.length - 1)].rig);
    this.audio.setTheme(this.zone);
    this._updateKeysHud(false);
    setTimeout(() => this.hud.setFade(false), 250);
    if (fresh) {
      // Wake-up: start low and stand up.
      this.player.eyeOffset = -0.75;
      this.wakeT = 0;
      setTimeout(() => this.hud.showIntro(INTRO_LINE, 5600), 1300);
    } else this.hud.showBanner(this.zone);
    this.hud.showControls(device.touch ? 14000 : 60000);
    this.input.enabled = true;
    this.input.lock();
    enterFullscreen();
  }

  // Bring every room's visuals in line with the GameState.
  _syncWorld() {
    this.keyAnimating.clear();
    this.pendingKeys = [];
    this.doors.forEach((d) => d.sync());
    this.rooms.forEach((r) => r.applyState && r.applyState());
    this.zone = zoneAt(this.player.pos.z);
    this.cats.resetFromState();
    this._updateKeysHud(false);
  }

  _placeMenuCamera() {
    this.camera.position.set(2.4, 1.45, 2.6);
    this.camera.rotation.set(-0.12, 0.72, 0);
    this.zone = 0;
    if (this.rooms[0]) this.lights.apply(this.rooms[0].rig);
  }

  saveNow(reason) {
    if (this.state !== 'playing' && reason !== 'menu') return;
    const d = this.gs.data;
    d.player = { x: this.player.pos.x, z: this.player.pos.z, yaw: this.player.yaw, pitch: this.player.pitch };
    d.room = this.zone;
    if (saveGame(this.gs) && reason !== 'quiet') this.hud.flashSaved();
  }

  toast(text, opts) {
    this.hud.toast(text, opts);
  }

  toggleMute() {
    this.settings.set('muted', !this.settings.data.muted);
    this.toast(this.settings.data.muted ? TOASTS.soundOff : TOASTS.soundOn, { ms: 1400 });
  }

  playEnding() {
    this.hints.hide();
    playLetter(this, {
      onDone: (choice) => {
        if (choice === 'again') this.newGame();
        else {
          this.cats.freeRoam();
          this.toast(TOASTS.wandering, { ms: 5000 });
        }
      },
    });
  }

  openJournal() {
    journal(this);
  }
  openClue(id, mono) {
    showClue(this, id, { mono });
  }

  _applySettings() {
    const s = this.settings.data;
    this.audio.setVolumes({ master: s.master, music: s.music, sfx: s.sfx });
    this.audio.setMuted(s.muted);
    document.body.classList.toggle('reduced', s.reducedMotion);
  }

  // Resolution cap: phones start a little lower than computers, light
  // graphics lower still. The frame-rate watcher can go down from there.
  _applyResolution() {
    const cap = MAX_RATIO || (LIGHT ? 1 : device.touch ? 1.25 : 1.5);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, cap));
    this._perf = null;
  }

  // The graphics choice changed in the settings. Materials and shadows are
  // decided at startup, so a different quality means restarting the page;
  // the game is saved first and continues straight away after the reload.
  setGraphics(choice, { ask = true, onCancel = null } = {}) {
    const want = choice === 'auto' ? autoQuality() : choice;
    if (want === QUALITY) {
      this.settings.set('graphics', choice);
      return false;
    }
    const go = () => {
      this.settings.set('graphics', choice);
      // Asking for Full again after it failed here: try it afresh.
      if (want === 'full' && this.settings.data.gfxFix >= 3) this.settings.set('gfxFix', 0);
      this._reloadGraphics();
    };
    if (ask) confirmBox(this, UI.graphicsRestart, go, { onNo: onCancel });
    else go();
    return true;
  }

  _reloadGraphics() {
    if (this.state === 'playing') {
      this.saveNow('quiet');
      try {
        sessionStorage.setItem(RESUME_KEY, '1');
      } catch {
        /* no session storage: they press Continue themselves */
      }
    }
    location.reload();
  }

  // Graphics drivers that break the full look. The Pixel 10's (PowerVR,
  // Android 17; three.js issue #34311) fails to link shaders, shadows first,
  // then the realistic materials, and then loses 3D altogether; elsewhere the
  // picture came out white. Any of these steps the look down and remembers
  // the step for this device (GFX_FIX in quality.js): shadows off, then edge
  // smoothing off, then light graphics.
  _watchGraphics() {
    this.renderer.debug.onShaderError = (gl, program, vs, fs) => {
      const shadow = /DEPTH_PACKING|DISTANCE/.test(gl.getShaderSource(fs) || '');
      const log = [gl.getProgramInfoLog(program), gl.getShaderInfoLog(vs), gl.getShaderInfoLog(fs)].map((s) => (s || '').trim()).filter(Boolean);
      console.error(
        `THREE.WebGLProgram: ${shadow ? 'shadow' : 'material'} shader failed to link, error ${gl.getError()}: ${log.join(' / ') || 'no log'}`,
      );
      this._graphicsFailed(shadow ? 'shadow' : 'shader');
    };
    this.renderer.domElement.addEventListener('webglcontextlost', () => {
      console.error('WebGL: the 3D context was lost');
      this._graphicsFailed('lost');
    });
  }

  // A moment after the start, look at the picture: white all over is broken.
  _checkPicture() {
    const c = this._check;
    if (++c.frames < 30) return;
    this._check = null;
    if (pictureIsWhite(this.renderer)) this._graphicsFailed('white');
  }

  // kind: 'shadow' or 'shader' (a shader failed to link), 'lost' (no more
  // 3D), 'white' (see _checkPicture).
  _graphicsFailed(kind) {
    if (PROBE) {
      // A graphics test run: report at once (a lost context draws nothing more).
      if (kind === 'lost' && !this._probeLost) {
        this._probeLost = true;
        parent.postMessage({ gfxProbe: location.search, lost: true, errors: probeErrors }, '*');
      }
      return;
    }
    if (this._failing) return;
    // 3D lost long after the start, or while away (phones can drop it in the
    // background): not the driver failing the look, so just start again.
    if (kind === 'lost' && (document.hidden || performance.now() > 90000)) {
      this._failing = true;
      setTimeout(() => this._reloadGraphics(), 500);
      return;
    }
    if (LIGHT) return; // nothing simpler to fall back to
    const fix = this.settings.data.gfxFix || 0;
    if (kind === 'white' && fix < 1 && this.renderer.shadowMap.enabled) {
      // Shadows go without a restart; then look again.
      this.toast(UI.graphicsFixing, { ms: 3000 });
      this.settings.set('gfxFix', 1);
      this.renderer.shadowMap.enabled = false;
      this.lights.spot.castShadow = false;
      this.scene.traverse((o) => {
        for (const m of [].concat(o.material || [])) m.needsUpdate = true;
      });
      this._check = { frames: 0 };
      return;
    }
    this._failing = true;
    this._check = null;
    let next;
    if (kind === 'shadow') next = Math.max(fix, 1);
    else if (kind === 'shader') next = 3;
    else next = Math.min(3, Math.max(fix + 1, this.renderer.shadowMap.enabled ? 1 : 2));
    this.settings.set('gfxFix', next);
    if (next >= 3) this.settings.set('graphics', 'light');
    this.toast(UI.graphicsFixing, { ms: 3000 });
    setTimeout(() => this._reloadGraphics(), 1500);
  }

  // Full graphics, but the frame rate stays low even at the lowest
  // resolution: offer light graphics once (unless Full was picked on purpose).
  _offerLight() {
    if (this._offered || LIGHT || this.settings.data.graphics === 'full' || this.headless) return;
    if (this.state !== 'playing' || this.modals.open) return;
    this._offered = true;
    confirmBox(this, UI.graphicsOffer, () => this.setGraphics('light', { ask: false }), {
      yes: UI.graphicsSwitch,
      no: UI.graphicsKeep,
      onNo: () => this.settings.set('graphics', 'full'),
    });
  }

  // ------------------------------------------------------------------ hints
  showHint(id) {
    // In the hedge maze, a hint is a firefly trail towards the middle.
    const maze = this.rooms[4]?.maze;
    if (!id && this.zone === 4 && maze?.inMaze(this.camera.position) && maze.showTrail()) return;
    if (!id) {
      const hovered = this.interact.hover?.puzzle;
      id = hovered && !this.gs.puzzles[hovered].isSolved() ? hovered : this._nearestPuzzle();
    }
    if (!id) {
      this.toast(UI.noHintHere);
      return;
    }
    this.hints.show(id);
    this.audio.pageFlip();
  }

  _nearestPuzzle() {
    const room = this.zone === ATTIC_ZONE ? ATTIC_ZONE : Math.min(this.zone, 4);
    const r = this.rooms[room];
    if (!r?.anchors) return null;
    let best = null;
    let bd = Infinity;
    for (const id of ALL_IDS) {
      const p = this.gs.puzzles[id];
      if (p.room !== room || p.isSolved() || !r.anchors[id]) continue;
      const d = this.camera.position.distanceTo(r.anchors[id]);
      if (d < bd) {
        bd = d;
        best = id;
      }
    }
    return best;
  }

  // ------------------------------------------------------------------ events
  _bindEvents() {
    this.input.on('key', (e) => this._onKey(e));
    this.input.on('interact', () => this._use(false));
    this.input.on('interactAlt', () => this._use(true));
    this.input.on('tap', ({ x, y }) => this._tap(x, y));
    // 2-in-1 PCs: a finger switches to touch controls, a mouse back again.
    this.input.on('pointerKind', (kind) => setTouchMode(kind === 'touch'));
    onTouchModeChange((on) => {
      this.input.touch = on;
      this.input.releaseTouches();
      if (on) this.input.unlock();
      this.hud.setTouch(on);
      this.hud.setClickToLook(false);
      if (this.state === 'playing') this.hud.showControls(8000);
    });
    this.hud.actions = {
      use: (alt) => this._use(alt),
      journal: () => this.state === 'playing' && !this.modals.open && journal(this),
      hint: () => this.state === 'playing' && !this.modals.open && this.showHint(),
      pause: () => this.state === 'playing' && !this.modals.open && pauseMenu(this),
    };
    // Switching apps or locking the phone pauses (and saves) the game.
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && this.state === 'playing' && !this.modals.open) pauseMenu(this);
    });
    // Closing the tab or the desktop app (also when it restarts to update)
    // keeps where you were standing.
    window.addEventListener('pagehide', () => this.saveNow('quiet'));
    // Phones can suspend sound in the background; any touch wakes it again.
    document.addEventListener('pointerup', () => {
      if (this.audio.ctx && this.audio.ctx.state !== 'running') this.audio.init();
    });
    this.input.onLockChange((locked) => {
      if (this.state !== 'playing') return;
      if (!locked && !this.modals.open && this.input.wasLocked) pauseMenu(this);
      this.hud.setClickToLook(!locked && !this.modals.open && this.input.lockSupported() && !this.headless);
    });

    let saveT = null;
    this.gs.on('autosave', ({ reason }) => {
      clearTimeout(saveT);
      saveT = setTimeout(() => this.saveNow(reason), 200);
    });
    this.gs.on('solved', ({ puzzle }) => {
      this.audio.chime();
      this.keyAnimating.add(puzzle.id);
      this.pendingKeys.push(puzzle.id);
      this._updateKeysHud(false);
      this._flushKeys();
    });
    this.gs.on('door', ({ room }) => {
      this._updateKeysHud(false);
      if (room === 2) this.cats.startHiding(false);
      if (room === 4) this.cats.startEnding(false);
    });
    this.gs.on('digit', ({ digit }) => {
      this.audio.sparkle();
      setTimeout(() => this.toast(fill(UI.memoryTulip, { D: digit }), { ms: 5200 }), 300);
    });
    this.gs.on('room', ({ room, first }) => {
      if (first && (room <= 4 || room === ATTIC_ZONE)) this.hud.showBanner(room);
    });
  }

  // Keys spawn in the world only when no overlay hides them.
  _flushKeys() {
    if (this.modals.open) return;
    while (this.pendingKeys.length) {
      const id = this.pendingKeys.shift();
      const p = this.gs.puzzles[id];
      const room = this.rooms[p.room];
      const type = p.kind === 'A' ? 'gold' : 'silver';
      const spawn = room.keySpawn?.(id) || room.anchors[id] || this.camera.position.clone();
      const go = () =>
        this.keyfx.spawn(
          type,
          spawn.pos || spawn,
          () => {
            this.keyAnimating.delete(id);
            this._updateKeysHud(true);
            this.toast(fill(TOASTS.keyFound, { TYPE: type === 'gold' ? TOASTS.gold : TOASTS.silver }), { ms: 2400 });
          },
          { delay: spawn.delay || 0.35, from: spawn.from || null },
        );
      go();
    }
  }

  _updateKeysHud(animate) {
    const room = Math.min(this.zone, 5);
    if (room > 4) return this.hud.setKeys(-1);
    const vis = (type) => this.gs.hasKey(room, type) && !this.keyAnimating.has(this.gs.puzzleIdFor(room, type));
    this.hud.setKeys(room, { gold: vis('gold'), silver: vis('silver'), used: this.gs.isDoorOpen(room), animate });
  }

  onModalChange(open) {
    if (this.state !== 'playing') return;
    this.input.enabled = !open;
    this.hud.setPlaying(!open);
    if (open) {
      this.input.unlock();
      this.interact.setHover(null);
      this.hud.setClickToLook(false);
    } else {
      this.input.lock();
      this._flushKeys();
      this._updateKeysHud(false);
    }
  }

  _onKey(e) {
    if (this.state === 'menu') {
      this.modals.key(e);
      return;
    }
    if (this.state !== 'playing') return;
    if (this.modals.open) {
      this.modals.key(e);
      return;
    }
    switch (e.code) {
      case 'KeyE':
        this._use(false);
        break;
      case 'Tab':
        journal(this);
        break;
      case 'KeyH':
        this.showHint();
        break;
      case 'KeyM':
        this.toggleMute();
        break;
      case 'Escape':
        pauseMenu(this);
        break;
      default:
    }
  }

  _use(alt) {
    if (this.state !== 'playing' || this.modals.open) return;
    const item = this.interact.hover;
    if (item && item.onUse) item.onUse(alt);
  }

  // Touch: a tap uses whatever is under the finger (within reach).
  _tap(x, y) {
    if (this.state !== 'playing' || this.modals.open) return;
    const item = this.interact.pickAt(x, y);
    if (item && item.onUse) item.onUse(false);
  }

  // -------------------------------------------------------------- the frame
  // Keeps the frame rate smooth on modest GPUs: if frames get slow, render at a
  // slightly lower resolution; when there is headroom again, go back up.
  _adaptResolution(raw) {
    const p = this._perf || (this._perf = { t: 0, n: 0, max: this.renderer.getPixelRatio(), ratio: this.renderer.getPixelRatio() });
    p.t += raw;
    p.n++;
    if (p.t < 2) return;
    const avg = p.t / p.n;
    p.t = 0;
    p.n = 0;
    let next = p.ratio;
    const floor = LIGHT ? 0.5 : device.touch ? 0.6 : 0.75;
    // Already as low as it goes and still under ~30 fps twice in a row.
    p.slow = p.ratio <= floor && avg > 1 / 32 ? (p.slow || 0) + 1 : 0;
    if (p.slow >= 2) this._offerLight();
    if (avg > 1 / 45 && p.ratio > floor) next = Math.max(floor, p.ratio - 0.25);
    else if (avg < 1 / 58 && p.ratio < p.max) next = Math.min(p.max, p.ratio + 0.25);
    if (next !== p.ratio) {
      p.ratio = next;
      this.renderer.setPixelRatio(next);
    }
  }

  _frame() {
    const raw = this.clock.getDelta();
    const dt = Math.min(this.maxDt, raw);
    if (this.state === 'playing' && !this.headless) this._adaptResolution(Math.min(raw, 0.25));
    this.time += dt;
    if (this.state === 'playing') {
      if (!this.modals.open) this.player.update(dt);
      else this.player.apply();
      if (this.wakeT !== undefined) {
        this.wakeT += dt;
        const k = Math.min(1, Math.max(0, (this.wakeT - 0.6) / 2.2));
        this.player.eyeOffset = -0.75 * (1 - k * k * (3 - 2 * k));
        if (k >= 1) this.wakeT = undefined;
      }
      this.gs.data.playTime += dt;
      const z = zoneAt(this.player.pos.z);
      if (z !== this.zone) this._enterZone(z);
      this.interact.zone = this.zone;
      const hover = this.modals.open ? null : this.interact.update();
      const prompt = hover ? (typeof hover.prompt === 'function' ? hover.prompt() : hover.prompt) : null;
      this.hud.setPrompt(this.modals.open ? null : prompt, !!hover?.alt);
      if (device.touch) {
        const st = this.input.stick;
        this.hud.setStick(st && !this.modals.open ? { ox: st.ox, oy: st.oy, dx: st.x - st.ox, dy: st.y - st.oy } : null);
      }
    } else if (this.state === 'menu') {
      // Gentle idle sway behind the menu.
      this.camera.rotation.y = 0.72 + Math.sin(this.time * 0.15) * 0.08;
    }
    this.camera.updateMatrixWorld();
    this.camera.getWorldDirection(this._fwd);
    this.audio.setListener(this.camera.position, this._fwd);
    this.lights.update(dt);
    this.cats.update(dt, this.camera);
    for (const d of this.doors) d.update(dt);
    for (const fn of this.updaters) fn(dt, this.time);
    this.keyfx.update(dt);
    this.particles.update(dt);
    this._cull();
    this.renderer.render(this.scene, this.camera);
    if (this._check) this._checkPicture();
    if (this._probe) this._probeFrame();
  }

  // ?probe=1, one run of the graphics test (src/gfxtest.js): skip 20 frames,
  // time 60, then send the test page a small copy of the picture and stop.
  _probeFrame() {
    const p = this._probe;
    if (++p.frames > 20) p.times.push(performance.now());
    if (p.frames < 80) return;
    this._probe = null;
    const c = document.createElement('canvas');
    c.width = 320;
    c.height = 180;
    const g = c.getContext('2d');
    g.drawImage(this.renderer.domElement, 0, 0, 320, 180);
    const px = g.getImageData(0, 0, 320, 180).data;
    const mean = [0, 0, 0];
    for (let i = 0; i < px.length; i += 4) for (let k = 0; k < 3; k++) mean[k] += px[i + k] / (px.length / 4);
    const t = p.times;
    const gl = this.renderer.getContext();
    parent.postMessage(
      {
        gfxProbe: location.search,
        errors: probeErrors,
        white: pictureIsWhite(this.renderer),
        mean: mean.map(Math.round),
        fps: Math.round(((t.length - 1) * 1000) / (t[t.length - 1] - t[0])),
        image: c.toDataURL('image/jpeg', 0.8),
        size: [gl.drawingBufferWidth, gl.drawingBufferHeight],
        webgl2: this.renderer.capabilities.isWebGL2,
        antialias: gl.getContextAttributes().antialias,
        shadows: this.renderer.shadowMap.enabled,
        quality: QUALITY,
      },
      '*',
    );
    this.renderer.setAnimationLoop(null);
    // Give the drawing context back at once (browsers allow only a few).
    this._probeLost = true; // our own doing, not the driver's
    this.renderer.forceContextLoss();
  }

  _enterZone(z) {
    this.zone = z;
    this.lights.transition(this.rooms[Math.min(z, this.rooms.length - 1)].rig);
    this.audio.setTheme(z);
    this.gs.setRoom(z);
    this._updateKeysHud(false);
    this.hints.hide();
  }

  // Show the current room and its neighbours only. The attic stands apart:
  // it is shown only while you are in it, and hides the whole house.
  _cull() {
    const z = this.state === 'playing' ? this.zone : 0;
    this.roomGroups.forEach((g, i) => {
      if (!g) return;
      // Room i also owns the hallway north of it.
      if (i === ATTIC_ZONE || z === ATTIC_ZONE) g.visible = i === z;
      else g.visible = i >= z - 1 && i <= z + 1;
    });
  }

  // The attic ladder: a quick fade out, a few creaky rungs, and back in
  // somewhere else.
  travel(x, z, yaw) {
    if (this._traveling || this.state !== 'playing') return;
    this._traveling = true;
    this.input.enabled = false;
    this.interact.setHover(null);
    this.hud.setFade(true, true);
    for (let i = 0; i < 4; i++) setTimeout(() => this.audio.footstep('wood', true), 120 + i * 170);
    setTimeout(() => {
      this.player.place(x, z, yaw, 0);
      const zone = zoneAt(z);
      if (zone !== this.zone) this._enterZone(zone);
      this.lights.apply(this.rooms[zone].rig);
      this._cull();
      setTimeout(() => {
        this.hud.setFade(false, true);
        this.input.enabled = !this.modals.open;
        this._traveling = false;
      }, 150);
    }, 650);
  }

  roomBounds(i) {
    return ROOMS[i];
  }
}
