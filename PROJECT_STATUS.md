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
- Firebase Firestore syncs balances, habit status, weekly sources, and vase flowers in real-time.
- 24 unique SVG flowers with picker, crystal vase with bell-curve fan arrangement.
- Pool card decanter base is aligned with the two side vase bases.
- Flower stems are continuous (no breaks) through the vase rim.
- Vase rim has correct 3D layering: stems cover the back rim arc, front rim arc covers stems.
- Large breathing snowflake added to decanter bottom-left (half outside the bottle).

---

## Recently Completed Work (2026-05-31)

- Fixed pool card decanter alignment: pool_vessel_area (flex:1) + pool_bottom_spacer (120px) keeps decanter base level with vase bases.
- Fixed broken flower stems: changed overlap_y from 60+stem_lift to 56+stem_lift so extension line meets the external stem exactly at the vase rim.
- Fixed vase rim rendering order: flowers rendered before the front rim arc so white rim arc creates a "stem entering vase" 3D depth effect.
- Tuned side flower layout: side_depth=4 (stems lean naturally against inner rim), stem_lift max=30 (center flowers clearly taller than sides).
- Added decanter large snowflake: 68px SVG (2× stopper snowflake), positioned half-outside the vase body at bottom-left, with a new snowflake_breathe animation (6s, grows from scale 0.15 to 1.0, anti-phased with the 4s stopper snowflake for 此消彼长 effect).
- Bumped asset versions (style.css?v=13, script.js?v=3) to bust browser cache on GitHub Pages.

---

## Files Changed Recently

- `script.js` — Flower stem fixes, rendering order, large snowflake HTML
- `style.css` — Pool card alignment, snowflake_breathe animation, decanter_large_snowflake CSS
- `index.html` — Version bump for cache busting

---

## Recent Decisions

- `side_depth=4`: small enough to keep flowers within vase bounds, creates natural "leaning against rim" look. Larger values (8+) push flowers outside the vase walls.
- `stem_lift max=30`: center flowers are notably taller than side flowers without needing excessive side_depth.
- `overlap_y = 56+stem_lift` (not 60): the old 60 value left a 5.6px gap at the rim due to scale(1.4) math.
- Snowflake placed as a direct child of `.decanter` (not inside `decanter_body_wrap`) so it's not clipped by the trapezoid clip-path and can extend outside the bottle edge.

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
