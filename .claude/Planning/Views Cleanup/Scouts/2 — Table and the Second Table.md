### Scout 2 — The Table and the Second Table

**Ground:** `cae07c129` · read-only · reconciled against HEAD (`cae07c129`, unchanged); every file size in the map re-measured and matching.

---

#### 1. Map

| File | Owns | Called By |
| --- | --- | --- |
| `Core/Views/Table/TableView.tsx` (502) | The Table renderer: rename state, cell click/menu routing, sweep wiring, band recursion `renderRows`, `GhostRow`, `DataRow` | `ViewHost` (via the view registry) |
| `Core/Views/Table/useColumns.ts` (362) | Pure layout (`COLUMN_LAYOUT`, `minWidthFor`, `clampWidth`, `alignFor`, `reorderColumns`, `gapShift`) + the column hook (widths, overflow check, hide/slide, resize state, header menu, column drag gesture) | TableView; `COLUMN_LAYOUT` also by `BundleTable.tsx:34` |
| `Core/Views/Table/ColumnHeader.tsx` (77) | One header cell + its resize gesture | TableView only |
| `Core/Views/Table/cellSweep.ts` (87) | `useCellSweep`, the down-a-column multi-row pick | TableView only |
| `Core/Views/Table/table-view.css` (71) | Main-pane shell (3-28), hide/slide beat (30-37), `cell-sweep` (39-44), `.row-grip` look (45-52), band rhythm (54-71) | TableView; ArchiveView (`ArchiveView.tsx:21`) |
| `UIX/Table/table-tokens.css` (28) | `.table` token scope | `mount.tsx:14`; rebound by `trash-frame.css:1-4`, `view-tile.css.ts:157` |
| `UIX/Table/table.css` (321) | Grid chrome (1-121, 139-178), row chrome (123-137, 194-221), property-cell content vocabulary (180-193, 222-321) | `mount.tsx:15` (global) |
| `UIX/Table/RowRail.tsx` (12) | The rail span beside a lead cell | `TableView.tsx:480`, `BundleTable.tsx:277` |
| `UIX/Table/rowIndent.ts` (2) | `calc(var(--row-indent) * depth)` | TableView (4 sites), `BundleTable.tsx:287` |
| `Core/Bundles/BundleTable.tsx` (315) | `useDateColumn`, `BundleTable` (grid tracks), `DateHeading`, `BundleRows` (virtualized, keyboard), `BundleFooting`, `BundleRowView` | `ArchiveView.tsx`, `TrashFrame.tsx` |
| `Core/Bundles/bundle-table.css` (34) | Virtual row placement, title line, trail, partial mark, date cell | BundleTable |
| `Core/Archive/ArchiveView.tsx` (100) + `archive-view.css` (8) | Archive skin: scaffold, hand-built heading, footing | Interface (container archive route) |
| `Core/Trash/TrashFrame.tsx` (74) + `trash-frame.css` (77) | Trash skin (adjacent, the second skin of the same table) | Settings |

---

#### 2. Findings

##### F1 · Three Heading Constructions for One Heading

