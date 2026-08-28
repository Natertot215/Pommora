## Tiles — Implementation Plan

> **Status:** written, pending review · Spec: [[Tiles — Decision Log]] · Execute tasks in order.
> Citations name files and symbols; re-derive before editing. Execution starts only after the Menu Recipe lands on `main` (A-7).

**Goal**

One folder, `src/renderer/src/Tiles/`, holds everything a tile is — the chassis, the four content kinds, their plumbing, and the dashboard host — and both hosts consume it: MarkdownPM's `editor/embedWidget.tsx` and SurfacePM through `Tiles/BlockSurface.tsx`. `Blocks/`, `Embeds/`, root `Components/`, and `DesignSystem/Detail/` no longer exist. One editor shell, `TileEditor`, renders a prose tile and an embedded page; one writer, `TileWriter`, debounces and flushes every tile-shaped save — page bodies, prose-tile bodies, dashboard layouts — with the same nexus-adopt and window-close guarantees pages have today.

The shape follows the consumers: tile content is imported by both hosts and by three Windows with no plurality, which is the atlas's own test for a shared root folder, so `Surface/Blocks/` (a subfolder of one host) was rejected and `SurfacePM/` keeps its name as the engine. The folds are the point, not a side effect — Nathan's mandate is a net code-line reduction against the 2565 baseline, and moves alone are zero-sum. `TileEditor` is justified by cohesion (one click-to-edit shell, one flush story) and is allowed to be line-neutral; `TileWriter` is the cycle's one behavior change and closes a live hole where a prose-tile edit or a layout nudge inside the debounce is lost on window close and, at nexus switch, written into the wrong nexus.

Bounded by: no change to how a tile looks or behaves beyond the writer's flush guarantees; no `block` → `tile` identifier rename (a Prospect); no webpage tile on the dashboard; the floating identity label stays four separate things (ContextPM open call); `Links/` untouched except the `PanePresenter` fold.

**Requirements**

1. `Tiles/` holds `BlockSurface`, `MarkdownBlock`, `ViewEmbedBlock`, `BlockHandleMenu`, `useBlockDoc`, `blockZoom`, `PageEmbed`, `WebpageEmbed`, `tileWarm`, `webRetention`, `tile-chassis.css`, `ActionBand.css.ts`, their tests, and `tiles.css` + `tile-title.css`. `Blocks/` and `Embeds/` are gone. (A-1, A-2, A-3, A-4)
2. `ViewEmbedScope.tsx` and its test live in `Views/`. (A-5)
3. Root `Components/` is `Utilities/`, same three files. (E-1)
4. `PanePresenter.ts` is folded into `Links/ConnectionPane.tsx`; `hoverPaneSize.ts` stays. (C-2)
5. `PageEmbedBlock.tsx` is deleted; `BlockSurface` renders `PageEmbed` directly. (D-1)
6. `TileWriter` — a registry of `key → write fn` replacing `Interface/pageFlush.ts`, keeping the schedule-time warm-cache write-through, the registration-gated requeue, the adopt flush, and the `beforeunload` flush; `MarkdownBlock` and `useBlockDoc`'s layout debounce ride it. (D-3, D-6)
7. `TileEditor` — one click-to-edit shell over `MarkdownEditor` that `MarkdownBlock` and `PageEmbed` both render. (D-2)
8. Net code LOC of `Tiles/` + `Utilities/` + `Views/ViewEmbedScope.tsx` is below 2565. (A-6)
9. Every document the move makes false is rewritten in the commit that falsifies it; the ledger and atlas name the tree on disk. (Made False)

**Acceptance — the whole thing working:** With the app running against a nexus, a prose tile on the Homepage takes a keystroke and the window is closed within 400ms — on relaunch the keystroke is on disk. A page tile inside a Markdown document is edited, the page opens in the main pane and shows the edit. A dashboard tile is dragged and the window is closed within 300ms — on relaunch the tile is where it was dropped. `ls src/renderer/src` shows `Tiles/`, `Utilities/`, `Links/` and no `Blocks/`, `Embeds/`, `Components/`; `ls src/renderer/src/DesignSystem` shows no `Detail/`. The three gates are green, the LOC count reads below 2565, and the Dead Vocabulary sweep returns zero against its control.

**Forced By**

- Both hosts and three Windows import `PageEmbed`; `embedWidget` imports `blockZoom` and `tileWarm` → tile content is a root folder, not a host's subfolder.
- `embedWidget.tsx:106,357` reach `PageEmbed`/`WebpageEmbed` through `React.lazy` because `PageEmbed` mounts `MarkdownEditor`, which registers `embedWidget` → the cycle is open only through the lazy edge; **`Tiles/` never gets an `index.ts` barrel** — a barrel imported by `embedWidget` for `blockZoom` would pull `PageEmbed` in statically and close it.
- `DesignSystem/Components/` shares the word with root `Components/` and is reached by twenty relative and sixty-odd aliased imports → the rename rewrites the eleven explicit root sites only; no bare `Components/` substitution anywhere.
- `hoverPaneSize.test.ts` calls `vi.resetModules()` and re-imports the module per case → `hoverPaneSize` stays its own module.
- `.wpembed-title` is declared at `embeds.css:110-120` (`z-index: 2`, shared with `.pgembed-crumbs`) and again at `:162-169` (`z-index: 4`, deliberate — above the webview guest and its catcher) at equal specificity → both declarations land in the same file so source order stays authored, not import-graph-decided.
- `pageFlush.ts:16` writes through to the warm cache at *schedule* time so a remounting embed never seeds pre-edit prose → the write-through stays in the scheduler, not in the per-key write fn.
- `pageFlush.ts:36` requeues a failed ack when no newer edit owns the slot; `MarkdownBlock` has no requeue today → the requeue is gated on the key still being registered, or a removed tile's failed in-flight write resurrects the file as an entry-less orphan.
- `Store/NexusSlice.ts:60` awaits `flushAllPageSaves` *before* the root flips; `BlockSurface` unmounts after → any writer outside the registry lands in the new nexus.
- Vitest, tsconfig, biome, vite, vercel, and the Showcase entries carry no path to any moved folder; the renderer has zero `vi.mock` calls → moves need no config edits, and the type gate enumerates every missed import.
- `blocks.css` classes (`.blk-md`, `.blk-inert`) are consumed only by movers; `embeds.css` classes cross the boundary (`.pgembed` → `surfacepm.css:199,203`, `Links/connectionPane.css:31,40`; `.pgembed-grows` → `PageWindow.tsx:229`, `NavWindow.tsx:205`; `.tile-chassis(-body)` → `SurfaceView.tsx:133,185`, `embedWidget.tsx:130,243,389`, `embedResize.test.tsx:27`; `.mdpm-embed-tile` owned by `MarkdownPM/Styles.css`; `blk-zoom-*` styled by `surfacepm.css:38-56`) → class names are a contract; the merge renames files, never classes.
- The Menu Recipe session owns `Embeds/PageEmbed.tsx`, `Blocks/handleMenu.css.ts`, `Blocks/viewEmbed.css.ts`, NavTrail, and the PageWindow crumbs until it lands → Phase 1's base commit is the recipe's final commit.

