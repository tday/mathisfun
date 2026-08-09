// Candy-spooky palettes: pastel bodies + deep plum ink outlines.
// Every world recolors the same draw functions, so 14 worlds cost 14 entries.

export const INK = '#3a2547';         // global outline: deep plum, never black
export const INK_SOFT = '#5a4370';

// ---- color helpers -------------------------------------------------------
export function hexToRgb(hex) {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
export function rgbToHex(r, g, b) {
  const c = (v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0');
  return `#${c(r)}${c(g)}${c(b)}`;
}
// amt in [-1,1]: negative darkens toward ink-purple, positive lightens toward cream
export function shade(hex, amt) {
  const [r, g, b] = hexToRgb(hex);
  if (amt >= 0) {
    return rgbToHex(r + (255 - r) * amt, g + (250 - g) * amt, b + (245 - b) * amt);
  }
  const t = -amt;
  const [ir, ig, ib] = hexToRgb(INK);
  return rgbToHex(r + (ir - r) * t, g + (ig - g) * t, b + (ib - b) * t);
}
export function mix(a, b, t) {
  const [r1, g1, b1] = hexToRgb(a), [r2, g2, b2] = hexToRgb(b);
  return rgbToHex(r1 + (r2 - r1) * t, g1 + (g2 - g1) * t, b1 + (b2 - b1) * t);
}
export function withAlpha(hex, a) {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r},${g},${b},${a})`;
}

// Build a monster "skin" (all colors toybox needs) from one body color
export function skin(body, accent) {
  return {
    body,
    belly: shade(body, 0.45),
    dark: shade(body, -0.28),
    ink: INK,
    accent: accent || shade(body, -0.15),
    blush: '#ff9db1',
  };
}

// ---- world palettes ------------------------------------------------------
// celestial: sun | moon | stars ; props: shared prop kinds drawn per theme
export const PALETTES = {
  meadow: {
    skyTop: '#aee9ff', skyBot: '#e8fbe4', hills: ['#b8e98c', '#94d970'], ground: '#7ec95f',
    path: '#f7dfae', pathEdge: '#e0b878', celestial: 'sun', props: ['flower', 'bush'],
    deco: ['#ff8fb3', '#ffd76e', '#c5a3ff'], accent: '#ff6f9c',
    monsters: ['#8fd977', '#ffd76e', '#8fc7ff', '#ffa1c4', '#c5a3ff'],
  },
  beach: {
    skyTop: '#8fd8ff', skyBot: '#fff3d6', hills: ['#ffe9b8', '#ffd98f'], ground: '#ffdf9e',
    path: '#ffd0871', pathEdge: '#e8b06b', celestial: 'sun', props: ['shell', 'palm'],
    deco: ['#ff9d7a', '#7adfd4', '#ffd76e'], accent: '#12b8c4',
    monsters: ['#7adfd4', '#ff9d7a', '#ffd76e', '#8fc7ff', '#ffa1c4'],
  },
  forest: {
    skyTop: '#9fdcae', skyBot: '#eef7c8', hills: ['#7cc276', '#5aab60'], ground: '#63b45c',
    path: '#e5c893', pathEdge: '#c2a06b', celestial: 'sun', props: ['pine', 'mushroom'],
    deco: ['#ff8a80', '#ffd76e', '#a7f0e0'], accent: '#ff8a5c',
    monsters: ['#a3d977', '#ff9d7a', '#c5a3ff', '#8fd6c7', '#ffd76e'],
  },
  pond: {
    skyTop: '#a5d8ff', skyBot: '#d8f4e0', hills: ['#8fd6a5', '#6dc08b'], ground: '#79c993',
    path: '#dbe6a8', pathEdge: '#b1c176', celestial: 'sun', props: ['reed', 'lily'],
    deco: ['#7fd9e8', '#ffa1c4', '#c9ef8f'], accent: '#38b6a8',
    monsters: ['#7fd9e8', '#a3d977', '#ffa1c4', '#ffd76e', '#9fa9ff'],
  },
  sky: {
    skyTop: '#7fb7ff', skyBot: '#dceeff', hills: ['#cfe3ff', '#adcdf7'], ground: '#e8f2ff',
    path: '#ffe9b8', pathEdge: '#e5c37e', celestial: 'sun', props: ['cloudpuff', 'rainbow'],
    deco: ['#ffffff', '#ffd76e', '#ffa1c4'], accent: '#5a8fe8',
    monsters: ['#9fc4ff', '#ffffff', '#ffd76e', '#ffa1c4', '#b8a8ff'],
  },
  snow: {
    skyTop: '#a8c8ee', skyBot: '#eef4ff', hills: ['#e8f0fb', '#cddcf0'], ground: '#f4f8ff',
    path: '#cddcf0', pathEdge: '#a3b8d8', celestial: 'sun', props: ['pine', 'snowlump'],
    deco: ['#8fd6ff', '#c5a3ff', '#ffffff'], accent: '#6ea3e8',
    monsters: ['#bfe3ff', '#e8e3ff', '#8fd6ff', '#ffffff', '#a8b8f0'],
  },
  desert: {
    skyTop: '#ffd9a0', skyBot: '#ffefc9', hills: ['#f2c184', '#e0a45f'], ground: '#f0c489',
    path: '#e8a86b', pathEdge: '#c4854a', celestial: 'sun', props: ['cactus', 'rock'],
    deco: ['#8fd977', '#ff8a5c', '#e8d3a8'], accent: '#e07a3f',
    monsters: ['#f2b56b', '#e88a6b', '#d9c46b', '#c98fd9', '#8fbf8f'],
  },
  cave: {
    skyTop: '#4d3f70', skyBot: '#77619e', hills: ['#655087', '#52406e'], ground: '#6e5a91',
    path: '#9a86bd', pathEdge: '#77619e', celestial: 'stars', props: ['crystal', 'rock'],
    deco: ['#8fe8e0', '#c58fff', '#ffd76e'], accent: '#a06bff',
    monsters: ['#b08fe8', '#8fe8e0', '#e8908f', '#d9c46b', '#8fa8e8'],
  },
  jungle: {
    skyTop: '#7fd0a0', skyBot: '#d8f0b8', hills: ['#4fa860', '#3d8a50'], ground: '#4c9e59',
    path: '#c9a86b', pathEdge: '#a3854a', celestial: 'sun', props: ['palm', 'bush'],
    deco: ['#ff6f9c', '#ffd76e', '#ff8a5c'], accent: '#f24f88',
    monsters: ['#63c95a', '#ff8a5c', '#ffd150', '#c86bd9', '#5abfc9'],
  },
  volcano: {
    skyTop: '#5b3550', skyBot: '#c96b52', hills: ['#7a4a52', '#5e3844'], ground: '#6e4450',
    path: '#a3705e', pathEdge: '#7a4a44', celestial: 'moon', props: ['rock', 'ember'],
    deco: ['#ff9d50', '#ff6b5e', '#ffd150'], accent: '#ff7038',
    monsters: ['#ff8a5c', '#e85e70', '#ffb84f', '#b08fe8', '#8a7f8f'],
  },
  swamp: {
    skyTop: '#728a6e', skyBot: '#c2d3a8', hills: ['#6b8a5e', '#54704a'], ground: '#5e7d54',
    path: '#8f8a5e', pathEdge: '#6e6a44', celestial: 'moon', props: ['reed', 'mushroom'],
    deco: ['#a8d96b', '#8fd6c7', '#c58fff'], accent: '#7ab838',
    monsters: ['#96b85e', '#8fd6c7', '#c98fd9', '#d9b46b', '#7f9eb8'],
  },
  mountain: {
    skyTop: '#5e6e9e', skyBot: '#b8c8e0', hills: ['#8a97b8', '#6b7896'], ground: '#7d8aa8',
    path: '#a8b0c4', pathEdge: '#828ca3', celestial: 'moon', props: ['rock', 'pine'],
    deco: ['#ffd76e', '#8fd6ff', '#e8e3ff'], accent: '#f0c045',
    monsters: ['#8fa8e8', '#b8bfd0', '#ffd76e', '#8fd6c7', '#e8908f'],
  },
  shadow: {
    skyTop: '#2e2347', skyBot: '#59437a', hills: ['#473563', '#382a50'], ground: '#413058',
    path: '#6e5a91', pathEdge: '#523f70', celestial: 'moon', props: ['deadtree', 'crystal'],
    deco: ['#a06bff', '#ff6f9c', '#8fe8e0'], accent: '#b44fe8',
    monsters: ['#8f6bc9', '#e8608f', '#5abfc9', '#a8a3c4', '#ffb84f'],
  },
  space: {
    skyTop: '#161233', skyBot: '#3a2e70', hills: ['#33296100', '#2a2154'], ground: '#332961',
    path: '#8f86d9', pathEdge: '#6e63b8', celestial: 'stars', props: ['star', 'crystal'],
    deco: ['#ffd76e', '#8fd6ff', '#ff8fb3'], accent: '#ffd150',
    monsters: ['#8f86ff', '#5ee8d0', '#ff8fb3', '#ffd150', '#c9c4ff'],
  },
};
// fix a typo-safe path color for beach (7 chars guard)
PALETTES.beach.path = '#ffd087';

// UI theme (CSS vars set from here so DOM matches canvas)
export const UI = {
  panel: '#fff8ef', panelInk: INK, card: '#ffffff',
  good: '#54c26e', goodDark: '#3da357',
  warn: '#ffb84f', bad: '#ff8a80',
  primary: '#7a5cff', primaryDark: '#6248d9',
  coin: '#ffcf4d', heart: '#ff6f9c', shield: '#5ab8ff',
  star: '#ffd150', starOff: '#d8d0e0',
};

export const HERO_TIER = {
  robe: ['#8fc7ff', '#8fd977', '#ffd76e', '#ffa1c4', '#c5a3ff', '#ff8a5c', '#8f86ff'],
  hat:  ['#5a8fe8', '#54a848', '#e8a838', '#e8608f', '#8f5ce8', '#e0663f', '#5a54d9'],
};
