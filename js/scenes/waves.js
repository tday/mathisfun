// Stage construction: how 140 stages exist without 140 stage files.
//
// Everything (wave count, enemy mix, march speed, the path shape itself) is
// derived from (world, stage) through a seeded RNG, so a stage is identical
// every time it is played and can be reproduced exactly in a test.

import { mulberry32, hash, lerp, clamp, makeSpline, pick } from '../core/utils.js';
import { COMBAT } from '../data/tuning.js';
import { STAGES_PER_WORLD } from '../data/worlds.js';

export function stageParams(world, stage) {
  const s = clamp(stage, 1, STAGES_PER_WORLD);
  const isBoss = s === STAGES_PER_WORLD;
  const bandSpeed = COMBAT.bandSpeed[world.band] ?? 1;

  return {
    stage: s,
    isBoss,
    waves: isBoss ? 3 : 1 + Math.min(3, Math.floor((s + 2) / 3)),
    perWave: 2 + Math.floor(s / 2) + world.indexInBand,
    speed: COMBAT.baseSpeed * (0.85 + COMBAT.speedPerStage * s) * bandSpeed,
    spawnGap: lerp(COMBAT.gapStart, COMBAT.gapEnd, s / STAGES_PER_WORLD),
    waveGap: 2.4,
    armoredShare: world.band >= COMBAT.armorFromBand && s >= COMBAT.armorFromStage ? COMBAT.armorShare : 0,
    eliteShare: world.indexInBand === 1 && s >= 4 ? 0.3 : 0,
    boss: isBoss ? { hp: COMBAT.bossBaseHp + world.band + world.indexInBand } : null,
  };
}

/**
 * The march route, in normalised 0..1 coordinates so it reflows for any screen
 * shape. Enemies store progress along it as a single number.
 */
export function makeStagePath(world, stage) {
  const rng = mulberry32(hash(world.id, stage, 'path'));
  const pts = [{ x: -0.06, y: 0.35 + rng() * 0.3 }];
  const n = 4 + Math.floor(rng() * 2);
  for (let i = 1; i <= n; i++) {
    const t = i / (n + 1);
    pts.push({
      x: lerp(-0.02, 0.74, t) + (rng() - 0.5) * 0.08,
      y: 0.24 + rng() * 0.52,
    });
  }
  pts.push({ x: 0.8, y: 0.6 });
  return { spline: makeSpline(pts, 320), castle: { x: 0.87, y: 0.6 } };
}

/** Deterministic spawn schedule for the whole stage. */
export function buildSpawns(world, stage) {
  const p = stageParams(world, stage);
  const rng = mulberry32(hash(world.id, stage, 'spawn'));
  const spawns = [];
  let t = 1.2;

  for (let wave = 0; wave < p.waves; wave++) {
    const count = p.isBoss ? Math.max(2, p.perWave - 2) : p.perWave;
    for (let i = 0; i < count; i++) {
      const armored = rng() < p.armoredShare;
      const elite = !armored && rng() < p.eliteShare;
      spawns.push({
        at: t,
        wave: wave + 1,
        archetype: pick(rng, world.enemies),
        armored,
        elite,
        boss: false,
      });
      t += p.spawnGap * (0.85 + rng() * 0.3);
    }
    t += p.waveGap;
  }

  if (p.isBoss) {
    spawns.push({ at: t + 0.6, wave: p.waves + 1, archetype: world.boss.archetype, armored: false, elite: true, boss: true });
  }

  return { params: p, spawns, totalWaves: p.waves + (p.isBoss ? 1 : 0) };
}

/** One marching monster. */
export function makeEnemy(spawn, params, world, index) {
  const rng = mulberry32(hash(world.id, params.stage, 'e', index));
  const boss = spawn.boss;
  return {
    id: `${index}`,
    archetype: spawn.archetype,
    boss,
    armored: spawn.armored,
    elite: spawn.elite,
    wave: spawn.wave,
    t: 0,
    speed: params.speed * (boss ? 0.55 : 1) * (0.92 + rng() * 0.16),
    hp: boss ? params.boss.hp : spawn.armored ? 2 : 1,
    maxHp: boss ? params.boss.hp : spawn.armored ? 2 : 1,
    sizeMul: boss ? 2.1 : spawn.elite ? 1.22 : 1,
    phase: rng() * 6.28,
    blinkAt: 2 + rng() * 4,
    blink: 0,
    hitFlash: 0,
    dying: 0,
    recoil: 0,
    alive: true,
  };
}
