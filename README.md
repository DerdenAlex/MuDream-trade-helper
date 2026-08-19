# MuDream Trader

Private development repository for a Tampermonkey userscript for **MuDream x20**.

The project is becoming a self-contained gearing and trading assistant: character inspection, market scanning, upgrade selection, item appraisal and eventually safe native purchasing.

## Canonical source

The userscript now lives at:

`src/mudream-trader.user.js`

The repository copy is the canonical source. Root-level copies and ZIP ping-pong are no longer the intended workflow.

## Current stable baseline

**v0.4 — Ctrl+D appraiser build**

Working features:

- character lookup through `GET_CHAR_BY_NAME`;
- equipment HEX decoding with MuDream's own client-side Item class;
- full market pagination through `GET_ALL_LOTS`;
- compound prices: Bless + Soul + Life + Chaos + Creation are paid together;
- per-item and whole-character upgrade shortlists;
- PvM / PvP / Universal / Zen profiles;
- market cache + diagnostics;
- autonomous item appraiser prototype;
- Ctrl+D appraisal while an item tooltip is visible.

## v0.5 development goals

- support all currently known classic MuDream class families in the analyzer: DW, DK, ELF, MG, DL, SUM, RF;
- auto-detect class family from the character class code while keeping manual override;
- show real operation progress directly inside action buttons (0–100% fill);
- show progress for character loading, market pagination, whole-character analysis and appraisal;
- keep REF and SD as contextual PvP/hybrid stats rather than treating them as junk;
- continue tuning PvM armor scoring so defensive rolls do not dominate every recommendation.

## Repository structure

```text
MuDream-trade-helper/
├─ src/
│  └─ mudream-trader.user.js   # canonical userscript
├─ docs/
│  ├─ architecture.md
│  └─ scoring.md
├─ CHANGELOG.md
└─ README.md
```

## Project rules

1. Published server formulas are useful documentation, but build optimisation is validated against live observations and controlled tests.
2. Market prices are baskets of currencies. `5 Bless + 5 Soul + 5 Life + 5 Chaos + 5 Creation` means all five components are required simultaneously.
3. REF and SD are meaningful stats. Their weight depends strongly on PvM/PvP profile.
4. The in-script score is a shortlisting heuristic, not claimed to be MuDream's exact DPS formula.
5. A nominally higher Gear Score must not automatically beat a materially better roll.
6. Buying must not be automated until the exact native market purchase mutation and confirmation flow are verified.
7. Market listing price is not the same as confirmed sale price; market-history tracking is planned.

## Roadmap

- [x] Move canonical source into `src/`.
- [ ] Ship and live-test v0.5 all-class support + progress UI.
- [ ] Tune class/build-aware scoring.
- [ ] Improve appraiser confidence and price bands.
- [ ] Add market history and sold/disappeared-lot tracking.
- [ ] Verify native Buy mutation and confirmation flow.
- [ ] Add account-wide budget optimisation across multiple characters.

## Status

Experimental/private. Changes are tested against the live MuDream client before being treated as stable.
