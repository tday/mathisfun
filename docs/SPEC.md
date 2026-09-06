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

The progression follows **Illustrative Mathematics K–5**, unit by unit and in
IM's own order. That choice is not cosmetic: IM builds each idea out of a
specific representation — a collection you count however it is arranged, a number
bond, base-ten blocks, a number line, an array, a fraction on a line — and this
game asks its questions *through those representations* rather than around them.
A child who plays a world and then meets the same unit in class should recognise
the pictures.

Pre-K has no IM curriculum of its own, so its two worlds are the readiness IM
Kindergarten unit 1 assumes: counting a collection, and comparing two.

| Band | World 1 | World 2 |
| --- | --- | --- |
| Pre-K | *Math in Our World* — count a collection in any arrangement, match shapes | *Numbers 1–10* — more/fewer, biggest/smallest, counting on |
| Kindergarten | *IM K, Units 1–3* — ten-frames, numeral ↔ quantity, flat shapes | *IM K, Units 4–6* — add/subtract with objects, number bonds, numbers to 20 |
| 1st | *IM 1, Units 1–3* — within 20, doubles, make-ten, unknowns anywhere, data | *IM 1, Units 4–6* — base ten to 99, adding within 100, length in units |
| 2nd | *IM 2, Units 1–4* — within 100 with regrouping, the number line, measuring, data | *IM 2, Units 5–9* — numbers to 1,000, money, time, odd/even, equal groups |
| 3rd | *IM 3, Units 1–3* — introducing multiplication, area, within 1,000 | *IM 3, Units 4–7* — division, fractions as numbers on a line, perimeter |
| 4th | *IM 4, Units 1, 4, 6* — factors and multiples, place value, multi-digit × ÷ | *IM 4, Units 2, 3, 5, 7* — fraction equivalence, multiplicative comparison, angles |
| 5th | *IM 5, Units 1–3* — volume, fraction multiplication and division | *IM 5, Units 4–7* — multi-digit × ÷, decimal operations, coordinate plane |

The unit name and the IM citation are shown on the world card and in the map
header, so a parent or teacher can line a world up against the classroom
sequence. Seventy skills are in rotation across the fourteen worlds.

### Variety

A stage of individually-good questions still reads as a worksheet if it asks the
same thing five times running, so variety is a budget the audit enforces:

- each world draws on **6–8 skills**, and the ramp is told which skills were
  asked recently so it can steer away from them
- an exact repeat of a question still in the recent window is re-rolled
- collections are drawn in a row, a grid, a scatter or a dice face, from a pool
  of ten countable objects, because IM asks children to count the same quantity
  arranged several ways on purpose
- budget: the same skill back-to-back at most 15% of the time, an identical
  question repeated within a stage at most 12%. Currently ~5% and ~3%.

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

The youngest players are the primary users, and they cannot read.

**Below 2nd grade, no question contains a letter.** Not "keep the words simple" —
none at all, in the prompt or on any answer button. Pre-K, Kindergarten and 1st
grade are asked entirely through a picture, a drawn icon chip and mathematical
symbols:

- Counting is a collection and a `?`. The answers are numerals.
- The converse — numeral in, quantity out — is a numeral card, `= ?`, and answer
  buttons that are **drawn groups of dots** rather than words.
- Shape matching is drawn as `[shape] = [?]`, so the question needs no prompt.
- Sequence questions use a **number track with a gap** — `4 5 ? 7` — never the
  words "before" and "after". Those two words look identical to a pre-reader but
  produce opposite answers.
- Comparison carries a drawn **up/down arrow chip** and no prompt at all. Pre-K
  asks one direction only, so the convention is learned before it is varied.
- Place value is **base-ten blocks**, in both directions: blocks → numeral, and
  numeral → blocks as drawn answer buttons.
- Addition, subtraction and unknown-position equations are written in symbols
  (`8 = 3 + ?`), which are not words.

Hints and explanations are still written in English. They are for the adult
sitting alongside, and nothing in the game requires reading one: a second miss
reveals the answer and tapping it continues.

**Every control is a drawn icon, not an emoji.** Emoji coverage varies by device
and font; a control that renders as an empty box is unrecoverable for a
five-year-old.

**Visual supports are age-matched.** Ten-frames are a Kindergarten counting tool
and are not used above it — past that they are clutter that obscures the strategy
being taught, so 1st grade's make-ten is shown as two hops on a number line
instead. Number lines are framed to the numbers actually in play and label only
as many ticks as fit.

**The audit enforces all of it.** A letter in any band-0-to-2 prompt or visible
answer, a ten-frame above Kindergarten, or a visual spec `fx.js` could not draw
fails the build.

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
