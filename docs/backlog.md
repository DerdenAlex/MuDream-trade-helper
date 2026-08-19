# Backlog / TODO

## Immediate

- Hide manual class/race selection from normal UI; rely on automatic detection.
- Separate whole-character auto-upgrade results from per-slot results so outputs do not stack vertically.
- Progress buttons: at 100% show green success state, then fade success text and restore original ready state after ~3 seconds.
- Make weapon comparison loadout-aware: two-handed candidates must beat the combined currently equipped hand loadout.

## Scoring

- Rework PvM armor scoring later in a focused pass.
- DD (Damage Decrease) reduces incoming damage and is valuable in both PvM and PvP.
- SD is PvP-only; PvM and Zen profiles should assign SD zero value.
- Keep REF/SD meaningful in PvP/Hybrid instead of classifying them as junk.

## Appraiser

- Rework price estimation model; current capture/search flow works but price bands need better comparable selection, outlier handling, currency-basket valuation and eventually market-history signals.

## Later

- Verify native Buy mutation before enabling direct purchase.
- Add market history / disappearance tracking.
- Improve whole-account budget optimisation across multiple characters.
