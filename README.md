# MuDream Trader

Private development repository for a Tampermonkey userscript for **MuDream x20**.

The project grew out of manual market analysis and is being turned into a self-contained trading / gearing assistant.

## Current development snapshot

**v0.4 — hotkey build**

Main working ideas already proven in-browser:

- read a character through `GET_CHAR_BY_NAME`;
- decode equipped item HEX with MuDream's own client-side Item class;
- scan all market pages through `GET_ALL_LOTS`;
- server-side race filters for MG / DL / EE;
- compound prices: Bless + Soul + Life + Chaos + Creation are paid **together**, not as alternatives;
- per-slot upgrade search;
- whole-character upgrade shortlist;
- profiles: PvM / PvP / Universal / Zen farm;
- market diagnostics and cache refresh;
- item appraiser prototype;
- appraiser invocation with **Ctrl+D while an item tooltip is open**.

## Repository plan

```text
MuDream-trade-helper/
├─ src/                  # userscript source
├─ docs/
│  ├─ architecture.md    # data flow / GraphQL / decoder notes
│  └─ scoring.md         # upgrade scoring profiles and assumptions
├─ CHANGELOG.md
└─ README.md
```

## Important project rules

1. Server formulas published on the site are not treated as unquestionable truth for build optimisation; live observations and controlled tests are kept separate from documented mechanics.
2. Market prices are baskets of currencies. Example: `5 Bless + 5 Soul + 5 Life + 5 Chaos + 5 Creation` means all five components are required.
3. `REF` and `SD` are not junk stats. Their weight depends on the chosen profile; PvP values them much more highly than pure PvM.
4. The in-script score is only a **shortlisting heuristic**, not claimed to be MuDream's real DPS formula.
5. Buying from the market must not be automated until the exact native purchase mutation and confirmation flow are verified.

## Near-term roadmap

- [ ] Move the current v0.4 hotkey userscript into `src/` as the canonical source.
- [ ] Improve PvM scoring so defense does not dominate every armor slot.
- [ ] Finish autonomous item appraisal: quick sale / market / high ask + confidence + liquidity.
- [ ] Add market history so listed prices can be separated from items that actually disappear / sell.
- [ ] Verify and safely integrate the native market Buy mutation.
- [ ] Compare multiple characters and optimise spending across the whole account.
- [ ] Add other classes only after MG / DL / EE workflows are stable.

## Status

Experimental/private. The code and scoring are being actively changed against the live MuDream client.
