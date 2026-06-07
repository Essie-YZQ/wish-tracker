# PROJECT_STATUS.md

## Purpose

This file is a reusable project status snapshot for Bloom Journal.
Read `AGENTS_PLAYBOOK.md` and `UI_Guidelines.md` before using this file.

---

## Current Priority

- Puppy Companion System shipped to production; Firebase dog sync is committed locally and waiting for production push.
- Approved idle puppy designs are the master visual references for future puppy assets.
- Puppy location/pose state now syncs through Firebase so S and Kang see the same dogs.
- Next work should focus on visual QA and optional placement expansion beyond S / Kang / Pool cards.

---

## Current Project State

- App deployed: https://essie-yzq.github.io/wish-tracker/
- Asset versions: `style.css?v=23`, `script.js?v=18`
- Latest dog sync code commit: `7475a63 Ensure puppy state renders from Firebase`
- Latest production commit: `3129fc8 Add puppy companion system assets` (dog sync not pushed yet)
- Tech stack: vanilla HTML / CSS / JavaScript, Firebase Firestore, GitHub Pages
- Firebase document: `shared_state/main` in project `bloom-journal-2e692`
- Two users: S (`user_id: "s"`, emoji 🐑) and KK (`user_id: "kk"`, emoji 🐷)

---

## All Completed Features

### Wish & Balance System
- Each user earns wishes by completing habits. Wishes are stored in personal balance.
- Pool balance = 30 − sBalance − kkBalance (derived, not independent).
- **Donate**: send 1 personal wish back to Pool (undoable).
- **Withdraw**: take 1 wish from Pool to personal balance (undoable).
- **Give to KK / Give to S**: transfer 1 wish to the other user (undoable).
- **Undo**: reverses the last Donate, Withdraw, or Give action. One level only.

### Vase & Flower System
- Crystal vase SVG with bell-curve fan arrangement of flowers.
- 24 unique flower SVGs.
- Flower picker: 3-column grid, 8 rows.
- Vase water level reflects wish balance as a percentage of 30.
- "Clean Slate" and "Surprise Me" buttons.
- Pool card uses a decanter (trapezoid shape).

### Mystery Seed / Wish Draw Feature
- Cost: **2 personal wishes** (changed from 10).
- Success probability: **20%** (hidden from user — NOT displayed anywhere).
- On success: unlock a random new flower (existing reveal animation kept).
- On puppy event: puppy companion appears (see Dog System below).
- Confirmation modal: randomizes title, description, button pairs from copy pools.
- "2 wishes" cost embedded naturally in description text — no separate cost line.
- Main button text is FIXED: `🌱 Plant the Seed` (never randomized).
- Success message: randomized from 10-option pool (`SEED_SUCCESS_MSGS`).
- Dog companion message: randomized from 10-option pool (`SEED_DOG_MSGS`), all warm/positive framing.

### Dog Presence System (2026-06-05)

#### Character assets
- **Master idle designs (approved 2026-06-05)**:
  - `images/white-puppy-idle.png` = official S / White Puppy design.
  - `images/yellow-puppy-idle.png` = official Kang / Yellow Puppy design.
  - Do NOT redesign or reinterpret these characters. Future assets should match these exact designs, proportions, face, ears, outline style, and colors.
  - White puppy transparency rule: preserve white body, black outline, and purple collar. If clean background removal risks removing the white body, keep a soft cream background remnant instead.
  - Yellow puppy transparency rule: preserve yellow body, black outline, and green ball.
- **Basic pose preview pack (2026-06-05)**:
  - Preview sheet: `images/puppy_pose_previews/pose-sheet-basic-8.png`.
  - Review sheet: `images/puppy_pose_previews/review-sheet-basic-8.png`.
  - Confirmed by owner as visually correct: white run, white sleep, white hold flower, white look at user, yellow run, yellow sleep, yellow hold ball, yellow look at user.
