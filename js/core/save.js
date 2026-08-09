// Versioned localStorage save with corrupt-JSON recovery and a private-mode
// in-memory fallback (iOS private browsing throws on setItem).

const KEY = 'mif.save';
const BAK = 'mif.save.bak';
const VERSION = 1;

export let memoryMode = false;

function defaults() {
  return {
    v: VERSION,
    coins: 0,
    maxHearts: 3,
    shields: 0,
    stars: {},        // worldId -> [10 stage stars]
    best: {},         // worldId -> [10 best defeated-counts]
    collection: {},   // figureId -> count
    stats: { attempts: 0, correct: 0, bestStreak: 0, perSkill: {} },
    settings: { muted: false, music: 0.6, sfx: 0.9 },
    last: null,       // 'g0w0/3'
  };
}

function migrate(data) {
  // future migrations switch on data.v; today: fill any missing keys
  const d = defaults();
  const out = { ...d, ...data, v: VERSION };
  out.stats = { ...d.stats, ...(data.stats || {}) };
  out.settings = { ...d.settings, ...(data.settings || {}) };
  for (const k of ['stars', 'best', 'collection']) if (typeof out[k] !== 'object' || !out[k]) out[k] = {};
  return out;
}

function read(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (typeof data !== 'object' || data === null) return null;
    return data;
  } catch { return null; }
}

export const save = (() => {
  let data = read(KEY);
  if (!data) data = read(BAK);
  if (!data) data = defaults();
  return migrate(data);
})();

export function persist() {
  try {
    const raw = JSON.stringify(save);
    try { const cur = localStorage.getItem(KEY); if (cur) localStorage.setItem(BAK, cur); } catch { /* ignore */ }
    localStorage.setItem(KEY, raw);
    memoryMode = false;
  } catch {
    memoryMode = true; // private mode / quota: play on, warn once in UI
  }
}

export function resetAll() {
  try { localStorage.removeItem(KEY); localStorage.removeItem(BAK); } catch { /* ignore */ }
  const d = defaults();
  for (const k of Object.keys(save)) delete save[k];
  Object.assign(save, d);
  persist();
}

// ---- helpers -------------------------------------------------------------

export function addCoins(n) { save.coins = Math.max(0, save.coins + n); }

export function recordAttempt(skill, correct) {
  save.stats.attempts++;
  if (correct) save.stats.correct++;
  const ps = save.stats.perSkill;
  // cap tracked skills so the save can't grow unboundedly
  if (!ps[skill] && Object.keys(ps).length >= 60) return;
  ps[skill] = ps[skill] || { a: 0, c: 0 };
  ps[skill].a++;
  if (correct) ps[skill].c++;
}

export function setStageResult(worldId, stage, stars, defeated) {
  if (!save.stars[worldId]) save.stars[worldId] = Array(10).fill(0);
  if (!save.best[worldId]) save.best[worldId] = Array(10).fill(0);
  save.stars[worldId][stage - 1] = Math.max(save.stars[worldId][stage - 1], stars);
  const prevBest = save.best[worldId][stage - 1];
  save.best[worldId][stage - 1] = Math.max(prevBest, defeated);
  return prevBest;
}

export function addFigure(figId) {
  const had = (save.collection[figId] || 0) > 0;
  save.collection[figId] = (save.collection[figId] || 0) + 1;
  return !had; // true if new
}
