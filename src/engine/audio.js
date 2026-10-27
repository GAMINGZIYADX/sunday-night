// Everything you hear is synthesised here with WebAudio: no audio files.
// The context is only created after the first click (browser autoplay rules).

const NOTE = (n) => 440 * Math.pow(2, (n - 69) / 12); // MIDI -> Hz

// Per-room music themes: key (MIDI root), tempo, chord progression (scale
// degrees), arpeggio pattern and register. Gentle variations on one idea.
const THEMES = [
  { root: 60, bpm: 66, prog: [0, 5, 3, 4], arp: [0, 2, 4, 2], lift: 12, density: 0.55 }, // bedroom, C
  { root: 65, bpm: 70, prog: [0, 3, 5, 4], arp: [0, 4, 2, 4], lift: 12, density: 0.6 }, // living, F
  { root: 67, bpm: 74, prog: [0, 4, 5, 3], arp: [0, 2, 4, 7], lift: 12, density: 0.65 }, // kitchen, G
  { root: 57, bpm: 62, prog: [0, 5, 3, 6], arp: [0, 4, 2, 0], lift: 12, density: 0.5, minor: true }, // study, A minor
  { root: 63, bpm: 58, prog: [0, 3, 0, 4], arp: [0, 4, 7, 4], lift: 24, density: 0.5 }, // garden, Eb
  { root: 63, bpm: 52, prog: [0, 5, 3, 4], arp: [0, 4, 7, 9], lift: 24, density: 0.42 }, // ending
  { root: 62, bpm: 56, prog: [0, 3, 5, 4], arp: [0, 2, 4, 2], lift: 12, density: 0.4 }, // attic, D
];
const MAJOR = [0, 2, 4, 5, 7, 9, 11];
const MINOR = [0, 2, 3, 5, 7, 8, 10];
const PENTA = [0, 2, 4, 7, 9];
const PENTA_MIN = [0, 3, 5, 7, 10];

