# PROJECT_STATUS.md

## Purpose

This file is a reusable project status snapshot for Bloom Journal.
Read `AGENTS_PLAYBOOK.md` first before using this file.

---

## Current Priority

- No open tasks. App is stable and deployed.

---

## Current Project State

- App deployed and working: https://essie-yzq.github.io/wish-tracker/
- Current asset versions: `style.css?v=15`, `script.js?v=6` (pushed 2026-06-01).
- Firebase Firestore syncs balances, habit status, weekly sources, vase flowers, and unlocked flowers in real-time.
- 24 unique SVG flowers with picker; crystal vase with bell-curve fan arrangement.
- Mystery Seed feature live: spend 10 personal wishes to permanently unlock a random flower.
- Withdraw button live: take 1 wish from Pool directly to personal balance.
- UI_Guidelines.md created: design system established for all future agents.

---

## Recently Completed Work (2026-06-05)

### Documentation & Design System
- Created `UI_Guidelines.md` — defines visual identity, color philosophy, animation principles, and component strategy for Bloom Journal.
- Updated `AGENTS_PLAYBOOK.md` — added Communication Rules, Required Startup Checklist, and Bloom Journal Design Director role.

### Recently Completed Work (2026-06-01)

#### Withdraw Button
- Added Withdraw button to each user card — takes 1 wish from Pool to personal balance, undoable.
- Renamed "Donate to Pool" → "Donate".
- "Give to Other" now shows the other user's name: "Give to KK" / "Give to S".
- All 4 buttons fit in one row (padding tightened to 6px 6px, font 0.68rem).

#### Weekly Sources Bug Fix
- Fixed stale weekly source icons appearing in a new week.
- Root cause: Firebase `sWeeklySources` / `kkWeeklySources` were applied without checking whether they belonged to the current week.
- Fix: Firebase now stores a `weekStart` field alongside sources. Both `loadFromFirebase` and `onSnapshot` skip weekly sources if `weekStart` does not match the current week.

### Previously Completed (2026-05-31)

#### Mystery Seed Feature
- `unlocked_flowers` field added per user; default: `['snowdrop']`.
- Firebase sync: `sUnlockedFlowers` / `kkUnlockedFlowers`.
- Flower picker: locked flowers shown with faint-color filter, clickable but show toast instead of inserting.
- Pool card: `🐑 Plant a Seed` / `🐷 Plant a Seed` buttons.
- Draw logic: deducts 10 personal wishes, random unlock, saves to Firebase, triggers reveal animation.
- Undo blocked after seed draw.
- Surprise Me fixed: only randomizes from `unlocked_flowers`.

---

## Files Changed

- `UI_Guidelines.md` — created (design system)
- `AGENTS_PLAYBOOK.md` — added Communication Rules, Startup Checklist, Design Director
- `script.js` — Withdraw button, weekly sources fix, Mystery Seed, button labels
- `style.css` — button padding, locked flower filter, seed dialog, reveal animation, toast
- `index.html` — version bumps
- `PROJECT_STATUS.md` — updated

---

## Recent Decisions

- Starter unlock: 1 flower (`snowdrop`) per user.
- Withdraw cost: 1 wish from Pool per action (undoable).
- Weekly sources validated by `weekStart` field in Firebase to prevent cross-week bleed.
- Undo blocked after seed draw to prevent gaming.

---

## Known Issues

- None currently.

---

## Open Questions

- None currently.

---

## Recommended Next Step

- None pending. Consider new features or habit/reward flow improvements.
- Refer to `UI_Guidelines.md` before designing any new UI.

---

## Notes for Future AI Agents

- Read `AGENTS_PLAYBOOK.md` → `PROJECT_STATUS.md` → `UI_Guidelines.md` before any UI work.
- Communicate in Chinese with the project owner. Keep technical terms in English.
- Write Markdown docs and code comments in English.
- Local test server: http://127.0.0.1:5500/index.html
- After pushing to GitHub, bump version numbers in index.html (`style.css?vN`, `script.js?vN`) to bust browser cache.
- Prefer small, reversible changes. Explain meaningful tradeoffs before implementing.
- Update this file after completing meaningful work.

---

## Last Updated

- Last updated by: Claude (claude-sonnet-4-6)
- Last updated date: 2026-06-05
