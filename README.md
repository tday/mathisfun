# Monster Math Defenders 🏰✨

A tower-defense math adventure for **Pre-K through 5th grade** that runs 100% in the
browser — no backend, no build step, no external assets. Cute-but-scary vinyl-toy
monsters (think designer gachapon figures) march toward your castle, and **answering
math questions is what defeats them** — never character stats.

Built to teach three things: math skills, that math is fun, and a **growth mindset**:

- **Every try earns coins** — right or wrong. Effort always pays.
- Wrong answers get warm feedback and a hint, never a buzzer or a red X.
  After two tries the answer glows so kids can keep moving and learn it.
- Coins buy **durability** (shields, extra castle hearts) so mistakes are survivable,
  plus capsule-machine pulls to collect toy versions of the monsters.
- Stars reward perseverance: work out every answer eventually (retries count!) and
  you can still earn the top rating.
- No countdown timers. The only pressure is a slowly waddling marshmallow with fangs.

## Game structure

| | |
|---|---|
| Grade bands | Pre-K, K, 1st, 2nd, 3rd, 4th, 5th |
| Worlds | 2 per grade × 7 grades = **14 themed worlds** |
| Stages | 10 per world (stage 10 = boss castle) = **140 stages** |
| Curriculum | Counting & shapes → add/sub → place value → ×/÷ facts → fractions → decimals → order of operations, ramping within every world |

Every grade's first world is always unlocked, so kids start at *their* grade.
Progress, coins, and the collection save to `localStorage` on the device.

**All assets are generated:** sprites are drawn by code (canvas vector art, baked at
load), sounds and music are synthesized with the Web Audio API, and the PWA icons are
rendered from the game's own hero art. The repo you're reading *is* the deployable site.

## Run locally

ES modules require HTTP — opening `index.html` from `file://` will not work.

```bash
python3 -m http.server 8080     # or: npx serve
# open http://localhost:8080
```

Useful dev URLs:

- `?scene=gallery` — sprite gallery (art review)
- `?scene=play&world=g2w0&stage=3` — jump straight into a stage (`g<band>w<0|1>`)
- `?debug=1` — exposes `window.__mif` (used by the e2e tests)
- `?sw=1` — opt into the service worker on localhost to test offline
- `?fast=3` — speed up the march (testing)

## Testing

```bash
npm run audit                    # generates ~17k questions, re-verifies the math,
                                 # checks choices/hints/answer-position balance

cd tools/e2e && npm install      # one-time (playwright-core only, dev-only)
node tools/e2e/run.mjs           # boots every scene, autoplays a full stage +
                                 # a boss stage, exercises wrong-answer flow,
                                 # mobile viewports, save corruption, offline
```

The game itself has **zero dependencies** — `tools/` is dev tooling only and is
excluded from deploys.

## Deploy to S3 + CloudFront

One-time AWS setup:

1. **S3 bucket** (e.g. `math-defenders`): keep *Block all public access* ON —
   CloudFront will read it privately.
2. **CloudFront distribution**:
   - Origin: the S3 bucket, with **Origin Access Control** (OAC); apply the generated
     bucket policy so only CloudFront can read the bucket.
   - Default root object: `index.html`
   - Viewer protocol policy: *Redirect HTTP to HTTPS*
   - Compression: enabled (Brotli/Gzip)
   - (Optional) Alternate domain + ACM certificate in `us-east-1`.
3. Locally: AWS CLI configured, then:

```bash
cp deploy.config.example deploy.config   # fill in BUCKET + DISTRIBUTION_ID
./deploy.sh
```

The script uploads with sensible cache headers — long cache for `js/css/icons`,
`no-cache` for `index.html`, `sw.js`, and the manifest — and invalidates just those
three paths on CloudFront. When shipping significant changes, bump `VERSION` in
`sw.js`; the stale-while-revalidate worker self-heals either way on the next load.

## Architecture

```
index.html, css/style.css        shell + bubbly toy-styled UI (HTML overlay)
js/core/    engine (fixed-step loop + scenes), screen/input, save, seeded RNG
js/gfx/     palettes, chibi drawing kit, sprite baker, world art, particles
js/audio/   Web Audio SFX synths + per-world chiptune sequencer
js/data/    tuning (all game-feel numbers + copy), question generators,
            RAMP tables, 14 world configs        ← DOM-free, testable in Node
js/ui/      DOM helpers/icons, HUD, question panel, shop/settings/gacha modals
js/scenes/  title, world select, map, play (battle), results, dev gallery
sw.js, manifest.webmanifest, icons/   PWA layer (installable, offline-capable)
tools/      dev-only: curriculum audit, e2e suite, icon generator
```

Module layering is one-way — `core → (gfx | audio | data) → ui → scenes → main` —
and `js/data/` never touches the DOM, which is what lets the entire curriculum be
verified headlessly in plain Node.
