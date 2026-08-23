## Handoff — Pommora

> **User Prompt:** *"Verify the File Properties implementation to a standard where a future reviewer finds nothing. There is one criterion: the files are implemented completely, precisely, surgically, and cohesively with the rest of the codebase — no errors, no simplification opportunities, no isolated code that could have been inherited from what already exists, and no sense that `file` was not part of the original property types."*

#### Current Focus

**Session ID:** 80a10e7b-1f2a-4d86-a973-10f5f6ea1333
**Date:** 08-22-2026
**Model:** Fable 5 → Opus 5

**Part 2 of the file-based arc is done: `file` is complete, the tenth and last property type.** A value is a bare array of `[[Basename.ext]]` wikilinks resolved in the asset map's basename domain; each property names a **Directory** its files land in; the value's own area adds and a chip replaces, both through the OS dialog opened at a folder, so revealing where a file lives and swapping it are the same gesture. Adoption is one exported seam, `adoptFile`, carrying every guard that makes it safe, and no reference removal ever deletes bytes — the seam dedups, so two pages can share one file.

**This session was the verification round, and it found real defects after a clean gate.** Four lenses were run against the shipped feature rather than a checklist: an end-to-end chain read raw off the disk, a gesture × surface matrix over all four value surfaces, an interfaces-and-adjacencies attack, and a line-by-line scrutiny pass. Every finding was verified against the code before folding, and each new guard was negative-controlled in both directions.

- **A pick from a hidden folder under the asset root minted a reference nothing could ever resolve.** `underAssetRoot` admits a dot-prefixed segment that `indexable` drops forever, so the bytes were referenced in place and the chip read unresolved with no error at any layer. Containment and reachability are separate predicates; adoption now asks both, and such a pick falls through to the copy.
- **Three dead interfaces came out.** `fileValueMenu`'s boolean was structurally unconsumable — both callers decide the type first, because a context-menu handler must answer `preventDefault` synchronously — and a test pinned the dead arm, which is what kept it reading as live. `FileLabel`'s `unresolved` prop and its whole stylesheet were the twin of the `onClick` prop deleted a phase earlier and never re-censused.
- **The showcase and the atlas never learned the two new chip shapes**, which is where a developer looks before hand-rolling a parallel.

**The simplification pass consolidated four seams.** The two inspector panes' `valueMenu` was byte-identical in both files and joined `editRow` on the hook they already share; `runFileMenuAction` now answers whether it took the action — `runPageSendAction`'s shape, four lines above one of its call sites — so neither surface tests the prefix or casts the action back; the segment stamp is a named constant rather than a string in three files; and `assetSubRoot` moved to `shared/nexusPaths.ts`, so main's write and the renderer's dialog compose a property's folder the one way.

#### Completion Criteria

- [x] **Gates green** — typecheck 0, 3585 tests over 284 files, `biome check` clean over 921 files, `npm run build` 0. Read directly, never through a pipe.
- [x] **The end-to-end acceptance criterion is now a test** — `mutate.test.ts` reads the page's raw bytes after every step: pick into the subfolder, the quoted `- "[[Name.ext]]"`, add, replace, remove, clear taking the key. Every file's bytes survive; a re-pick answers the existing reference rather than a copy.
- [x] **Every new guard negative-controlled** — the `indexable` check removed sends its test red and restored sends it green; breaking the `data-segment-index` stamp turns the replace gesture into an add, which is the defect the DOM test exists to catch.
- [x] **The gesture × surface matrix has no empty cell** — every gesture on the table cell, the card, the page pane and the preview inspector reaches the same `filePick.ts` primitives. The keyboard path is parity: no property type has one on any of the four surfaces, and the ×'s `:focus-visible` reveal is shared by every chip type.
- [x] **The chip's hover-scroll measured, not reasoned** — driven by a dispatched `Input.dispatchMouseEvent` in headless Chrome against the built CSS. The cap holds at 65px, the label scrolls its full 122px of hidden text, and the chip measures 81px before, during and after.
- [x] **Dead vocabulary 0** against a control of 873; no instrumentation, no orphaned exports.

#### Next Session — Two Parallel Tracks

1. **The continuous codebase cleanup** — [[Codebase-Cleanup-Checklist]], 6a → 6b next (the rehome, then Table hoisting). Any session starts it with "Run the next bundle from Codebase-Cleanup-Checklist."
2. **Part 3 of the file-based arc** — `PhotoCropModal` widened past the nexus icon so banners, cards and other media crop through it. It is the profile photo's alone today, which is why `setProfileImage` still carries bytes while every banner carries a path.

#### Open Against File Properties

