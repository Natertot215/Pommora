## Tiles — Implementation Plan

> **Status:** reviewed — two attack rounds, findings folded; pending Nathan's approval · Spec: [[Tiles — Decision Log]] · Execute tasks in order.
> Citations name files and symbols; re-derive before editing. The Menu Recipe landed at `935bf031`; anchors re-derived against it.

**Goal**

One folder, `src/renderer/src/Tiles/`, holds everything a tile is — the chassis, the four content kinds, their plumbing, and the dashboard host — and both hosts consume it: MarkdownPM's `editor/embedWidget.tsx` and SurfacePM through `Tiles/BlockSurface.tsx`. `Blocks/`, `Embeds/`, root `Components/`, and `DesignSystem/Detail/` no longer exist. One editor shell, `TileWriter`, renders a prose tile and an embedded page; one writer, `TileSave`, debounces and flushes every tile-shaped save — page bodies, prose-tile bodies, dashboard layouts — with the same nexus-adopt and window-close guarantees pages have today.

The shape follows the consumers: tile content is imported by both hosts and by three Windows with no plurality, which is the atlas's own test for a shared root folder, so `Surface/Blocks/` (a subfolder of one host) was rejected and `SurfacePM/` keeps its name as the engine. The folds are the point, not a side effect — Nathan's mandate is a net code-line reduction against the 2546 baseline, and moves alone are zero-sum. `TileWriter` is justified by cohesion (one click-to-edit shell, one flush story) and is allowed to be line-neutral; `TileSave` is the cycle's one behavior change and closes a live hole where a prose-tile edit or a layout nudge inside the debounce is lost on window close and, at nexus switch, written into the wrong nexus.

Bounded by: no change to how a tile looks or behaves beyond the writer's flush guarantees; no `block` → `tile` identifier rename (a Prospect); no webpage tile on the dashboard; the floating identity label stays four separate things (ContextPM open call); `Links/` untouched.

**Requirements**

1. `Tiles/` holds `BlockSurface`, `MarkdownBlock`, `ViewEmbedBlock`, `BlockHandleMenu`, `useBlockDoc`, `blockZoom`, `PageEmbed`, `WebEmbed`, `tileWarm`, `webRetention`, `tile-chassis.css`, `ActionBand.css.ts`, their tests, and `tile-base.css` + `tile-title.css`. `Blocks/` and `Embeds/` are gone. (A-1, A-2, A-3, A-4)
2. `ViewEmbedScope.tsx` and its test live in `Views/`. (A-5)
3. Root `Components/` is `Utilities/`, same three files. (E-1)
4. `Links/PanePresenter.ts` stays the leaf it is — the load-order cycle it holds open (`Guidelines/Editor-Internals.md:27`) is real, and `Links/` sits outside the LOC measurement. (C-2)
5. `PageEmbedBlock.tsx` is deleted; `BlockSurface` renders `PageEmbed` directly. (D-1)
6. `TileSave` — `Interface/pageFlush.ts` generalized so the write function rides the schedule call (`scheduleWrite(key, body, write)`), with no registry and no mount-bound ownership; keeps the schedule-time warm-cache write-through for pages, the requeue gated on a drop marker, the adopt flush, and the `beforeunload` flush; `MarkdownBlock` and `useBlockDoc`'s layout debounce ride it. (D-3, D-6)
7. `TileWriter` — one click-to-edit shell over `MarkdownEditor` that `MarkdownBlock` and `PageEmbed` both render. (D-2)
8. Net code LOC of `Tiles/` + `Utilities/` + `Views/ViewEmbedScope.tsx` is below **2680** — the 2546 baseline plus the three files that enter the measured set from outside it: `ActionBand.css.ts` 88, `tile-chassis.css` 17, `pageFlush.ts` 29. (A-6)
9. Every document the move makes false is rewritten in the commit that falsifies it; the ledger and atlas name the tree on disk. (Made False)

**Acceptance — the whole thing working:** With the app running against a nexus, a prose tile on the Homepage takes a keystroke and the window is closed within 400ms — on relaunch the keystroke is on disk. A page tile inside a Markdown document is edited, the page opens in the main pane and shows the edit. A dashboard tile is dragged and the window is closed within 300ms — on relaunch the tile is where it was dropped. `ls src/renderer/src` shows `Tiles/`, `Utilities/`, `Links/` and no `Blocks/`, `Embeds/`, `Components/`; `ls src/renderer/src/DesignSystem` shows no `Detail/`. The three gates are green, the LOC count reads below 2680, and the Dead Vocabulary sweep returns zero against its control.

**Forced By**

