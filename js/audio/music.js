// Chiptune background music, generated from a seed.
//
// A lookahead scheduler queues notes ~150ms ahead of the audio clock, which is
// the only reliable way to get steady timing out of the browser. Each world
// passes a tempo/mode/seed and gets its own 8-bar loop: bass, arpeggio, melody
// and a soft noise beat.

import { mulberry32 } from '../core/utils.js';

const SCALES = {
  major: [0, 2, 4, 5, 7, 9, 11],
  minor: [0, 2, 3, 5, 7, 8, 10],
  lydian: [0, 2, 4, 6, 7, 9, 11],
  dorian: [0, 2, 3, 5, 7, 9, 10],
};

const midiToFreq = (m) => 440 * Math.pow(2, (m - 69) / 12);

export class Music {
  constructor(ctx, out) {
    this.ctx = ctx;
    this.out = out;
    this.timer = null;
    this.nextTime = 0;
    this.step = 0;
    this.pattern = null;
  }

  /** params: { tempo, mode, seed, root } */
  play(params = {}) {
    const key = JSON.stringify(params);
    if (this.playing === key) return;
    this.stop();
    this.playing = key;
    this.pattern = this._compose(params);
    this.step = 0;
    this.nextTime = this.ctx.currentTime + 0.08;
    this.timer = setInterval(() => this._schedule(), 40);
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this.playing = null;
  }

  _compose({ tempo = 108, mode = 'major', seed = 1, root = 57 }) {
    const rng = mulberry32(seed * 7919 + 13);
    const scale = SCALES[mode] || SCALES.major;
    const deg = (n) => {
      const oct = Math.floor(n / scale.length);
      return root + scale[((n % scale.length) + scale.length) % scale.length] + oct * 12;
    };

    const BARS = 8, PER_BAR = 8;
    const len = BARS * PER_BAR;
    // A simple, singable chord walk. I-V-vi-IV shapes read as "adventure" to kids.
    const roots = [0, 4, 5, 3, 0, 4, 5, 4];

    const bass = [], arp = [], mel = [], beat = [];
    for (let i = 0; i < len; i++) {
      const bar = Math.floor(i / PER_BAR);
      const inBar = i % PER_BAR;
      const chord = roots[bar % roots.length];

      bass.push(inBar % 2 === 0 ? deg(chord) - 12 : null);
      arp.push(deg(chord + [0, 2, 4, 2][inBar % 4]));

      // Melody: a seeded phrase in bars 1-2, repeated with variation later.
      let m = null;
      if (rng() < 0.62) {
        const jump = [0, 2, 4, 5, 7][Math.floor(rng() * 5)];
        m = deg(chord + jump) + 12;
      }
      mel.push(m);
      beat.push(inBar % 4 === 0 ? 'kick' : inBar % 4 === 2 ? 'hat' : rng() < 0.2 ? 'hat' : null);
    }
    return { bass, arp, mel, beat, spb: 60 / tempo / 2, len };
  }

  _schedule() {
    const AHEAD = 0.15;
    while (this.nextTime < this.ctx.currentTime + AHEAD) {
      this._playStep(this.step % this.pattern.len, this.nextTime);
      this.nextTime += this.pattern.spb;
      this.step++;
    }
  }

  _voice(freq, t, dur, type, gain) {
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g);
    g.connect(this.out);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  _drum(kind, t) {
    if (kind === 'kick') {
      const o = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      o.type = 'sine';
      o.frequency.setValueAtTime(140, t);
      o.frequency.exponentialRampToValueAtTime(48, t + 0.12);
      g.gain.setValueAtTime(0.18, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.14);
      o.connect(g); g.connect(this.out);
      o.start(t); o.stop(t + 0.16);
    } else {
      const n = Math.floor(this.ctx.sampleRate * 0.04);
      const buf = this.ctx.createBuffer(1, n, this.ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
      const src = this.ctx.createBufferSource();
      src.buffer = buf;
      const f = this.ctx.createBiquadFilter();
      f.type = 'highpass'; f.frequency.value = 6000;
      const g = this.ctx.createGain();
      g.gain.value = 0.05;
      src.connect(f); f.connect(g); g.connect(this.out);
      src.start(t);
    }
  }

  _playStep(i, t) {
    const p = this.pattern;
    const d = p.spb;
    if (p.bass[i] != null) this._voice(midiToFreq(p.bass[i]), t, d * 1.6, 'triangle', 0.13);
    this._voice(midiToFreq(p.arp[i]), t, d * 0.8, 'square', 0.045);
    if (p.mel[i] != null) this._voice(midiToFreq(p.mel[i]), t, d * 1.1, 'square', 0.062);
    if (p.beat[i]) this._drum(p.beat[i], t);
  }
}