- **Basic pose transparent assets (integrated into app 2026-06-05)**:
  - Directory: `images/puppy_pose_assets/`.
  - Files: `white-puppy-run.png`, `white-puppy-sleep.png`, `white-puppy-hold-flower.png`, `white-puppy-look-user.png`, `yellow-puppy-run.png`, `yellow-puppy-sleep.png`, `yellow-puppy-hold-ball.png`, `yellow-puppy-look-user.png`.
  - Review sheet: `images/puppy_pose_assets/review-sheet-transparent-basic-8.png`.
  - These are conservative RGBA cutouts with soft cream safety halo to avoid losing puppy body pixels, especially on the white puppy.
  - `script.js` now uses `DOG_ASSETS` to map dog colors/poses to these approved assets.
  - Roaming single-dog poses use idle/sleep/hold flower or ball/look at user. Entrance animation swaps temporarily to run pose.
  - Together mode now uses single together assets from `DOG_TOGETHER_ASSETS` rather than rendering two separate dog images.
- **Puppy Moments Pack 1 preview (2026-06-05, not yet integrated)**:
  - Directory: `images/puppy_moments_previews/`.
  - Full sheet: `images/puppy_moments_previews/pose-sheet-moments-12.png`.
  - Review sheet: `images/puppy_moments_previews/review-sheet-moments-12.png`.
  - Single-dog previews: `preview-white-violin.png`, `preview-white-stretch.png`, `preview-white-lazy-nap.png`, `preview-white-riverside-walk.png`, `preview-yellow-yummy-time.png`, `preview-yellow-snack-attack.png`, `preview-yellow-zoomies.png`, `preview-yellow-love-you.png`.
  - Together previews: `preview-together-high-five.png`, `preview-together-cuddle.png`, `preview-together-walk.png`, `preview-together-movie-night.png`.
  - These are soft-cream-background confirmation previews.
- **Puppy Moments Pack 1 transparent assets (2026-06-06, integrated into roaming)**:
  - Directory: `images/puppy_moments_assets/`.
  - Review sheet: `images/puppy_moments_assets/review-sheet-transparent-moments-12.png`.
  - Single-dog assets: `white-puppy-violin.png`, `white-puppy-stretch.png`, `white-puppy-lazy-nap.png`, `white-puppy-riverside-walk.png`, `yellow-puppy-yummy-time.png`, `yellow-puppy-snack-attack.png`, `yellow-puppy-zoomies.png`, `yellow-puppy-love-you.png`.
  - Together assets: `together-high-five.png`, `together-cuddle.png`, `together-walk.png`, `together-movie-night.png`.
  - All 12 single asset files are RGBA PNGs with real alpha.
  - Current version uses a rounded soft cream safety patch with transparent corners, rather than tight cutouts. This prevents cropped heads/ears and avoids transparent holes in the white puppy body.
  - Integrated through `DOG_ASSETS` for single-dog moments and `DOG_TOGETHER_ASSETS` for together moments.
  - Together moments are rendered as one image that already contains exactly two puppies, not as two separate dog images.
  - Roaming supports: white puppy alone, yellow puppy alone, white/yellow separated into two different cards, or one together image in one card.
- **Legacy sprite-sheet extractions**:
  - Older `s-*.png`, `k-*.png`, and `together-*.png` assets from the Claude extraction are no longer used and were deleted by the owner.
  - Do not reintroduce the legacy extracted assets unless explicitly requested.
- Source: `images/sprite_sheet.png` (1536×1024, keep this file for future re-extraction).

#### Extraction script
- The extraction logic lives in the session transcript. Key parameters:
  - White dogs: `extract_dilation(cell, dark_thresh=70, dilation=4)`
  - Yellow dogs: `extract_tolerance(cell, tolerance=42)`
  - Column x-boundaries scaled from original 1402px image: `col_x = [int(v*(W/1402)) for v in [0,174,347,524,691,847,1033,1234,1402]]`
  - Row y-boundaries for 1536×1024 image: s_row1=(55,215), s_row2=(375,505), k_row1=(570,705), k_row2=(820,955), t_row=(880,1020)

