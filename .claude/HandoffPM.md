## Handoff — Pommora

> **User Prompt:** *"Re-run the Tiles arc's review gates and closeout against .claude/Planning/Tiles — Implementation Plan.md … Make sure this is solid and ready-to-ship; while preserving TilesV2-Spec.md as a Planning/ doc which captures the decision logs pre-paving towards the inspector … When done, commit to Origin. Each of Nathan's manual passes has been verified."* Then, mid-run: two agents per lens; the delta must be negative; the review reduces what the plan introduced rather than adding glue; don't leave things broken; retire the migration with no helper code; push origin on final closure.*

#### Current Focus

**Session ID:** c6dd673e-55a1-45d2-b95b-12da6896d315
**Dates:** 09-04-2026 to 09-05-2026
**Model:** Fable 5.1

**The Tiles arc is closed and pushed.** The closeout re-ran every gate as a polish: per phase, two simplifiers on disjoint file sets, then two correctness reviewers and two attackers read-only, every finding folded or ruled in the plan's Log; then a whole-range pass, the Delivery Claim rewritten and checked by two neutral verifiers, and two full-range attacks. The arc nets −6 actionable lines over `043ee930..506cf3fb` (comments and tests excluded); the row migration is retired by Nathan's call, the tile chassis class is `.tile-base`, and the Features doc is [[SurfacePM]] with Tiles as its section. Nathan verified the seven items of his own pass by hand; the plan's Status is closed.

**What the closeout fixed, in the order found.** Phase 1: a frame drag back to its origin restores and does not drop, a release at the start's size does not drop, the release after a cancelled drag is not a click (the handle menu had opened on it; CalendarPicker's day cells had re-picked), a move decided mid-settle survives the grid's unmount, the grid's six never-passed props are module knobs. Phase 3: the handle menu opens at its root each time and holds its entry through a waived delete, its Link rows and drill leaves refuse where the model does, `knownEntry` derives from the recipe table, one `reviseTile` under remove and the two converts, one `tileFilePath`. Phase 4: every `tiles:*` channel refuses while a nexus adopts, the Homepage host remounts per nexus, one JSON decode reads a BOM as encoding, a body the read fails on renders inert rather than empty, the document writer returns its failure. Whole range: the six tile-id channels share one prologue, the strict read's result is one `fail`, the migration is gone. Closeout attack: one layout definition (the schema holds the split and ratio-count rules; every NexusOS file passes), a body is trashed only when its document write landed.

**Recorded and not built, by Nathan's ruling that the closeout adds no glue:** a `_tiles.json` whose layout the codec refuses opens empty and the first gesture writes the empty layout over it; a move inside the 300 ms save debounce is lost to ⌘R or ⌘Q; a refused `tiles:save` is silent. Each is a few lines when wanted. Two items stay Nathan's call in the plan's Open Against Later Tasks: the host-lock toggle's blink under a reload, and a webpage tile persisting its window-capped height over the stored one.

**Not this session's:** Nathan's own comment trims in nine files outside the tile system, four Planning docs and `Pommora/build/icon.png` deleted in the working tree — left uncommitted, since the icon is the packaged app's and the deletions were not asked for here.

#### Completion Criteria

- [x] Every phase gate re-run: simplify, review, attack; every finding folded or ruled.
- [x] The Delivery Claim rewritten, verified by two neutral verifiers, attacked over the full range.
- [x] The arc nets negative; the Dead Vocabulary sweep at zero against its control (26).
- [x] TilesV2-Spec written; SurfacePM restored; Context, Handoff, and History PM-128 current.
- [x] Nathan's own pass verified; the plan closed; pushed to origin.

#### Next Session

