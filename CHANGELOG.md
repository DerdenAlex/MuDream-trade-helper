# Changelog

## 0.5.0 — development

- Repository source moved to `src/mudream-trader.user.js`.
- Analyzer expanded toward all classic MuDream class families: DW, DK, ELF, MG, DL, SUM, RF.
- Class-family auto-detection uses the character class code family instead of three hard-coded exact values.
- Action buttons gain in-button 0–100% progress fill.
- Character loading progress covers decoder lookup, GraphQL character fetch, equipment decode and render.
- Market operations expose pagination progress when the server reports a total.
- Whole-character analysis exposes market-scan and per-slot comparison progress.
- Appraisal exposes exact-analogue and competitor-scan progress.
- Status wording changed from ambiguous “slots viewed” to equipment/items checked.
- Item normalization preserves class/equip metadata needed by the expanded appraiser.

## 0.4.0 — stable baseline

- Character lookup by name.
- MG / DL / ELF market filters.
- Full market pagination and decoding.
- PvM / PvP / Universal / Zen scoring profiles.
- Per-slot and whole-character upgrade search.
- Compound-currency budget handling.
- Item appraisal prototype.
- Ctrl+D appraisal hotkey while an item tooltip is visible.
- Removed clickable appraisal controls from the disappearing tooltip.

## Next

- Live-test all class filter names against MuDream's current GraphQL schema.
- Tune class/build-aware scoring from live tests.
- Improve appraisal confidence and price bands.
- Add market history.
- Verify native purchase mutation before enabling direct Buy.
