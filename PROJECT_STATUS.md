# PROJECT_STATUS.md

## Purpose

This file is a reusable project status snapshot for Bloom Journal.
Read `AGENTS_PLAYBOOK.md` and `UI_Guidelines.md` before using this file.

---

## Current Priority

- The Withdraw button appeared broken (displayed pool balance showed wishes available but clicking did nothing) due to a stale local recompute of `pool_balance` fighting the independently-synced Firestore value — fixed 2026-08-22, see "Withdraw Button Broken / Pool Balance Display Bug Fix" below.
- Underlying that: the Mystery Seed draw's 2-wish cost was never being credited back to the pool, which genuinely drained the real pool to 0 over time (breaking the intended constant-30-total design). Code fixed 2026-08-22 (see "Mystery Seed Draw Not Returning Cost to Pool Fix" below) and the live Firestore `poolBalance` has been manually corrected from 0 to 22 to restore the constant-30 total — see "Production data correction" note at the end of that section. Both fixes pushed to `origin/main`; fully resolved.
- The wish-balance race condition recurred after the 2026-07-08 fix and has been fixed again, more thoroughly, on 2026-07-11 — see "Wish Balance Sync Bug Fix (Round 2)" below. The 2026-07-08 fix was necessary but not sufficient.
- The weekly-sources emoji row (which habits earned wishes this week) had the same class of bug and was fixed the same day — see "Weekly Sources Display Bug Fix (2026-07-11)" below.
- S's `drink_water` and `sleep_early` weekly targets lowered from 7 to 5 (2026-07-11, owner request).
- Puppy Companion System and Firebase dog sync are shipped to production.
- Approved idle puppy designs are the master visual references for future puppy assets.
- Puppy location/pose state now syncs through Firebase so S and Kang see the same dogs.
- Next work should focus on visual QA and optional placement expansion beyond S / Kang / Pool cards.

---

## Current Project State

- App deployed: https://essie-yzq.github.io/wish-tracker/
- Asset versions: `style.css?v=23`, `script.js?v=24`
- Latest code commit: see "Mystery Seed Draw Not Returning Cost to Pool Fix" below for the commit hash once pushed.
- Production branch: `origin/main` includes the wish-balance race fix (both rounds), the weekly-sources fix, the target_per_week change, and the Firebase dog sync fix.
- Tech stack: vanilla HTML / CSS / JavaScript, Firebase Firestore, GitHub Pages
- Firebase document: `shared_state/main` in project `bloom-journal-2e692`
- Two users: S (`user_id: "s"`, emoji 🐑) and KK (`user_id: "kk"`, emoji 🐷)

---

## All Completed Features

### Wish & Balance System
- Each user earns wishes by completing habits. Wishes are stored in personal balance.
- `sBalance + kkBalance + poolBalance` is a closed economy that must always equal a constant 30. `poolBalance` is its own independently Firestore-synced field (via `increment()` deltas, not derived/recomputed locally — see "Withdraw Button Broken / Pool Balance Display Bug Fix" and "Mystery Seed Draw Not Returning Cost to Pool Fix", both 2026-08-22, for two bugs that broke this invariant and how they were fixed). Every balance-mutating action must move wishes between exactly two of these three buckets — never create or destroy them.
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
- Shows `+ 📚 💪 this week` under each user's balance — which habits/transfers earned wishes this week.
- Bug fixed (2026-06-01): stale icons from previous week prevented by storing `weekStart` in Firebase. This turned out to be incomplete — see the 2026-07-11 fix below, which found the underlying `weekStart`-update mechanism itself was broken.

### Wish Balance Sync Bug Fix (2026-07-08)

**Reported symptoms:**
- Checking a habit sometimes showed the confetti animation but the wish balance did not actually increase (intermittent — worked fine other times).
- KK's wish pool balance once reset to zero for no visible reason.