**Inherited Reasoning**

- `Surface/Blocks/` (the atlas row) rejected — content with no plurality consumer misfiles under one host. `TilesPM` rejected — the suffix marks a product-named engine. Dissolving `Components/` into the design system rejected — its files read the store, the reach the atlas is closing. `Connections/` rejected for the hover pane — it serves webpages too; the whole cluster became `Links/` on 08-27.
- A shared `TileBody` wrapper rejected — `mountTile` is an imperative CodeMirror root, `SurfaceView`'s is a React tree; the shared part is one `div`.
- The baseline was first stated as 3138 and counted `Links/`'s 578 lines that had already left `Embeds/`; the true baseline is 2565 and the folds pay roughly 40-60 lines. `TileEditor` diverges in nine places and is line-neutral by design.
- `SurfacePM/README.md` and `shared/blocks.ts` carry block vocabulary; the `block` → `tile` rename is a separate sweep once the folder holds still.

**Grounding**

- `Tiles — Decision Log.md` — the spec; every decision tagged.
- `Blocks/BlockSurface.tsx` — the dashboard host; `renderTile` (~:318-358), `removing`/`suppressFlush` (:107-181), `tileClassName` (:270-285).
- `Blocks/MarkdownBlock.tsx` — the prose tile: private 400ms debounce (:7,:32-62), `blocks.readMarkdown`/`writeMarkdown`, click-to-edit shell (:64-86).
- `Embeds/PageEmbed.tsx` — the page tile: `pageFlush` at :8,:111-112,:156; the shell at :137-167; `chrome` header (:118-135); `EmbedCrumbs` (:223-232).
- `Interface/pageFlush.ts` — the path-keyed writer, whole file (53 lines). Consumers: `Interface/PageView.tsx:15,143`; `Embeds/PageEmbed.tsx`; `Store/NexusSlice.ts:19,60`.
- `Blocks/useBlockDoc.ts` — `SAVE_DEBOUNCE_MS` (:11), `flush` (:64-69), unmount flush (:71), `setLayout` (:73-83), `commitLayout` (:88-97), `saveBlocks` (:112-117).
- `Embeds/embeds.css` (193 lines) — `.pgembed-crumbs`/`.wpembed-title` at :109-124; second `.wpembed-title` at :162-169. `Blocks/blocks.css` (47 lines).
- `MarkdownPM/editor/embedWidget.tsx` — `LazyPageEmbed` (:105-107), `mountTile` (:117-139), `renderInto` (:240-262), `LazyWebpageEmbed` (:356-358), `applyTileZoom` (:463-467); imports at :32,:34,:38.
- `SurfacePM/SurfaceView.tsx:21,133,185` — the chassis import and classes.
- `Links/ConnectionPane.tsx:15-17,398-406` — the `PageEmbed` and `PanePresenter` consumers. `Links/PanePresenter.ts` (7 code lines); `MarkdownPM/Tables/TableView.tsx:8`, `MarkdownPM/editor/pointerPath.ts:3` import `closeActiveHoverCard` from it. `Guidelines/Editor-Internals.md:27` records why the seam is its own leaf — the fold must keep `closeActiveHoverCard` importable without pulling React through the editor's leaf.
- `Interface/ActionBand.css.ts` — ten exports, consumed only by `Blocks/viewEmbed.css.ts:5` and `Blocks/ViewEmbedBlock.tsx:43-52`.
- `Embeds/ViewEmbedScope.tsx` — provider at `Blocks/ViewEmbedBlock.tsx:529`; fourteen outside importers (Frames ×8, `Toolbar/ViewFrame`, `Properties/PropertyFrame`, `Views/useActiveView`, `Views/TableView/TableView`, `Views/CardView/CardsView`).
- `Components/` — `EntityIcon` (6 importers), `RenamableTitle` (3, `Sidebar/Sidebar.tsx:41` relative), `useNexusIcon` (2, both relative).
- `Store/NexusSlice.ts:54-68` — the adopt order.
- `Guidelines/Editor-Internals.md`, `Guidelines/Cohesion-Rulings.md:117`, `Guidelines/Lint-And-Accessibility.md` — the rules in force.
- The scratch inventory from the review agents lives in this plan's Made False and Forced By; the agents' raw output is not a source.

**Environment**

- Plan directory: `.claude/Planning/`. Spec: the decision log. Explorer: `Explore` agent. Research: none needed. Code reviewer: `feature-dev:code-reviewer` (a general reviewer scoped to correctness; no project-designated correctness agent exists). Attack reviewer: `build-breaking-agent`. Neutral verifier: `general-purpose`, handed the claim, the spec, the plan, and the range. Simplification: `code-simplifier` + `comment-killer-agent`. Rules directory: `.claude/Guidelines/`.
- Gate commands (from `Pommora/package.json`): `npm run typecheck` · `npm run lint` · `npx vitest run`. LOC gate: the count in Global Constraints.

**Shapes:** refactor (moves, the fold) · removal (`PageEmbedBlock`, `PanePresenter`, `Blocks/`, `Embeds/`, `Components/`, `DesignSystem/Detail/`) · fix (`TileWriter` closes a lost-write hole) · user-visible (the acceptance run) · live-data (a human decision — D-6 ratification).

**Global Constraints (every task inherits these)**

