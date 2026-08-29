## Tiles Merge — Plan

> **Status:** ratified — in execution. Base commit recorded in the Log at each phase.

Fold `renderer/Blocks/` and `renderer/Embeds/` into `renderer/SurfacePM/`, so one folder owns the surface engine and the tiles it renders. The work is overwhelmingly **move + rename + merge duplicated code** — every consumer already exists and keeps working; nothing is redesigned. Companion artifact (the decision record): https://claude.ai/code/artifact/6592d468-8822-4655-aaa8-6822758656c0.

### Principles (binding on execution)

- **Move and merge; do not rebuild.** The default action is relocate, rename, and repoint. Simplification beyond that happens only where two copies of one thing collapse into one.
- **Creation must be proven unavoidable.** A new file or abstraction is written only after verifying the result is otherwise impossible — stated at the new file, in one line. Two new files clear that bar (§Justified creation); everything else is a move.
- **Use what already exists.** The dispatch, the debounced page-save, the chassis, the warm cache, the zoom ramp — all already exist. Reach for them before writing anything.
- **Look to confirm, not to invent.** The risk spots in §Confirm-only are checked to prove they still work after the move. A fix lands only if an issue is real; then it is the minimal change consistent with the surrounding code — never a redesign smuggled in as a fix.
- **Behavior is preserved.** This is a refactor. The single deliberate exception is Phase 5 (webpages become a mountable tile kind), and it is isolated so it can be deferred without touching the rest.

### Settled (from the artifact)

- **Home:** `SurfacePM/` absorbs both folders. Justified by SurfacePM's own doc framing `PageEmbed` as "a Page inside any foreign surface" — windows and the hover pane are more of them. Consequence, accepted: `Windows/`, `MarkdownPM`, and `Links` import their page body from `SurfacePM/`.
- **No unified `Tile.tsx` seam.** Dropped after looking: `BlockSurface.renderTile` already switches on `entry.type` (markdown/page/view) and `MarkdownPM/Editor/embedWidget` already switches on `kind` (page/webpage). A new dispatcher would re-wrap dispatch that already exists — unjustified creation. The moved components slot into the existing switches.
- **`PageEmbedBlock` folds into `PageTile`.** It is a 29-line pass-through; its path-resolve + `onBeginEdit(entryId)` adaptation moves into the page arm of `renderTile`, calling `PageTile` directly (as the four other consumers already do).
- **Shared body save:** `PageTileWrite.ts` — page and markdown tiles share one debounce/flush/retry helper at a uniform **400ms**. Nothing more of the two is merged (per direction: "keep just the PageTileWrite similarity for now").
- **View-lock gate:** one owner — a function inside `ViewTileScope`, no separate file; the tile and the scope stop each re-checking `locked`.
- **`ViewTile` is move-only this pass.** Its 607-line rebuild is **Bundle 9** of the Codebase-Cleanup Checklist, blocked on this merge landing first.
- **Two caches stay:** `TileCache` (page warm-state) and `WebRetention` (hidden-guest LRU) — different things, separate files.
- **Naming:** components/logic files PascalCase; the four tile-kind classes become `.page-tile` / `.web-tile` / `.markdown-tile` / `.view-tile`; stylesheets stay kebab.

### Justified creation

Only **one** file is net-new. It carries its one-line necessity proof, written at the file.

1. **`PageTileWrite.ts`** — a keyed, debounced body writer parameterized by `(key, write)`. *Necessity:* `pageFlush.ts` already embodies this pattern for page files (path-keyed → `updatePageBody`), but `MarkdownBlock` reimplements it for block-doc snippets (`host+tileId`-keyed → `blocks.writeMarkdown`) — a different backend, so neither can call the other. The shared debounce/pending/flush-on-blur/retry scaffolding has no existing home that serves both; extracting it is the only way to remove the duplication.

The **view-lock gate is not a new file** — the single lock-write decision (`locked, nextView, opts) → 'config' | 'state' | 'refused'`) is written twice today (ViewTileScope's `useSaveView` and ViewTile's `persistConfig`/`persistState`). It folds into `ViewTileScope` as one exported function both call; the second copy is deleted. No creation.

### The moves (Phase 1 inventory)

`renderer/Blocks/*` and `renderer/Embeds/*` → `renderer/SurfacePM/`, via `git mv` (rename detection), imports repointed to `@renderer/SurfacePM/*`:

| From | To | Note |
| --- | --- | --- |
| `Embeds/PageEmbed.tsx` | `PageTile.tsx` | + folds `PageEmbedBlock` |
| `Embeds/WebpageEmbed.tsx` | `WebTile.tsx` | |
| `Blocks/ViewEmbedBlock.tsx` | `ViewTile.tsx` | move only |
| `Blocks/MarkdownBlock.tsx` | `MarkdownTile.tsx` | |
| `Embeds/ViewEmbedScope.tsx` (+test) | `ViewTileScope.tsx` | 13 importers |
| `Blocks/BlockHandleMenu.tsx` | `TileHandleMenu.tsx` | |
| `Blocks/BlockSurface.tsx` | `TileSurface.tsx` | the dashboard host |
| `Blocks/useBlockDoc.ts` | `UseTileDoc.ts` | PascalCase |
| `Embeds/tileWarm.ts` (+test) | `TileCache.ts` | PascalCase |
| `Embeds/webRetention.ts` (+test) | `WebRetention.ts` | PascalCase |
| `Blocks/blockZoom.ts` (+test) | `TileZoom.ts` | PascalCase |
| `Blocks/viewEmbed.css.ts` | `viewTile.css.ts` | component chrome |
| `Blocks/handleMenu.css.ts` | `handleMenu.css.ts` | unchanged name |
| `Blocks/tile-chassis.css` + `Blocks/blocks.css` + `Embeds/embeds.css` | `block-tile-base.css` | merged — Phase 4 |
| `Blocks/block-title.css` | `block-title.css` | already extracted, moves as-is |
| `SurfacePM/surfacepm.css` | `tile-surface.css` | Phase 4 |
| `Blocks/PageEmbedBlock.tsx` | — | deleted (folded) |

Removed folders: `renderer/Blocks/`, `renderer/Embeds/`.

### Phases

Each phase ends green on all three gates (`npm run typecheck` · `npm run test` · `npm run lint`) before the next opens.

**Phase 1 — Move + rename + fold.** `git mv` every file above; repoint all imports to `@renderer/SurfacePM/*` (the same alias-scoped, grep-to-zero method the folder-capitalization commit used — verify no old `Blocks/` or `Embeds/` path segment survives, case-sensitive, against a control token). Fold `PageEmbedBlock` into `renderTile`'s page arm and delete it. Class names and CSS merges do **not** happen here — this phase is pure relocation, so the gate proves behavior is identical.
*Verify:* typecheck (every unresolved import surfaces); app open — a dashboard with one of each tile kind renders; the `![[ ]]` page embed and a webpage embed render; a Page Window and the hover pane render.

**Phase 2 — `PageTileWrite`.** Extract the generic debounced writer; re-base `MarkdownTile`'s save onto it (key `host+tileId`, write `blocks.writeMarkdown`), keeping its removal-guard. Route the page-tile path through it too, or leave page saves on `pageFlush` if `pageFlush` is app-wide beyond tiles — decide by reading who calls `pageFlush` (it is shared by windows and the hover pane, not tiles only; likely `PageTileWrite` generalizes the pattern and `pageFlush` re-bases onto it rather than the reverse). Uniform 400ms.
*Verify:* type a markdown tile, blur, reopen — body persisted; a page tile edited in two hosts still coordinates one write; removal mid-debounce drops no data and lands no orphan.

**Phase 3 — Consolidate the lock gate.** Add the lock-write decision as one exported function in `ViewTileScope`; `useSaveView` and `ViewTile`'s persist arms both call it, and the duplicated `if (locked)` copy in the tile is deleted. Negative control: a locked view tile refuses a config write and accepts a state-only write; the same test goes red if the gate is bypassed.
*Verify:* lock a view tile — reorder/config refused, scroll/collapse (state) still persists; unlocked writes whole.

**Phase 4 — CSS merge + class rename.** Merge `tile-chassis.css` + `blocks.css` + `embeds.css` into `block-tile-base.css`, deduping the shared `.tile-chassis.is-editing-tile` rules. Rename `surfacepm.css` → `tile-surface.css`. Rename the four kind-classes (`.blk-md`→`.markdown-tile`, `.pgembed`→`.page-tile`, `.wpembed`→`.web-tile`, view chrome → `.view-tile`) across the CSS and every TSX/test that names them — grep-to-zero on the old class strings. `.tile-chassis` (the chassis class) and `blk-zoom-*` / `--block-zoom` (the zoom ramp) are **left as-is** — self-consistent, functional, and renaming them is churn the merge doesn't need (see §Confirm-only).
*Verify:* every tile still wears its border/clip; hover-title reveals; zoom steps still apply; biome clean.

**Phase 5 — Webpage tile parity (the one additive, deferrable).** Give the block model a `webpage` entry variant (shared `blocks` schema + `SurfacePM/Core/codec`), add a `webpage` arm to `renderTile` mounting `WebTile`, and route its height/warm through the same persisted blobs pages use. **The create affordance is deliberately not added** — the dashboard's add-tile menu does not offer webpage, matching the decision. This phase touches the block schema, so it is isolated last and can be cut entirely for a pure refactor.
*Verify:* a hand-seeded webpage entry renders as a live tile, warms across a tab flip, persists height; the add menu still offers only markdown/page/view.