- Both hosts and three Windows import `PageEmbed`; `embedWidget` imports `blockZoom` and `tileWarm` → tile content is a root folder, not a host's subfolder.
- `embedWidget.tsx:106,357` reach `PageEmbed`/`WebEmbed` through `React.lazy` because `PageEmbed` mounts `MarkdownEditor`, which registers `embedWidget` → the cycle is open only through the lazy edge; **`Tiles/` never gets an `index.ts` barrel** — a barrel imported by `embedWidget` for `blockZoom` would pull `PageEmbed` in statically and close it.
- `DesignSystem/Components/` shares the word with root `Components/` and is reached by twenty relative and sixty-odd aliased imports → the rename rewrites the eleven explicit root sites only; no bare `Components/` substitution anywhere.
- `hoverPaneSize.test.ts` calls `vi.resetModules()` and re-imports the module per case → `hoverPaneSize` stays its own module.
- `.wpembed-title` is declared at `embeds.css:109-120` (`z-index: 2`, shared with `.pgembed-crumbs`) and again at `:162-169` (`z-index: 4`, deliberate — above the webview guest and its catcher) at equal specificity → both declarations land in the same file so source order stays authored, not import-graph-decided; `.pgembed-crumbs` has no rule of its own (`:109`, `:121` only, both in selector lists shared with `.wpembed-title`), so the identity file holds the whole cluster or nothing.
- `pageFlush.ts:16` writes through to the warm cache at *schedule* time so a remounting embed never seeds pre-edit prose → the write-through stays in the scheduler, not in the per-key write fn.
- `pageFlush.ts:36` requeues a failed ack when no newer edit owns the slot; `MarkdownBlock` has no requeue today → the requeue is gated on a *drop marker* set by tile removal, not on any registration — a removed tile's failed in-flight write must not resurrect the file, and an ordinary unmount's failed write must still retry as it does today.
- `Interface/PageView.tsx:102-104`: a pending write survives the component without per-host machinery, and one path can be open in the main pane, a Page Window, the NavWindow, a dashboard tile, and the hover pane at once → the write function cannot be owned by a mount; it rides each schedule call, so N owners of one key never contend and closing one never silences another.
- `Links/PanePresenter.ts:4-7` and `Editor-Internals.md:27`: `pointerPath.ts` → `ConnectionPane` → `PageEmbed` → `MarkdownPM/index` → `connections.ts:6` → `pointerPath.ts` is a cycle the runtime resolves by leaving one side's bindings uninitialized → `PanePresenter` stays a leaf; nothing in this plan imports `ConnectionPane` from inside MarkdownPM.
- `Store/NexusSlice.ts:60` awaits `flushAllPageSaves` *before* the root flips; `BlockSurface` unmounts after → any writer outside TileSave lands in the new nexus.
- Vitest, tsconfig, biome, vite, vercel, and the Showcase entries carry no path to any moved folder; the renderer has zero `vi.mock` calls → moves need no config edits, and the type gate enumerates every missed import.
- `blocks.css` classes (`.blk-md`, `.blk-inert`) are consumed only by movers; `embeds.css` classes cross the boundary (`.pgembed` → `surfacepm.css:199,203`, `Links/connectionPane.css:31,40`; `.pgembed-grows` → `PageWindow.tsx:229`, `NavWindow.tsx:205`; `.tile-chassis(-body)` → `SurfaceView.tsx:133,185`, `embedWidget.tsx:130,243,389`, `embedResize.test.tsx:27`; `.mdpm-embed-tile` owned by `MarkdownPM/Styles.css`; `blk-zoom-*` styled by `surfacepm.css:38-56`) → class names are a contract; the merge renames files, never classes.
- The Menu Recipe landed at `935bf031` (08-28): `PageEmbed`'s crumbs pass no type rung, `handleMenu.css.ts` and `viewEmbed.css.ts` sit on the recipe's `rowBox`, and every `size="title3"` is `size="headline"` → Phase 1's base is that commit, and the anchors above were re-derived against it.

**Inherited Reasoning**

- `Surface/Blocks/` (the atlas row) rejected — content with no plurality consumer misfiles under one host. `TilesPM` rejected — the suffix marks a product-named engine. Dissolving `Components/` into the design system rejected — its files read the store, the reach the atlas is closing. `Connections/` rejected for the hover pane — it serves webpages too; the whole cluster became `Links/` on 08-27.
- Folding `PanePresenter` into `ConnectionPane` rejected in review — it re-creates the table-mount crash `Editor-Internals.md:27` records, and a dev launch proves one module order out of three. A registry-based TileSave (`registerWriter`/unregister per mount) rejected in review — the second owner of a path key silenced the first, and unregister-before-ack dropped the retry.
- A shared `TileBody` wrapper rejected — `mountTile` is an imperative CodeMirror root, `SurfaceView`'s is a React tree; the shared part is one `div`.
- The baseline was first stated as 3138 and counted `Links/`'s 578 lines that had already left `Embeds/`; the true baseline is 2565 and the folds pay roughly 40-60 lines. `TileWriter` diverges in nine places and is line-neutral by design.
- `SurfacePM/README.md` and `shared/blocks.ts` carry block vocabulary; the `block` → `tile` rename is a separate sweep once the folder holds still.

**Grounding**

- `Tiles — Decision Log.md` — the spec; every decision tagged.
- `Blocks/BlockSurface.tsx` — the dashboard host; `renderTile` (~:318-358), `removing`/`suppressFlush` (:107-181), `tileClassName` (:270-285).
- `Blocks/MarkdownBlock.tsx` — the prose tile: private 400ms debounce (:7,:32-62), `blocks.readMarkdown`/`writeMarkdown`, click-to-edit shell (:64-86).
- `Embeds/PageEmbed.tsx` — the page tile: `pageFlush` at :8,:90-91,:133; the shell at :116-146; `chrome` header (:96-113); `EmbedCrumbs` (:198-202).
- `Interface/pageFlush.ts` — the path-keyed writer, whole file (53 lines). Consumers: `Interface/PageView.tsx:15,143`; `Embeds/PageEmbed.tsx`; `Store/NexusSlice.ts:19,60`.
- `Blocks/useBlockDoc.ts` — `SAVE_DEBOUNCE_MS` (:11), `flush` (:64-69), unmount flush (:71), `setLayout` (:73-83), `commitLayout` (:88-97), `saveBlocks` (:112-117).
- `Embeds/embeds.css` (193 lines) — `.pgembed-crumbs`/`.wpembed-title` at :109-124; second `.wpembed-title` at :162-169. `Blocks/blocks.css` (47 lines).
- `MarkdownPM/editor/embedWidget.tsx` — `LazyPageEmbed` (:105-107), `mountTile` (:117-139), `renderInto` (:240-262), `LazyWebpageEmbed` (:356-358), `applyTileZoom` (:463-467); imports at :32,:34,:38.
- `SurfacePM/SurfaceView.tsx:21,133,185` — the chassis import and classes.
- `Links/ConnectionPane.tsx:15-17,398-406` — the `PageEmbed` and `PanePresenter` consumers. `Links/PanePresenter.ts` stays; `Guidelines/Editor-Internals.md:27` records why.
- `Interface/ActionBand.css.ts` — ten exports, consumed only by `Blocks/viewEmbed.css.ts:5` and `Blocks/ViewEmbedBlock.tsx:43-52`.
- `Embeds/ViewEmbedScope.tsx` — provider at `Blocks/ViewEmbedBlock.tsx:499`; fourteen outside importers (Frames ×8, `Toolbar/ViewFrame`, `Properties/PropertyFrame`, `Views/useActiveView`, `Views/TableView/TableView`, `Views/CardView/CardsView`).
- `Components/` — `EntityIcon` (6 importers), `RenamableTitle` (3, `Sidebar/Sidebar.tsx:41` relative), `useNexusIcon` (2, both relative).
- `Store/NexusSlice.ts:54-68` — the adopt order.
- `Guidelines/Editor-Internals.md`, `Guidelines/Cohesion-Rulings.md:117`, `Guidelines/Lint-And-Accessibility.md` — the rules in force.
- The scratch inventory from the review agents lives in this plan's Made False and Forced By; the agents' raw output is not a source.

