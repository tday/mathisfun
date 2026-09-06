# Monster Math Defenders

A browser tower-defence game that teaches maths from **pre-K through 5th grade**.
Monsters march toward your castle; the only thing that stops them is answering
the maths question. Every attempt earns coins — right *or* wrong.

- **14 worlds × 10 stages = 140 stages**, two worlds per grade band, boss castle
  at stage 10 of every world.
- **Zero dependencies, zero build step.** The repo *is* the deployable artifact —
  push to GitHub Pages, or `aws s3 sync` to S3 + CloudFront.
- **All assets generated at runtime** — every monster, prop and sound effect is
  drawn or synthesised in code. No image or audio files ship at all.
- Desktop and mobile, portrait and landscape, installable as a PWA.

---

## Run it locally

ES modules need a real HTTP origin, so `file://` will not work:

```bash
python3 -m http.server 8099
# open http://localhost:8099
```

Handy dev URLs:

| URL | What it does |
| --- | --- |
| `?debug=1` | Exposes `window.__mmd` for the smoke tests |
| `?scene=gallery` | Sprite gallery — every monster in every world palette |
| `?scene=play&world=g4w0&stage=10` | Jump straight to a boss stage |
| `?sw=1` | Register the service worker on localhost (off by default) |

Design review helpers:

```bash
node tools/e2e/art-check.mjs       # contact sheet of every character
node tools/e2e/mobile-review.mjs   # every screen at 390x844, plus landscape
```

World ids are `g<band>w<0|1>` where band 0 = Pre-K … band 6 = 5th grade.

---

## The design, in short

**Answers decide combat, not stats.** The hero and the monsters get visibly
stronger as the grade band rises, but that is *cosmetic*. A correct answer always
defeats a monster and a wrong one never does — progress comes from maths, never
from grinding.

**Effort is what pays.** Coins are awarded per *attempt* (+2), with a bonus for
being right (+3) and a small streak bonus. Coins buy shields and extra hearts, so
a child who finds the maths hard can still buy their way to more room for
mistakes. **Coins are kept even when a stage is lost.**

**Nobody gets stuck and nothing punishes.** There is no timer. A wrong answer
costs zero hearts — it just lets the monsters keep walking. Miss once and you get
an encouraging line plus a hint tailored to that exact question; miss twice and
the answer is revealed so you can tap it and carry on. The "wrong" sound is two
soft descending sine notes, never a buzzer.

**No death spiral.** A monster that reaches the gate costs one heart and then
*despawns*. Monsters can never pile up and run down five hearts in five seconds.

**Stars reward perseverance.** 1★ for clearing, 2★ with half your hearts, 3★ with
all of them — **plus one bonus star if every question was eventually answered
correctly**. A child who misses often but always works their way to the right
answer can still earn 3★.

**Hidden rubber-banding.** The first two questions of every stage are a warm-up,
and after repeated misses the generator quietly steps difficulty back down. The
player never sees this happen.

**Collecting, and a maths lesson while you spend.** The gachapon capsule machine
is priced in **tokens**, a deliberately tiny second currency — coins run into the
hundreds, which is unreadable arithmetic for a five-year-old. Tokens stay in
single digits, are shown as countable objects, and the machine works the budget
through on screen: `5 − 3 = 2`, with the three tokens about to be spent greyed
out. Spending becomes the exercise. A stage clear earns 1 token, a three-star
clear 2, and a duplicate hands one straight back — so a repeat is never a loss,
and no real money is involved anywhere.

### Curriculum — Illustrative Mathematics K–5

Each world covers a run of **Illustrative Mathematics** units, in IM's own order,
and says which ones on the world card. The point is not the citation: IM teaches
each idea through a particular representation — a collection counted however it is
arranged, a number bond, base-ten blocks, a number line, an array, a fraction
with a place on the line — and the questions here are asked *through those
pictures*, so a child who plays a world recognises the same ones in class.

