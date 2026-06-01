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
- Firebase Firestore syncs balances, habit status, weekly sources, vase flowers, and unlocked flowers in real-time.
- 24 unique SVG flowers with picker; crystal vase with bell-curve fan arrangement.
- Mystery Seed feature fully implemented: spend 10 wishes to permanently unlock a random flower.

---

## Recently Completed Work (2026-05-31)

### Mystery Seed Feature
- `unlocked_flowers` field added to each user's state; default starter: `['snowdrop']`.
- Firebase sync: `sUnlockedFlowers` / `kkUnlockedFlowers` added to `shared_state/main`.
- `normalize_balances()` defensive fallback: if field missing, initializes to `['snowdrop']`.
- Flower picker: locked flowers shown with faint-color filter (grayscale + dimmed), clickable but show toast "Draw a Mystery Seed to unlock!" instead of inserting into vase.
- Pool card: `🐑 Plant a Seed` (S) and `🐷 Plant a Seed` (KK) buttons — disabled when personal wish_balance < 10 or all flowers unlocked; shows "All Bloomed!" when fully unlocked.
- Confirmation dialog: "Plant a Mystery Seed? / Spend 10 Wishes and discover what blooms!" with 🌱 Plant It / 🤔 Maybe Later.
- Draw logic: deducts 10 from personal `wish_balance`, randomly picks a locked flower, saves to Firebase, triggers reveal animation. Clears `last_action` so Undo is blocked after a draw.
- Reveal animation: full-screen overlay — 🌱 → 🌿 → radial burst → flower SVG scales in → "New Flower Unlocked!" + flower name in English.
- Surprise Me fixed: only randomizes from `unlocked_flowers` (same flower can repeat).
- S and KK have independent unlock progress.

### Earlier this session (vase & snowflake)
- Fixed pool card decanter alignment, flower stems, vase rim 3D layering.
- Added breathing snowflake to decanter bottom-left.
- Bumped asset versions to bust browser cache.

---

## Files Changed

- `script.js` — Mystery Seed state, Firebase sync, draw logic, reveal animation, picker locked/toast, shuffle fix, button label
- `style.css` — locked flower filter, seed dialog, reveal overlay/animation, toast style
- `PROJECT_STATUS.md` — updated

---

## Recent Decisions

- Starter: 1 flower (`snowdrop`) per user — keeps early vase sparse to motivate draws.
- Cost: 10 personal wishes (pool increases by 10 as side effect, encouraging donation behavior).
- Undo blocked after seed draw: `last_action = null` prevents gaming by undoing an unwanted flower.
- Locked flower buttons clickable (not `disabled`) so users understand the mechanic via toast.

---

## Known Issues

- None currently.

---

## Open Questions

- None currently.

---

## Recommended Next Step

- None pending. Consider new features or habit/reward flow improvements.

---

## Notes for Future AI Agents

- Read `AGENTS_PLAYBOOK.md` before this file.
- Explain in Chinese, keep technical terms in English.
- Local test server: http://127.0.0.1:5500/index.html
- After pushing to GitHub, bump version numbers in index.html (`style.css?vN`, `script.js?vN`) to bust browser cache.
- Prefer small, reversible changes. Explain meaningful tradeoffs before implementing.
- Update this file after completing meaningful work.

---

## Last Updated

- Last updated by: Claude (claude-sonnet-4-6)
- Last updated date: 2026-05-31