**Root cause:** every action that mutates balances (`toggle_habit_day`, `perform_balance_action`, `pick_flower`, `clear_vase`, `shuffle_vase` in `script.js`) reads the full local state, mutates it, saves it locally, then asynchronously pushes **all three** balance fields (`sBalance`, `kkBalance`, `poolBalance`) to Firestore from that captured snapshot — not just the field the action changed. None of these were serialized against each other, and `toggle_habit_day` is fired from the click handler without `await`. Checking off multiple habits quickly fired overlapping calls; if an earlier call's Firestore write resolved after a later one's, its stale captured snapshot silently overwrote the newer data, including balance fields it never touched (the other user's balance, the pool). This matches both reported symptoms.

**Fix:** added a `run_serialized()` promise queue at the top of `script.js` and routed all five mutate-and-push functions through it, so each read → mutate → save → push cycle fully completes before the next one starts. No architecture change and no unrelated cleanup — scoped strictly to these two symptoms per owner's request.

**Verified via:** full code trace of the read/mutate/save/push cycle across all five functions, plus a standalone Node.js simulation (outside the app) that reproduced the exact lost-update pattern before the fix and confirmed it no longer occurs after the fix. Could not click-test live in a browser — no headless browser tool (chromium-cli/playwright) was available in the environment, and this app's Firestore document (`shared_state/main`) holds S and KK's real production balances, so it wasn't safe to poke at interactively for a test.

**Residual risk (not fixed, lower priority):** the one-shot `loadFromFirebase()` call at page load isn't routed through the same queue, so an action taken in the very first instant after page load could theoretically still race it. Much narrower window than the bug that was fixed. Revisit if balance issues recur specifically right after opening the app.

- Code commit: `fde0e9c Serialize wish balance mutations to fix lost increments and pool zeroing`
- `script.js` bumped to `?v=19`.

### Wish Balance Sync Bug Fix, Round 2 (2026-07-11)

**Why round 1 wasn't enough:** the 2026-07-08 fix serialized calls on the *write* side (`toggle_habit_day` etc. against each other), but every one of those functions still pushed **absolute** balance values (`sBalance: state.users[0].wish_balance`, etc.) read from local state. The realtime `onSnapshot` listener (`subscribeToFirebaseBalances`) was never part of that queue and was never touched — it does its own unguarded read → merge → save cycle every time the shared Firestore document changes for *any* reason (a balance change, a vase change, even the hourly dog-state push touches the same doc). If this device's local copy of a balance was stale for any reason (most commonly: the other user's device pushed a change this device hadn't caught up on yet), the next local action — even an unrelated one like shuffling the vase — would still push the stale absolute number and silently overwrite the real value. This is exactly what happened again.

**Root cause (this round):** absolute-value overwrites of `sBalance`/`kkBalance`/`poolBalance`, computed from local state that can be behind the real (server) value, sent on every balance-touching write regardless of whether the local copy was current.

**Fix:** stopped sending absolute balance values entirely. `saveBalancesToFirebase()` now takes an optional `balance_deltas` argument and uses Firestore's `increment()` — an atomic server-side add — for only the fields that actually changed in that action; fields that didn't change are omitted from the update rather than re-sent. Every balance-mutating call site (`toggle_habit_day`, `perform_balance_action`, `perform_mystery_seed_draw`) now computes an explicit before/after delta and passes it through. `pick_flower`/`clear_vase`/`shuffle_vase` never touch balance, so they now correctly send no balance fields at all (previously they always re-sent all three, redundantly and dangerously). Because `increment()` is atomic and commutative on the server, the final value is correct no matter what order concurrent writes from different devices land in — this closes the bug class at the root instead of only reducing the race window.

**Verified via:** built a lightweight fake Firestore backend (a real Node HTTP server modeling Firestore's `increment()` semantics and a client-side module mirroring the real SDK's "read-your-own-writes" optimistic-echo behavior for `onSnapshot`/`updateDoc`), since installing the real Firestore emulator wasn't possible (this machine's Java is too old, and installing a JDK just for this felt like overreach for a one-off test). Served the real, unmodified `index.html`/`script.js` and drove it with a real headless Chromium (Playwright), rerouting only the Firestore SDK import — the app code under test was byte-identical to what's committed. Three scenarios, each run several times for flakiness:
1. Rapid same-tab clicking across two habits (9 clicks fired in one batch) → balance and pool end up exactly correct.
2. Two independent browser contexts (simulating S's and KK's separate devices) acting concurrently → both balances and the pool end up exactly correct.
3. An unrelated vase action on one device, right after the *other* device's balance changed server-side → the other device's change survives (this is the exact "KK's pool reset to zero" pattern).
Re-ran the same three scenarios against the pre-round-2 code (`git show HEAD:script.js` at the time) as a control: scenarios 2 and 3 failed on the old code in the same way reported (the other user's balance got clobbered back down), confirming the test suite actually discriminates the bug and that the fix addresses it. Cleaned up all test scaffolding (temp server, temp app copy, temp Firestore fake) after — none of it is part of the repo.

**Also investigated and ruled out as a real bug:** an early version of the test (using a naive polling-only fake Firestore with no local-write echo) showed the same-tab scenario reverting a just-checked day. Tracing it down: this was an artifact of the fake not modeling Firestore's real "read-your-own-writes" guarantee (a client's own pending writes are reflected in its own listeners immediately, before any network round trip). Rebuilding the fake to match that guarantee made the scenario pass consistently, and reasoning through the real SDK's documented behavior confirms a single client's own listener cannot see stale data behind its own writes. No code change was needed for this; noted here so a future session doesn't have to rediscover it.

