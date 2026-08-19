# Architecture notes

## Runtime

The project currently runs as a Tampermonkey userscript on `https://mudream.online/*` and intentionally reuses data and item-decoding logic already loaded by the MuDream web client.

## Character path

1. User enters character name.
2. `GET_CHAR_BY_NAME` returns stats and `Equipment[].hex`.
3. The script locates MuDream's client-side Item constructor.
4. Equipped HEX strings are decoded with the same item data the site uses.
5. Decoded equipment becomes the baseline for upgrade comparisons.

## Market path

1. Select race filter (`forMG`, `forDL`, `forELF`).
2. Request `GET_ALL_LOTS` in pages.
3. Deduplicate lots by lot ID.
4. Decode each market item.
5. Classify by item type and compare against equipped items.
6. Apply the selected scoring profile and budget rules.

Market pagination must run to completion. A small number such as 12 refers to equipment slots inspected, not market lots scanned.

## Pricing

A lot can require several currencies simultaneously. The budget check is component-wise:

`price[currency] <= budget[currency]` for every required currency.

Currencies currently tracked:

1. Bless
2. Soul
3. Life
4. Chaos
5. Creation

## Appraiser

The current appraiser is invoked by hovering an item until its MuDream tooltip is visible and pressing `Ctrl+D`.

The hotkey handler:

- only intercepts Ctrl+D when a visible item tooltip exists;
- extracts the underlying Item from the tooltip's React data;
- opens the trader panel;
- searches comparable market lots;
- estimates a price band from similarity, quality and current listings.

## Safety boundary

Direct market purchase is intentionally not guessed. Before a Buy button is wired to a transaction, capture and verify MuDream's native purchase GraphQL mutation, variables, response and confirmation behaviour.
