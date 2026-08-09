// Every game-feel number + all encouragement copy, in one editable place.
// The economy rewards ATTEMPTS: trying always pays, correctness pays a bonus.

export const COINS = {
  attempt: 2,        // paid for every answer, right or wrong
  correctBonus: 3,   // extra when correct (so correct = 5)
  streakStep: 1,     // +1 per consecutive correct...
  streakCap: 5,      // ...capped here
  bossMult: 2,       // boss hits pay double
  dupRefund: 15,     // duplicate gacha figure converts to coins
  attemptCapPerQuestion: 3, // attempt coins paid at most this many times per question
};

export const PRICES = {
  shield: 20,
  heartRefill: 30,
  heart4: 200,
  heart5: 400,
  gachaPull: 25,
};

export const HEARTS = { start: 3, absMax: 5 };

export const FLOW = {
  warmupQuestions: 2,   // first questions of a stage draw from the easiest tier
  easeMax: 2,           // hidden rubber-band level
  easeUpAfterMisses: 2, // consecutive misses that raise ease
  glowAfterMisses: 2,   // misses before the correct answer glows
  newQuestionDelay: 0.8,
  gateGraceSec: 1.2,    // brief pause after a gate hit before march resumes
};

export const MARCH = {
  crossSeconds: 78,          // base seconds for an enemy to walk the whole path at stage 1
  stageSpeedup: 0.028,       // fraction faster per stage
  bandSpeedup: 0.035,        // fraction faster per band
  bossCrossSeconds: 150,
  bossKnockback: 0.12,       // path fraction pushed back per hit
  bossRetreatTo: 0.25,       // where the boss respawns after breaching the gate
};

export const WAVES = {
  base: 2,               // waves at stage 1 (grows to 4)
  perWaveBase: 2,        // enemies in first wave
  spawnGapFrom: 7.5,     // seconds between spawns early
  spawnGapTo: 4.5,       // ...late stages
  armoredFromStage: 6,   // knights appear from this stage...
  armoredMinBand: 1,     // ...for K and up
  armoredShare: 0.25,
  bossBaseHp: 4,
};

export const STARS = {
  twoStarHearts: 0.5,    // fraction of hearts remaining for 2 stars
  // 3 stars = all hearts, OR the perseverance promotion (every question
  // eventually answered correctly - retries count fully)
};

// ---------------- encouragement copy -------------------------------------
// short = for pre-readers (bands 0-1): <= 3 words, always paired with an icon
export const PRAISE = {
  correct: [
    'Great thinking!', 'You got it!', 'Brain power!', 'Amazing work!',
    'Super solve!', 'Yes! Nailed it!', 'Wow, nice one!', 'Math star!',
  ],
  correctShort: ['You did it!', 'Yay!', 'Super!', 'Wow!', 'Nice!'],
  effort: [
    'Good try — look again!', 'Mistakes help your brain grow!', 'So close! Try once more!',
    'Not yet — you can do this!', 'Great effort! Check again!', 'Keep going — trying is winning!',
  ],
  effortShort: ['Try again!', 'Almost!', 'Keep going!', 'You can do it!'],
  streak: ['On fire!', 'Unstoppable!', 'Streak master!', 'Whoa, amazing!', 'Combo!'],
  reveal: [
    'Here it is — tap it to keep going!', 'This one is the answer — tap it!',
    'Look: this is it. Tap to continue!',
  ],
};

export const RESULT_LINES = {
  win: [
    'You protected the castle!', 'The monsters are toast... cute toast!',
    'Victory! Your brain did that!', 'The castle is safe, hero!',
  ],
  winPerfect: ['FLAWLESS! Not a single scratch!', 'Perfect defense! Incredible!'],
  lose: [
    'The castle needs a rest — but look what you earned!',
    'Not this time — every try made you stronger!',
    'The monsters got through... but you kept ALL your coins!',
  ],
  growth: [
    'Your brain grows every time you practice!',
    'Trying hard is how heroes are made.',
    'Every mistake teaches your brain something new!',
    'Practice makes your brain stronger — like a muscle!',
    'You earned coins for every single try. Effort pays!',
  ],
};

// Rotating picker that avoids immediate repeats
const lastPick = new Map();
export function line(pool) {
  const arr = Array.isArray(pool) ? pool : [pool];
  if (arr.length === 1) return arr[0];
  const last = lastPick.get(arr);
  let i = Math.floor(Math.random() * arr.length);
  if (i === last) i = (i + 1) % arr.length;
  lastPick.set(arr, i);
  return arr[i];
}