| Band | World 1 | World 2 |
| --- | --- | --- |
| Pre-K | *Math in Our World* — counting collections, shapes | *Numbers 1–10* — more/fewer, biggest/smallest |
| Kindergarten | *IM K, Units 1–3* — ten-frames, numeral ↔ quantity, flat shapes | *IM K, Units 4–6* — add/subtract, number bonds, to 20 |
| 1st | *IM 1, Units 1–3* — within 20, doubles, make-ten, data | *IM 1, Units 4–6* — base ten to 99, within 100, length |
| 2nd | *IM 2, Units 1–4* — within 100, the number line, measuring | *IM 2, Units 5–9* — to 1,000, money, time, equal groups |
| 3rd | *IM 3, Units 1–3* — introducing multiplication, area | *IM 3, Units 4–7* — division, fractions on a line, perimeter |
| 4th | *IM 4, Units 1, 4, 6* — factors, place value, multi-digit × ÷ | *IM 4, Units 2, 3, 5, 7* — fractions, comparison, angles |
| 5th | *IM 5, Units 1–3* — volume, multiplying fractions | *IM 5, Units 4–7* — decimals, coordinate plane |

Pre-K has no IM curriculum of its own, so its worlds are the readiness IM
Kindergarten unit 1 assumes.

Seventy skills rotate across the fourteen worlds, six to eight per world. The
ramp is told which skills came up recently and steers away from them, and an
exact repeat still in the recent window is re-rolled — so a stage does not turn
into the same question five times.

Distractors model real mistakes rather than random numbers: dropped carries,
digit swaps, neighbour times-table facts (6×7 → 48), adding fractions straight
across, "longer decimal is bigger", left-to-right order of operations, perimeter
confused with area, swapped coordinates.

---

## Verifying changes

Three independent checks. Run all of them before shipping.

### 1. Curriculum audit (no browser needed)

Everything under `js/data/` is DOM-free by design, so the whole curriculum can be
checked in plain Node:

```bash
node tools/audit-questions.mjs
```

It generates ~17,000 questions across all 140 stages and asserts that each has
exactly one correct choice, no duplicate or malformed distractors, no negative
numbers offered to young children, no zero denominators, a hint and an
explanation, a well-formed visual spec, that the correct answer's position is
uniformly distributed within each choice count, that the variety budget holds,
and that **nothing below 2nd grade contains a letter** — in the prompt or on a
visible answer button.

It also takes a **second opinion on every answer**. A generator writes both the
question and its answer, so a bug there produces something internally consistent
and completely wrong. `tools/answer-solver.mjs` re-derives the answer from the
rendered question alone — the prompt string and the visual spec — importing no
generator, and all 16,800 must agree. That check is what caught a "which fraction
is greater?" between 1/2 and 3/6, an ambiguous "in 455, what is the 5 worth?",
and a division whose displayed answer had been rounded into being wrong.

### 2. Browser smoke tests

```bash
cd tools/e2e && npm i --no-save playwright && npx playwright install chromium
python3 -m http.server 8099          # in another shell, from the repo root
node tools/e2e/run.mjs               # screenshots land in /tmp/mmd-shots
```

Covers: boot with **zero console errors** (this is what catches a broken module
path), every scene rendering a non-blank canvas, unlock rules, playing a full
stage to the results screen, boss damage, the wrong-answer path (hint shown,
hearts untouched, coins still paid), shop and pause pausing *and resuming*, the
capsule machine's token arithmetic, 48px+ touch targets and no page scroll at
390×844 and 844×390, **simulated pinch and double-tap proving the zoom lock
holds**, recovery from a corrupt or outdated save, and offline reload.

### 3. Question QA in the real UI

```bash
node tools/e2e/qa-questions.mjs      # WORLDS=g0w0 STAGES=1,5 to narrow it
```

Plays ~670 questions across all fourteen worlds by actually clicking the buttons:
every declared visual paints something, every answer button is drawn and at least
48px, the right answer is accepted and the game moves on, a wrong one keeps every
heart and offers a hint, and **no letter reaches the screen below 2nd grade**.

Two helpers render images for a human to judge, since neither suite can tell you
a picture is unreadable:

```bash
node tools/e2e/visual-check.mjs      # every question visual at card size
node tools/e2e/art-check.mjs         # character contact sheet
```

It also measures **real audio output** with an AnalyserNode on the master bus.
A `ready` flag proves nothing: music used to be requested before the audio
context existed and was silently dropped, and the game shipped mute-in-practice
while every boolean said otherwise. Only a level reading catches that.

`node tools/e2e/art-check.mjs` renders a large contact sheet of every monster for
eyeballing art changes.

---

## Deeper documentation

