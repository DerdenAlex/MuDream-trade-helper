# Legacy scoring v1 (archived)

This document preserves the pre-v0.6 item-centric scoring model so it can be referenced or restored without reconstructing it from memory.

## Core model

Each market item was decoded into a small utility vector and assigned a single weighted score independently of the rest of the equipped loadout.

Typical parsed fields:

- Gear Score
- attack speed
- physical damage increase
- excellent damage rate
- additional / skill damage
- STR / AGI / VIT / ENE
- DD / DSR / HP / SD / Zen / REF
- PvP damage / PvP defense / SD ignore / SD decrease
- Luck

The candidate score was compared to the currently equipped item score. A small set of `meaningful` rules filtered obvious sidegrades/downgrades. v0.5.1 added a special loadout baseline for a two-handed weapon replacing two one-handed weapons.

## Last v1 weights

### PvM

```text
gs .30, ias 3.0, phys 14, wizard 14, edr 9,
addDamage .10, skillDamage .06,
STR .11, AGI .13, VIT .045, ENE .075,
DD 18, DSR 5, HP 7, SD 0, Zen 3, REF .5
```

### PvP

```text
gs .25, ias 2.3, phys 10, wizard 10, edr 10,
addDamage .06, skillDamage .05,
STR .08, AGI .10, VIT .08, ENE .05,
DD 16, DSR .5, HP 12, SD 10, Zen 0, REF 12,
PvP damage 8, PvP defense 8, SD ignore 10, SD decrease 8
```

### Universal

```text
gs .30, ias 2.7, phys 12, wizard 12, edr 9,
addDamage .08, skillDamage .055,
STR .10, AGI .115, VIT .065, ENE .06,
DD 17, DSR 3, HP 9, SD 6, Zen 1, REF 5,
PvP damage 4, PvP defense 4, SD ignore 5, SD decrease 4
```

### Zen farm

```text
gs .22, ias 2.5, phys 11, wizard 11, edr 7,
addDamage .07, skillDamage .05,
STR .09, AGI .11, VIT .05, ENE .06,
DD 14, DSR 6, HP 6, SD 0, Zen 22, REF .5
```

## Why it was replaced for PvM

The model evaluated armor pieces too independently. A DD-heavy item could score well even when the character already had enough survivability, so repeated DD/SD-like defensive clusters could dominate recommendations. It also could not naturally express build fit (for example Wizardry MG vs physical MG) or the effect of replacing a piece on the complete character loadout.

## Mechanics assumptions retained

- DD reduces incoming damage and is useful in both PvM and PvP.
- SD is a PvP-only external survivability layer and should contribute zero value in pure PvM scoring.
- REF is primarily PvP-oriented and is not treated as a core PvM stat.
- Market prices are compound currency baskets, not alternative currencies.

This file is intentionally frozen as a historical reference. New PvM work belongs in `docs/scoring.md`.