- Run from `Pommora/`. Gates, exit codes read directly, never piped: `npm run typecheck` → 0 · `npm run lint` → 0 · `npx vitest run` → 0 (295 files / 3657 tests at planning time; the count may only rise by tests this plan adds). `npm run format` repairs a shell-driven write the hook didn't format.
- LOC count, run from `Pommora/src/renderer/src`: `cat $(ls Tiles/* Utilities/* Views/ViewEmbedScope.tsx | grep -v test) | grep -v '^\s*$' | grep -v '^\s*//\|^\s*/\*\|^\s*\*' | wc -l` → below **2565** at Gate 3 and at closeout. Baseline at planning: `Blocks/` 1808 · `Embeds/` 638 · `Components/` 119.
- Moves are `git mv`; import rewrites are explicit per-path `sed` on the alias and relative forms named in the task, never a bare folder-name substitution. KNOB comments and `(Nathan's call)` markers travel verbatim.
- Stage explicit paths only (a parallel session may be live); never `git add -A` on a directory. Hook-pre-staged doc edits ride along. One commit per task, message `refactor(tiles): …` / `docs(tiles): …`.
- No `Tiles/index.ts`. Deep imports only.
- Comments: one load-bearing why per file at most; moved files keep the comments they had.
- Out of scope everywhere: `SurfacePM/**` beyond the chassis import; `Links/**` beyond Task 5; `MarkdownPM/**` beyond import rewrites; `shared/**`; `block` → `tile` identifiers; `SurfacePM/README.md` prose; anything the Menu Recipe session owns until its final commit is Phase 1's base.

**Made False**

| Doc | The specific claim | What makes it false | Task |
| --- | --- | --- | --- |
| `.claude/CLAUDE.md` map | rows `// Blocks`, `// Components`, `// Embeds`, `DesignSystem // Detail` | folders gone; `Tiles`, `Utilities` rows missing | 8 |
| `Features/SurfacePM.md` :14 :34 :36 | `src/renderer/src/Blocks/`, `Embeds/`, `DesignSystem/Detail/tile-chassis.css` | moved to `Tiles/` | 8 |
| `Features/MarkdownPM.md` :75 | `from src/renderer/src/Embeds/` | `Tiles/` | 8 |
| `Features/WebviewPM.md` :24 | `Embeds/webRetention.ts` | `Tiles/webRetention.ts` | 8 |
| `Features/DesignSystemPM.md` :27 :375-381 | the `Detail` tier and its one table row | tier empty; chassis is `Tiles/tile-chassis.css` | 8 |
| `Features/ArchitecturePM.md` :124 :192 | "one path-keyed flush registry … per page path" · "Pending page saves" | `TileWriter` is key-keyed and carries tile bodies and layouts | 11 |
| `Guidelines/Cohesion-Rulings.md` :117 | `Blocks/ViewEmbedBlock.tsx:437` | `Tiles/ViewEmbedBlock.tsx` | 8 |
| `ContextPM.md` :17 :19 | the `Tiles/` row; `Blocks/ViewEmbedBlock.tsx:88` | row lands; path moves | 8, 15 |
| `RendererRefactor.md` :14 :33 :35 :40 :58 | `DesignSystem/Detail` line; `→ Components/ as NexusIconPicker`; the `Tiles/` row; "wrappers in `Components/`"; `Blocks/ViewEmbedBlock.tsx:88` | satisfied; `Utilities/`; row leaves; `Utilities/`; fixed in Task 4 | 8, 15 |
| `RendererAtlas.md` :37 :39 :64-73 :88 :105-110 :127 :139 :193 | `Embeds/ViewEmbedScope`; lateral edges by folder; root `Components/` rows; `// Embeds` row; MOVED rows; "keeps `Components/`"; "Four folder names mislead"; `Blocks/ViewEmbedBlock.tsx:88` | tree on disk; `Utilities/`; rows become present tense | 8, 15 |
| `Planning/MenuRecipe.md` :298 :355 | `Blocks/handleMenu.css.ts`, `Blocks/viewEmbed.css.ts`, `Blocks/BlockHandleMenu.tsx` | `Tiles/` — rewritten only if the recipe is still open at Task 8; else a landed plan is history | 8 |
| `Planning/Inline Page Properties — Decision Log.md` :32 | "`PageEmbed` and `MarkdownBlock` pass neither" | both still exist as components; `TileEditor` is beneath them — verify-only | 13 |
| `HandoffPM.md` :33 | "rides whichever session touches `Blocks/` first" | Task 4 takes it | 4 |

**Dead Vocabulary**

- `@renderer/Blocks/` → 0. `@renderer/Embeds/` → 0. `@renderer/Components/` → 0 (`@renderer/DesignSystem/Components/` is a different token and survives). `'../Blocks/` `'../Embeds/` `'../Components/` → 0 outside `DesignSystem/**`. `DesignSystem/Detail` → 0. `PageEmbedBlock` → 0. `pageFlush` → 0. `PanePresenter` → 0. `schedulePageSave` / `flushPageSave` / `flushAllPageSaves` → 0.
- Legitimate hits: `.claude/HistoryPM.md`, `.claude/Sessions/**`, `.claude/HandoffPM.md` file ledger — historical record.
- Control: `rg -F "tile-chassis" src` → 9 at planning (`SurfaceView` ×1, `embedWidget` ×3, `blocks.css` ×3, `embeds.css` ×1, `surfacepm.css` comment ×1) → after Task 6 the number changes but stays nonzero; the sweep records it. Zero means the sweep never ran.

**Hazard Window:** Task 9 opens it — from the moment `pageFlush.ts` is deleted until Task 12 registers the layout writer, the running app has two writers with different guarantees. Nothing else lands on `main` inside the window; the running-thing pass for Phase 2 is at Gate 2 after Task 12 closes it.

---

### Phase 1 — The tree on disk (behavior-zero)

Base: the Menu Recipe's final commit. Baseline invariant carried through every task: `npx vitest run` test count 3657 (+ tests this plan adds), and the running app looks identical.

#### Task 1: `Tiles/` from `Blocks/` and the tile half of `Embeds/`

**Requirement:** 1

**Why:** The folder is the deliverable; everything else in this plan lands inside it. Moving first, with no fold, keeps the diff a pure rename the type gate can verify — a fold entangled with a move hides a broken import behind a changed line. Taking `ActionBand.css.ts` and `tile-chassis.css` in the same task means `Tiles/` is complete on the first commit rather than assembled over three.