| Doc | For |
| --- | --- |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | How the system fits together — layering, loop, art pipeline, determinism. Read before changing code. |
| [docs/SPEC.md](docs/SPEC.md) | The game rules: mechanics, growth-mindset requirements, curriculum, economy, accessibility rules. Read before changing behaviour. |
| [docs/LEARNINGS.md](docs/LEARNINGS.md) | What worked, what broke, and why several checks exist. Read before repeating a mistake. |

---

## How it is put together

```
index.html · css/style.css · manifest.webmanifest · sw.js
js/core/     engine (fixed 60 Hz loop + scene manager), screen, save, utils
js/gfx/      toybox (the shared drawing kit), sprites-units, sprites-world,
             sprite (bake + cache), palettes, fx (particles, question visuals)
js/data/     worlds, questions + gen-early/mid/upper, tuning   ← DOM-free
js/scenes/   title, worldSelect, map, play, waves, results, gallery
js/ui/       dom, hud, questionPanel, panels (shop/settings/gacha/collection)
tools/       audit-questions.mjs, answer-solver.mjs, e2e/
```

One rule keeps a build-free project maintainable — imports only ever flow one way:

```
core → (gfx, audio, data) → ui → scenes → main
```

`js/data/` never touches the DOM. That is what makes the curriculum testable in
Node, and it is the constraint to preserve when adding skills.

**Art.** Monsters are drawn procedurally as plump kawaii mascots: flat colour,
thin even outlines, tiny dot eyes, one small mouth and big soft blush. Every
character is one clear silhouette plus one signature detail — a shell, back
spikes, round ears — because that is what still reads at 60px on a phone, which
is the size that actually matters. Flat beats shaded here: gradients and gloss
turn to mush at gameplay size. Each character is a function in a 100×100 unit
box, baked once to an offscreen canvas at device resolution and then blitted, so
per-frame cost is just `drawImage`. Squash and stretch is a transform, so
bouncing costs no extra art. Worlds re-tint the same monsters through an HSL
"mood" shift, which is why 14 worlds do not need 14 sets of sprites.

**Built for readers who cannot yet read.** Below 2nd grade there is no text in a
question at all — not a simplified sentence, no letters — and where the picture
asks the question, no prompt either. Five apples above three numbered buttons
does not need a `?` hovering over it; a lone `?` is one more thing on screen for
a four-year-old to work out. A prompt earns its place only when it *is* the
question (`3 + 2 = ?`) or when a drawn icon carries a direction the picture
cannot. So reading a numeral is drawn as `[3] = [?]` with answer buttons that are
**groups of dots** — the `=` inside the picture, next to the thing it relates.
Shape matching is the same picture with a shape in the first card. Sequence
questions are a number track with a gap (`4 5 ? 7`) instead of the words "before"
and "after", which look identical to a pre-reader but have opposite answers.
Comparison is a drawn up/down arrow chip over two groups, and Pre-K only ever
asks one direction so the convention is learned before it is varied. Place value
is base-ten blocks, read both ways.

Quiet on screen is not unlabelled: every question carries a never-rendered
`srPrompt` used as the answer group's accessible name and its `aria-live`
announcement, and the audit fails a question that has neither that nor a visible
prompt. Hints stay in English; they are for the adult sitting alongside, and no
child is ever blocked by one, because a second miss reveals the answer. Every
control is a drawn icon rather than an emoji, because emoji coverage varies by
device and a child cannot recover from a control that renders as an empty box.
The curriculum audit fails the build the moment a letter appears in a band-0-to-2
question, and the browser QA suite checks the same thing on the rendered page.

**Touch is locked down.** Small children rest palms on the screen and tap with
several fingers. `js/core/touchlock.js` blocks pinch-zoom, iOS gesture events,
double-tap zoom, ⌘/Ctrl zoom, and long-press selection, and snaps the viewport
back if anything shifts it — while leaving single taps, list scrolling and the
OS's own accessibility zoom alone.

**Stages are computed, not authored.** Wave counts, enemy mix, march speed and the
path itself all derive from `(world, stage)` through a seeded RNG, so a stage is
byte-identical every time it is played — and reproducible in a test.

**UI is real HTML.** The question card, answer buttons, HUD and dialogs are DOM
over the canvas. That buys focus rings, `aria-live` announcements, screen-reader
labels, crisp text at any DPR and native touch sizing — all of which canvas
buttons would have to reinvent badly.

