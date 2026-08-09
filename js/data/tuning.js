// Every game-feel number and every line of encouragement copy lives here, so
// the whole difficulty and reward curve can be tuned from one file.
//
// The guiding rule: effort is what pays. Coins come from *attempts*, hearts are
// generous, and nothing in this file punishes a wrong answer.

export const ECONOMY = {
  coinsPerAttempt: 2,     // paid whether the answer is right or wrong
  coinsCorrectBonus: 3,   // so a first-try correct answer is worth 5
  streakBonusPerStep: 1,  // +1 per consecutive correct...
  streakBonusMax: 5,      // ...capped, so streaks are a bonus not a requirement
  bossMultiplier: 2,
  duplicateFigureRefund: 15,
  stageClearBonus: 10,
};

export const PRICES = {
  shield: 20,
  heartRefill: 30,
  heart4: 200,
  heart5: 400,
  capsulePull: 25,
};

export const COMBAT = {
  baseSpeed: 0.028,        // path fraction per second at stage 1
  speedPerStage: 0.05,     // +5% per stage
  bandSpeed: [0.72, 0.8, 0.88, 0.95, 1.0, 1.06, 1.12], // younger kids get more time
  gapStart: 7.0,           // seconds between spawns at stage 1
  gapEnd: 4.2,             // ...at stage 10
  armorFromStage: 6,
  armorFromBand: 2,
  armorShare: 0.25,
  bossBaseHp: 4,
  projectileSpeed: 1300,   // px/sec
};

/** Stars reward finishing and perseverance, never flawlessness. */
export function starsFor({ won, heartsLeft, maxHearts, allEventuallyCorrect }) {
  if (!won) return 0;
  let stars = 1;
  if (heartsLeft >= maxHearts) stars = 3;
  else if (heartsLeft >= Math.ceil(maxHearts / 2)) stars = 2;
  // Perseverance promotion: if every question was eventually answered correctly,
  // a child who needed several tries still earns the extra star.
  if (allEventuallyCorrect) stars = Math.min(3, stars + 1);
  return stars;
}

// ------------------------------------------------------------------ copy pools

export const COPY = {
  correct: [
    'Great thinking!', 'You got it!', 'Brain power!', 'Nice work!', 'Exactly right!',
    'Sharp!', 'That\'s it!', 'Well spotted!',
  ],
  correctYoung: ['Yes!', 'Great!', 'Wow!', 'Nice!', 'Yay!'],
  effort: [
    'Good try — look again!', 'Not yet — you\'re close!', 'Mistakes grow your brain!',
    'Keep going, you\'ve got this!', 'Nearly! Try once more.', 'That was a good guess!',
  ],
  effortYoung: ['Try again!', 'So close!', 'Keep going!', 'Almost!'],
  streak: ['On fire!', 'Unstoppable!', 'Amazing streak!', 'Super brain!'],
  reveal: [
    'Here it is — now you know it!', 'This one\'s tricky. Now you\'ve seen it!',
    'Remember this one for next time!',
  ],
  stageWin: ['Castle defended!', 'You did it!', 'Monsters tucked in!', 'Victory!'],
  stageLose: [
    'The monsters got through — but you kept every coin!',
    'Good effort! Your brain grew. Try again?',
    'So close! Every try makes you stronger.',
  ],
};

/** Rotating picker that avoids repeating the previous line. */
export function makeRotator(pool) {
  let last = -1;
  return (rand = Math.random) => {
    if (pool.length === 1) return pool[0];
    let i = Math.floor(rand() * pool.length);
    if (i === last) i = (i + 1) % pool.length;
    last = i;
    return pool[i];
  };
}

export const say = {
  correct: makeRotator(COPY.correct),
  correctYoung: makeRotator(COPY.correctYoung),
  effort: makeRotator(COPY.effort),
  effortYoung: makeRotator(COPY.effortYoung),
  streak: makeRotator(COPY.streak),
  reveal: makeRotator(COPY.reveal),
  stageWin: makeRotator(COPY.stageWin),
  stageLose: makeRotator(COPY.stageLose),
};

/** Pre-readers get very short lines; older kids get a full sentence. */
export function praise(band, streak = 0) {
  if (streak >= 4) return say.streak();
  return band <= 1 ? say.correctYoung() : say.correct();
}

export function encourage(band) {
  return band <= 1 ? say.effortYoung() : say.effort();
}
