# Learnings

What actually worked while building this, and the bugs that were only found
because something was checked rather than assumed. Written for whoever changes
this next — including me.

---

## The big one: a passing flag is not a working feature

The game shipped **silent**. Music never played on the title screen, and only
started if you navigated to another screen.

The cause: scenes request their theme in `enter()`. For the title screen that
runs before any click, so the request reached `audio.music` while it was still
`null` and was dropped. Nothing replayed it after the audio context unlocked.

What makes this worth writing down is that **every observable boolean was
correct**: `ready: true`, `ctx.state: 'running'`, gains at the right values. Any
test asserting on those would have passed while the game made no sound at all.

The fix in the code was five lines. The fix in the *process* was to measure the
thing itself:

```js
const an = audio.ctx.createAnalyser();
audio.master.connect(an);          // tap the real output bus
// ...sample, compute RMS, assert > threshold
```

**Test the observable behaviour, not the bookkeeping that is supposed to cause
it.** The suite now asserts music is audible, SFX are audible, and mute actually
silences. All three would have been green-but-lying under a flag-based test.

Corollary, from the same session: my first mute test *failed* and the mute code
was fine. The AnalyserNode holds ~46ms of history, so it was still reporting the
previous sound's tail. When a new measurement-based test fails, suspect the
measurement before the code.

---

## Flat art beats shaded art at gameplay size

The first art pass used gradients, gloss highlights, big glossy eyes with
catchlights, and thick outlines. It looked good in a 260px contact sheet and
turned to mush at the ~60px monsters actually render at on a phone.

Rebuilding around flat colour, thin even outlines, tiny dot eyes and one small
mouth was a large improvement in readability, and *less* code.

The general rule: **design at the size the thing actually appears.** The contact
sheet at 220px was misleading; the phone screenshot was the truth. Both are now
in `tools/e2e/` (`art-check.mjs`, `mobile-review.mjs`) precisely so neither can
be skipped.

Second-order lesson: because the house style lives in `toybox.js` and characters
never hard-code fills, the whole style change was one file plus a mechanical
sweep. **Centralising the vocabulary is what made a total restyle affordable.**

---

## Pre-readers break assumptions you did not know you had

"Which has MORE?" and "Which has FEWER?" are, to a child who cannot read,
*the same screen* — identical layout, identical shapes — with opposite correct
answers. A prompt like "What comes just after 4?" is unanswerable for the same
reason.

Fixes that worked:

- **Let the picture ask the question.** A number track with a gap — `4 5 6 ?` —
  needs no words at all. This is strictly better than the sentence it replaced,
  for readers too.
- **Give direction a symbol, and teach it before varying it.** An up/down arrow
  chip carries more/fewer. Pre-K only ever sees one direction, so the convention
  is learned before the opposite appears in Kindergarten.
- **Never let an emoji carry meaning.** Emoji render differently or not at all
  depending on device and font. Every control is now a drawn icon.

And then I shipped the arrow **pointing down for MORE**. An inverted icon is
worse than no icon, because a child will trust it and get the opposite answer.
Caught by rendering the icon and counting white pixels above versus below the
centre. **When an asset encodes a fact, assert the fact, not the asset's
existence.**

The rule later got stricter, and stricter turned out to be *easier*. "Keep the
words simple for young players" is a judgement call, and judgement calls decay:
1st grade had drifted into "How many tens in 47?" and "3 tens and 5 ones = ?"
without anyone deciding it should. "No letters at all below 2nd grade" is not a
judgement call, it is a regex, and the audit runs it on every question. Forcing
every early question through pictures and symbols also made them *better*: a
numeral card with drawn dot-groups for answers, base-ten blocks read in both
directions, and `[shape] = [?]` are all sharper questions than the sentences they
replaced. **A bright line you can test beats a principle you have to interpret.**

And then the first pass overshot in the other direction: having removed the
words, I put a `?` above every picture instead. Five apples over three numbered
buttons does not need one — the question is already on screen, and a lone `?` is
one more symbol for a four-year-old to work out. The prompts are gone now unless
they *are* the question (`3 + 2 = ?`), and where a symbol genuinely belongs — the
`=` in "which group has this many?" — it is drawn inside the picture next to the
thing it relates, not floated above the card.

