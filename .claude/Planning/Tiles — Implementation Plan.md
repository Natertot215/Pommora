## Tiles — Implementation Plan

> **Status:** written, pending review · Spec: [[Tiles — Decision Log]] · Execute tasks in order.
> Citations name files and symbols; re-derive before editing. Base: `043ee930`.

**Goal**

At the end, `Pommora/src/renderer/Tiles/` is the tile system: one pure tree in `Core/`, one grid, one host binding, the surfaces a tile can hold, and one chassis sheet. Every drag in the app that sizes or moves something runs on `Interactions/gesture.ts`; a box sizes through `ResizeFrame`, a tree through the grid. A tile kind is one entry in a shared table and one in a renderer table. A host's tile document is a `_tiles.json` file in the host's folder, so it travels with the Nexus, reloads live when it changes on disk, and the per-machine rows that held it are gone. Nothing outside MarkdownPM says "block."

The shape was chosen over three alternatives in the log: free placement (the README's own rejection; a narrow pane needs rows that fill), inspector tabs as docked windows, and the shell as a WindowBase (both Prospects). Storage went to a file of its own rather than the identity sidecar after the scout showed `_space.json` and `homepage.json` have no schema, four writers rebuild them whole, two write them unlocked, and the layout debounce would make the document the hottest writer on a file the watcher's echo window then hides. Nathan ratified the direction on 09-04-2026 and ruled that flagged past comments are inputs, not constraints.

This arc builds the substrate only. No inspector tab strip, no new tile kinds, no PickerMenu plumbing, no change to the tree model's logic, and MarkdownPM's embeds stay CM6 widgets whose layout is the document.

**Requirements**

1. One pointer engine: `Sensors/pointerDrag.ts` folds into `gesture.ts`; the embed tile's handle runs on `ResizeFrame`.
2. `SurfacePM/` becomes `Tiles/` and every "block" leaves the tile system: files, types, channels, classes, variables, user strings, docs, tests.
3. The three tile kinds are declared through a recipe (shared table + renderer table) that the host, the menu model, both menu presenters, main's lifecycle, the Space seed, and the remint read; no `type === '…'` branch survives outside the tables.
4. `TileHostRef` enumerates its current consumers, and a new member is one union entry plus one `hostDir` arm.
5. The document lives in `<hostDir>/_tiles.json`, reloads live on external change, migrates once from `local_state`, and the nexus-wide inspector configuration has a reserved key in `state.json` with `MAX_INSPECTOR_TABS = 6`.
6. Stale prose is rewritten: the shared contract's sidecar comment, the README, `has-live-editor`, `TILE_DEFAULT_PX`'s lone reader, the zoom ramp's second definition.

**Acceptance — the whole thing working:** With the app open on a Space, copying that Space's `_tiles.json` from a second Nexus (a different layout, one view tile with a re-minted config id) over the open one re-renders the grid within a second without a remount; dragging a tile edge, a tile handle, a window corner, the glance edge, the sidebar strip, and an embed tile's bottom edge each writes through `beginPointerGesture` (a breakpoint or log there fires for all six); `rg -F "SurfacePM" src` → 0, `rg -o 'blk-[A-Za-z0-9_-]+' src | wc -l` → 0, and `rg -n "type === 'markdown'" src` matches only inside the two recipe tables; the `local_state` table holds no `blockDoc` row after one open.

**Forced By**

- `tsconfig.node.json` compiles `src/shared/**` with no DOM lib and no `jsx` → the recipe splits: a shared table (schema, file-backed, copy hook, menu rows, seed) and a renderer table (surface, source identity) keyed by the same `type` (Task 5, 6).
- `gesture.ts` is a module singleton and captures at activation, not press → the grid guards `setResizingId` on the begin's boolean and passes `swallowActiveEscape` (Task 2).
- `gesture.ts` has no coalescing seam and `SurfaceView` clones the tree per action per move → Gate 1 counts `onDragMove` calls per frame over CDP before the fold is called done (Task 2).
- `ResizeFrame` reads `spec.rect` at press from render-time state → `rect` gains the function form `max` already has, since the embed measures its box at press (Task 1).
- `.nexus/homepage/**` is unwatched and tile `.md` files under a Space are unwatched by depth → the `_tiles.json` arm is added by exact filename, before those ignores (Task 8).
- `readScope`/`readKey` answer empty before `openSessionDb` (`index.ts:388`) → the migration runs beside `runAssetMigration` (`index.ts:407`), never in `prepareOpenedNexus` (Task 9).
- `blockDoc` rows are never deleted and `nexus.db` is device-local → the migration's rule is file-wins: a row writes a file only where none exists, and every row is dropped after (Task 9).
- A Collection folder is corpus: a `<ulid>.md` there is adopted as a page → no Collection host ships; the host-folder rule for corpus hosts is recorded in Sequenced After (Task 7).
- `renderTile` must stay identity-stable (`SurfaceView.tsx:32-33`) → the renderer table is module-level and `renderTile` stays one `useCallback` over it (Task 6).
- Entries ride raw through reads and writes (`shared/blocks.ts:2-4`) → the recipe's copy hook and every mutator take and return raw records; `knownTile` stays a read lens (Task 5).

**Inherited Reasoning**

- The document left the sidecar in July 2026 (`aac3797e`, `92ad0e96`) to retire a whole-file lost update between a debounced layout save and a banner write; an interim `_blocks.json` (`97b0f6f4`) was reverted (`357f2493`) for "one file, one entity" once the write-echo suppression landed. The file returns now because cross-device is required and `nexus.db` is device-local; it returns as its own file because the lost-update class is real and the sidecars are unschema'd.
- A `local_state` scope rename (`6992b60f`) shipped with no migration and reset per-machine chrome once. That is acceptable for chrome; a layout is content and migrates.
- The tile grid stayed off `ResizeFrame` in PM-127 because a tile edge is a boundary between neighbors, not a box. It still is.
- `TileHandleMenu` hand-mirrors `tileMenuModel`'s kind branches; both were written before a recipe existed. Both read the table now.

**Grounding** *(re-open these; don't cite them)*

- [[Tiles — Decision Log]] — every ruling; Core vs Prospects.
- `Pommora/src/renderer/Interactions/gesture.ts` — the engine: singleton, capture at activation, cancel → `onAbort` (all paths since `043ee930`), `swallowActiveEscape`.
- `Pommora/src/renderer/Interactions/ResizeFrame.tsx` — `useResizeFrame(spec)` → `{ start, active, edges }`; `pull` reads `spec.max` as value or function.
- `Pommora/src/renderer/SurfacePM/Sensors/pointerDrag.ts` — capture on down, element listeners, rAF-coalesced cumulative deltas, `onEnd(commit)`.
- `Pommora/src/renderer/SurfacePM/SurfaceView.tsx` — `onEdgeDown` (:320-401), `onHandleDown` (:403-483), `EDGE_ZONES`, the stable-id render comment (:526-529).
- `Pommora/src/renderer/SurfacePM/TileSurface.tsx` — `renderTile` (:313-351), `mutateViewEntry` (:284-295), the menu page-info (:374, :395), `applyPagePick`/`applyViewPick`.
- `Pommora/src/renderer/SurfacePM/TileHandleMenu.tsx` — kind checks at :198, :219, :240, :243, :310.
- `Pommora/src/shared/tileMenu.ts` — `tileMenuModel`; branches at :82, :89-97, :98-105; imports are shared-only.
- `Pommora/src/shared/blocks.ts` — the union, the three `looseObject` members, `knownBlock`, `BlockHostRef`, `blockHostKey`, `NEW_TILE_H`, `blockPatchProblem`.
- `Pommora/src/main/blocks.ts` — `readBlockDoc`/`writeBlockDoc` on scope `'blockDoc'`, `hostDir`, `blockFilePath`, `createMarkdownTile`, `removeBlockTile`, `flipTile`, `duplicateBlockTile`, `listBlockHosts`, `markdownBlockFiles`, `rewriteBlockConnections`, `remintConfigIds`.
- `Pommora/src/main/remint.ts` — `copyBlockDocRow` (:170-188), `remintSidecar` (:105-128).
- `Pommora/src/main/CRUD/contextWrite.ts` — `createSpace` seed (:251-281).
- `Pommora/src/main/watcher.ts` (:66-79 ignores, :105-107 echo) · `watchPatch.ts` (:131-145 classify, :371-393, :463-466) · `IO/writeEcho.ts`.
- `Pommora/src/main/Database/localState.ts` — `readScope`, `writeKey` (null deletes), scope union.
- `Pommora/src/main/index.ts` — open sequence (:374-416), the nine `blocks:*` handlers (:1476-1568), `blockHostAnd` (:681).
- `Pommora/src/main/IO/fileLock.ts` — the key is the literal path; not reentrant.
- `Pommora/src/main/paths.ts` — `NEXUS_CONFIG_FILES`, `blockHostDir`, `sidecarPath`, `SIDECAR_FILENAME`.
- `Pommora/src/renderer/MarkdownPM/Editor/embedWidget.tsx` — `EmbedResizeHandle` (:150-201), `mountTile` (:118-136), the two `createElement(EmbedResizeHandle …)` sites (:267, :415).
- `Pommora/src/renderer/MarkdownPM/Styles.css` — `@property --block-zoom` (:1), `.mdpm-embed-tile.is-resizing-tile` (:369-372).
- `.claude/Guidelines/Development-Environment.md` — gates, parallel-write discipline, the `.css.ts` export rule, no `| tail` on a gate.

**Environment:** Plan directory `.claude/Planning`. Spec: the decision log. Explorer: `Explore`. Research: none needed. Code reviewer: `general-purpose` scoped to correctness (no project correctness agent exists; `/code-review` is the command form). Attack reviewer: `build-breaking-agent`. Neutral verifier: `general-purpose`. Simplification: `code-simplifier` (single-handed, no worktree). Gates: `npm run typecheck`, `npm run lint`, `npx vitest run` from `Pommora/`; the Electron gate for live checks is `env -u ELECTRON_RUN_AS_NODE npm run dev -- --remote-debugging-port=9333`. Rules directory: `.claude/Guidelines`.

**Shapes:** refactor (Phase 1, 2, 3) · removal (Phase 2's vocabulary) · migration (Phase 4) · additive (the push, the reserved key) · user-visible (Phase 1's gesture edges).

**Global Constraints (every task inherits these):**

- Gates from `Pommora/`, exit codes read directly: `npm run typecheck && npm run lint && npx vitest run`. Never `| tail` the last step.
- Biome formats on write; single quotes, no semicolons; never hand-align. A shell-driven edit is followed by `npm run format` on the touched files.
- Comments near-zero, whys only, no value-restating; `KNOB` and `(Nathan's call)` markers survive.
- One tree-touching writer at a time. Stage explicit paths; never `git add -A` or any whole-tree git operation. `GlancePane.tsx` and `nav-view.css` are dirty and not ours: never stage them.
- `src/main` and `src/preload` do not hot-reload; a live check after a main-side task restarts the dev process.
- Commit per task, docs made false in the same commit, the task's boxes ticked in that commit.
- Out of scope everywhere: `Showcase/` beyond compiling; the DnD engine's capture; `TabBar`'s native-window drag; PickerMenu; the tree model's logic in `Core/`; any new tile kind or inspector surface; `Tables/columnWidths`.

**Made False**

| Doc | The specific claim | What makes it false | Task |
| --- | --- | --- | --- |
| `Pommora/src/shared/blocks.ts:56` | "which entity's sidecar holds the doc — the homepage singleton (homepage.json) or a Space (its `_space.json`)" | the document is a `_tiles.json` per host | 7 |
| `Pommora/src/renderer/SurfacePM/README.md:32-41` | `core/`, `sensors/` lowercase; "codec … repairs (renormalize, collapse, dedupe) rather than rejects" | the dirs are `Core/`, no `Sensors/` after Task 2; the codec parses | 2, 3 |
| `Pommora/src/renderer/SurfacePM/SurfaceView.tsx:526-529` | "letting React move the keyed DOM nodes to match silently releases pointer capture (the pointerup never lands → zombie gesture" | window-level listeners; the stable order stays for reflow, not capture | 2 |
| `Pommora/src/main/blocks.ts:1-9` | "ONE row in nexus.db, keyed by host" | a file per host | 7 |
| `Pommora/src/main/blocks.ts:250-251` | "The shared walk under both the link-index read and the rename heal" | only the rename heal reads it | 4 |
| [[SurfacePM]] (whole) | "Each block is one row in `nexus.db`", "Block Surface", "BlockHost", `SurfacePM/block-tile-base.css` | rename + storage | 3, 4, 7 |
| [[DesignSystemPM]] roster row | `SurfacePM` module path | `Tiles/` | 3 |
| [[InteractionPM]] Resize Frame paragraph | "Surface tiles and embed tiles keep their own gestures" | the grid runs on the engine; the embed on the frame | 1, 2 |
| [[InterfacePM]] :82 | "The inspector pane — reserved; its design pass is pending." | still true; add the reserved `state.json` key sentence | 10 |
| [[ContextPM]] Debt | "`band` names three unrelated things across SurfacePM" | `Tiles` | 3 |
| `.claude/scripts/loc.py:33` | `"renderer/SurfacePM"` in a module group | path moved | 3 |

**Dead Vocabulary**

- `SurfacePM` → 0 in `src`. Legitimate hits: none. (`.claude/HistoryPM.md` and `Sessions/` are records; `Planning/*` name the arc.)
- `blk-` → 0 in `src`.
- `blocks:` (channel prefix) → 0 in `src`.
- `window.nexus.blocks` → 0.
- `--block-zoom` → 0.
- `blockDoc` → 2 in `src` after Task 9: the scope union member and `tilesMigrate.ts`, the one reader. Both leave together when the migration is retired (Sequenced After).
- `startPointerDrag` → 0.
- `is-resizing-tile` → 0.
- `\b[A-Za-z]*[Bb]lock[A-Za-z]*\b` outside `MarkdownPM/` → only English prose (`blocked`, `CORS-blocked`), the property-cache family (`cacheBlock`, `patchCacheBlock`, `withoutCacheBlock`, `blockValue`), and `alsoBlock`.
- Control: `rg -Fw -o "TileLeaf" src | wc -l` → 26. Zero here means the sweep never ran.

**Hazard Window:** Task 7 opens it — main writes `_tiles.json` and no longer writes `local_state`, so a Nexus opened by this build before Task 9 lands has its old rows unread. Task 9 closes it. Between them, do not open the real NexusOS Nexus with a dev build; use a scratch Nexus.

---

### Phase 1 — One engine

#### Task 1: The embed tile's handle on the frame

**Requirement:** 1

**Why:** The embed tile is one box with one edge; it belongs on the primitive every other box uses, so a change to how a drag aborts or tints reaches it for free.

**Now** — `rg -F "EmbedResizeHandle" src` → 3:

```ts
// src/renderer/MarkdownPM/Editor/embedWidget.tsx:154
function EmbedResizeHandle({ view, targetId }: { view: EditorView; targetId: string }): React.JSX.Element
//   :161 usePointerGesture(); :169 startH from span.getBoundingClientRect(); :180 span.classList.add('is-resizing-tile')
//   :182 lastH = Math.max(TILE_MIN_PX, Math.round(startH + dy)); :188 teardown removes the class
//   :189-193 onDrop dispatches setEmbedHeights + saveHeights; :194-198 onAbort restores startH
//   :267, :415 createElement(EmbedResizeHandle, { view, targetId }) — span is `dom` at both sites

// src/renderer/Interactions/ResizeFrame.tsx:25-35
export interface ResizeFrameSpec<R extends Partial<Rect>> {
  rect: R
  min?: Partial<Size>
  max?: Partial<Size> | (() => Partial<Size>)
  equilateral?: boolean
  outlined?: boolean
  onChange: (next: R, phase: ResizePhase) => void
}

/* src/renderer/MarkdownPM/Styles.css:369-372 */
.mdpm-embed-tile.is-resizing-tile { --tile-border-color: var(--accent-stroke-hot); cursor: ns-resize; }
```

**Becomes** — the frame measures at press when asked; the handle is `frame.edges(['s'])`:

```ts
// src/renderer/Interactions/ResizeFrame.tsx
export interface ResizeFrameSpec<R extends Partial<Rect>> {
  rect: R | (() => R)          // a function is read at press — for a box whose size is measured, not held
  min?: Partial<Size>
  max?: Partial<Size> | (() => Partial<Size>)
  equilateral?: boolean
  outlined?: boolean
  onChange: (next: R, phase: ResizePhase) => void
}

// src/renderer/MarkdownPM/Editor/embedWidget.tsx
function EmbedResizeHandle({ view, span, targetId }: { view: EditorView; span: HTMLElement; targetId: string }): React.JSX.Element
// useResizeFrame<{ h: number }>({
//   rect: () => ({ h: span.getBoundingClientRect().height }),
//   min: { h: TILE_MIN_PX }, max: { h: Infinity }, equilateral: true,
//   onChange: 'move' → span.style.height + requestMeasure · 'drop' → round, setEmbedHeights, saveHeights · 'abort' → restore from.h
// })
// returns <>{frame.edges(['s'])}</>; callers pass span: dom
```

```css
/* src/renderer/MarkdownPM/Styles.css — the hot border keys on the frame's own active class */
.mdpm-embed-tile:has(> .resize-edge.is-active) { --tile-border-color: var(--accent-stroke-hot); cursor: ns-resize; }
```

**Assumed by:** Task 2 (the same `rect` signature is untouched there), Task 3 (file moves import the frame by the same path).

**Verify — automated**

- [ ] Red first: a `ResizeFrame.test.tsx` case where `rect` is a function returning a different height on each press; expect the second drag to start from the second value. Fails on the type before the change. Then green.
- [ ] `embedResize.test.tsx` gains one case: pointerdown on `.resize-edge-s`, `pointermove` +40 on `window`, `pointerup`; expect `span.style.height` = start + 40 rounded and `saveHeights` called once with an integer. Red before (no handler on the new prop shape), green after.
- [ ] `rg -F "is-resizing-tile" src` → 0. Control: `rg -F "tile-chassis-body" src | wc -l` → the count from Now, unchanged.
- [ ] Full gate green.

**Verify — user**

- [ ] Drag an embed tile's bottom edge in a page: the border goes hot on the first move, the height follows, Escape mid-drag snaps back, release persists (reopen the page).

#### Task 2: The grid on the engine

**Requirement:** 1

**Why:** Two pointer engines with one vocabulary is a second definition of the same thing. The grid's handle and edge drags move onto `beginPointerGesture` and `Sensors/` is gone.

**Now** — `rg -F "startPointerDrag" src` → 6 (definition, two calls in `SurfaceView.tsx`, three in its test):

```ts
// src/renderer/SurfacePM/Sensors/pointerDrag.ts:16
export function startPointerDrag(e: React.PointerEvent, handlers: PointerDragHandlers): void
// captures on down · element listeners · rAF-coalesced cumulative dx/dy · lostpointercapture aborts
// Escape at window capture with stopPropagation · onEnd(commit) — one callback for drop, tap, and abort

// src/renderer/SurfacePM/SurfaceView.tsx:379-400 (onEdgeDown) — threshold 0; onMove reduces `actions` through ops (one cloneLayout per action); onEnd commits when latest !== origin
// src/renderer/SurfacePM/SurfaceView.tsx:447-482 (onHandleDown) — default threshold; resolve() per move + per auto-scrolled frame; onEnd returns early when !moved && !decided, else settles
```

**Becomes** — the two handlers call the engine; the four exits are named:

```ts
// src/renderer/SurfacePM/SurfaceView.tsx
const begin = usePointerGesture()   // one per SurfaceView; both handlers share it
// onEdgeDown:  setResizingId(id) only if begin(...) returned true
//   spec: { el, event: e, activation: 0, capture: true, swallowActiveEscape: true,
//           onActivate: () => true,
//           onDragMove: (ev) => { dx = ev.clientX - startX; dy = ev.clientY - startY; latest = actions.reduce(...); setDraft(latest) },
//           onDrop: () => { if (latest !== origin) onLayoutChangeRef.current(latest) },
//           onAbort: () => {}, onTap: () => {},
//           teardown: () => { setResizingId(null); setDraft(null) } }
// onHandleDown: spec: { el, event: e, capture: true, swallowActiveEscape: true,
//           onActivate: () => true,
//           onDragMove: (ev) => { moved = true; …startAutoScroll lazily…; resolve(ev.clientX, ev.clientY) },
//           onDrop: () => settle(decided-or-home), onAbort: () => { if (moved) settle(home) }, onTap: () => {},
//           teardown: () => stopScroll?.() }
// Sensors/pointerDrag.ts and Sensors/pointerDrag.test.ts deleted.
```

```ts
// src/renderer/Interactions/gesture.test.ts gains the two cases the sensor's tests carried and the engine's lacked:
//   'Escape aborts an active drag and the next begin succeeds' · 'pointercancel aborts'
```

**Assumed by:** Task 3 (moves `SurfaceView.tsx`; the file must already import from `@renderer/Interactions/gesture`).

**Verify — automated**

- [ ] Red first: the two new `gesture.test.ts` cases fail against nothing? They pass today (the engine already does this) — so they are ported as coverage, not red-green; say so in the commit. The red-green here is `SurfaceView`'s own: a `TileGrid.test.tsx` case that presses an edge, moves 30px on `window`, releases, and expects `onLayoutChange` once with the stretched height. Red before (the sensor listens on the element, not `window`), green after.
- [ ] `rg -F "startPointerDrag" src` → 0. Control: `rg -Fw -o "TileLeaf" src | wc -l` → 26.
- [ ] `rg -F "Sensors" src` → 0.
- [ ] CDP count: with the dev app open on a Space, wrap `onDragMove` in a counter (instrumentation, removed before commit, grep-verified) and drag an edge across ~60 frames; the count per `requestAnimationFrame` tick must be ≤ 1.2 on average. If it isn't, add a rAF gate inside `onEdgeDown`/`onHandleDown` only and record the number in Deviations.
- [ ] Full gate green.

**Verify — user**

- [ ] On a Space: stretch a tile, drag a divider, drag a corner, move a tile onto a band seam and onto a tile edge; Escape mid-move settles home; a plain click on an edge does nothing.

#### Gate 1 — one engine, behavior held

- [ ] Gate commands green, exit codes read directly.
- [ ] Every task's **Verify — automated** list ticked, each against a result just watched.
- [ ] Every Now count re-run against its control; counts matched, or the divergence rewrote the plan.
- [ ] Simplification and review dispatched against `043ee930..HEAD` scoped to `Interactions/`, `SurfacePM/`, `MarkdownPM/Editor/embedWidget.tsx`, `MarkdownPM/Styles.css`.
- [ ] Every concern fixed, or carrying an explicit user ruling recorded in the Log.
- [ ] [[InteractionPM]]'s Resize Frame paragraph rewritten in this phase's last commit.
- [ ] Progress hashes filled in.
- [ ] Not a declared stop: the next phase opens; the two user boxes carry to Completion Criteria.

---

### Phase 2 — Tiles/

#### Task 3: The move

**Requirement:** 2

**Why:** The module is named for what it holds. Paths first, identifiers second, so a reviewer can approve a pure move and then a pure rename.

**Now** — `rg -F "@renderer/SurfacePM" src --glob '!src/renderer/SurfacePM/**'` → 21 lines in 15 files; relative imports into the folder → 7 in 7 files; alias self-imports inside → 9; the four surfaces' own relative imports → 10:

```
src/renderer/SurfacePM/
  Core/…  Sensors/…(gone in Task 2)  SurfaceView.tsx  tile-surface.css  TileSurface.tsx
  MarkdownTile.tsx  PageTile.tsx  PageTile.test.tsx  ViewTile.tsx  view-tile.css.ts  WebTile.tsx
  webRetention.ts  WebRetention.test.ts  ViewTileScope.tsx(+test)  TileHandleMenu.tsx  handle-menu.css.ts
  block-tile-base.css  block-title.css  tileCache.ts  TileCache.test.ts  tileZoom.ts  TileZoom.test.ts
  useTileDoc.ts  pageTileWrite.ts  SurfaceLab.tsx  README.md
```

**Becomes** — `git mv`, imports rewritten, nothing else:

```
src/renderer/Tiles/
  Core/…                       unchanged
  TileGrid.tsx  tile-grid.css  (SurfaceView.tsx, tile-surface.css)
  TileHost.tsx                 (TileSurface.tsx)
  Surfaces/MarkdownTile.tsx  Surfaces/PageTile.tsx  Surfaces/PageTile.test.tsx
  Surfaces/ViewTile.tsx  Surfaces/view-tile.css.ts  Surfaces/WebTile.tsx
  Surfaces/webRetention.ts  Surfaces/WebRetention.test.ts
  tile-base.css  tile-title.css  (block-tile-base.css, block-title.css)
  ViewTileScope.tsx(+test)  TileHandleMenu.tsx  handle-menu.css.ts  tileCache.ts(+test)  tileZoom.ts(+test)
  useTileDoc.ts  pageTileWrite.ts  SurfaceLab.tsx  README.md (rewritten: Core/, no Sensors/, codec parses)
```

```ts
// Every importer rewritten: @renderer/SurfacePM/X → @renderer/Tiles/X (or Tiles/Surfaces/X for the four);
// '../SurfacePM/…' relative forms likewise. .claude/scripts/loc.py:33 "renderer/SurfacePM" → "renderer/Tiles".
// Features/SurfacePM.md → Features/TilesPM.md (content rewritten in Task 4 and 7; this commit moves it and fixes paths).
```

**Assumed by:** Task 4 (identifiers), 6 (the renderer table lives in `Tiles/`), 7 (`useTileDoc` path).

**Verify — automated**

- [ ] `rg -F "SurfacePM" src` → 0. Control: `rg -Fw -o "TileLeaf" src | wc -l` → 26.
- [ ] `rg -F "SurfacePM" .claude/Features .claude/ContextPM.md .claude/FrameworkPM.md .claude/scripts/loc.py` → 0 (History and Sessions excluded by design).
- [ ] Full gate green; `npm run build` green (the showcase leaf still compiles).
- [ ] No red-green: a move has no behavior to invert; the type gate is the proof.

**Verify — user**

- [ ] *(none — nothing user-visible ships here.)*

#### Task 4: The vocabulary

**Requirement:** 2, 6

**Why:** "Block" is MarkdownPM's word for its CM6 blocks. Every tile-system use of it, on every side of the IPC boundary and in every class and variable, becomes "tile," so the storage move in Phase 4 and the recipe in Phase 3 are written once in the right words.

**Now** — the sweep, each with its count today (`rg -Fw -o "<T>" src | wc -l`):

```
BlockHostRef 46 · BlockEntry 15 · BlockDoc 6 · BlockDocPatch 9 · BlockStyle 12 · knownBlock 35 · blockHostKey 24
MarkdownBlockEntry 2 · PageBlockEntry 2 · ViewBlockEntry 4 · coerceBlockHost 10 · blockPatchProblem 11
readBlockDoc 16 · writeBlockDoc 19 · blockFilePath 11 · blockHostAnd 8 · rewriteBlockConnections 7 · removeBlockTile 6
duplicateBlockTile 6 · setBlocks 5 · blockHostDir 4 · copyBlockDocRow 2 · listBlockHosts 2 · markdownBlockFiles 2
saveBlocks 12 · liveBlocks 4 · BlockDocState 3 · BlockDocSession 2 · setBlockZoom 3 · removeBlock 3 · duplicateBlock 3
channels blocks:* 29 (9 names) · window.nexus.blocks 12 · blk-* classes 20 · --block-zoom 28 (incl. @property in MarkdownPM/Styles.css:1)
spm-* classes 62 (spm-tile 31 · spm-handle 18 · spm-edge 8 · spm-surface 3 · spm-placement 2) · SurfaceLayout 74 · SurfaceGeometry 9 · SurfaceViewProps 2
user strings: 'Unknown block host.' ×3 · 'Invalid block-doc patch.' · 'Block file not found.' · 'blocks must be an array.'
```

**Becomes** — one name each; the on-disk `type: 'markdown'` and the `.md` files untouched:

```ts
// src/shared/tiles.ts (was blocks.ts)
export type TileHostRef = { kind: 'homepage' } | { kind: 'space'; id: string }
export function tileHostKey(host: TileHostRef): string
export function coerceTileHost(raw: unknown): TileHostRef | null
export type TileStyle = 'bordered' | 'borderless'
export interface MarkdownTileEntry … PageTileEntry … ViewTileEntry
export type TileEntry = MarkdownTileEntry | PageTileEntry | ViewTileEntry
export function knownTile(raw: unknown): TileEntry | null
export interface TileDoc { layout: unknown; tiles: unknown[]; locked: boolean }        // the JSON key `blocks` → `tiles` lands with the file in Task 7
export interface TileDocPatch { layout?: unknown; tiles?: unknown[]; locked?: boolean }
export function tilePatchProblem(patch: TileDocPatch): string | null                    // 'tiles must be an array.'

// src/shared/bridge.ts — 'tiles:get' 'tiles:save' 'tiles:createMarkdown' 'tiles:removeTile' 'tiles:readMarkdown'
//   'tiles:writeMarkdown' 'tiles:convertToPage' 'tiles:convertToView' 'tiles:duplicateTile'
// src/preload/index.ts — window.nexus.tiles.{…}
// src/main/tiles.ts (was blocks.ts) — readTileDoc, writeTileDoc, tileFilePath, tileHostAnd, rewriteTileConnections,
//   removeTile, duplicateTile, listTileHosts, markdownTileFiles, tileHostDir (paths.ts)
// src/renderer/Tiles/useTileDoc.ts — saveTiles, liveTiles, TileDocState, TileDocSession
// src/renderer/Tiles/TileHost.tsx — setTileZoom, removeTile, duplicateTile; root class 'tile-host', has-live-editor dropped
// src/renderer/Tiles/tileZoom.ts — `tile-zoom-${…}`; tile-grid.css — .tile-grid .tile .tile-handle .tile-placement, --tile-zoom
// src/renderer/Tiles/Core/{model,rects}.ts — TileLayout, TileGeometry; TileGridProps
// src/renderer/MarkdownPM/Styles.css:1 — @property --tile-zoom; Views/TableView/table-view.css, Views/CardView/cards-view.css read --tile-zoom
// src/renderer/Interface/Interface.css:63,65,71 — :not(:has(.tile-host))
// main strings: 'Unknown tile host.' 'Invalid tile-doc patch.' 'Tile file not found.'
```

**Assumed by:** Task 5, 6, 7, 8, 9 (every later fence uses these names).

**Verify — automated**

- [ ] Each token in Now re-run → 0, one command per token, `-Fw`. Control: `rg -Fw -o "TileLeaf" src | wc -l` → 26; `rg -Fw -o "hostLocks" src | wc -l` → 10.
- [ ] `rg -o '\b[A-Za-z]*[Bb]lock[A-Za-z]*\b' src --glob '!src/renderer/MarkdownPM/**' | sed 's/.*://' | sort | uniq -c` → only the allowlist in Dead Vocabulary.
- [ ] `rg -F "@property --tile-zoom" src/renderer/MarkdownPM/Styles.css` → 1 (the one registration survives the rename).
- [ ] `TileZoom.test.ts` asserts `tile-zoom-090` etc.; `shared/tiles.test.ts`, `main/tiles.test.ts`, `remint.test.ts`, `contextWrite.test.ts`, `tileMenu.test.ts` renamed with their subjects and green.
- [ ] Full gate green; `npm run build` green.

**Verify — user**

- [ ] *(none.)*

#### Gate 2 — one vocabulary

- [ ] Gate commands green, exit codes read directly.
- [ ] Every task's **Verify — automated** list ticked.
- [ ] Every Now count re-run against its control; counts matched, or the divergence rewrote the plan.
- [ ] Simplification and review dispatched against `<gate-1 head>..HEAD`.
- [ ] Every concern fixed, or carrying an explicit user ruling.
- [ ] [[TilesPM]], [[DesignSystemPM]]'s roster row, [[ContextPM]]'s `band` ride-along rewritten in this phase's commits.
- [ ] Progress hashes filled in. Not a declared stop.

---

### Phase 3 — The recipe

#### Task 5: The shared table

**Requirement:** 3

**Why:** A kind's schema, whether it owns a file, what a copy must re-mint, which link rows its menu offers, and how it is seeded are one declaration main and the menu model both read, so adding a kind touches no switch.

**Now** — `rg -n "type === 'markdown'" src` → 6, `type === 'page'` → 5, `type === 'view'` → 5, `type !== 'view'` → 1, `b.type === 'view'` (raw, remint) → 1:

```ts
// src/shared/tiles.ts:129-166 — three z.looseObject members and knownEntry = z.union([...])
// src/shared/tileMenu.ts:82 (page header row) · :89-97 (markdown's Link View / Link Page) · :98-105 (Source row: page drills, view refuses)
// src/main/tiles.ts:99 (mint seed) · :116, :146 (trash the file on remove/flip when markdown) · :199-207 (duplicate: copy body; re-mint view configs) · :257 (rename-heal walk)
// src/main/remint.ts:181 (raw b.type === 'view' → remintConfigIds) · src/main/CRUD/contextWrite.ts:266-276 (the 2×2 seed mints markdown outside createMarkdownTile)
```

**Becomes** — one table, one key set:

```ts
// src/shared/tileKinds.ts (new) + src/shared/tileKinds.test.ts
export type TileType = TileEntry['type']
export interface TileKind<E extends TileEntry = TileEntry> {
  schema: z.ZodType<E>
  /** The kind owns a `<id>.md` beside the document: minted empty, trashed on remove or convert, copied on duplicate, walked by the rename heal. */
  fileBacked: boolean
  /** A copy of a raw entry — the view kind re-mints `views[].config.id`; others return the entry. Raw in, raw out. */
  onCopy: (raw: Record<string, unknown>) => Record<string, unknown>
  /** The link rows the handle menu offers, in order; an empty `items` renders the row refused. */
  menuRows: (ctx: TileMenuContext) => Array<{ label: 'Link View' | 'Link Page' | 'Source'; items: DrillPickItem<TilePick>[] }>
  /** Whether the menu heads with the source's title. */
  headerIdentity: boolean
}
export const TILE_KINDS: Record<TileType, TileKind>
export const knownTile = (raw: unknown): TileEntry | null   // moves here from tiles.ts; z.union(Object.values(TILE_KINDS).map(k => k.schema))

// src/shared/tileMenu.ts — tileMenuModel reads TILE_KINDS[entry.type].menuRows(ctx) and .headerIdentity; no kind branch remains
// src/main/tiles.ts — removeTile/convert/duplicate/markdownTileFiles read TILE_KINDS[entry.type].fileBacked and .onCopy
// src/main/remint.ts — copyTileDoc maps entries through TILE_KINDS[type]?.onCopy ?? identity (raw; unknown types pass through)
// src/main/CRUD/contextWrite.ts — the seed builds entries as { id, type: 'markdown' } through one `mintSeed('markdown', id)` in tiles.ts
```

**Assumed by:** Task 6 (keys the renderer table on `TileType`), Task 7 (main's doc writer keeps `TILE_KINDS` reads).

**Verify — automated**

- [ ] Red first: `tileKinds.test.ts` — every `TileType` has an entry; `knownTile` on a `{ type: 'widget' }` → null; `onCopy` on a raw view entry re-mints `views[].config.id` and preserves a foreign key; `menuRows` for markdown = two rows, page = one `Source` with items, view = one `Source` with none. Fails on module-not-found. Then green.
- [ ] `rg -n "type === 'markdown'" src` → matches only inside `src/shared/tileKinds.ts`; likewise `'page'`, `'view'`. Control: `rg -Fw -o "TileLeaf" src | wc -l` → 26.
- [ ] `shared/tileMenu.test.ts` unchanged and green (the model's rows per kind are the crossing test between the table and the presenters).
- [ ] `contextWrite.test.ts:99`'s literal assertion still green through the seed.
- [ ] Full gate green.

**Verify — user**

- [ ] *(none.)*

#### Task 6: The renderer table

**Requirement:** 3

**Why:** The host's render switch and the handle menu's five kind checks read one table keyed by the same `TileType`, so the pane and the native menu can't drift and a kind's surface is one entry.

**Now** — `rg -n "entry?.type ===\|entry.type ===" src/renderer/Tiles/TileHost.tsx src/renderer/Tiles/TileHandleMenu.tsx` (run each form separately) → TileHost :289, :316, :328, :341, :374, :395; TileHandleMenu :198, :219, :240, :243, :310:

```tsx
// src/renderer/Tiles/TileHost.tsx:313-351 renderTile — three branches building three different prop shapes:
//   markdown → <MarkdownTile host tileId editing onBeginEdit connections suppressFlush locked/>
//   page → pagesById.get(entry.page_id) ?? <div className="tile-inert"/> → <PageTile path editing onBeginEdit connections locked/>
//   view → <ViewTile entry mutateEntry onActivate/>
// :374, :395 — menu source identity: page only
// TileHandleMenu.tsx — the JSX mirror of tileMenuModel's rows, plus the drill root label at :310
```

**Becomes** — a module-level table and one render context:

```tsx
// src/renderer/Tiles/tileKinds.tsx (new)
export interface TileRenderContext {
  entry: TileEntry; id: string; host: TileHostRef; editing: boolean
  beginEdit: (id: string) => void; connections?: ConnectionsApi
  suppressFlush: (id: string) => boolean; pagesById: ReadonlyMap<string, ConnPage>
  mutateEntry: (id: string, fn: (raw: Record<string, unknown>) => Record<string, unknown>) => void
}
export interface TileSurface<E extends TileEntry = TileEntry> {
  render: (ctx: TileRenderContext & { entry: E }) => React.ReactNode   // a dead reference returns <div className="tile-inert"/>
  sourceInfo?: (entry: E, pagesById: ReadonlyMap<string, ConnPage>) => { title: string; icon?: string; path: string; id: string } | undefined
}
export const TILE_SURFACES: Record<TileType, TileSurface>

// TileHost.tsx — renderTile = useCallback((id) => { const entry = entries.get(id); return entry ? TILE_SURFACES[entry.type].render({...}) : <div className="tile-inert"/> }, [...same deps])
//   menu source identity → TILE_SURFACES[type].sourceInfo?.(entry, pagesById) at both sites
// TileHandleMenu.tsx — rows rendered from tileMenuModel's `menuRows` (label → pane, items → drill); the root label reads the row's label
```

**Assumed by:** none later.

**Verify — automated**

- [ ] Red first: a `TileHost.test.tsx` case mounting a host document with one entry per kind plus one `{ type: 'widget' }` expects three surfaces and one `.tile-inert`. Fails before (the file does not exist), green after. The page kind with a dead `page_id` → `.tile-inert`.
- [ ] `rg -n "\.type ===" src/renderer/Tiles/TileHost.tsx src/renderer/Tiles/TileHandleMenu.tsx` → 0. Control: `rg -Fw -o "TileLeaf" src | wc -l` → 26.
- [ ] Crossing test: `TileHandleMenu` renders exactly the rows `tileMenuModel` returns for each kind (a test enumerating `TILE_KINDS` and comparing labels).
- [ ] Full gate green.

**Verify — user**

- [ ] On a Space: each tile's handle menu (in-app and native) shows the same rows as before; Link Page, Link View, and Source still drill and convert.

#### Gate 3 — one recipe

- [ ] Gate commands green, exit codes read directly.
- [ ] Every task's **Verify — automated** list ticked.
- [ ] Every Now count re-run against its control.
- [ ] Simplification and review dispatched against `<gate-2 head>..HEAD`.
- [ ] Every concern fixed, or carrying an explicit user ruling.
- [ ] [[TilesPM]]'s Tile Types section rewritten to describe the recipe.
- [ ] Progress hashes filled in. Not a declared stop.

---

### Phase 4 — The document in the Nexus

#### Task 7: `_tiles.json`

**Requirement:** 4, 5

**Why:** A layout is content; it belongs with the host it arranges and travels with the Nexus. One file per host with one writer keeps it clear of the identity sidecars' fourteen writers.

**Now** — `rg -F "'blockDoc'" src` → 11 (scope union, `readTileDoc`/`writeTileDoc`, the Space seed, `copyTileDoc` read + write, tests):

```ts
// src/main/tiles.ts:66-86
export function readTileDoc(host: TileHostRef): TileDoc            // readKey<Partial<TileDoc>>('blockDoc', tileHostKey(host))
export function writeTileDoc(host: TileHostRef, patch: TileDocPatch): void   // writeKey('blockDoc', …) — synchronous, "nothing to lock"
// src/main/tiles.ts:31-56 — spaceHostDir(root, id), hostDir(root, host): the folder every kind of host has
// src/main/CRUD/contextWrite.ts:272 — writeKey('blockDoc', …) after the four .md seeds
// src/main/remint.ts:170-188 — copyTileDoc(oldId, fresh): reads the row, re-mints view configs, writes the copy's row
// src/main/index.ts:1476-1568 — nine handlers; tiles:get/save call read/write synchronously
```

**Becomes** — the document is a file beside the bodies:

```ts
// src/main/paths.ts
export const TILE_DOC_FILENAME = '_tiles.json'
export const tileDocPath = (hostDirAbs: string): string => join(hostDirAbs, TILE_DOC_FILENAME)

// src/main/tiles.ts
export async function readTileDoc(root: string, host: TileHostRef): Promise<TileDoc>
// absent or malformed → { layout: undefined, tiles: [], locked: false } (the host opens empty, as the row did)
export async function writeTileDoc(root: string, host: TileHostRef, patch: TileDocPatch): Promise<void>
// serializeOnFile(tileDocPath(dir), () => read → { ...cur, ...patch } → atomic writeJson); the file's only writer
// The JSON on disk: { "layout": …, "tiles": [ … ], "locked": false } — entries raw, foreign keys survive as today

// src/main/CRUD/contextWrite.ts — createSpace: four .md seeds, then writeTileDoc(root, { kind: 'space', id }, seed) — files first, doc second, one crash ordering
// src/main/remint.ts — the folder copy already carries _tiles.json; remintSidecar's pass also rewrites tileDocPath(dir) through writeTileDoc with TILE_KINDS[type].onCopy; copyTileDoc deleted
// src/main/index.ts — the nine handlers await; tiles:save no longer gates on sessionDb() (the db is not the store); adopting() gate stays
// src/shared/tiles.ts — TileHostRef comment: the two hosts that exist; a new member is one union entry + one hostDir arm (`tiles.ts`)
```

**Assumed by:** Task 8 (the watcher classifies `TILE_DOC_FILENAME`), Task 9 (the migration writes through `writeTileDoc`).

**Verify — automated**

- [ ] Red first: `main/tiles.test.ts` — `writeTileDoc` then `readTileDoc` round-trips layout, tiles, locked, and a foreign key on an entry; `_space.json` is byte-identical before and after (the existing assertion at `blocks.test.ts:81-85`, kept); an absent file reads empty; a malformed file reads empty and is not rewritten; two concurrent `writeTileDoc` calls on one host serialize (the second sees the first's patch). Red on the signature, then green.
- [ ] `contextWrite.test.ts` — the Space seed lands in `_tiles.json` with four markdown entries and the 2×2 layout; `_space.json` carries no `tiles` key.
- [ ] `remint.test.ts:220-284` — the copied Space's `_tiles.json` view config id is a fresh ULID and the source's is unchanged.
- [ ] `rg -F "writeKey('blockDoc'" src` → 0 outside Task 9's migration. Control: `rg -Fw -o "TileLeaf" src | wc -l` → 26.
- [ ] Full gate green; dev process restarted for the live check.

**Verify — user**

- [ ] On a scratch Nexus: create a Space, arrange tiles, quit, reopen: the layout is there; `_tiles.json` is readable beside `_space.json`.

#### Task 8: Live reload

**Requirement:** 5

**Why:** A file that syncs is a file that changes underneath an open host. The watcher names it, main pushes the host key, and the host re-reads. Most recent wins.

**Now** — `rg -F "homepage-leaf" src` → 3 (classify, patch, test); `useTileDoc` loads once per `hostKey` and has no subscription:

```ts
// src/main/watcher.ts:66-79 — ignoredUnder: `.nexus/homepage/**` entirely; `.nexus/contexts/*/*/**.md` at depth ≥ 5
// src/main/watchPatch.ts:131-145 — classify: settings-leaf · homepage-leaf · crops-leaf · space-meta · else full-refresh
// src/shared/bridge.ts:222-223 — 'tiles:get' / 'tiles:save' request-reply only
// src/renderer/Tiles/useTileDoc.ts:50-62 — one load effect keyed on [hostKey, seedHostLock]
```

**Becomes** — one arm, one push, one subscription:

```ts
// src/main/watcher.ts — ignoredUnder: a path whose basename is TILE_DOC_FILENAME is never ignored (checked before the homepage-dir and depth rules)
// src/main/watchPatch.ts — classify: basename === TILE_DOC_FILENAME → { kind: 'tiles-leaf', host: TileHostRef }
//   (homepage: `.nexus/homepage/_tiles.json`; space: `.nexus/contexts/<ctx>/<space>/_tiles.json` resolved through findSpace)
//   the arm patches nothing on the tree; settle pushes 'tiles:changed' with the host
// src/shared/bridge.ts — 'tiles:changed': { push: [host: TileHostRef] }  (the push-kind entry the bridge already models for nexus:changed)
// src/preload/index.ts — window.nexus.onTilesChanged(fn): () => void
// src/renderer/Tiles/useTileDoc.ts — useEffect: subscribe; on a push whose tileHostKey matches, re-run the load and replace layout + tiles + lock;
//   a pending debounced save is dropped (most recent wins — the disk just won)
```

**Assumed by:** none later.

**Verify — automated**

- [ ] Red first: `watchPatch.test.ts` — a change event at `.nexus/contexts/Realms/Astral/_tiles.json` classifies `tiles-leaf` with `{ kind: 'space', id }`; at `.nexus/homepage/_tiles.json` → `{ kind: 'homepage' }`; a tile `.md` beside it is still ignored (`watcher.test.ts`). Red before, green after.
- [ ] Both halves of the ignore change: `ignoredUnder` returns false for `_tiles.json` under the homepage dir and true for `<ulid>.md` there.
- [ ] `useTileDoc.test.tsx` (new): a `tiles:changed` push for the mounted host replaces the layout; one for another host does not; a pending save is cancelled by the push.
- [ ] Echo: `writeTileDoc` goes through `atomicWriteFile`, so the app's own save records in `writeEcho` and does not bounce back; asserted by `watcher.test.ts`'s existing self-write case extended to the doc path.
- [ ] Full gate green; dev process restarted.

**Verify — user**

- [ ] With a Space open, edit its `_tiles.json` in a text editor (change a tile height) and save: the grid updates without a reload; drag a tile afterward and the file reflects it.

#### Task 9: The migration

**Requirement:** 5

**Why:** Every existing Space and Homepage layout lives in a per-machine row today. One idempotent sweep on open moves each into its file and retires the scope, so the hazard window Task 7 opened closes.

**Now** — `rg -F "'blockDoc'" src/main/Database/localState.ts` → 1; rows for deleted Spaces are never removed; `nexus.db` is device-local:

```ts
// src/main/index.ts:404-407
if (await replaySchemaCascade(root)) await refreshAfterWrite(root)
void runRepairSweep(root).then(...)
if (await runAssetMigration(root)) { await refreshTree(root) }
// src/main/Database/localState.ts:43-56 readScope<T>(scope) · :61-74 writeKey(scope, key, null) deletes
```

**Becomes** — file-wins, then the rows go:

```ts
// src/main/tilesMigrate.ts (new) + tilesMigrate.test.ts
/** Moves every `blockDoc` row into its host's `_tiles.json` once. File-wins: a host whose file already exists (another device wrote it) keeps the file; a host whose folder is gone has nothing to receive. Every row is deleted after, so a second run finds nothing. */
export async function migrateTileRows(root: string): Promise<{ written: number; dropped: number }>
// src/main/index.ts — after openSessionDb and beside runAssetMigration: const m = await migrateTileRows(root); a written > 0 needs no re-walk (the tree carries no doc)
// src/main/Database/localState.ts — 'blockDoc' stays in the scope union as the legacy name the migration alone reads (readScope is typed on the union)
```

**Assumed by:** none later.

**Verify — automated**

- [ ] Red first: `tilesMigrate.test.ts` — seeds three rows (a live Space, a Space whose folder is gone, the homepage) and one pre-existing `_tiles.json` for a fourth Space with its own row; expects `written: 2`, `dropped: 4`, the pre-existing file byte-identical, `readScope('blockDoc')` empty after; a second run → `{ written: 0, dropped: 0 }`. Red on module-not-found, then green.
- [ ] Census against real data before the first run on NexusOS: `SELECT key FROM local_state WHERE scope = 'blockDoc'` count recorded in the Log with the predicted `written`/`dropped`; the run's result matches or the divergence is investigated before proceeding.
- [ ] Backup: `nexus.db` copied beside itself before the first real open (the sweep deletes rows).
- [ ] `rg -F "blockDoc" src` → 2 (`localState.ts`'s union, `tilesMigrate.ts`). Control: `rg -Fw -o "TileLeaf" src | wc -l` → 26.
- [ ] `Database/open.test.ts:63-85` re-seeded with a surviving scope in place of `blockDoc`.
- [ ] Full gate green; dev process restarted.

**Verify — user**

- [ ] Open NexusOS once with the build: every Space and the Homepage show the layout they had; `_tiles.json` exists in each.

#### Task 10: The reserved key and the constants

**Requirement:** 5, 6

**Why:** The inspector's nexus-wide configuration has a named home and a named cap before anything writes them, so the tab feature later is one reader and one writer. The two one-definition fixes the log named land with it.

**Now** — `rg -F "TILE_DEFAULT_PX" src` → 3 (declaration + two reads in `embedWidget.tsx`); the zoom ramp is `.tile-zoom-*` classes hand-written in `tile-grid.css` beside `SCALE_STEPS` in `shared/types.ts`; `state.json` has two consumed keys (`collection_order`, `space_orders`):

```ts
// src/renderer/DesignSystem/Tokens/size.css.ts:33 export const TILE_DEFAULT_PX = 320
// src/shared/tiles.ts:53 export const NEW_TILE_H = 160
// src/renderer/Tiles/tile-grid.css — seven .tile-zoom-NNN rules setting --tile-zoom
```

**Becomes**

```ts
// src/shared/tiles.ts
/** The tabs the inspector may hold beyond the reserved ones. */
export const MAX_INSPECTOR_TABS = 6
/** The `inspector` key of `.nexus/state.json`: user-made tabs, each a tile host in `.nexus/inspector/<id>/`. Reserved; nothing reads or writes it yet. */
export interface InspectorState { tabs: Array<{ id: string; title: string }> }

// tile heights: one default — NEW_TILE_H stays the surface mint; TILE_DEFAULT_PX stays the embed default; the two are different things (a grid tile vs a document tile) and each keeps one reader — the fix is the comment in size.css.ts:32 saying which
// zoom ramp: tile-grid.css's seven rules become one rule per step generated where the factors live — tileZoom.ts exports the class ↔ factor pairs and a vanilla-extract `tile-zoom.css.ts` emits them (a .css.ts may export only serializable values — the pairs are)
```

**Assumed by:** none.

**Verify — automated**

- [ ] `rg -F "MAX_INSPECTOR_TABS" src` → 1 (declared, unread; the razor's exception is a ratified reserved contract, recorded in Rulings).
- [ ] `TileZoom.test.ts` asserts the emitted class list equals the `SCALE_STEPS` factors; `rg -F ".tile-zoom-" src/renderer/Tiles/tile-grid.css` → 0.
- [ ] Full gate green; `npm run build` green (the `.css.ts` export rule).

**Verify — user**

- [ ] Scale a tile through its handle menu across the ramp: each step still applies.

#### Gate 4 — the document travels

- [ ] Gate commands green, exit codes read directly.
- [ ] Every task's **Verify — automated** list ticked.
- [ ] Every Now count re-run against its control.
- [ ] Simplification and review dispatched against `<gate-3 head>..HEAD` scoped to `src/main`, `src/shared`, `src/preload`, `Tiles/useTileDoc.ts`.
- [ ] Every concern fixed, or carrying an explicit user ruling.
- [ ] The hazard window is closed (Task 9 landed).
- [ ] [[TilesPM]]'s Storage section, [[InterfacePM]]'s inspector line, `shared/tiles.ts`'s header rewritten in this phase's commits.
- [ ] Progress hashes filled in. Not a declared stop.

---

## Implementation Log

### Progress

- [ ] **Phase 1** — One engine · base `043ee930`
  - [ ] Task 1 — The embed tile's handle on the frame · ``
  - [ ] Task 2 — The grid on the engine · ``
- [ ] **Phase 2** — Tiles/
  - [ ] Task 3 — The move · ``
  - [ ] Task 4 — The vocabulary · ``
- [ ] **Phase 3** — The recipe
  - [ ] Task 5 — The shared table · ``
  - [ ] Task 6 — The renderer table · ``
- [ ] **Phase 4** — The document in the Nexus
  - [ ] Task 7 — `_tiles.json` · ``
  - [ ] Task 8 — Live reload · ``
  - [ ] Task 9 — The migration · ``
  - [ ] Task 10 — The reserved key and the constants · ``

### Rulings

- 09-04-2026, Nathan: flagged past comments are inputs, not constraints; break one when breaking it is better.
- 09-04-2026, Claude under that ruling: the document is a per-host `_tiles.json`, not the identity sidecar; the vocabulary sweep includes `spm-*`, `SurfaceLayout`, `SurfaceGeometry`, the Features doc filename, and the four user strings.
- 09-04-2026, Claude: Escape while a grid drag is active is swallowed (`swallowActiveEscape`), matching every frame consumer; before activation it reaches the host's exit-editing as before.
- 09-04-2026, Claude: a no-move press on a tile edge is a tap and emits its click; nothing listens for it.
- 09-04-2026, Claude: `MAX_INSPECTOR_TABS` and `InspectorState` are declared unread — a reserved contract Nathan asked for, exempt from the reachability razor.

### Open Against Later Tasks

### Deviations

### Lessons

### Sequenced After

- The inspector: the tab strip, the reserved Collection and Pages tabs, custom tabs under `.nexus/inspector/<id>/`, a `state-leaf` watcher arm the moment `state.json`'s `inspector` key gains a writer (every change to that file is a full re-walk today).
- A Collection host's tile bodies: a Collection folder is corpus, so `<ulid>.md` there is adopted as a page; bodies for a corpus host go in a `_`-prefixed folder the walk already refuses. Recorded so the first Collection tab doesn't learn it the hard way.
- Panel kinds (properties, backlinks over `mentions`, list), webpage as a surface kind: one shared entry and one renderer entry each.
- Retiring `tilesMigrate.ts` and the `blockDoc` scope once every device has opened the Nexus on this build — the lift is a one-time job and leaves no code behind (`b370e5c0`'s precedent).

### Closeout

---

## Completion Criteria

**The directive**

```
Execute Tiles — Implementation Plan. Live.
Live-verify: the six drags on the engine, the embed handle, a Space's layout surviving quit/reopen, and the live reload from an external _tiles.json edit.
Screenshots: none.
Pings: per phase.
Record: History arc PM-128 "Tiles".
Also: never open NexusOS with the dev build between Task 7 and Task 9; use a scratch Nexus. GlancePane.tsx and nav-view.css are dirty and not ours.
Everything else is the standard below.
```

**The Standard**

- **The bar.** Not doing the chores — doing the laundry, folding it, picking up what fell out of the hamper, emptying the lint trap, leaving no trace that anything went wrong. A future review of this arc finds nothing to correct.
- **Only the live confirmation may be pending.** No concerns carried, no "for a later session," no deferrals when the fix is known and could be done now. Where an item genuinely can't get there, the Log names which and why, and everything else is still finished.
- **Reusability first.** Search before writing. A second resolver, cache, or validator means the plan is wrong, or you are — log it before proceeding. Duplication is debt.
- **Fix at the source**, never down-river; leave a unified thing rather than stitched pieces. Add code only where it repairs something flawed or makes things simpler.
- **Ambiguity:** take the simplest reading, record it under Rulings or Deviations, continue. Execution does not stop for input.
- **Per phase:** implement → simplify → comment pass → gates, exit codes read directly and never piped → code review → attack review → every finding fixed or carrying a defensible ruling → commit → ping. Simplification before review, never inverted. "Done with concerns" is unfinished work, and a result nobody watched happen is not a result.
- **Comments** only where the why can't be inferred. **Docs** stay clean and non-bloated; what went false gets rewritten, not amended. Unattributed doc or style edits mid-run belong to the user — fold them into the commit at hand, never revert them.

**Then tick these.**

**The deliverable**

- [ ] Every numbered requirement traces to a landed task.
- [ ] The acceptance criterion observed running, clause by clause.
- [ ] The CDP per-frame count recorded in the Log with its number.
- [ ] The migration census and result recorded in the Log with their numbers.

**The passes**

- [ ] Simplification and the comment pass over the whole range, not only per phase.
- [ ] Simplification → code review over the full implementation in that order.
- [ ] Delivery Claim written, then checked by a neutral verifier against the decision log.
- [ ] Every finding from every pass fixed, or carrying a defensible ruling.

**The user's own pass**

- [ ] An embed tile's bottom edge: hot border on first move, Escape restores, release persists.
- [ ] A Space: stretch, divider, corner, move onto a seam and onto an edge; Escape settles home; an edge click does nothing.
- [ ] Each tile's handle menu, in-app and native, shows the rows it showed before.
- [ ] A scratch Nexus round-trips a Space layout through quit and reopen.
- [ ] Editing `_tiles.json` by hand updates the open Space live.
- [ ] NexusOS opens once with every layout intact and `_tiles.json` in every host folder.
- [ ] The Scale ramp applies at every step.

**The record**

- [ ] Documents made false rewritten in the commits that falsified them.
- [ ] The closing sweep at zero against its control.
- [ ] Context and Handoff current; the History entry written to its format.
- [ ] Lessons routed; successor work named in Sequenced After.

**The report**, in plain English — what shipped and why it matters · what happened along the way worth knowing · every gate's real output · in-flight decisions, a sentence or two each · what's left for the live pass · final +/- line count, comments and tests excluded. Honest about what didn't work.