**Files:**
- `git mv`: every file in `Blocks/` → `Tiles/`; `Embeds/PageEmbed.tsx`, `Embeds/WebpageEmbed.tsx`, `Embeds/tileWarm.ts`, `Embeds/tileWarm.test.ts`, `Embeds/webRetention.ts`, `Embeds/webRetention.test.ts`, `Embeds/embeds.css` → `Tiles/`; `DesignSystem/Detail/tile-chassis.css` → `Tiles/tile-chassis.css`; `Interface/ActionBand.css.ts` → `Tiles/ActionBand.css.ts`.
- Modify (imports only): `Interface/HomepageView.tsx`, `Interface/SpaceView.tsx` (`@renderer/Blocks/BlockSurface`); `MarkdownPM/editor/embedWidget.tsx` (:32 chassis, :34 `blockZoom`, :38 `tileWarm`, :106 and :357 the two dynamic imports); `MarkdownPM/editor/gripMenu.ts:15`; `MarkdownPM/index.tsx:31` (`../Embeds/tileWarm`); `Windows/PageWindow.tsx:7`, `Windows/NavWindow.tsx:10`, `Links/ConnectionPane.tsx:15` (`../Embeds/PageEmbed`); `SurfacePM/SurfaceView.tsx:21` (chassis); `Tiles/viewEmbed.css.ts:5` (`../Interface/ActionBand.css` → `./ActionBand.css`); `Tiles/ViewEmbedBlock.tsx:52` (`@renderer/Interface/ActionBand.css` → `./ActionBand.css`); `Tiles/PageEmbedBlock.tsx:1` (`@renderer/Embeds/PageEmbed` → `./PageEmbed`); `MarkdownPM/useConnectionAutocomplete.ts:161` comment (`Embeds/tileWarm.ts` → `Tiles/tileWarm.ts`).
- Delete: the empty `Blocks/`, `DesignSystem/Detail/` directories. `Embeds/` keeps `ViewEmbedScope.tsx` + test until Task 2.

**Derivation**
- `rg -F "@renderer/Blocks/" src` → 4 at planning. `rg -F "Blocks/" src --glob '!**/Blocks/**'` → 4 (the same). `rg -F "Embeds/PageEmbed" src` → 5 (one dies with `PageEmbedBlock` in Task 4). `rg -F "Embeds/tileWarm" src` → 3 (one a comment). `rg -F "DesignSystem/Detail" src` → 2. `rg -F "ActionBand.css" src` → 2 imports + 3 comment mentions (comments stay). Legitimate hits after: none in `src`.
- Control: `rg -F "@renderer/SurfacePM/" src` → 3. Zero means the search never ran.

**Steps:**
- [ ] `git mv` the files above; confirm `Blocks/` and `DesignSystem/Detail/` are empty and remove them.
- [ ] Rewrite the listed imports by explicit path; re-run each Derivation search — expect 0 in `src`.
- [ ] `npm run typecheck` → 0. If it lists an import the Derivation missed, add it to this task's Files before fixing it.
- [ ] `npm run lint` → 0; `npx vitest run` → 0, 3657 tests.
- [ ] Commit: `refactor(tiles): Tiles/ holds the tile world — Blocks, the embed tiles, the chassis, the action band`

#### Task 2: `ViewEmbedScope` to `Views/`

**Requirement:** 2

**Why:** Its one provider is a tile, but its fourteen consumers are the view pipeline, and it is the scope a future View Window would provide too — the atlas's R2 rule files it with its consumers. With it gone, `Embeds/` is empty and deleted, which is the Success Criterion's first line.

**Files:**
- `git mv`: `Embeds/ViewEmbedScope.tsx`, `Embeds/ViewEmbedScope.test.tsx` → `Views/`.
- Modify (imports only): `Tiles/ViewEmbedBlock.tsx:34`, `Toolbar/ViewFrame.tsx:19`, `Frames/LayoutFrame.tsx:31`, `Frames/FilterFrame.tsx:43` (relative `../Embeds/` → `../Views/`), `Frames/SettingsFrame.tsx:35`, `Frames/SortFrame.tsx:6`, `Frames/GroupFrame.tsx:33`, `Frames/LayoutToggles.tsx:8`, `Frames/HiddenFrame.tsx:12`, `Frames/CardsOptions.tsx:8`, `Properties/PropertyFrame.tsx:21`, `Views/useActiveView.ts:5`, `Views/TableView/TableView.tsx:35`, `Views/CardView/CardsView.tsx:45` — `@renderer/Embeds/ViewEmbedScope` → `@renderer/Views/ViewEmbedScope`. `Views/ViewEmbedScope.tsx:9` (`@renderer/Views/viewMint` → `./viewMint`).
- Delete: the empty `Embeds/` directory.

**Derivation**
- `rg -F "Embeds/ViewEmbedScope" src` → 14 at planning; `rg -F "Embeds/" src` → 0 after (control for the whole folder).
- Control: `rg -F "Views/viewMint" src` → nonzero.

**Steps:**
- [ ] `git mv`; rewrite the fourteen imports and the internal one; `ls src/renderer/src/Embeds` → no such directory.
- [ ] Gates → 0, 3657 tests.
- [ ] Commit: `refactor(views): ViewEmbedScope is view infrastructure`

#### Task 3: `Components/` → `Utilities/`

**Requirement:** 3

**Why:** The folder holds three app-bound helpers the design system's `Components/` shadows by name; `Utilities/` is Nathan's ruling for the strays, and the rename is the whole step this cycle. Eleven explicit sites, because a bare substitution would rewrite the design system.

**Files:**
- `git mv`: `Components/` → `Utilities/` (EntityIcon.tsx, RenamableTitle.tsx, useNexusIcon.ts, renamableTitle.test.tsx).
- Modify (imports only): `Frames/FilterFrame.tsx:9`, `Frames/GroupFrame.tsx:46`, `MarkdownPM/AutocompletePane.tsx:2`, `Properties/Editing/Cell.tsx:5`, `Views/TableView/TableView.tsx:49`, `Views/GroupBand.tsx:1,13`, `Views/CardView/CardsView.tsx:105` — `@renderer/Components/` → `@renderer/Utilities/`; `Sidebar/Sidebar.tsx:41`, `Sidebar/NexusPhoto.tsx:6`, `Frames/SettingsScaffold.tsx:12` — `'../Components/` → `'../Utilities/`.

