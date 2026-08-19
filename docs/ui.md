# UI behaviour

## Result modes

Whole-character auto-upgrade results and per-slot replacement results must not accumulate on screen at the same time. The interface should expose them as separate result modes/tabs and show only the active mode.

## Progress buttons

Long-running actions display progress inside the action button from 0% to 100%.

At 100% the button enters a green success state. The success label remains visible briefly, then fades for roughly three seconds total and the button returns to its original text/colors, clearly indicating that it is ready for another run.

## Hidden class resolution

Character class/race is detected automatically from the loaded character and should not occupy normal user-facing UI. Manual override may remain available only as an internal/debug fallback.
