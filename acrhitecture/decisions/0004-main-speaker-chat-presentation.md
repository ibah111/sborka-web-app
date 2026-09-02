# ADR 0004: Main speaker chat presentation

## Decision

The web client consumes structured speaker metadata from `speaker_names`. The main speaker is aligned to the right and uses the explicitly approved violet message fill; every other speaker is aligned left with neutral styling.

Speaker editing starts by double-clicking the author name in the transcript chat. The inline editor changes the display name and can make that speaker the single main speaker before saving through the authenticated BFF route.

The default UI palette is black, white, and neutral gray. Blue styling is prohibited; color is used only for user-approved exceptions.