#### Dog state machine (`dog_state` in script.js)
- **Roaming mode** (default): dogs appear randomly in the currently supported dog slots (S card, KK card, pool card).
  - Dog position/pose is synced through Firebase field `dogState`, so different devices see the same dog scene.
  - Dogs do not render until shared Firebase `dogState` is ready, preventing mobile/desktop from briefly showing different local random puppies on page open.
  - If Firebase has no `dogState` yet, the app creates one shared roaming state.
  - Every hour, a new position and pose are selected and written back to Firebase.
  - Possible configs: white dog alone, yellow dog alone, white/yellow separated into different cards, or both together as one image.
  - `dog_state.entries` stores one or more `{placement, pose_key}` entries so separated dogs can render in different cards at the same time.
  - Poses are drawn from approved single-dog assets and together moment assets.
- **Companion mode** (after puppy event): the selected puppy event goes to the user's card for 24 hours.
  - Stored in Firebase `dogState` with `companion_user_id`, `companion_until`, `event_kind`, `entries`, and `next_move_at`.
  - Legacy `localStorage` key `bloom_dog_companion` is removed on load and no longer used as the source of truth.
  - Event kinds: white puppy only, yellow puppy only, or one together image containing exactly two puppies.
  - If another user triggers a puppy event within 24h, companion ownership transfers to the newest user and timer resets.
  - Every hour during companion mode, the companion keeps the same owner/card but changes pose within the same event kind.
  - After 24h, reverts to free-roaming automatically.
- **Puppy Event rules**:
  - Seed draw costs 2 wishes.
  - Success chance is 20% and never shown to users.
  - Puppy event chance is 80% and never framed as failure in UI copy.
  - A puppy event is randomized once and reused for both the overlay and the 24h companion assignment.
  - Valid puppy counts: 1 white puppy, 1 yellow puppy, or one together asset containing exactly 2 puppies. Never add extra puppies on top of a together asset.

#### Entrance animation
- Dogs run in from the side of their card when they first appear in a placement.
- S's card / pool: dog enters from LEFT (`dog_enter_left` keyframe, `translateX(-200px)→0`).
- KK's card: dog enters from RIGHT (`dog_enter_right` keyframe, `translateX(200px)→0`).
- Sequence: run pose (1.1s) → idle pose swap → bounce → curious head tilt → settle → idle breathing.
- `dog_has_entered` flag ensures entrance plays only once per placement event.
- After 3.1s: `dog_idle` class added → `dog_alive` keyframe (breathing + head tilt, 8s infinite).

#### CSS
- `.dog_presence_img`: 88px wide, `filter: drop-shadow(0 1px 4px rgba(90,70,60,0.22))` for visibility on light backgrounds.
- `.dog_presence_pair`: two dogs side by side at 72px each.
- `.dog_entering_left` / `.dog_entering_right`: entrance keyframes.
- `.dog_idle`: breathing animation via `dog_alive` keyframe.

### Weekly Sources Display
- Shows `+ 📚 💪 this week` under each user's balance.
- Bug fixed (2026-06-01): stale icons from previous week prevented by storing `weekStart` in Firebase.

---

## All Product & Design Decisions

### Mystery Seed / Dog Draw Design
- Cost 2 wishes (not 10) — lower barrier encourages draws.
- 20% success rate is intentional and HIDDEN from users.
- Dog failure event is framed as a positive companion moment, NOT a loss.
- Dog messages all use warm, companion language — never failure language.

### Dog Character Design
- White dog = S's dog, official design is `images/white-puppy-idle.png`.
- Yellow dog = Kang/KK's dog, official design is `images/yellow-puppy-idle.png`.
- Current idle puppies are the master character references. Do not redesign them; all future puppy assets should match their face, ears, proportions, outline, and colors.
- Both dogs roam together naturally — their presence is ambient and delightful.
- Together mode uses one together image that already contains exactly two puppies.

### Vase & Visual Design
- (unchanged from before — see git history for details)

---

## Firebase Data Structure

Fields in `shared_state/main`:
```
sBalance, kkBalance, poolBalance  integers
weekStart                          ISO date string
sWeeklySources, kkWeeklySources    arrays of emoji
sVaseFlowers, kkVaseFlowers        arrays of flower IDs
sUnlockedFlowers, kkUnlockedFlowers arrays of flower IDs
sHabitStatus, kkHabitStatus        objects
dogState                           object for shared puppy position/pose/companion timer
history                            array
```