**There:** TableView draws headings through `ColumnHeader` with `.col-header-icon` (`TableView.tsx:206-211, 301-318`). ArchiveView hand-builds the same `.col-header` + `.col-header-icon` markup twice (`ArchiveView.tsx:69-88`). TrashFrame hand-builds a third form with its own `trash-head-glyph` (`margin-right: 8px`) and `trash-head-label` (`gap: 6px`) classes (`TrashFrame.tsx:40-57`, `trash-frame.css:45-58`) where `.col-header-icon` already does this at `--cell-icon-gap` (6px, `table.css:34-40`, `table-tokens.css:7`). The two skins also disagree on the date heading: Archive centers it (`archive-view.css:2-4`); Trash left-aligns it with an 8px knob (`trash-frame.css:38-40`), while both skins center the dates under it (`bundle-table.css:32-34`).
**History:** The Trash heading predates the shared table (`56999e4db`, 08-14). `13522e7c0` set its glyph gap to the row's 8px gap when Trash rows were `MenuItem`s; `312d63751` later moved the rows onto TableView's look at `--cell-icon-gap` (6px), and the heading kept 8px. It's residue, not a choice. No recorded rationale found for the left-aligned date heading.
**Problem:** One Way, Reads as Designed. The same table, one component away, draws its heading two ways with two spacings; each skin re-imports `Icon` and `propertyTypeIconName` to rebuild it.
**Change:** `BundleTable` draws its own `.table-head` from two `{ icon, label }` props (folding `DateHeading` into it), both skins pass labels only, and Trash keeps only its frame-level rebinds (fill, divider, reach-back margin, no first segment). The date heading's alignment unifies — **a visual divergence for Nathan to rule on** (centered over centered dates is the likely "should always have been").
**Delta:** ≈ −40 to −55 (Archive −15, Trash −12, BundleTable −8 net with `DateHeading` folded, `trash-frame.css` −14, `archive-view.css` −3, imports).
**Status:** Verified (CSS values and markup read; Trash's range corrected to end at `:57`). Alignment is Nathan's call.
**Overlaps:** none in the other reports.
**Outside Domain:** `Core/Trash/*`, Archive Drive and `TrashFrame.test.tsx:103`, `ArchiveView.test.tsx:153-154`, `BundleTable.test.tsx:251`.

##### F2 · The Resize Gesture Lives in the Header; the Drag Gesture Lives in the Hook

**There:** `useColumns` owns the column-drag gesture (`useColumns.ts:246-332`) but hands TableView five resize callbacks — `resizeColumn`, `startResize`, `abortResize`, `endResize`, `commitResize` (`:192-206`, returned `:353-357`) — which TableView threads into `ColumnHeader`'s 13 props (`TableView.tsx:302-317`), where the resize gesture itself runs (`ColumnHeader.tsx:38-63`). `onResizeStart(id)` (`ColumnHeader.tsx:53`) passes an id the hook's `startResize` takes no parameter for (`useColumns.ts:197`).
**Problem:** Clearer Boundaries, Less to Carry. Two column gestures, two owners; the header component exists mostly as a prop funnel (29 of 77 lines are its signature).
**Change:** `startResize(e, id)` joins `startColumnDrag(e, i)` in `useColumns` on the same `beginGesture`; the five callbacks become hook-internal; the header's ~13 lines of JSX inline into TableView's header map beside `headerIcon`; `ColumnHeader.tsx` is deleted. (Lighter alternative: keep `ColumnHeader` as a dumb component taking `onResizeStart(e)` — about half the saving.)
**Delta:** ≈ −45 to −70 (the moved gesture keeps its clamp, `setDragWidth`, and persist lines). The gesture body is ~25 lines against a 77-line file, so the lower half of the range is the likelier.
**Status:** Verified (prop count, signature length, and the ignored id all re-read); delta is an estimate.
**Overlaps:** 8 (F4, the `.col-resizer` pin; §Placement, the column-width describe in `bandCommits.test.tsx`).
**Outside Domain:** `bandCommits.test.tsx:847` binds `.col-resizer` (class kept, so it stays true).

##### F3 · TableView Runs Its Own Rename Session

**There:** TableView holds `renaming` locally with its own stranded-row cleanup (`TableView.tsx:73-77`), routes the create and page-menu rename to it through its policy (`:86-87`), and calls `mutate({ op: 'rename', fromCreate })` directly (`:123-133`). Cards goes through the session fence (`beginRename` → `editSlice` → `RenamableTitle`: `CardsView.tsx:161`; `editSlice.ts:92-139`), which already self-heals a stranded session (`editSlice.ts:101-106`) and carries `fromCreate` (`:110, 132-138`). A third, surface-held variant exists as `RenamablePageName` (`RenamableTitle.tsx:62-93`). History: the local state was carved out of TableView's old combined `editing` state when the value seat landed (`dfb8d0147`); TableView never used the fence. No recorded reason found.
**Problem:** One Way. Two renderers, two rename sessions, two stranded-session cleanups; `useViewInteractions`' `policy.rename` slot (`useViewInteractions.tsx:44-45`) exists largely because they differ. A List would have to pick one.
**Change:** TableView renames through the shared session, landing together with I-040's ID-keyed claim (the Decisions doc folds I-040 in). `RenamableTitle` needs a `children` passthrough for the table's `cell-title-text` render (`TableView.tsx:135`; it forwards none today) and `doubleClick={false}` (a title click navigates).
**Delta:** TableView ≈ −18, which includes rewiring `overlayTarget`/`activeCell` (`TableView.tsx:192-202`) from `renaming.rowId` to the session's renaming target; `RenamableTitle` +3; I-040's own delta separate.
**Status:** Corrected — the scout's constraint read "TableView's local state is ID-keyed — it already *has* I-040's proposed fix; moving it onto a path-keyed fence regresses it." Against the code, the Table's create-rename fires from the same post-flight callback as Cards' (`useViewCreation.ts:155-159` calls `cfg().rename` only once `created.path` resolves), so the Table opens its field no sooner than Cards does; ID keying is half of I-040's fix (the key), not the timing. Moving the Table onto today's fence costs no I-040 timing. What it does cost is per-instance precision: the fence picks first-come among two `'detail'` claims for one path (`editSlice.ts:53-61`), which the Table's local state is immune to (Report 3 F1's trade-off). The sequencing conclusion stands on One Way grounds: unify on a fence that claims by ID, so the Table doesn't move onto a key I-040 replaces.
**Overlaps:** 3 (F1, holds the fullest mechanism map and the twin trade-off), 8 (F8, the untested Table create-rename; F10, the I-040 analysis), 1 (§What a New Renderer Must Know item 7, §Insights).
**Outside Domain:** `Core/Session/editSlice.ts`, `Core/Interface/RenamableTitle.tsx`, `useViewCreation.ts` (I-040's cite list).

##### F4 · `reorderColumns` Restates `placeInShown`

**There:** `reorderColumns` (`useColumns.ts:78-87`) moves a visible id and appends `property_order`'s hidden tail. `placeInShown` (`visibilityModel.ts:22-34`), which VisibilityFrame uses (`VisibilityFrame.tsx:113`), does the same splice and the same tail filter (identical result for a shown id, by `moveItem`'s definition, `UIX/Utilities/moveItem.ts:2-7`), plus clearing the hidden flag.
**Problem:** One Way — two helpers for one `property_order` write, in two folders.
**Change:** `useColumns` persists `placeInShown(view, columns.map(c => c.id), id, current.to)` and `reorderColumns` goes. Side effect: the patch also carries an unchanged `hidden_properties` (a shown column is never in it); acceptable, or `placeInShown` omits the field when the id wasn't hidden.
**Delta:** ≈ −12 (and its test block, `useColumns.test.ts:121-151`).
**Status:** Verified (both functions and `moveItem` re-read; the outputs match for any shown id).
**Overlaps:** 6 (F8 moves `placeInShown`'s home into `Pipeline/columns.ts`, so this import follows it); 8 (F5 lists `reorderColumns` as a test-only export).

##### F5 · `UIX/Table/table.css` Holds Properties' Cell Styles

**There:** `table.css:222-321` (plus `.cell-title` at 180-193 is table) styles `cell-text-scroll`, `cell-text-host`, `cell-pen`, `cell-text-clip`, `.cell-text`, `cell-chips`, `cell-link`, `cell-control`, `cell-switch`, `cell-bar`, `.value-seat` — consumed by `Core/Properties/Cells/{Cell,TextCell,LinkCell,CheckboxGlyph}.tsx`, `PropertyPanel.tsx:248`, and `CardsView.tsx:181,607`; `.value-seat` is never worn by a table at all.
**Problem:** Clearer Boundaries, Less to Understand. Cards and the Properties panel depend on "table" CSS; UIX styles class names that only Core components emit; the feature doc already misreports it ("the cell renderers live in `UIX/Table/`", ViewTypesPM §Table, line 79).
**Change:** Move the block to a `Core/Properties/Cells/cells.css` imported by `Cell.tsx`, keeping only the table-scoped override (`.data-cell .cell-text-host…`, `:267-278`) either with it or in `table.css`. **Placement for Nathan.**
**Delta:** ≈ +1 (import). A move.
**Status:** Verified (every class's emitters re-grepped; none outside `Core/Properties/Cells`, PropertyPanel, and Cards).
**Overlaps:** 6 (F1 moves the item/field model into Properties — the same direction for the record these styles draw).
**Outside Domain:** `Core/Properties/Cells`, Cards, PropertyPanel; *PommoraUIX §Table* (`PommoraUIX.md:393`).

##### F6 · One Row Shell, Written Three Times

**There:** `DataRow` (`TableView.tsx:430-439, 480-495`), `GhostRow` (`:366-390`), and `BundleRowView` (`BundleTable.tsx:258-313`) each build `data-row` + `row-lead` + a `data-cell cell-lead` + `RowRail` + a rail-slot control (grip / none / check) + the `cell-title` › icon › `cell-title-text` line. `GhostRow`'s lead cell has no `RowRail` (`:377-387`). Indent runs by two mechanisms: TableView pads the lead cell (`:445`), BundleRowView margins `.bundle-title` (`:287`) — the margin exists so a nested row's chevron rides the indent (`bundle-table.css:14-22`).
**Problem:** One Way. Note for Nathan's lens: **the closest existing thing to a disclosable List row is `BundleRowView` (nested rows, chevron riding the indent), not TableView's `DataRow`**, whose nesting comes from bands.
**Change (minimal form):** `RowRail` becomes a lead-cell component (`RowLead`: `data-cell cell-lead` + rail + rail-slot node + children, `rowIndent` folded into the same file), used by all three. Larger "row chassis" forms don't remove more than they add today.
**Delta:** ≈ −5, −1 file.
**Status:** Verified (duplication); Unverified (needs a live run) — the scout's inferred consequence that a pointer drifting into the ghost row's gutter drops its hover, since `GhostRow` has no rail.
**Judgment:** `RowLead` stands on today's three writings, not on List; the scout's "one row vocabulary for List" is a forward reason and doesn't count toward it (Decisions #5). At −5 it's a modest consolidation; it earns its place only if it absorbs both indent mechanisms or the ghost's missing rail, otherwise it's a component for its own sake.
**Overlaps:** 4 (F9 and §Placement put `rowIndent` beside the chevron in `UIX/Elements` instead — see Cross-Report Conflicts); 3 (§Keep, `GhostRow`/`DataRow` as genuine presentation); 8 (F4, `.data-row`/`.data-cell` pinned by tests and drives).

##### F7 · `table-view.css` Is Two Sheets, and Archive Wears the Wrong One

**There:** ArchiveView imports `../Views/Table/table-view.css` (`ArchiveView.tsx:21`) and wears `table table-view` (`:67`) for the shell (`table-view.css:3-28`); the rest (hide/slide, `cell-sweep`, band rhythm) is TableView's. `.row-grip` is placed in `table.css:199-210`, faded in `table.css:218-221`, and colored/cursored in `table-view.css:45-52` — one selector, two files. Archive never sets `.overflowing` (only `useColumns.ts:163-181` measures it, applied at `TableView.tsx:284`), so its right inset never drops when it scrolls sideways.
**Problem:** Clearer Boundaries, Less to Understand. A Bundles/Archive file reaches into `Views/Table` for its shell; ArchiveView wears a class named after a renderer it isn't.
**Constraint:** the shell can't go to UIX — it reads `--content-inset`, which Core defines (`Core/Interface/styles.css:57`) and nothing in UIX reads; UIX reaching it breaks "UIX reaches nothing outside itself."
**Change:** The shell rules (3-28) stay in Core under a shell class both surfaces own (e.g. `.table-shell`; name for Nathan), either kept in `table-view.css` with Archive's cross-import accepted and its header saying so, or in a Core-level sheet neither renderer's folder owns. `.row-grip`'s look joins its slot rule in `UIX/Table/table.css` (no Core vars involved). **Placement for Nathan.**
**Delta:** ≈ −3. A move.
**Status:** Verified (shell, constraint, and `.row-grip` split); Unverified (needs a live run) — the Archive right-inset divergence when it scrolls sideways.
**Overlaps:** 7 (F1 moves the tile's `${body} .table-view` zoom and padding rules into each renderer's own stylesheet; a renamed shell class changes that selector, so the two land together); 8 (F11, `.table-view` in drives).
**Outside Domain:** `interface.css:58` keys on `.table-head` (unchanged); `view-tile.css.ts:140` keys on `.table-view` for the embed zoom; Archive Drive's `.table-view .data-row` (`live-drive.mjs:1248`).

##### F8 · BundleTable Borrows Views' Column Pieces

**There:** `COLUMN_LAYOUT` imported from a hook file (`BundleTable.tsx:34, 120-124`) to restate the title-takes-slack track rule (`useColumns.ts:158-161`) — `minmax(<w>px, 1fr)` written twice. `useNexusForms` imported from `Views/Host/useColumnStyles` (`BundleTable.tsx:28`); `useDateColumn` re-composes `dateDefaults` + `resolveStyle` + `storedPick` (`:64-97`) as `styleFor`/`pickedStyle` do (`useColumnStyles.ts:21-42`), differing only in where the stored record lives (personalization vs `column_styles`) and in the default `time_format`.
**Problem:** "Borrowing pieces out of TableView" verbatim; `useColumnStyles.ts` is named as a hook but is mostly pure resolvers, consumed by `useViewHost`, PropertyFrame, Filter/GroupFrame, useBandHeads, and Bundles.
**Change:** `useColumnStyles.ts`'s contents join `Core/Properties/columnStyles.ts`, where `resolveStyle`/`storedPick` already live (**placement for Nathan; Host scout's ground**). `COLUMN_LAYOUT` stays Table-owned; the bundle table's use of the title floor is a legitimate "match TableView" and not worth a helper.
**Delta:** ≈ 0 to −5.
**Status:** Corrected — the consumer list omitted `useViewHost.ts:32`; otherwise verified. This finding's Change only moves the file and leaves `useDateColumn`'s re-composition in place.
**Overlaps:** 1 (F9 — the stronger version: it also has `styleFor`/`pickedStyle` take a defaults override so `BundleTable` stops re-composing); 6 (F11, a third proposed home).

##### F9 · Small Cuts in TableView and `useColumns`

- `hide_page_icons` read per row (`TableView.tsx:248`) and again at `:218` — hoist once. −1.
- `DataRow` uses `useLineRow` + spread (`:430, 433-438`) where `BundleRowView` uses `<LineRow>` (`BundleTable.tsx:258`) for the same thing — one form. −2.
- `DragShift` and `ColumnDrag` (`useColumns.ts:91-92`) are one drag; `ColumnDrag` alone suffices. −1.
- Naming cuts in §Names. Net ≈ −5.

**Status:** Verified.
**Overlaps:** 3 (F8 lists the same `hide_page_icons` double read).

##### F10 · `ROW_H = 29.75` Hard-Codes a Measured TableView Row

**There:** `BundleTable.tsx:107-108` fixes the bundle rows' height (`:264`) and the virtualizer's (`:178`) to TableView's row as measured live, which is padding + body line + hairline from `table-tokens.css`.
**Problem:** A token change silently desyncs the two tables. It's also the only fixed-height assumption beside the Wrapped Table Cells brief's "rows already follow their content".
**Change:** None now; name the dependency where the tokens live, or derive it when a second virtualized row surface (List) needs the same number. 0.
**Status:** Verified. **Reconciler-Found:** the Archive Drive pins the same number — `live-drive.mjs:1740` asserts every Trash row measures 29.75 — so a token change breaks the drive as well as the virtualizer.
**Overlaps:** 4 (§Insights repeats this; this finding is the home).

**Domain Total:** ≈ −110 to −150 production lines if F1-F4, F6, F9 land; F5, F7, F8 are moves. F1 and F2 carry most of it.

---

#### 3. Names

| Now | Problem | Proposed |
| --- | --- | --- |
| `collapsing` / `hideColumn` / `commitHide` → returned as `hiding` (`useColumns.ts:111, 207-214, 350`) | One state, two words; "collapse" already means band collapse on the host | `hidingId` throughout |
| `reflowWidth` (`useColumns.ts:155`) | It's the column sum, not a reflow | `gridWidth` |
| `cols` / `--cols` (`:159`, `table.css:7`) | It's the track list | `tracks` / `--tracks` (CSS var is code, not persisted) |
| `indent` vs `rowIndent` vs `memberIndent` vs `padLeft` (`TableView.tsx:212, 229, 240`) | Four names for indentation | `looseIndent` for the tail form; drop `memberIndent` (Report 4 F1 gives the member rule one owner) |
| `lead` (`row-lead` = no top border) vs `cell-lead` (= first column cell holding the rail) | One word, two meanings | `row-first` for the border rule |
| `cellSweep.ts` exporting `useCellSweep` | File/export mismatch (`useColumns.ts` matches its hook) | `useCellSweep.ts` |
| `table-view` class worn by ArchiveView | Names a renderer Archive isn't | Shell class per F7 |
| `BundleRowView` | "View" suffix only dodges the `BundleRow` type | `BundleLine` or keep; low priority |
| `useColumnStyles.ts` | Hook-named file of pure resolvers | Folds per F8 / Report 1 F9 |

---

#### 4. Placement *(every move is a proposal)*

- Property-cell CSS: `UIX/Table/table.css:222-321` → `Core/Properties/Cells/cells.css` (F5).
- Table shell: `Core/Views/Table/table-view.css:3-28` stays in Core (reads Core's `--content-inset`) under a shared shell class, in `table-view.css` or a Core-level sheet (F7); `.row-grip` look (`table-view.css:45-52`) → beside its slot rule in `UIX/Table/table.css`.
- `.col-measure` (`table.css:21-33`): single consumer `DateHeading` → `bundle-table.css`.
- `UIX/Table/RowRail.tsx` + `rowIndent.ts` → one file (F6; contested by Report 4 F9).
- `ColumnHeader.tsx` → deleted, its gesture into `useColumns.ts` (F2).
- `useColumnStyles.ts` → `Core/Properties/columnStyles.ts` (F8; Host scout's call).
- `.cell-rename` (`table.css:90-97`) is TableView-only today; stays in UIX only if List renames titles in-row, otherwise `table-view.css`.

---

#### 5. Becomes False

- **ViewTypesPM §Table** — "the cell renderers live in `UIX/Table/`" (line 79; already false; F5 makes the CSS half false too).
- **ViewTypesPM** line 83 — "a trailing filler track … Every column, including the title, maintains its resolved width": already false since `3b9a119e5` (Title takes the slack, `useColumns.ts:158-161`).
- **ViewTypesPM** line 87 — "one source (`useColumns.ts`, which also holds … the reorder helper …)" (F4).
- **ViewTypesPM** line 95 — "TableView adds its own layer over it, `table-view.css`, which ArchiveView wears too" (F7); line 103 lists `--labels-gap` as a table token, which lives on `:root` in `UIX/Labels/label-base.css.ts:127` (already false).
- **PommoraUIX.md:393** — `UIX/Table/` contents and "the cell content types" (F5, F6, F7).
- **Comments:** `table-view.css:1`, `ArchiveView.tsx:25` ("on TableView's sheet"), `BundleTable.tsx:56, 107, 110, 133`, `useColumns.ts:1` (reorder helper), `table.css:1, 21`.
- **Tests:** `useColumns.test.ts:4, 121-151` (F4); `BundleTable.test.tsx:19, 251` (`DateHeading`, F1); `ArchiveView.test.tsx:153-154`, `TrashFrame.test.tsx:103` (heading markup, F1); `bandCommits.test.tsx:847` stays true if `.col-resizer` keeps its name.
- **View Tiles:** `Core/Tiles/Surfaces/view-tile.css.ts:140` (`${body} .table-view` zoom rebind) if the shell class is renamed (F7).
- **Drives:** `Archive Drive/live-drive.mjs:591` (`.trash-head.table-head`, `.trash-head-name`, `.trash-head-date`), `:631-640, 1722` (`.trash-head-date`), `:1222` (`.col-header.archive-date`), `:1248` (`.table-view .data-row`), `:1740` (row height 29.75, F10); `drive-harness.mjs:341` stays true (`.data-row`).
- **Planning (historical, low priority):** *Disclosable Bundles — Plan* glossary rows for `rowIndent`/`RowRail`/`BundleTable`/`DateHeading`; *Wrapped Table Cells — Brainstorm Brief* cites `WIDTHS in useColumns.ts:32-45` (already stale: it's `COLUMN_LAYOUT`, `:36-50`) and `table.css:76-83`.

---

#### 6. Keep

- **`useColumns`' hook body, `gapShift`, hide/slide, the overflow check, `cellSweep`** — all column-grid behavior a columnless List never needs; correctly Table-owned. `cellSweep` shares nothing real with MarkdownPM's shape-sweep (`MarkdownTable.tsx:156-203`), and MarkdownPM's boundary-sharing resize (`:370-405`) has different semantics from `ColumnHeader`'s.
- **`BundleTable` as a separate table from TableView** — deliberate (`312d63751`, `8c9bc6a75`): virtualized, checkable, store-backed rows with no columns to configure. It shares TableView's row *look*, which is what F1/F6 consolidate.
- **`.table` host rebinding** (`trash-frame.css:1-4`, `view-tile.css.ts:157`) — the designed mechanism, not duplication.
- **`COLUMN_LAYOUT` in `useColumns.ts`** — a Table layout fact; splitting the pure layout into its own file adds a file for a test-only boundary.
- **`useVirtualRows` / `lineList` / `LineRow`** — already shared UIX row infrastructure. BundleRows' dummy `lineList({ locked: true, commit: () => {}, … })` (`BundleTable.tsx:183`) is the price of the keyboard. **Corrected:** structurally it stays, but it carries I-059's accessibility drift — each row still points screen readers at the drag instructions while Space checks it (`IssuesPM.md:1075`); see Report 8 for how I-059 folds.
- **NavList** — a flat pins/recents list on `MenuItem` (`NavList.tsx:95-127`), not a tree, already on the shared line engine; not a table-row sharing candidate. Its glance-on-hover (`:113-117`) restates `rowHover`'s glance half (`useViewInteractions.tsx:62-69`), as do NavGallery and TabItem — a Navigation item, not a table one.
- **`renderRows` recursion** — the row-generic half a List lifts (band nesting, `memberDepth`, collapsed visibility, `lead`, ghost slot: `TableView.tsx:224-278`), but extracting it before List exists adds an abstraction with one consumer. Leave it in place and name it as List's lift point (agrees with Report 4 F1; Report 3 F7 contests — see Cross-Report Conflicts).

---

#### 7. Insights & Concerns

- **Disclosure-state holders:** Report 4's §How Many Implementations counts six row-level encodings (this report's three are a subset); a List with disclosable rows needs the plan to name which one rows use. Report 4 F2 holds the consolidation.
- **TableView doesn't virtualize; BundleRows does with a fixed height.** If List virtualizes, `ROW_H` (F10) becomes a shared constant, and that collides with the Wrapped Table Cells brief's content-height rows; the plan shouldn't decide either way now.
- **`UIX/Table` as a name:** after F5-F7 it holds the token scope, grid chrome, and row chrome a List would wear. `.table` already acts as the "rows + grid" scope (group-band.css falls back on `--cell-icon-gap` outside it, `group-band.css:21, 33`; `--row-indent` exists only inside it, `table-tokens.css:8`); keeping the name and having List wear `.table` is cheaper than splitting the folder.
- **`--loose-inset`** is a UIX token with one Core consumer (`TableView.tsx:213`); fine in the token sheet. Its drop-line consequence is Report 4 F1.
- **Archive overflow:** if F7 moves the shell, decide whether the overflow measurement (`useColumns.ts:163-181`) also becomes shell behavior so Archive's sideways scroll matches TableView's edge; today it's TableView-only.

---

#### Removed

- **F11 · Ungrouped Rows' Drop Line Starts 8px Left of Their Content** — duplicate of Report 4 F1, which names the owner for the member-indent rule; the measurement is corrected there (the tail lane's line sits 6px left of its content while band members' lines sit 2px right of theirs, an 8px relative divergence).

#### Cross-Report Conflicts

- **Page Rename (2 F3 · 3 F1 · 8 F10 · 1 §Insights):** Three fixes. 3 F1 puts every view title on today's path-keyed fence (fixing Cards' flash, accepting the first-come twin risk); 2 F3, 8 F10, and 1 converge on an ID-keyed claim. The code shows the fence is path-keyed (`editSlice.ts:16, 66`) and that neither renderer currently opens its create-rename before the reply (`useViewCreation.ts:155-159`), so 3 F1 regresses nothing today; it does move the Table onto the key I-040's solution replaces and loses the Table's per-instance precision. The ID-keyed direction holds against I-040's proposed solution; 3 F1 holds the most complete map of the mechanisms. For Nathan: unify on one fence that claims by ID, landing with I-040.
- **`rowIndent` Placement (2 F6 vs 4 F9):** 2 folds `rowIndent` and `RowRail` into a Table-owned `RowLead`; 4 moves `rowIndent` beside the chevron in `UIX/Elements` because "Bundles and a List aren't Table." Today both consumers are `.table` surfaces (`TableView`, `BundleTable`), and `--row-indent` only resolves inside `.table`, so 2's placement matches current use. 4's token change (read `--disclosure-indent` directly) is independent and valid either way, and is what would let `rowIndent` leave Table. Present both to Nathan; 2's is better evidenced for today.
- **Column Styles (2 F8 · 1 F9 · 6 F11):** Three proposed homes for `useColumnStyles.ts`. 1 F9 is the only one that also removes `useDateColumn`'s re-composition; it holds. The placement is Report 1's ground.
- **Band Walk (2 §Keep · 4 F1 · 3 F7):** Two of three defer extracting `renderRows`; 3 F7 adds a walker now at ≈ +3. Removal-first and "nothing designed around shapes that will change" favor deferring.
- **`reorderColumns` (2 F4 · 6 F8 · 8 F5):** Compatible. 6 F8 moves `placeInShown` into `Pipeline/columns.ts`, so F4's import follows it. 8 F5 lists `reorderColumns` among exports to keep tested; it's a duplicate rather than a seam, so F4's removal holds and 8's Keep applies to `minWidthFor`/`clampWidth`/`alignFor`.
