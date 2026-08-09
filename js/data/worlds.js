// The 14 worlds: 7 grade bands x 2 worlds x 10 stages. Stage 10 = boss castle.
// All progression rules are derived from save.stars — never stored.

import { hash } from '../core/utils.js';

export const BAND_NAMES = ['Pre-K', 'Kindergarten', '1st Grade', '2nd Grade', '3rd Grade', '4th Grade', '5th Grade'];
export const STAGES_PER_WORLD = 10;

const W = (band, idx, name, theme, enemies, bossName, countables, music) => ({
  id: `g${band}w${idx}`, band, indexInBand: idx, bandName: BAND_NAMES[band],
  name, theme, enemies, bossName, countables, music,
  mapSeed: hash('map', band, idx),
});

export const WORLDS = [
  W(0, 0, 'Sunny Meadow', 'meadow', ['blob', 'snail'], 'Sprout Dragon', ['apple', 'bug', 'star'], { tempo: 96, minor: false, seed: 1 }),
  W(0, 1, 'Bubble Beach', 'beach', ['blob', 'snail', 'shroom'], 'Splash Dragon', ['shell', 'fish', 'duck'], { tempo: 100, minor: false, seed: 2 }),
  W(1, 0, 'Friendly Forest', 'forest', ['blob', 'shroom', 'snail'], 'Moss Dragon', ['apple', 'cookie', 'bug'], { tempo: 100, minor: false, seed: 3 }),
  W(1, 1, 'Lily Pond', 'pond', ['blob', 'shroom', 'bat'], 'Puddle Dragon', ['duck', 'fish', 'bug'], { tempo: 104, minor: false, seed: 4 }),
  W(2, 0, 'Cloud Kingdom', 'sky', ['bat', 'blob', 'ghost'], 'Cloud Dragon', ['balloon', 'star', 'cookie'], { tempo: 106, minor: false, seed: 5 }),
  W(2, 1, 'Snowy Peaks', 'snow', ['snail', 'ghost', 'golem'], 'Frost Dragon', ['star', 'cookie', 'balloon'], { tempo: 104, minor: false, seed: 6 }),
  W(3, 0, 'Dusty Dunes', 'desert', ['snail', 'imp', 'golem'], 'Dune Dragon', ['star', 'bug', 'cookie'], { tempo: 110, minor: false, seed: 7 }),
  W(3, 1, 'Crystal Cave', 'cave', ['bat', 'spider', 'golem'], 'Crystal Dragon', ['star', 'balloon', 'cookie'], { tempo: 112, minor: true, seed: 8 }),
  W(4, 0, 'Jumbo Jungle', 'jungle', ['shroom', 'spider', 'imp'], 'Vine Dragon', ['apple', 'bug', 'balloon'], { tempo: 114, minor: false, seed: 9 }),
  W(4, 1, 'Lava Land', 'volcano', ['imp', 'bat', 'golem'], 'Ember Dragon', ['star', 'cookie', 'bug'], { tempo: 118, minor: true, seed: 10 }),
  W(5, 0, 'Misty Marsh', 'swamp', ['shroom', 'ghost', 'spider', 'snail'], 'Mist Dragon', ['bug', 'fish', 'star'], { tempo: 116, minor: true, seed: 11 }),
  W(5, 1, 'Thunder Ridge', 'mountain', ['golem', 'bat', 'imp', 'spider'], 'Storm Dragon', ['star', 'cookie', 'balloon'], { tempo: 120, minor: false, seed: 12 }),
  W(6, 0, 'Shadow Keep', 'shadow', ['ghost', 'spider', 'imp', 'bat'], 'Shadow Dragon', ['star', 'balloon', 'cookie'], { tempo: 124, minor: true, seed: 13 }),
  W(6, 1, 'Star Galaxy', 'space', ['blob', 'ghost', 'imp', 'golem'], 'Nova Dragon', ['star', 'balloon', 'cookie'], { tempo: 128, minor: false, seed: 14 }),
];

export const worldById = (id) => WORLDS.find((w) => w.id === id);

export function starsFor(save, worldId) {
  return save.stars[worldId] || Array(STAGES_PER_WORLD).fill(0);
}

export function isWorldUnlocked(save, world) {
  if (world.indexInBand === 0) return true; // every grade's first world is open
  return starsFor(save, `g${world.band}w0`)[STAGES_PER_WORLD - 1] >= 1;
}

export function isStageUnlocked(save, world, stage) {
  if (!isWorldUnlocked(save, world)) return false;
  if (stage === 1) return true;
  return starsFor(save, world.id)[stage - 2] >= 1;
}

export function worldStars(save, worldId) {
  return starsFor(save, worldId).reduce((a, b) => a + b, 0);
}

// ---- gacha figures: one collectible per (world, enemy archetype) + boss ---
import { ENEMIES } from '../gfx/sprites-units.js';

export function figuresForWorld(world) {
  const figs = world.enemies.map((type, i) => ({
    id: `${world.id}:${type}`, world, type, boss: false,
    name: `${world.name.split(' ')[0]} ${ENEMIES[type].name}`,
    colorIndex: i,
  }));
  figs.push({ id: `${world.id}:boss`, world, type: 'boss', boss: true, name: world.bossName, colorIndex: 0 });
  return figs;
}

// Worlds the player has touched (played at least stage 1) feed the gacha pool
export function playedWorlds(save) {
  const ids = Object.keys(save.stars).filter((id) => (save.stars[id] || []).some((s) => s > 0));
  const list = ids.map(worldById).filter(Boolean);
  return list.length ? list : [WORLDS[0]];
}