- **A second Add started while the first adoption is still copying loses one reference.** Every surface reads the value at click time and the adoption after the dialog is a plain await, so two picks straddling a large copy both tail the pre-commit list. Recorded rather than fixed: closing it means threading a getter through four call sites, and the damage is fully recoverable — the lost file is already under the asset root, so re-picking it takes the reference-in-place branch.
- **Two live checks are Nathan's**, both ten seconds: picking a file from inside `.nexus/assets` while the configured root is elsewhere (⌘⇧. shows hidden folders — a dim chip means the copy-out did not fire), and whether the ×'s reveal survives moving the cursor toward it. Computed styles lie for that second one; only a live hover is truth.
- **The settings pane's `minHeight={245}`** floors both PaneSlider slots, so the File editor's short body leaves dead space beneath it. A shared knob, not this feature's.

#### Feedback

- "If it's unreachable it's dead — that's the discipline." A prop the spec names but nothing consumes comes out; a ruling that defers a deletion on a prediction expires when the prediction resolves.
- "Stop and analyze the pattern other chips use, implement the fix, and actually verify it's the correct and simplest actual method." A JS tween was authored where `truncateHoverScroll` already existed — the mechanism was there and only the melt guard's `pointer-events: none` blocked it.
- "The chip max stays, and the chip never re-sizes." The cap is the design; the label scrolls inside it.
- "You're not blocked by any method of verification — live nexus, computer use, don't let anything seem off the table."

#### Touched Files

- **Main:** `mutate.ts` (the `indexable` gate at the reference-in-place branch), `assetRoots.ts`, `paths.ts`, `index.ts`.
- **Shared:** `nexusPaths.ts` (`assetSubRoot` moved here), `cellMenu.ts`.
- **Renderer:** `PropertyEditing/filePick.ts` + `usePropertyRows.ts` (the hoisted `valueMenu`), `Table/TableView.tsx` + `Cell.tsx`, `Cards/CardValue.tsx`, `PagePropertiesPane.tsx`, `PreviewInspector.tsx`, `filterModel.ts`, `FilterPane.tsx`.
- **Design system:** `tokens/chip.css.ts` + `typography.css.ts` (`scrollRevealed`), `FileChip.tsx`/`fileChip.css.ts`, `FileLabel.tsx` (`fileLabel.css.ts` deleted), `PathField.tsx` + `pathField.css.ts`, `SegmentRun.tsx`, `showcase/leaves/ChipsLeaf.tsx`.
- **Tests:** `mutate.test.ts` (the acceptance chain + the hidden-folder control), `cellGestures.test.tsx` (the stamp × hit-test crossing), `filePick.test.ts`.

#### Session Pointers

- `main/mutate.ts` — `adoptFile` is THE adoption seam; its guard stack is four checks that each cover a hole the others don't (lexical `..`, realpath-against-the-asset-root for a symlink, `indexable` for reachability, `embeddableTitle`/`neverWatched` for the name). Nothing in it collapses.
- `shared/propertyValue.ts` — the `file` case stays physically separate from `multi_select`'s and says why at the site. Merging them routes file through the option gate, where `optionValues` answers `[]` and `strict` discards every attachment through the restore path.
- `renderer/Detail/Views/PropertyEditing/filePick.ts` — the one file effect. `runFilePick` answers `undefined` for "write nothing", which a bare `!= null` would read as a clear; `pickFileInto` states that rule once.
- `design-system/tokens/chip.css.ts` — the melt machinery's header is load-bearing. A removable chip's label is pointer-inert, so anything keyed on the label's own `:hover` is unreachable; enter that state from `${chipRemovable}:hover` instead, which is outside the frame the ×-reveal flips.

#### Working Notes

- **Containment is not reachability.** A path can sit provably inside a root and still be somewhere the index will never hold. The boundary check answers the question it was asked, and the wrong question fails silently — a write there, or a reference to a file already there, resolves to nothing forever with no error at any layer.
- **A capped label that cannot hover itself has no reveal.** `truncateHoverScroll` is the app's one ellipsis-at-rest / scroll-on-hover mechanism, and the melt guard's `pointer-events: none` makes its hover half unreachable on every removable chip. The fix is the same declarations one selector up, never a second mechanism.
- **The showcase is a consumer.** A design-system shape that never lands on the deployed roster is a shape nobody can find, which is the drift the design system exists to prevent — arriving through the one surface a feature's Made False table never lists.
- **A test can pin a dead arm.** `fileValueMenu`'s unreachable guard read as live precisely because a test asserted it. When a dead interface is removed, census the rest of that component's interface in the same pass; the reason one prop went dead is rarely unique to it.
- **A parallel session is live in this tree** and holds MarkdownPM, NexusSettings, personalization and the ledger scripts. Stage explicit paths, never a directory, and read `git diff --cached --name-only` before every commit.