**Derivation**
- `rg -F "@renderer/Components/" src` → 8 at planning → 0 after. `rg -F "'../Components/" src --glob '!src/renderer/src/DesignSystem/**'` → 3 → 0 after.
- Control: `rg -F "@renderer/DesignSystem/Components/" src` → 60+ before and after, unchanged. A changed count here means the rename touched the design system — revert.

**Steps:**
- [ ] `git mv`; rewrite the eleven sites; run both Derivations and the control.
- [ ] Gates → 0, 3657 tests.
- [ ] Commit: `refactor(renderer): Components/ is Utilities/`

#### Task 4: `PageEmbedBlock` deleted; the `cellRing` identifier

**Requirement:** 5

**Why:** `PageEmbedBlock` is a 29-line pass-through that renames one prop; `BlockSurface` renders `PageEmbed` directly and the file goes. The ledger's one behavioral fix, `ViewEmbedBlock.tsx:88` `tintAt(cellColor(key), 'primary')` → `cellRing(key)`, rides the first session to touch this folder by the ledger's own rule, so it lands here as a one-identifier commit of its own.

**Files:**
- Delete: `Tiles/PageEmbedBlock.tsx`.
- Modify: `Tiles/BlockSurface.tsx` — the `'page'` branch of `renderTile` renders `<PageEmbed path={page.path} editing={editingId === id} onBeginEdit={() => setEditingId(entry.id)} connections={connections} locked={entry.locked ?? false} />`; drop the `PageEmbedBlock` import, add `import { PageEmbed } from './PageEmbed'`.
- Modify: `Tiles/ViewEmbedBlock.tsx` at the `tintAt(cellColor(key), 'primary')` site → `cellRing(key)` (imported from the ramp module `cellRing` already lives in — `rg -F "export function cellRing" src` names it).

**Survivors:** `entry.id` vs the `id` argument — `PageEmbedBlock` passed `entryId={entry.id}` and called `onBeginEdit(entryId)`; the inline call keeps `entry.id`, not the closure's `id`, so a mismatch that never existed doesn't get introduced.

**Failure half:** a `'page'` entry whose `page_id` is not in `pagesById` still renders `<div className="blk-inert" />` — the dead-reference branch precedes the `PageEmbed` render and is untouched.

**Steps:**
- [ ] Inline the render; delete the file; `rg -F "PageEmbedBlock" src` → 0.
- [ ] Gates → 0. Commit: `refactor(tiles): BlockSurface renders PageEmbed directly`
- [ ] `cellRing(key)`; gates → 0; run the app on a dashboard holding a view tile assigned a grey cell — the outline draws in the grey step. Commit: `fix(tiles): a grey-celled view tile draws its ramp outline`

#### Task 5: `PanePresenter` into `ConnectionPane`

**Requirement:** 4

**Why:** Seven code lines whose only reason to be a file was a load-order cycle: `ConnectionPane` reaches into MarkdownPM, and MarkdownPM's `pointerPath.ts` and `Tables/TableView.tsx` need `closeActiveHoverCard` (`Editor-Internals.md:27`). The fold keeps that property or it doesn't happen.

**Files:**
- Modify: `Links/ConnectionPane.tsx` — absorb `setHoverCardPresenter`, `presentHoverCard`, `closeActiveHoverCard`; `Links/PanePresenter.ts` deleted.
- Modify: `MarkdownPM/Tables/TableView.tsx:8`, `MarkdownPM/editor/pointerPath.ts:3` — import `closeActiveHoverCard` from `@renderer/Links/ConnectionPane`.
- `Guidelines/Editor-Internals.md:27` — the rule's example names `PanePresenter`; rewritten to name the real constraint.

**Negative control:** Before folding, run `npx vitest run src/renderer/src/MarkdownPM` and note the table tests pass. After folding, the same run must pass — and `node -e` cannot prove a runtime cycle, so the second half is the running app: open a page holding a table, right after launch, with no page opened before it. If `TableView` throws at first mount, the cycle is live and the fold is reverted; `PanePresenter.ts` stays and this task records the rejection in the Log.

**Steps:**
- [ ] Fold; delete; rewrite the two imports; `rg -F "PanePresenter" src` → 0.
- [ ] Gates → 0. Run the app cold and mount a table first — no throw.
- [ ] Commit: `refactor(links): the pane presents itself`

#### Task 6: One `tiles.css`, and `tile-title.css`

**Requirement:** 1

**Why:** `blocks.css` and `embeds.css` already share `:is(.blk-md, .pgembed)` selectors and describe one scroll model in two files. The identity label's rules get their own file so the ContextPM open call has one place to pull from. Class names are a cross-folder contract and do not change.

**Files:**
- Create: `Tiles/tiles.css` — `blocks.css` whole, then `embeds.css` minus the identity block; both `.wpembed-title` declarations (`:110-120` shared geometry and `:162-169` the override) stay in this file in their current order.
- Create: `Tiles/tile-title.css` — `.pgembed-crumbs` positioning (the shared block at `:109-124` with `.wpembed-title` removed from its selector list) — **unless** removing `.wpembed-title` from the shared block leaves the webpage title without `position: absolute` / `top` / `left` / `transform` / `max-width` / `opacity` / `transition`: in that case the shared block stays whole in `tiles.css` and `tile-title.css` holds only the `.pgembed-crumbs`-specific rules. The executor reads both blocks and picks; the Log records which.
- Delete: `Tiles/blocks.css`, `Tiles/embeds.css`.
- Modify: `Tiles/BlockSurface.tsx:41`, `Tiles/PageEmbed.tsx:19`, `Tiles/WebpageEmbed.tsx:19` → `import './tiles.css'`; `Tiles/PageEmbed.tsx` also `import './tile-title.css'`.

**Derivation**
- `rg -F ".wpembed-title" src/renderer/src/Tiles/tiles.css` → 4 selector lines after (the two declarations and their two `:hover` rules), same file, same order.
- Control: `rg -F ".pgembed-grows" src` → 3 (the definition plus `PageWindow`, `NavWindow`), unchanged.

**Steps:**
- [ ] Concatenate; extract; delete; rewrite the three imports.
- [ ] Gates → 0. In the running app: hover a page tile inside a Markdown document — crumbs appear; hover a webpage tile — its title appears above the guest and is clickable.
- [ ] Commit: `refactor(tiles): one stylesheet for the tile family; the identity label in its own`

#### Task 7: LOC and vocabulary checkpoint

