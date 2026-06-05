# PROJECT_STATUS.md

## Purpose

This file is a reusable project status snapshot for Bloom Journal.
Read `AGENTS_PLAYBOOK.md` and `UI_Guidelines.md` before using this file.

---

## Current Priority

- No open tasks. App is stable and deployed.

---

## Current Project State

- App deployed: https://essie-yzq.github.io/wish-tracker/
- Asset versions: `style.css?v=15`, `script.js?v=6` (pushed 2026-06-01)
- Tech stack: vanilla HTML / CSS / JavaScript, Firebase Firestore, GitHub Pages
- Firebase document: `shared_state/main` in project `bloom-journal-2e692`
- Two users: S (`user_id: "s"`, emoji 🐑) and KK (`user_id: "kk"`, emoji 🐷)
- S has 8 habits, KK has 5 habits. Each habit earns 1 wish when weekly target is met.
- Total wish pool: 30 (sBalance + kkBalance + poolBalance = 30 always)

---

## All Completed Features

### Wish & Balance System
- Each user earns wishes by completing habits. Wishes are stored in personal balance.
- Pool balance = 30 − sBalance − kkBalance (derived, not independent).
- **Donate**: send 1 personal wish back to Pool (undoable).
- **Withdraw**: take 1 wish from Pool to personal balance (undoable).
- **Give to KK / Give to S**: transfer 1 wish to the other user (undoable).
- **Undo**: reverses the last Donate, Withdraw, or Give action. One level only.
- Undo is blocked after a Mystery Seed draw (last_action = null after draw).

### Vase & Flower System
- Crystal vase SVG with bell-curve fan arrangement of flowers.
- 24 unique flower SVGs (36×60 viewBox, stem at y=56, head at y=0–25).
- Flower picker: 3-column grid, 8 rows.
- Vase water level reflects wish balance as a percentage of 30.
- "Clean Slate" button: clears all flowers from vase.
- "Surprise Me" button: fills vase randomly from **unlocked flowers only** (duplicates allowed).
- Vase rim has correct 3D layering: stems behind front rim arc.
- Pool card uses a decanter (trapezoid shape) instead of a vase.
- Large breathing snowflake on decanter bottom-left, anti-phased with stopper snowflake.

### Mystery Seed Feature (2026-05-31)
- Spend 10 **personal** wishes to permanently unlock one new flower (random, no duplicates).
- Pool increases by 10 as a side effect (natural encouragement to donate to pool).
- Buttons: `🐑 Plant a Seed` (S) and `🐷 Plant a Seed` (KK) in the Pool card.
- Disabled when: personal balance < 10, or all 24 flowers already unlocked.
- When all unlocked: button shows "All Bloomed!" instead.
- Confirmation dialog: "Plant a Mystery Seed? / Spend 10 Wishes and discover what blooms!" with 🌱 Plant It / 🤔 Maybe Later.
- Reveal animation: full-screen overlay — 🌱 → 🌿 → radial burst → flower SVG scales in → "New Flower Unlocked!" + English flower name → Continue button.
- Starter: each user begins with only `snowdrop` unlocked.
- S and KK have independent unlock progress.
- Firebase fields: `sUnlockedFlowers`, `kkUnlockedFlowers` (array of flower IDs).
- `normalize_balances()` fallback: if field missing, initializes to `['snowdrop']`.

### Flower Picker Locked State
- Locked flowers: CSS `filter: grayscale(0.72) brightness(0.68) opacity(0.52)` — faint color visible.
- Locked flowers are **clickable** (not `disabled`) — clicking shows toast: "Draw a Mystery Seed to unlock!"
- Toast: fixed bottom-center, fades out after 2.2s, styled as dark pill.
- Unlocked flowers: full color, clickable to insert into vase.
- Vase-full unlocked flowers: `disabled` attribute, cannot be inserted.

### Weekly Sources Display
- Shows `+ 📚 💪 this week` under each user's balance.
- Sources = claimed habit icons + transfer icons received this week.
- Firebase fields: `sWeeklySources`, `kkWeeklySources` (array of emoji strings).
- **Bug fixed (2026-06-01)**: stale icons from previous week were bleeding into new week display.
- Fix: Firebase now stores `weekStart` (ISO date string). Both `loadFromFirebase` and `onSnapshot` skip applying weekly sources if `data.weekStart !== current_week`. Prevents cross-week bleed.
- Week starts on Monday. Computed by `get_week_start_date(new Date())`.