**Phase 6 — Review + reconcile.** The mandatory simplification + correctness pass over the whole diff: dispatch `code-simplifier`, then `comment-killer-agent` — **strip the imported comments from the moved files** (they carry Blocks/Embeds-era prose; keep only a genuine load-bearing why), then a `build-breaking-agent` pass; every finding verified at its cited line before folding. Reconcile the Feature docs the move touched (SurfacePM.md, InterfacePM §Floating Windows, ArchitecturePM §Embeds, DesignSystemPM if the chassis row moved). Refresh the Line-Ledger figure.
*Verify:* all gates; the app-open list from Phases 1–5 re-run once against the built app.

### Confirm-only (prove these survive; fix only if broken, minimally)

- **Title-click navigation** — a page tile's title/click navigates via `select({kind:'page'…})` in the host (`BlockSurface`→`TileSurface`); it moves with the host. Confirm the click still opens the page and ⌘-click still opens a new tab.
- **Zoom scales** — `blk-zoom-*` classes + `--block-zoom` in `tile-surface.css`, computed by `TileZoom.ts`, read by the tile and the view-embed grid `zoom`. Confirm a zoomed tile still steps; the class prefix stays `blk-zoom` (functional, self-consistent, not part of the kind-class rename).
- **Rest-vs-edit scroll model** — the edge-release wheel behavior keyed on `.tile-chassis.is-editing-tile` must read identically after the CSS merge.
- **Hover-title reveal** — keyed on `.mdpm-embed-tile:hover`; `block-title.css` moves intact. Confirm page breadcrumb / webpage title still reveal on hover, and that dashboard (`.spm-tile`) tiles behave as before (they do not show it today — unchanged).
- **Warm state across a tab flip** — a parked page tile and a playing webpage tile survive a flip (`TileCache` + `WebRetention` callers repointed, behavior identical).
- **The `![[ ]]` widget** — `embedWidget`'s lazy imports repoint to `@renderer/SurfacePM/PageTile` / `WebTile`; the inline embed still mounts.

### Open (close before ratifying)

- **`PageTileWrite` vs `pageFlush` direction** — generalize `pageFlush` in place and have markdown adopt it, or a new `PageTileWrite` both re-base onto. Resolved by reading `pageFlush`'s non-tile callers in Phase 2; flagged here so the answer is deliberate.

### Log

**Base:** `b5597a5f`. **Phase 1:** `cc1474ad`. **Phase 2:** (this commit).

**Rulings**
- *(P1)* The **UI layer** becomes "tile" (components, hooks, classes); the **block-doc data model stays "block"** — `@shared/blocks`, `nexus.blocks`, `MarkdownBlockEntry`, `BlockHostRef`, and the shared webpage embed-syntax detection (`loneWebpageEmbed`, `composeWebpageEmbedLine`) keep their names. A blanket rename had reached into these; reverted (caught by the Phase 1 attack).
- *(P1)* Comment-stripping of the moved files' inherited Blocks/Embeds-era prose is deferred to the Phase 6 whole-range pass, per the standard's framing of it as the post-plan review — not done per-phase.
- *(P2)* `PageTileWrite.ts` (the `createBodyWriter` factory) lives in `SurfacePM/`; `Interface/pageFlush` re-bases onto it (the Interface→SurfacePM dependency already exists via `TileSurface`). Markdown-tile saves gain retry-on-fail and a beforeunload flush from the shared factory — strict improvements over the old silent-drop, not regressions.
- *(P2)* The page-save `writeThroughBody` re-assert on a failed-write requeue lands at the retry's flush (≤400ms later) rather than failure-immediate as before — a self-correcting sub-400ms transient on the disk-error path only. Left as-is: closing it would add a requeue hook to the generic factory, complicating it for a negligible case.

**Invariants to protect**
- *(P2)* The requeue-after-cancel path is safe **only because** `removing` (TileSurface — the `suppressFlush` source) is permanent-once-set (`.add`/`.has`, never `.delete`). If that ever gains a reset, a cancelled markdown write's requeue could resurrect a trashed tile's file; a write-time guard would have to be re-added.

### Downstream, not in this plan

- **Bundle 9** (Codebase-Cleanup Checklist) — the `ViewTile` light rebuild, blocked on this merge seating the file at `SurfacePM/ViewTile.tsx`.
- **RendererRework** — this merge is its §Tiles item; mark it landed there when Phase 6 closes.