export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.volumes = { master: 0.8, music: 0.6, sfx: 0.8 };
    this.muted = false;
    this.theme = 0;
    this.pendingTheme = 0;
    this._timer = null;
  }

  get ready() {
    return !!this.ctx;
  }

  // Call from a user gesture.
  init() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    try {
      this.ctx = new AC();
    } catch {
      this.ctx = null;
      return;
    }
    const c = this.ctx;
    this.master = c.createGain();
    const comp = c.createDynamicsCompressor();
    comp.threshold.value = -14;
    comp.ratio.value = 3;
    this.master.connect(comp).connect(c.destination);
    this.musicBus = c.createGain();
    this.sfxBus = c.createGain();
    this.musicBus.connect(this.master);
    this.sfxBus.connect(this.master);
    // Soft room reverb shared by music and some effects.
    this.reverb = c.createConvolver();
    this.reverb.buffer = this._impulse(2.6, 2.4);
    this.reverbSend = c.createGain();
    this.reverbSend.gain.value = 0.9;
    this.reverbSend.connect(this.reverb).connect(this.master);
    // Wet sends per bus, so the reverb follows the music/sfx sliders.
    this.musicWet = c.createGain();
    this.sfxWet = c.createGain();
    this.musicWet.connect(this.reverbSend);
    this.sfxWet.connect(this.reverbSend);
    this.noiseBuf = this._noise(1.5);
    this.applyVolumes();
    this._startMusic();
  }

  setVolumes(v) {
    Object.assign(this.volumes, v);
    this.applyVolumes();
  }
  setMuted(m) {
    this.muted = m;
    this.applyVolumes();
  }
  toggleMute() {
    this.setMuted(!this.muted);
    return this.muted;
  }
  applyVolumes() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const m = this.muted ? 0 : this.volumes.master;
    this.master.gain.setTargetAtTime(m, t, 0.05);
    this.musicBus.gain.setTargetAtTime(this.volumes.music * 0.55, t, 0.1);
    this.sfxBus.gain.setTargetAtTime(this.volumes.sfx, t, 0.05);
    this.musicWet.gain.setTargetAtTime(this.volumes.music * 0.55, t, 0.1);
    this.sfxWet.gain.setTargetAtTime(this.volumes.sfx, t, 0.05);
  }

  setListener(pos, forward) {
    if (!this.ctx) return;
    const l = this.ctx.listener;
    const t = this.ctx.currentTime;
    if (l.positionX) {
      l.positionX.setTargetAtTime(pos.x, t, 0.02);
      l.positionY.setTargetAtTime(pos.y, t, 0.02);
      l.positionZ.setTargetAtTime(pos.z, t, 0.02);
      l.forwardX.setTargetAtTime(forward.x, t, 0.02);
      l.forwardY.setTargetAtTime(forward.y, t, 0.02);
      l.forwardZ.setTargetAtTime(forward.z, t, 0.02);
      l.upX.value = 0;
      l.upY.value = 1;
      l.upZ.value = 0;
    } else if (l.setPosition) {
      l.setPosition(pos.x, pos.y, pos.z);
      l.setOrientation(forward.x, forward.y, forward.z, 0, 1, 0);
    }
  }

  // ---------------------------------------------------------------- helpers
  _noise(seconds) {
    const c = this.ctx;
    const b = c.createBuffer(1, Math.floor(c.sampleRate * seconds), c.sampleRate);
    const d = b.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return b;
  }
  _impulse(seconds, decay) {
    const c = this.ctx;
    const len = Math.floor(c.sampleRate * seconds);
    const b = c.createBuffer(2, len, c.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = b.getChannelData(ch);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
    }
    return b;
  }
  _out(bus = 'sfx', reverb = 0) {
    const g = this.ctx.createGain();
    g.connect(bus === 'music' ? this.musicBus : this.sfxBus);
    if (reverb > 0) {
      const s = this.ctx.createGain();
      s.gain.value = reverb;
      g.connect(s).connect(bus === 'music' ? this.musicWet : this.sfxWet);
    }
    return g;
  }
  // Positional output (HRTF panning + distance falloff).
  _spatial(pos, ref = 1.2) {
    const p = this.ctx.createPanner();
    p.panningModel = 'HRTF';
    p.distanceModel = 'inverse';
    p.refDistance = ref;
    p.rolloffFactor = 1.4;
    p.maxDistance = 30;
    if (p.positionX) {
      p.positionX.value = pos.x;
      p.positionY.value = pos.y;
      p.positionZ.value = pos.z;
    } else p.setPosition(pos.x, pos.y, pos.z);
    p.connect(this.sfxBus);
    return p;
  }
  _noiseBurst(dest, t, dur, { type = 'lowpass', freq = 800, q = 0.8, gain = 0.3, freqEnd = null, attack = 0.004 }) {
    const c = this.ctx;
    const src = c.createBufferSource();
    src.buffer = this.noiseBuf;
    src.loop = dur > 0.6; // long bursts would run off the end of the noise
    const f = c.createBiquadFilter();
    f.type = type;
    f.frequency.setValueAtTime(freq, t);
    if (freqEnd) f.frequency.exponentialRampToValueAtTime(freqEnd, t + dur);
    f.Q.value = q;
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f).connect(g).connect(dest);
    src.start(t, Math.random() * 0.8);
    src.stop(t + dur + 0.05);
  }
  _tone(dest, t, freq, dur, { type = 'sine', gain = 0.2, attack = 0.004, freqEnd = null } = {}) {
    const c = this.ctx;
    const o = c.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (freqEnd) o.frequency.exponentialRampToValueAtTime(freqEnd, t + dur);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(dest);
    o.start(t);
    o.stop(t + dur + 0.05);
  }
  // One music-box tine: bright attack, slightly inharmonic partials, long decay.
  _tine(dest, t, freq, vel = 1, dur = 2.2) {
    this._tone(dest, t, freq, dur, { gain: 0.16 * vel, attack: 0.003 });
    this._tone(dest, t, freq * 2.0, dur * 0.55, { gain: 0.05 * vel, attack: 0.002 });
    this._tone(dest, t, freq * 4.07, dur * 0.25, { gain: 0.018 * vel, attack: 0.001 });
    this._tone(dest, t, freq * 6.2, 0.06, { gain: 0.012 * vel, attack: 0.001 });
  }

  // ------------------------------------------------------------------ music
  setTheme(i) {
    this.pendingTheme = Math.max(0, Math.min(THEMES.length - 1, i));
  }

  _startMusic() {
    this._bus = this._out('music', 0.55);
    this._lp = this.ctx.createBiquadFilter();
    this._lp.type = 'lowpass';
    this._lp.frequency.value = 5200;
    this._lp.connect(this._bus);
    this._step = 0;
    this._bar = 0;
    this._nextTime = this.ctx.currentTime + 0.3;
    this._phrase = null;
    this._timer = setInterval(() => this._schedule(), 90);
  }

  _makePhrase(th) {
    // A 4-bar melody of eighth notes with rests, built on a pentatonic scale.
    const scale = th.minor ? PENTA_MIN : PENTA;
    const notes = [];
    let idx = 2 + Math.floor(Math.random() * 3);
    for (let i = 0; i < 32; i++) {
      if (Math.random() > th.density || i % 8 === 7) {
        notes.push(null);
        continue;
      }
      idx += [-2, -1, -1, 0, 1, 1, 2][Math.floor(Math.random() * 7)];
      idx = Math.max(0, Math.min(9, idx));
      const oct = Math.floor(idx / 5);
      notes.push(scale[idx % 5] + oct * 12);
    }
    return notes;
  }

  _schedule() {
    const c = this.ctx;
    if (!c || c.state !== 'running') return;
    while (this._nextTime < c.currentTime + 0.25) {
      // Themes change on bar lines so transitions stay musical.
      if (this._step % 8 === 0 && this.pendingTheme !== this.theme) {
        this.theme = this.pendingTheme;
        this._phrase = null;
        this._bar = 0;
      }
      const th = THEMES[this.theme];
      if (!this._phrase || (this._step % 32 === 0 && this._bar % 8 === 0 && this._step > 0)) this._phrase = this._makePhrase(th);
      const eighth = 60 / th.bpm / 2;
      const t = this._nextTime;
      const barInPhrase = Math.floor((this._step % 32) / 8);
      const scale = th.minor ? MINOR : MAJOR;
      const deg = th.prog[(this._bar + barInPhrase) % th.prog.length] ?? 0;
      const chordRoot = th.root + scale[deg % 7] + (deg >= 7 ? 12 : 0) - 12;
      const third = th.root + scale[(deg + 2) % 7] - 12 + (deg + 2 >= 7 ? 12 : 0);
      const fifth = th.root + scale[(deg + 4) % 7] - 12 + (deg + 4 >= 7 ? 12 : 0);
      const chord = [chordRoot, third, fifth, chordRoot + 12];

      // Arpeggio on quarter notes, low and soft.
      if (this._step % 2 === 0) {
        const a = th.arp[(this._step / 2) % th.arp.length];
        const n = a >= 7 ? chord[3] + (a - 7) : chord[[0, 0, 1, 1, 2][a] ?? 0];
        this._tine(this._lp, t, NOTE(n), 0.55, 2.4);
      }
      // Melody.
      const m = this._phrase[this._step % 32];
      if (m !== null && m !== undefined) {
        const swing = this._step % 2 ? eighth * 0.08 : 0;
        this._tine(this._lp, t + swing, NOTE(th.root + th.lift - 12 + m), 0.8 + Math.random() * 0.2, 2.6);
      }
      // A soft low pad note at each bar start.
      if (this._step % 8 === 0) this._pad(t, NOTE(chordRoot - 12), eighth * 8);

      this._step++;
      if (this._step % 32 === 0) this._bar += 4;
      this._nextTime += eighth;
    }
  }

  _pad(t, freq, dur) {
    const c = this.ctx;
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.035, t + dur * 0.4);
    g.gain.linearRampToValueAtTime(0.0001, t + dur * 1.05);
    const f = c.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = 520;
    for (const d of [-4, 4]) {
      const o = c.createOscillator();
      o.type = 'triangle';
      o.frequency.value = freq;
      o.detune.value = d;
      o.connect(f);
      o.start(t);
      o.stop(t + dur * 1.1);
    }
    f.connect(g).connect(this._bus);
  }

  // A rising music-box swell for the letter.
  swell() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + 0.05;
    const out = this._out('music', 0.8);
    out.gain.value = 1.2;
    const notes = [63, 67, 70, 74, 75, 79, 82, 86];
    notes.forEach((n, i) => this._tine(out, t + i * 0.32, NOTE(n), 0.55 + i * 0.05, 3.2));
    this._pad(t, NOTE(51), 6);
    this._pad(t + 0.1, NOTE(58), 6);
  }

  // ---------------------------------------------------------------- effects
  footstep(surface = 'wood', soft = false) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const out = this._out('sfx');
    const v = soft ? 0.5 : 1;
    if (surface === 'grass') {
      this._noiseBurst(out, t, 0.12, { type: 'bandpass', freq: 2400 + Math.random() * 800, q: 0.7, gain: 0.05 * v, attack: 0.02 });
      this._noiseBurst(out, t + 0.03, 0.08, { type: 'highpass', freq: 4000, q: 0.5, gain: 0.02 * v });
    } else {
      this._noiseBurst(out, t, 0.07, { type: 'lowpass', freq: 520 + Math.random() * 160, q: 1.2, gain: 0.16 * v });
      this._tone(out, t, 85 + Math.random() * 15, 0.08, { gain: 0.08 * v, freqEnd: 55 });
    }
  }

  keyJingle() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const out = this._out('sfx', 0.4);
    for (let i = 0; i < 8; i++) {
      const tt = t + i * 0.05 + Math.random() * 0.03;
      this._tone(out, tt, 2800 + Math.random() * 2600, 0.18, { gain: 0.05, attack: 0.001 });
      this._tone(out, tt, 5200 + Math.random() * 1800, 0.08, { gain: 0.025, attack: 0.001 });
    }
    // And a little sparkle arpeggio.
    [84, 88, 91, 96].forEach((n, i) => this._tine(out, t + 0.35 + i * 0.08, NOTE(n), 0.5, 1.2));
  }

  keyTurn() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const out = this._out('sfx', 0.2);
    this._noiseBurst(out, t, 0.05, { type: 'highpass', freq: 2500, q: 1, gain: 0.18 });
    this._tone(out, t + 0.12, 2100, 0.12, { gain: 0.05, attack: 0.001 });
    this._noiseBurst(out, t + 0.16, 0.06, { type: 'bandpass', freq: 1400, q: 3, gain: 0.25 });
    this._tone(out, t + 0.16, 160, 0.12, { gain: 0.12, freqEnd: 90 });
  }

  doorOpen() {
    if (!this.ctx) return;
    const c = this.ctx;
    const t = c.currentTime;
    const out = this._out('sfx', 0.3);
    // Creak: a sawtooth whose amplitude is chopped (stick-slip friction).
    const o = c.createOscillator();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(110, t);
    o.frequency.linearRampToValueAtTime(150, t + 0.6);
    o.frequency.linearRampToValueAtTime(95, t + 1.3);
    const am = c.createGain();
    am.gain.value = 0;
    const lfo = c.createOscillator();
    lfo.type = 'square';
    lfo.frequency.setValueAtTime(26, t);
    lfo.frequency.linearRampToValueAtTime(18, t + 1.3);
    const lfoG = c.createGain();
    lfoG.gain.value = 0.5;
    lfo.connect(lfoG).connect(am.gain);
    const bp = c.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 900;
    bp.Q.value = 2.5;
    const env = c.createGain();
    env.gain.setValueAtTime(0.0001, t);
    env.gain.exponentialRampToValueAtTime(0.06, t + 0.15);
    env.gain.exponentialRampToValueAtTime(0.0001, t + 1.4);
    o.connect(am).connect(bp).connect(env).connect(out);
    o.start(t);
    lfo.start(t);
    o.stop(t + 1.5);
    lfo.stop(t + 1.5);
    this._noiseBurst(out, t + 1.2, 0.3, { type: 'lowpass', freq: 300, q: 0.6, gain: 0.05, attack: 0.05 });
  }

  chime() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const out = this._out('sfx', 0.7);
    [72, 76, 79, 84, 88].forEach((n, i) => this._tine(out, t + i * 0.09, NOTE(n), 0.9, 2.4));
  }

  smallChime(step = 0) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const out = this._out('sfx', 0.5);
    const scale = [72, 74, 76, 79, 81, 84, 86, 88, 91, 93, 96, 98];
    this._tine(out, t, NOTE(scale[step % scale.length]), 0.7, 1.6);
  }

  // One note of the attic's old piano: k is a white key, 0 (C) to 6 (B).
  pianoNote(k) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const out = this._out('sfx', 0.45);
    const f = NOTE(60 + [0, 2, 4, 5, 7, 9, 11][k]);
    this._tone(out, t, f, 1.7, { type: 'triangle', gain: 0.17, attack: 0.004 });
    this._tone(out, t, f * 2, 0.9, { gain: 0.05, attack: 0.003 });
    this._tone(out, t, f * 3.01, 0.35, { gain: 0.022, attack: 0.002 });
    this._noiseBurst(out, t, 0.035, { type: 'bandpass', freq: 2600, q: 1.2, gain: 0.025 }); // the hammer
  }

  click() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const out = this._out('sfx');
    this._noiseBurst(out, t, 0.03, { type: 'bandpass', freq: 2200, q: 2, gain: 0.12 });
  }

  soft() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const out = this._out('sfx', 0.3);
    this._tone(out, t, 520, 0.25, { gain: 0.06, freqEnd: 380 });
  }

  slide() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const out = this._out('sfx');
    this._noiseBurst(out, t, 0.12, { type: 'bandpass', freq: 1200, q: 1.5, gain: 0.08, freqEnd: 700, attack: 0.01 });
    this._tone(out, t + 0.1, 240, 0.06, { gain: 0.06 });
  }

  pageFlip() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const out = this._out('sfx', 0.2);
    this._noiseBurst(out, t, 0.28, { type: 'bandpass', freq: 3200, q: 0.8, gain: 0.09, freqEnd: 700, attack: 0.03 });
    this._noiseBurst(out, t + 0.18, 0.12, { type: 'highpass', freq: 2000, q: 0.5, gain: 0.04 });
  }

  sparkle() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const out = this._out('sfx', 0.6);
    for (let i = 0; i < 6; i++) this._tone(out, t + i * 0.06, 3000 + Math.random() * 3000, 0.3, { gain: 0.03, attack: 0.001 });
  }

  // Cat meow. pitch: per-cat multiplier. pos: optional {x,y,z} for 3D sound.
  meow(pitch = 1, pos = null, loud = 1) {
    if (!this.ctx) return;
    const c = this.ctx;
    const t = c.currentTime + 0.01;
    const p = pitch * (0.94 + Math.random() * 0.12);
    const dur = 0.45 + Math.random() * 0.25;
    const dest = pos ? this._spatial(pos) : this._out('sfx', 0.2);
    const o = c.createOscillator();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(520 * p, t);
    o.frequency.linearRampToValueAtTime(760 * p, t + dur * 0.35);
    o.frequency.linearRampToValueAtTime(600 * p, t + dur * 0.7);
    o.frequency.linearRampToValueAtTime(430 * p, t + dur);
    const vib = c.createOscillator();
    vib.frequency.value = 7;
    const vibG = c.createGain();
    vibG.gain.value = 9 * p;
    vib.connect(vibG).connect(o.frequency);
    // Two moving formants: "mee" -> "ow".
    const f1 = c.createBiquadFilter();
    f1.type = 'bandpass';
    f1.Q.value = 5;
    f1.frequency.setValueAtTime(1400 * p, t);
    f1.frequency.linearRampToValueAtTime(900 * p, t + dur);
    const f2 = c.createBiquadFilter();
    f2.type = 'bandpass';
    f2.Q.value = 7;
    f2.frequency.setValueAtTime(2900 * p, t);
    f2.frequency.linearRampToValueAtTime(1500 * p, t + dur);
    const mix = c.createGain();
    const g2 = c.createGain();
    g2.gain.value = 0.55;
    const env = c.createGain();
    env.gain.setValueAtTime(0.0001, t);
    env.gain.exponentialRampToValueAtTime(0.55 * loud, t + 0.06);
    env.gain.setValueAtTime(0.5 * loud, t + dur * 0.6);
    env.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(f1).connect(mix);
    o.connect(f2).connect(g2).connect(mix);
    mix.connect(env).connect(dest);
    o.start(t);
    vib.start(t);
    o.stop(t + dur + 0.05);
    vib.stop(t + dur + 0.05);
  }

  purr(pos) {
    if (!this.ctx) return;
    const c = this.ctx;
    const t = c.currentTime;
    const dest = pos ? this._spatial(pos, 0.6) : this._out('sfx');
    const src = c.createBufferSource();
    src.buffer = this.noiseBuf;
    const lp = c.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 220;
    const am = c.createGain();
    am.gain.value = 0;
    const lfo = c.createOscillator();
    lfo.frequency.value = 24;
    const lfoG = c.createGain();
    lfoG.gain.value = 0.5;
    lfo.connect(lfoG).connect(am.gain);
    const env = c.createGain();
    env.gain.setValueAtTime(0.0001, t);
    env.gain.exponentialRampToValueAtTime(0.5, t + 0.3);
    env.gain.exponentialRampToValueAtTime(0.0001, t + 1.6);
    src.connect(lp).connect(am).connect(env).connect(dest);
    src.start(t);
    lfo.start(t);
    src.stop(t + 1.7);
    lfo.stop(t + 1.7);
  }

  // --------------------------------------------- the things to fiddle with
  // The bedroom music box: a short, slow tune on tines. Returns its length.
  musicBox(pos) {
    if (!this.ctx) return 0;
    const t = this.ctx.currentTime + 0.05;
    const dest = pos ? this._spatial(pos, 1.0) : this._out('sfx', 0.6);
    // A little original lullaby (MIDI notes, null = rest), in quarter beats.
    const tune = [76, 79, 84, 83, 79, 76, null, 74, 76, 79, 77, 74, 72, null, 72, 76, 79, 84, 86, 84, 79, 76, 77, 74, 72];
    const beat = 0.34;
    tune.forEach((n, k) => {
      if (n === null) return;
      // The spring winds down: the last notes slow a little.
      const slow = Math.max(0, k - 18) * 0.035;
      this._tine(dest, t + k * beat + slow * k * 0.2, NOTE(n + 12), 0.75, 2.2);
    });
    return tune.length * beat + 1;
  }

  // Kettle: a rumble, then a whistle that rises in pitch.
  kettle(pos, whistleAt = 2.2, length = 2.6) {
    if (!this.ctx) return;
    const c = this.ctx;
    const t = c.currentTime;
    const dest = pos ? this._spatial(pos, 1.2) : this._out('sfx');
    this._noiseBurst(dest, t, whistleAt + 0.4, { type: 'lowpass', freq: 300, q: 0.7, gain: 0.08, attack: 1.2 });
    const o = c.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(1500, t + whistleAt);
    o.frequency.exponentialRampToValueAtTime(2300, t + whistleAt + length * 0.6);
    const vib = c.createOscillator();
    vib.frequency.value = 7;
    const vg = c.createGain();
    vg.gain.value = 18;
    vib.connect(vg).connect(o.frequency);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t + whistleAt);
    g.gain.exponentialRampToValueAtTime(0.05, t + whistleAt + 0.5);
    g.gain.setValueAtTime(0.05, t + whistleAt + length - 0.5);
    g.gain.exponentialRampToValueAtTime(0.0001, t + whistleAt + length);
    o.connect(g).connect(dest);
    o.start(t + whistleAt);
    vib.start(t + whistleAt);
    o.stop(t + whistleAt + length + 0.1);
    vib.stop(t + whistleAt + length + 0.1);
    this._noiseBurst(dest, t + whistleAt, length, { type: 'highpass', freq: 3500, q: 0.4, gain: 0.025, attack: 0.4 });
  }

  // The fire, poked: a handful of crackles and a soft whoosh.
  crackle(pos) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const dest = pos ? this._spatial(pos, 1.2) : this._out('sfx');
    this._noiseBurst(dest, t, 0.6, { type: 'lowpass', freq: 600, q: 0.5, gain: 0.12, attack: 0.05, freqEnd: 250 });
    for (let i = 0; i < 9; i++)
      this._noiseBurst(dest, t + 0.05 + Math.random() * 1.2, 0.025 + Math.random() * 0.03, {
        type: 'bandpass',
        freq: 1500 + Math.random() * 2500,
        q: 1.5,
        gain: 0.08 + Math.random() * 0.08,
      });
  }

  // An open window: crickets and a soft breeze, until it is closed.
  outside(on, pos) {
    if (!this.ctx) return;
    clearInterval(this._outsideT);
    if (this._breeze) {
      const b = this._breeze;
      b.g.gain.setTargetAtTime(0.0001, this.ctx.currentTime, 0.3);
      setTimeout(() => b.src.stop(), 1500);
      this._breeze = null;
    }
    if (!on) return;
    const c = this.ctx;
    const dest = pos ? this._spatial(pos, 1.5) : this._out('sfx');
    const src = c.createBufferSource();
    src.buffer = this.noiseBuf;
    src.loop = true;
    const f = c.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = 420;
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, c.currentTime);
    g.gain.setTargetAtTime(0.05, c.currentTime, 0.6);
    src.connect(f).connect(g).connect(dest);
    src.start();
    this._breeze = { src, g };
    const chirp = () => {
      const t = c.currentTime;
      const n = 2 + Math.floor(Math.random() * 3);
      const f0 = 4200 + Math.random() * 600;
      for (let i = 0; i < n; i++) this._tone(dest, t + i * 0.07, f0, 0.045, { gain: 0.02, attack: 0.004 });
    };
    this._outsideT = setInterval(() => Math.random() < 0.7 && chirp(), 420);
  }
}
