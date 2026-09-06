# Architecture

How Monster Math Defenders is put together, and why. The README covers what the
game *is* and how to run it; this file is for someone about to change it.

---

## The constraint that shapes everything

**No build step, no dependencies, no backend.** The repo is the deployable
artifact. That is not minimalism for its own sake — it is what lets a static host
serve this and a contributor clone it and open a file. Everything below follows
from it:

- ES modules loaded directly by the browser, so a broken import path is a runtime
  error rather than a compile error. The smoke suite fails on *any* console
  error specifically to catch that.
- No transpiler, so the source must be language features the target browsers
  already have.
- All art and audio generated in code, because there is nothing to bundle.

---

## Module layering

Imports flow one way only:

```
core  →  (gfx, audio, data)  →  ui  →  scenes  →  main
```

```
js/core/     engine, screen, save, utils, touchlock   — no game knowledge
js/gfx/      toybox, sprites-units, sprites-world, sprite, palettes, fx
js/audio/    audio, music
js/data/     worlds, questions, gen-early/mid/upper, tuning   ← DOM-free
js/ui/       dom, hud, questionPanel, panels
js/scenes/   title, worldSelect, map, play, waves, results, gallery
js/main.js   boot + scene registry
```

**The rule that matters: `js/data/` never touches the DOM.** That is what makes
the entire curriculum runnable — and therefore auditable — in plain Node. If you
add a skill and reach for `document`, you have broken the property that lets
`tools/audit-questions.mjs` check 16,800 questions in ten seconds. Emit
declarative data instead and let `fx.js` draw it (see *Question visuals* below).

There is no dependency-injection framework. A single plain object is threaded
through everything:

```js
game = { screen, save, audio, sprites, engine, debug }
```

Scenes receive it in `enter(params, game)`. That is the whole wiring story.

---

## The loop and scenes

`core/engine.js` runs a **fixed 60 Hz update accumulator** inside
`requestAnimationFrame`:

- `update(1/60)` runs zero or more times per frame; `render()` runs once.
- Frame delta is clamped to 100 ms, so a backgrounded tab cannot fast-forward the
  invasion on return.
- Catch-up is capped at 5 steps, then the accumulator is dropped — better a
  visible hitch than a death spiral.

Fixed-step is not a stylistic choice. It makes enemy march speed identical on a
60 Hz laptop, a 120 Hz phone, and in a headless test, which is what allows the
suite to play a stage deterministically.

A scene is a plain object; every field except `render` is optional:

```js
{ enter(params, game), exit(), update(dt), render(ctx, view), onPointer(type, x, y, e), onLayout(w, h), debugState(), debugQuestion() }
```

Scenes own an optional DOM subtree under `#ui`, built in `enter()` and torn down
in `exit()`. That is how canvas and HTML stay in lockstep with no global UI
state. `engine.go(name, params)` cross-fades: fade out → `exit()` → `enter()` →
fade in, swallowing pointer input mid-transition.

---

## Canvas and DOM split

There is no letterboxing. The canvas fills whatever box CSS gives it, and world
geometry is authored in **normalised 0..1 coordinates** mapped through the
current view — which is why the same stage reflows sensibly between portrait and
landscape instead of being letterboxed into a stamp.

The split is deliberate:

| Layer | Owns |
| --- | --- |
| Canvas | The board: path, monsters, hero, castle, projectiles, particles, boss bar |
| DOM overlay | Question card, answer buttons, HUD, all dialogs |

**The UI is real HTML on purpose.** Real `<button>` elements bring focus rings,
`aria-live` announcements, screen-reader labels, crisp text at any DPR, and
native touch sizing. Canvas buttons would have to reinvent all of it, badly. The
usual objection — syncing DOM to world coordinates — does not apply, because
everything in the overlay is screen-anchored. Anything world-anchored (floating
coins, HP pips) stays on the canvas.

`core/screen.js` caps device pixel ratio at 2 and re-applies context state after
every resize.

---

## Art pipeline

Characters are **procedural drawing functions**, not image files.

```
sprites-units.js  draw(ctx, opt)  in a 100×100 unit box, feet at y=96
        ↓
sprite.js         bake once → offscreen canvas at size × DPR → SpriteBank cache
        ↓
drawUnit()        one drawImage per frame, anchored at the feet
```

Baking is what makes this cheap: per-frame cost is a blit, not a few hundred path
operations. Cache keys quantise the requested size to 8px steps so a resize does
not explode the cache.

Two multipliers avoid drawing 14 worlds of art:

- **Palette mood shift.** Each world applies an HSL shift to the shared monster
  base colours (`palettes.js`), so the same eight archetypes cover every world.
- **Overlays.** `armored` adds a helm, `elite` adds a badge, hero tiers composite
  accessories. All at bake time, so variants cost nothing per frame.

Animation is transform-driven — `drawUnit` takes `squash`, `flip`, `alpha`,
`rot`, `lift`. Bounce and squash-and-stretch need no extra frames. Only blinking
is baked as a separate variant.

`toybox.js` is the shared vocabulary (`body`, `eye`, `mouth`, `blush`, `helm`…).
**Change the house style there, not in each character.** The flat-vs-shaded
switch was a change to `toybox.js` plus a mechanical sweep, precisely because
individual characters do not hard-code fills.

---

## Stages are computed, not authored

There are no 140 stage files. `scenes/waves.js` derives everything from
`(world, stage)` through a seeded RNG:

- `stageParams()` — wave count, enemies per wave, march speed, spawn gap,
  armoured share, boss HP
- `makeStagePath()` — control points → Catmull-Rom spline → arc-length lookup, in
  normalised coordinates
- `buildSpawns()` — the full spawn schedule up front

