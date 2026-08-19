# Scoring v2

The score is a ranking heuristic for MuDream market decisions. It is not claimed to be the server's exact DPS formula.

The old item-centric system is preserved in `docs/scoring-v1.md`.

## PvM v2: whole-loadout model

PvM no longer ranks an isolated item against another isolated item. The core comparison is:

```text
character/loadout after replacement
minus
character/loadout before replacement
```

This lets the evaluator account for build role, the rest of the equipped gear, two-handed replacements, diminishing defensive returns, and utility.

## 1. Build detection

The evaluator determines a working PvM role from class, character stats, and equipped weapon types.

Current roles:

- Magic / Wizardry
- Physical
- AGI ranged
- ENE support

Examples: a staff-equipped MG is treated as Wizardry-oriented; DK/RF default physical; ELF can resolve to AGI-ranged or ENE-support depending on stats.

This is deliberately a heuristic layer and can be refined from live tests without changing the rest of the scoring architecture.

## 2. Three independent components

### Offense

Main farming driver. Includes build-relevant stat rolls, attack speed, EDR, relevant Physical/Wizardry bonuses, additional/skill damage, Luck, and only a weak GS contribution.

A stat that does not fit the detected build receives a much smaller contribution than the same roll on its correct build.

### Survivability

Evaluated on the complete equipped loadout with diminishing returns.

Current PvM defensive inputs include:

- DD
- DSR
- maximum HP
- VIT
- a weak GS/gear-quality proxy

**DD reduces incoming damage and is useful in both PvM and PvP.**

**SD contributes exactly zero to pure PvM.** SD is treated as a PvP-only external armor layer that is depleted before direct HP damage.

The component uses concave/saturating functions so adding another defensive roll to an already defensive loadout remains useful but is progressively less valuable. This is intended to stop every armor slot from independently chasing the same DD cluster.

### Utility

Separate from combat damage. Current inputs include Zen and sustain-like life/mana-on-kill options when the decoder exposes them.

Utility is intentionally a small part of pure PvM efficiency; the Zen profile remains separate.

## 3. PvM efficiency

Current structure:

```text
PvM efficiency = offense + 1.05 × survivability + 0.30 × utility
```

The important design point is not the exact coefficients. Survivability itself already has diminishing returns, while offense remains the primary farming driver.

Every recommendation stores a breakdown:

```text
Offense delta
Survivability delta
Utility delta
Total efficiency delta
Detected build role
```

This makes tuning observable instead of hiding decisions behind one magic score.

## 4. Hand/loadout semantics

A two-handed candidate consumes both hand slots and is compared against both currently equipped one-handed items together.

A one-handed candidate replacing a currently equipped two-handed weapon is currently evaluated as an incomplete one-hand loadout; later pair-search optimisation may test two coordinated one-handed purchases as one candidate state.

## 5. Market ranking

Only after the equipment delta is known do we apply market/budget logic:

- strongest affordable upgrade;
- best gain per compound price basket;
- stretch candidate worth obtaining missing currency for.

The five jewel prices are simultaneous components of one price, never alternatives.

## Other profiles

PvP / Universal / Zen currently retain the archived weighted-item logic while PvM v2 is validated. They will migrate to the same whole-loadout architecture after PvM behaviour is stable.

PvP keeps SD and REF meaningful. Zen keeps SD at zero.

## Validation targets

Before further scoring expansion, validate PvM v2 on:

1. Wizardry MG with dual staves.
2. Physical MG.
3. ENE and physical DL variants where available.
4. AGI vs ENE ELF.
5. Armor examples where old scoring preferred repetitive DD/SD clusters.
6. Cases where lower GS has substantially better build-relevant rolls.
