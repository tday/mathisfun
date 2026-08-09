// Progress persistence. localStorage only — the whole game is static files.
//
// Everything is defensive: iOS private mode throws on setItem, and a half-written
// or hand-edited save must never hard-crash a child's game. Worst case we fall
// back to an in-memory save and tell the player once.

const KEY = 'mmd.save';
const BAK = 'mmd.save.bak';
const VERSION = 1;

export function blankSave() {
  return {
    v: VERSION,
    coins: 0,
    tokens: 3,        // enough for one capsule pull straight away
    maxHearts: 3,
    shields: 0,
    stars: {},        // worldId -> [10] star counts, 0 = unplayed
    best: {},         // worldId -> [10] best "answered correctly" counts
    collection: {},   // figureId -> copies owned
    stats: { attempts: 0, correct: 0, bestStreak: 0, perSkill: {} },
    settings: { muted: false, music: 0.55, sfx: 0.9 },
    last: null,       // "worldId/stage" for Continue
    seenIntro: false,
  };
}

export class Save {
  constructor() {
    this.memoryOnly = false;
    this.data = this._load();
    this._pending = null;
  }

  _read(key) {
    try {
      return window.localStorage.getItem(key);
    } catch {
      this.memoryOnly = true;
      return null;
    }
  }

  _load() {
    const raw = this._read(KEY) || this._read(BAK);
    if (!raw) return blankSave();
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return blankSave(); // corrupt: start clean rather than explode
    }
    if (!parsed || typeof parsed !== 'object') return blankSave();
    return this._migrate(parsed);
  }

  _migrate(data) {
    const base = blankSave();
    // Shallow-merge onto a fresh blank so any missing/renamed field self-heals.
    const out = {
      ...base,
      ...data,
      stats: { ...base.stats, ...(data.stats || {}) },
      settings: { ...base.settings, ...(data.settings || {}) },
      stars: data.stars && typeof data.stars === 'object' ? data.stars : {},
      best: data.best && typeof data.best === 'object' ? data.best : {},
      collection: data.collection && typeof data.collection === 'object' ? data.collection : {},
    };
    out.stats.perSkill = out.stats.perSkill && typeof out.stats.perSkill === 'object' ? out.stats.perSkill : {};
    out.coins = Number.isFinite(out.coins) ? Math.max(0, Math.floor(out.coins)) : 0;
    out.tokens = Number.isFinite(out.tokens) ? Math.max(0, Math.floor(out.tokens)) : 0;
    out.maxHearts = Math.min(5, Math.max(3, Math.floor(out.maxHearts) || 3));
    out.shields = Math.max(0, Math.floor(out.shields) || 0);
    out.v = VERSION;
    return out;
  }

  /** Debounced write — stage results and shop buys can fire several in a row. */
  save() {
    if (this._pending) return;
    this._pending = setTimeout(() => {
      this._pending = null;
      this.flush();
    }, 200);
  }

  flush() {
    if (this._pending) {
      clearTimeout(this._pending);
      this._pending = null;
    }
    try {
      const json = JSON.stringify(this.data);
      const prev = window.localStorage.getItem(KEY);
      if (prev) window.localStorage.setItem(BAK, prev);
      window.localStorage.setItem(KEY, json);
    } catch {
      this.memoryOnly = true;
    }
  }

  reset() {
    this.data = blankSave();
    try {
      window.localStorage.removeItem(KEY);
      window.localStorage.removeItem(BAK);
    } catch { /* memory-only mode */ }
  }

  // ------------------------------------------------------------- progress API

  starsFor(worldId) {
    if (!this.data.stars[worldId]) this.data.stars[worldId] = new Array(10).fill(0);
    return this.data.stars[worldId];
  }

  bestFor(worldId) {
    if (!this.data.best[worldId]) this.data.best[worldId] = new Array(10).fill(0);
    return this.data.best[worldId];
  }

  /** Records a stage result, keeping the best star count ever earned. */
  recordStage(worldId, stage, stars, correctCount) {
    const arr = this.starsFor(worldId);
    const i = stage - 1;
    arr[i] = Math.max(arr[i] || 0, stars);
    const b = this.bestFor(worldId);
    b[i] = Math.max(b[i] || 0, correctCount);
    this.data.last = `${worldId}/${stage}`;
    this.save();
  }

  totalStars() {
    let n = 0;
    for (const arr of Object.values(this.data.stars)) for (const s of arr) n += s || 0;
    return n;
  }

  addCoins(n) {
    this.data.coins = Math.max(0, this.data.coins + n);
    this.save();
  }

  spendCoins(n) {
    if (this.data.coins < n) return false;
    this.data.coins -= n;
    this.save();
    return true;
  }

  /** Every attempt counts — this is the growth-mindset ledger, not a score. */
  logAttempt(skill, correct) {
    const s = this.data.stats;
    s.attempts++;
    if (correct) s.correct++;
    const per = (s.perSkill[skill] ||= { a: 0, c: 0 });
    per.a++;
    if (correct) per.c++;
    // Cap the per-skill map so a very long-lived save can't creep past quota.
    const keys = Object.keys(s.perSkill);
    if (keys.length > 80) delete s.perSkill[keys[0]];
  }

  addTokens(n) {
    this.data.tokens = Math.max(0, (this.data.tokens || 0) + n);
    this.save();
  }

  spendTokens(n) {
    if ((this.data.tokens || 0) < n) return false;
    this.data.tokens -= n;
    this.save();
    return true;
  }

  addFigure(id) {
    this.data.collection[id] = (this.data.collection[id] || 0) + 1;
    this.save();
    return this.data.collection[id];
  }

  hasFigure(id) {
    return (this.data.collection[id] || 0) > 0;
  }
}
