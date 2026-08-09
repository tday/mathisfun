// Lookahead chiptune sequencer: per-world tempo/mode/seed -> an 8-bar loop
// from square lead + triangle bass + noise hats. Nothing is sampled.

import { actx, musicGain, audioReady } from './audio.js';
import { rng } from '../core/utils.js';

const LOOKAHEAD = 0.25;   // seconds scheduled ahead
const TICK = 90;          // ms between scheduler runs

// chord roots in semitones per 2 bars, then repeat pattern
const PROG_MAJOR = [0, 9, 5, 7];   // C  Am F  G
const PROG_MINOR = [0, 8, 3, 10];  // Cm Ab Eb Bb
const SCALE_MAJOR = [0, 2, 4, 7, 9];
const SCALE_MINOR = [0, 3, 5, 7, 10];

const F = (semi, oct = 0) => 261.63 * Math.pow(2, (semi + oct * 12) / 12);

export class Music {
  constructor() {
    this.timer = null;
    this.params = null;
    this.step = 0;
    this.nextTime = 0;
    this.pattern = null;
  }

  buildPattern(p) {
    const r = rng(p.seed * 7919 + 17);
    const scale = p.minor ? SCALE_MINOR : SCALE_MAJOR;
    const bars = 8, stepsPerBar = 8;
    const mel = [];
    let idx = 2;
    for (let b = 0; b < bars; b++) {
      for (let s = 0; s < stepsPerBar; s++) {
        if (s === 0 || r() < 0.62) {
          idx += Math.round((r() - 0.5) * 3);
          idx = Math.max(0, Math.min(scale.length * 2 - 1, idx));
          const oct = Math.floor(idx / scale.length);
          mel.push({ semi: scale[idx % scale.length] + oct * 12, len: r() < 0.2 ? 2 : 1 });
        } else mel.push(null);
      }
    }
    return { mel, scale, bars, stepsPerBar };
  }

  start(params) {
    this.params = params;
    this.pattern = this.buildPattern(params);
    this.step = 0;
    if (this.timer) clearInterval(this.timer);
    if (!audioReady()) return; // resume() will restart once audio is unlocked
    this.nextTime = actx.currentTime + 0.1;
    this.timer = setInterval(() => this.schedule(), TICK);
  }

  resume() { if (this.params && !this.timer) this.start(this.params); }

  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  schedule() {
    if (!audioReady()) return;
    const spb = 60 / this.params.tempo / 2; // seconds per 8th step
    while (this.nextTime < actx.currentTime + LOOKAHEAD) {
      this.playStep(this.step, this.nextTime, spb);
      this.step = (this.step + 1) % (this.pattern.bars * this.pattern.stepsPerBar);
      this.nextTime += spb;
    }
  }

  note(f, type, t, dur, vol) {
    const o = actx.createOscillator();
    const g = actx.createGain();
    o.type = type;
    o.frequency.value = f;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.012);
    g.gain.setValueAtTime(vol, t + dur * 0.6);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(musicGain);
    o.start(t); o.stop(t + dur + 0.02);
  }

  hat(t) {
    const o = actx.createOscillator();
    const g = actx.createGain();
    o.type = 'square';
    o.frequency.value = 6800 + (this.step % 3) * 800;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.025, t + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.04);
    o.connect(g); g.connect(musicGain);
    o.start(t); o.stop(t + 0.06);
  }

  playStep(step, t, spb) {
    const { mel, stepsPerBar } = this.pattern;
    const bar = Math.floor(step / stepsPerBar);
    const inBar = step % stepsPerBar;
    const prog = this.params.minor ? PROG_MINOR : PROG_MAJOR;
    const root = prog[Math.floor(bar / 2) % prog.length];
    // bass: root on beats 1 and 3, fifth on 3 sometimes
    if (inBar === 0) this.note(F(root, -2), 'triangle', t, spb * 1.8, 0.18);
    if (inBar === 4) this.note(F(root + (bar % 2 ? 7 : 0), -2), 'triangle', t, spb * 1.6, 0.15);
    // hats on offbeats
    if (inBar % 2 === 0) this.hat(t + spb * 0.5);
    // melody
    const m = mel[step];
    if (m) this.note(F(root + m.semi, 0), 'square', t, spb * m.len * 0.9, 0.05);
  }
}

export const music = new Music();