- `script.js` bumped to `?v=20`.

### Weekly Sources Display Bug Fix (2026-07-11)

**Reported symptom:** the emoji row under each user's balance ("earned this week from...") often doesn't update, and sometimes shows icons left over from *last* week instead of this week's.

**Two distinct root causes found, both in the same area as the balance bug above:**

1. **`sWeeklySources`/`kkWeeklySources` were pushed as absolute values for BOTH users, unconditionally, on every single balance-mutating write** — `saveBalancesToFirebase()` recomputed and sent both arrays from local state regardless of which user's (if anyone's) sources actually changed in that action. `return_to_pool`/`withdraw_from_pool`/`perform_mystery_seed_draw` never touch sources at all, yet were still overwriting both users' arrays with whatever this device's local (possibly stale) copy happened to be. Worse: `perform_balance_action` builds its state via `getLatestStateFromFirebase()`, which fetches fresh balances but does **not** fetch fresh habit-claim status — so the habit-derived half of the sources computation was *always* working from local cache in this path, not the true server value. This is the dominant cause of "often doesn't update" — nearly any give/return/withdraw/undo action could silently stomp the display.
2. **`resetWeeklySourcesInFirebase()` (called on week rollover) cleared the arrays but never updated `weekStart`.** Since reads gate applying `sWeeklySources`/`kkWeeklySources` on `data.weekStart === current_week`, a device would ignore the (correctly cleared) remote arrays until *some unrelated action* happened to also push a fresh `weekStart` — in the meantime a still-loading device could keep showing last week's icons. This is the "leftover from last week" half of the symptom.

**Fix:**
1. `saveBalancesToFirebase()` now takes a `changed_source_user_ids` argument (e.g. `['s']`, `['kk']`, both, or neither) and only includes `sWeeklySources`/`kkWeeklySources` in the update for a user actually in that list — mirroring the delta-scoping approach used for balances. `toggle_habit_day` passes the acting user; `perform_balance_action` computes it generically by diffing each user's derived sources before/after the switch statement (so `give_to_other`/`undo_last_action` correctly flag only the receiving user, `return_to_pool`/`withdraw_from_pool` correctly flag no one); `perform_mystery_seed_draw` and the vase actions pass none (they never touch sources).
2. `resetWeeklySourcesInFirebase()` now takes the new week's start date and sets `weekStart` in the same `updateDoc()` call that clears the arrays.

**Verified via:** the same real-browser-plus-fake-Firestore approach as the balance fix, three new scenarios: (1) one user claiming a habit while the other user's sources stay untouched, and vice versa when the second user acts; (2) a device with a deliberately-corrupted local cache (simulating "went stale while offline") taking an unrelated action, confirming it can't clobber the server's correct sources — this one reproducibly failed on the pre-fix code and passes on the fix; (3) a simulated week-boundary rollover (seeded localStorage from "last week" plus a real system clock in the current week), confirming `weekStart` gets updated on the server and the app doesn't display last week's icon — this also reproducibly failed on the pre-fix code (`weekStart` stayed on last week) and passes on the fix. All existing balance tests re-run afterward with no regressions. Test scaffolding cleaned up, none of it is part of the repo.

- `script.js` bumped to `?v=22`.

### Withdraw Button Broken / Pool Balance Display Bug Fix (2026-08-22)

**Reported symptom:** the Withdraw button stopped working — clicking it did nothing, even though the displayed Pool balance showed wishes available.

