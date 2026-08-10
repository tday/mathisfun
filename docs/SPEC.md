# Game Specification

The rules of Monster Math Defenders, stated precisely enough to implement or
argue with. Numbers live in `js/data/tuning.js`; this file explains *why* they
are what they are.

---

## 1. Premise

Monsters march along a path toward the player's castle. The player answers maths
questions. **A correct answer defeats the front monster; nothing else does.**

The hero and the monsters become visibly stronger as the grade band rises, but
that is entirely cosmetic. There are no character stats, no damage numbers, no
levelling that affects outcomes. This is the central design commitment: progress
comes from maths, never from grinding.

---

## 2. Structure

| Unit | Count | Notes |
| --- | --- | --- |
| Grade bands | 7 | Pre-K, K, 1st, 2nd, 3rd, 4th, 5th |
| Worlds per band | 2 | 14 worlds total, each with its own palette and enemy pool |
| Stages per world | 10 | Stage 10 is a boss castle |
| Stages total | 140 | All computed from `(world, stage)`, none authored |

### Unlock rules

Derived from stars only:

- Stage *n* opens when stage *n−1* has at least one star.
- **World 1 of every band is always open.** A 3rd grader must never grind through
  Pre-K to reach their own level, and a child who wants easier practice can drop
  back at any time.
- World 2 of a band opens when world 1's boss is cleared.

---

## 3. The growth-mindset rules

These are requirements, not polish. Any change that violates one is a
regression, whatever else it improves.

**Effort pays, not just correctness.** Coins are awarded on every *attempt*,
right or wrong. A child who finds the maths hard still accumulates the currency
that buys them more room for mistakes.

**Coins survive a lost stage.** Losing costs progress on that stage and nothing
else. The fail screen says so explicitly.

**There is no timer.** The marching monster is the only pressure. A child who
needs thirty seconds to count on their fingers can take thirty seconds.

**A wrong answer costs zero hearts.** It only lets the monsters keep walking.
Hearts are lost to monsters reaching the gate, never to being wrong.

**Nobody gets stuck.** Miss once → an encouraging line plus a hint written for
that exact question. Miss twice → the answer is revealed and tapping it
continues. Attempt coins are paid either way.

**Failure is gentle.** The "wrong" sound is two soft descending sine notes, never
a buzzer. Wrong answers dim and strike through in amber; there is no red X
anywhere in the game.

**No death spiral.** A monster that reaches the gate costs one heart and then
*despawns*. Monsters cannot pile up and drain five hearts in five seconds.

**Perseverance is rewarded structurally.** See stars, below.

**Progress is measured against the child's own past.** The results screen
compares to their previous best on that stage, never to a perfect score.

---

## 4. Combat

- Enemies spawn on a deterministic schedule, marching a seeded spline path as a
  single progress value `t ∈ [0,1]`.
- One question is live at a time, targeting the front-most enemy.
- Correct → the hero fires, the enemy poofs, coins fly to the counter.
- Armoured monsters (a helm) take **two** correct answers. They appear from stage
  6 in 1st grade and above.
- Elite variants (gold badge) are cosmetic-plus-slightly-larger, in world 2 of
  each band from stage 4.
- Boss (stage 10): HP = `4 + band + worldIndex`, a visible health bar, minions
  alongside, and a recoil animation per hit.
- If no monster is on screen, a correct answer still pays and the hero fires a
  practice shot. Engagement never stalls waiting for a spawn.

### Stage parameters

Derived in `scenes/waves.js` from the stage number:

| Parameter | Range |
| --- | --- |
| Waves | 2–4 (boss stages: 3 + boss) |
| Enemies per wave | 2–8 |
| March speed | Base × stage factor × band factor (younger bands march slower) |
| Spawn gap | 7.0s → 4.2s across stages 1–10 |
| Armoured share | 25% once gated in |

---

## 5. Economy

Two currencies, deliberately separate.

### Coins — durability

| Event | Coins |
| --- | --- |
| Any attempt | +2 |
| Correct bonus | +3 (so a first-try correct answer is 5) |
| Streak bonus | +1 per consecutive correct, capped at +5 |
| Boss hit | ×2 |
| Stage clear | +10 |

| Purchase | Cost |
| --- | --- |
| Shield (absorbs one gate breach) | 20 |
| Refill one heart, mid-stage | 30 |
| Permanent 4th heart | 200 |
| Permanent 5th heart | 400 |

Hearts refill free at the start of every stage.

### Tokens — collection, and a maths lesson

Capsule pulls are priced in **tokens**, not coins, for a specific reason: coins
run into the hundreds, and "you have 247, it costs 25" is not arithmetic a
five-year-old can do. Tokens stay in single digits.