### Production Flower State Reset (2026-06-06)

Firebase `shared_state/main` flower fields were reset after testing:

- `sUnlockedFlowers`: `['snowdrop', 'gladiolus']`
- `kkUnlockedFlowers`: `['snowdrop', 'water_lily']`
- `sVaseFlowers`: `[]`
- `kkVaseFlowers`: `[]`

Repository files do not store test unlock state. Flower unlock progress persists through browser `localStorage` and Firebase; production shared state was cleaned directly in Firebase.

---

## Known Issues / Limitations

- **White dog visibility**: white body on light lavender card has low natural contrast. Mitigated with CSS `drop-shadow`. If card background changes, may need to revisit.
- **New basic pose transparent assets**: current cutouts intentionally keep a visible soft cream safety halo around puppies to preserve body pixels. They may need edge refinement later, but they are integrated now so the tracker does not reference deleted legacy assets.
- Hourly dog movement can be written by whichever open device notices the timer first; last write wins. This is acceptable for now, but a Firestore transaction/lease could make it stricter later.

---

## Files Changed This Session

- `script.js` (v18): Dog state now syncs through Firebase `dogState`; Puppy Event companion ownership, hourly movement, and free-roaming position/pose are shared across devices. Dogs wait for shared Firebase state before rendering, preventing mobile/desktop opening mismatch. Legacy `bloom_dog_companion` localStorage state is cleared.
- `style.css` (v23): `dog_presence_together_img` and `seed_fail_together_dog` widths added so together single-image assets display larger.
- `index.html`: version bumps to style.css?v=23, script.js?v=18.
- `images/white-puppy-idle.png`, `images/yellow-puppy-idle.png`: approved master idle puppy designs.
- `images/puppy_pose_previews/`: generated/confirmed 8-pose preview sheet and individual preview crops.
- `images/puppy_pose_assets/`: conservative transparent PNGs for 8 basic poses plus transparent review sheet; integrated via `DOG_ASSETS`.
- `images/puppy_moments_previews/`: Puppy Moments Pack 1 preview sheet, individual crops, and review sheet; not yet transparent and not integrated.
- `images/puppy_moments_assets/`: Puppy Moments Pack 1 transparent PNG assets and transparent review sheet; integrated into roaming.

---

## Pending Work / Open Questions

- Visual check shared puppy display on S / Kang / Pool cards across mobile and desktop.
- Consider: refine transparent edges on the new basic pose assets, reducing cream halo without removing white puppy body.
- Visual check hourly movement and Puppy Event companion transfer behavior across two devices.
- Future UI expansion: add dog render slots beyond S/KK/pool, such as weekly section, vase/flower area, empty decorative spaces, and outside-card positions.
- Future puppy moments expansion requested: kissing/hugging variations, more walking together, and additional scene-like interactions.

---

## Recommended Next Step

- Push latest `main` to production, then test two devices/browsers against the same deployment and confirm `dogState` keeps puppy placement/pose synchronized.
- If more code changes are made later, bump `index.html` asset versions before pushing.
- Read `UI_Guidelines.md` before any further UI changes.

---

## Notes for Future AI Agents

- Read `AGENTS_PLAYBOOK.md` → `PROJECT_STATUS.md` → `UI_Guidelines.md` before any UI work.
- Communicate in Chinese with the project owner. Keep technical terms in English.
- Local test server: http://127.0.0.1:5500/index.html
- After pushing to GitHub, bump version numbers in index.html to bust browser cache.
- The dog PNG files in `images/` were extracted from `images/sprite_sheet.png`. Keep that file.
- Official puppy design references are now `white-puppy-idle.png` and `yellow-puppy-idle.png`, not the older extracted `s-sit.png` / `k-sit.png` files.
- The older `s-*.png`, `k-*.png`, and `together-*.png` files were deleted and should not be referenced by app code.
- `dog_has_entered` is a module-level boolean. It resets when placement/owner changes locally or through Firebase. This prevents re-entrance on ordinary Firebase re-renders.

---

## Last Updated

- Last updated by: Codex
- Last updated date: 2026-06-07
