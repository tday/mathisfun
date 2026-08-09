// Colour system: 14 world palettes plus the base hues every monster is built from.
//
// Each world supplies a scene palette (sky, ground, path) and a "mood" — an HSL
// shift applied to every monster in that world. Early worlds are candy-bright;
// later worlds drift dusky and saturated so enemies *look* tougher as the maths
// gets harder, without ever losing the soft toy silhouette.

import { shade } from '../core/utils.js';

export const UI = {
  ink: '#3d2447',
  cream: '#fff8ec',
  gold: '#ffc93c',
  coin: '#ffd34e',
  heart: '#ff5d7e',
  shield: '#6fd3ff',
  good: '#57cc7a',
  tryAgain: '#ffb347',
};

/** Base colours per monster archetype, before the world mood shift. */
export const MONSTER_BASE = {
  blobbie: { body: '#7ee0b8', accent: '#4fc79a', iris: '#2b1633' },
  shellby: { body: '#ffd08a', accent: '#e4924a', iris: '#3a1c2e' },
  flitter: { body: '#b6a4ff', accent: '#8f79f0', iris: '#2a1440' },
  shroomp: { body: '#ff9db1', accent: '#f2647f', iris: '#39182c' },
  webble: { body: '#8fd0ff', accent: '#4fa8e8', iris: '#1c2b45' },
  boolie: { body: '#eaf0ff', accent: '#c3cbe8', iris: '#332046' },
  hornlet: { body: '#ff9f6e', accent: '#ef7040', iris: '#3d1a1a' },
  rumble: { body: '#a9a2b8', accent: '#7e778f', iris: '#2b2038' },
  dragon: { body: '#c58cff', accent: '#8f4fd6', iris: '#2a1240' },
};

export const HERO = {
  skin: '#ffd9b8',
  skinShade: '#f0b98f',
  hair: '#5b3a2e',
  robe: '#5aa9f0',
  robeAlt: '#3f86c9',
  hat: '#4a7de0',
  cape: '#ff7ab8',
  staff: '#c78a4e',
  gem: '#7ef0ff',
  aura: '#ffe66d',
};

/**
 * Hero tier accents, one per grade band. The hero visibly levels up across the
 * whole game: cap -> pointed hat -> cape -> staff gem -> crown -> aura -> wings.
 */
export const HERO_TIERS = [
  { hat: '#63c2f5', cape: null, gem: '#9ef2ff', aura: null, wings: false, crown: false },
  { hat: '#4a7de0', cape: null, gem: '#9ef2ff', aura: null, wings: false, crown: false },
  { hat: '#7b5ce0', cape: '#ff8fc3', gem: '#a9ffe6', aura: null, wings: false, crown: false },
  { hat: '#e05c9b', cape: '#ffd166', gem: '#ffe66d', aura: '#ffe66d', wings: false, crown: false },
  { hat: '#2fbfa0', cape: '#7ee0ff', gem: '#b0ffdc', aura: '#7ee0ff', wings: false, crown: true },
  { hat: '#f0803c', cape: '#ff6f91', gem: '#ffd6a0', aura: '#ffb347', wings: true, crown: true },
  { hat: '#8b5cf6', cape: '#ffd166', gem: '#e0d0ff', aura: '#d0a8ff', wings: true, crown: true },
];

/**
 * 14 world palettes, two per grade band, in play order.
 * `mood` re-tints monsters; `dusk` darkens the whole scene for late worlds.
 */