### Button Layout (User Cards)
- 4 buttons in one row: **Donate · Withdraw · Give to KK/S · Undo**
- CSS: `padding: 6px 6px`, `font-size: 0.68rem`, `flex: 1`, `white-space: nowrap`, `flex-wrap: nowrap`

### Documentation & Design System (2026-06-05)
- `UI_Guidelines.md` created — Bloom Journal design system for all future agents.
- `AGENTS_PLAYBOOK.md` updated — Communication Rules, Required Startup Checklist, Design Director role.

---

## All Product & Design Decisions

### Mystery Seed Design
- Cost is 10 personal wishes (not pool) — keeps the mechanic self-contained per user.
- No undo after draw — prevents gaming the system by undoing an unwanted flower.
- Starter = 1 flower (snowdrop, the white one, first row second position) — keeps early vase sparse to create motivation.
- Locked flowers show faint color (not fully gray) — creates curiosity about what's hidden.
- Clicking locked flower shows a toast, not an alert — lighter, more elegant feedback.
- Draw button placed in Pool card (not user cards) — reinforces connection between pool and unlocking.

### Vase & Visual Design
- `side_depth = 4`: stems lean naturally against inner rim without extending outside vase walls.
- `stem_lift max = 30`: center flowers clearly taller than sides (dome shape).
- `overlap_y = 56 + stem_lift` (not 60): corrects a 5.6px gap caused by scale(1.4) math.
- Snowflake breathing animation: 6s cycle, scale 0.15 → 1.0, anti-phased with stopper (4s) for 此消彼长 effect.
- Pool decanter base aligned with vase bases via `pool_vessel_area` (flex:1) + `pool_bottom_spacer` (120px).

### Bloom Journal Identity (from UI_Guidelines.md)
- Core feelings: Cozy, Magical, Garden Inspired, Calm, Delightful, Rewarding.
- Avoid: corporate dashboard style, bootstrap look, flashy gaming effects.
- Color palette: Dusty Rose, Sage Green, Cream White, Warm Beige.
- Avoid: neon colors, pure black backgrounds, high contrast gaming palettes.
- Animation: elegant, slow, intentional, rewarding. No fast spinning or aggressive bounces.
- References: Finch, Forest, Animal Crossing, Stardew Valley, Apple Journal (tone only, not copied).
- Component strategy: prefer shadcn/ui, Framer Motion, Magic UI. Reuse before creating custom.
- UI decision process: describe UX → layout → animation → then write code. Never jump to implementation.

---

## Firebase Data Structure

Fields in `shared_state/main`:
```
sBalance           integer   S's personal wish balance
kkBalance          integer   KK's personal wish balance
poolBalance        integer   Wish Pool balance
weekStart          string    ISO date of current week's Monday (e.g. "2026-06-02")
sWeeklySources     array     Emoji icons earned by S this week
kkWeeklySources    array     Emoji icons earned by KK this week
sVaseFlowers       array     Flower IDs currently in S's vase
kkVaseFlowers      array     Flower IDs currently in KK's vase
sUnlockedFlowers   array     Flower IDs permanently unlocked by S
kkUnlockedFlowers  array     Flower IDs permanently unlocked by KK
sHabitStatus       object    S's habit daily check-in status
kkHabitStatus      object    KK's habit daily check-in status
history            array     Weekly balance snapshots
```

---

## Known Issues

- None currently.

---

## Open Questions

- None currently.

---

## Pending Work

- None. All discussed features are implemented and deployed.

---

## Recommended Next Step

- No pending tasks. Consider new features or habit/reward flow improvements.
- Always read `UI_Guidelines.md` before designing any new UI.

---

## Notes for Future AI Agents

- Read `AGENTS_PLAYBOOK.md` → `PROJECT_STATUS.md` → `UI_Guidelines.md` before any UI work.
- Communicate in Chinese with the project owner. Keep technical terms in English.
- Write Markdown docs and code comments in English.
- Local test server: http://127.0.0.1:5500/index.html
- After pushing to GitHub, bump version numbers in index.html (`style.css?vN`, `script.js?vN`) to bust browser cache.
- Prefer small, reversible changes. Explain tradeoffs before implementing.
- Update this file after completing meaningful work.
- Do not invent features. Clarify before implementing anything new.

---

## Last Updated

- Last updated by: Claude (claude-sonnet-4-6)
- Last updated date: 2026-06-05
