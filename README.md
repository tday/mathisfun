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

**Collecting, without gambling.** A gachapon capsule machine on the map turns
coins into monster figures. Duplicates convert straight back into coins, so a
repeat pull is never a loss, and no real money is involved anywhere.

### Curriculum

Two worlds per band; operand ranges widen and harder forms gate in by stage.

| Band | World 1 | World 2 |
| --- | --- | --- |
| Pre-K | Count 1–10, shapes | More/fewer, biggest/smallest |
| Kindergarten | Ten-frames to 20, numerals | ± within 5, one more/less |
| 1st | ± within 10 → 20 | Missing addend, place value, compare |
| 2nd | ± within 100 with regrouping, skip counting | Repeated addition → arrays |
| 3rd | × facts (2·5·10 → 3·4 → 6·7·8·9) | ÷ facts, first fractions |
| 4th | Multi-digit ×, ÷ with remainders | Fraction compare/equivalence, decimals |
| 5th | Fraction ± (like → unlike) | Decimal ops, order of operations |

Distractors model real mistakes rather than random numbers: dropped carries,
digit swaps, neighbour times-table facts (6×7 → 48), adding fractions straight
across, "longer decimal is bigger", left-to-right order of operations.

---

## Verifying changes

Two independent checks. Run both before shipping.

### 1. Curriculum audit (no browser needed)

Everything under `js/data/` is DOM-free by design, so the whole curriculum can be
checked in plain Node:

```bash
node tools/audit-questions.mjs
```

It generates ~17,000 questions across all 140 stages and asserts that each has
exactly one correct choice, no duplicate or malformed distractors, no negative
numbers offered to young children, no zero denominators, a hint and an
explanation, a well-formed visual spec, and that the correct answer's position is
uniformly distributed within each choice count.

### 2. Browser smoke tests

```bash
cd tools/e2e && npm i --no-save playwright && npx playwright install chromium
python3 -m http.server 8099          # in another shell, from the repo root
node tools/e2e/run.mjs               # screenshots land in /tmp/mmd-shots
```

Covers: boot with **zero console errors** (this is what catches a broken module
path), every scene rendering a non-blank canvas, unlock rules, playing a full
stage to the results screen, the wrong-answer path (hint shown, hearts untouched,
coins still paid), 48px+ touch targets and no page scroll at 390×844 and 844×390,
and recovery from a corrupt or outdated save.

`node tools/e2e/art-check.mjs` renders a large contact sheet of every monster for
eyeballing art changes.

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
tools/       audit-questions.mjs, e2e/
```

One rule keeps a build-free project maintainable — imports only ever flow one way:

```
core → (gfx, audio, data) → ui → scenes → main
```

`js/data/` never touches the DOM. That is what makes the curriculum testable in
Node, and it is the constraint to preserve when adding skills.

**Art.** Monsters are drawn procedurally as chibi vinyl figures — thick plum
outlines, a vertical body gradient with one glossy highlight, huge eyes with
catchlights, and all of the "scary" concentrated in the grin and brows. Each is a
function in a 100×100 unit box, baked once to an offscreen canvas at device
resolution and then blitted, so per-frame cost is just `drawImage`. Squash and
stretch is applied as a transform, so bouncing costs no extra art. Worlds re-tint
the same monsters through an HSL "mood" shift, which is why 14 worlds do not need
14 sets of sprites.

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