The catch is that a picture-only question has nothing for a screen reader to
read, and the visual canvas is `aria-hidden`. Every question now carries an
`srPrompt` that is never rendered and becomes the answer group's accessible name.
**Quiet on screen is not the same as unlabelled**, and writing the audit rule for
it (no visible prompt *and* no `srPrompt` fails) is what stopped the cleanup from
quietly costing accessibility.

---

## Constrain the machine so the machine can check the work

Two structural decisions paid for themselves repeatedly.

**`js/data/` never touches the DOM.** That single rule means the whole curriculum
runs in plain Node, so `tools/audit-questions.mjs` checks 16,800 questions across
all 140 stages in seconds. It immediately caught something manual play would
likely never have surfaced: `sub_within` was offering **negative distractors** to
first graders — `6 − 5 = ?` with `-9` as an option. Then it caught the same class
of bug again later in `add_ten`.

The audit is now the place where pedagogical rules get *enforced*, not just
documented:

- no negative numbers or zero denominators
- exactly one correct choice, no duplicates
- answer position uniform within each choice count
- no letters at all in a question below 2nd grade
- no ten-frames above Kindergarten
- every visual spec is one `fx.js` can actually draw
- the variety budget: same skill back-to-back, identical question repeated

Every one of those started as a bug or a note, and became a rule that cannot
silently regress.

---

## Ask a second opinion, from something that never saw the answer

The audit above checks that a question is *well formed*. It cannot check that it
is *right*, because the generator writes the question and the answer together: a
generator with a bug produces a perfectly consistent question with a wrong answer
and sails through every structural check.

`tools/answer-solver.mjs` fixes that by re-deriving the answer from the rendered
question alone — the prompt string a child reads and the visual spec they look
at — and it deliberately imports no generator. All 16,800 questions must agree
with it. Writing it took an afternoon and it immediately found three real bugs
that had survived every other check:

- **`fraction_compare` asking which of 1/2 and 3/6 is greater.** The guard against
  equal fractions decremented one numerator, and `Math.max(1, 1 - 1)` is 1, so
  whenever the numerator was already 1 the guard silently did nothing.
- **"In 455, what is the 5 worth?"** — two defensible answers, both on the
  buttons. The fix was to name the place, not just the digit, which is how IM
  phrases it anyway.
- **`1.97 ÷ 100` answered "0.02".** The generator produced a four-decimal result
  and the three-decimal formatter rounded it into being wrong.

Two lessons past the bugs themselves. First, the tolerance in the comparison is
load-bearing: an early version accepted "agrees to however many decimals the
button shows", which made the third bug *pass*. A float tolerance (1e-9) is the
right latitude; display rounding is not. Second, for questions whose prompt is a
sentence rather than an expression, the solver returns a **predicate** — "exactly
one choice is a factor of 24" — checked against every button. That form catches
a mis-selected answer and an ambiguous question with the same test, which is how
the place-value bug surfaced.

---

## Variety is a property of a session, not of a question

Every individual question in Pre-K passed the audit and the world still felt like
a worksheet: 56% of the time the next question used the *same skill* as the last
one, and a third of the questions in a stage were exact repeats. Three worlds had
only three skills between them.

Nothing about that is visible when you check questions one at a time. The fix was
in three places, and so is the test:

- more skills per world (3–4 → 6–8), drawn from IM's own unit sequence
- `makeQuestion(..., { recent })` down-weights the last four skills asked
- `play.js` re-rolls a question whose prompt-and-visual signature is still in a
  twelve-deep window

The audit now replays the ramp exactly as `play.js` drives it and holds the
result to a budget. Back-to-back repeats went 38% → 5%, exact repeats 13% → 3%.
The metric had to exist before the problem was fixable.

**Everything gameplay-random is seeded on `(worldId, stage)`.** Stages are
byte-identical every run, which is what lets the browser suite play a whole stage
to completion and assert on the result. Determinism is a testing feature first
and a design nicety second.

---

## Play it badly on purpose

Every suite I had drove the game correctly: read the question, tap the right
answer, move on. A four-year-old does none of that, so `tools/e2e/chaos.mjs`
plays badly on purpose — six personas (masher, guesser, struggler, wanderer,
quitter, dawdler) interleaved with reloads, rotations and scene switches faster
than the cross-fade — and re-checks the invariants after every single action.

The interesting part was not the personas. It was writing down what has to be
true *regardless of what was tapped*, because that is the thing worth asserting
when you cannot predict the input:

- hearts, coins, tokens and stars inside their legal range
- the save still parseable
- no `NaN` or `undefined` on screen
- **no two live controls overlapping** — one of them cannot be tapped and the
  child has no way to know which
- **no text clipped by its own box**, and nothing past the edge of the viewport
- **always at least one thing left to tap** — a screen with no live control is a
  dead end a child cannot escape without an adult reloading the page

The overlap check fired immediately, on dialog buttons sitting over the answer
buttons behind them. My first instinct was "false positive, the modal covers
them" — and covering is exactly the point. The dialog was painted over the game
but the game underneath was still *live*: its buttons stayed focusable and
stayed in the screen reader's list, so tabbing walked straight into questions
nobody could see. `#app` is now `inert` while a modal is open, and the check
skips inert subtrees, which makes it correct rather than merely quiet.

The same run found the shop pricing its buttons with a `🪙` emoji — in a file
whose own button helper carries the comment "a drawn icon always renders; an
emoji may not, and a child cannot recover from a control that shows up as an
empty box". **A rule only holds where it is enforced**; that one was written down
three lines above the code that broke it.

---

## The instruction a child cannot read

Miss twice and the answer is revealed, and you tap it to carry on. That
instruction lived in the feedback line: "The answer is 4. Tap it to keep going."
English — at the one moment a stuck pre-reader most needs telling what to do.

The fix is a gold ring that pulses outward from the revealed button. It says
"touch this" in no language at all, and it works with motion turned down too,
where it simply sits there. First attempt made the ring green, matching the
button; against a green button that is not a signal, it is a slightly thicker
border.

Related, from the same pass: losing a heart was a silent swap of one sprite for
another, in a corner, while a monster exploded in the middle of the screen. The
row now shakes. **If something bad happens, the game has to say so somewhere the
child is already looking.**

---

## Small things that turned out to matter

**Derive state you could store.** Unlock flags do not exist; `isStageUnlocked`
computes from stars. State that does not exist cannot drift out of sync.

**Compute content instead of authoring it.** 140 stages come from
`stageParams(world, stage)` and a seeded path generator. Adjusting global
difficulty is editing one file, not 140.

**Put every feel-number and every line of copy in one file.** `tuning.js` meant
the difficulty, economy and tone could be retuned without touching gameplay code.

**Real DOM for UI over a canvas game.** Focus rings, `aria-live`, screen-reader
labels, crisp text at any DPR and native touch sizing all came free. The usual
objection (syncing DOM to world coordinates) never applied, because everything in
the overlay is screen-anchored.

**Never pick a random thing inside `render`.** The end-of-stage banner called
the rotating copy picker where it drew the text, so it congratulated the child
with a different line on every frame — sixty a second, which is not a word, it
is a flicker. Anything chosen from a pool belongs where the *event* happens, not
where the pixels do. The test that guards it reads the painted scanline rather
than the state behind it, because the state was never what was wrong.

**A wordless question needs the ask marked, not just the subject.** The picture
graph highlighted the row being asked about with a pale band, which promptly
disappeared behind a row of yellow stars. A child then saw three rows of things
and three numbers and no reason to prefer one row over another — count the fish,
count the lot, count the rows, all equally reasonable. It took three cues
together: the asked row at full strength, everything else faded back to context,
and the same "?" chip the rest of the game uses for "this is the bit you answer".
The "?" is the one that does the work, because by then it is a symbol the child
has already been taught by every other visual.

**A `?debug=1` hook is worth writing early.** `window.__mmd.state()` /
`.question()` is what lets tests *play the game* rather than pattern-match
pixels. It made the difference between smoke tests and real coverage.

---

## Bugs found only by looking at a phone

Desktop screenshots hid all of these. `mobile-review.mjs` exists because of them.

- **Map nodes overlapped.** A single free-form spline spaced stages evenly by arc
  length, which bunched them on a tall narrow screen. Replaced with a serpentine
  grid sized to the viewport, with the trail splined *through* the nodes so it
  can never miss one.
- **The HUD wrapped to two rows** once shields appeared, and the absolutely
  positioned wave badge landed on top of the controls. Moving the badge into the
  HUD's flex flow fixed it structurally.
- **Cream text on a pale sky** was the worst contrast in the game. Solid chips.
- **Scenery in the dark worlds was near-black** on near-black ground.
- **A 0–20 number line for "2 + 1"** is twenty tiny labels of noise. Number lines
  are now framed to the numbers in play.