- The inspector: the tab strip, the reserved Collection and Pages tabs, custom tabs under `.nexus/inspector/<id>/` reading the reserved `state.json` key, a `state-leaf` watcher arm the moment that key gains a writer, per-tab warmth through the tile cache's warm seam. The standing spec is `.claude/Planning/TilesV2-Spec.md`.
- Panel kinds (properties, backlinks, list) and webpage as a surface kind: one shared entry, one renderer entry, a copy arm if needed, and a component each.
- Live body reload for markdown tiles rides the page editor's external-edit arc.
- `comment-ledger.mjs --unit` crashes on nine of fourteen units over casing drift in `comment-units.json` (pre-existing; a tooling chore for the next comment pass).

#### Feedback

- "Don't overcomplicate the review — the purpose is to reduce complexity the plan introduced rather than applying more glue." / "Delta must be negative, total amount of stuff must be reduced; it's a polish of what's done, not more stuff added." / "Don't leave things broken, just don't add what doesn't belong."
- "Tile-chassis needs to be renamed tile-base like I told you to." / "You should not have removed the SurfacePM doc — Tiles are a sub-section of that doc."

#### Session Pointers

- The spec and the plan: `.claude/Planning/TilesV2-Spec.md`, `.claude/Planning/Tiles — Implementation Plan.md` (the Log: Rulings, the four Gate blocks, Closeout re-run rulings, Open Against Later Tasks, Deviations, Sequenced After; the Delivery Claim under Closeout).
- The tile system: `Pommora/src/renderer/Tiles/` (`TileGrid.tsx`, `TileHost.tsx`, `TileHandleMenu.tsx`, `tileKinds.tsx`, `useTileDoc.ts`, `Surfaces/`); the contract `Pommora/src/shared/tiles.ts`; main's `tiles.ts`, `tileDoc.ts`, `tileHostAnd` and `onTile` in `index.ts`; the watcher arm in `watcher.ts` / `watchPatch.ts`.
- The delta yardstick in the session scratchpad: `delta.py <base> <head|WT>` (actionable = non-blank, non-comment, non-test lines under `Pommora/src`).

#### Working Notes

- A simplifier told to hold behavior will still remove a ratified structure (the copy arm) when it reads as one-armed; the fold has to check each removal against the plan's requirements before keeping it.
- `firePointer(window, …)` does not reach `document` listeners in jsdom; a listener that must see a real release lives on `document` and the test fires the event on the element.
- Nathan's parallel session confirmed the comment trims were Nathan's own hand edits; the unattributed-edits rule bundles them only where a file also carries this session's change.

#### Changes

**FILES ADDED**

- .claude/Planning/TilesV2-Spec.md

**FILES MOVED**

- .claude/Features/TilesPM.md → SurfacePM.md

**FILES REMOVED**

- Pommora/src/main/tilesMigrate.ts · tilesMigrate.test.ts

**FILES MODIFIED**

- .claude: ContextPM.md · HandoffPM.md · HistoryPM.md; Features: SurfacePM · DesignSystemPM; Planning: Tiles — Implementation Plan
- Pommora/src/shared: tiles.ts · tileMenu.ts (+tests)
- Pommora/src/main: index.ts · tiles.ts · tileDoc.ts · paths.ts · watcher.ts · sidecarIO.ts · IO/atomicWrite.ts · CRUD/contextWrite.ts · Database/localState.ts (+tests)
- Pommora/src/renderer: Interactions/gesture.ts · shared.ts · ResizeFrame.tsx; Interface/HomepageView.tsx; MarkdownPM/Editor/embedWidget.tsx; Tiles/TileGrid.tsx · TileHost.tsx · TileHandleMenu.tsx · useTileDoc.ts · tileZoom.ts · tile-base.css · tile-grid.css · handle-menu.css.ts · ViewTileScope.tsx · Core/model.ts · Core/hitTest.ts · Surfaces/* (+tests)

**COMMITS**

- `fbe76db2` Phase 1 · `7fb7c997` Phase 2 · `f0363567` Phase 3 · `624822cc` Phase 4 · `4cda638e` the whole-range polish · `506cf3fb` the closeout attack folded · the docs commit that follows.