**Environment**

- Plan directory: `.claude/Planning/`. Spec: the decision log. Explorer: `Explore` agent. Research: none needed. Code reviewer: `feature-dev:code-reviewer` (a general reviewer scoped to correctness; no project-designated correctness agent exists). Attack reviewer: `build-breaking-agent`. Neutral verifier: `general-purpose`, handed the claim, the spec, the plan, and the range. Simplification: `code-simplifier` + `comment-killer-agent`. Rules directory: `.claude/Guidelines/`.
- Gate commands (from `Pommora/package.json`): `npm run typecheck` · `npm run lint` · `npx vitest run`. LOC gate: the count in Global Constraints.

**Shapes:** refactor (moves, the fold) · removal (`PageEmbedBlock`, `Blocks/`, `Embeds/`, `Components/`, `DesignSystem/Detail/`) · fix (`TileSave` closes a lost-write hole) · user-visible (the acceptance run).

**Global Constraints (every task inherits these)**

- Run from `Pommora/`. Gates, exit codes read directly, never piped: `npm run typecheck` → 0 · `npm run lint` → 0 · `npx vitest run` → 0 (297 files / 3671 tests at the base; the count may only rise by tests this plan adds). `npm run format` repairs a shell-driven write the hook didn't format.
- LOC count, run from `Pommora/src/renderer/src`: `cat $(ls Tiles/* Utilities/* Views/ViewEmbedScope.tsx | grep -v test) | grep -v '^\s*$' | grep -v '^\s*//\|^\s*/\*\|^\s*\*' | wc -l` → below **2680** at Gate 3 and at closeout. Baseline at planning: `Blocks/` 1793 · `Embeds/` 634 · `Components/` 119 = 2546 (re-counted 08-28 at the Menu Recipe's landing, `935bf031`), plus the inbound movers `ActionBand.css.ts` 88 · `tile-chassis.css` 17 · `pageFlush.ts` 29 = 2680. The gate measures the folds, not the moves.
- Moves are `git mv`; import rewrites are explicit per-path `sed` on the alias and relative forms named in the task, never a bare folder-name substitution. KNOB comments and `(Nathan's call)` markers travel verbatim.
- Stage explicit paths only (a parallel session may be live); never `git add -A` on a directory. Hook-pre-staged doc edits ride along. One commit per task, message `refactor(tiles): …` / `docs(tiles): …`.
- No `Tiles/index.ts`. Deep imports only.
- Comments: one load-bearing why per file at most; moved files keep the comments they had.
- Out of scope everywhere: `SurfacePM/**` beyond the chassis import; `Links/**` beyond the `PageEmbed` import rewrite; `MarkdownPM/**` beyond import rewrites; `shared/**`; `block` → `tile` identifiers; `SurfacePM/README.md` prose; anything the Menu Recipe session owns until its final commit is Phase 1's base.

**Made False**

| Doc | The specific claim | What makes it false | Task |
| --- | --- | --- | --- |
| `.claude/CLAUDE.md` map | rows `// Blocks`, `// Components`, `// Embeds`, `DesignSystem // Detail` | folders gone; `Tiles`, `Utilities` rows missing | 8 |
| `Features/SurfacePM.md` :14 :34 :36 | `src/renderer/src/Blocks/`, `Embeds/`, `DesignSystem/Detail/tile-chassis.css` | moved to `Tiles/` | 8 |
| `Features/MarkdownPM.md` :75 | `from src/renderer/src/Embeds/` | `Tiles/` | 8 |
| `Features/WebviewPM.md` :24 | `Embeds/webRetention.ts` | `Tiles/webRetention.ts` | 8 |
| `Features/DesignSystemPM.md` :27 :375-381 | the `Detail` tier and its one table row | tier empty; chassis is `Tiles/tile-chassis.css` | 8 |
| `Features/ArchitecturePM.md` :124 :192 | "one path-keyed flush registry … per page path" · "Pending page saves" | `TileSave` is key-keyed and carries tile bodies and layouts | 11 |
| `Guidelines/Cohesion-Rulings.md` :117 | `Blocks/ViewEmbedBlock.tsx:437` | `Tiles/ViewEmbedBlock.tsx` | 8 |
| `ContextPM.md` :17 :19 | the `Tiles/` row; `Blocks/ViewEmbedBlock.tsx:88` | row lands; the site is `Tiles/ViewEmbedBlock.tsx:78` and Task 4 closes it | 8, 15 |
| `RendererRefactor.md` :14 :33 :35 :40 :58 | `DesignSystem/Detail` line; `→ Components/ as NexusIconPicker`; the `Tiles/` row; "wrappers in `Components/`"; `Blocks/ViewEmbedBlock.tsx:88` | satisfied; `Utilities/`; row leaves; `Utilities/`; fixed in Task 4 (the site was `:78`) | 8, 15 |
| `RendererAtlas.md` :37 :39 :64-73 :88 :105-110 :127 :139 :193 | `Embeds/ViewEmbedScope`; lateral edges by folder; root `Components/` rows; `// Embeds` row; MOVED rows; "keeps `Components/`"; "Four folder names mislead"; `Blocks/ViewEmbedBlock.tsx:88` | tree on disk; `Utilities/`; rows become present tense | 8, 15 |
| `Planning/MenuRecipe.md` :298 :355 :391 | `Blocks/…`, `Embeds/PageEmbed.tsx` | a landed plan is history — allowlisted, not rewritten | — |
| `Planning/RendererAtlas.md` :308 :310 | the Settled rows naming `Embeds/` and `Blocks/` | history, correct as written — allowlisted | — |
| `Planning/Inline Page Properties — Decision Log.md` :32 | "`PageEmbed` and `MarkdownBlock` pass neither" | both still exist as components; `TileWriter` is beneath them — verify-only | 13 |
| `HandoffPM.md` :33 | "rides whichever session touches `Blocks/` first" | Task 4 takes it; the line is rewritten in Task 4's second commit | 4 |

**Dead Vocabulary**

- `@renderer/Blocks/` → 0. `@renderer/Embeds/` → 0. `@renderer/Components/` → 0 (`@renderer/DesignSystem/Components/` is a different token and survives). `'../Blocks/` `'../Embeds/` `'../Components/` → 0 outside `DesignSystem/**`. `DesignSystem/Detail` → 0. `PageEmbedBlock` → 0. `pageFlush` → 0. `schedulePageSave` / `flushPageSave` / `flushAllPageSaves` → 0.
- Legitimate hits: `.claude/HistoryPM.md`, `.claude/Sessions/**`, `.claude/HandoffPM.md` file ledger — historical record.
- Control: `rg -F "tile-chassis" src` → 9 at planning (`SurfaceView` ×1, `embedWidget` ×3, `blocks.css` ×3, `embeds.css` ×1, `surfacepm.css` comment ×1) → after Task 6 the number changes but stays nonzero; the sweep records it. Zero means the sweep never ran.

**Hazard Window:** none. Three debounces with different guarantees exist today; Phase 2 only reduces them, and no task leaves the app in a state a later task must repair.

---

### Phase 1 — The tree on disk (behavior-zero)

Base: `935bf031`. Baseline invariant carried through every task: `npx vitest run` test count 3671 across 297 files (+ tests this plan adds), and the running app looks identical.

#### Task 1: `Tiles/` from `Blocks/` and the tile half of `Embeds/`

**Requirement:** 1

**Why:** The folder is the deliverable; everything else in this plan lands inside it. Moving first, with no fold, keeps the diff a pure rename the type gate can verify — a fold entangled with a move hides a broken import behind a changed line. Taking `ActionBand.css.ts` and `tile-chassis.css` in the same task means `Tiles/` is complete on the first commit rather than assembled over three.

**Files:**
- `git mv`: every file in `Blocks/` → `Tiles/`; `Embeds/PageEmbed.tsx`, `Embeds/WebpageEmbed.tsx` (renamed `Tiles/WebEmbed.tsx`, the component `WebEmbed`), `Embeds/tileWarm.ts`, `Embeds/tileWarm.test.ts`, `Embeds/webRetention.ts`, `Embeds/webRetention.test.ts`, `Embeds/embeds.css` → `Tiles/`; `DesignSystem/Detail/tile-chassis.css` → `Tiles/tile-chassis.css`; `Interface/ActionBand.css.ts` → `Tiles/ActionBand.css.ts`.
- Modify (imports only): `Interface/HomepageView.tsx`, `Interface/SpaceView.tsx` (`@renderer/Blocks/BlockSurface`); `MarkdownPM/editor/embedWidget.tsx` (:32 chassis, :34 `blockZoom`, :38 `tileWarm`, :106 and :357 the two dynamic imports — the second becomes `import('@renderer/Tiles/WebEmbed').then((m) => ({ default: m.WebEmbed }))` and `LazyWebpageEmbed` → `LazyWebEmbed`); `MarkdownPM/editor/gripMenu.ts:15`; `MarkdownPM/index.tsx:31` (`../Embeds/tileWarm`); `Windows/PageWindow.tsx:7`, `Windows/NavWindow.tsx:10`, `Links/ConnectionPane.tsx:15` (`../Embeds/PageEmbed`); `SurfacePM/SurfaceView.tsx:21` (chassis); `Tiles/viewEmbed.css.ts:5` (`../Interface/ActionBand.css` → `./ActionBand.css`); `Tiles/ViewEmbedBlock.tsx:52` (`@renderer/Interface/ActionBand.css` → `./ActionBand.css`); `Tiles/PageEmbedBlock.tsx:1` (`@renderer/Embeds/PageEmbed` → `./PageEmbed`); `MarkdownPM/useConnectionAutocomplete.ts:161` comment (`Embeds/tileWarm.ts` → `Tiles/tileWarm.ts`).
- Rename with the move: `WebpageEmbed.tsx` → `WebEmbed.tsx`, the export `WebpageEmbed` → `WebEmbed`, `useWebpageTitle` and the `.wpembed-*` classes and `@shared/webpageEmbed` untouched — the component name is what changes.
- Delete: the empty `Blocks/`, `DesignSystem/Detail/` directories. `Embeds/` keeps `ViewEmbedScope.tsx` + test until Task 2.

**Derivation**
- `rg -F "@renderer/Blocks/" src` → 4 at planning. `rg -F "Blocks/" src --glob '!**/Blocks/**'` → 4 (the same). `rg -F "Embeds/PageEmbed" src` → 5 (one dies with `PageEmbedBlock` in Task 4). `rg -F "Embeds/tileWarm" src` → 3 (one a comment). `rg -F "DesignSystem/Detail" src` → 2. `rg -F "ActionBand.css" src` → 2 imports + 3 comment mentions (comments stay). Legitimate hits after: none in `src`.
- Control: `rg -F "@renderer/SurfacePM/" src` → 3. Zero means the search never ran.

**Steps:**
- [ ] `git mv` the files above; confirm `Blocks/` and `DesignSystem/Detail/` are empty and remove them.
- [ ] Rewrite the listed imports by explicit path; re-run each Derivation search — expect 0 in `src`.
- [ ] `npm run typecheck` → 0. If it lists an import the Derivation missed, add it to this task's Files before fixing it.
- [ ] `npm run lint` → 0; `npx vitest run` → 0, 3671 tests.
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
- [ ] Gates → 0, 3671 tests.
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
- [ ] Gates → 0, 3671 tests.
- [ ] Commit: `refactor(renderer): Components/ is Utilities/`

#### Task 4: `PageEmbedBlock` deleted; the `cellRing` identifier

**Requirement:** 5

**Why:** `PageEmbedBlock` is a 29-line pass-through that renames one prop; `BlockSurface` renders `PageEmbed` directly and the file goes. The ledger's one behavioral fix, `ViewEmbedBlock.tsx:78` `tintAt(cellColor(key), 'primary')` → `cellRing(key)`, rides the first session to touch this folder by the ledger's own rule, so it lands here as a one-identifier commit of its own.

**Files:**
- Delete: `Tiles/PageEmbedBlock.tsx`.
- Modify: `Tiles/BlockSurface.tsx` — the `'page'` branch of `renderTile` renders `<PageEmbed path={page.path} editing={editingId === id} onBeginEdit={() => setEditingId(entry.id)} connections={connections} locked={entry.locked ?? false} />`; drop the `PageEmbedBlock` import, add `import { PageEmbed } from './PageEmbed'`.
- Modify: `Tiles/ViewEmbedBlock.tsx` at the `tintAt(cellColor(key), 'primary')` site → `cellRing(key)` (`DesignSystem/Tokens/ramp.ts:142`, `export const cellRing`).

**Survivors:** `entry.id` vs the `id` argument — `PageEmbedBlock` passed `entryId={entry.id}` and called `onBeginEdit(entryId)`; the inline call keeps `entry.id`, not the closure's `id`, so a mismatch that never existed doesn't get introduced.

**Failure half:** a `'page'` entry whose `page_id` is not in `pagesById` still renders `<div className="blk-inert" />` — the dead-reference branch precedes the `PageEmbed` render and is untouched.

**Steps:**
- [ ] Inline the render; delete the file; `rg -F "PageEmbedBlock" src` → 0.
- [ ] Gates → 0. Commit: `refactor(tiles): BlockSurface renders PageEmbed directly`
- [ ] `cellRing(key)`; `HandoffPM.md:33` restated as done; gates → 0; run the app on a dashboard holding a view tile assigned a grey cell — the outline draws in the grey step. Commit: `fix(tiles): a grey-celled view tile draws its ramp outline`

#### Task 5: withdrawn

`PanePresenter` stays. See Inherited Reasoning; Requirement 4 is satisfied by not touching it.

#### Task 6: One `tile-base.css`, and `tile-title.css`

**Requirement:** 1

**Why:** `blocks.css` and `embeds.css` already share `:is(.blk-md, .pgembed)` selectors and describe one scroll model in two files. The identity label's rules get their own file so the ContextPM open call has one place to pull from. Class names are a cross-folder contract and do not change.

**Files:**
- Create: `Tiles/tile-title.css` — the whole identity cluster: `embeds.css:107-124` (the comment, the shared geometry, and the hover reveal for `.pgembed-crumbs` and `.wpembed-title`) followed by `:160-172` (the comment, the `.wpembed-title` override, and its hover rule), in that order, comments verbatim. Both ranges open on a comment line; `npm run lint` parses the result.
- Create: `Tiles/tile-base.css` — `blocks.css` whole, then `embeds.css` minus the two ranges above.
- Delete: `Tiles/blocks.css`, `Tiles/embeds.css`.
- Modify: `Tiles/BlockSurface.tsx:41`, `Tiles/PageEmbed.tsx:19`, `Tiles/WebEmbed.tsx:19` → `import './tile-base.css'`; `PageEmbed.tsx` **and** `WebEmbed.tsx` also `import './tile-title.css'` — they are separate lazy chunks (`embedWidget.tsx:106,357`), and a webpage tile mounted first must not render an unpositioned title.

**Derivation**
- `rg -F ".wpembed-title" src/renderer/src/Tiles/tile-title.css` → 4 selector lines (two declarations, two `:hover` rules) in authored order; `rg -F ".wpembed-title" src/renderer/src/Tiles/tile-base.css` → 0. `rg -F ".pgembed-crumbs" src/renderer/src/Tiles/tile-base.css` → 0.
- Control: `rg -F ".pgembed-grows" src` → 3 (the definition plus `PageWindow`, `NavWindow`), unchanged.

**Steps:**
- [ ] Concatenate; extract; delete; rewrite the three imports.
- [ ] Gates → 0. In the running app: hover a page tile inside a Markdown document — crumbs appear; hover a webpage tile — its title appears above the guest and is clickable.
- [ ] Commit: `refactor(tiles): one stylesheet for the tile family; the identity label in its own`

#### Task 7: LOC and vocabulary checkpoint

**Requirement:** 8

**Why:** Phase 1 is moves and one small deletion; the count should read 2680 − ~25 (`PageEmbedBlock`, the CSS header dedupe). A number far from that means a move dropped or duplicated something.

**Steps:**
- [ ] Run the LOC count from Global Constraints — record the number in the Log. Expect 2646-2666.
- [ ] Run every Dead Vocabulary token against `src` — `pageFlush`, `schedulePageSave`, `flushPageSave`, `flushAllPageSaves` are still live (Phase 2) and expected nonzero; every other token → 0. Control nonzero.
- [ ] No commit; the numbers go in the Log at Gate 1.

#### Task 8: The documents the move made false

**Requirement:** 9

**Why:** Every path citation in Made False rows 1-5, 7-11 goes false at Task 1-3; the rows land in one docs commit closing the phase so the tree and its description never diverge across a session boundary.

**Files:** per the Made False table — `CLAUDE.md` (drop the four rows, add `// Tiles | • The tile world — chassis, the four content kinds, their plumbing, the dashboard host` and `// Utilities | • App-bound helpers — the entity icon, the renamable title, the nexus icon`), `SurfacePM.md`, `MarkdownPM.md`, `WebviewPM.md`, `DesignSystemPM.md` (the `Detail` tier removed from the tree at :27 and the section at :375-381; the chassis row moves under wherever DesignSystemPM lists app-owned surfaces by reference, or is dropped with a one-line note that the chassis lives in `Tiles/`), `Cohesion-Rulings.md:117`, `ContextPM.md:17,19`, `RendererRefactor.md` (:14 line satisfied → removed; :33 `Components/` → `Utilities/`; :35 row leaves; :40 `Utilities/`; :58 path), `RendererAtlas.md` (tree rows to present tense, root `Components` → `Utilities`, `// Embeds` row gone, :37 :39 :139 :193 restated as current). `MenuRecipe.md` and the atlas's Settled rows are history and stay; `HandoffPM.md:33` is Task 4's.

**Steps:**
- [ ] Rewrite each; `rg -F "Blocks/" .claude --glob '!**/HistoryPM.md' --glob '!**/Sessions/**' --glob '!**/Tiles*' --glob '!**/MenuRecipe.md'` → the Settled rows in `RendererAtlas.md` only (history, correct as written); same for `Embeds/`, `DesignSystem/Detail`, `@renderer/Components`. A landed plan (`MenuRecipe.md`) is history and is never rewritten.
- [ ] Commit: `docs(tiles): the tree on disk`

#### Gate 1 — the tree on disk, behavior unmoved
- [ ] Gate commands green, exit codes read directly; test count 3671.
- [ ] Derivations re-run against their controls; counts matched, or the divergence rewrote the plan.
- [ ] Simplification (`code-simplifier` then `comment-killer-agent`) and `feature-dev:code-reviewer` dispatched against `<base>..HEAD` scoped to `Tiles/`, `Views/ViewEmbedScope*`, `Utilities/`; reports cite files inside it.
- [ ] Every concern fixed, or carrying an explicit user ruling in the Log.
- [ ] The running app: a dashboard with a prose, page, and view tile; a Markdown document with a page and a webpage tile; the hover pane over a link — all identical to before the base commit, except a grey-celled view tile's outline, which Task 4 changed on purpose.
- [ ] LOC recorded; Progress hashes filled in.

---

### Phase 2 — TileSave (the one behavior change)

#### Task 9: `Tiles/TileSave.ts` replaces `Interface/pageFlush.ts`

**Requirement:** 6

**Why:** `pageFlush` is already the right mechanism — one debounced writer per key, flushed on demand, at nexus-adopt, and at `beforeunload` — with the wrong key type and one write function baked in. The generalization keeps the shape `PageView.tsx:102-104` relies on: the pending write belongs to the *key*, never to a mount. The write function rides the schedule call, so a page open in five places schedules through one slot and closing any of them changes nothing; a prose tile and a layout doc schedule with their own functions and get the same guarantees. No registry exists to get out of sync.

**Files:**
- Create: `Tiles/TileSave.ts` — from `pageFlush.ts` by `git mv` then edit, so history follows.
- Modify: `Interface/PageView.tsx:15,143`; `Tiles/PageEmbed.tsx:8,90-91,133`; `Store/NexusSlice.ts:19,60`.
- Test: `Tiles/tileSave.test.ts` (new).

**Interfaces**
- Produces:
  - `type Write = (body: string) => Promise<{ ok: boolean }>`
  - `scheduleWrite(key: string, body: string, write: Write): void` — clears the key's drop marker, replaces any pending entry `{ body, write, timer }`, arms the 400ms timer. The newest call's `write` is the one that runs.
  - `flushWrite(key: string): Promise<void>` — as `flushPageSave`: clears the timer, deletes the entry, awaits `write(body)`; on `!ok`, requeues with the same `write` only if `!pending.has(key) && !dropped.has(key)`.
  - `flushAllWrites(): Promise<void>` — as `flushAllPageSaves`.
  - `dropWrite(key: string): void` — clears the pending entry without writing and marks the key dropped until the next `scheduleWrite`.
  - `schedulePageWrite(path: string, body: string): void` — the page seam in the same file: `writeThroughBody(path, body)` then `scheduleWrite(path, body, (b) => window.nexus.updatePageBody(path, b))`. `SAVE_DEBOUNCE_MS = 400` stays; the `beforeunload` listener stays.
- Assumed by: Task 10 (`MarkdownBlock` schedules with `(b) => window.nexus.blocks.writeMarkdown(host, tileId, b)`; removal calls `dropWrite`), Task 12 (`useBlockDoc` schedules the stringified layout), Task 13 (`TileWriter` takes `onChange` only).

**Failure half:** `flushWrite` on a key with nothing pending → resolves. A `write` rejecting (the envelope never rejects, but the fn is caller-supplied) → treated as `!ok`. `dropWrite` on a key with nothing pending → marks it dropped, harmless. A key dropped and then scheduled again (a tile removed and re-added with the same id in one session) → the marker clears on schedule.

**Must agree:** the main pane and a page tile edit one path; the test schedules through `schedulePageWrite` from two "hosts", flushes once, and asserts one IPC call carrying the newest body. Then: the same two hosts, one "unmounts" (calls `flushWrite` and nothing else, as `PageEmbed`'s cleanup does), the other keeps typing — the next flush still lands. There is no unregister to get wrong.

**Negative control:** the requeue — a write returning `{ok:false}` on an undropped key re-schedules (a second call after 400ms); the same on a key dropped between schedule and ack does **not**. Disable the `dropped` check and the second assertion goes red. And the unmount retry: schedule, flush in flight, ack `{ok:false}` with no drop → requeued, as today.

**Steps:**
- [ ] Write `tileSave.test.ts`: schedule + flush lands one write; two schedules coalesce to the newest body and write; flushAll awaits every key; the two Must-agree cases; requeue both halves; drop; `beforeunload` flushes (dispatch the event on `window`).
- [ ] Run → failures, module not found.
- [ ] `git mv Interface/pageFlush.ts Tiles/TileSave.ts`; implement; re-run → pass.
- [ ] Repoint the three consumers (`schedulePageSave` → `schedulePageWrite`, `flushPageSave` → `flushWrite`, `flushAllPageSaves` → `flushAllWrites`); `rg -F "pageFlush" src` → 0; `rg -F "schedulePageSave" src` → 0.
- [ ] Gates → 0. Commit: `refactor(tiles): TileSave — one debounced writer per key, any key`

#### Task 10: `MarkdownBlock` rides TileSave

**Requirement:** 6

**Why:** The prose tile's private debounce is the lost-write hole; scheduling its `writeMarkdown` through TileSave closes it and deletes ~20 lines. `suppressFlush` becomes: on removal, `BlockSurface` calls `dropWrite(key)` before `blocks.removeTile`, so neither a pending nor a failed-ack write can land after the trash.

**Files:**
- Modify: `Tiles/MarkdownBlock.tsx` — drop `pending`, `flush`, `flushRef`, `scheduleSave`, `SAVE_DEBOUNCE_MS`, `suppressFlush`; key = `` `${blockHostKey(host)}:${tileId}` ``; `onChange={(next) => scheduleWrite(key, next, (b) => window.nexus.blocks.writeMarkdown(host, tileId, b))}`; the edit-exit and unmount effects call `flushWrite(key)`, exactly `PageEmbed`'s shape at `:88-91`.
- Modify: `Tiles/BlockSurface.tsx` — `removing` set and `suppressFlush` callback deleted; `removeBlock` (~:169-181) calls `dropWrite(key)` as its first line, before `commitLayout` — the order the function's comment names as load-bearing. `renderTile` no longer passes `suppressFlush`.
- Test: extend `tileSave.test.ts` with the drop case; `Tiles/markdownBlock.test.tsx` if one is needed to prove the edit-exit flush — check `rg -F "MarkdownBlock" src --glob '*.test.*'` first; none exists at planning.

**Negative control:** the drop case — schedule, `dropWrite`, advance 400ms, assert zero writes; with `dropWrite` a no-op the assertion goes red. And the orphan case from the spec: schedule, flush (in flight), `dropWrite`, resolve the ack `{ok:false}` — zero further writes.

**Steps:**
- [ ] Tests first; red; implement; green.
- [ ] Gates → 0. The running app: type in a prose tile, ⌘Q within 400ms, relaunch — the text is there. Type, then Remove the tile from its handle menu — no file returns.
- [ ] Commit: `refactor(tiles): the prose tile writes through TileSave`

#### Task 11: ArchitecturePM's autosave paragraph

**Requirement:** 9

**Why:** `ArchitecturePM.md:124` states the registry is path-keyed and per page; Task 9 made that false in code, and the doc lands in the same phase.

**Files:** `Features/ArchitecturePM.md` :124 and the table row at :192 — restated: one debounced writer per key shared by every editor host; pages key by path, tiles by host and id, layouts by host; every key flushes on demand, at nexus-adopt, and at window close.

**Steps:**
- [ ] Rewrite; commit: `docs(architecture): autosave is one writer per key`

#### Task 12: The layout document rides TileSave

**Requirement:** 6

**Why:** `useBlockDoc`'s 300ms layout debounce flushes on unmount only; at nexus-adopt `BlockSurface` unmounts after the root flips, so the flush writes into the new nexus, and at window close it is lost. It is the same hole Task 10 closes, and closing one without the other leaves prose surviving a switch while positions don't. `commitLayout` and `saveBlocks` stay immediate — they are structural writes that must precede their entry op.

**Files:**
- Modify: `Tiles/useBlockDoc.ts` — `pending`, `flush`, `SAVE_DEBOUNCE_MS`, and the unmount effect go. Key = `blockHostKey(host)`. `setLayout` calls `scheduleWrite(key, JSON.stringify(layout), (json) => window.nexus.blocks.save(hostRef.current, { layout: JSON.parse(json) }))` — `encodeLayout` is already `JSON.parse(JSON.stringify(layout))` (`codec.ts:15-16`), so the string is the same work in a different order and `body` stays `string` everywhere. `commitLayout` schedules the same way and calls `flushWrite(key)` immediately. The unmount effect becomes `flushWrite(key)`.
- Test: `Tiles/useBlockDoc.test.ts` if absent — `rg -F "useBlockDoc" src --glob '*.test.*'` → check; the debounce-then-flush and the adopt-order cases.

**Must agree:** the 300ms debounce becomes 400ms — TileSave has one constant, ratified (D-6); `commitLayout` still flushes at once.

**Steps:**
- [ ] Tests; implement; gates → 0. The running app: drag a tile, ⌘Q within 400ms, relaunch — it stayed. Drag a tile, switch nexus immediately — the old nexus holds the new position, the new nexus is untouched.
- [ ] Commit: `refactor(tiles): the layout document writes through TileSave`

#### Gate 2 — one writer, every tile-shaped save
- [ ] Gates green; test count = 3657 + the tests Tasks 9-12 added.
- [ ] `rg -F "SAVE_DEBOUNCE_MS" src` → 1 (TileSave). `rg -F "setTimeout" src/renderer/src/Tiles` → TileSave's, plus `WebEmbed.tsx`'s capture deadline (`CAPTURE_DEADLINE_MS`), a known non-debounce timer; any other is a regression.
- [ ] Simplification and code review against `<base>..HEAD` scoped to `Tiles/TileSave.ts`, `MarkdownBlock.tsx`, `BlockSurface.tsx`, `useBlockDoc.ts`, `PageEmbed.tsx`, `Interface/PageView.tsx`, `Store/NexusSlice.ts`.
- [ ] The running-thing pass is the four acceptance runs in Tasks 10 and 12, performed at this gate.
- [ ] Every concern fixed or ruled; Progress hashes filled in.

---

### Phase 3 — TileWriter

#### Task 13: `Tiles/TileWriter.tsx`

**Requirement:** 7

**Why:** `MarkdownBlock.tsx:64-86` and `PageEmbed.tsx:116-146` are one click-to-edit shell written twice: the same `onClick` guard (`editing || locked` → return; a non-collapsed selection → return; else begin edit), the same `MarkdownEditor` with `nativeEditorMenu`, `readOnly={!editing}`, `autoFocus`, `edgeFade`. The nine divergences become props; the two seam components keep their data logic and render the shell. Line-neutral by design; justified by one shell and one flush story.

**Files:**
- Create: `Tiles/TileWriter.tsx`.
- Modify: `Tiles/MarkdownBlock.tsx` — the shell lines replaced by `<TileWriter className="blk-md" editing={editing} locked={locked} onBeginEdit={() => onBeginEdit(tileId)} body={body} onChange={(next) => scheduleWrite(key, next, write)} connections={connections} />` (`write` is the tile's `writeMarkdown` closure from Task 10).
- Modify: `Tiles/PageEmbed.tsx` — the shell lines replaced by `<TileWriter className={cx('pgembed', chrome === 'page' && entry?.cover && 'has-banner')} style={{ '--mdpm-scale': …, '--editor-scale': 1 }} clickGuard=".mdpm-banner" header={header} editing locked onBeginEdit body onChange={(next) => { onBodyRef.current?.(next); schedulePageWrite(path, next) }} connections zoom={embedZoom(embedScale)} warm={warm} pageId={entry?.id} embedAncestors={[...]} />`.

**Interfaces**
- Produces: `TileWriter(props: { className: string; style?: CSSProperties; header?: ReactNode; clickGuard?: string; editing: boolean; locked: boolean; onBeginEdit: () => void; body: string; onChange: (next: string) => void; connections?: ConnectionsApi; zoom?: number; warm?: WarmSeam; pageId?: string; embedAncestors?: readonly string[] })` — renders the outer `div` with the click guard and the `MarkdownEditor`. Everything not listed keeps the value the two shells share today (`menu={nativeEditorMenu}`, `readOnly={!editing}`, `autoFocus`, `edgeFade`).
- Assumed by: nothing later.

**Survivors:** the bare `is-editing` class both shells emit today has no consumer anywhere in `src` (the live class is `.is-editing-tile`, set by the hosts) and is dropped in the fold. The two biome-ignore lines on the `div` travel to `TileWriter` once and leave both seams. The `pgembed-failed` and `body === null` early returns stay in `PageEmbed` above the shell; `MarkdownBlock`'s `body === null` blank stays likewise.

**Steps:**
- [ ] Create; replace both shells; `rg -F "nativeEditorMenu" src/renderer/src/Tiles` → 1. `Inline Page Properties — Decision Log.md:32` still names both components — verified, no edit.
- [ ] Gates → 0, test count unchanged. The running app: click-to-edit on a prose tile, a page tile on the dashboard, a page tile in a document, the Page Window, the NavWindow; a text selection ending in a click does not enter edit; a click on an embedded page's banner does not enter edit.
- [ ] Commit: `refactor(tiles): one TileWriter shell under the prose tile and the page tile`

#### Task 14: LOC gate and the vocabulary sweep

**Requirement:** 8

**Steps:**
- [ ] LOC count → below 2680; record. Every Dead Vocabulary token → 0 in `src` and `.claude` (allowlist applies); control nonzero.
- [ ] No commit.

#### Gate 3 — the folds
- [ ] Gates green; LOC below 2680 recorded in the Log with the exact number.
- [ ] Simplification and code review against `<base>..HEAD` scoped to `Tiles/`.
- [ ] Every concern fixed or ruled; the running-thing pass from Task 13 done at the gate; Progress hashes.

---

### Phase 4 — Closeout

#### Task 15: The record

**Requirement:** 9

**Files:** no History entry — refactor rows are recorded in the ledger and the atlas, and git carries the range; `ContextPM.md` (the `Tiles/` row closes; the `cellRing` row closes; Current Focus's tree paragraph names `Tiles/`, `Utilities/`, `Links/`); `RendererRefactor.md` (the `Tiles/` row and the `cellRing` row leave; `block` → `tile` identifiers gains its own row); `RendererAtlas.md` (Settled: `Tiles/` executed with the date; the tree rows present tense); `Guidelines/` (any lesson from the Log); `Tiles — Decision Log.md` Lessons filled.

**Steps:**
- [ ] `/closeout` discipline over the whole range: Delivery Claim written → neutral verifier (claim, spec, plan, range) → attack pass → interface pass against the running app (the Acceptance paragraph, performed literally).
- [ ] Closing sweep: every Dead Vocabulary token against its control, results in the Log.
- [ ] Docs; commit: `docs(tiles): the record`

---

## Implementation Log

### Progress
- [ ] **Phase 1** — the tree on disk · base `935bf031` (the Menu Recipe's landing)
  - [ ] Task 1 — Tiles/ from Blocks and the embed tiles · `<commit>`
  - [ ] Task 2 — ViewEmbedScope to Views · `<commit>`
  - [ ] Task 3 — Components to Utilities · `<commit>`
  - [ ] Task 4 — PageEmbedBlock deleted; cellRing · `<commit>` `<commit>`
  - [ ] Task 5 — withdrawn
  - [ ] Task 6 — tile-base.css and tile-title.css · `<commit>`
  - [ ] Task 7 — LOC checkpoint · reading: `<n>`
  - [ ] Task 8 — the documents · `<commit>`
- [ ] **Phase 2** — TileSave · base `<commit>`
  - [ ] Task 9 — TileSave · `<commit>`
  - [ ] Task 10 — the prose tile · `<commit>`
  - [ ] Task 11 — ArchitecturePM · `<commit>`
  - [ ] Task 12 — the layout document · `<commit>`
- [ ] **Phase 3** — TileWriter · base `<commit>`
  - [ ] Task 13 — TileWriter · `<commit>`
  - [ ] Task 14 — LOC gate · reading: `<n>`
- [ ] **Phase 4** — closeout · base `<commit>`
  - [ ] Task 15 — the record · `<commit>`

### Rulings
- D-6 ratified by Nathan, 08-28-2026: one debounce, 400ms — every debounced save in the app goes through TileSave; the layout document joins it.
- Consistency sweep after round 2 (08-28-2026): no gate carries 2565, no registry vocabulary survives outside the rejection record, every `scheduleWrite` call carries its write fn. Round 3 not run — round 2's findings were arithmetic propagation, not new defects.
- Review round 2 (08-28-2026): two process gates carried the old 2565; Task 6's ranges started mid-comment; the declined-D-6 branch reached one sweep; `dropWrite` placement; Task 8's sweep gained its allowlist. Eight edits, none structural; the TileSave shape survived every attack.
- Review round 1 (08-27-2026): Task 5 withdrawn; TileSave's registry replaced by a write-per-schedule interface; LOC rebaselined to 2699; `tile-title.css` takes the whole identity cluster; layout body stringified; nine citation corrections.

### Open Against Later Tasks
### Deviations
### Lessons
### Sequenced After
- `block` → `tile` in identifiers across `Tiles/`, `shared/blocks.ts`, `SurfacePM/README.md` — the atlas row, once the folder holds still.
- The floating identity label as one element — ContextPM open call; `tile-title.css` is its seed.
- `PanePresenter` and `hoverPaneSize` stay leaves; folding either into `ConnectionPane` needs the presenter claim moved out of the pane first and the size test off `vi.resetModules`.
### Closeout