**Requirement:** 8

**Why:** Phase 1 is moves and two small deletions; the count should read 2565 − ~30 (PageEmbedBlock, PanePresenter's absorbed lines, the CSS header dedupe). A number far from that means a move dropped or duplicated something.

**Steps:**
- [ ] Run the LOC count from Global Constraints — record the number in the Log. Expect 2525-2545.
- [ ] Run every Dead Vocabulary token against `src` — `pageFlush`, `schedulePageSave`, `flushPageSave`, `flushAllPageSaves` are still live (Phase 2) and expected nonzero; every other token → 0. Control nonzero.
- [ ] No commit; the numbers go in the Log at Gate 1.

#### Task 8: The documents the move made false

**Requirement:** 9

**Why:** Every path citation in Made False rows 1-5, 7-11 goes false at Task 1-3; the rows land in one docs commit closing the phase so the tree and its description never diverge across a session boundary.

**Files:** per the Made False table — `CLAUDE.md` (drop the four rows, add `// Tiles | • The tile world — chassis, the four content kinds, their plumbing, the dashboard host` and `// Utilities | • App-bound helpers — the entity icon, the renamable title, the nexus icon`), `SurfacePM.md`, `MarkdownPM.md`, `WebviewPM.md`, `DesignSystemPM.md` (the `Detail` tier removed from the tree at :27 and the section at :375-381; the chassis row moves under wherever DesignSystemPM lists app-owned surfaces by reference, or is dropped with a one-line note that the chassis lives in `Tiles/`), `Cohesion-Rulings.md:117`, `ContextPM.md:17,19`, `RendererRefactor.md` (:14 line satisfied → removed; :33 `Components/` → `Utilities/`; :35 row leaves; :40 `Utilities/`; :58 path), `RendererAtlas.md` (tree rows to present tense, root `Components` → `Utilities`, `// Embeds` row gone, :37 :39 :139 :193 restated as current), `MenuRecipe.md` if still open, `HandoffPM.md:33`.

**Steps:**
- [ ] Rewrite each; `rg -F "Blocks/" .claude --glob '!**/HistoryPM.md' --glob '!**/Sessions/**' --glob '!**/Tiles*'` → 0; same for `Embeds/` (allowing the decision log's history), `DesignSystem/Detail`, `@renderer/Components`.
- [ ] Commit: `docs(tiles): the tree on disk`

#### Gate 1 — the tree on disk, behavior unmoved
- [ ] Gate commands green, exit codes read directly; test count 3657.
- [ ] Derivations re-run against their controls; counts matched, or the divergence rewrote the plan.
- [ ] Simplification (`code-simplifier` then `comment-killer-agent`) and `feature-dev:code-reviewer` dispatched against `<base>..HEAD` scoped to `Tiles/`, `Views/ViewEmbedScope*`, `Utilities/`, `Links/ConnectionPane.tsx`; reports cite files inside it.
- [ ] Every concern fixed, or carrying an explicit user ruling in the Log.
- [ ] The running app: a dashboard with a prose, page, and view tile; a Markdown document with a page and a webpage tile; the hover pane over a link — all identical to before the base commit.
- [ ] LOC recorded; Progress hashes filled in.

---

### Phase 2 — TileWriter (the one behavior change)

#### Task 9: `Tiles/TileWriter.ts` replaces `Interface/pageFlush.ts`

**Requirement:** 6

**Why:** `pageFlush` is already the right mechanism — one debounced writer per key, flushed on demand, at nexus-adopt, and at `beforeunload` — with the wrong key type. Generalizing it to `key → write fn` lets a prose tile and a layout doc register with the same guarantees pages have, and deletes two private debounces. The three invariants in Forced By are kept by construction, not by later review.

**Files:**
- Create: `Tiles/TileWriter.ts` — from `pageFlush.ts` by `git mv` then edit, so history follows.
- Modify: `Interface/PageView.tsx:15,143`; `Tiles/PageEmbed.tsx:8,111-112,156`; `Store/NexusSlice.ts:19,60`.
- Test: `Tiles/tileWriter.test.ts` (new).

**Interfaces**
- Produces:
  - `registerWriter(key: string, write: (body: string) => Promise<Result<unknown>>, onSchedule?: (body: string) => void): () => void` — returns the unregister. `onSchedule` is the schedule-time hook; the page seam passes `writeThroughBody`.
  - `scheduleWrite(key: string, body: string): void` — runs `onSchedule` now, arms the 400ms timer.
  - `flushWrite(key: string): Promise<void>` — as `flushPageSave`: clears, deletes, awaits `write`; on `!ok`, requeues only if `!pending.has(key) && writers.has(key)`.
  - `flushAllWrites(): Promise<void>` — as `flushAllPageSaves`.
  - `pageWriter(path: string)` — a helper in the same file that registers `(body) => window.nexus.updatePageBody(path, body)` with `writeThroughBody` as `onSchedule`, so `PageView` and `PageEmbed` each register in a `useEffect` keyed on `path` and unregister on cleanup **after** flushing. `SAVE_DEBOUNCE_MS = 400` stays.
- Assumed by: Task 10 (`MarkdownBlock` registers `(body) => window.nexus.blocks.writeMarkdown(host, tileId, body)`), Task 12 (`useBlockDoc` registers the layout write), Task 13 (`TileEditor` takes `onChange` only, the registration stays in the seam components).

**Failure half:** `scheduleWrite` on an unregistered key → no-op (a component that unmounted mid-debounce). `flushWrite` on a key with nothing pending → resolves. A write rejecting (the envelope channel never rejects, but the fn is caller-supplied) → treated as `!ok`. Unregister with a pending timer → the pending write is flushed first by the caller's cleanup order (flush, then unregister); the registry itself never drops a pending body silently — unregister of a key with a pending entry flushes it, unless `drop` was requested (Task 10's removal path).

**Must agree:** a page open in the main pane (`PageView`) and in a tile (`PageEmbed`) share one key — the path — and one pending write; the test types through both seams and asserts one IPC call carrying the newest body, exactly as `pageFlush` guarantees today.

**Negative control:** the requeue test — a write returning `{ok:false}` on a still-registered key re-schedules (asserted by a second call after 400ms); the same write on a key unregistered between schedule and ack does **not** re-schedule. Disable the `writers.has(key)` clause and the second assertion goes red.

**Steps:**
- [ ] Write `tileWriter.test.ts`: schedule + flush lands one write; two schedules coalesce; flushAll awaits every key; requeue both halves; `beforeunload` flushes (dispatch the event on `window`); unregister-with-pending flushes.
- [ ] Run → failures, module not found.
- [ ] `git mv Interface/pageFlush.ts Tiles/TileWriter.ts`; implement; re-run → pass.
- [ ] Repoint the three consumers; `rg -F "pageFlush" src` → 0; `rg -F "schedulePageSave" src` → 0.
- [ ] Gates → 0. Commit: `refactor(tiles): TileWriter — one debounced writer per key, any key`

#### Task 10: `MarkdownBlock` rides TileWriter

**Requirement:** 6

**Why:** The prose tile's private debounce is the lost-write hole; registering its `writeMarkdown` with TileWriter closes it and deletes ~20 lines. `suppressFlush` becomes: on removal, `BlockSurface` unregisters the tile's key with `drop: true` before `blocks.removeTile`, so neither a pending nor a failed-ack write can land after the trash.

**Files:**
- Modify: `Tiles/MarkdownBlock.tsx` — drop `pending`, `flush`, `flushRef`, `scheduleSave`, `SAVE_DEBOUNCE_MS`, `suppressFlush`; register in a `useEffect` keyed on `[host, tileId]`, key = `` `${blockHostKey(host)}:${tileId}` ``; `onChange={(next) => scheduleWrite(key, next)}`; the edit-exit effect calls `flushWrite(key)`.
- Modify: `Tiles/BlockSurface.tsx` — `removing` set and `suppressFlush` callback deleted; `removeBlock` (~:169-181) calls `unregisterWriter(key, { drop: true })` before `blocks.removeTile`. `renderTile` no longer passes `suppressFlush`.
- Modify: `Tiles/TileWriter.ts` — `registerWriter`'s returned unregister takes `{ drop?: boolean }`; `drop` clears the pending entry without writing.
- Test: extend `tileWriter.test.ts` with the drop case; `Tiles/markdownBlock.test.tsx` if one is needed to prove the edit-exit flush — check `rg -F "MarkdownBlock" src --glob '*.test.*'` first; none exists at planning.

**Negative control:** the drop case — schedule, unregister with `drop`, advance 400ms, assert zero writes; with `drop` ignored the assertion goes red. And the orphan case from the spec: schedule, flush (in flight), unregister with `drop`, resolve the ack `{ok:false}` — zero further writes.

**Steps:**
- [ ] Tests first; red; implement; green.
- [ ] Gates → 0. The running app: type in a prose tile, ⌘Q within 400ms, relaunch — the text is there. Type, then Remove the tile from its handle menu — no file returns.
- [ ] Commit: `refactor(tiles): the prose tile writes through TileWriter`

#### Task 11: ArchitecturePM's autosave paragraph

**Requirement:** 9

**Why:** `ArchitecturePM.md:124` states the registry is path-keyed and per page; Task 9 made that false in code, and the doc lands in the same phase.

**Files:** `Features/ArchitecturePM.md` :124 and the table row at :192 — restated: one debounced writer per key shared by every editor host; pages key by path, tiles by host and id, layouts by host; every key flushes on demand, at nexus-adopt, and at window close.

**Steps:**
- [ ] Rewrite; commit: `docs(architecture): autosave is one writer per key`

#### Task 12: The layout document rides TileWriter — **needs Nathan's ratification (D-6)**

**Requirement:** 6

**Why:** `useBlockDoc`'s 300ms layout debounce flushes on unmount only; at nexus-adopt `BlockSurface` unmounts after the root flips, so the flush writes into the new nexus, and at window close it is lost. It is the same hole Task 10 closes, and closing one without the other leaves prose surviving a switch while positions don't. `commitLayout` and `saveBlocks` stay immediate — they are structural writes that must precede their entry op.

**Files:**
- Modify: `Tiles/useBlockDoc.ts` — `pending`, `flush`, `SAVE_DEBOUNCE_MS`, and the unmount effect go; `registerWriter(blockHostKey(host), (encoded) => window.nexus.blocks.save(host, { layout: JSON.parse(encoded) }))` — or, cleaner, TileWriter's body type widens to `unknown` so the layout registers `(layout) => blocks.save(host, { layout: encodeLayout(layout) })` without a string round-trip; the executor picks the widening if `pageWriter` stays typed through a generic, and records the choice. `setLayout` calls `scheduleWrite`; `commitLayout` sets the live layout and calls `flushWrite` immediately after scheduling.
- Test: `Tiles/useBlockDoc.test.ts` if absent — `rg -F "useBlockDoc" src --glob '*.test.*'` → check; the debounce-then-flush and the adopt-order cases.

**Must agree:** the 300ms debounce becomes 400ms — TileWriter has one constant. Nathan ratifies that with D-6 or the registry takes a per-key delay; the plan assumes one constant.

**Steps:**
- [ ] Ratification recorded in Rulings before any edit.
- [ ] Tests; implement; gates → 0. The running app: drag a tile, ⌘Q within 400ms, relaunch — it stayed. Drag a tile, switch nexus immediately — the old nexus holds the new position, the new nexus is untouched.
- [ ] Commit: `refactor(tiles): the layout document writes through TileWriter`

#### Gate 2 — one writer, every tile-shaped save
- [ ] Gates green; test count = 3657 + the tests Tasks 9-12 added.
- [ ] `rg -F "SAVE_DEBOUNCE_MS" src` → 1 (TileWriter). `rg -F "setTimeout" src/renderer/src/Tiles` → only TileWriter's — a second debounce in `Tiles/` is a regression.
- [ ] Simplification and code review against `<base>..HEAD` scoped to `Tiles/TileWriter.ts`, `MarkdownBlock.tsx`, `BlockSurface.tsx`, `useBlockDoc.ts`, `PageEmbed.tsx`, `Interface/PageView.tsx`, `Store/NexusSlice.ts`.
- [ ] The hazard window is closed by Task 12; the running-thing pass is the four acceptance runs in Tasks 10 and 12, performed at this gate.
- [ ] Every concern fixed or ruled; Progress hashes filled in.

---

### Phase 3 — TileEditor

#### Task 13: `Tiles/TileEditor.tsx`

**Requirement:** 7

**Why:** `MarkdownBlock.tsx:64-86` and `PageEmbed.tsx:137-167` are one click-to-edit shell written twice: the same `onClick` guard (`editing || locked` → return; a non-collapsed selection → return; else begin edit), the same `MarkdownEditor` with `nativeEditorMenu`, `readOnly={!editing}`, `autoFocus`, `edgeFade`. The nine divergences become props; the two seam components keep their data logic and render the shell. Line-neutral by design; justified by one shell and one flush story.

**Files:**
- Create: `Tiles/TileEditor.tsx`.
- Modify: `Tiles/MarkdownBlock.tsx` — the shell lines replaced by `<TileEditor className="blk-md" editing={editing} locked={locked} onBeginEdit={() => onBeginEdit(tileId)} body={body} onChange={(next) => scheduleWrite(key, next)} connections={connections} />`.
- Modify: `Tiles/PageEmbed.tsx` — the shell lines replaced by `<TileEditor className={cx('pgembed', editing && 'is-editing', chrome === 'page' && entry?.cover && 'has-banner')} style={{ '--mdpm-scale': …, '--editor-scale': 1 }} clickGuard=".mdpm-banner" header={header} editing locked onBeginEdit body onChange={(next) => { onBodyRef.current?.(next); scheduleWrite(path, next) }} connections zoom={embedZoom(embedScale)} warm={warm} pageId={entry?.id} embedAncestors={[...]} />`.

**Interfaces**
- Produces: `TileEditor(props: { className: string; style?: CSSProperties; header?: ReactNode; clickGuard?: string; editing: boolean; locked: boolean; onBeginEdit: () => void; body: string; onChange: (next: string) => void; connections?: ConnectionsApi; zoom?: number; warm?: WarmSeam; pageId?: string; embedAncestors?: readonly string[] })` — renders the outer `div` with the click guard and the `MarkdownEditor`. Everything not listed keeps the value the two shells share today (`menu={nativeEditorMenu}`, `readOnly={!editing}`, `autoFocus`, `edgeFade`).
- Assumed by: nothing later.

**Survivors:** the two biome-ignore lines on the `div` travel to `TileEditor` once and leave both seams. The `pgembed-failed` and `body === null` early returns stay in `PageEmbed` above the shell; `MarkdownBlock`'s `body === null` blank stays likewise.

**Steps:**
- [ ] Create; replace both shells; `rg -F "nativeEditorMenu" src/renderer/src/Tiles` → 1.
- [ ] Gates → 0, test count unchanged. The running app: click-to-edit on a prose tile, a page tile on the dashboard, a page tile in a document, the Page Window, the NavWindow; a text selection ending in a click does not enter edit; a click on an embedded page's banner does not enter edit.
- [ ] Commit: `refactor(tiles): one TileEditor shell under the prose tile and the page tile`

#### Task 14: LOC gate and the vocabulary sweep

**Requirement:** 8

**Steps:**
- [ ] LOC count → below 2565; record. Every Dead Vocabulary token → 0 in `src` and `.claude` (allowlist applies); control nonzero.
- [ ] No commit.

#### Gate 3 — the folds
- [ ] Gates green; LOC below 2565 recorded in the Log with the exact number.
- [ ] Simplification and code review against `<base>..HEAD` scoped to `Tiles/`.
- [ ] Every concern fixed or ruled; the running-thing pass from Task 13 done at the gate; Progress hashes.

---

### Phase 4 — Closeout

#### Task 15: The record

**Requirement:** 9

**Files:** `HistoryPM.md` (one entry, `PM-118 || Tiles`, with the commit range and the LOC diff from closeout); `ContextPM.md` (the `Tiles/` row closes; the `cellRing` row closes; Current Focus's tree paragraph names `Tiles/`, `Utilities/`, `Links/`); `RendererRefactor.md` (the `Tiles/` row and the `cellRing` row leave; `block` → `tile` identifiers gains its own row); `RendererAtlas.md` (Settled: `Tiles/` executed with the date; the tree rows present tense); `Guidelines/` (any lesson from the Log); `Tiles — Decision Log.md` Lessons filled.

**Steps:**
- [ ] `/closeout` discipline over the whole range: Delivery Claim written → neutral verifier (claim, spec, plan, range) → attack pass → interface pass against the running app (the Acceptance paragraph, performed literally).
- [ ] Closing sweep: every Dead Vocabulary token against its control, results in the Log.
- [ ] Docs; commit: `docs(tiles): the record`

---

## Implementation Log

### Progress
- [ ] **Phase 1** — the tree on disk · base `<the Menu Recipe's final commit>`
  - [ ] Task 1 — Tiles/ from Blocks and the embed tiles · `<commit>`
  - [ ] Task 2 — ViewEmbedScope to Views · `<commit>`
  - [ ] Task 3 — Components to Utilities · `<commit>`
  - [ ] Task 4 — PageEmbedBlock deleted; cellRing · `<commit>` `<commit>`
  - [ ] Task 5 — PanePresenter into ConnectionPane · `<commit>`
  - [ ] Task 6 — tiles.css and tile-title.css · `<commit>`
  - [ ] Task 7 — LOC checkpoint · reading: `<n>`
  - [ ] Task 8 — the documents · `<commit>`
- [ ] **Phase 2** — TileWriter · base `<commit>`
  - [ ] Task 9 — TileWriter · `<commit>`
  - [ ] Task 10 — the prose tile · `<commit>`
  - [ ] Task 11 — ArchitecturePM · `<commit>`
  - [ ] Task 12 — the layout document · `<commit>` · ratified: `<date>`
- [ ] **Phase 3** — TileEditor · base `<commit>`
  - [ ] Task 13 — TileEditor · `<commit>`
  - [ ] Task 14 — LOC gate · reading: `<n>`
- [ ] **Phase 4** — closeout · base `<commit>`
  - [ ] Task 15 — the record · `<commit>`

### Rulings
- D-6 (Task 12, the layout writer and the 300 → 400ms debounce): awaiting Nathan.

### Open Against Later Tasks
### Deviations
### Lessons
### Sequenced After
- `block` → `tile` in identifiers across `Tiles/`, `shared/blocks.ts`, `SurfacePM/README.md` — the atlas row, once the folder holds still.
- The floating identity label as one element — ContextPM open call; `tile-title.css` is its seed.
- `hoverPaneSize.ts` folding into `ConnectionPane` — only after its test stops resetting modules.
### Closeout