**Root cause:** `normalize_balances()` (called on every single `get_state()`/`save_state()`, i.e. on every render) still recomputed `state.pool_balance` from the old formula `total_wishes(30) - sBalance - kkBalance`, left over from before the Wish Balance Sync Bug Fix (Round 2, 2026-07-11) made `poolBalance` an independently-synced Firestore field via `increment()` deltas. That formula assumes the 30 wishes are always conserved between the pool and the two users — true until the Mystery Seed draw feature was added, which permanently spends 2 wishes from a user's balance with no return to the pool. Every seed draw made the recomputed (displayed) pool balance drift further above the true, correctly-synced value. Eventually the real pool could reach 0 (normal, expected depletion from habit rewards) while the display still showed a positive number — so clicking Withdraw correctly refused (checked against the real synced value) and silently showed "No wishes available," looking exactly like the button was broken. Other buttons (Donate, Give, Undo, Mystery Seed) were unaffected because their guard checks are against user balances, which this recompute never touched.

**Fix:** `normalize_balances()` now only sanitizes `pool_balance` (`Math.max(0, Number(state.pool_balance) || 0)`), the same way `wish_balance` is sanitized, instead of re-deriving it. `pool_balance` is treated as its own independent field end-to-end now, matching how it's already synced to Firestore.

**Verified via:** a standalone Node reproduction of the old vs. new `normalize_balances` logic (10 habit-reward claims, 3 mystery-seed draws, 10 more reward claims draining the real pool to 0) — the old logic showed a displayed pool balance of 6 while the true synced value was 0 (reproducing the exact "looks available, click does nothing" symptom); the new logic always matches the true value exactly. No Firebase needed since this bug is pure local arithmetic, not a sync race.

- `script.js` bumped to `?v=23`.

### Mystery Seed Draw Not Returning Cost to Pool Fix (2026-08-22)

**Why the previous fix wasn't the whole story:** the display/real-value mismatch above was real and is fixed, but the owner clarified the actual intended design: `sBalance + kkBalance + poolBalance` must always equal a constant 30 — the Mystery Seed draw's 2-wish cost is meant to move from the drawing user's own balance back into the shared pool, not disappear from the economy. Checking the live Firestore data confirmed the pool had genuinely reached 0 with `sBalance=6, kkBalance=2, poolBalance=0` (total 8, not 30) — 22 wishes missing, consistent with roughly 11 past seed draws never having credited the pool.

**Root cause:** `perform_mystery_seed_draw()` deducted the 2-wish cost from the user's balance but never added it back to `state.pool_balance`, and its `balance_deltas` object only included the user's `-2`, never `pool: +2`. Every draw permanently shrank the 30-wish economy instead of just moving 2 wishes from a personal vase to the pool. Over enough draws this is what drained the real pool to 0 and made Withdraw correctly (but unhelpfully) refuse every time.

**Fix:** `perform_mystery_seed_draw()` now also does `state.pool_balance += 2` and includes `pool: 2` in `balance_deltas`, so the cost is credited back to the pool via the same atomic `increment()` path as every other balance-mutating action, restoring the 30-wish conservation invariant end-to-end.

- `script.js` bumped to `?v=24`.
- Code commit: `28b69c0 Credit Mystery Seed draw's 2-wish cost back to the pool`, pushed to `origin/main` 2026-08-22.