- **The castle rendered half off-screen** at narrow widths, because its position
  was a fixed fraction of the width with no clamp.

Also caught on mobile by simulating real input: pinch and double-tap both zoomed
the page. Kids rest palms and tap with several fingers, and a zoomed-in game is
not something a five-year-old can undo.

---

## The size the game thinks it is

A canvas has two sizes — the box CSS gives it, and the coordinate space the game
draws into — and for a long time those were not the same number.

`Screen` measured the box on window resize. But `#stage` is a flex sibling of
`#panel`, so a scene swapping its controls resizes the canvas underneath it with
no window event at all. The game kept drawing into the space measured at boot,
the browser stretched that bitmap into the smaller box, and pointer events —
which arrive in the element's own pixels — landed where the art *used* to be. On
a 320x568 phone the play scene was drawing a 568px-tall battlefield into 106px
of screen. On the map, the whole bottom row of stages sat under the panel and
could not be tapped at all.

None of it looked broken. The art is round and cartoonish, so an 18% vertical
squash reads as a style choice, and a screenshot cannot tell you that the circle
you are looking at is not where the tap goes. Finding it took measuring the two
numbers and comparing them — `screen.w/h` against the canvas's own bounding box,
in every scene. That check is one line, it now runs at five screen sizes, and it
is the kind of assertion worth reaching for whenever a value is derived once and
assumed to stay true.

A `ResizeObserver` on the canvas fixes it for good, and the engine measures on
scene swap so the first frame of a new scene is right rather than one frame late.

**"First match" is not "nearest."** The map's hit test walked the stage nodes in
order and took the first within 1.5 radii. The nodes sit about 2.5 radii apart,
so those zones overlapped — and first-in-stage-order meant every gap went to the
lower-numbered stage. Tapping beside stage 3 selected stage 2, which is not a
near miss, it is the wrong level. One word of difference in the code.

**Size the thing from the room that is left, not from the screen.** The node
radius was computed from the viewport while the spacing came from margins that
ignored it, and the position jitter was a fraction of the whole map. On a
landscape phone that drew 77px circles 39px apart, stacked on top of each other.
Solving radius and spacing together, and bounding the jitter by the slack that is
genuinely left over, makes overlap impossible instead of unlikely — and lets the
grid shape be chosen for the biggest node rather than hard-coded per
orientation.

---

## Deployment

**GitHub Pages project sites are served from a subpath** (`/mathisfun/`), not the
domain root. Everything already used relative paths — including
`navigator.serviceWorker.register('sw.js')` and the worker's own precache list —
so it worked, but that was verified by assembling the exact artifact, serving it
from a subdirectory and running the full suite against it, rather than assumed.

**The service worker matched cache entries with the query string**, so deep links
like `?scene=play&world=g2w0` missed the cache and failed offline.
`caches.match(request, { ignoreSearch: true })` plus a navigation fallback fixed
it. Found by an offline test, not by reasoning.

**Gate the deploy on the deterministic check, not the flaky one.** The curriculum
audit blocks publishing; the browser suite reports and uploads screenshots but is
`continue-on-error`. Shipping broken maths is unacceptable; a timing-sensitive
browser test failing on a slow CI runner should not block a release.

**Pages needs a public repo or a paid plan.** Worth knowing before promising a
URL — and worth saying plainly that a Pages site is publicly readable either way,
so paying to keep the repo private does not make the game private.

---

## Process notes

**Regex-editing source code is fast and occasionally wrong.** Bulk edits via
Python broke a string literal (`'…same shape.` with the closing quote eaten) and
mangled a nested call (`fill(ctx, lighten(stone)` — the inner comma confused a
non-greedy match). Both were caught immediately because every module is
syntax-checked after edits. Use the sweep, then *verify the parse*.

Note that `node --check file.js` parses as CommonJS and will happily pass files
that are broken as ES modules. `node --input-type=module --check < file.js` is
the one that tells the truth.

**Screenshot everything, then actually look.** Most of the meaningful fixes in
this project came from reading a rendered image, not from reading code: the
inverted arrow, the overlapping map nodes, the goggle-like eyebrows in the first
art pass, the full-width wave badge. Automated checks confirm behaviour; only
looking catches design.
