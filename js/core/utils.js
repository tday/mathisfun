// Seeded RNG + math/array helpers. Zero DOM dependencies.

// String/number hash -> 32-bit uint (FNV-1a style)
export function hash(...parts) {
  let h = 0x811c9dc5;
  const s = parts.join('|');
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

// mulberry32 - fast, decent seeded PRNG. Returns fn -> [0,1)
export function rng(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Random int in [lo, hi] inclusive
export const ri = (r, lo, hi) => lo + Math.floor(r() * (hi - lo + 1));
export const pick = (r, arr) => arr[Math.floor(r() * arr.length)];

export function weightedPick(r, items, weightFn) {
  let total = 0;
  const ws = items.map((it) => { const w = Math.max(0, weightFn(it)); total += w; return w; });
  if (total <= 0) return items[0];
  let roll = r() * total;
  for (let i = 0; i < items.length; i++) { roll -= ws[i]; if (roll <= 0) return items[i]; }
  return items[items.length - 1];
}

export function shuffle(r, arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export const easeOut = (t) => 1 - (1 - t) * (1 - t);
export const easeInOut = (t) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);

// Catmull-Rom spline through points [{x,y},...] -> sampled polyline with arc-length table.
// Returns { at(t) -> {x,y,angle} } where t in [0,1] is distance along the curve.
export function makePath(points) {
  const P = points;
  const samples = [];
  const seg = (p0, p1, p2, p3, t) => {
    const t2 = t * t, t3 = t2 * t;
    return {
      x: 0.5 * ((2 * p1.x) + (-p0.x + p2.x) * t + (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 + (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3),
      y: 0.5 * ((2 * p1.y) + (-p0.y + p2.y) * t + (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 + (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3),
    };
  };
  for (let i = 0; i < P.length - 1; i++) {
    const p0 = P[Math.max(0, i - 1)], p1 = P[i], p2 = P[i + 1], p3 = P[Math.min(P.length - 1, i + 2)];
    const N = 16;
    for (let j = 0; j < N; j++) samples.push(seg(p0, p1, p2, p3, j / N));
  }
  samples.push({ x: P[P.length - 1].x, y: P[P.length - 1].y });
  // arc length table
  const lens = [0];
  for (let i = 1; i < samples.length; i++) {
    const dx = samples[i].x - samples[i - 1].x, dy = samples[i].y - samples[i - 1].y;
    lens.push(lens[i - 1] + Math.hypot(dx, dy));
  }
  const total = lens[lens.length - 1] || 1;
  return {
    length: total,
    points: samples,
    at(t) {
      const d = clamp(t, 0, 1) * total;
      // binary search
      let lo = 0, hi = lens.length - 1;
      while (lo < hi) { const mid = (lo + hi) >> 1; if (lens[mid] < d) lo = mid + 1; else hi = mid; }
      const i = Math.max(1, lo);
      const span = lens[i] - lens[i - 1] || 1;
      const f = (d - lens[i - 1]) / span;
      const a = samples[i - 1], b = samples[i];
      return {
        x: lerp(a.x, b.x, f),
        y: lerp(a.y, b.y, f),
        angle: Math.atan2(b.y - a.y, b.x - a.x),
      };
    },
  };
}

// Format helpers used by generators (shared, DOM-free)
export const gcd = (a, b) => (b === 0 ? a : gcd(b, a % b));

// Round to avoid float noise like 0.30000000000000004
export const round2 = (v) => Math.round(v * 100) / 100;
