// The 14 worlds — two per grade band, ten stages each (140 stages total).
// Stage content itself is computed, never authored: see scenes/waves.js.
//
// This module is DOM-free on purpose so the whole progression model can be
// audited from plain Node.

export const BANDS = [
  { band: 0, name: 'Pre-K', blurb: 'Counting & shapes', color: '#7ee0b8' },
  { band: 1, name: 'Kindergarten', blurb: 'Numbers to 20', color: '#8fd0ff' },
  { band: 2, name: '1st Grade', blurb: 'Add & subtract to 20', color: '#b6a4ff' },
  { band: 3, name: '2nd Grade', blurb: 'Bigger sums & skip counting', color: '#ffd08a' },
  { band: 4, name: '3rd Grade', blurb: 'Times tables & fractions', color: '#ff9db1' },
  { band: 5, name: '4th Grade', blurb: 'Long multiplication & decimals', color: '#ff9f6e' },
  { band: 6, name: '5th Grade', blurb: 'Fractions, decimals, order of ops', color: '#c58cff' },
];

const DEF = [
  // band 0 — Pre-K
  { name: 'Giggle Meadow', palette: 'meadow', enemies: ['blobbie', 'shellby'], music: { tempo: 100, mode: 'major', seed: 3 } },
  { name: 'Sunny Shore', palette: 'beach', enemies: ['blobbie', 'shellby', 'flitter'], music: { tempo: 104, mode: 'lydian', seed: 11 } },
  // band 1 — Kindergarten
  { name: 'Whisper Woods', palette: 'forest', enemies: ['blobbie', 'shroomp', 'flitter'], music: { tempo: 106, mode: 'major', seed: 23 } },
  { name: 'Lily Pond', palette: 'pond', enemies: ['shellby', 'shroomp', 'webble'], music: { tempo: 108, mode: 'dorian', seed: 31 } },
  // band 2 — 1st grade
  { name: 'Cloud Kingdom', palette: 'sky', enemies: ['flitter', 'boolie', 'blobbie', 'webble'], music: { tempo: 112, mode: 'lydian', seed: 41 } },
  { name: 'Frostpeak', palette: 'snow', enemies: ['flitter', 'boolie', 'rumble', 'shroomp'], music: { tempo: 110, mode: 'major', seed: 53 } },
  // band 3 — 2nd grade
  { name: 'Dune Bazaar', palette: 'desert', enemies: ['hornlet', 'shellby', 'webble', 'blobbie'], music: { tempo: 116, mode: 'dorian', seed: 61 } },
  { name: 'Crystal Cave', palette: 'cave', enemies: ['boolie', 'rumble', 'webble', 'hornlet'], music: { tempo: 114, mode: 'minor', seed: 71 } },
  // band 4 — 3rd grade
  { name: 'Vine Jungle', palette: 'jungle', enemies: ['shroomp', 'webble', 'hornlet', 'flitter'], music: { tempo: 120, mode: 'dorian', seed: 83 } },
  { name: 'Ember Ridge', palette: 'volcano', enemies: ['hornlet', 'rumble', 'boolie', 'blobbie'], music: { tempo: 122, mode: 'minor', seed: 97 } },
  // band 5 — 4th grade
  { name: 'Mossy Marsh', palette: 'swamp', enemies: ['shroomp', 'boolie', 'webble', 'shellby'], music: { tempo: 118, mode: 'minor', seed: 103 } },
  { name: 'Skyhigh Summit', palette: 'mountain', enemies: ['rumble', 'flitter', 'hornlet', 'webble'], music: { tempo: 124, mode: 'lydian', seed: 113 } },
  // band 6 — 5th grade
  { name: 'Shadow Keep', palette: 'keep', enemies: ['boolie', 'hornlet', 'rumble', 'webble'], music: { tempo: 126, mode: 'minor', seed: 127 } },
  { name: 'Starlight Void', palette: 'space', enemies: ['boolie', 'rumble', 'hornlet', 'flitter'], music: { tempo: 128, mode: 'dorian', seed: 139 } },
];

const BOSS_NAMES = [
  'Meadow Munch', 'Tide Tyrant', 'Old Oakjaw', 'Pond Prowler', 'Cloud Chomper', 'Frost Fang',
  'Sand Sovereign', 'Geode Gorger', 'Vine Viper', 'Ember Emperor', 'Marsh Monarch',
  'Summit Sentinel', 'Keep Keeper', 'Void Devourer',
];

export const WORLDS = DEF.map((d, i) => {
  const band = Math.floor(i / 2);
  const indexInBand = i % 2;
  return {
    ...d,
    id: `g${band}w${indexInBand}`,
    index: i,
    band,
    bandName: BANDS[band].name,
    indexInBand,
    boss: { archetype: 'dragon', name: BOSS_NAMES[i] },
    mapSeed: 1000 + i * 137,
  };
});

const BY_ID = new Map(WORLDS.map((w) => [w.id, w]));

export function worldById(id) {
  return BY_ID.get(id) || WORLDS[0];
}

export function worldsInBand(band) {
  return WORLDS.filter((w) => w.band === band);
}

/** Hero look tier tracks the grade band, so the hero grows with the maths. */
export function heroTier(world) {
  return Math.min(6, world.band);
}

export const STAGES_PER_WORLD = 10;

/**
 * Unlock rules, always derived from stars — nothing extra to persist.
 *  - Stage 1 of a world is open if the world is open.
 *  - Stage n opens once stage n-1 has at least one star.
 *  - World 1 of EVERY band is always open: a 3rd grader should never have to
 *    grind through Pre-K to reach their own level.
 *  - World 2 of a band opens once world 1's boss (stage 10) is cleared.
 */
export function isWorldUnlocked(save, world) {
  if (world.indexInBand === 0) return true;
  const prev = WORLDS[world.index - 1];
  const stars = save.data.stars[prev.id];
  return !!(stars && stars[STAGES_PER_WORLD - 1] > 0);
}

export function isStageUnlocked(save, world, stage) {
  if (!isWorldUnlocked(save, world)) return false;
  if (stage <= 1) return true;
  const stars = save.data.stars[world.id];
  return !!(stars && stars[stage - 2] > 0);
}

export function worldProgress(save, world) {
  const stars = save.data.stars[world.id] || [];
  let cleared = 0, total = 0;
  for (let i = 0; i < STAGES_PER_WORLD; i++) {
    if (stars[i] > 0) cleared++;
    total += stars[i] || 0;
  }
  return { cleared, stars: total, max: STAGES_PER_WORLD * 3 };
}

/** First stage the player has not yet cleared — where "Continue" should land. */
export function nextStage(save, world) {
  const stars = save.data.stars[world.id] || [];
  for (let i = 0; i < STAGES_PER_WORLD; i++) if (!stars[i]) return i + 1;
  return STAGES_PER_WORLD;
}
