# PROJECT_STATUS.md

## Purpose

This file is a reusable project status snapshot for Bloom Journal.

It should help future AI agents quickly understand the current project state after reading `AGENTS_PLAYBOOK.md`.

This file should summarize the current state of the project, not maintain a complete project history.

---

## Current Priority

- Vase flower sync between S and KK via Firebase — just completed.

---

## Current Project State

- The app is fully functional and deployed on GitHub Pages.
- Firebase Firestore is used for real-time sync between S and KK.
- Wish balances, habit status, and weekly source icons are synced.
- Vase flowers (`vase_flowers`) are now also synced via Firebase (as of 2026-05-30).
- The flower picker (24 SVG flowers), crystal vase rendering, and bell-curve arrangement are complete.
- `localStorage` is the primary state store; Firebase is the sync layer.
- `habit daily_status` is NOT synced via Firebase realtime listener (known limitation — see Known Issues).

---

## Recently Completed Work

- 2026-05-30 Added `sVaseFlowers` / `kkVaseFlowers` to Firebase sync so both users see each other's vase arrangement in real-time.
- 2026-05-30 Made `pick_flower`, `clear_vase`, `shuffle_vase` async and wired them to `saveBalancesToFirebase`.
- Earlier: 24 unique SVG flower designs with distinct leaves; bell-curve fan arrangement inside the crystal vase.

---

## Files Changed Recently

- `script.js` — Added vase flower sync to Firebase (read in load/subscribe/getLatest, write in saveBalancesToFirebase; made vase action functions async).

---

## Recent Decisions

- Keep vase flowers in the same Firebase document (`shared_state/main`) as balances — simple, avoids extra reads.
- Flowers are only trimmed from the vase when `flowers.length > wish_balance` (not always on give). This is intentional: a partially filled vase reflects the user's aesthetic choice.

---

## Known Issues

- `habit daily_status` is not synced via the realtime `onSnapshot` listener — if both users check habits simultaneously, one may overwrite the other. Mitigated by calling `saveBalancesToFirebase(state, habit_user_id)` which saves that user's habit status explicitly.
- Firebase `onSnapshot` fires for the user's own writes too, causing a redundant re-render. Harmless but slightly wasteful.

---

## Open Questions

- None currently.

---

## Recommended Next Step

- Test the vase sync end-to-end: S picks a flower on one device, confirm KK sees it update in real-time on another device.
- Commit the current uncommitted changes in `script.js`, `style.css`, `index.html`.

---

## Notes for Future AI Agents

- Read `AGENTS_PLAYBOOK.md` before using this file.
- Keep explanations clear and learning-oriented (explain in Chinese, keep technical terms in English).
- Prefer small, reversible changes.
- Explain meaningful tradeoffs before implementation.
- Update this file after completing meaningful work.

---

## Last Updated

- Last updated by: Claude (claude-sonnet-4-6)
- Last updated date: 2026-05-30