export const PALETTES = {
  meadow: {
    sky: ['#bff0ff', '#f2fdf4'], ground: '#93dc8e', groundDark: '#6cc272',
    path: '#f6dfae', pathEdge: '#dcbb7f', prop: '#5fb56a', accent: '#ff8fc3',
    mood: { h: 0, s: 1, l: 1.02 },
  },
  beach: {
    sky: ['#a9e9ff', '#fff3d8'], ground: '#ffe3a8', groundDark: '#e8c079',
    path: '#fff3d2', pathEdge: '#e3c48f', prop: '#5ec8d8', accent: '#ff9a6e',
    mood: { h: 8, s: 1.02, l: 1.01 },
  },
  forest: {
    sky: ['#c8f0d9', '#eefbe8'], ground: '#79c777', groundDark: '#4f9a5c',
    path: '#e8d3a5', pathEdge: '#c3a172', prop: '#2f8551', accent: '#ffd166',
    mood: { h: -6, s: 1.02, l: 0.99 },
  },
  pond: {
    sky: ['#b6e9f7', '#e9fbfb'], ground: '#8fd6b6', groundDark: '#5fae94',
    path: '#e2ddb2', pathEdge: '#bdb682', prop: '#3f9fbe', accent: '#7ee0ff',
    mood: { h: -14, s: 1.03, l: 0.99 },
  },
  sky: {
    sky: ['#9fd8ff', '#e6f4ff'], ground: '#dbe9ff', groundDark: '#b3ccef',
    path: '#fff6ff', pathEdge: '#cdbdf0', prop: '#ffffff', accent: '#b6a4ff',
    mood: { h: 12, s: 1.0, l: 1.0 },
  },
  snow: {
    sky: ['#cfe8ff', '#f6fbff'], ground: '#eef6ff', groundDark: '#c3d8ee',
    path: '#dfeeff', pathEdge: '#adc6e2', prop: '#8fb8e0', accent: '#7ee0ff',
    mood: { h: 16, s: 0.95, l: 1.0 },
  },
  desert: {
    sky: ['#ffd9a0', '#fff1cf'], ground: '#f0c583', groundDark: '#d19c58',
    path: '#ffeac2', pathEdge: '#d8b078', prop: '#c98b4b', accent: '#ff9a6e',
    mood: { h: 10, s: 1.06, l: 0.97 },
  },
  cave: {
    sky: ['#5f4a78', '#8a6fa3'], ground: '#6b5680', groundDark: '#4a3a5c',
    path: '#a58bbc', pathEdge: '#7a6291', prop: '#3f3152', accent: '#9ef2ff',
    dusk: 0.18,
    mood: { h: -8, s: 1.06, l: 0.94 },
  },
  jungle: {
    sky: ['#a7e6c4', '#dff7d8'], ground: '#5cb46a', groundDark: '#377f4e',
    path: '#dcc493', pathEdge: '#ad8e5f', prop: '#1f6b46', accent: '#ffd166',
    mood: { h: -12, s: 1.08, l: 0.95 },
  },
  volcano: {
    sky: ['#ff9f6e', '#ffd3a8'], ground: '#7a5060', groundDark: '#553646',
    path: '#c98b6b', pathEdge: '#9a6249', prop: '#4a2c3a', accent: '#ff6f4a',
    dusk: 0.12,
    mood: { h: 14, s: 1.12, l: 0.93 },
  },
  swamp: {
    sky: ['#9fc2a8', '#d6e8cd'], ground: '#6f9a6a', groundDark: '#4b6f52',
    path: '#b6ac7c', pathEdge: '#8a8058', prop: '#3c5a44', accent: '#c8ff8f',
    dusk: 0.1,
    mood: { h: -18, s: 1.05, l: 0.92 },
  },
  mountain: {
    sky: ['#b9cfe8', '#e9f2fb'], ground: '#9aa8bd', groundDark: '#6e7d94',
    path: '#d6dbe6', pathEdge: '#a3adc0', prop: '#5e6b82', accent: '#7ee0ff',
    mood: { h: 6, s: 0.98, l: 0.95 },
  },
  keep: {
    sky: ['#4a3a68', '#6f5891'], ground: '#54466e', groundDark: '#382d4d',
    path: '#8a76ab', pathEdge: '#5f4f7d', prop: '#2c2340', accent: '#ff6f91',
    dusk: 0.24,
    mood: { h: -4, s: 1.1, l: 0.9 },
  },
  space: {
    sky: ['#2b1f4d', '#4b3a7a'], ground: '#3d3163', groundDark: '#281f45',
    path: '#7d68b8', pathEdge: '#54428a', prop: '#1c1636', accent: '#9ef2ff',
    dusk: 0.3, stars: true,
    mood: { h: 8, s: 1.14, l: 0.9 },
  },
};

/** Apply a world's mood shift to a monster's base colours. */
export function moodColors(archetype, paletteId) {
  const base = MONSTER_BASE[archetype] || MONSTER_BASE.blobbie;
  const mood = (PALETTES[paletteId] || PALETTES.meadow).mood || { h: 0, s: 1, l: 1 };
  return {
    body: shade(base.body, mood),
    accent: shade(base.accent, mood),
    iris: base.iris,
  };
}

export function palette(id) {
  return PALETTES[id] || PALETTES.meadow;
}
