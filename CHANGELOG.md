# Changelog

## 0.6.0 — PvM scoring v2 test build

- Archived the legacy item-centric scoring model in `docs/scoring-v1.md`.
- PvM now evaluates the whole equipped loadout before and after a candidate replacement.
- Added build-role detection: Magic/Wizardry, Physical, AGI ranged, ENE support.
- Added Wizardry option parsing to the utility model.
- PvM output is split into Offense / Survivability / Utility components.
- DD remains useful in PvM and PvP.
- SD contributes exactly zero to pure PvM.
- PvM defensive value uses whole-loadout diminishing returns to reduce repetitive defensive stacking.
- Two-handed candidates continue to replace and compare against both occupied hands.
- Candidate cards expose a PvM v2 component delta for easier live tuning.
- v0.5.1 UI changes retained: auto-upgrade vs slot result tabs, hidden class selector, in-button progress state.

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

- Validate PvM scoring v2 against Wizardry MG, physical MG, DL and ELF examples.
- Tune survivability saturation from live recommendations rather than isolated coefficients.
- Migrate PvP / Universal / Zen to the whole-loadout architecture after PvM stabilizes.
- Improve appraisal confidence and price bands.
- Add market history.
- Verify native purchase mutation before enabling direct Buy.