Enemies store a single `t ∈ [0,1]` along the path, so rotating the device just
remaps positions. Because every random draw is seeded on `(worldId, stage)`, a
stage is identical every time it is played — which is what makes it testable.

`Math.random` is confined to cosmetic particles. Anything that affects gameplay
goes through `mulberry32`.

---

## Questions

```
questions.js  RAMP[band][worldInBand] → weighted skill pick (anti-repeat applied)
      ↓       gen-early / gen-mid / gen-upper produce a raw question
      ↓       distractor toolkit + shuffle + validity guards
   Question { skill, prompt, srPrompt, promptIcon, visual, choices, answerIndex,
              answerValue, hint, explain }
```

The RAMP follows Illustrative Mathematics K–5 unit by unit; each world names the
IM units it covers (`worlds.js`), and that label is shown on the world card.
Difficulty lives in the RAMP's `params(stage)` functions — operand ranges widen,
harder sub-forms gate in at stage thresholds, skill weights shift so new skills
phase in while old ones persist as review.

Three invisible supports sit in front of it: the first two questions of any stage
are a warm-up, `easeLevel` (raised after repeated misses) shifts the effective
stage down, and `makeQuestion(..., { recent })` down-weights the skills asked in
the last four questions. `play.js` keeps that recent list and additionally
re-rolls a question whose prompt-and-visual signature is still in a 12-deep
window. The player never sees any of it; what they notice is that a stage stops
feeling like a worksheet.

### No reading below 2nd grade

Bands 0–2 are pre- and early readers, so **no question they are asked may contain
a letter** — not in the prompt, not on a visible answer button. That is a hard
constraint on `gen-early.js`, and the audit fails the build on a violation.

The second half of the rule is that **most of those questions have no prompt at
all**: where the picture asks the question, a lone `?` above it is one more thing
to decode. A prompt is emitted only when it *is* the question (`3 + 2 = ?`) or
when a `promptIcon` chip carries a direction the picture cannot. Where a symbol
does belong — the `=` in "which group has this many?" — it is drawn *inside* the
visual (`matchCard`) rather than floated above it.

Two fields exist to make that safe. `choiceDraw` turns answer buttons into
pictures, keeping the text as a screen-reader label only. `srPrompt` is a
never-rendered description used as the answer group's accessible name and its
`aria-live` announcement — the question visual is `aria-hidden`, so without it a
picture-only question would reach a screen reader with no name at all. The audit
rejects a question that has neither a visible prompt nor an `srPrompt`.

### Question visuals

Generators emit a **declarative spec**, never drawing code:

```js
visual: { kind: 'numberTrack', cells: [4, 5, 6, null], dir: 'fwd' }
```

`fx.js` owns the renderers. This is what keeps `data/` DOM-free and testable, and
it means the audit can validate a visual spec without a browser. Adding a visual
kind means adding a renderer in `fx.js` **and** a validity check in the audit.

---

## Save

`core/save.js`, `localStorage`, one versioned blob under 10 KB.

Everything is defensive because the failure modes are real: iOS private mode
throws on write (falls back to an in-memory save plus a one-time banner), and a
corrupt or hand-edited blob must never hard-crash a child's game (parse failure
starts fresh rather than throwing). `_migrate()` shallow-merges onto a blank
save, so a missing or renamed field self-heals instead of producing `undefined`
three screens later.

**Unlock state is derived, never stored.** Stars are the only source of truth;
`isStageUnlocked` / `isWorldUnlocked` compute from them. There is no way for
unlock flags to drift out of sync with progress, because they do not exist.

---

## Audio

`audio/audio.js` owns one `AudioContext`, created lazily on the first gesture
(mobile requires it, and iOS needs an actual source node started inside that
gesture). `audio/music.js` is a lookahead scheduler queueing notes ~150 ms ahead
of the audio clock — the only reliable way to get steady timing in a browser.

One non-obvious contract: **`playTheme()` records the request even when audio is
not yet unlocked**, and `unlock()` honours it. Scenes ask for their theme in
`enter()`, which for the title screen runs before any click has happened. Without
that record the request is silently dropped. See LEARNINGS.md — this shipped
broken once.

---

## Testing

Two suites, deliberately independent:

| Suite | Runs in | Catches |
| --- | --- | --- |
| `tools/audit-questions.mjs` | Plain Node | Everything about the maths: 16,800 questions, one correct choice each, plausible distractors, no negatives or zero denominators, answer position unbiased, no letters below 2nd grade, no ten-frames above K, every visual spec drawable, and the variety budget |
| `tools/e2e/run.mjs` | Playwright | Everything about the app: console errors, every scene, a full stage played to results, audio *level*, touch targets, zoom lock, save recovery, offline |
| `tools/e2e/qa-questions.mjs` | Playwright | Everything about how a question *presents*: ~670 questions played through the real UI across all 14 worlds — visuals actually paint, answer buttons are drawn and tappable, correct answers are accepted, wrong ones stay gentle, and no letter reaches a pre-reader's screen |

**The audit's second opinion.** A generator decides both the question and its
answer, so a buggy generator produces something internally consistent and
completely wrong. `tools/answer-solver.mjs` re-derives the answer from the
rendered question alone — the prompt string and the visual spec — and imports no
generator. All 16,800 questions are re-solved and must agree. That check is what
found the equal-fractions comparison, the ambiguous "what is the 5 worth?", and
the decimal division whose displayed answer was rounded into being wrong.

Plus three review helpers that produce images for a human to look at:
`tools/e2e/art-check.mjs` (character contact sheet),
`tools/e2e/visual-check.mjs` (every question visual at card size) and
`tools/e2e/mobile-review.mjs` (every screen at phone size).

`?debug=1` exposes `window.__mmd` with `state()`, `question()`, `scene()`,
`save()` — that hook is what lets the suite play the game rather than poke at
pixels.