**Production data correction (2026-08-22):** the bug above had already drained the live `poolBalance` in Firestore (`shared_state/main`) to 0 before the code fix landed, with `sBalance=6, kkBalance=2` (total 8, not the constant 30). Corrected by directly patching `poolBalance` to `22` via the Firestore REST API (owner confirmed before this write), restoring `6 + 2 + 22 = 30`. Cross-checked against the `history` snapshot for the prior week (`2026-08-17`: sBalance 7, kkBalance 2, poolBalance 21 — already summing to 30), which independently confirms 22 is the correct restored pool value and that the leak happened entirely within the current week (~11 seed draws' worth). No other fields were touched.

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
- `loadFromFirebase()` and the realtime `onSnapshot` listener still do unguarded absolute-value merges of balance fields into local state on *read*. This is fine now that *writes* are delta-based (increment()) — a stale read can't corrupt the server-side truth anymore, it can at most show a briefly-outdated number locally until the next sync tick. Low priority; see "Wish Balance Sync Bug Fix, Round 2" above.
- `sHabitStatus`/`kkHabitStatus` (which days are checked, per habit) are still synced as full absolute-object overwrites, not deltas, unlike the balance fields. This wasn't part of either reported bug (habit checkboxes reportedly display correctly; only the wish *count* was wrong), and per real Firestore's read-your-own-writes guarantee a single device's own rapid clicking should be safe. It was deliberately left out of scope for the Round 2 fix. If checkbox state itself is ever reported as reverting or duplicating, start here.

---

## Files Changed This Session

- `script.js` (v22): added `changed_source_user_ids` scoping to `saveBalancesToFirebase()` so `sWeeklySources`/`kkWeeklySources` are only pushed for a user whose sources actually changed; `resetWeeklySourcesInFirebase()` now also updates `weekStart`. See "Weekly Sources Display Bug Fix" above.
- `script.js`: lowered S's `s_sleep_early` and `s_drink_water` `target_per_week` from 7 to 5.
- `index.html`: version bump to `script.js?v=22`.

### Earlier This Session (Wish Balance Fix, Round 2)

- `script.js` (v20): switched all balance-mutating writes (`toggle_habit_day`, `perform_balance_action`, `perform_mystery_seed_draw`) to push Firestore `increment()` deltas instead of absolute values; `saveBalancesToFirebase()` now omits balance fields entirely when nothing changed. See "Wish Balance Sync Bug Fix, Round 2" above.
- `index.html`: version bump to `script.js?v=20`.

### Previous Session (Wish Balance Fix, Round 1)

- `script.js` (v19): added `run_serialized()` promise queue; routed `toggle_habit_day`, `perform_balance_action`, `pick_flower`, `clear_vase`, `shuffle_vase` through it.
- `index.html`: version bump to `script.js?v=19`.

### Previous Session (Dog Sync)

- `script.js` (v18): Dog state now syncs through Firebase `dogState`; Puppy Event companion ownership, hourly movement, and free-roaming position/pose are shared across devices. Dogs wait for shared Firebase state before rendering, preventing mobile/desktop opening mismatch. Legacy `bloom_dog_companion` localStorage state is cleared.
- `style.css` (v23): `dog_presence_together_img` and `seed_fail_together_dog` widths added so together single-image assets display larger.
- `images/white-puppy-idle.png`, `images/yellow-puppy-idle.png`: approved master idle puppy designs.
- `images/puppy_pose_previews/`: generated/confirmed 8-pose preview sheet and individual preview crops.
- `images/puppy_pose_assets/`: conservative transparent PNGs for 8 basic poses plus transparent review sheet; integrated via `DOG_ASSETS`.
- `images/puppy_moments_previews/`: Puppy Moments Pack 1 preview sheet, individual crops, and review sheet; not yet transparent and not integrated.
- `images/puppy_moments_assets/`: Puppy Moments Pack 1 transparent PNG assets and transparent review sheet; integrated into roaming.

---

## Pending Work / Open Questions

- Confirm with S and KK that the confetti/balance-not-increasing issue and the pool-zeroing issue don't recur. This is the second fix for the same symptom; if it recurs a third time, stop and question whether the localStorage-primary + full-document Firestore sync architecture itself (not just individual field sync logic) needs to change, rather than attempting a third narrow fix.
- Visual check shared puppy display on S / Kang / Pool cards across mobile and desktop.
- Consider: refine transparent edges on the new basic pose assets, reducing cream halo without removing white puppy body.
- Visual check hourly movement and Puppy Event companion transfer behavior across two devices.
- Future UI expansion: add dog render slots beyond S/KK/pool, such as weekly section, vase/flower area, empty decorative spaces, and outside-card positions.
- Future puppy moments expansion requested: kissing/hugging variations, more walking together, and additional scene-like interactions.

---

## Recommended Next Step

- Both users should reload the app (hard refresh if needed) and use it normally for a few days; watch specifically for the confetti-without-increase and balance-reset patterns.
- If it recurs, capture what both S's and KK's devices were doing right before/after (which actions, roughly how close in time) — that detail was not available for round 1 or round 2 and would help pin down whether it's the `sHabitStatus` full-overwrite gap noted in Known Issues or something else entirely.
- Test two devices/browsers against the production deployment and confirm `dogState` keeps puppy placement/pose synchronized.
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

- Last updated by: Claude
- Last updated date: 2026-08-22
