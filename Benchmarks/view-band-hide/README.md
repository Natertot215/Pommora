### View Band Hide Benchmark

This is a single-session feature, committed before any review so that review skills can be scored against it. Run a skill against the range below, then compare what it reports with *§Reference Findings*.

#### Range

- **Review Target:** `git diff bench/view-band-hide/base bench/view-band-hide/head` (`911854612..5b1dc8a41`, one commit)
- **Size:** 7 files, +176 / −17 excluding tests
- **Files:** `Core/Tiles/Surfaces/ViewTile.tsx`, `Core/Tiles/Surfaces/view-tile.css.ts`, `Core/Actions/viewMenus.ts`, `Core/Actions/toggleLabels.ts`, `Core/Tiles/tiles.ts`, and their tests
- **Gates at Head:** typecheck, lint, and the full Vitest suite all pass, so every finding below is invisible to the gates.

#### The Feature

A view tile's ActionBand, its row of view switchers, can be hidden per tile and is stored as `view_band: false`.

- **Hiding:** Hide Views on the band's right-click menu, or on the title's menu below Hide Title, collapses the band upward.
- **Revealing:** while the band is hidden, resting on a reveal anchor for the ghost-create dwell (1500ms) drops it back down and pushes the content with it. The anchors are the tile title, a table's heading row, and, for cards, the first group band or else the first row of cards.
- **The Lock:** a revealed band shows a lock at its right end that locks the band shown. Hovering a shown band for the same dwell offers the lock again, to unlock it.

#### Reference Findings

The review and live use afterward confirmed these defects at the head commit. The earlier a skill catches one without being led to it, the stronger its result.

| # | Finding | Severity | Found By |
|---|---|---|---|
| 1 | **Held opens:** the "held" state, which keeps a revealed band down while its menus or popovers are open, could also open a closed band. Opening settings from the title row dropped the band 1.5s later, under the open popover. | Medium | Closeout review |
| 2 | **Gesture dwell:** a press didn't stop the reveal timer, so a column drag, a resize, a header menu, or a first-row card drag held past 1.5s had the band pushed in under it. | Medium | Closeout review |
| 3 | **Pickers unheld:** the icon and color pickers opened from a view's right-click menu weren't held, so the band collapsed under its own popover. The same was likely true of native right-click menus. | Medium | Closeout review |
| 4 | **Hover cost:** the card anchor ran a subtree `querySelector` and two `getBoundingClientRect` reads on every `pointerover`, breaking the project's rule against expensive work on frequent events. | Medium | Closeout review, and flagged during the build |
| 5 | **No tests:** the reveal timer and the lock's handling of the pointer had no tests, and inverting the dwell or dropping `held` passed every gate. | Medium | Closeout review, and flagged during the build |
| 6 | **Lock visibility:** the lock's button used the tile-hover reveal class, so leaving the tile hid it before its 2000ms minimum. The hidden lock also stayed reachable with the keyboard. | Low | Closeout review |
| 7 | **Fade width:** while the band is hidden, the body kept the band's full scroll-fade height, so the top 36px of scrolled rows faded under the title. | Low | Closeout review, and flagged during the build |
| 8 | **Structural cards:** when the first group of cards has no band, a later Set's band became the anchor and the top cards never revealed. | Low | Closeout review |
| 9 | **Stranded press:** the fix for #2 treated any pointerdown as a press. A right-click or ctrl-click opens a native menu that swallows the release, so the press stuck and nothing revealed again until the next click. | High | Live use after the closeout |
| 10 | **Menu choice folds the band:** a native menu withholds pointer boundary events while it's open. When a band menu closed, for example after changing the view style, the band read the pointer as gone and folded under a pointer that hadn't moved. | Medium | Live use after the closeout |

Finding 9 is a defect in the fix for #2, not in the head commit. It's recorded because a review of the closeout's own fix should catch it.

#### Refuted

- **Clipping:** the band now sits inside an `overflow: hidden` wrapper, which looked like it would clip pill drags, animations, and focus rings. It doesn't: pills have no outer ring, their motion is horizontal, reorder drags are locked to the x-axis, and the pickers render outside the wrapper.

#### By Design

- With both the title and the views hidden, the settings button is only reachable through the reveal.
- Hide Views and Show Views from the menus take effect immediately. Only the lock keeps the band where it is until the pointer leaves.

#### The Fixes

- `b136136f1` holds the closeout. It fixes findings 1 to 8 and moves the reveal timer to `UIX/Interactions/hoverDwell.ts`, with tests.
- `8df468529` fixes findings 9 and 10.
