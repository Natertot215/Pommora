### View Band Hide

A single-session, tightly scoped feature, committed before any review pass so review skills can be benchmarked against it. Point a skill at the range below and compare its findings with *§Known Open Items*.

#### Range

- **Base:** `bench/view-band-hide/base` → `911854612`
- **Head:** `bench/view-band-hide/head` → `5b1dc8a41` (a single commit, merged to `main` through `benchmark-branch` as `0a218e76d`)
- **Review Target:** `git diff bench/view-band-hide/base bench/view-band-hide/head`
- **Portable Copy:** `view-band-hide.patch` beside this file applies onto the base with `git am`, independent of the tags.
- **Size:** 7 files, +176 / −17 excluding tests (+218 / −30 with them).
- **Gates at Head:** typecheck, `biome check`, and the full Vitest suite (5,442 tests) all pass.

The feature's documentation sentence lives in `.claude/Features/SurfacePM.md` (the View Tile entry), committed in the nested `.claude` repo rather than in the range.

#### The Request

The feature was built from this sequence of instructions, including the corrections made while it was being built:

1. Add a right-click menu to a view tile's ActionBand with a Hide Views / Show Views toggle. Hiding collapses the band upward with the in-tile title's animation (up only, no slide), and showing drops it back down the same way.
2. While hidden, hovering the inline title (if shown) or a table's heading row for the ghost-create dwell reveals the views, and moving off collapses them again. Cards have no heading row, so they anchor to the first grouping band, or else the first row of cards.
3. The reveal pushes content down. The title and a table's heading row both reveal, and the first band is only the cards' stand-in for a heading row. Hide Views also sits on the title's menu, below Hide Title.
4. The band's menu order is New View, then Hide Views.
5. The spacing above a table's heading row matches the spacing below it while the views are hidden.
6. In dropdown style, opening the view list from a revealed band keeps the band anchored. The band's animation uses `ease-base`. A revealed band carries a lock at its right end that locks it shown with the standard lock-switch animation, then fades out after 2000ms.
7. Hovering a shown band for the ghost-create dwell offers the same lock to unlock it.
8. The lock stays while the pointer is still on the band after locking, and unlocking leaves the band down until the pointer leaves.

#### Known Open Items

These were identified during the build and left for review:

- **Clipping:** the band now sits inside an `overflow: hidden` wrapper, so pill drag transforms, enter and exit animations, and focus rings may be cut at its edges.
- **Fade Width:** the body's top scroll fade stays at the band's full height while the band is hidden.
- **Hover Cost:** `isPeekAnchor` runs a `querySelector` and two rect reads on each `pointerover` in a card view.
- **Coverage:** `useHoverDwell` and the lock hand-off have no tests.
- **Reachability:** with both the title and the views hidden, the settings button is reachable only through the hover reveal.
- **Menu Toggles:** Hide Views and Show Views from the menus take effect immediately, while the lock hands the pointer to the band.
