// Procedural Web Audio: context lifecycle (mobile unlock!), gains, SFX synths.
// No audio files anywhere - every sound is an oscillator envelope.

import { save, persist } from '../core/save.js';

export let actx = null;
let master = null, sfxGain = null;
export let musicGain = null;
let noiseBuf = null;

export function audioReady() { return !!actx && actx.state === 'running'; }

// Must be called from inside a user gesture (pointerdown) for iOS.
export function unlockAudio() {
  if (!actx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    actx = new AC();
    master = actx.createGain();
    master.connect(actx.destination);
    sfxGain = actx.createGain();
    sfxGain.connect(master);
    musicGain = actx.createGain();
    musicGain.connect(master);
    applyVolumes();
    // pre-build noise buffer
    noiseBuf = actx.createBuffer(1, actx.sampleRate * 0.5, actx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  if (actx.state === 'suspended') actx.resume();
  // iOS demands an actual source start inside the gesture
  const b = actx.createBuffer(1, 1, 22050);
  const src = actx.createBufferSource();
  src.buffer = b; src.connect(master); src.start(0);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && actx?.state === 'suspended') actx.resume();
  });
}

export function applyVolumes() {
  if (!master) return;
  master.gain.value = save.settings.muted ? 0 : 1;
  sfxGain.gain.value = save.settings.sfx;
  musicGain.gain.value = save.settings.music * 0.5;
}

export function toggleMute() {
  save.settings.muted = !save.settings.muted;
  persist();
  applyVolumes();
  return save.settings.muted;
}

// ---- synth helpers -------------------------------------------------------

function tone({ f = 440, f2 = null, type = 'sine', t = 0, dur = 0.15, vol = 0.25, curve = 0.006 }) {
  if (!audioReady()) return;
  const t0 = actx.currentTime + t;
  const o = actx.createOscillator();
  const g = actx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f, t0);
  if (f2) o.frequency.exponentialRampToValueAtTime(Math.max(1, f2), t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(vol, t0 + curve);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g); g.connect(sfxGain);
  o.start(t0); o.stop(t0 + dur + 0.02);
}

function noise({ t = 0, dur = 0.12, vol = 0.12, hp = 1000 }) {
  if (!audioReady() || !noiseBuf) return;
  const t0 = actx.currentTime + t;
  const src = actx.createBufferSource();
  src.buffer = noiseBuf; src.loop = true;
  const g = actx.createGain();
  const filt = actx.createBiquadFilter();
  filt.type = 'highpass'; filt.frequency.value = hp;
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(vol, t0 + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(filt); filt.connect(g); g.connect(sfxGain);
  src.start(t0); src.stop(t0 + dur + 0.02);
}

const N = (semi) => 261.63 * Math.pow(2, semi / 12); // C4-based

// ---- the sound set -------------------------------------------------------

export const sfx = {
  tap() { tone({ f: N(19), type: 'square', dur: 0.05, vol: 0.07 }); },
  correct(streak = 1) {
    const base = Math.min(streak - 1, 4) * 2;
    [0, 4, 7, 12].forEach((semi, i) =>
      tone({ f: N(semi + base), type: 'triangle', t: i * 0.07, dur: 0.16, vol: 0.22 }));
    tone({ f: N(12 + base), type: 'sine', t: 0.28, dur: 0.25, vol: 0.15 });
  },
  wrong() { // deliberately gentle: two soft descending sines, never a buzzer
    tone({ f: N(4), type: 'sine', dur: 0.18, vol: 0.14 });
    tone({ f: N(0), type: 'sine', t: 0.16, dur: 0.26, vol: 0.12 });
  },
  reveal() { tone({ f: N(7), type: 'sine', dur: 0.12, vol: 0.12 }); tone({ f: N(12), type: 'sine', t: 0.1, dur: 0.18, vol: 0.12 }); },
  coin(i = 0) { tone({ f: N(23), type: 'square', t: i * 0.04, dur: 0.05, vol: 0.09 }); tone({ f: N(28), type: 'square', t: i * 0.04 + 0.05, dur: 0.12, vol: 0.09 }); },
  whoosh() { noise({ dur: 0.22, vol: 0.1, hp: 2500 }); tone({ f: 900, f2: 1800, type: 'sine', dur: 0.2, vol: 0.06 }); },
  pop() { tone({ f: 300, f2: 900, type: 'square', dur: 0.09, vol: 0.15 }); noise({ dur: 0.08, vol: 0.12, hp: 1800 }); },
  poof() { noise({ dur: 0.25, vol: 0.14, hp: 600 }); tone({ f: 500, f2: 150, type: 'sine', dur: 0.22, vol: 0.1 }); },
  thud() { tone({ f: 130, f2: 55, type: 'sine', dur: 0.3, vol: 0.3 }); noise({ dur: 0.14, vol: 0.1, hp: 300 }); },
  bossHit() { tone({ f: 220, f2: 90, type: 'sawtooth', dur: 0.2, vol: 0.16 }); tone({ f: N(12), type: 'triangle', t: 0.06, dur: 0.15, vol: 0.15 }); },
  buy() { tone({ f: N(12), type: 'square', dur: 0.07, vol: 0.1 }); tone({ f: N(19), type: 'square', t: 0.08, dur: 0.1, vol: 0.1 }); },
  heart() { tone({ f: N(9), type: 'sine', dur: 0.14, vol: 0.15 }); tone({ f: N(16), type: 'sine', t: 0.12, dur: 0.2, vol: 0.13 }); },
  fanfare() {
    [[0, 0], [4, 0.12], [7, 0.24], [12, 0.36], [12, 0.6], [16, 0.72], [19, 0.84]].forEach(([semi, t]) =>
      tone({ f: N(semi), type: 'triangle', t, dur: 0.22, vol: 0.2 }));
    noise({ t: 0.84, dur: 0.3, vol: 0.06, hp: 4000 });
  },
  softLose() {
    [[7, 0], [4, 0.18], [0, 0.36]].forEach(([semi, t]) =>
      tone({ f: N(semi), type: 'sine', t, dur: 0.3, vol: 0.14 }));
    tone({ f: N(5), type: 'sine', t: 0.6, dur: 0.5, vol: 0.12 }); // ends warm, not sad
  },
  sparkle() { [26, 31, 35].forEach((s, i) => tone({ f: N(s), type: 'sine', t: i * 0.05, dur: 0.1, vol: 0.07 })); },
  wave() { tone({ f: N(0), type: 'square', dur: 0.09, vol: 0.09 }); tone({ f: N(5), type: 'square', t: 0.1, dur: 0.09, vol: 0.09 }); tone({ f: N(9), type: 'square', t: 0.2, dur: 0.14, vol: 0.09 }); },
};