---

## Deploying

The game is plain static files with no build step, so any static host works.
Two are set up here.

### Option A — GitHub Pages (nothing to install)

`.github/workflows/pages.yml` publishes on every push to `main`.

**One-time setup:** repo **Settings → Pages → Build and deployment → Source:
GitHub Actions**. That is the only manual step; the workflow does the rest.

The site lands at `https://<user>.github.io/mathisfun/`.

The workflow has three jobs:

| Job | Blocks the deploy? | What it does |
| --- | --- | --- |
| `audit` | **Yes** | Runs the curriculum audit. Shipping broken maths is the one unacceptable outcome, and this check is fast and deterministic. |
| `browser` | No | Runs the Playwright suite and uploads screenshots as an artifact. Timing-sensitive, so a flaky runner never blocks publishing. |
| `deploy` | — | Copies the game into `_site` — excluding `tools/`, `deploy.sh` and the docs — and publishes it. |

**Why the subpath works.** A GitHub *project* site is served from
`/<repo>/`, not the domain root. Every path in the game is already relative
(`css/style.css`, `js/main.js`, `manifest.webmanifest`, and
`navigator.serviceWorker.register('sw.js')`), and `sw.js` precaches `'./…'`
entries, so the service worker registers with `/<repo>/` scope and offline play
works unchanged. This is verified, not assumed — run the suite against a
subpath yourself:

```bash
mkdir -p /tmp/pages/mathisfun
rsync -a --exclude '.git' --exclude 'tools' --exclude 'deploy*' . /tmp/pages/mathisfun/
(cd /tmp/pages && python3 -m http.server 8101 &)
cd tools/e2e && BASE=http://localhost:8101/mathisfun node run.mjs
```

`.nojekyll` is committed so Pages serves the files as-is instead of running them
through Jekyll.

If you would rather skip Actions entirely, **Settings → Pages → Deploy from a
branch → `main` / `root`** also works — it just publishes `tools/` and the docs
alongside the game, and runs no tests first.

### Option B — S3 + CloudFront

```bash
cp deploy.config.example deploy.config   # set BUCKET and DISTRIBUTION_ID
./deploy.sh
```

#### One-time AWS setup

1. **S3 bucket** — create it, keep *Block all public access* **on**. The bucket is
   private; CloudFront reads it through OAC.
2. **CloudFront distribution**
   - Origin: the S3 bucket, with **Origin access control (OAC)**; click *Copy
     policy* and paste it into the bucket policy.
   - Viewer protocol policy: **Redirect HTTP to HTTPS**.
   - Compress objects automatically: **Yes**.
   - Default root object: `index.html`.
   - Error responses: map **403** and **404** to `/index.html` with a **200**
     response code, so deep links keep working.
3. Run `./deploy.sh`.

#### Cache headers `deploy.sh` sets

| Path | `Cache-Control` | Why |
| --- | --- | --- |
| `js/`, `css/`, `icons/` | `public, max-age=300, s-maxage=31536000` | Long at the edge, short in the browser; invalidated every deploy |
| `index.html` | `no-cache, must-revalidate` | Must always fetch the current build |
| `sw.js` | `no-cache, must-revalidate` | A cached service worker would pin an old build forever |
| `manifest.webmanifest` | `no-cache, must-revalidate` + `application/manifest+json` | S3 will not guess this MIME type |

**Bump `VERSION` in `sw.js`** whenever gameplay files change. The fetch strategy
is stale-while-revalidate so a forgotten bump self-heals on the next load, but an
explicit bump makes the update immediate.

There is no backend, no analytics, no network calls, and no data leaves the
device — progress lives in `localStorage` only.

---

## Notes for future work

- `js/data/tuning.js` holds every game-feel number and all encouragement copy.
  Difficulty and reward pacing can be retuned there without touching gameplay code.
- Adding a skill: write a generator in the right `gen-*.js`, register it in the
  `RAMP` table in `questions.js`, then run the audit.
- `save.js` falls back to an in-memory save when `localStorage` throws (iOS
  private mode) and shows the player a one-time warning.
- Device pixel ratio is capped at 2 and each stage's background is pre-rendered
  once, which is what keeps older tablets at 60fps.
