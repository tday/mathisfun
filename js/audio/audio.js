// All sound is synthesised at runtime — no audio files to host or download.
//
// Mobile browsers only allow audio inside a user gesture, so the context is
// created lazily on the first pointerdown and nudged with a silent buffer
// (iOS needs an actual source to start before it considers itself unlocked).

import { Music } from './music.js';

export class GameAudio {
  constructor(settings) {
    this.settings = settings;
    this.ctx = null;
    this.ready = false;
    this.music = null;
    // Scenes ask for their theme in enter(), which for the title screen happens
    // before any gesture has unlocked audio. Remember the request so unlock()
    // can honour it instead of silently dropping the music.
    this.wantedTheme = null;
  }

  /** Safe to call on every gesture; only the first one does any work. */
  unlock() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    try {
      this.ctx = new AC();
    } catch {
      return;
    }

    this.master = this.ctx.createGain();
    this.master.gain.value = this.settings.muted ? 0 : 1;
    this.master.connect(this.ctx.destination);

    this.sfxGain = this.ctx.createGain();
    this.sfxGain.gain.value = this.settings.sfx ?? 0.9;
    this.sfxGain.connect(this.master);

    this.musicGain = this.ctx.createGain();
    this.musicGain.gain.value = this.settings.music ?? 0.55;
    this.musicGain.connect(this.master);

    // iOS unlock: start (and immediately end) a real source inside the gesture.
    const buf = this.ctx.createBuffer(1, 1, 22050);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    src.connect(this.ctx.destination);
    src.start(0);

    if (this.ctx.state === 'suspended') this.ctx.resume();
    this.music = new Music(this.ctx, this.musicGain);
    this.ready = true;
    if (this.wantedTheme) this.music.play(this.wantedTheme);
  }

  setSuspended(hidden) {
    if (!this.ctx) return;
    if (hidden) {
      this.ctx.suspend?.();
    } else {
      this.ctx.resume?.();
      // The scheduler's clock kept running while we were suspended; without a
      // resync it fires every missed note at once on return.
      this.music?.resync();
    }
  }

  setMuted(m) {
    this.settings.muted = m;
    if (this.master) this.master.gain.value = m ? 0 : 1;
  }

  setMusicVolume(v) {
    this.settings.music = v;
    if (this.musicGain) this.musicGain.gain.value = v;
  }

  setSfxVolume(v) {
    this.settings.sfx = v;
    if (this.sfxGain) this.sfxGain.gain.value = v;
  }

  playTheme(params) {
    this.wantedTheme = params;
    this.music?.play(params);
  }

  stopTheme() {
    this.wantedTheme = null;
    this.music?.stop();
  }

  // ------------------------------------------------------------------ helpers

  _now() { return this.ctx.currentTime; }

  /** One shaped oscillator note. */
  _tone(freq, t0, dur, { type = 'square', gain = 0.2, glide = 0, attack = 0.008 } = {}) {
    if (!this.ready) return;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t0);
    if (glide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq * glide), t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain, t0 + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g);
    g.connect(this.sfxGain);
    o.start(t0);
    o.stop(t0 + dur + 0.02);
  }

  /** Filtered white noise, for poofs and thumps. */
  _noise(t0, dur, { gain = 0.15, freq = 1200, q = 1, type = 'bandpass' } = {}) {
    if (!this.ready) return;
    const n = Math.max(1, Math.floor(this.ctx.sampleRate * dur));
    const buf = this.ctx.createBuffer(1, n, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const f = this.ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    f.Q.value = q;
    const g = this.ctx.createGain();
    g.gain.value = gain;
    src.connect(f); f.connect(g); g.connect(this.sfxGain);
    src.start(t0);
  }

  // --------------------------------------------------------------------- SFX

  tap() {
    if (!this.ready) return;
    this._tone(660, this._now(), 0.07, { type: 'triangle', gain: 0.12 });
  }

  /** Rising arpeggio — unmistakably "yes!". */
  correct() {
    if (!this.ready) return;
    const t = this._now();
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => {
      this._tone(f, t + i * 0.065, 0.19, { type: 'square', gain: 0.16 });
      this._tone(f * 2, t + i * 0.065, 0.12, { type: 'triangle', gain: 0.06 });
    });
  }

  /**
   * "Not yet" — deliberately soft and warm. Two gently descending sine notes,
   * never a buzzer: a wrong answer is information, not a punishment.
   */
  wrong() {
    if (!this.ready) return;
    const t = this._now();
    this._tone(392, t, 0.16, { type: 'sine', gain: 0.16 });
    this._tone(329.63, t + 0.13, 0.24, { type: 'sine', gain: 0.14 });
  }

  coin(pitch = 0) {
    if (!this.ready) return;
    const t = this._now();
    const base = 988 * Math.pow(1.0595, Math.min(pitch, 8));
    this._tone(base, t, 0.06, { type: 'square', gain: 0.1 });
    this._tone(base * 1.5, t + 0.05, 0.13, { type: 'square', gain: 0.1 });
  }

  poof() {
    if (!this.ready) return;
    const t = this._now();
    this._noise(t, 0.22, { gain: 0.16, freq: 900, q: 0.8 });
    this._tone(520, t, 0.16, { type: 'triangle', gain: 0.1, glide: 0.4 });
  }

  shoot() {
    if (!this.ready) return;
    this._tone(880, this._now(), 0.11, { type: 'sawtooth', gain: 0.09, glide: 2.2 });
  }

  /** The gate takes a hit — a soft wooden thud, not an alarm. */
  thud() {
    if (!this.ready) return;
    const t = this._now();
    this._noise(t, 0.2, { gain: 0.2, freq: 180, q: 0.7, type: 'lowpass' });
    this._tone(110, t, 0.22, { type: 'sine', gain: 0.2, glide: 0.6 });
  }

  fanfare() {
    if (!this.ready) return;
    const t = this._now();
    const notes = [523.25, 659.25, 783.99, 1046.5, 783.99, 1046.5, 1318.5];
    notes.forEach((f, i) => {
      const at = t + i * 0.11;
      this._tone(f, at, 0.3, { type: 'square', gain: 0.15 });
      this._tone(f / 2, at, 0.3, { type: 'triangle', gain: 0.09 });
    });
  }

  /** Gentle "let's try again" cadence for a lost stage — soft, never a fail buzz. */
  softEnd() {
    if (!this.ready) return;
    const t = this._now();
    [523.25, 466.16, 392].forEach((f, i) => {
      this._tone(f, t + i * 0.16, 0.4, { type: 'sine', gain: 0.15 });
    });
  }

  bossRoar() {
    if (!this.ready) return;
    const t = this._now();
    this._tone(90, t, 0.8, { type: 'sawtooth', gain: 0.22, glide: 0.55 });
    this._noise(t, 0.7, { gain: 0.14, freq: 320, q: 0.6, type: 'lowpass' });
  }

  capsule() {
    if (!this.ready) return;
    const t = this._now();
    this._noise(t, 0.12, { gain: 0.12, freq: 2400, q: 2 });
    [784, 988, 1319].forEach((f, i) => this._tone(f, t + 0.12 + i * 0.08, 0.2, { type: 'triangle', gain: 0.14 }));
  }

  heartLost() {
    if (!this.ready) return;
    const t = this._now();
    this._tone(300, t, 0.3, { type: 'sine', gain: 0.16, glide: 0.6 });
  }

  levelUp() {
    if (!this.ready) return;
    const t = this._now();
    [392, 523.25, 659.25, 880].forEach((f, i) =>
      this._tone(f, t + i * 0.08, 0.28, { type: 'triangle', gain: 0.15 }));
  }
}
