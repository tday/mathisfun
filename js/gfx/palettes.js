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

/**
 * Base colours per monster archetype, before the world mood shift.
 * Softer and less saturated than a typical game palette: flat shapes in muted
 * tones read as "kawaii mascot", while the same shapes in neon read as "clip art".
 */
export const MONSTER_BASE = {
  blobbie: { body: '#8fd9a8', accent: '#5fb583', iris: '#4a3a46' },
  shellby: { body: '#f3c583', accent: '#d99a55', iris: '#4a3a46' },
  flitter: { body: '#b3a6e0', accent: '#8b7cc4', iris: '#4a3a46' },
  shroomp: { body: '#f2a0ad', accent: '#d97a8c', iris: '#4a3a46' },
  webble: { body: '#8fc4e8', accent: '#5f9ac9', iris: '#4a3a46' },
  boolie: { body: '#e8ecf5', accent: '#c2c9db', iris: '#4a3a46' },
  hornlet: { body: '#f0a279', accent: '#d17c52', iris: '#4a3a46' },
  rumble: { body: '#adb0bd', accent: '#868a99', iris: '#4a3a46' },
  dragon: { body: '#9fc47f', accent: '#7aa25c', iris: '#4a3a46' },
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
    sky: ['#9fd8ff', '#e6f4ff'], ground: '#c9dcf7', groundDark: '#a3bfe4',
    path: '#ffe9b8', pathEdge: '#d9b882', prop: '#ffffff', accent: '#b6a4ff',
    mood: { h: 12, s: 1.0, l: 1.0 },
  },
  snow: {
    sky: ['#cfe8ff', '#f6fbff'], ground: '#e2eefb', groundDark: '#b6cee6',
    path: '#cfe0f2', pathEdge: '#8fa9c4', prop: '#8fb8e0', accent: '#7ee0ff',
    mood: { h: 16, s: 0.95, l: 1.0 },
  },
  desert: {
    sky: ['#ffd9a0', '#fff1cf'], ground: '#f0c583', groundDark: '#d19c58',
    path: '#ffeac2', pathEdge: '#d8b078', prop: '#c98b4b', accent: '#ff9a6e',
    mood: { h: 10, s: 1.06, l: 0.97 },
  },
  cave: {
    sky: ['#5f4a78', '#8a6fa3'], ground: '#6b5680', groundDark: '#4a3a5c',
    path: '#a58bbc', pathEdge: '#7a6291', prop: '#5d4a75', accent: '#9ef2ff',
    dusk: 0.18,
    mood: { h: -8, s: 1.02, l: 0.96 },
  },
  jungle: {
    sky: ['#a7e6c4', '#dff7d8'], ground: '#5cb46a', groundDark: '#377f4e',
    path: '#dcc493', pathEdge: '#ad8e5f', prop: '#1f6b46', accent: '#ffd166',
    mood: { h: -12, s: 1.03, l: 0.96 },
  },
  volcano: {
    sky: ['#ff9f6e', '#ffd3a8'], ground: '#7a5060', groundDark: '#553646',
    path: '#c98b6b', pathEdge: '#9a6249', prop: '#6d4353', accent: '#ff6f4a',
    dusk: 0.12,
    mood: { h: 14, s: 1.06, l: 0.95 },
  },
  swamp: {
    sky: ['#9fc2a8', '#d6e8cd'], ground: '#6f9a6a', groundDark: '#4b6f52',
    path: '#b6ac7c', pathEdge: '#8a8058', prop: '#3c5a44', accent: '#c8ff8f',
    dusk: 0.1,
    mood: { h: -18, s: 1.02, l: 0.94 },
  },
  mountain: {
    sky: ['#b9cfe8', '#e9f2fb'], ground: '#9aa8bd', groundDark: '#6e7d94',
    path: '#d6dbe6', pathEdge: '#a3adc0', prop: '#5e6b82', accent: '#7ee0ff',
    mood: { h: 6, s: 0.98, l: 0.95 },
  },
  keep: {
    sky: ['#4a3a68', '#6f5891'], ground: '#54466e', groundDark: '#382d4d',
    path: '#8a76ab', pathEdge: '#5f4f7d', prop: '#4a3d63', accent: '#ff6f91',
    dusk: 0.24,
    mood: { h: -4, s: 1.04, l: 0.93 },
  },
  space: {
    sky: ['#2b1f4d', '#4b3a7a'], ground: '#3d3163', groundDark: '#281f45',
    path: '#7d68b8', pathEdge: '#54428a', prop: '#3b3161', accent: '#9ef2ff',
    dusk: 0.3, stars: true,
    mood: { h: 8, s: 1.06, l: 0.93 },
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