| Event | Tokens |
| --- | --- |
| Stage clear | +1 |
| Three-star clear | +1 more |
| Duplicate figure | +1 back |
| Capsule cost | −3 |

The machine makes the spend visible: tokens are shown as **countable objects**,
the ones about to be spent are greyed out, and the subtraction is worked through
on screen — `5 − 3 = 2` — before and after the pull. Spending is the exercise.

No real money exists anywhere in the game.

---

## 6. Stars

```
1★   cleared
2★   cleared with at least half your hearts
3★   cleared with all hearts
+1★  (max 3) if every question was eventually answered correctly
```

That last line is the important one. "Eventually correct" counts retries in full
but *not* answers that had to be revealed. A child who misses often but always
works their way to the right answer can still earn three stars — perseverance is
worth as much as accuracy.

---

## 7. Curriculum

Two worlds per band. Operand ranges widen with the stage; harder sub-forms gate
in at thresholds; earlier skills persist as review.

| Band | World 1 | World 2 |
| --- | --- | --- |
| Pre-K | Count 1–10, shape matching | More/fewer, biggest/smallest |
| Kindergarten | Ten-frames to 20, counting | ± within 5 with objects, one more/less |
| 1st | ± within 10 → 20 (sums >10 from stage 4) | Missing addend, place value, compare 2-digit |
| 2nd | ± within 100 (regrouping from stage 5), skip counting | Repeated addition → arrays → × |
| 3rd | × facts (2·5·10 → 3·4 → 6·7·8·9 from stage 6) | ÷ facts, identifying fractions |
| 4th | Multi-digit × (2×1 → 3×1 → 2×2), ÷ with remainders | Fraction compare/equivalence, decimals |
| 5th | Fraction ± (like → unlike from stage 5) | Decimal ops, ×/÷ by 10, order of operations |

### Distractors

Wrong answers model **real mistakes**, not random numbers — that is what makes a
multiple-choice question diagnostic rather than a coin flip:

| Strategy | Example |
| --- | --- |
| Off by one/two | counting slips, all ages |
| Wrong operation | 7 + 6 → 1 |
| Dropped carry | 47 + 38 → 75 |
| Digit swap | 13 → 31 |
| Neighbour fact | 6 × 7 → 48 (6×8) or 35 (5×7) |
| Fraction straight-across | 1/2 + 1/4 → 2/6 |
| Longer decimal is bigger | 0.45 > 0.5 |
| Left to right | 3 + 4 × 2 → 14 |

Guaranteed by `questions.js` and enforced by the audit: exactly one correct
choice, no duplicates, **no negative numbers**, no zero denominators, and the
correct answer's position uniformly distributed within each choice count.

---

## 8. Accessibility, and children who cannot read yet

The youngest players are the primary users, and they cannot read. Rules:

**No question may hinge on decoding a word.**

- Sequence questions use a **number track with a gap** — `4 5 6 ?` — never the
  words "before" and "after". Those two words look identical to a pre-reader but
  produce opposite answers.
- Comparison questions carry a drawn **up/down arrow chip**. Pre-K asks one
  direction only, so the convention is learned before it is varied; Kindergarten
  introduces the opposite with the icon already familiar.
- Answer choices are numerals or drawn shapes, never words a child must read.

**Every control is a drawn icon, not an emoji.** Emoji coverage varies by device
and font; a control that renders as an empty box is unrecoverable for a
five-year-old.

**Visual supports are age-matched.** Ten-frames are a Kindergarten counting tool
and are not used above it — past that they are clutter that obscures the strategy
being taught. Number lines are framed to the numbers actually in play, never a
fixed 0–20.

**The audit enforces these.** A Pre-K or K prompt with a direction word and no
icon, before/after wording, or a ten-frame above Kindergarten fails the build.

Also: minimum 48px touch targets, `aria-live` feedback, real focusable buttons,
screen-reader labels on icon controls, and `prefers-reduced-motion` respected.

**Touch is locked down.** Pinch-zoom, iOS gesture events, double-tap zoom,
modifier-zoom and long-press selection are blocked, and the viewport is snapped
back if anything shifts it. Small children rest palms on the screen and tap with
several fingers; a zoomed-in game is not something they can undo. Scrolling and
the OS's own accessibility zoom are deliberately left alone.

---

## 9. Copy

- Pre-readers get ≤3-word lines; older bands get a full sentence.
- Encouragement rotates from pools and never repeats consecutively.
- Hints are generated *with* the question, so they always reference its actual
  numbers rather than a generic strategy.
- Nothing in the game says "wrong". The vocabulary is "not yet", "good try",
  "mistakes grow your brain".

All copy lives in `js/data/tuning.js`.
