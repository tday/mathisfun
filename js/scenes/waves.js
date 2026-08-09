// Stage parameterization (140 stages from formulas, zero stage files),
// seeded path generation, and wave/spawn planning.

import { rng, hash, makePath, lerp } from '../core/utils.js';
import { MARCH, WAVES } from '../data/tuning.js';
import { ENEMIES } from '../gfx/sprites-units.js';

export function stagePlan(world, stage) {
  const isBoss = stage === 10;
  const waveCount = isBoss ? 2 : Math.min(4, WAVES.base + Math.floor((stage - 1) / 3));
  const perWave = WAVES.perWaveBase + Math.floor(stage / 3) + world.indexInBand;
  const crossSec = Math.max(40,
    MARCH.crossSeconds * (1 - MARCH.stageSpeedup * (stage - 1)) * (1 - MARCH.bandSpeedup * world.band));
  return {
    isBoss,
    waveCount,
    perWave,
    speed: 1 / crossSec,                       // path fraction per second
    bossSpeed: 1 / MARCH.bossCrossSeconds,
    spawnGap: lerp(WAVES.spawnGapFrom, WAVES.spawnGapTo, (stage - 1) / 9),
    armored: stage >= WAVES.armoredFromStage && world.band >= WAVES.armoredMinBand,
    bossHp: WAVES.bossBaseHp + world.band + world.indexInBand,
  };
}

// Winding path in normalized coords: spawns off the left edge, castle right.
export function makeStagePath(world, stage) {
  const r = rng(hash('path', world.id, stage));
  const pts = [{ x: -0.08, y: 0.3 + r() * 0.35 }];
  const n = 4;
  for (let i = 0; i < n; i++) {
    const x = 0.1 + ((i + 0.5) / n) * 0.62;
    const y = i % 2 === 0 ? 0.16 + r() * 0.3 : 0.5 + r() * 0.34;
    pts.push({ x, y });
  }
  pts.push({ x: 0.8, y: 0.4 + r() * 0.3 });
  pts.push({ x: 0.92, y: 0.62 });
  return makePath(pts);
}

// Build the spawn schedule: array of waves, each an array of enemy defs.
export function buildWaves(world, stage, plan) {
  const r = rng(hash('waves', world.id, stage));
  const waves = [];
  for (let wv = 0; wv < plan.waveCount; wv++) {
    const list = [];
    const count = plan.isBoss ? Math.max(2, plan.perWave - 2) : plan.perWave;
    for (let i = 0; i < count; i++) {
      // later enemies in the pool show up more as stage/wave rises
      const depth = Math.min(1, (stage - 1) / 9 * 0.6 + wv / Math.max(1, plan.waveCount - 1) * 0.5 + r() * 0.35);
      const idx = Math.min(world.enemies.length - 1, Math.floor(depth * world.enemies.length));
      const type = world.enemies[idx];
      const armor = plan.armored && r() < WAVES.armoredShare;
      list.push({
        type,
        armor,
        hp: armor ? 2 : 1,
        elite: world.indexInBand === 1,
        speedMul: ENEMIES[type].speed * (0.94 + r() * 0.12),
        colorIndex: idx,
        gap: plan.spawnGap * (0.85 + r() * 0.35),
      });
    }
    waves.push(list);
  }
  return waves;
}
