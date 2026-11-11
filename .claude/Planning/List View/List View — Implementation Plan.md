## List View — Implementation Plan

**DATE:** 11-09-2026
**STATUS:** Ratified 11-10-2026
**SOURCE:** *List View — Decisions & Intention* (ratified 11-09-2026; it holds wherever another document disagrees), *List View — Brief* (Nathan's words, verbatim), *List View — Investigation* and *List View — Scout Findings* (the code at `4b18149ac`, re-read first-hand for every task below), *List View — Fresh-Eyes Read*, *List View — Live Checks* (the checks of 11-09-2026 the plan builds on), and *List View — Plan Reviews* (the three review waves).

**BASELINE** (filled after ratification; the end logged in the final report)

| Head | Tests | Start | End |
|------|-------|-------|-----|
| `b43de2c4a` | 9,269 passed, 2 skipped (546 files) | 11-10-2026 | |

The drives at that head: Views `--landed 10`, groups 2 to 10, 215 of 215 held (12, 38, 11, 18, 21, 25, 22, 28, 40); Properties, groups 1 to 19, 209 of 209; Text Property, 127 of 127; Option Picker, 58 of 58; Archive, 159 of 159. Typecheck and lint ran clean.

### Context

A view is a saved presentation of a Collection's or Set's pages. Six kinds are registered in `VIEW_KINDS` (`Core/Views/views.ts:26-33`); Table and Cards have renderers, and a view saved as any other kind draws as a Table (`presentedKind`, `Core/Views/Host/viewKinds.ts:30`) while its picker tile does nothing (`Core/Views/Settings/LayoutFrame.tsx:33`). Each built kind is one record naming its renderer, whether its bands nest, its switches, and its rows, and every renderer mounts through one host (`useViewHost`, `useViewInteractions`) that supplies the pipeline, bands, creation, drops, the value seat, and view persistence. A kind whose record says `nests: true` groups, sub-groups, sorts by Location, and takes band drops exactly as Table does.

`UIX/Table/` already shares the styling half of Table's row: the lead cell (`RowLead`), the indent step (`rowIndent`), and the grip's and rail's rules (`table.css`). `TableView.tsx` keeps the composition to itself: the row shell with its grip, the title markup, the ghost row, and the walk that lays rows inside bands (`TableView.tsx:109-160,217-393`), and Table's sheet holds the shell geometry that ArchiveView imports across folders (`Core/Archive/ArchiveView.tsx:14`). A clickable value is written out twice, on Cards and in the Properties panel (`CardsView.tsx:534-560`; `PropertyPanel.tsx:251-268`), and Cards' rules for adding, showing, and hiding a property are Cards' own policy (`CardsView.tsx:145-170`; `Cards/cardColumns.ts`). A view's properties share one order, `property_order`, with `hidden_properties` flagging the hidden ones; a reorder writes the shown properties first and appends the rest (`placeInShown`, `Core/Views/Pipeline/columns.ts:101-113`), so a hidden property loses its place at the next reorder.

### Overview

List becomes Pommora's third view kind with a renderer. A List row is Table's row without cells: one lead cell holding the grip and a row line, the line a left group (the title and the values beside it) and a right group flush to the row's edge, with a bar between properties and a hover **+** that opens the add list. Each property has a side, stored per view over a default for its type, and List's property pane shows the two sides as two columns that trade rows by displacement. Three switches, Title Icons, Outlines, and Wrap Rows, sit at the root of the view editor. Bands, grouping, filtering, sorting, creation, and drag come from the host unchanged.

The work shares what Table, Cards, and the Properties panel each hold privately rather than writing a third copy, and it lands in dependency order, removal first: a hidden property keeps its place through a reorder in every kind (Phase 1); the row frame and the shell sheet leave Table for `Core/Views/Rows/` (Phase 2); one clickable value, and Cards' add, show, and hide rules stated once on the host (Phase 3); the one hover **+**, the bar, a Link's per-view Format on right-click, and the grip on a row's first line (Phase 4); a per-id map's one registration, and the kind record naming its Visibility pane (Phase 5); the saved view's side map and two flags, the two-column pane, the renderer, and the registration that makes List's tile live (Phase 6); the Views Drive's List cases (Phase 7); and the documents (Phase 8).

**The System, Layer by Layer:**

- **The Property Order** (`Core/Views/Pipeline/columns.ts`): `placeInShown` places the dragged id in the whole order through `fullOrderIndex`, so every other id, hidden ones included, keeps its place, for Table's column drop, the Visibility pane, and List's pane alike (Phase 1).
- **The Row Frame** (`Core/Views/Rows/RowFrame.tsx`, `table-shell.css`): the band walk, the row shell, the grip, the title, the page menu's anchor, and the ghost row's shell are exports Table and List compose; the shell geometry, the heading's bleed, the grid's zoom, and the band rhythm are one sheet Table, List, and Archive wear. Table keeps its columns, cells, sweep, and its own three rules (Phase 2).
- **The Value** (`Core/Properties/Cells/SeatedValue.tsx`, `cells.css`): one component carries a value's click, right-click, editor swap, and `Cell`, for Cards, the Properties panel, and List; `.value-inline` is the box of a seat among others on one line (Phase 3).
- **The Rules** (`Core/Views/Pipeline/columns.ts`, `Core/Views/Host/useViewInteractions.tsx`): `drawnColumns` and `addColumns` sit in the pipeline; a kind states what an item draws and the host builds the commit that shows a property, the Remove that hides it, and the Add list (Phase 3).
- **The Shared Small Pieces** (`UIX/Menus/MenuRows.tsx`, `UIX/Elements/segment.css.ts`, `Core/Actions/`, `UIX/Table/table.css`): the band's, the panel's, and a row's hover **+** are one `AccessoryButton`; `Segments` draws in a flex row; a Link value's right-click offers its view's Format on both of its menus; the grip and the check sit on a row's first line (Phase 4).
- **The Saved View and the Record** (`Core/Views/views.ts`, `Core/Nexus/configReach.ts`, `Core/Views/Host/viewKinds.ts`): a per-id map registers once (`ENTRY_DEPTH`); the record names its Visibility pane (`Visibility`), and reads the one `TITLE_ICONS`; a kind's switches can ride its `rows` through `switchRows`, the one mapping from a switch entry to its row; the view gains `column_sides`, `hide_outlines`, and `wrap_rows` (Phases 5, 6).
- **List** (`Core/Views/List/`, `Core/Views/Settings/SidesFrame.tsx`): `ListView` composes the frame, the value, `Segments`, and the **+** into a row line of two groups, with the compact row height, the wrap order, the title's floor, the value maximum, and the outline rail as CSS on one sheet; `listSides.ts` holds the per-type defaults, a side's column, and what a drop writes; `SidesFrame` is two displacement zones over the row `VisibilityFrame` already drew; `listKind.ts` registers them (Phase 6).
- **The Drive and the Documents:** the Views Drive's group 11 re-runs List's cases and the regressions the shared pieces could cause; `ViewTypesPM.md` gains *§List* and its false sentences are replaced in place (Phases 7, 8).

**The Number:** measured by applying every AFTER block of Phases 1 to 6 to an export of the baseline during the plan's review, as `view-delta` counts a diff (blank lines in; comments, tests, and documents out), the phases add about 1,120 lines and remove about 505, roughly +615 net. Phases 1 to 5 add about 540 and remove about 395 (net about +145): the lifts are moves, and their surplus is the frame's seven exports with their prop lists (about +80), the shared value's own file (about +30), and the small types, forwarded attributes, and one record field the shared pieces take. Phase 6 adds about 590 and removes about 110: the renderer and its sheet (about 265), the two-column pane and its sheet (about 130), the side defaults and the drop rule (about 54), the record and `switchRows` (about 36), and the seams they plug into, against `VisibilityFrame`'s private derivation and `VisibilityGroups`, which leave. That is List itself, which nothing in the tree drew, and it is the whole of the gain: List writes no row shell, grip, title, ghost, band walk, value seat, add or hide rule, divider, property-pane derivation, or hover **+** of its own, each of which Table, Cards, the panel, or the Visibility pane held privately before. What leaves: `cardColumns.ts`, Table's private frame, Cards' policy, two hand-written value seats, `VisibilityGroups`, `.card-value`'s base rule, `.group-band-add`, `ENTRY_KEYS`, `SwitchEntry`, and ArchiveView's import of a kind's sheet. Each phase's measured delta is recorded in the Net Ledger, and growth past an estimate is reported with what it buys.

**Net Ledger** (the Actionable column of `view-delta --exclude .claude`, per phase, cumulative from the BASELINE head):

| Phase | Estimate | Measured | Cumulative |
| ----- | -------- | -------- | ---------- |
| 1 | +8 / −4 | +8 / −4 | +8 / −4 |
| 2 | +295 / −216 | +305 / −216 | +313 / −220 |
| 3 | +145 / −120 | +146 / −131 | +459 / −351 |
| 4 | +40 / −26 | +42 / −27 | +501 / −378 |
| 5 | +46 / −30 | +77 / −52 | +578 / −430 |
| 6 | +590 / −111 | +663 / −109 (with the owner's additions after the Stop) | +1,239 / −537 |
| 7 | — (the drive, under `.claude`) | — | +1,239 / −537 |
| 8 | — (documents) | — | — |
| Final Verification (B-13, the matrix's app fixes, the lens, the adversarial fixes) | — | +88 / −62 | +1,276 / −548 (net +728) |

#### Concepts

**ADDED**

| Concept | Description | Location |
| ------- | ----------- | -------- |
| `Rows` • Folder | The row frame and shell sheet Table, List, and Archive share. | `Core/Views/Rows/` |
| `RowFrame.tsx` • File | The row frame's seven exports, moved out of `TableView.tsx`. | `Core/Views/Rows/RowFrame.tsx` |
| `BandRows` • Component | The walk that lays rows and the hover ghost inside their bands, taking a kind's row and ghost. | `Core/Views/Rows/RowFrame.tsx` |
| `PageRow` • Component | A page's row shell: the line row, its selection, hover, and `data-rid`. | `Core/Views/Rows/RowFrame.tsx` |
| `rowMenu` · `rowOpen` • Functions | A row's page menu, anchored on its title's glyph, and its title's press that opens the page. | `Core/Views/Rows/RowFrame.tsx` |
| `RowGrip` · `PageTitle` • Components | The grip in the rail slot, and the page icon with its renamable title. | `Core/Views/Rows/RowFrame.tsx` |
| `GhostTitle` • Component | The hover ghost's "New Page" title; the ghost's shell is the walk's own. | `Core/Views/Rows/RowFrame.tsx` |
| `table-shell.css` • File | The shell, the heading's bleed, the grid's zoom, and the band rhythm. | `Core/Views/Rows/table-shell.css` |
| `SeatedValue` • Component | One property's value where it's clicked, right-clicked, and edited. | `Core/Properties/Cells/SeatedValue.tsx` |
| `.value-inline` • Class | The box of a seat among others on one line. | `Core/Properties/Cells/cells.css` |
| `drawnColumns` · `addColumns` • Functions | What an item draws beside its title, and what its Add list offers; `shownColumnsFor` and `cardAddColumns` under new names. | `Core/Views/Pipeline/columns.ts` |
| `addable` • Function | Whether an item's Add list would hold anything, by count. | `Core/Views/Pipeline/columns.ts` |
| `seatOf` • Function | The seat a gesture inside a value anchors to. | `Core/Properties/Cells/SeatedValue.tsx` |
| `ValueSeatApi.commit` • Field | The seat's own commit, which a seated value writes through. | `Core/Properties/Pickers/ValueSeat.tsx` |
| `seat.drawn` • Policy Field | What a kind's items draw, from which the host builds the add, show, and hide rules. | `Core/Views/Host/useViewInteractions.tsx` |
| `tabIndex` · `data-reveal-held` • Forwarded Attributes | `AccessoryButton`'s tab stop and held reveal. | `UIX/Menus/MenuRows.tsx` |
| `ENTRY_DEPTH` • Constant | The saved view's per-id maps and their merge depth, in place of `ENTRY_KEYS`. | `Core/Views/views.ts` |
| `ViewSwitch` • Type · `TITLE_ICONS` • Constant | A flag as a kind's switch draws it, in place of `SwitchEntry`, and the one Title Icons entry. | `Core/Views/Settings/switchRows.ts` |
| `Visibility` • Record Field | The kind's Visibility pane. | `Core/Views/Host/viewKinds.ts` |
| `switchRows` • Function | A kind's switch entries as rows; `kindSwitches`' inline mapping as an export a record can import. | `Core/Views/Settings/switchRows.ts` |
| `SIDES` • Constant · `Side` • Type | Left or right. | `Core/Views/views.ts` |
| `column_sides` · `hide_outlines` · `wrap_rows` • Saved-View Fields | A property's side per view, and List's two flags. | `Core/Views/views.ts` |
| `List` • Folder | List's renderer, record, side rules, and sheet. | `Core/Views/List/` |
| `ListView` • Component | The List renderer. | `Core/Views/List/ListView.tsx` |
| `LIST_KIND` • Record | List's kind record. | `Core/Views/List/listKind.ts` |
| `sideFor` · `sideColumn` · `sideDrop` • Functions | A property's side, a side's column of the pane, and what a drop into it writes. | `Core/Views/List/listSides.ts` |
| `list-view.css` • File | The row line, the compact row padding, the title's floor, the value maximum, and the outline rail, with `--list-view-value-max`, `--list-view-title-min`, `--list-view-wrap-gap`, and `--list-view-bar-width`. | `Core/Views/List/list-view.css` |
| `SidesFrame` • Component | List's property pane: two columns that trade rows. | `Core/Views/Settings/SidesFrame.tsx` |
| `sides-frame.css.ts` • File | The two columns' layout. | `Core/Views/Settings/sides-frame.css.ts` |
| `visibilityPane` • Function | What a view's property pane lists: its shown and hidden columns, their names, the hide toggle, and the row; `VisibilityFrame`'s inline derivation as an export both panes read. | `Core/Views/Settings/VisibilityFrame.tsx` |
| `VisibilityPaneProps` • Type | A Visibility pane's props, named once. | `Core/Views/Settings/ViewPane.tsx` |
| `--band-indent` • Variable | A headed band's indent, in place of its row's inline padding. | `Core/Views/Bands/GroupBand.tsx` |
| `--pen-span` • Variable | The pen's room, named once: shown on hover everywhere, held at rest on a List row. | `Core/Properties/Cells/cells.css` |
| `--row-first-line` • Variable | The height of a row's first line, which the grip and the check center on; List states it. | `UIX/Table/table.css` · `Core/Views/List/list-view.css` |
| **Outlines** · **Wrap Rows** · **Left** · **Right** · **Move to Left** · **Move to Right** • Strings | List's two switches, its pane's headings, and a pane row's menu. | `listKind.ts` · `SidesFrame.tsx` |
| Group 11 • Drive Group | List's live cases and the regressions the shared pieces could cause. | `.claude/scripts/Views Drive/` |

**REMOVED**

| Concept | Description | Location |
| ------- | ----------- | -------- |
| `cardColumns.ts` · `cardColumns.test.ts` • Files | Cards' column helpers and their test, moved to the pipeline. | `Core/Views/Cards/` |
| `renderRows` · `GhostRow` · `titleGlyph` · `ghostRowProps` • Private to Table | The band walk, the ghost row, and the menu anchor, now the frame's. | `Core/Views/Table/TableView.tsx` |
| `commitOnCard` • Function | Cards' reveal-on-commit, now the host's. | `Core/Views/Cards/CardsView.tsx` |
| `seat.commit` · `seat.add` · `seat.hide` • Policy Fields | A kind's own add, show, and hide rules. | `Core/Views/Host/useViewInteractions.tsx` |
| `.card-value` (base rule) • Class Rule | The inline seat's box, now `.value-inline`. | `Core/Views/Cards/cards-view.css` |
| `.group-band-add` • Class | The band **+**'s own color rule. | `Core/Views/Bands/group-band.css` |
| `ENTRY_KEYS` • Constant | The per-id maps' first registration. | `Core/Views/views.ts` |
| `SwitchEntry` • Type | The record's private switch type. | `Core/Views/Host/viewKinds.ts` |
| `VisibilityGroups` • Component | The Visibility pane's private row and groups, now `visibilityPane` and two inline groups. | `Core/Views/Settings/VisibilityFrame.tsx` |
| ArchiveView's import of `table-view.css` • Import | A surface wearing a kind's sheet. | `Core/Archive/ArchiveView.tsx` |

#### Constraints

- **Nathan's Directives:** the block below is Nathan's words, verbatim, from *List View — Brief*. Every handoff this work produces, for compaction, execution, or review, repeats the whole block; a summary isn't a substitute. Its Approach and Principles govern every phase and task, and every agent brief on this plan, for executors and reviewers alike, carries both sections in full.
- **Gates:** `npm run typecheck`, `npm run test`, and `npm run lint`, from the repo root; each prints its own failures, and lint runs clean. Biome formats every TS, CSS, and JSON write, so an edit failing on whitespace means it reformatted: re-read and retry. "Run the gates" in a task means these three. A phase that changes a `*.css.ts` file or a `createGlobalTheme` contract also runs `npm run build` and reads `✓ built in`.
- **Frozen:**
  - Every entry of *List View — Decisions & Intention* and its *§Rejections*; a ratified decision changes only on Nathan's word.
  - The drag engine (`UIX/Interactions/engine.tsx`, `gesture.ts`, `reorderModel.ts`, `lineList.ts`): the two-column pane composes it, and its one change is the room a landing zone grows by, which reaches a column's zone as it reached a grid's (E-10).
  - Table's column machinery (`useColumns.ts`, `useCellSweep.ts`), `column_alignments`, the fallback for a kind without a renderer (A-3), and the two embed-zoom variables.
  - Archive's and Trash's rows, and Table's cells as they mount a value (I-7).
  - `Core/Sync/`, `Desktop/`, and Project Sapphire.
- **Removal First:** every phase removes, merges, or replaces before it adds, and nothing is added unless its absence would leave a real gap. Every removal task lists its consumers.
- **Comments:** a new file carries section dividers in the form Table's and Cards' files use (`// ── The render ──`) and little else. A comment is written or kept only where it states a rule the code doesn't, gives a lint suppression its reason, or marks a KNOB; none restates a name or narrates the change, and a moved comment moves with its code.
- **Placement:** *List View — Decisions & Intention §J* is what Nathan approved: `Core/Views/List/`, `Core/Views/Rows/`, `Core/Properties/Cells/` for the clickable value, `Core/Views/Pipeline/columns.ts` for Cards' column helpers, `Core/Views/Settings/` for the two-column pane, and `Core/Views/views.ts` for the saved-view fields. The files this plan names inside those homes are listed under *§Open Items · Placements for Nathan*; a file anywhere else is not written without his word.
- **Shared First:** nothing is built for List alone where Table, Cards, the Properties panel, or the kit already carries it or should. A piece List needs that another surface holds privately is lifted, not copied.
- **Behavior Changes Outside List:** named, not folded in. (1) A hidden property keeps its place through a reorder in Table, Cards, and the Visibility pane (E-6; inverts `columns.test.ts:234-241`). (2) A Link value's right-click offers its per-view Format in every view (C-4). (3) The band's **+** is an `AccessoryButton`, so its hit box is a 20px square where it was 17px wide (I-3). (4) A value in the Properties panel takes 12px of travel, not 5px, before its row lifts, since the shared value carries `data-drag-slop`. Nothing else outside List changes behavior; a task that finds otherwise stops and reports.
- **The Number:** every phase's VERIFY runs `python3 ~/"The Studio/.claude/scripts/view-delta/view-delta.py" <from>..<to> --exclude .claude --save <scratch>/phase-N.md`, `<from>` being the previous phase's last commit and the BASELINE head for Phase 1, and records the saved table's **Actionable** cell in the Net Ledger beside the phase's estimate, removals and additions apart. A phase that lands above its estimate is reported in chat before the next phase opens, with what the increase buys against the Principles.
- **Conventions:** finite states are unions plus exhaustive switches; no measuring, allocating, or layout-reading work runs per row on a high-frequency trigger, and wrapping is the browser's own layout (the Decisions' **Cost** constraint); UIX reaches nothing outside itself; host-run code imports no React or UIX, and `Core/Contract/engineGraph.test.ts` and `Desktop/hostGraph.test.ts` stay green; a `*.css.ts` file exports only serializable values; a test that changes asserts the behavior a decision names, and a test whose body inverts takes a title stating what it now asserts; user-facing words are the ones the decisions quote (**Title Icons**, **Outlines**, **Wrap Rows**, **Left**, **Right**, **Move to Left**, **Move to Right**); commit messages are past tense and one to three sentences; nothing temporary, transitional, or compatibility-kept remains at a phase's end.
- **Execution:** the plan runs end to end through `c/plan-execution`. Each task goes to an `execution-agent` (`opus-medium`) given *§Context*, *§Overview*, *§Constraints* with the Directives block, *§Open Items · Settled in Planning*, and the path of *List View — Decisions & Intention*, whose IDs the tasks cite; it reports insights, concerns, and suggestions rather than diverging, and the orchestrator checks its result against the task's AFTER and VERIFY. Each task commits once its gates are green, and commits on `active` are hook-pushed, so no task ends red. Every review checkpoint dispatches two read-only agents, one under `code-simplification` and one under `adversarial-review`, each weighing the phase against these constraints and reading outward rather than in isolation, with no implementation running meanwhile; the orchestrator verifies each finding against the tree before it folds. An in-flight call is weighed against the Approach and Principles, disclosed in chat, and recorded under *§Deviations* only where it changes an outcome. Each compaction checkpoint in *§Process Overview* runs `c/pre-compaction`; on the re-prompt the orchestrator rereads *§Constraints* and `c/plan-execution` from the files themselves before the next phase opens.
- **Live Driving:** `.claude/Guidelines/Development-Environment.md` is required reading before the app is driven. A live check runs in a scratch instance on its own `POMMORA_USERDATA` and `POMMORA_DEBUG_PORT` over `~/Test`, backs `~/Test` up first, and restores it after; every fixture, process, and temporary file is removed as part of the check. `~/Test` seeds no properties, one Cards view, and nothing archived or trashed, so a check seeds what it reads after the backup: the Views Drive's `VD Stage`, `VD Done`, and `VD Due`, a Link, a Text, a Number in its bar look, and a Context value on Collection A's pages; a Table view and a grouped Table view beside its Cards view; one archived and one trashed page. A check that compares against a task's base captures its "before" ahead of the task's first edit.
- **Tuned Live With Nathan:** `--list-view-value-max` (200px), `--list-view-title-min` (120px), `--list-view-wrap-gap` (14px), and `--list-view-bar-width` (100px) are tokens on List's sheet, the row's padding is Table's `--cell-padding-y` stated there at 2px over a first line as tall as the kit's roomy chip (a 26px row), and the bar's height (`1.2em`) is one literal on the shared segment; the plan lands them at these values and Nathan adjusts them in the app at the Stop after Phase 6.
- **Neutral Gate:** the work ends with a `fable-high` neutral reviewer given only the BASELINE head, HEAD, and this intention, with no plan, log, or document: *"Pommora drew a saved view as a Table or as Cards; a view saved as a List drew as a Table. Table kept its row's composition to itself, a clickable property value was written out separately on Cards and in the Properties panel, Cards owned the rules for adding, showing, and hiding a property, and a hidden property lost its place whenever the others were reordered. This work makes List a third renderer: Table's row without cells, the title and each property's values side by side in a left group and a right group, each property's side stored per view over a default for its type and edited in a two-column pane, with switches for title icons, outlines, and row wrapping. It builds List from pieces lifted out of Table, Cards, and the panel rather than copies of them (one row frame, one clickable value, one statement of the add, show, and hide rules, one hover plus), deliberately leaving Table's own cells and the Archive's and Trash's rows on their existing code for a later change, makes a hidden property keep its place in every kind, and offers a Link's per-view format on right-click everywhere, with each rule stated once and nothing left over."* It answers, without hedging, whether the result holds to every principle in the Directives block and what it would correct. Every phase is written so that review passes.
- **Out of Scope Everywhere:** folding Archive's and Trash's rows into the row frame and Table's cells into the clickable value (I-7; *§Reconciliation* raises each as an `IssuesPM.md` entry once List's design is confirmed in the app); Gallery, Calendar, and Timeline (A-3); every entry under the Decisions' *§Prospects* (wrapped titles, values wrapping within a side, wrapped Table cells, Flatten, virtualized rows).

##### Nathan's Directives (Verbatim)

**For This Session (11-09-2026):**

> I want you to write a handoff prompt that captures my directives and allows you to best complete headless and unatended end-to-end planning and reviews. Each phase and task's are investigated by the code yourself, and written yourself; agent's do reviews, syntehsis and cross-source elimination. Just like both views existing files, comments stay very, very brief and minimal; mostly file-level format sectioning. Documentation changes should be surgical, the Archive section of Collections was written by me, so that's good reference. Describe the feature in enough detail without over-detailing the code or things that dont actually matter, net-negative edits to adjacent claims are encouraged. Weigh in-flight decisions against approach and principles, make the best choice, and make the choice known In-chat if you'd think its something I'd reasonable want to change -- don't obsess over things I couldnt care less about. When the session of planning and review is done, give me the full plan summary + the same "outside-perspective" yet detailed overview of what gets built. If anything genunelly needs my decision, make it known, and also ensure its alternatives have been properly scoped so you know if its even worth mentioning at all. Use the multi-wave review process. Every future handoff must carry my directives. Use the send notification tool at key moments.

**Constraints:**

- Any planning must include removal-first emphasis. We’re tackling cross-feature work that likely has room to result in “less” within other areas. Nothing is added unless it’s determined its own absence would leave a real gap.
- Nathan's <approach> and <principles> govern every phase and task, and every agent brief on this topic — scouts, executors, and reviewers — carries both sections in full.
- And any and all placements of these files would need to come to me first so I approve of where they go within the codebase.
- Nothing here should be designed in isolation where it should actually adhere to the shared-first design priorities of the remaining view structure.
- Documentation changes should be surgical and follow `c/studio-documentation`. ListView is the least unique of the view types, so its own doc and mention within others should be feature-overview-level and quite brief in comparison.

**Approach:**

- Any approaches being considered here must first assess what’s true *now* that would be able to be removed, deleted, changed, consolidated, or replaced. We’re not going to design based on what’s currently there and simply adjust course, we’re ensuring totality-first application, removal-first scoping, and residue-eliminating frameworks that provide a clean slate rather than building changes on top of what’s ultimately going to be replaced.
- We’re approaching this through consolidation-first properties, ensuring the codebase ends up more understandable, less complex, more efficient in what it does, less conflicting in defining that, and an overall cleaner foundation to work within.
- We shouldn’t adding anything new unless there’s evidence that it’s required. We’d approach this through the perspective of ending up with cumulatively “less stuff” in the codebase overall — less ways to do similar things, less complexity, fewer paths to go through, less tech debt waiting to surface, less things to maintain, and fewer headaches when approaching future work entirely — while the line-count *may* end up positive. Net-negative lines are the north star, but any net-positive gain *must* have its rationale for that outcome be genuinely backed through this framework and our <principles>.
- Anything within our surface area should be left reading as always-intentional, without any odd-ones-out designs, and be reflective across the broader codebases' resulting shape — not just maintaining remnants or adherence to what’s true *now* that’s ultimately going to change. The approach should reflect the outcome and shouldn’t be bound to constraints that were only relevant before.
- Ensure we're looking *outward* for cross-file opportunities and shared design, avoiding hand-rolling or duplicating what's already there or can be adjusted accordingly. Pommora is an established codebase and we’re not starting from scratch.
- The complex data-level mechanics of the codebase are what least reflect *Nathan’s* intentions and are primarily reflective of what’s determined appropriate via past session agents. Treat it with care and respect, but don’t assume it’s beyond changing within reason, where simply presenting the approach to Nathan may be all that’s required to genuinely change the codebase for the betterment of everything within it and future iterations.

**Principles:**

- **Less to Carry:** No more functions, helpers, wrappers, types, layers, and call sites than necessary, and no logic stated twice. New code earns its place by removing more than it adds, fixing incorrect behavior, or delivering required behavior in its minimal form.
- **Less to Understand:** A reader finds what exists, where it lives, what owns it, and what calls it with less searching and tracing than before, whether a developer reading code or Nathan reading file names and headers. A blind-eye review of the surface areas impacted by this implementation should find less confusion, less conflict about intent, and an unambiguously more approachable, maintainable ecosystem to iterate on.
- **Clearer Boundaries:** Each responsibility has one owner, and the next change of a kind has one obvious place to go, with no choice between layers, helpers, or modules — nothing that exists somewhere where it shouldn't; nothing implemented where something else already does it or adjusting it accordingly would be the more appropriate approach; nothing that increases the risk of misassumption when working here in the future.
- **Reads as Designed:** Nothing temporary, transitional, kept for compatibility, unreachable, needlessly indirect, or left over from the work remains. Nothing designed around codebase shapes that will ultimately be changed for the better.
- **One Way:** Each thing has one implementation, one pattern, and one source of truth. No part contradicts another. Exceptions carry their reason where a reader meets them, in code or feature documentation.
- **Real Purpose:** Anything added to the codebase should have its purpose clearly stated from the perspective of its value in enhancing what's already there — complexity, duplications, divergences, multiple ways to do the same thing — and anything "new" added should be assessed using that. Line-count increases shouldn't translate into maintenance cost or complexity.
- Anything introduced should have independent justification behind its existence that isn't simply self-induced requirements.
- Anything changed or implemented should be reflected across the board — nothing that's done this way here, while something else works differently elsewhere, unless that's *genuinely* correct.
- Zero data-level spaghetti, complexity, or additional 'stuff' should be added without reason. Rewiring things to become more understandable, more efficient, more appropriate, and more effective is preferred when the alternative is just adding more to something that's inherently unfit to suit the long-term mandate of what's actually being offered.

**Planning:**

1. **Look Outward First:** before designing any piece, name every function, field, file, or rule it would add, and scout what already exists for each.
2. **Verify Nathan's Claims:** check every architectural claim he makes against the tree and report what contradicts it, plainly; he wants it. Many previous plans had corrections that were flagged against what went unnoticed during the brainstorming process, and each correction changed the design.
3. **Ask, With a Read Attached:** where an answer reads more than one way, stop and ask, with what was found, what it implies, and the call put up for correction; Nathan isn't technical, so each question is explained in plain terms.
4. **Disclose In-Flight Calls:** a judgment made during planning or execution is stated in chat when it's made, and recorded where it changes an outcome.
5. **Write With Intent:** decisions and plans state intended behavior as intent ("should"), separate from statements of how the code works today, so a future reader never takes a decision for a fact or a fact for a decision.
6. **Explain:** Don't assume Nathan reads the docs you’re writing, let him know what needs to be known and explain things in chat directly; don’t leave things ambiguous or unresolvable from discussion alone.

**Standing, From the Brief:**

> Use the NexusOS/Studio/Athena/II. Draft versions of Plan-Creation and Studio-Brainstorm-V2 for the process that should act as the replacement for the existing writing-plans and studio-brainstorm skills. These are the work-in-progress updates; fall back to the current skills where there are any gaps, but assume the drafted versions are the ones you should prioritize.
>
> Use the recently completed planning documents to inherit the Constraints — the principles the plan must adhere to and the requirements for having any agent dispatch follow and inherit them — as well as the two-wave + neutral perspective review process for *both* the pre-implementation planning phase and the post-implementation final integration reviews. MetadataV3 is a very good reference.
>
> If planning doesn’t really need much from me, or there really isn’t much for me to decide on, that should be an acceptable option. Consider that rework in this area has already happened before, so there’s likely intention behind anything you’d flag as “unintentional” — that doesn’t mean it’s beyond changing when it makes sense.
>
> Keep responses brief and to-the-point. Use proper formatting and don’t bury me in information. Present what I actually want to know.

**Mid-Session, 11-09-2026 (on the property pane's column headings):**

> the headingROw Left Right should use the actual menuheading style. Don't handroll

**Mid-Session, 11-10-2026 (on row height):**

> List rows must be less tall than tables. They’re compact

**Mid-Session, 11-10-2026 (on a selected row's highlight; "ris" confirmed as "row"):**

> The highlight thing works — trust me. If it doesnt work properly for lists, have it highlight the ris

**At the Tuning Stop, 11-10-2026 (the numbers stand as landed):**

> Looks good, fix the pane overlap and have it compress the view like tables and cards do. Also make the banner-line inset that of cards, not tables. Otherwise you need to live-test this yourself since I'm unavailable

**Mid-Session, 11-10-2026 (on the pane's column width):**

> Also make pane-max 180px each column instead of 200

**Mid-Session, 11-10-2026 (on the spacing between groups):**

> Also lists should use the dynamically slightly larger padding between the bottom row of a group and the next band. I beleive cards or tables already solved this so that groups have slightly larger indentation between the last row of that group and the top of the next when open, but even while closed

**Mid-Session, 11-10-2026 (on screenshots):**

> I also want to see screenshots of wrapped rows at multiple indentation levels, chips before titles, and grouped-properties

**Mid-Session, 11-10-2026 (on live testing):**

> Take it through the full testing of every single possible configuration matrix of behavior and interacrion

**Mid-Session, 11-10-2026 (on the title's weight):**

> lets also have lists have titles using emphasied text like card titles do so their titles are more pronounced

**Mid-Session, 11-10-2026 (told that a List row's content sits 4px nearer the next group's heading than a Table's):**

> thats what i was talking about earlier

**Mid-Session, 11-10-2026 (on the pane's columns sizing to their names):**

> have the columns expand to that max width; but not use it when there arent properties that require it

**Mid-Session, 11-10-2026 (answering three questions in order: whether the pane's two columns stay equal; whether the room from a group's heading to its first row should match a Table's; where the selected row's highlight shows):**

> They should stay equal to each other. 
> No, it shouldn't; it should be scaled accordingly as compact, which it already should be.
> I can't reproduce it, so either force it, or figure out how to implement it where the row gets highlighted in accordance to it's indentation level with 2px border-radius

**Mid-Session, 11-11-2026 (shown the selected row's highlight at each indentation level):**

> Nevermind, just remove the selected row highlighting for now

**Mid-Session, 11-11-2026 (told the removal left a selected List row with a Table row's full-width highlight):**

> No highlights for lists

#### Process Overview

- [x] `[Before Phase 1: record the BASELINE head, the three gates, and, at that head, the Views Drive's tally for groups 2 to 10 and the Properties, Text Property, Option Picker, and Archive Drives' tallies]`
- [x] **Phase 1** — A Hidden Property Keeps Its Place
  - [x] Task 1-1 · `placeInShown` places in the full order
- [x] **Phase 2** — The Row Frame Leaves Table
  - [x] Task 2-1 · The shell sheet
  - [x] Task 2-2 · The row frame
  - [x] Review Checkpoint (Phases 1 and 2)
- [x] **Phase 3** — One Clickable Value, One Statement of the Rules
  - [x] Task 3-1 · `SeatedValue`
  - [x] Task 3-2 · Cards' rules join the pipeline and the host
  - [x] Review Checkpoint
- [x] **Phase 4** — The Plus, the Bar, the Link Format, and the First Line
  - [x] Task 4-1 · One hover **+**
  - [x] Task 4-2 · `Segments` draws in a flex row and keeps its parts
  - [x] Task 4-3 · A Link's per-view Format on right-click
  - [x] Task 4-4 · The grip reads its row's first line
  - [x] Review Checkpoint
- [x] `[Compaction checkpoint: c/pre-compaction; on the re-prompt, reread §Constraints and c/plan-execution before Phase 5 opens]`
- [x] **Phase 5** — The Saved View and the Kind Record
  - [x] Task 5-1 · A per-id map's keys and depth are one record
  - [x] Task 5-2 · The record names its property pane, and Title Icons is written once
  - [x] Review Checkpoint
- [x] **Phase 6** — List
  - [x] Task 6-1 · Sides, and the two-column pane
  - [x] Task 6-2 · The renderer
  - [x] Task 6-3 · The record, and the tile goes live
  - [x] Review Checkpoint
- [x] `[Stop: Nathan reads List in the app and tunes --list-view-value-max, --list-view-title-min, --list-view-wrap-gap, --list-view-bar-width, the row's padding (--cell-padding-y), and the bar's height. The orchestrator writes each value he settles on into list-view.css, or segment.css.ts for the bar, runs the gates and npm run build, commits inside Phase 6, and re-measures Phase 6's ledger row. His word confirms the design for I-7's follow-ups]`
- [x] `[Compaction checkpoint: c/pre-compaction; on the re-prompt, reread §Constraints and c/plan-execution before Phase 7 opens]`
- [x] **Phase 7** — The Views Drive
  - [x] Task 7-1 · Group 11 — List
  - [x] Review Checkpoint
- [x] **Phase 8** — Documentation
  - [x] Task 8-1 · `ViewTypesPM.md`
  - [x] Task 8-2 · `PommoraDND.md`, `PropertiesPM.md`, `PommoraUIX.md`, `PommoraPRD.md`, and `FrameworkPM.md`
  - [x] Review Checkpoint
- [ ] `[Stop: the final verification's report, per §Final Verification]`

---

### Phase 1 — A Hidden Property Keeps Its Place

**GOAL:** A reorder moves the dragged property alone and leaves every other id where it stands, hidden ones included, so a property shown again returns where it was (E-5, E-6). It comes first because Phase 6's pane writes through the same rule, and because it's the one behavior change that reaches Table and Cards before List exists. It's one task with no checkpoint of its own; Phase 2's checkpoint reads its diff.

#### Task 1-1 · `placeInShown` places in the full order

A drop in Table's heading or the Visibility pane should write the dragged id at its slot in the whole `property_order`, through the helper the Properties panel already places with, in place of rewriting the order as "shown first, everything else after".

**NOW:** `placeInShown(view, shownIds, id, toIndex)` (`Core/Views/Pipeline/columns.ts:101-113`) splices `id` into the shown list and writes `[...shown, ...everything else]`, so every hidden id moves to the tail at the first reorder; `columns.test.ts:234-241` pins that. Its callers are Table's column drop (`Core/Views/Table/useColumns.ts:299-308`) and the Visibility pane's reorder and join (`Core/Views/Settings/VisibilityFrame.tsx:97`), both passing `toIndex` in without-the-dragged coordinates. `hideShown`'s comment (`columns.ts:115`) already promises the slot is remembered. `fullOrderIndex(orderedIds, visibleIds, draggedId, visibleToIndex)` (`UIX/Utilities/moveItem.ts:41-53`) turns a slot in a filtered list into an index in the full one, before the slot's successor or after the last visible id; the Properties panel and PropertyFrame place through it (`Core/Properties/PropertyPanel.tsx:203,222`). `resolveColumns` leads with Title when `property_order` doesn't list it (`columns.ts:82`), so `shownIds` can hold an id the stored order lacks.

**PROCEDURE**

1. Rewrite the first `placeInShown` case in `columns.test.ts` and watch it fail; the other five cases pass unchanged and one takes a new title.
2. Replace `placeInShown`'s body.

**AFTER**

```Core/Views/Pipeline/columns.ts diff
@@ imports @@
-import { resolveRowOrder } from '@pommora/uix/Utilities/moveItem'
+import { fullOrderIndex, resolveRowOrder } from '@pommora/uix/Utilities/moveItem'
@@ placeInShown @@
 export function placeInShown(
   view: SavedView,
   shownIds: string[],
   id: string,
   toIndex: number,
 ): VisibilityPatch {
-  const next = shownIds.filter((x) => x !== id)
-  next.splice(toIndex, 0, id)
+  const order = [
+    ...shownIds.filter((x) => !view.property_order.includes(x)),
+    ...view.property_order,
+  ]
+  const next = order.filter((x) => x !== id)
+  next.splice(fullOrderIndex(order, shownIds, id, toIndex), 0, id)
   return {
-    property_order: [...next, ...view.property_order.filter((x) => !next.includes(x))],
+    property_order: next,
     hidden_properties: view.hidden_properties.filter((x) => x !== id),
   }
 }
```

```Core/Views/Pipeline/columns.test.ts diff
@@ describe('placeInShown') @@
-  it('reorders a shown row, writing the full visible order verbatim with hidden ids trailing', () => {
-    const v = listed([title, 'a', 'b', 'h', 'c'], ['h'])
-    expect(placeInShown(v, [title, 'a', 'b', 'c'], 'c', 1)).toEqual({
-      property_order: [title, 'c', 'a', 'b', 'h'],
+  it('reorders a shown row and leaves a hidden id where it stands', () => {
+    const v = listed([title, 'a', 'h', 'b', 'c'], ['h'])
+    expect(placeInShown(v, [title, 'a', 'b', 'c'], 'c', 1)).toEqual({
+      property_order: [title, 'c', 'a', 'h', 'b'],
       hidden_properties: ['h'],
     })
   })
@@
-  it('preserves foreign property_order ids at the tail', () => {
+  it('leaves a foreign property_order id where it stands', () => {
```

**VERIFY**

- [x] The rewritten case went red before the body changed and is green after; four of the other five `placeInShown` cases pass untouched and one is retitled; `useColumns`' column-drop tests and `VisibilityFrame`'s tests pass untouched.
- [x] In `~/Test`, on a Table view showing four properties A, B, C, D after Title: hide B from its heading menu, drag D ahead of C, then show B from Visibility. B returns directly after A, where the old body put it last.
- [x] Run the gates, then `view-delta` for Phase 1.
- [x] Check for unnecessary code or mistakes.

### Phase 2 — The Row Frame Leaves Table

**GOAL:** Table's row composition and the shell geometry move to `Core/Views/Rows/` (J-2), so Table composes a frame rather than owning one and ArchiveView stops importing a kind's sheet. Nothing a user can see changes: Table draws the same DOM under the same classes. It's a separate phase because List composes these pieces in Phase 6, and a regression here is a Table regression that every later phase would build on.

#### Task 2-1 · The shell sheet

The rules Table and Archive both wear, and List will, leave Table's sheet for one shared sheet; Table's sheet keeps what only Table uses.

**NOW:** `Core/Views/Table/table-view.css` (62 lines) holds the shell (`.table-shell`, `:3-11`), the heading's full bleed (`:17-22`), the grid's width and zoom (`:25-31`), and the band rhythm and sticky band head (`:49-62`) beside three Table-only groups: the overflowing inset (`:12-14`), the hide and slide beat (`:34-40`), and the cell sweep (`:42-47`). `Core/Archive/ArchiveView.tsx:14` imports it across folders to wear the shell, which the sheet's own header (`table-view.css:1`) and ArchiveView's doc comment (`ArchiveView.tsx:18`) both say. `TableView.tsx:33` is its other importer.

**PROCEDURE**

1. Create `Core/Views/Rows/table-shell.css`, named for the class it defines, holding the four shared groups, moved verbatim, under a one-line header.
2. Leave the three Table-only groups in `table-view.css` under a shortened header.
3. Point `ArchiveView.tsx:14` at the shared sheet, and add `import '../Rows/table-shell.css'` to `TableView.tsx` ahead of its own sheet: each surface that wears the shell imports it.

**AFTER**

```Core/Views/Rows/table-shell.css diff
+/* The shell a row-drawing view wears over the table vocabulary: its width against the glass, the heading's bleed, the grid's zoom, and the band rhythm. */
+
+.table-shell {
+  /* Width is auto so the negative side margins widen the box to both glass edges while the grid's content box (and so every row) stays exactly where it was. */
+  margin-left: calc(var(--rail-inset) - var(--content-inset));
+  margin-right: calc(-1 * var(--content-inset));
+  --table-right-inset: var(--content-inset);
+  padding-left: var(--content-inset);
+  padding-right: var(--table-right-inset);
+  overflow-x: auto;
+}
+
+/* Full-bleeds the heading's fill and seam to both glass edges; the matching padding re-lands the tracks on a data row's content width — un-padded, every column drifts. */
+.table-shell .table-head {
+  margin-left: calc(-1 * var(--content-inset));
+  margin-right: calc(-1 * var(--table-right-inset));
+  padding-left: var(--content-inset);
+  padding-right: var(--table-right-inset);
+}
+
+/* Each band is itself a grid reading --cols; inline min-width forces scroll, width:100% lets the Title track eat slack. */
+.table-shell .table-grid {
+  width: 100%;
+  zoom: calc(var(--zoom) * var(--tile-zoom, 1));
+}
+[data-view-embed] .table-shell {
+  --zoom: var(--view-embed-zoom);
+}
+
+/* Chrome lives in group-band.css; this scopes the section rhythm (the row) and the sticky pin (the head). */
+.table-shell .group-band-row,
+.table-shell .group-band + .band-tail {
+  padding-top: var(--band-gap);
+}
+.table-shell .group-band.sub-band .group-band-row,
+.table-shell .sub-band + .band-tail {
+  padding-top: var(--band-clearance);
+}
+.table-shell .group-band-head {
+  /* Sticky-left keeps the group label and chevron in the gutter when columns scroll; left:0 is the grid's content start, only pinning once scrolled. */
+  position: sticky;
+  left: 0;
+  display: inline-flex;
+}
```

```Core/Views/Table/table-view.css diff
-/* The table shell TableView and ArchiveView wear over the Tables chrome (ArchiveView imports it from Views/Table): shell width, grid zoom, the hide and slide beat, the cell sweep, and group-band rhythm. Values live in UIX/Table/table-tokens.css. */
+/* Table's own rules over the shared shell (Rows/table-shell.css): the overflowing inset, the hide and slide beat, and the cell sweep. */
 
-.table-shell {
-  … (the shell block, lines 3-11)
-}
 .table-shell.overflowing {
   --table-right-inset: 0px;
 }
-
-… (the heading bleed, lines 16-22; the grid and embed zoom, lines 24-31)
 
 /* Scoped to the Hide / style-slide beats only, so a drag resize stays instant. */
 … (the hide and slide beat and the cell sweep, lines 33-47, unchanged)
-… (the band rhythm and sticky head, lines 48-62)
```

```Core/Archive/ArchiveView.tsx diff
@@ imports @@
-import '../Views/Table/table-view.css'
+import '../Views/Rows/table-shell.css'
@@ ArchiveView @@
-/** A Collection's or a top-level Set's archived items on TableView's sheet: checked for Restore and Delete. A Set discloses what it holds, and a page opens in the reader on a double-click. */
+/** A Collection's or a top-level Set's archived items in the row views' shell: checked for Restore and Delete. A Set discloses what it holds, and a page opens in the reader on a double-click. */
```

```Core/Views/Bands/group-band.css diff
@@ :1 @@
-/* Shared group-band chrome — the disclosure head over the band body. The table + cards views each scope the divergent bits: the table's gutter chevron + sticky head, the cards' sibling seams. */
+/* Shared group-band chrome — the disclosure head over the band body. The row views' shell and the cards view each scope the divergent bits: the shell's gutter chevron + sticky head, the cards' sibling seams. */
```

```Core/Views/Table/TableView.tsx diff
@@ imports @@
+import '../Rows/table-shell.css'
 import './table-view.css'
```

**VERIFY**

- [x] `git grep -n "table-view.css" -- Core` finds `TableView.tsx`'s import alone.
- [x] `table-view.css` plus `table-shell.css` hold every declaration the old sheet did, each once: `git show <BASELINE>:Core/Views/Table/table-view.css | grep -c '{'` equals the two files' counts summed.
- [x] Live, in `~/Test`: a Table view, a Table view in a View Tile, and the Archive read the same before and after (shell edges against the glass, the heading's bleed, band spacing, a sticky band head while columns scroll).
- [x] Run the gates.

#### Task 2-2 · The row frame

Table's row shell, grip, title, ghost row, and band walk become exports of one file that Table composes; `TableView.tsx` keeps its columns, cells, sweep, and heading.

**NOW:** all of it is private to `Core/Views/Table/TableView.tsx`. The page menu's anchor is `titleGlyph` (`:212-215`), which `DataRow`'s `pageMenu` closes over (`:300-301`). The band walk is the `renderRows` closure (`:109-160`) plus the standing ghost (`:197-200`); it reads `disclosure`, `bands`, and the interactions' `bandView`, `ghostAt`, `ghostClosing`, and `ghostStanding`, and nothing about columns. The row shell is the `LineRow` in `DataRow` (`:299-311`) with the page selection read at `:299`. The grip is the inline span at `:374-386`. The title is the `cell-rename` / `cell-title` span around `RenamableName` (`:319-331`), and its cell's click opens the page (`:358-364`). The ghost row is `GhostRow` (`:217-262`), a `Reveal` around a `div.data-row.ghost-row` whose cells loop the columns, its title markup at `:244-247`. `GroupBand` already takes `fill` and hands it to its `Reveal` (`Core/Views/Bands/GroupBand.tsx:86,98,206`); Table's walk omits it.

**PROCEDURE**

1. Create `Core/Views/Rows/RowFrame.tsx` with the seven exports below (`BandRows`, `GhostTitle`, `PageRow`, `rowMenu`, `rowOpen`, `RowGrip`, `RowTitle`), each moved from `TableView.tsx` with its comments and `biome-ignore` lines. The ghost row's shell stays inside `BandRows`, which already holds what it wires; a kind hands the walk its ghost's cells.
2. `TableView.tsx` composes them: `BandRows` in place of `renderRows` and the standing ghost, `PageRow`, `RowGrip`, `RowTitle`, `rowMenu`, and `rowOpen` inside `DataRow`, and `GhostTitle` in a `ghost` closure that answers the ghost's cells. Its imports of `Reveal`, `GroupBand`, `rowIndent`, `memberDepth`, `memberIndent`, `RenamableName`, `EntityIcon`, `fillInput`, `revealTarget`, `overScrollLabel`, `isCmd`, `isSecondaryClick`, `isSelected`, `useSession`, `rowHover`, `LineRow`, `ViewInteractions`, and `ResolvedGroup` leave wherever their last use moved; `Icon` stays for the heading.
3. No test changes: the DOM, classes, and attributes are the ones the seven test files that query them read today.

**AFTER**

```Core/Views/Rows/RowFrame.tsx diff
+import { Fragment, type ReactNode } from 'react'
+import { Reveal } from '@pommora/uix/Animations/Reveal'
+import { fillInput } from '@pommora/uix/Fields/fields.css'
+import { isCmd, isSecondaryClick } from '@pommora/uix/Interactions/chords'
+import { LineRow } from '@pommora/uix/Interactions/drag'
+import { revealTarget } from '@pommora/uix/Interactions/hover-reveal.css'
+import { overScrollLabel } from '@pommora/uix/Interactions/OverScroll'
+import { Icon } from '@pommora/uix/Symbols'
+import { rowIndent } from '@pommora/uix/Table/rowIndent'
+import { cx } from '@pommora/uix/Utilities/cx'
+import { EntityIcon } from '../../Assets/EntityIcon'
+import { RenamableName } from '../../Interface/RenamableTitle'
+import { isSelected, useSession } from '../../Session/store'
+import { GroupBand } from '../Bands/GroupBand'
+import { memberDepth, memberIndent } from '../Bands/bandModel'
+import type { ViewHostApi } from '../Host/useViewHost'
+import { type ItemApi, rowHover, type ViewInteractions } from '../Host/useViewInteractions'
+import type { ResolvedGroup, ViewRow } from '../viewRow'
+
+// ── The band walk ───────────────────────────────────────────────────────────
+
+export function BandRows({
+  host,
+  interactions,
+  fill,
+  row,
+  ghost,
+}: {
+  host: ViewHostApi
+  interactions: Pick<
+    ViewInteractions,
+    'bandView' | 'ghostAt' | 'ghostClosing' | 'ghostStanding' | 'onGhostClosed' | 'ghostRootProps'
+  >
+  fill?: boolean
+  row: (row: ViewRow, place: { padLeft: string; lead: boolean }) => React.JSX.Element
+  ghost: (padLeft: string) => ReactNode
+}): React.JSX.Element {
+  const { groups, bands, disclosure } = host
+  const ghostRow = (padLeft: string, closing: boolean): React.JSX.Element => (
+    <Reveal open={!closing} fill={fill} enterOnMount onCollapsed={interactions.onGhostClosed}>
+      {/* biome-ignore lint/a11y/useSemanticElements: a hover-born affordance that must use the row grid's own chrome — a real <button> can't host a .data-row, and keyboard creation lives in the menus */}
+      <div
+        {...interactions.ghostRootProps}
+        className="data-row ghost-row"
+        role="button"
+        tabIndex={-1}
+        aria-label="New Page"
+      >
+        {ghost(padLeft)}
+      </div>
+    </Reveal>
+  )
+  let renderedAnyRow = false
+  const walk = (g: ResolvedGroup, depth: number, visible: boolean): React.JSX.Element => {
+    const itemsVisible = visible && disclosure.isOpen(g.key)
+    const padLeft = memberIndent(g.kind, depth)
+    const members = [
+      ...g.items.flatMap((r, i) => {
+        const lead = i === 0 && (g.kind !== 'tail' || !renderedAnyRow)
+        if (itemsVisible) renderedAnyRow = true
+        const drawn = [row(r, { padLeft, lead })]
+        if (itemsVisible && interactions.ghostAt === r.id)
+          drawn.push(
+            <Fragment key={`ghost-${r.id}`}>
+              {ghostRow(padLeft, interactions.ghostClosing)}
+            </Fragment>,
+          )
+        return drawn
+      }),
+      ...(g.children ?? []).map((child) => walk(child, memberDepth(g.kind, depth), itemsVisible)),
+    ]
+    return (
+      <GroupBand
+        key={`gb-${g.key}`}
+        node={bands.byKey.get(g.key)}
+        bands={interactions.bandView}
+        indent={rowIndent(depth)}
+        fill={fill}
+      >
+        {members}
+      </GroupBand>
+    )
+  }
+  return (
+    <>
+      {groups.map((g) => walk(g, 0, true))}
+      {interactions.ghostStanding && ghostRow(memberIndent('tail', 0), false)}
+    </>
+  )
+}
+
+export function GhostTitle({ hideIcon }: { hideIcon: boolean }): React.JSX.Element {
+  return (
+    <span className="cell-title">
+      {hideIcon ? null : <EntityIcon kind="page" size="body" />}
+      <span className="cell-title-text">New Page</span>
+    </span>
+  )
+}
+
+// ── The row ─────────────────────────────────────────────────────────────────
+
+export function PageRow({
+  row,
+  api,
+  lead,
+  dragDisabled,
+  children,
+}: {
+  row: ViewRow
+  api: ItemApi
+  lead: boolean
+  dragDisabled: boolean
+  children: ReactNode
+}): React.JSX.Element {
+  const selected = useSession(isSelected('page', row.id))
+  return (
+    <LineRow
+      id={row.id}
+      open={() => api.open(row, false)}
+      immovable={dragDisabled}
+      data-rid={row.id}
+      data-reveal-host=""
+      className={cx('data-row', selected && 'selected', lead && 'row-lead')}
+      {...rowHover(row, api.hover)}
+    >
+      {children}
+    </LineRow>
+  )
+}
+
+const titleGlyph = (el: HTMLElement): HTMLElement => {
+  const cell = el.closest<HTMLElement>('.data-cell') ?? el
+  return cell.querySelector<HTMLElement>('.cell-title > :first-child') ?? cell
+}
+
+export const rowMenu =
+  (api: ItemApi, row: ViewRow) =>
+  (e: React.MouseEvent): void =>
+    void api.pageMenu(row, e, titleGlyph(e.currentTarget as HTMLElement))
+
+export const rowOpen =
+  (api: ItemApi, row: ViewRow) =>
+  (e: React.MouseEvent): void => {
+    // A secondary-click fires `click` alongside `contextmenu`, so bail and let the right-click menu win.
+    if (isSecondaryClick(e)) return
+    e.stopPropagation()
+    api.open(row, isCmd(e))
+  }
+
+export function RowGrip({
+  onMenu,
+  dragDisabled,
+}: {
+  onMenu: (e: React.MouseEvent) => void
+  dragDisabled: boolean
+}): React.JSX.Element {
+  return (
+    // biome-ignore lint/a11y/useKeyWithClickEvents lint/a11y/noStaticElementInteractions: a bubble guard, not a control
+    <span
+      className={cx('row-grip', revealTarget)}
+      // A right-press is defaulted away here — preventing only the context menu comes too late to stop a seated caret.
+      onPointerDown={(e) => {
+        if (e.button === 2) e.preventDefault()
+      }}
+      onContextMenu={onMenu}
+      onClick={(e) => e.stopPropagation()}
+      title={dragDisabled ? undefined : 'Drag to reorder'}
+    >
+      <Icon name="grip-vertical" size="body" />
+    </span>
+  )
+}
+
+export function RowTitle({
+  row,
+  naming,
+  hideIcon,
+  api,
+  className = cx(overScrollLabel, 'cell-title'),
+}: {
+  row: ViewRow
+  naming: ViewHostApi['naming']
+  hideIcon: boolean
+  api: Pick<ItemApi, 'endNaming'>
+  className?: string
+}): React.JSX.Element {
+  return (
+    <span className={naming ? 'cell-rename' : className}>
+      {hideIcon ? null : <EntityIcon kind="page" icon={row.icon} size="body" />}
+      <RenamableName
+        title={row.title}
+        kind="page"
+        rename={{ path: row.path, editing: naming !== null, onEnd: api.endNaming }}
+        create={naming?.create}
+        className={fillInput}
+        renames="title"
+      >
+        {(shown) => <span className="cell-title-text">{shown}</span>}
+      </RenamableName>
+    </span>
+  )
+}
```

```Core/Views/Table/TableView.tsx diff
@@ imports @@
+import {
+  BandRows,
+  GhostTitle,
+  PageRow,
+  RowGrip,
+  RowTitle,
+  rowMenu,
+  rowOpen,
+} from '../Rows/RowFrame'
@@ TableView @@
-  const { view, columns, groups, ctx, rowById, bands, disclosure, dragDisabled } = host
+  const { view, columns, ctx, rowById, dragDisabled } = host
@@ TableView · the render @@
   const hideIcon = viewOption(view, 'hide_page_icons')
-  const ghostRowProps = {
-    columns,
-    hideIcon,
-    onClosed: interactions.onGhostClosed,
-    rootProps: interactions.ghostRootProps,
-  }
-  let renderedAnyRow = false
-  const renderRows = (g: ResolvedGroup, depth: number, visible: boolean): React.JSX.Element => {
-    … (the whole closure, lines 109-160)
-  }
+  const ghost = (padLeft: string): React.ReactNode =>
+    columns.map((c, i) => {
+      const title = c.kind === 'title' && <GhostTitle hideIcon={hideIcon} />
+      return i === 0 ? (
+        <RowLead key={c.id} className="ghost-worn" indent={padLeft}>
+          {title}
+        </RowLead>
+      ) : (
+        <div key={c.id} className="data-cell ghost-worn">
+          {title}
+        </div>
+      )
+    })
   return (
@@
           </div>
-          {groups.map((g) => renderRows(g, 0, true))}
-          {interactions.ghostStanding && (
-            <GhostRow padLeft={memberIndent('tail', 0)} closing={false} {...ghostRowProps} />
-          )}
+          <BandRows
+            host={host}
+            interactions={interactions}
+            ghost={ghost}
+            row={(row, { padLeft, lead }) => (
+              <DataRow
+                key={row.id}
+                row={row}
+                columns={columns}
+                ctx={ctx}
+                padLeft={padLeft}
+                dragShift={dragShift}
+                alignByCol={alignByCol}
+                styleByCol={styleByCol}
+                api={interactions.item}
+                naming={host.naming?.id === row.id ? host.naming : null}
+                editingCol={editorTarget?.rowId === row.id ? editorTarget.colId : null}
+                popoverCol={popoverTarget?.rowId === row.id ? popoverTarget.colId : null}
+                activeCol={activeCell?.rowId === row.id ? activeCell.colId : null}
+                hideIcon={hideIcon}
+                dragDisabled={dragDisabled}
+                sweepCol={cellSweep.sweep?.rows.has(row.id) ? cellSweep.sweep.colId : null}
+                lead={lead}
+              />
+            )}
+          />
         </div>
@@ GhostRow @@
-function GhostRow({ … }): React.JSX.Element {
-  … (the whole component, lines 217-262)
-}
-
@@ titleGlyph @@
-const titleGlyph = (el: HTMLElement): HTMLElement => {
-  const cell = el.closest<HTMLElement>('.data-cell') ?? el
-  return cell.querySelector<HTMLElement>('.cell-title > :first-child') ?? cell
-}
-
@@ DataRow @@
 }): React.JSX.Element {
-  const selected = useSession(isSelected('page', row.id))
-  const pageMenu = (e: React.MouseEvent): void =>
-    void api.pageMenu(row, e, titleGlyph(e.currentTarget as HTMLElement))
+  const pageMenu = rowMenu(api, row)
+  const open = rowOpen(api, row)
   return (
-    <LineRow
-      id={row.id}
-      open={() => api.open(row, false)}
-      immovable={dragDisabled}
-      data-rid={row.id}
-      data-reveal-host=""
-      className={cx('data-row', selected && 'selected', lead && 'row-lead')}
-      {...rowHover(row, api.hover)}
-    >
+    <PageRow row={row} api={api} lead={lead} dragDisabled={dragDisabled}>
       {columns.map((c, i) => {
@@
         const content =
           c.kind === 'title' ? (
-            <span className={naming ? 'cell-rename' : cx(overScrollLabel, 'cell-title')}>
-              … (the icon and RenamableName, lines 320-330)
-            </span>
+            <RowTitle row={row} naming={naming} hideIcon={hideIcon} api={api} />
           ) : (
@@
@@ DataRow · the cell's click @@
-          onClick: (e: React.MouseEvent) => {
-            if (c.kind !== 'title') return api.click(row, c, e)
-            // A secondary-click fires `click` alongside `contextmenu`, so bail and let the right-click menu win.
-            if (isSecondaryClick(e)) return
-            e.stopPropagation()
-            api.open(row, isCmd(e))
-          },
+          onClick: (e: React.MouseEvent) => (c.kind === 'title' ? open(e) : api.click(row, c, e)),
@@
           <RowLead key={c.id} {...cell} indent={alignByCol[i] === 'left' ? padLeft : undefined}>
-            {/* biome-ignore … */}
-            <span className={cx('row-grip', revealTarget)} … >
-              <Icon name="grip-vertical" size="body" />
-            </span>
+            <RowGrip onMenu={pageMenu} dragDisabled={dragDisabled} />
             {content}
           </RowLead>
         )
       })}
-    </LineRow>
+    </PageRow>
   )
 })
```

**VERIFY**

- [x] `git grep -nE "renderRows|ghostRowProps|function GhostRow|titleGlyph" -- Core/Views/Table` finds nothing, and `TableView.tsx` holds no import or destructure it no longer uses (`npm run lint` reports no `noUnusedVariables` or unused import).
- [x] `cellGestures`, `useViewHost`, `rowDrops`, `bandDrops`, and every other suite under `Core/Views` pass untouched, with no test file edited by this task.
- [x] Live, in `~/Test`, a grouped Table view: the first row under a tail draws no top line, a band's first row draws none, the hover ghost appears under the hovered row and creates a page, the standing ghost shows on an empty Collection, a rename seats in the title, a selected row washes, the grip's right-click opens the page menu, and a row drags within and across bands.
- [x] Run the gates, then `view-delta` for Phases 1 and 2.
- [x] Check for unnecessary code or mistakes.

#### Review Checkpoint

- [x] Two review agents, `code-simplification` and `adversarial-review`, reading outward over Phases 1 and 2: `placeInShown` leaves every id but the dragged one in place for both callers and for a view whose order doesn't list Title; nothing else writes `property_order` shown-first (`hideShown`, `unhide`, the config sweeps); the frame's seven exports carry no Table-only knowledge (no column, cell, sweep, or alignment) and Table's DOM is byte-for-byte what it was; the shared sheet holds no Table-only rule and Table's sheet no shared one; Archive reads the same.

### Phase 3 — One Clickable Value, One Statement of the Rules

**GOAL:** The clickable value Cards and the Properties panel each write out becomes one component (I-2, J-3), Cards' column helpers move to the pipeline (J-4), and the rules for adding, showing, and hiding a property are stated once on the host, so Cards state only what a card draws. Cards and the panel look and behave as they do, apart from the one named change (a panel value's drag threshold). It's a separate phase because List mounts the value and states the same one fact in Phase 6.

#### Task 3-1 · `SeatedValue`

One component carries a value's click, right-click, editor swap, and `Cell`; Cards and the panel mount it.

**NOW:** Cards write it as `span.card-value.value-seat[data-drag-slop]` inside `CardProperties` (`Core/Views/Cards/CardsView.tsx:534-560`); the panel writes it as `span.value-seat[data-property-row]` in a row's trailing slot (`Core/Properties/PropertyPanel.tsx:251-268`). Both wire `click`, `menu`, the editor or `Cell`, `commit`, `empty`, and `onPane` the same way, and each passes its own seat's commit (`ItemApi.commit` is `seat.host.commit`, `useViewInteractions.tsx:509`; the panel's is its seat host's, `PropertyPanel.tsx:81`); they differ in the class, the attribute, the empty mark's type size, and `hideRemove` (Cards). `.value-seat` is already the shared class (`Core/Properties/Cells/cells.css:58-69`). The seat's box on a card is `.card-value` (`Core/Views/Cards/cards-view.css:128-135`): an inline flex box clipped to one line, which `.card-prop-row > .card-value` (`:118-123`) and `.card-value:has(.cell-bar)` (`:140-145`) then adjust. `data-property-row` is the panel's own: `rowEl` finds a row's value by it to anchor the label's right-click (`PropertyPanel.tsx:76-77,83`), and `PropertyPanel.test.tsx` reads it. `.card-value` is Cards' scope for its two adjusting rules and the hook three Cards suites and three drives select by. A press inside `[data-drag-slop]` needs 12px, not 5px, to lift its drag item (`UIX/Interactions/gesture.ts:29-37`).

**PROCEDURE**

1. Create `Core/Properties/Cells/SeatedValue.tsx`.
2. `cells.css` takes the inline box as `.value-inline`, one class of lower specificity than Cards' two adjusting rules, so their order of loading can't matter; `cards-view.css` loses the `.card-value` base rule.
3. Cards and the panel mount `SeatedValue`, which commits through the seat it's handed (`useValueSeat` answers `commit`). Cards pass `className="card-value value-inline"`: `.card-value` stays as Cards' scope for its two adjusting rules. The panel passes its `s.value` and its own `data-property-row`, which `SeatedValue` forwards without naming. Cards' anchor becomes `seatOf`, the one statement of where a seated value's panes anchor.
4. No test changes. **Behavior change, named:** the panel's value now carries `data-drag-slop`, so a press on a panel value takes 12px of travel before its row lifts.

**AFTER**

```Core/Properties/Cells/SeatedValue.tsx diff
+import type { ReactNode } from 'react'
+import { cx } from '@pommora/uix/Utilities/cx'
+import type { ViewRow } from '../../Views/viewRow'
+import type { ColumnStyle } from '../columnStyles'
+import type { ValueSeatApi } from '../Pickers/ValueSeat'
+import type { ResolvedColumn } from '../properties'
+import type { ValueContext } from '../valueContext'
+import { Cell } from './Cell'
+
+export const seatOf = (el: HTMLElement): HTMLElement =>
+  el.closest<HTMLElement>('.value-seat') ?? el
+
+export function SeatedValue({
+  row,
+  column,
+  ctx,
+  style,
+  api,
+  editor,
+  empty,
+  hideRemove,
+  className,
+  ...attrs
+}: {
+  row: ViewRow
+  column: ResolvedColumn
+  ctx: ValueContext
+  style: ColumnStyle
+  api: Pick<ValueSeatApi, 'click' | 'menu' | 'pane' | 'commit'>
+  editor: ReactNode
+  empty?: React.JSX.Element
+  hideRemove?: boolean
+  className?: string
+}): React.JSX.Element {
+  return (
+    // data-drag-slop: the value sits on a drag handle, so a press beginning on it gets a larger activation threshold — a tap-wobble opens the picker instead of lifting the item.
+    // biome-ignore lint/a11y/useKeyWithClickEvents lint/a11y/noStaticElementInteractions: a grid cell — per-cell tab stops are the wrong pattern; the grid wants roving tabindex, which is a feature rather than a lint fix
+    <span
+      {...attrs}
+      className={cx('value-seat', className)}
+      data-drag-slop=""
+      onClick={(e) => api.click(row, column, e)}
+      onContextMenu={(e) => void api.menu(row, column, e)}
+    >
+      {editor ?? (
+        <Cell
+          row={row}
+          column={column}
+          ctx={ctx}
+          style={style}
+          empty={empty}
+          commit={(next) => api.commit(row, column, next)}
+          hideRemove={hideRemove}
+          onPane={(anchor) => api.pane(row, column, anchor)}
+        />
+      )}
+    </span>
+  )
+}
```

```Core/Properties/Pickers/ValueSeat.tsx diff
@@ useValueSeat · the return @@
     host,
+    commit: host.commit,
     close,
```

```Core/Views/Host/useViewInteractions.tsx diff
@@ the item api @@
-    commit: seat.host.commit,
+    commit: seat.commit,
```

```Core/Properties/Cells/cells.css diff
@@ .value-seat:has(.cell-checkbox, .cell-switch) @@
 .value-seat:has(.cell-checkbox, .cell-switch) {
   padding-inline: var(--label-pad-x);
 }
+.value-inline {
+  display: inline-flex;
+  align-items: center;
+  min-width: 0;
+  max-width: 100%;
+  white-space: nowrap;
+  overflow: hidden;
+}
```

```Core/Views/Cards/cards-view.css diff
@@ .card-value @@
-.card-value {
-  display: inline-flex;
-  align-items: center;
-  min-width: 0;
-  max-width: 100%;
-  white-space: nowrap;
-  overflow: hidden;
-}
```

```Core/Views/Cards/CardsView.tsx diff
@@ CardProperties @@
   const value = (c: ResolvedColumn): React.JSX.Element => (
-    // data-drag-slop: the whole card is a drag handle, so a press beginning on a value gets a larger activation threshold — a tap-wobble opens the picker instead of lifting the card.
-    // biome-ignore lint/a11y/useKeyWithClickEvents lint/a11y/noStaticElementInteractions: a grid cell — per-cell tab stops are the wrong pattern; the grid wants roving tabindex, which is a feature rather than a lint fix
-    <span
-      className="card-value value-seat"
-      data-drag-slop=""
-      onClick={(e) => api.click(row, c, e)}
-      onContextMenu={(e) => void api.menu(row, c, e)}
-    >
-      {(editing === c.id && api.editor(row, c)) || (
-        <Cell
-          row={row}
-          column={c}
-          ctx={ctx}
-          style={styleById.get(c.id)!}
-          empty={
-            PROPERTY_TYPES[c.type].origin !== 'filedata' ? (
-              <EmptyValue className={cx('cell-empty', text.caption.emphasized)} />
-            ) : undefined
-          }
-          commit={(v) => api.commit(row, c, v)}
-          hideRemove={!allowInlineRemove}
-          onPane={(anchor) => api.pane(row, c, anchor)}
-        />
-      )}
-    </span>
+    <SeatedValue
+      className="card-value value-inline"
+      row={row}
+      column={c}
+      ctx={ctx}
+      style={styleById.get(c.id)!}
+      api={api}
+      editor={editing === c.id ? api.editor(row, c) : null}
+      hideRemove={!allowInlineRemove}
+      empty={
+        PROPERTY_TYPES[c.type].origin !== 'filedata' ? (
+          <EmptyValue className={cx('cell-empty', text.caption.emphasized)} />
+        ) : undefined
+      }
+    />
   )
@@ imports @@
-import { Cell } from '../../Properties/Cells/Cell'
+import { SeatedValue, seatOf } from '../../Properties/Cells/SeatedValue'
@@ interactions @@
     seat: {
       commit: commitOnCard,
-      anchor: (el) => el.closest<HTMLElement>('.value-seat') ?? el,
+      anchor: seatOf,
       centered: true,
```

```Core/Properties/PropertyPanel.tsx diff
@@ renderRow @@
           trailing={
-            // biome-ignore lint/a11y/useKeyWithClickEvents lint/a11y/noStaticElementInteractions: a grid cell; the grid wants roving tabindex, not per-cell tab stops
-            <span
-              className={cx(s.value, 'value-seat')}
-              data-property-row={id}
-              onContextMenu={(e) => void seat.menu(row, column, e)}
-              onClick={(e) => seat.click(row, column, e)}
-            >
-              {seat.editor(row, column) ?? (
-                <Cell
-                  row={row}
-                  column={column}
-                  ctx={ctx}
-                  style={{ look: 'standard', ...dateDefaults(dateFormat) }}
-                  commit={(next) => assignValue(writer, row, column, next)}
-                  empty={<EmptyValue className={cx('cell-empty', text.caption.standard)} />}
-                  onPane={(anchor) => seat.pane(row, column, anchor)}
-                />
-              )}
-            </span>
+            <SeatedValue
+              className={s.value}
+              data-property-row={id}
+              row={row}
+              column={column}
+              ctx={ctx}
+              style={{ look: 'standard', ...dateDefaults(dateFormat) }}
+              api={seat}
+              editor={seat.editor(row, column)}
+              empty={<EmptyValue className={cx('cell-empty', text.caption.standard)} />}
+            />
           }
@@ imports @@
-import { Cell } from './Cells/Cell'
+import { SeatedValue } from './Cells/SeatedValue'
```

**VERIFY**

- [x] `git grep -n "value-seat" -- Core` finds the class written in `SeatedValue.tsx` (its span and `seatOf`) and in `cells.css`' selectors, tests, and drives only.
- [x] `PropertyPanel.test.tsx`, `cardGestures.test.tsx`, and `cardCreation.test.tsx` pass untouched.
- [x] Live, in `~/Test`: a Standard card's value sits at its row's end and a bar-look Number fills its row; a Compact card's values flow and clip; a panel value clicks, right-clicks, and edits as before; pressing on a panel value and moving 8px lifts nothing, and 14px lifts the row.
- [x] Run the gates.

#### Task 3-2 · Cards' rules join the pipeline and the host

`shownColumnsFor` and `cardAddColumns` become `drawnColumns` and `addColumns` in `Core/Views/Pipeline/columns.ts`, beside `ItemColumns` and `itemColumns`, and a kind states only what its items draw: the host builds the commit that shows a property, the Remove that hides it, and the Add list from that one fact. `Cards/cardColumns.ts` leaves with its test, and Cards' policy shrinks to the fact. The two moves are one task because the policy is the helpers' caller.

**NOW:** `Core/Views/Cards/cardColumns.ts` (34 lines) holds both. `shownColumnsFor(row, columns, compactLayout)` drops Title, and drops a blank value under `compactLayout` unless the type's blank draws (`:7-17`); `cardAddColumns(item, row, shown)` lists what isn't drawn, fillable entries ahead of held ones (`:20-34`). Their callers are `CardsView.tsx:163-166,628`, and `cardColumns.test.ts` (57 lines, five cases) is their test. `columns.ts` imports nothing from `Properties/fieldValue` today; `fieldValue.ts` imports types and `propertyValue` alone, so the pipeline file stays host-safe.

`ViewInteractionPolicy.seat` lets a kind pass `commit`, `centered`, `add`, `hide`, and `onClose` (`Core/Views/Host/useViewInteractions.tsx:74-75`), spread over the host's defaults at `:476-486`. Cards pass all of `commit`, `hide`, and `add` (`CardsView.tsx:145-170`): `commitOnCard` reveals the property on a non-blank commit, `hide` runs `hideProperty`, and `add` lists `cardAddColumns(itemColumns(tree, ctx.schema, row.id), row, shownColumnsFor(row, columns, isCompact(view)))` and shows through `revealProperty`. Table passes `anchor` and `onClose` only (`TableView.tsx:82-85`). The host already exposes `revealProperty`, `hideProperty`, and `commitValue` (`Core/Views/Host/useViewHost.ts:152-171,205-208`).

**PROCEDURE**

1. Move both functions into `columns.ts` under their new names, their doc comments trimmed to one clause each, and move the five cases into `columns.test.ts` as two `describe` blocks under the new names. Delete `cardColumns.ts` and `cardColumns.test.ts`.
2. The policy's `seat` takes `drawn` in place of `commit`, `add`, and `hide`; the hook builds the three from it. No new case: Cards' existing cases for "a value from Add shows its property", "Remove hides it from the view", and the Add list's contents pin the behavior and pass untouched.
3. Cards pass `drawn` and drop `commitOnCard`, the `hide` and `add` objects, and the imports and destructures only they used (`isBlankValue`, `PropertyValue`, `itemColumns`, `hideProperty`, `revealProperty`, `commitValue`); `CardFace`'s `:628` call takes the new name.

**AFTER**

```Core/Views/Pipeline/columns.ts diff
@@ imports @@
 import {
   FILEDATA,
   FILEDATA_BY_ID,
+  PROPERTY_TYPES,
   type PropertyDefinition,
   type ResolvedColumn,
 } from '../../Properties/properties'
+import { holdsValue } from '../../Properties/fieldValue'
+import type { ViewRow } from '../viewRow'
@@ itemColumns @@
 }
+
+/** The columns an item draws beside its title: all of them, or, where blanks drop, those holding a value or drawing their blank, as a checkbox does. */
+export function drawnColumns(
+  row: ViewRow,
+  columns: ResolvedColumn[],
+  dropBlanks: boolean,
+): ResolvedColumn[] {
+  return columns.filter(
+    (c) =>
+      c.kind !== 'title' &&
+      (!dropBlanks || holdsValue(row, c) || PROPERTY_TYPES[c.type].blankDraws === true),
+  )
+}
+
+/** What an item's Add list offers: the columns it doesn't draw, those it can fill ahead of those it only shows. */
+export function addColumns(item: ItemColumns, row: ViewRow, drawn: ResolvedColumn[]): ItemColumns {
+  const seen = new Set(drawn.map((c) => c.id))
+  const listed = (columns: ResolvedColumn[]): ResolvedColumn[] => {
+    const rest = columns.filter((c) => !seen.has(c.id))
+    return [...rest.filter((c) => !holdsValue(row, c)), ...rest.filter((c) => holdsValue(row, c))]
+  }
+  return { contexts: listed(item.contexts), properties: listed(item.properties) }
+}
```

```Core/Views/Cards/cardColumns.ts diff
-… (the whole file, 34 lines)
```

```Core/Views/Cards/cardColumns.test.ts diff
-… (the whole file; its five cases move into Core/Views/Pipeline/columns.test.ts as `describe('drawnColumns')` and `describe('addColumns')`, bodies unchanged apart from the two names)
```

```Core/Views/Cards/CardsView.tsx diff
@@ imports @@
-import { cardAddColumns, shownColumnsFor } from './cardColumns'
-import { itemColumns } from '../Pipeline/columns'
+import { drawnColumns } from '../Pipeline/columns'
@@ CardFace @@
-  const shown = useMemo(() => shownColumnsFor(row, columns, isCompact(view)), [columns, row, view])
+  const shown = useMemo(() => drawnColumns(row, columns, isCompact(view)), [columns, row, view])
```

```Core/Views/Host/useViewInteractions.tsx diff
@@ imports @@
-import { resolveColumn } from '../Pipeline/columns'
+import { addColumns, itemColumns, resolveColumn } from '../Pipeline/columns'
+import { isBlankValue } from '../../Properties/propertyValue'
+import type { ResolvedColumn } from '../../Properties/properties'
@@ ViewInteractionPolicy @@
-  seat: Pick<SeatHost, 'anchor'> &
-    Partial<Pick<SeatHost, 'commit' | 'centered' | 'add' | 'hide' | 'onClose'>>
+  seat: Pick<SeatHost, 'anchor'> &
+    Partial<Pick<SeatHost, 'centered' | 'onClose'>> & {
+      /** What an item draws of the view's columns, from a kind whose items add, show, and hide properties themselves. */
+      drawn?: (row: ViewRow) => ResolvedColumn[]
+    }
@@ useViewInteractions · destructure of host @@
     styleOf,
     setStylePatch,
+    revealProperty,
+    hideProperty,
   } = host
@@
   const openTarget = useSession((s) => s.openTarget)
+  const tree = useSession((s) => s.tree)
@@ the seat @@
+  const { drawn, ...seatPolicy } = policy.seat
+  // A value from an item's Add shows its property; a right-click pick runs through `MenuSeat` and leaves the view alone.
+  const adds: Pick<SeatHost, 'commit' | 'hide' | 'add'> | undefined = drawn && {
+    commit: (row, column, value) => {
+      if (!isBlankValue(value)) revealProperty(column.id)
+      commitValue(row, column, value)
+    },
+    hide: { from: 'view', run: (_, column) => hideProperty(column.id) },
+    add: {
+      columns: (row) => addColumns(itemColumns(tree, schema, row.id), row, drawn(row)),
+      show: (column) => revealProperty(column.id),
+    },
+  }
   const seat = useValueSeat({
     rowOf: (id) => rowById.get(id),
     columnOf: (id) => resolveColumn(id, schema, identity.contextIds),
     commit: commitValue,
     holder: (row) => holderOf(row, ctx),
     connections: ctx.connections,
     style: styleOf,
     setStyle: setStylePatch,
     hold: ghost.suppressWrap,
-    ...policy.seat,
+    ...seatPolicy,
+    ...adds,
   })
```

```Core/Views/Cards/CardsView.tsx diff
@@ CardsView · destructure of host @@
     crossBand,
     searching,
-    hideProperty,
-    revealProperty,
-    commitValue,
     styleById,
   } = host
@@ interactions @@
-  // A value from a card's Add shows its property; a right-click pick runs through `MenuSeat` and leaves the view alone.
-  const commitOnCard = (row: ViewRow, column: ResolvedColumn, v: PropertyValue | null): void => {
-    if (!isBlankValue(v)) revealProperty(column.id)
-    commitValue(row, column, v)
-  }
   const [bannerRequest, setBannerRequest] = useState<BannerRequest | null>(null)
   const interactions = useViewInteractions(host, {
@@
     seat: {
-      commit: commitOnCard,
       anchor: seatOf,
       centered: true,
-      hide: { from: 'view', run: (_, column) => hideProperty(column.id) },
-      add: {
-        columns: (row) =>
-          cardAddColumns(
-            itemColumns(tree, ctx.schema, row.id),
-            row,
-            shownColumnsFor(row, columns, isCompact(view)),
-          ),
-        show: (column) => revealProperty(column.id),
-      },
+      drawn: (row) => drawnColumns(row, columns, isCompact(view)),
     },
@@ imports @@
-import { isBlankValue, type PropertyValue } from '../../Properties/propertyValue'
```

**VERIFY**

- [x] `git grep -nE "cardColumns|shownColumnsFor|cardAddColumns|commitOnCard" -- Core .claude/scripts` finds nothing; `SeatHost`'s `commit`, `add`, and `hide` are written by `useViewInteractions.tsx`, `PropertyPanel.tsx`, and `MenuSeat` alone.
- [x] The five moved cases pass under their new names; `cardGestures.test.tsx`, `cardCreation.test.tsx`, and `useViewHost.test.tsx` pass untouched; `cellGestures.test.tsx` shows Table's menus still offer no Remove; `Core/Contract/engineGraph.test.ts` and `Desktop/hostGraph.test.ts` stay green.
- [x] Live, in `~/Test`, on a Cards view: a click on empty card space opens the add list; picking a property and setting a value shows it on every card; a value's Remove hides the property from the view; a right-click pick from the page menu leaves the view's columns alone.
- [x] Run the gates, then `view-delta` for Phase 3.
- [x] Check for unnecessary code or mistakes.

#### Review Checkpoint

- [x] Two review agents, `code-simplification` and `adversarial-review`, reading outward: `SeatedValue` has no surface's knowledge in it (no card, panel, or list word, and no attribute it names for one surface) and Table's cells are untouched (I-7); `.value-inline` resolves the same on a card as `.card-value` did under either stylesheet order; no importer of `cardColumns` remains; `drawn` is the only thing a kind states and the host's three derived rules read as Cards' did, including the page-menu pick that leaves the view alone; `Core/Views/Pipeline/columns.ts` stays free of React and UIX components.

### Phase 4 — The Plus, the Bar, the Link Format, and the First Line

**GOAL:** Four small pieces List composes become shared or correct before List exists: the band's **+** and the panel's **+** are one `AccessoryButton` that a row can also mount (I-3); `Segments` draws in a flex row and keys a part by its own key; a Link's per-view Format is offered on its right-click wherever a view holds a look (C-4); and the grip reads a first line its surface can state (H-3). Each is a named change outside List or invisible. It's a separate phase because every task is independent of the others and of Phase 3, and each can be reviewed against the surface it changes.

#### Task 4-1 · One hover **+**

`AccessoryButton` forwards the two attributes a hover **+** inside a row needs, the band's **+** becomes one, and the panel's **+** holds itself shown through the reveal's own attribute.

**NOW:** `AccessoryButton` (`UIX/Menus/MenuRows.tsx:285-330`) is `Button size="button-inline" paddingX="0"` in the tertiary label color with `create`, `reveal`, and a stopped click; it forwards neither a tab index nor the held state, though `Button` spreads `...rest` (`UIX/Buttons/Button.tsx:92,120`) and the tree writes the held state raw as `data-reveal-held={x || undefined}` (`TileGrid.tsx:241,641,689`, `NavList.tsx:84`, `GlancePane.tsx:339`, `ViewTile.tsx:357`, `OptionSlot.tsx:55`, `PropertyPanel.tsx:337`). The band's **+** is a raw `Button size="button-inline" icon="plus" iconSize="body" reveal tabIndex={-1} data-create` under `.group-band-add` (`Core/Views/Bands/GroupBand.tsx:191-203`), whose one rule sets the same tertiary color (`Core/Views/Bands/group-band.css:46-48`). The panel's **+** is an `AccessoryButton` that toggles `revealTarget` by class to stay shown while its list is open (`Core/Properties/PropertyPanel.tsx:301-311`), where the reveal already reads `[data-reveal-held]` (`UIX/Interactions/hover-reveal.css.ts:23`). The Views Drive finds the band's **+** by `aria-label` (`.claude/scripts/Views Drive/live-drive.mjs:693`).

**PROCEDURE**

1. `AccessoryButton` forwards `tabIndex` and `data-reveal-held`, the attribute eight sites in Core already write by that name, to its `Button`.
2. The band mounts `AccessoryButton`; `.group-band-add` and its rule leave, with `GroupBand.tsx`'s `Button` import, and the Views Drive's selector for the band's **+** (`live-drive.mjs:693`) drops its `.group-band-add` alternative, the `aria-label` half already finding the button.
3. The panel's **+** passes `reveal` and `data-reveal-held` in place of the class toggle; `PropertyPanel.tsx`'s `revealTarget` import leaves.
4. **Behavior change, named:** the band's **+** loses its horizontal padding, so its hit box is the accessory's 20px.

**AFTER**

```UIX/Menus/MenuRows.tsx diff
@@ AccessoryButton @@
   reveal,
   onMouseDown,
   ref,
+  ...rest
 }: {
@@
   onMouseDown?: (e: MouseEvent<HTMLButtonElement>) => void
   ref?: Ref<HTMLButtonElement>
+  tabIndex?: number
+  'data-reveal-held'?: true
 }): React.JSX.Element {
@@
       aria-label={ariaLabel}
       onMouseDown={onMouseDown}
       onClick={(e) => {
         e.stopPropagation()
         onClick(e)
       }}
+      {...rest}
     />
```

```Core/Views/Bands/GroupBand.tsx diff
@@ HeadedBand @@
           {set ? (
-            <Button
-              size="button-inline"
-              icon="plus"
-              iconSize="body"
-              reveal
-              className="group-band-add"
-              tabIndex={-1}
-              onClick={() => bands.add(set.key)}
-              data-create
-              aria-label="New page in group"
-            />
+            <AccessoryButton
+              icon="plus"
+              size="body"
+              ariaLabel="New page in group"
+              create
+              reveal
+              tabIndex={-1}
+              onClick={() => bands.add(set.key)}
+            />
           ) : null}
@@ imports @@
-import { Button } from '@pommora/uix/Buttons/Button'
+import { AccessoryButton } from '@pommora/uix/Menus/MenuRows'
```

```Core/Views/Bands/group-band.css diff
-.group-band-add {
-  color: var(--label-tertiary);
-}
```

```Core/Properties/PropertyPanel.tsx diff
@@ the group heading @@
                       icon="plus"
                       size={ICON.optionsAdd}
                       ariaLabel={add}
-                      className={opened && !rowOpened ? undefined : revealTarget}
+                      reveal
+                      data-reveal-held={(opened && !rowOpened) || undefined}
                       create
                       onClick={() => openAdd(key)}
@@ imports @@
-import { revealTarget } from '@pommora/uix/Interactions/hover-reveal.css'
```

**VERIFY**

- [x] `git grep -n "group-band-add" -- Core UIX .claude/scripts` finds nothing, the drive's selector included.
- [x] `PropertyPanel.test.tsx` and the band suites pass untouched.
- [x] Live, in `~/Test`: a Set band's **+** shows on the band's hover in the tertiary color, creates a page in the Set, and takes no Tab stop; the panel's **+** stays shown while its list is open from the heading and hides again on close.
- [x] Run the gates and `npm run build`.

#### Task 4-2 · `Segments` draws in a flex row and keeps its parts

The shared segment takes a height, so the component that already divides a run inline also divides one whose parts are flex items, and a part that carries a key keeps it.

**NOW:** `Segments` (`UIX/Elements/Segments.tsx`) puts an `inlineSegment` span before every part after the first, each part in a `Fragment` keyed by its index (`:9`), so a part inserted ahead of others remounts every part after it. `inlineSegment` (`UIX/Elements/segment.css.ts:12-19`) is `display: inline` with padding and a 6px inline margin and no height. Measured in the running app, the span is 2×15.6px inline and 2×0px as a flex item, where `display: inline` is blockified and the box has no content. `Segments` has two consumers, both inline, where a height doesn't apply and the parts never change order: the notification bar's label (`Core/Interface/Notifications/ActionLabel.tsx:107,135`) and a page-history caption (`Core/Interface/Windows/PageReaderWindow.tsx:215`). `NavTrail`, `PathField`, and the Archive's trail draw their own segment, not this one.

**PROCEDURE**

1. Write and watch fail: `Segments.test.tsx` gains "a keyed part keeps its key": two keyed parts render, a third is inserted ahead of them, and the two keep their DOM nodes. The file renders to static markup under the `node` environment today, so this case mounts through `createRoot` and `act` under `// @vitest-environment jsdom`, as `UIX/Interactions/paneCtl.test.tsx` does.
2. The span takes its height, and a part's `Fragment` takes the part's own key where it has one; the index-key suppression leaves, since Biome no longer reads the key as an index.

**AFTER**

```UIX/Elements/segment.css.ts diff
@@ inlineSegment @@
 export const inlineSegment = style([
   segment,
   {
     display: 'inline',
+    // An inline box ignores it; a flex row blockifies the span, which then has no content to stand on.
+    height: '1.2em',
     paddingInline: 'calc(var(--segment-width, 2px) / 2)',
     marginInline: '6px',
   },
 ])
```

```UIX/Elements/Segments.tsx diff
-import { Fragment, type ReactNode } from 'react'
+import { Fragment, isValidElement, type ReactNode } from 'react'
@@ Segments @@
       {parts.map((part, i) => (
-        // biome-ignore lint/suspicious/noArrayIndexKey: the parts are positional by definition
-        <Fragment key={i}>
+        <Fragment key={isValidElement(part) && part.key !== null ? part.key : i}>
```

**VERIFY**

- [x] The new case went red before the change and is green after; the rest of `Segments.test.tsx` passes untouched.
- [x] Live: the notification bar's divider between its message and count, and a page-history caption's divider between date and time, measure the same box before and after (`getBoundingClientRect` of the segment in each).
- [x] Run the gates and `npm run build`.

#### Task 4-3 · A Link's per-view Format on right-click

A Link value's right-click offers its view's Format, the look Table's heading already offers, on both of its menus; a surface holding no look, the Properties panel, offers none.

**NOW:** a Link value's right-click opens the connection menu when its link resolves to a page or an address, and the cell menu otherwise (`Core/Properties/Pickers/ValueSeat.tsx:226-246`). The cell menu's `link` context carries no style (`Core/Actions/cellMenu.ts:15,55-56`), pinned by `cellMenu.test.ts:134-135`; the connection menu withholds its own `Format` row, which rewrites a link's text in the editor, from a value (`Core/Actions/connectionMenu.ts:98`). A Link column's looks are `LINK_DISPLAYS` (`Core/Properties/columnStyles.ts:28`), labeled Format (`Core/Properties/typeDisplay.ts`), and `styleBranch` builds that submenu for Table's heading (`Core/Actions/columnMenu.ts:89-92`; `Core/Views/Table/useColumns.ts:198-224`). `LinkAction` already carries value-only actions the editor ignores (`cell:clear`, `cell:hide`; `linkEdit`'s `default` answers null, `Core/MarkdownPM/Links/linkEdit.ts:56-57`), and `CellMenuAction` already includes `StyleAction`. The seat applies a style action only on the cell-menu path (`ValueSeat.tsx:249-250`). `SeatHost.style` answers null for the panel (`ValueSeat.tsx:51-52`).

**PROCEDURE**

1. Write and watch fail: `cardGestures.test.tsx:344` ("pops the link menu, which closes with Clear and Remove") and `cellGestures.test.tsx:453` ("a link value's menu is the link menu, closing with Clear and no Remove") each assert a link value's whole action list, which gains the Format submenu's row after `title:copylink`; each takes a title saying the menu carries its view's Format and expects that row, its submenu holding the three `style:look:link-*` actions. `cellMenu.test.ts:134-135` becomes "a link column → the link menu, carrying filled and its view's look", expecting `{ kind: 'link', filled: true, current: DATES }`, and a new case expects `cellMenuModel` of that context to hold a `Format` submenu after the authoring rows; `connectionMenu.test.ts` gains "a value with a view's look lists Format with the link forms, its current one checked" for a page link and an address, beside `:80`'s case, which keeps its title for a value without a look.
2. `connectionMenu.ts`: `LinkMenuContext.value` takes `style`; the model draws `styleBranch` for a value holding one; `LinkAction` includes `StyleAction`, and `isLinkAction` admits one.
3. `cellMenu.ts`: the `link` kind takes `current` and draws `styleBranch` after its authoring rows.
4. `ValueSeat.tsx`: the link target carries the surface's style, and both paths end in one `restyle`.

**AFTER**

```Core/Actions/connectionMenu.ts diff
@@ imports @@
+import type { ColumnStyle } from '../Properties/columnStyles'
+import { parseStyleAction, type StyleAction, styleBranch } from './columnMenu'
@@ LinkMenuContext @@
-export type LinkMenuContext = { editable: boolean; value?: { hideable?: HideFrom } } & (
+export type LinkMenuContext = {
+  editable: boolean
+  value?: { hideable?: HideFrom; style?: ColumnStyle }
+} & (
@@ LINK_ACTIONS @@
 const LINK_ACTIONS = [...LINK_EDIT_ACTIONS, ...CELL_ACTIONS] as const
-export type LinkAction = (typeof LINK_ACTIONS)[number]
+export type LinkAction = (typeof LINK_ACTIONS)[number] | StyleAction
@@ isLinkAction @@
 export const isLinkAction = (action: LinkMenuAction): action is LinkAction =>
-  (LINK_ACTIONS as readonly string[]).includes(action)
+  (LINK_ACTIONS as readonly string[]).includes(action) || parseStyleAction(action) !== null
@@ connectionMenuModel @@
   const format = ctx.kind === 'url' && ctx.editable && !ctx.value ? [FORMAT_ROW(ctx.web)] : []
+  const look = ctx.value?.style ? styleBranch({ type: 'link', current: ctx.value.style }) : []
@@
-  return joinGroups([opens, authoring, [...copies, ...format], closing])
+  return joinGroups([opens, authoring, [...copies, ...format, ...look], closing])
```

```Core/Actions/cellMenu.ts diff
@@ CellMenuKind @@
-  | { kind: 'link'; filled: boolean }
+  | { kind: 'link'; filled: boolean; current?: ColumnStyle }
@@ baseCellMenu @@
     case 'link':
-      return { kind: 'link', filled }
+      return { kind: 'link', filled, ...(style ? { current: style } : {}) }
@@ baseCellMenuModel @@
     case 'link':
       return [
         [
           ...(ctx.filled ? [{ label: 'Edit Title', action: 'rename' as const }] : []),
           { label: 'Edit Link', action: 'editLink' },
         ],
+        ...(ctx.current ? [styleBranch({ type: 'link', current: ctx.current })] : []),
       ]
```

```Core/Properties/Pickers/ValueSeat.tsx diff
@@ menu @@
     const act = (action: CellMenuAction | LinkAction): boolean =>
       run(row, column, valueMenuIntent(action), el)
+    const restyle = (action: string): void => {
+      const style = parseStyleAction(action)
+      if (style) live.current.setStyle?.(column, style.key, style.value)
+    }
     const link =
       !label && value.kind === 'link'
         ? linkMenuTarget(
             resolveLink(readLinkText(value.value), host.connections()?.index, host.holder(row)),
             true,
-            { hideable: host.hide?.from },
+            { hideable: host.hide?.from, style: host.style(column) ?? undefined },
           )
         : null
     if (link) {
       const action = await hold(() => showConnectionMenu(link))
-      if (action) act(action)
+      if (action && !act(action)) restyle(action)
       return
     }
@@
     if (!action || runFileMenuAction(action, column.def, value, chip, commit) || act(action)) return
-    const style = parseStyleAction(action)
-    if (style) live.current.setStyle?.(column, style.key, style.value)
+    restyle(action)
   }
```

**VERIFY**

- [x] The four rewritten cases and the new ones went red before the change and are green after; `ValueSeat.test.tsx`, `valueClick.test.ts`, and the editor's link-menu suites pass untouched.
- [x] `git grep -n "'format:link" -- Core/Properties Core/Views` finds nothing: the editor's text-rewriting Format never reaches a value.
- [x] Live, in `~/Test`, on a Cards view and a Table view holding a Link property: right-click a link that resolves, and one that doesn't; each offers **Format** with the three forms, the current one checked, and a pick changes every value of that property in that view alone. The Properties panel's right-click on the same value offers no Format.
- [x] Run the gates.

#### Task 4-4 · The grip reads its row's first line

The grip and the check sit on a first line their surface can state, so a row that runs to two lines keeps them beside its first. A surface that states none keeps them where they are.

**NOW:** one rule centers the grip, the check, and a chevron on their box's full height: `top: 50%; transform: translateY(-50%)` (`UIX/Table/table.css:183-194`). The grip and the check sit in a `.cell-lead`, padded evenly by `--cell-padding-y` (`table.css:64-65,73-76`), so the middle of the cell is the middle of its content box. A row's first line is as tall as the tallest thing on it, a 20px chip or inline button over 16px of text (`UIX/Labels/label-base.css.ts:15`; `UIX/Buttons/button-base.css.ts:25-26`), so a rule that assumed one text line (`height: 1lh`) would sit the grip 2px high on any row holding a chip. A chevron sits in a band's head or a bundle's title box, which never run to two lines.

**AFTER**

```UIX/Table/table.css diff
@@ the rail slot @@
-/* The rail slot directly left of a row's icon, centering its grip, its check, or a band's or nested row's chevron. */
+/* The rail slot directly left of a row's icon: its grip or check centered on the row's first line, which is the whole row unless its surface states `--row-first-line`, and a band's or nested row's chevron centered. */
 .row-grip,
 .row-check,
 .table .row-chevron {
   position: absolute;
   left: calc(-1 * var(--rail-inset));
   width: var(--rail-inset);
-  top: 50%;
-  transform: translateY(-50%);
   display: inline-flex;
   align-items: center;
   justify-content: center;
 }
+.table .row-chevron {
+  top: 50%;
+  transform: translateY(-50%);
+}
@@ .row-grip, .row-check @@
 .row-grip,
 .row-check {
+  top: var(--cell-padding-y);
+  height: var(--row-first-line, calc(100% - 2 * var(--cell-padding-y)));
   transition: opacity var(--reveal-fade) var(--ease-base);
 }
```

**VERIFY**

- [x] Live, in `~/Test`, measured with `getBoundingClientRect` against the phase's base: the grip's and the check's vertical center is unchanged, within a tenth of a pixel, on a plain Table row, a Table row holding a chip, the Archive's first row, and a Trash row; a band's chevron hasn't moved. No surface states `--row-first-line` until Task 6-2, so nothing moves in this task.
- [x] Run the gates, then `view-delta` for Phase 4.
- [x] Check for unnecessary code or mistakes.

#### Review Checkpoint

- [x] Two review agents, `code-simplification` and `adversarial-review`, reading outward: no other hover **+** in Core is a raw `Button` that should be an `AccessoryButton`, and `tabIndex` and `data-reveal-held` are the only attributes it forwards; no inline consumer of `Segments` changed size; the editor's link menus, the tables' link cells, and `applyLinkAction` are untouched by `LinkAction`'s wider type, and a style action can't reach `linkEdit` as anything but a no-op; the per-view Format appears exactly where `SeatHost.style` answers a style; every `.row-grip`, `.row-check`, and `.row-chevron` in Core sits exactly where it did (Table, Archive, Trash, bands).

### Phase 5 — The Saved View and the Kind Record

**GOAL:** Two registrations that List would otherwise make a third time become one each: a per-id map's patch slots and merge depth are one record, and a kind's record names its property pane and reads the one Title Icons entry. Nothing a user can see changes. It's a separate phase because Phase 6 adds a map, two flags, and a third record through exactly these seams.

#### Task 5-1 · A per-id map's keys and depth are one record

`ENTRY_KEYS` and the depth table inside `mergeViewEdit` become one record, so a new per-id map names its patch slots and its merge depth in one entry, beside its schema field and its `ROLES` entry, which the compiler already demands.

**NOW:** a per-id map of the saved view (`column_widths`, `column_alignments`, `column_styles`) is named in `ENTRY_KEYS` (`Core/Views/views.ts:249-253`), which splits a patch into per-id slots, and again in `mergeViewEdit`'s depth table (`views.ts:294`), which merges two edits per id; `EntryKey` is read by `Core/Views/Host/liveView.ts:4,34`.

**AFTER**

```Core/Views/views.ts diff
@@ ENTRY_KEYS @@
-const ENTRY_KEYS = [
-  'column_widths',
-  'column_alignments',
-  'column_styles',
-] as const satisfies readonly (keyof SavedView)[]
-export type EntryKey = (typeof ENTRY_KEYS)[number]
-const isEntryKey = (k: string): k is EntryKey => (ENTRY_KEYS as readonly string[]).includes(k)
+const ENTRY_DEPTH = {
+  column_widths: 1,
+  column_alignments: 1,
+  column_styles: 2,
+} as const satisfies Partial<Record<keyof SavedView, number>>
+export type EntryKey = keyof typeof ENTRY_DEPTH
+const isEntryKey = (k: string): k is EntryKey => Object.hasOwn(ENTRY_DEPTH, k)
@@ mergeViewEdit @@
-          { group: 1, sub_group: 1, column_widths: 1, column_alignments: 1, column_styles: 2 },
+          { group: 1, sub_group: 1, ...ENTRY_DEPTH },
```

**VERIFY**

- [x] `views.test.ts`' `mergeViewEdit`, `slotsOf`, and `foldView` cases and `liveView`'s suites pass untouched.
- [x] Run the gates.

#### Task 5-2 · The record names its property pane, and Title Icons is written once

A kind's record states the pane that lists its properties, which `ViewPane` and the view editor both draw, and the Title Icons switch two records write identically becomes one entry.

**NOW:** `ViewPane`'s `visibility` case returns `VisibilityFrame` for every kind (`Core/Views/Settings/ViewPane.tsx:67-68`), and the view editor's Layout leaf names `VisibilityFrame` again under `leaf === 'visibility'` (`Core/Views/Settings/ViewFrame.tsx:202-212`). `SwitchEntry` is private to `Core/Views/Host/viewKinds.ts:8-13`, with `icon: IconName`, though `switchRow` takes a `string` glyph (`UIX/Menus/MenuIndex.tsx:91-92`). Table and Cards each write `{ icon: 'file-text', label: 'Title Icons', key: 'hide_page_icons', invert: true }` (`Core/Views/Table/tableKind.ts:12`; `Core/Views/Cards/cardsKind.ts:28`). The registry imports the records (`viewKinds.ts:5-6`), so a record can import a value only from a module the registry doesn't feed; `Core/Views/views.ts` already keeps each kind's label and icon as plain data (`VIEW_KINDS`, `:26-33`) and the flag's default (`VIEW_DEFAULTS`, `:220`).

**PROCEDURE**

1. `views.ts` takes the switch's type as `ViewSwitch` and the one `TITLE_ICONS` entry; `viewKinds.ts` drops `SwitchEntry` and its `IconName` import.
2. `ViewPane.tsx` names the property pane's props once as `PropertyPaneProps`, which `VisibilityFrame` takes in place of its inline type; `ViewKindRecord.layout` takes `Properties`; Table's and Cards' records name `VisibilityFrame` and read `TITLE_ICONS`.
3. `ViewPane` and `ViewFrame` draw the record's pane; both drop their `VisibilityFrame` import.

**AFTER**

```Core/Views/views.ts diff
@@ ViewFlag @@
 }[keyof SavedView]
+
+/** A flag as a kind's switch draws it; `invert` shows the switch on while the flag is off. */
+export interface ViewSwitch {
+  icon: string
+  label: string
+  key: ViewFlag
+  invert?: boolean
+}
+
+export const TITLE_ICONS: ViewSwitch = {
+  icon: 'file-text',
+  label: 'Title Icons',
+  key: 'hide_page_icons',
+  invert: true,
+}
```

```Core/Views/Host/viewKinds.ts diff
 import type { MenuRow } from '@pommora/uix/Menus/MenuIndex'
-import type { IconName } from '@pommora/uix/Symbols'
-import type { SavedView, ViewFlag, ViewType, ViewWriter } from '../views'
+import type { SavedView, ViewSwitch, ViewType, ViewWriter } from '../views'
+import type { PropertyPaneProps } from '../Settings/ViewPane'
 import type { ViewHostApi } from './useViewHost'
 import { TABLE_KIND } from '../Table/tableKind'
 import { CARDS_KIND } from '../Cards/cardsKind'
 
-type SwitchEntry = {
-  icon: IconName
-  label: string
-  key: ViewFlag
-  invert?: boolean
-}
-
 export interface ViewKindRecord {
   Renderer: (p: { host: ViewHostApi }) => React.JSX.Element
   nests: boolean
   layout: {
     leaf: 'visibility' | 'switches'
-    switches: SwitchEntry[]
+    Properties: (p: PropertyPaneProps) => React.JSX.Element | null
+    switches: ViewSwitch[]
     rows?: (view: SavedView, write: ViewWriter) => MenuRow[]
   }
 }
```

```Core/Views/Table/tableKind.ts diff
 import type { ViewKindRecord } from '../Host/viewKinds'
+import { VisibilityFrame } from '../Settings/VisibilityFrame'
+import { TITLE_ICONS } from '../views'
 import { TableView } from './TableView'
 
 export const TABLE_KIND: ViewKindRecord = {
   Renderer: TableView,
   nests: true,
   layout: {
     leaf: 'visibility',
+    Properties: VisibilityFrame,
     switches: [
       { icon: 'columns-3-cog', label: 'Column Icons', key: 'hide_column_icons', invert: true },
       { icon: 'view-table', label: 'Hide Borders', key: 'hide_borders' },
-      { icon: 'file-text', label: 'Title Icons', key: 'hide_page_icons', invert: true },
+      TITLE_ICONS,
     ],
   },
 }
```

```Core/Views/Cards/cardsKind.ts diff
@@ imports @@
-import { type CardBanner, type ViewFormat, viewOption } from '../views'
+import { type CardBanner, TITLE_ICONS, type ViewFormat, viewOption } from '../views'
 import type { ViewKindRecord } from '../Host/viewKinds'
+import { VisibilityFrame } from '../Settings/VisibilityFrame'
@@ CARDS_KIND @@
     leaf: 'switches',
+    Properties: VisibilityFrame,
     switches: [
       { icon: 'map', label: 'Hide Location', key: 'hide_location' },
       { icon: 'wrap-text', label: 'Wrap Titles', key: 'wrap_titles' },
-      { icon: 'file-text', label: 'Title Icons', key: 'hide_page_icons', invert: true },
+      TITLE_ICONS,
       { icon: 'folder-closed', label: 'Set Cards', key: 'set_cards' },
     ],
```

```Core/Views/Settings/ViewPane.tsx diff
@@ imports @@
+import type { ReactNode } from 'react'
-import { VisibilityFrame } from './VisibilityFrame'
@@ PaneProps @@
   save: ViewWriter
 }
+
+export type PropertyPaneProps = PaneProps & { footer?: ReactNode; current?: string }
@@ ViewPane @@
   switch (id) {
-    case 'visibility':
-      return <VisibilityFrame {...pane} />
+    case 'visibility': {
+      const { Properties } = presentedKind(view.type).layout
+      return <Properties {...pane} />
+    }
```

```Core/Views/Settings/VisibilityFrame.tsx diff
@@ imports @@
-import type { ReactNode } from 'react'
-import type { PaneProps } from './ViewPane'
+import type { PropertyPaneProps } from './ViewPane'
@@ VisibilityFrame @@
-}: PaneProps & { footer?: ReactNode; current?: string }): React.JSX.Element | null {
+}: PropertyPaneProps): React.JSX.Element | null {
```

```Core/Views/Settings/ViewFrame.tsx diff
@@ imports @@
-import { VisibilityFrame } from './VisibilityFrame'
@@ ViewEditor @@
   const toViews: MenuBack = { label: 'Views', onBack: () => setPane(null) }
   const leaf: PaneProps = { view, schema, back: toViews, save }
+  const { layout } = presentedKind(view.type)
   const detail =
     pane !== 'layout' ? (
       pane && <ViewPane id={pane} source={source} {...leaf} />
-    ) : presentedKind(view.type).layout.leaf === 'visibility' ? (
-      <VisibilityFrame
+    ) : layout.leaf === 'visibility' ? (
+      <layout.Properties
         {...leaf}
         current="Layout"
```

**VERIFY**

- [x] `git grep -n "'Title Icons'" -- Core` finds `views.ts` and tests only; `git grep -n "VisibilityFrame" -- Core/Views/Settings/ViewPane.tsx Core/Views/Settings/ViewFrame.tsx` finds nothing.
- [x] `ViewFrame.test.tsx`, `SettingsFrame.test.tsx`, and `liveView.test.tsx` pass untouched; `Core/Session/sliceGraph.test.ts` and the engine and host graph tests stay green, and `npm run build` reads `✓ built in` (a record importing a pane is a new import edge; a scan of runtime imports, type-only ones dropped, finds no cycle through `viewKinds.ts`).
- [x] Run the gates, then `view-delta` for Phase 5.
- [x] Check for unnecessary code or mistakes.

#### Review Checkpoint

- [x] Two review agents, `code-simplification` and `adversarial-review`, reading outward: `ENTRY_DEPTH` is read wherever `ENTRY_KEYS` was and nowhere names a per-id map twice; `views.ts` gained plain data alone and still imports no React or UIX; no import cycle runs through `viewKinds.ts` (records import panes, panes import the registry's `presentedKind` only where they did); the two doors draw the same panes for Table and Cards as before.

### Phase 6 — List

**GOAL:** List draws. The saved view gains a side map and two flags, List's property pane lists the two sides as two columns, the renderer composes the row frame, the clickable value, `Segments`, and the hover **+**, and the record's registration makes the picker's List tile live. It's one phase because none of its three tasks is reachable until the last one registers the record, and the checkpoint reviews List whole.

#### Task 6-1 · Sides, and the two-column pane

A property's side is stored per view over a default for its type, and List's property pane shows the two sides as two columns that trade rows by displacement, hide by the eye, and change side by right-click (D-1 to D-3, E-1 to E-9).

**NOW:** no saved-view field holds a side; Table's alignment is the nearest shape, a stored override over a Table-owned per-type default (`alignFor`, `Core/Views/Table/useColumns.ts:34-48,70-71`). The property pane is `VisibilityFrame` (`Core/Views/Settings/VisibilityFrame.tsx`), one line zone of shown rows over a hidden group, whose row is built inline (`:36-61`): an icon, a label, an eye through `hideEye`, a disabled eye on Title, and `hiddenRow` on a hidden one, over a derivation of the shown and hidden columns, their labels, and the hide toggle (`:78-88,123-127`) that a second pane would otherwise restate. A displacement zone trades items with another of its `family` through `receive`, closes the lifted item's gap in its home zone where that zone states `release`, and holds an item whose `carry` answers null to its own zone (`UIX/Interactions/engine.tsx:91-103,310-315,477`). The live check of 11-09-2026 ran two such zones inside the real settings pane: reorder, crossing both ways, Title held to Left, an inert hidden foot outside the zone's box, the keyboard lift and step, Escape, and a scrolled pane all hold, given a zone that stretches to its column's height and reads the engine's `--drag-floor` when empty, as Cards' grids do (`UIX/Interactions/engine.tsx:352-357`; `Core/Views/Cards/cards-view.css:51`) (*§Open Items · Settled in Planning*). A menu heading is `MenuRowView`'s `kind: 'heading'` row (`UIX/Menus/MenuIndex.tsx:161-162`), and `menuCompact` sets a menu's compact row padding (`UIX/Menus/menu-row.css.ts:109-116`); a row's label already ends in an ellipsis and scrolls on hover (`UIX/Menus/MenuRows.tsx:125`).

**PROCEDURE**

1. Write and watch fail: `Core/Views/List/listSides.test.ts` — `sideFor` answers D-2's default for each type and a stored side over it; `sideColumn` lists Left in stored order and Right reversed (E-3); `sideDrop` at Right's top writes the id last in `property_order`, between two Right rows writes it just before the row drawn above it in `property_order` (after the row drawn below), at Left's end writes it last, across sides writes `column_sides` in the same patch, within a side writes no `column_sides`, and leaves a hidden id where it stands (E-6). `Core/Views/Settings/SidesFrame.test.tsx` — two headings, **Left** and **Right**, each a menu heading; Title among Left's rows with a disabled eye (E-8); a hidden property at the foot of its own column, ghosted (E-5), where a view that never placed the two stamps shows Creation Time and Last Modified at Right's foot; an eye click writes `hideShown` or `unhide`; a row's right-click offers **Move to Right** in Left and **Move to Left** in Right, Title offers neither, and a pick writes `column_sides` (E-7).
2. `views.ts` takes `SIDES`, `Side`, and `column_sides` (a per-id map: one `ENTRY_DEPTH` entry); `configReach.ts` names its role.
3. Create `Core/Views/List/listSides.ts`. A stored side stays stored when it equals its type's default, as a stored alignment does (`useColumns.ts:219-222`); nothing prunes the map.
4. `VisibilityFrame.tsx` exports `visibilityPane`, the one derivation of what a property pane lists (the shown and hidden columns, their names and icons, the hide toggle, and the row), and reads it itself in place of `VisibilityGroups` and its inline derivation; `SidesFrame` reads the same.
5. Create `Core/Views/Settings/SidesFrame.tsx` and `Core/Views/Settings/sides-frame.css.ts`.

**AFTER**

```Core/Views/views.ts diff
@@ COLUMN_ALIGNS @@
 export type ColumnAlign = (typeof COLUMN_ALIGNS)[number]
+
+export const SIDES = ['left', 'right'] as const
+export type Side = (typeof SIDES)[number]
@@ savedView @@
     column_styles: entriesOf(columnStyle).optional().catch(undefined),
+    column_sides: entriesOf(z.enum(SIDES)).optional().catch(undefined),
@@ ENTRY_DEPTH @@
   column_styles: 2,
+  column_sides: 1,
 } as const satisfies Partial<Record<keyof SavedView, number>>
```

```Core/Nexus/configReach.ts diff
@@ ROLES @@
   column_styles: 'idMap',
+  column_sides: 'idMap',
```

```Core/Views/List/listSides.ts diff
+import { nextOrder } from '@pommora/uix/Utilities/moveItem'
+import type { ColumnType, ResolvedColumn } from '../../Properties/properties'
+import { placeInShown } from '../Pipeline/columns'
+import type { SavedView, Side, ViewPatch } from '../views'
+
+const DEFAULT_SIDE: Record<ColumnType, Side> = {
+  title: 'left',
+  context: 'left',
+  status: 'left',
+  select: 'left',
+  multiSelect: 'left',
+  checkbox: 'right',
+  link: 'right',
+  text: 'right',
+  file: 'right',
+  number: 'right',
+  dateTime: 'right',
+  createdTime: 'right',
+  lastEditedTime: 'right',
+}
+
+export const sideFor = (column: ResolvedColumn, view: SavedView): Side =>
+  view.column_sides?.[column.id] ?? DEFAULT_SIDE[column.type]
+
+/** A side's column of the property pane, top to bottom: Left as its group reads, Right from the row's edge inward. */
+export function sideColumn(columns: ResolvedColumn[], view: SavedView, side: Side): ResolvedColumn[] {
+  const on = columns.filter((c) => sideFor(c, view) === side)
+  return side === 'left' ? on : on.reverse()
+}
+
+/** What a drop into a side's column writes: the property placed in the one order, and its side where that changed. Right lists its side reversed, so a slot there sits just before the row drawn above it in the order. */
+export function sideDrop(
+  view: SavedView,
+  shown: ResolvedColumn[],
+  side: Side,
+  id: string,
+  beforeId: string | null,
+): ViewPatch {
+  const ids = shown.map((c) => c.id)
+  let before = beforeId
+  if (side === 'right') {
+    const drawn = nextOrder(
+      sideColumn(shown, view, side).map((c) => c.id),
+      id,
+      beforeId,
+    )
+    before = drawn[drawn.indexOf(id) - 1] ?? null
+  }
+  const rest = ids.filter((x) => x !== id)
+  return {
+    ...placeInShown(view, ids, id, before === null ? rest.length : rest.indexOf(before)),
+    ...(sideFor(shown.find((c) => c.id === id)!, view) !== side && {
+      column_sides: { [id]: side },
+    }),
+  }
+}
```

```Core/Views/Settings/VisibilityFrame.tsx diff
@@ imports @@
+import type { NexusTree } from '../../Nexus/tree'
-import { FILEDATA } from '../../Properties/properties'
+import { FILEDATA, type ResolvedColumn } from '../../Properties/properties'
-import { MenuRowView } from '@pommora/uix/Menus/MenuIndex'
+import { type MenuRow, MenuRowView } from '@pommora/uix/Menus/MenuIndex'
-import type { VisibilityPaneProps } from './ViewPane'
+import type { PaneProps, VisibilityPaneProps } from './ViewPane'
-import { type HideControls, hideEye } from './OptionOrderList'
+import { hideEye } from './OptionOrderList'
@@ VisibilityGroups @@
-function VisibilityGroups({ … }): React.JSX.Element {
-  … (the whole component, lines 23-68)
-}
+export function visibilityPane({ view, schema, save }: PaneProps, tree: NexusTree) {
+  const contextIds = contextIdsOf(tree)
+  const contexts = contextsByIdOf(tree)
+  const columnOf = (id: string): ResolvedColumn => resolveColumn(id, schema, contextIds)!
+  const shown = resolveColumns(view, schema, contextIds)
+  // The hidden list's own membership, not hidden_properties: a prop absent from property_order is hidden by absence and reads as such.
+  const hidden = hiddenListIds(view, schema, contextIds).map(columnOf)
+  const hiddenIds = new Set(hidden.map((c) => c.id))
+  const hide = {
+    isHidden: (id: string) => hiddenIds.has(id),
+    onToggleHidden: (id: string) =>
+      save(hiddenIds.has(id) ? unhide(view, id) : hideShown(view, id)),
+  }
+  const label = (id: string): string => columnLabel(columnOf(id), contexts)
+  const icon = (id: string): string => columnIcon(columnOf(id), contexts)
+  const row = (c: ResolvedColumn): MenuRow => ({
+    kind: 'item',
+    icon: <Icon name={icon(c.id)} size={s.ICON.doc} />,
+    label: label(c.id),
+    trailing:
+      c.kind === 'title'
+        ? {
+            // PLACEHOLDER
+            kind: 'button',
+            icon: 'eye',
+            ariaLabel: 'Always Shown',
+            disabled: true,
+            onClick: () => {},
+          }
+        : { kind: 'field', children: hideEye(label(c.id), c.id, hide) },
+    className: hiddenIds.has(c.id) ? s.hiddenRow : undefined,
+  })
+  return { shown, hidden, label, icon, row }
+}
@@ VisibilityFrame @@
 export function VisibilityFrame({
-  schema,
-  view,
-  back,
-  save,
   footer,
   current = 'Visibility',
+  ...pane
 }: VisibilityPaneProps): React.JSX.Element | null {
   const tree = useSession((st) => st.tree)
   if (!tree) return null
-
-  const contextIds = contextIdsOf(tree)
-  const shownIds = resolveColumns(view, schema, contextIds).map((c) => c.id)
-  const hiddenIds = hiddenListIds(view, schema, contextIds)
-  // The hidden list's own membership, not hidden_properties: a prop absent from property_order is hidden by absence and reads as such.
-  const hiddenSet = new Set(hiddenIds)
-  const columnOf = (id: string) => resolveColumn(id, schema, contextIds)!
-  const nameFor = (id: string): string => columnLabel(columnOf(id), contextsByIdOf(tree))
-  const iconFor = (id: string): string => columnIcon(columnOf(id), contextsByIdOf(tree))
+  const { view, schema, back, save } = pane
+  const { shown, hidden, label, icon, row } = visibilityPane(pane, tree)
+  const shownIds = shown.map((c) => c.id)
+  const line = (c: ResolvedColumn): React.JSX.Element => (
+    <LineRow key={c.id} id={c.id}>
+      <MenuRowView row={row(c)} />
+    </LineRow>
+  )
@@
           titles: { members: 'Shown Properties', rest: 'Hidden Properties' },
-          label: nameFor,
-          glyph: (id) => <Icon name={iconFor(id)} />,
+          label,
+          glyph: (id) => <Icon name={icon(id)} />,
           onDrop: handleDrop,
           watch: [view, schema, tree],
         })}
       >
-        <VisibilityGroups
-          shownIds={shownIds}
-          hiddenIds={hiddenIds}
-          hide={{
-            isHidden: (id) => hiddenSet.has(id),
-            onToggleHidden: (id) =>
-              save(hiddenSet.has(id) ? unhide(view, id) : hideShown(view, id)),
-          }}
-          nameFor={nameFor}
-          iconFor={iconFor}
-        />
+        <LineGroup id="members">{shown.map(line)}</LineGroup>
+        <PaneRestGroup className={s.hiddenZone}>{hidden.map(line)}</PaneRestGroup>
       </LineZone>
```

```Core/Views/Settings/sides-frame.css.ts diff
+import { style } from '@vanilla-extract/css'
+import { vars as colorVars } from '@pommora/uix/Theme/color.css'
+import { frameZone } from '@pommora/uix/Menus/frames.css'
+
+// KNOBS — the two columns
+const PANE = { width: 200, gap: 8, radius: 8 }
+
+export const columns = style({
+  display: 'grid',
+  gridTemplateColumns: `repeat(2, minmax(0, ${PANE.width}px))`,
+  gap: `${PANE.gap}px`,
+})
+
+export const column = style({ display: 'flex', flexDirection: 'column', minWidth: 0 })
+
+export const list = style([
+  frameZone,
+  { borderRadius: `${PANE.radius}px`, background: colorVars.color.fill.quaternary },
+])
+
+/* The zone fills its column, so the room under a short column's last row is its trailing slot, and an empty one stands as tall as the row lifted over it. */
+export const zone = style({ flex: '1 1 auto', minHeight: 'var(--drag-floor, 0px)' })
```

```Core/Views/Settings/SidesFrame.tsx diff
+import {
+  carries,
+  DropSlot,
+  type Family,
+  SortableZone,
+  useDragItem,
+} from '@pommora/uix/Interactions/drag'
+import { type MenuRow, MenuRowView } from '@pommora/uix/Menus/MenuIndex'
+import { MenuScrollFrame, MenuTopRow } from '@pommora/uix/Menus/MenuRows'
+import { SETTINGS_PANE_MAX_HEIGHT } from '@pommora/uix/Menus/frames.css'
+import { menuCompact } from '@pommora/uix/Menus/menu-row.css'
+import { cx } from '@pommora/uix/Utilities/cx'
+import { popMenu } from '../../Actions/menuActions'
+import { FILEDATA } from '../../Properties/properties'
+import { useSession } from '../../Session/store'
+import { sideColumn, sideDrop, sideFor } from '../List/listSides'
+import type { Side } from '../views'
+import type { VisibilityPaneProps } from './ViewPane'
+import { visibilityPane } from './VisibilityFrame'
+import * as s from './sides-frame.css'
+
+const SIDES_FAMILY: Family<string> = { name: 'view-sides' }
+
+const SIDE_COLUMNS: { side: Side; heading: string; other: Side; move: string }[] = [
+  { side: 'left', heading: 'Left', other: 'right', move: 'Move to Right' },
+  { side: 'right', heading: 'Right', other: 'left', move: 'Move to Left' },
+]
+
+function SideRow({
+  id,
+  row,
+  onMenu,
+}: {
+  id: string
+  row: MenuRow
+  onMenu?: (e: React.MouseEvent) => void
+}): React.JSX.Element {
+  const drag = useDragItem(id)
+  return (
+    // biome-ignore lint/a11y/noStaticElementInteractions: a right-click affordance on a container, not a control — the contents carry their own semantics
+    <div ref={drag.setNodeRef} style={drag.style} onContextMenu={onMenu} {...drag.handle}>
+      <MenuRowView row={row} />
+    </div>
+  )
+}
+
+export function SidesFrame({
+  footer,
+  current = 'Visibility',
+  ...pane
+}: VisibilityPaneProps): React.JSX.Element | null {
+  const tree = useSession((st) => st.tree)
+  if (!tree) return null
+  const { view, back, save } = pane
+  const { shown, hidden, label, row } = visibilityPane(pane, tree)
+
+  return (
+    <MenuScrollFrame
+      header={<MenuTopRow {...back} current={current} />}
+      footer={footer}
+      maxHeight={SETTINGS_PANE_MAX_HEIGHT}
+    >
+      <div className={cx(s.columns, menuCompact)}>
+        {SIDE_COLUMNS.map(({ side, heading, other, move }) => {
+          const drawn = sideColumn(shown, view, side)
+          const drop = (id: string, beforeId: string | null): void =>
+            void save(sideDrop(view, shown, side, id, beforeId))
+          const menu = (id: string) => async (e: React.MouseEvent) => {
+            e.preventDefault()
+            if (await popMenu([{ label: move, action: 'move' }]))
+              void save({ column_sides: { [id]: other } })
+          }
+          return (
+            <div key={side} className={s.column}>
+              <MenuRowView row={{ kind: 'heading', label: heading }} />
+              <div className={s.list}>
+                <SortableZone
+                  className={s.zone}
+                  items={drawn.map((c) => c.id)}
+                  axis="y"
+                  family={SIDES_FAMILY}
+                  label={label}
+                  carry={[carries(SIDES_FAMILY, (id) => (id === FILEDATA.title.id ? null : id))]}
+                  onMove={drop}
+                  receive={drop}
+                  // A zone that releases closes its lifted row's gap while the row is over the other column; the side and the order land in `receive`'s one write.
+                  release={() => {}}
+                >
+                  <DropSlot foreignOnly />
+                  {drawn.map((c) => (
+                    <SideRow
+                      key={c.id}
+                      id={c.id}
+                      row={row(c)}
+                      onMenu={c.kind === 'title' ? undefined : menu(c.id)}
+                    />
+                  ))}
+                </SortableZone>
+                {hidden
+                  .filter((c) => sideFor(c, view) === side)
+                  .map((c) => (
+                    // biome-ignore lint/a11y/noStaticElementInteractions: a right-click affordance on a container, not a control — the contents carry their own semantics
+                    <div key={c.id} onContextMenu={menu(c.id)}>
+                      <MenuRowView row={row(c)} />
+                    </div>
+                  ))}
+              </div>
+            </div>
+          )
+        })}
+      </div>
+    </MenuScrollFrame>
+  )
+}
```

**VERIFY**

- [x] Every new case went red before its code and is green after; `VisibilityFrame`'s suites pass untouched.
- [x] `configReach.test.ts`: the `rich` fixture takes `column_sides: { prop_s: 'right' }`, and "a property clear" expects `view.column_sides` to equal `{}` beside its `column_styles` line.
- [x] `npm run build` reads `✓ built in` (a new `*.css.ts`).
- [x] The pane is unreachable until Task 6-3 registers the record; its live checks run there.
- [x] Run the gates.

#### Task 6-2 · The renderer

`ListView` draws a page as one row: the grip, then a left group and a right group of the title and the values each side holds, a bar between properties, and a hover **+** after the last one (A-1, A-2, A-4, B-1 to B-11, C-1 to C-5, G-1, G-2, H-1 to H-3).

**NOW:** no file draws a List. The pieces stand ready from Phases 2 to 5 and Task 6-1: `BandRows`, `PageRow`, `RowGrip`, `PageTitle`, `rowMenu`, `rowOpen`, `GhostTitle` (`Core/Views/Rows/RowFrame.tsx`), `SeatedValue` with `seatOf` and `.value-inline`, the policy's `drawn`, `drawnColumns` and `addColumns`, `Segments` at a height, `AccessoryButton` forwarding `tabIndex` and `data-reveal-held`, and `sideFor`. `GroupBand` writes a headed band's indent as inline `padding-left` on its row (`Core/Views/Bands/GroupBand.tsx:147`), so nothing below the row can read it. The shell selectors key on Table's heading and shell: the gutter-reserving lead inset and the zero top padding on `.detail-body:has(.table-head)` (`Core/Interface/interface.css:58-61`), and the banner divider's full bleed on `.detail-scroll:has(.table-shell)` (`Core/Interface/Header/content-banner.css:94-98`); Archive wears both a shell and a heading, and TrashFrame wears neither inside `.detail-scroll`. The tile peek anchors on the first `[data-view-lead]` in a view, which Table puts on its heading, bands on their row, and Cards on every card (`Core/Tiles/Surfaces/ViewTile.tsx:68-81`); an ungrouped List holds neither a heading nor a band. Three measurements from the live checks shape the sheet: the wrap order holds with a left group at `flex: 1 1 min-content`, a title box at `min-width: min-content` over an unseen sizer capped at the minimum, and a right group at `flex: none`; a Text value's seat grows 24px on hover unless its pen's room is held at rest, the room `cells.css:35` writes as `20px + 4px`; a List value sits in `RowLead`'s `.data-cell` (`UIX/Table/RowLead.tsx:13`), so its Text takes Table's in-cell pen form (`cells.css:47-57`), which is C-3's "as it does in Table"; and a short title keeps its own width at every row width (*§Open Items · Settled in Planning*).

**PROCEDURE**

1. Write and watch fail: `columns.test.ts` gains `describe('addable')`: it answers as `addColumns`' two lists being non-empty does, over a row drawing none, some, and all of its Contexts and properties, with a stamp drawn. `ListView`'s own cases are written in Task 6-3, once a List view seats `ListView`: until the record registers, the harness draws a List view as a Table.
2. `views.ts` takes `hide_outlines` and `wrap_rows` with their defaults; `configReach.ts` names their roles. `columns.ts` takes `addable` beside `addColumns`: the count form of "would the Add list hold anything", which a memoized row reads from the `ctx` it already holds without building the list.
3. `GroupBand` states a headed band's indent as `--band-indent` on the band, and `group-band.css` pads the row from it.
4. `PageRow` carries `data-view-lead="row"`; Table's heading still precedes every row, so Table's peek is unchanged.
5. Create `Core/Views/List/ListView.tsx` and `Core/Views/List/list-view.css`. The sheet states Table's `--cell-padding-y` at 3px, so a List row, its band heads, and the band rhythm that derives from the token stand shorter than a Table's (B-12); a wrapped line's gap is twice that padding, so it stands where the next row would.
6. Re-key the two shell selectors: the lead inset on the shell, the top padding and the banner's bleed on the heading.

**AFTER**

```Core/Views/views.ts diff
@@ savedView @@
     hide_borders: z.boolean().optional().catch(undefined),
+    hide_outlines: z.boolean().optional().catch(undefined),
+    wrap_rows: z.boolean().optional().catch(undefined),
@@ VIEW_DEFAULTS @@
   hide_borders: false,
+  hide_outlines: false,
+  wrap_rows: false,
```

```Core/Nexus/configReach.ts diff
@@ ROLES @@
   hide_borders: 'none',
+  hide_outlines: 'none',
+  wrap_rows: 'none',
```

```Core/Views/Pipeline/columns.ts diff
@@ imports @@
   type PropertyDefinition,
@@ addColumns @@
 }
+
+/** Whether an item's Add list would hold anything, by count: it draws fewer columns than its Contexts and properties number. */
+export const addable = (
+  drawn: ResolvedColumn[],
+  schema: PropertyDefinition[],
+  contexts: ReadonlyMap<string, unknown>,
+): boolean => drawn.filter((c) => c.kind !== 'stamp').length < schema.length + contexts.size
```

```Core/Properties/Cells/cells.css diff
@@ .cell-text-host:has(> .cell-pen) @@
 .cell-text-host:has(> .cell-pen) {
-  --pen-room: calc(var(--reveal, 0) * (20px + 4px));
+  --pen-span: calc(20px + 4px);
+  --pen-room: calc(var(--reveal, 0) * var(--pen-span));
 }
```

```Core/Views/Bands/GroupBand.tsx diff
@@ HeadedBand @@
     <div
       ref={box}
       className={cx('group-band', node.kind === 'bucket' && node.parentKey !== null && 'sub-band')}
+      style={indent ? ({ '--band-indent': indent } as React.CSSProperties) : undefined}
     >
       <div
         ref={springRow}
         className="group-band-row"
         data-view-lead="band"
         data-collapsed={open ? undefined : ''}
         data-empty={node.empty ? '' : undefined}
-        style={indent ? { paddingLeft: indent } : undefined}
       >
```

```Core/Views/Bands/group-band.css diff
@@ .group-band-row @@
 .group-band-row {
+  padding-left: var(--band-indent, 0px);
   padding-bottom: var(--band-clearance);
```

```Core/Views/Rows/RowFrame.tsx diff
@@ PageRow @@
       data-rid={row.id}
+      data-view-lead="row"
       data-reveal-host=""
```

```Core/Views/List/ListView.tsx diff
+import { memo } from 'react'
+import { Segments } from '@pommora/uix/Elements/Segments'
+import { LineZone } from '@pommora/uix/Interactions/drag'
+import { overScrollLabel } from '@pommora/uix/Interactions/OverScroll'
+import { AccessoryButton } from '@pommora/uix/Menus/MenuRows'
+import { RowLead } from '@pommora/uix/Table/RowLead'
+import { text } from '@pommora/uix/Theme'
+import { cx } from '@pommora/uix/Utilities/cx'
+import { SeatedValue, seatOf } from '../../Properties/Cells/SeatedValue'
+import type { ColumnStyle } from '../../Properties/columnStyles'
+import { ValueSeat } from '../../Properties/Pickers/ValueSeat'
+import type { ResolvedColumn } from '../../Properties/properties'
+import type { ValueContext } from '../../Properties/valueContext'
+import type { ViewHostApi } from '../Host/useViewHost'
+import { type ItemApi, useViewInteractions } from '../Host/useViewInteractions'
+import { addable, drawnColumns } from '../Pipeline/columns'
+import {
+  BandRows,
+  GhostTitle,
+  PageRow,
+  PageTitle,
+  RowGrip,
+  rowMenu,
+  rowOpen,
+} from '../Rows/RowFrame'
+import type { ViewRow } from '../viewRow'
+import { type SavedView, type Side, viewOption } from '../views'
+import { sideFor } from './listSides'
+import '../Rows/table-shell.css'
+import './list-view.css'
+
+export function ListView({ host }: { host: ViewHostApi }): React.JSX.Element {
+  const { view, columns, ctx, styleById, dragDisabled } = host
+  const interactions = useViewInteractions(host, {
+    ghost: { graceMs: 0 },
+    seat: { anchor: seatOf, drawn: (row) => drawnColumns(row, columns, true) },
+    newPages: 'pair',
+    item: {},
+  })
+  const { seat } = interactions
+  const open = seat.open
+
+  // ── The render ────────────────────────────────────────────────────────────
+
+  const hideIcon = viewOption(view, 'hide_page_icons')
+  return (
+    <div ref={host.viewRootRef} className="table table-shell list-view">
+      <LineZone {...interactions.listZone()}>
+        <div
+          className={cx(
+            'table-grid no-borders',
+            text.body.standard,
+            !viewOption(view, 'hide_outlines') && 'outlined',
+            viewOption(view, 'wrap_rows') && 'wraps',
+          )}
+        >
+          <BandRows
+            host={host}
+            interactions={interactions}
+            fill
+            ghost={(padLeft) => (
+              <RowLead className="ghost-worn" indent={padLeft}>
+                <div className="list-view-group">
+                  <GhostTitle hideIcon={hideIcon} />
+                </div>
+              </RowLead>
+            )}
+            row={(row, { padLeft, lead }) => (
+              <ListPageRow
+                key={row.id}
+                row={row}
+                view={view}
+                columns={columns}
+                ctx={ctx}
+                styleById={styleById}
+                padLeft={padLeft}
+                lead={lead}
+                api={interactions.item}
+                naming={host.naming?.id === row.id ? host.naming : null}
+                editing={
+                  open?.mode === 'editor' && open.rowId === row.id ? open.columnId : null
+                }
+                adding={open?.mode === 'add' && open.rowId === row.id}
+                hideIcon={hideIcon}
+                dragDisabled={dragDisabled}
+              />
+            )}
+          />
+        </div>
+      </LineZone>
+      <ValueSeat seat={seat} />
+    </div>
+  )
+}
+
+// ── A row ───────────────────────────────────────────────────────────────────
+
+const ListPageRow = memo(function ListPageRow({
+  row,
+  view,
+  columns,
+  ctx,
+  styleById,
+  padLeft,
+  lead,
+  api,
+  naming,
+  editing,
+  adding,
+  hideIcon,
+  dragDisabled,
+}: {
+  row: ViewRow
+  view: SavedView
+  columns: ResolvedColumn[]
+  ctx: ValueContext
+  styleById: Map<string, ColumnStyle>
+  padLeft: string
+  lead: boolean
+  api: ItemApi
+  naming: ViewHostApi['naming']
+  editing: string | null
+  adding: boolean
+  hideIcon: boolean
+  dragDisabled: boolean
+}): React.JSX.Element {
+  const pageMenu = rowMenu(api, row)
+  const drawn = drawnColumns(row, columns, true)
+  const item = (c: ResolvedColumn): React.JSX.Element =>
+    c.kind === 'title' ? (
+      // biome-ignore lint/a11y/useKeyWithClickEvents lint/a11y/noStaticElementInteractions: the row has the keys, and Enter opens it
+      <span key={c.id} className="list-view-title" data-title={row.title} onClick={rowOpen(api, row)}>
+        <PageTitle row={row} naming={naming} hideIcon={hideIcon} api={api} />
+      </span>
+    ) : (
+      <SeatedValue
+        key={c.id}
+        className="value-inline"
+        row={row}
+        column={c}
+        ctx={ctx}
+        style={styleById.get(c.id)!}
+        api={api}
+        editor={editing === c.id ? api.editor(row, c) : null}
+      />
+    )
+  const on = (side: Side): React.JSX.Element[] =>
+    columns
+      .filter((c) => sideFor(c, view) === side && (c.kind === 'title' || drawn.includes(c)))
+      .map(item)
+  const right = on('right')
+  const add = addable(drawn, ctx.schema, ctx.contexts) && (
+    <AccessoryButton
+      icon="plus"
+      size="body"
+      ariaLabel="Add Property"
+      create
+      reveal
+      data-reveal-held={adding || undefined}
+      tabIndex={-1}
+      onClick={(e) => api.openAdd(row, e.currentTarget)}
+    />
+  )
+  return (
+    <PageRow row={row} api={api} lead={lead} dragDisabled={dragDisabled}>
+      <RowLead indent={padLeft} onContextMenu={pageMenu}>
+        <RowGrip onMenu={pageMenu} dragDisabled={dragDisabled} />
+        <div className="list-view-line">
+          <div className={cx('list-view-group', overScrollLabel)}>
+            <Segments parts={on('left')} />
+            {right.length === 0 && add}
+          </div>
+          {right.length > 0 && (
+            <div className={cx('list-view-group list-view-right', overScrollLabel)}>
+              <Segments parts={right} />
+              {add}
+            </div>
+          )}
+        </div>
+      </RowLead>
+    </PageRow>
+  )
+})
```

```Core/Properties/Pickers/ValueSeat.tsx diff
@@ useValueSeat @@
-/** One value's click, right-click, and editing, a surface's Add list, and the Table's sweep, shared by the table, cards, the Properties panel, and the menus that open away from a value. */
+/** One value's click, right-click, and editing, a surface's Add list, and the Table's sweep, shared by every surface that seats a value and the menus that open away from one. */
```

```Core/Views/List/list-view.css diff
+/* A List row over the table vocabulary: one lead cell holding a line of two groups. */
+
+.table.list-view {
+  --cell-padding-y: 3px; /* KNOB — a row's top and bottom room, under Table's; the selector outranks `.table`'s own statement */
+  --list-view-value-max: 200px; /* KNOB — where a property's values end in an ellipsis */
+  --list-view-title-min: 120px; /* KNOB — how short a title's text gets before the row wraps or its left group scrolls */
+  --list-view-wrap-gap: 14px; /* KNOB — the room between the two groups */
+  --list-view-bar-width: 100px; /* KNOB — a bar-look Number's width */
+  --row-first-line: 20px; /* a chip's and an inline button's height: every line of a row stands this tall, and the grip centers on the first */
+}
+.list-view .table-grid {
+  --cols: minmax(0, 1fr);
+}
+
+.list-view-line {
+  display: flex;
+  align-items: center;
+  gap: calc(2 * var(--cell-padding-y)) var(--list-view-wrap-gap); /* a wrapped line stands a row's rhythm below the first */
+}
+.table-grid.wraps .list-view-line {
+  flex-wrap: wrap;
+}
+/* The left group's basis is its narrowest form, so the line breaks only once the title is at its floor; narrower than that, it scrolls. */
+.list-view-group {
+  display: flex;
+  align-items: center;
+  flex: 1 1 min-content;
+  min-height: var(--row-first-line);
+}
+.list-view-group > * {
+  flex: none;
+}
+.list-view-group.list-view-right {
+  flex: none;
+  max-width: 100%;
+  margin-left: auto;
+}
+
+/* A title's floor is the smaller of its text and --list-view-title-min: the unseen sizer holds the box to that, and the text, breakable anywhere under a one-line clamp, gives up the rest. */
+.list-view-group > .list-view-title {
+  flex: 0 1 auto;
+  min-width: min-content;
+}
+.list-view-title::before {
+  content: attr(data-title);
+  display: block;
+  height: 0;
+  overflow: hidden;
+  visibility: hidden;
+  white-space: nowrap;
+  max-width: var(--list-view-title-min);
+  padding-inline-start: calc(var(--icon-body) + var(--cell-icon-gap));
+}
+.list-view-title:not(:has(svg))::before {
+  padding-inline-start: 0;
+}
+.list-view-title .cell-title {
+  display: flex;
+  align-items: center;
+  max-width: none;
+}
+.list-view-title .cell-title-text {
+  display: -webkit-box;
+  -webkit-box-orient: vertical;
+  -webkit-line-clamp: 1;
+  overflow: hidden;
+  overflow-wrap: anywhere;
+  white-space: normal;
+}
+
+.list-view .value-inline {
+  max-width: var(--list-view-value-max);
+}
+.list-view .value-inline:has(.cell-bar) {
+  width: var(--list-view-bar-width);
+}
+/* A value sits in the lead's `.data-cell`, so its Text takes Table's in-cell pen; here the pen holds its room at rest, so nothing on the row moves on hover. */
+.list-view .cell-text-host:has(> .cell-pen) {
+  --pen-room: var(--pen-span);
+}
+
+/* A nested band's rail: from under its head to its last member, at its chevron. */
+.table-grid.outlined .group-band .group-band:not(.band-tail) > [data-reveal] {
+  position: relative;
+}
+.table-grid.outlined .group-band .group-band:not(.band-tail) > [data-reveal]::before {
+  content: "";
+  position: absolute;
+  top: var(--list-outline-gap);
+  bottom: var(--list-outline-gap);
+  left: calc(var(--band-indent) - var(--rail-inset) / 2 - var(--list-outline-width) / 2);
+  width: var(--list-outline-width);
+  border-radius: var(--list-outline-radius);
+  background: var(--list-outline-color);
+}
```

```Core/Interface/interface.css diff
@@ .detail-body @@
-.detail-scroll.has-header .detail-body:has(.table-head) {
-  padding-top: 0;
+.detail-scroll.has-header .detail-body:has(.table-shell) {
   --interface-inset-lead: calc(var(--content-inset) - var(--rail-inset));
 }
+.detail-scroll.has-header .detail-body:has(.table-head) {
+  padding-top: 0;
+}
```

```Core/Interface/Header/content-banner.css diff
@@ .banner-empty @@
 /* Over a table the divider meets the heading's full-bleed fill, pane edge to pane edge. */
-.detail-scroll:has(.table-shell) > .banner-empty {
+.detail-scroll:has(.table-head) > .banner-empty {
```

**VERIFY**

- [x] The `addable` case went red before its code and is green after; the band, row-drop, and Cards suites pass untouched (the band's indent now arrives by variable).
- [x] `git grep -nE "useColumns|useCellSweep|alignFor|COLUMN_LAYOUT" -- Core/Views/List` finds nothing: List reads no Table machinery.
- [x] Table, Cards, and Archive read the same live as at the phase's base: band heads indent as before, the banner divider still bleeds over a Table and the Archive, and a Table view's first row sits flush under its heading.
- [x] List's own live checks run in Task 6-3, once the record is registered.
- [x] Run the gates.

#### Task 6-3 · The record, and the tile goes live

List's record registers its renderer, its property pane, and its three switches in the rows slot, which draws at the view editor's root and in the footing of SettingsFrame's Layout, and the picker's List tile starts switching a view to List (A-1, A-3, E-1, E-2, F-1, F-2, I-5).

**NOW:** `BUILT_KINDS` holds Table and Cards (`Core/Views/Host/viewKinds.ts:25-28`); the type grid acts on a tile only when its type is in it (`Core/Views/Settings/LayoutFrame.tsx:33`), and a view saved as List draws as a Table through `presentedKind`'s fallback (`viewKinds.ts:30`), which stays for Gallery, Calendar, and Timeline. A kind's `switches` draw in SettingsFrame's Layout body under a separator (`LayoutFrame.tsx:42-58,77-79`) and under the editor's Layout leaf (`Core/Views/Settings/ViewFrame.tsx:206-211,218`); its `rows` draw in the footing of both the editor's root and SettingsFrame's Layout, under their own separator (`LayoutFrame.tsx:60-68,74`; `ViewFrame.tsx:182`). The mapping from a switch entry to its row is inline in `kindSwitches` (`LayoutFrame.tsx:46-54`), and `LayoutFrame.tsx` imports the registry (`:16`), which imports the records, so a record can't read that mapping from there; Cards' record builds its rows straight from the kit (`Core/Views/Cards/cardsKind.ts:31-58`). A kind with no `switches` still draws their separator under the type grid and under the editor's property pane. `ViewFrame.test.tsx:296-314` runs the Layout leaf's cases over Table and Cards, and `SettingsFrame.test.tsx:61,78` reads the presented kind's switches. No saved view in `~/Test` or `~/NexusOS` is of type `list`, so no view changes its look when the record lands.

**PROCEDURE**

1. Write and watch fail, each red until the registration line lands:
   - `Core/Views/List/ListView.test.tsx`, mounted through `Core/Testing/viewHarness.tsx`: a row draws its title and a Select value in the left group and a Date in the right group, in `property_order` (B-1, D-2); a property moved before Title in `property_order` draws before it (B-11); a property set to the other side by `column_sides` draws there (D-1); a blank value is absent and an unchecked Checkbox is drawn (B-4); a segment sits between every two items of a group and none before the **+** (B-2, B-9); the **+** is the right group's last child, the left group's when the right group is empty, and absent on a row drawing every property and Context (B-6, B-7, B-10); a click on the title opens the page, and a click on the row's empty stretch or on a Created value opens nothing (B-3); the **+** opens the add list, and a value committed from it shows its property (C-2); the grid carries `outlined` unless `hide_outlines` and `wraps` under `wrap_rows` (G-1, H-1); a value that appears ahead of another leaves the later one's DOM node in place (the segments key by their parts).
   - `ViewFrame.test.tsx` gains List's case as its own `it`, beside the `it.each` that stays at Table and Cards: before Layout is pressed, **Title Icons**, **Outlines**, and **Wrap Rows** are each found at the editor's root; after it, the Layout detail (the last scroll body; the root stays mounted under `FrameSlide`) holds two menu headings reading **Left** and **Right** and no **Outlines** switch.
   - `SettingsFrame.test.tsx` gains a List view: Visibility shows both headings; Layout shows the type grid and the three switches in its footing, with no separator between the grid and an empty body.
   - `ViewFrame.test.tsx` gains a case that presses the List tile on a Table view and reads `type: 'list'` in the saved patch (A-1), and presses the Gallery tile and reads no write (A-3).
2. `kindSwitches` answers null for a kind with no switches, and both of its separated callers draw their separator only over switches (I-5: an empty switch list draws nothing).
3. Create `Core/Views/List/listKind.ts`, its `switches` empty and its three switches in `rows` through `switchRows` (`Core/Views/Settings/switchRows.ts`, which holds `ViewSwitch` and `TITLE_ICONS` beside it), and register it.

**AFTER**

```Core/Views/Host/viewKinds.ts diff
@@ imports @@
 import { TABLE_KIND } from '../Table/tableKind'
 import { CARDS_KIND } from '../Cards/cardsKind'
+import { LIST_KIND } from '../List/listKind'
@@ BUILT_KINDS @@
   table: TABLE_KIND,
   cards: CARDS_KIND,
+  list: LIST_KIND,
```

```Core/Views/List/listKind.ts diff
+import type { ViewKindRecord } from '../Host/viewKinds'
+import { SidesFrame } from '../Settings/SidesFrame'
+import { switchRows, TITLE_ICONS, type ViewSwitch } from '../Settings/switchRows'
+import { ListView } from './ListView'
+
+const SWITCHES: ViewSwitch[] = [
+  TITLE_ICONS,
+  { icon: 'list-tree', label: 'Outlines', key: 'hide_outlines', invert: true },
+  { icon: 'wrap-text', label: 'Wrap Rows', key: 'wrap_rows' },
+]
+
+export const LIST_KIND: ViewKindRecord = {
+  Renderer: ListView,
+  Visibility: SidesFrame,
+  nests: true,
+  layout: {
+    leaf: 'visibility',
+    switches: [],
+    rows: (view, write) => switchRows(SWITCHES, view, write),
+  },
+}
```

```Core/Views/Settings/LayoutFrame.tsx diff
@@ kindSwitches @@
-export const kindSwitches = (view: SavedView, save: ViewWriter): React.JSX.Element => (
-  <MenuIndex
-    sections={[
-      {
-        rows: switchRows(presentedKind(view.type).layout.switches, view, save),
-      },
-    ]}
-  />
-)
+export function kindSwitches(view: SavedView, save: ViewWriter): React.JSX.Element | null {
+  const { switches } = presentedKind(view.type).layout
+  return switches.length > 0 ? (
+    <MenuIndex sections={[{ rows: switchRows(switches, view, save) }]} />
+  ) : null
+}
@@ LayoutFrame @@
 export function LayoutFrame({ view, back, save }: PaneProps): React.JSX.Element {
+  const switches = kindSwitches(view, save)
   return (
@@
       {typeGrid(view, save)}
-      <MenuSeparator flush />
-      {kindSwitches(view, save)}
+      {switches && <MenuSeparator flush />}
+      {switches}
     </MenuScrollFrame>
```

```Core/Views/Settings/ViewFrame.tsx diff
@@ ViewEditor @@
   const { layout, Visibility } = presentedKind(view.type)
+  const switches = kindSwitches(view, save)
   const detail =
@@
       <Visibility
         {...leaf}
         current="Layout"
         footer={
-          <>
-            <MenuSeparator flush />
-            {kindSwitches(view, save)}
-          </>
+          switches && (
+            <>
+              <MenuSeparator flush />
+              {switches}
+            </>
+          )
         }
       />
     ) : (
       <MenuScrollFrame
         header={<MenuTopRow {...toViews} current="Layout" />}
         maxHeight={s.SETTINGS_PANE_MAX_HEIGHT}
       >
-        {kindSwitches(view, save)}
+        {switches}
       </MenuScrollFrame>
     )
```

**VERIFY**

- [x] Every new case went red before its code and is green after; `useViewHost.test.tsx`' "cards seam" and every Table and Cards suite pass untouched.
- [x] A scan of runtime imports, type-only ones dropped, finds no cycle through `viewKinds.ts` (the record now imports `SidesFrame` and `switchRows`). `git grep -n "list: LIST_KIND" -- Core/Views/Host/viewKinds.ts` finds the registration, and `git grep -nE "type === 'list'|=== 'list'" -- Core/Views` finds nothing: no file under Views branches on the List type.
- [x] Live, in a scratch instance over `~/Test`, on a Collection whose pages hold a Select, a Multi-Select, a Date, a Number, a Checkbox, a Link, a Text, and a Context (seed them on throwaway pages, removed after):
  - [x] **The kind:** the picker's List tile switches a Table view to List and back; Gallery's tile does nothing; bands, sub-groups, the Location sort, filter, sort, search, creation from the hover ghost and the band's **+**, and a row's drag within and across bands behave as on the Table view of the same Collection (A-2).
  - [x] **The row:** each type sits on its default side; values of one property sit `--labels-gap` apart and a bar sits between properties and beside the title; a blank value is absent and an unchecked Checkbox shows; no line draws between rows; the title alone opens the page; a click on the empty stretch or a Created value does nothing, and a right-click there opens the page menu.
  - [x] **Values:** each type clicks, right-clicks, and edits as on a card; a Link's right-click offers Format; a Text value shows its first line and its pen, and hovering it moves nothing on the row; a long Text, Link, or chip run ends at 200px under the fade and scrolls on hover; a bar-look Number draws at its set width.
  - [x] **The +:** it reveals on the row's hover after the right group, or after the left group's last item on a row with no right values, holds while its list is open, takes no Tab stop, and is absent on a row with nothing left to add; a picked property shows on the view, and a value's Remove hides it.
  - [x] **Width:** narrowing the window shortens a long title to 120px of text and no further, then fades the left group, which scrolls on hover; a short title never reserves room it doesn't use. With **Wrap Rows** on, the right group drops to a second line, flush right, once the title is at its floor, and the title regains its room; the grip's center is the first line's center, wrapped and unwrapped, and every one-line row, the hover ghost and the standing ghost included, is the same height whether or not it draws a chip or a **+**, and shorter, measured, than a plain Table row of the same Collection (B-12); a wrapped row's second line stands as far below its first as the next row would; a wrapped row stays inside its band's width. Typing in a value's field or a rename doesn't strand the caret when the row re-wraps.
  - [x] **Outlines:** on by default; a Set inside a Set and a sub-group draw one rail each under their chevron, a top-level band draws none, and the switch removes them.
  - [x] **The pane:** SettingsFrame's Visibility and the view editor's Layout both open the two columns under **Left** and **Right** menu headings; the menu widens to them and returns on the way back, in a View Tile too; rows reorder within a column and cross both ways; Title reorders within Left and can't cross; a hidden property sits ghosted at its own column's foot and returns to its place and side when shown; a row's right-click moves it to the other side; a drop into an empty column and from a scrolled column both land; the keyboard lifts, steps, and drops within a column; Escape and a drop leave the menu open.
  - [x] **Switches:** Title Icons, Outlines, and Wrap Rows sit at the view editor's root and in SettingsFrame's Layout footing; SettingsFrame's Layout draws no empty section between the grid and the footing; Table's and Cards' switches sit where they did.
  - [x] **Selection:** a List row whose page is the selection washes as a Table row does.
  - [x] **Shell:** a List view takes the grip's gutter and the default top padding; the banner divider doesn't bleed over it; embedded in a View Tile it zooms as a Table does and the tile's peek resolves on its first band, or its first row when ungrouped.
- [x] Run the gates and `npm run build`, then `view-delta` for Phase 6. The Stop in *§Process Overview* follows this phase's checkpoint.
- [x] Check for unnecessary code or mistakes.

#### Review Checkpoint

- [x] Two review agents, `code-simplification` and `adversarial-review`, reading outward: `ListView.tsx` holds presentation alone and repeats nothing `RowFrame.tsx`, `SeatedValue`, or the host already states; the sheet holds no rule another sheet has (the borderless state is Table's, the gutter is the shell's); the rail reads the outline tokens, and its `::before` is a deliberate third beside the menus' and the editor's, since a band's body takes no class from its kind; `SidesFrame` and `VisibilityFrame` share their row and differ only where E-7 says they do; no renderer, pane, or frame branches on a view's type; `leaf` keeps its two members and its one reader, and `switchRows` is the only mapping from a switch entry to its row; `nests: true` gives List every grouping behavior with no List code; a view of an unbuilt kind still draws as a Table; a property's delete drops its side; the wrap order holds with no script measuring a row.

### Phase 7 — The Views Drive

**GOAL:** The live drive that crosses saved views with the real app gains List's cases and the regressions this plan shares with Table, Cards, and the panel, so the behavior Task 6-3 read by hand is re-run by script at every later head. It's a separate phase because it lands after Nathan's Stop, on the design he confirmed, and it changes no production code.

#### Task 7-1 · Group 11 — List

`Views Drive/live-drive.mjs` takes an eleventh group, and its matrix a table for it, in the forms groups 2 to 10 use.

**NOW:** the drive (`.claude/scripts/Views Drive/live-drive.mjs`, 2,370 lines) runs groups `2` to `10` (`BUILT`, `:11`), each case an `item(group, phase, decision, name, pass, detail)` through the `bc`, `fold`, and `reg` helpers (`:24-29`), against `Collection A` in `~/Test` with a seeded `VD Stage` Select and `VD Done` Checkbox; `MATRIX.md` holds one table per group, and `.claude/scripts/README.md` describes the drive. Selectors that differ by head sit in `DRIFT`.

**PROCEDURE**

1. Record the drive's tally for groups `2` to `10` at the BASELINE head before Phase 1 opens (*§Process Overview*'s first line), so "as they did at the baseline" has a figure.
2. Add `'11'` to `BUILT` and `11: group11` to the run's dispatch map. Seed what List's cases need beside the drive's `VD Stage`, `VD Done`, and `VD Due`: a Link, a Text, and a Number on two throwaway pages, removed by the drive's own restore.
3. Write the cases below as `group11`. A case that only this plan makes true is a `bc` (List's own, and E-6, C-4, and I-2, which change behavior outside List); a case that holds at every head is a `reg` (I-3's band **+** and H-3's grip). A width case reads the view's computed `--list-view-value-max` or `--list-view-title-min` rather than a literal, since both are tuned at the Stop. A case that fails is fixed in the code, or in the drive where the case misreads a decision, never bent to pass.
4. Add *Group 11 — List* to `MATRIX.md` with the same rows, and one clause to the Views Drive's entry in `.claude/scripts/README.md`.
5. On the owner's word of 11-10-2026, group 11 is a full matrix rather than the cases below alone: `MATRIX.md` states List's dimensions (grouping: none, folders, a property, a property with a sub-group; Wrap Rows, Outlines, and Title Icons each way; sides at their defaults, moved, and with a property ahead of Title; a row's contents: title alone, left values only, right values only, both, crowded; the window wide, at the wrap point, and narrow; indentation depth; the main pane and a View Tile; a filter, a sort, and a search active; a value of each property type) crossed with every interaction that reaches a List (the title's press and rename; each value's click and right-click menu; the **+**, Add, and Remove; the ghost row and a band's **+**; a row's drag within and across bands; the pane's drag by pointer and keyboard, its move menu, and its eye, through both doors; each switch through both doors; a kind switch to and from Table and Cards; the selection's highlight), what it prunes and why, and each case's decision. The cases below are its floor.

**AFTER**

```.claude/scripts/Views Drive/MATRIX.md diff
+#### Group 11 — List
+
+Derived from *List View — Decisions & Intention*; the regressions are the four behavior changes that work made outside List and the grip's unchanged place.
+
+| Case | Surface · Input | Expected | Decision |
+| --- | --- | --- | --- |
+| the picker's List tile switches the view to shorter rows and the Gallery tile writes nothing | Layout · both doors, tile press | `type: list` in the sidecar, and a row shorter than the Table row it replaced; no write for Gallery | A-1 · A-3 · B-12 |
+| a List row draws its title and VD Stage on the left and its Date on the right | List | the left group holds the title and the chip; the right group the date | B-1 · D-2 |
+| a property dragged before Title in a Table view draws before the title in List | Table heading drag, then List | the value precedes the title in the left group | B-11 |
+| a page holding no Date draws none, and an unchecked VD Done still draws | List | no Date seat; a checkbox seat | B-4 |
+| a bar sits between two properties and beside the title, and none before the + | List | one segment per adjacent pair; the + follows a value | B-2 · B-9 |
+| the title opens the page, and the row's empty stretch and a Created value open nothing | List · mouse press | the tab opens on the title alone | B-3 |
+| the row's + opens the add list, and a value set from it shows the property on the view | List · hover, press, pick | `property_order` takes the id; every row draws it | B-6 · C-2 |
+| a row with no right values carries its + after its last left item | List | the + is the left group's last child | B-7 |
+| a value's Remove hides its property from the view | List · right-click, native | `hidden_properties` takes the id | C-2 |
+| a long Text value ends at the maximum and scrolls on hover, and hovering it moves no neighbor | List · hover | the seat's width is the view's `--list-view-value-max`; its neighbor's box is unchanged | C-3 |
+| Outlines draws a rail under a Sub-Set's chevron and none under a top-level Set's | List · Sub-Set A and Set Beta | one rail in the nested band; the switch removes it | G-1 · G-2 |
+| with Wrap Rows on, a narrowed row drops its right group to a second line, flush right, with the grip on the first | List · the window narrowed | the right group's top is below the left's; its right edge is the row's; the grip's center is the first line's | H-1 · H-2 · H-3 |
+| with Wrap Rows off, a narrowed row shortens its title to the minimum, then scrolls its left group | List · the window narrowed | the title's text is the view's `--list-view-title-min` wide; the left group's `scrollWidth` exceeds its width | H-2 |
+| List's switches sit at the editor's root and in Settings' Layout footing | both doors | Title Icons, Outlines, and Wrap Rows found before Layout is pressed, and in the footing | F-2 |
+| Visibility and the editor's Layout open the two columns under Left and Right | both doors | two menu headings; Title among Left's rows | E-1 · E-2 · E-8 |
+| a row dragged from Left to Right writes its side and its place in one save | Settings door · pointer drag | one `views:save` holding `column_sides` and `property_order` | E-7 · I-4 |
+| Title dragged toward Right returns to Left | the same | no write | E-9 |
+| a row's right-click moves it to the other side | the same · right-click, native | `column_sides` takes the other side | E-7 |
+| a hidden property rests at its own column's foot and returns to its place and side | the same · eye | the row leaves the zone for the foot, ghosted; shown again, it sits between its neighbors | E-5 |
+| a keyboard lift steps a row within its column, and Escape leaves the menu open | the same · Space, Arrow, Escape | the order writes on Space; the pane stays | E-7 |
+| a List row drags across bands as a Table row does | List, grouped by VD Stage · grip drag | the page's VD Stage takes the band's value | A-2 |
+| a hidden Table column returns between its neighbors after another column is dragged | Table · heading menu Hide, heading drag, Visibility eye | `property_order` keeps the hidden id's slot | E-6 |
+| a Link value's right-click offers Format on a card and in a Table cell, and none in the panel | Cards · Table · the Properties panel, right-click, native | the Format submenu on the two views; absent in the panel | C-4 |
+| a Set band's + still creates a page in its Set | Table · hover, press | the newborn lands last in the Set | I-3 |
+| a Table row's grip sits at its row's center, on a plain row and on one holding a chip | Table | each within a tenth of a pixel of the row's center | H-3 |
+| a panel value pressed and moved 8px lifts nothing | the Properties panel · pointer drag | no drag source | I-2 |
```

**VERIFY**

- [x] `node ".claude/scripts/Views Drive/live-drive.mjs" 11 --landed 11` passes every case, and groups `2` to `10` pass at `--landed 11` as they did at the baseline.
- [x] `~/Test` is restored by the drive and no process it started remains.
- [x] Run the gates (the drive changes no production code; the gates confirm nothing else moved).

#### Review Checkpoint

- [ ] One `adversarial-review` agent reads `group11` against *List View — Decisions & Intention*: each case asserts what its decision names, would fail without the change it's tagged for, and is a `bc` or a `reg` as step 3 sorts them.

### Phase 8 — Documentation

**GOAL:** The feature documents say what List is and stop saying what the work made false. Each edit replaces the sentence in place, to `~/The Studio/.claude/references/studio-documentation.md`, in the register of *CollectionsPM §The Archive*: what the feature is and how it behaves, from the product's side, without the code behind it. List is the least unique view kind, so its section is four short paragraphs, each fact stated once, and its mentions elsewhere are a clause each. Outside *§List* the edits cut about as many words as they add: two clauses the work makes stale leave with nothing in their place.

#### Task 8-1 · `ViewTypesPM.md`

**NOW:** the document says Table and Cards have renderers (`:4`), that bands show "in both renderers" (`:47`), that Layout pins Cards' rows alone and that the editor's Layout "lists the properties above the kind's switches", which is already untrue of Cards (`:62`), that Visibility is one flat list (`:67`), that the Table view "owns the shell … and the band rhythm" (`:79`), that TableView's own sheet holds the shell ArchiveView wears (`:95,97`), that List has no renderer and, a second time, that the unbuilt kinds' tiles are inert (`:159-161`, after `:4`), and that "neither renderer" virtualizes (`:174`). A link's menu is described without its view's Format (`:91`).

**AFTER**

```.claude/Features/ViewTypesPM.md diff
@@ :4 @@
-Table and Cards have renderers, and the other four appear in the type picker at full weight but don't switch.
+Table, Cards, and List have renderers, and the other three appear in the type picker at full weight but don't switch.
@@ :8 · The Saved-View Model @@
-per-column widths and alignments, and `column_styles`
+per-column widths, alignments, and sides, and `column_styles`
@@ :47 · Group @@
-Per-group disclosure bands (`GroupBand.tsx`) are shown in both renderers:
+Per-group disclosure bands (`GroupBand.tsx`) are shown in every renderer:
@@ :62 · Surfaces · Layout @@
-the 3×2 type picker and the kind's switches, with Cards' Card Image, Card Style, and Card Scale pinned below.
+the 3×2 type picker and the kind's switches, with Cards' Card Image, Card Style, and Card Scale, or List's switches, pinned below.
@@
-and the four frame rows, whose Layout lists the properties above the kind's switches.
+and the four frame rows, whose Layout lists the kind's properties, its switches, or both.
@@ :67 · Surfaces · Visibility @@
-Title is a draggable anchor that never hides.
+Title is a draggable anchor that never hides. A hidden property keeps its place in the order and returns to it when shown. A List view's Visibility is its two columns (*§List*).
@@ :79 · Table @@
-It is presentation only: the pipeline hands it resolved groups and per-cell values, and the view owns the shell, the grid density, the grip gutter, and the band rhythm.
+It is presentation only: the pipeline hands it resolved groups and per-cell values.
@@ :91 · Rows & Cells @@
-A link's menu offers Edit Title as the alias popover and Edit Link as the inline field on every surface.
+A link's menu offers Edit Title as the alias popover and Edit Link as the inline field on every surface, and its view's Format in a view.
@@ :95 · The Table Sheet @@
-TableView adds its own layer over it, `table-view.css`, whose shell ArchiveView wears too.
@@ :113 · the token table @@
-| Right Inset | `--table-right-inset` | → `--content-inset`; `0px` once overflowing (TableView's own) |
+| Right Inset | `--table-right-inset` | → `--content-inset` (the shell's); `0px` once overflowing (TableView's own) |
@@ :97 @@
-**SOURCE:** `UIX/Table/table-tokens.css` · `UIX/Table/table.css` · `Core/Views/Table/table-view.css`
+**SOURCE:** `UIX/Table/table-tokens.css` · `UIX/Table/table.css` · `Core/Views/Rows/table-shell.css` · `Core/Views/Table/table-view.css`
@@ :159-161 @@
-### List · Gallery · Calendar · Timeline
-
-Registered in `VIEW_KINDS` with no renderer behind them. Their picker tiles are inert, and a view carrying one of these kinds seats the default kind's renderer, Table.
+### List
+
+The List renderer (`Core/Views/List/`) draws each Page as one row without columns: the page's title and its property values side by side, in a left group that holds the title and a right group at the row's edge. Its rows are the Table's, drawn shorter, so the grip, the gutter, indentation, bands, grouping, sorting, creation, and drag behave as they do there, and no lines draw between rows.
+
+Each property sits on a side, set per view over a default for its type: options and Contexts on the left, everything else on the right. A thin bar separates one property's values from the next, and a property a page holds no value for is left off its row. A value clicks, right-clicks, and edits as it does on a card, and only the title opens the page. A hover **+** at the row's end lists the properties and Contexts the row doesn't show; picking one shows it on the view, and a value's **Remove** hides it.
+
+A long value ends at a maximum width and scrolls on hover. On a crowded row the title shortens first, down to a minimum, and then the left group scrolls; with **Wrap Rows** on, the right group drops to a second line instead. **Outlines** draws a rail beside the rows of each nested band.
+
+A List view's property pane shows the two sides as two columns, **Left** and **Right**. Left reads as the left group does, and Right reads from the row's edge inward. A property drags within a column and across to the other, a right-click moves it to the other side, and a hidden property rests at the foot of its column until it's shown again.
+
+### Gallery · Calendar · Timeline
+
+Registered in `VIEW_KINDS` with no renderer behind them. A view carrying one of these kinds seats the default kind's renderer, Table.
@@ :174 · Known Issues @@
-- **Neither renderer virtualizes.** Every row or card in a container is painted;
+- **No renderer virtualizes.** Every row or card in a container is painted;
```

**PROCEDURE**

1. Each `-` line is quoted from its cited line; find it there and replace it in place. `:91`'s sentence is quoted in part: keep the rest of its paragraph as it stands.
2. Add no rationale, no code path beyond the one *§List* names, and no sentence the diff doesn't hold.

**VERIFY**

- [x] `git grep -nE "both renderers|Neither renderer|the other four|owns the shell" -- .claude/Features/ViewTypesPM.md` finds nothing.
- [x] *§List* is four paragraphs and names no function, class, CSS token, or per-type table.
- [x] Outside *§List*, the edits' words removed are within ten of their words added (`git diff --word-diff` over the file, *§List*'s hunk set aside).

#### Task 8-2 · `PommoraDND.md`, `PropertiesPM.md`, `PommoraUIX.md`, `PommoraPRD.md`, and `FrameworkPM.md`

**NOW:** *PommoraDND §Insertion Line* lists "the settings frames" among the surfaces that take the drop line (`:38`), which List's property pane, a settings frame that displaces, makes false (E-7's stated exception). *PropertiesPM §The Value Picker* names the views that seat a value as "the Cards and Table views" (`:115`). *PommoraUIX* lists the surfaces that wear the tabular chrome as "TableView, ArchiveView, the Trash" (`.claude/Resources/PommoraUIX.md:393`). The PRD says the active view is tracked per machine (`:149`), which was already untrue: it's the sidecar's `active_view`. The PRD and the Framework say Table and Cards carry renderers (`PommoraPRD.md:151`; `FrameworkPM.md:21`).

**AFTER**

```.claude/Features/PommoraDND.md diff
@@ :38 · Insertion Line @@
-the Group and Sort panes, the settings frames, option lists,
+the Group and Sort panes, the settings frames apart from a List view's property pane, whose two columns displace, option lists,
```

```.claude/Resources/PommoraUIX.md diff
@@ :393 @@
-The tabular chrome every table surface uses (TableView, ArchiveView, the Trash):
+The tabular chrome every table surface uses (TableView, ListView, ArchiveView, the Trash):
```

```.claude/Features/PropertiesPM.md diff
@@ :115 · The Value Picker @@
-the Properties panel, the Cards and Table views, and a system menu's value rows.
+the Properties panel, every view, and a system menu's value rows.
```

```.claude/PommoraPRD.md diff
@@ :149 · Views @@
-the active view is tracked per-machine so switching it doesn't churn the synced file.
+the active view is recorded on the container's sidecar.
@@ :151 @@
-Table and Cards carry renderers; the rest are registered types with none.
+Table, Cards, and List carry renderers; the rest are registered types with none.
```

```.claude/FrameworkPM.md diff
@@ :21 · v0.6.0 — The View Renderers @@
-The remaining renderers — **List · Gallery · Calendar · Timeline** — over the shipped filter → group → sort pipeline. Table and Cards carry renderers; these four are registered types with none, and their picker tiles are inert.
+The remaining renderers — **Gallery · Calendar · Timeline** — over the shipped filter → group → sort pipeline. Table, Cards, and List carry renderers; these three are registered types with none, and their picker tiles are inert.
```

**VERIFY**

- [x] `git grep -n "Table and Cards carry renderers" -- .claude` finds nothing outside `Planning/` and `sessions/`.
- [x] `node .claude/scripts/check-atlas.mjs` exits 0.
- [x] `view-delta` shows the phase: documents only.

#### Review Checkpoint

- [x] Two review agents, `code-simplification` and `adversarial-review`, read outward over `.claude/Features`, `.claude/PommoraPRD.md`, `.claude/FrameworkPM.md`, and *§Reconciliation*: every quoted sentence reads as replaced, no document still says List has no renderer or that Visibility is one list for every kind, *§List* reads at the Archive section's level, and no sentence a decision keeps was rewritten.

---

### Completion Criteria

- **Conformance:** every change sits under *§Constraints*; no mechanism landed that an existing one already provided (one row frame, one clickable value, one statement of the add, show, and hide rules, one hover **+**, one divider, one placement rule for the property order, one registration for a per-id map, one property-pane seam on the kind record); nothing changed outside the files the tasks name, and the drag engine, Table's column machinery, Archive's and Trash's rows, `Core/Sync/`, and `Desktop/` are untouched.
- **Correctness:** each behavior Nathan named is observably true in `~/Test` as Task 6-3's VERIFY exercises it: the List tile switches a view; a row reads title and values in two groups, each property on its side; the pane's two columns trade rows and a hidden property returns to its place and side; Title Icons, Outlines, and Wrap Rows sit at the editor's root; a crowded row shortens its title and then scrolls or, under Wrap Rows, drops its right group; bands, grouping, sorting, creation, and drag match Table's. The four named behavior changes outside List are each observed where *§Constraints* names them.
- **Completeness:** every task and checkpoint in *§Process Overview* is ticked; every removal *§Concepts* names is gone; no scaffolding, debug output, live-check fixture, or unauthorized TODO remains.
- **Confirmation:** every "write and watch fail" test went red before its change and green after; every VERIFY ran and its output was read; the Views Drive's group 11 passes; the values tuned at the Stop carry Nathan's word.
- **Continuity:** *§Reconciliation* is walked; the documents Phase 8 names read true; the two I-7 follow-ups are raised in `IssuesPM.md`; every deviation is fixed or ruled on under *§Deviations*.
- **Confidence:** the three gates and `npm run build` are green from a clean checkout at HEAD; `view-delta <BASELINE>..HEAD` is reported with additions and removals apart, per phase and in total, against *§Overview · The Number*, and growth past it states what it bought; the neutral reviewer answers without ambiguity that the result holds to every principle this work set.

#### Final Verification

**THE STANDARD:** The work is finished when a later review of it finds nothing to correct. Not just doing the chores — doing the laundry, folding it, picking up what fell out of the hamper, emptying the lint trap, leaving no trace that anything went wrong. Nothing is carried as a concern, nothing is deferred where the fix is known, and nothing is declared that wasn't watched happen. Where something genuinely couldn't get there, the report names which and why, and everything else is still finished. Ambiguity encountered during execution was taken at its simplest reading and recorded; it didn't stop the run.

- [x] Phase Review: Phase 2 (with Phase 1) · Phase 3 · Phase 4 · Phase 5 · Phase 6 · Phase 7 · Phase 8
- [x] **Simplification lens** — one `opus-xhigh` agent reads `<BASELINE>..HEAD` whole for what can be removed, folded, or hoisted now that every phase has landed: a rule List's sheet restates, a prop a shared piece takes for one caller, a helper used once, a branch on a kind. Its findings are applied before any adversarial read.
- [x] **Adversarial lens** — two `opus-xhigh` agents over `<BASELINE>..HEAD`, one reading inward (each behavior against its tests and the decisions) and one outward (cohesion with the rest of Core, Desktop, and UIX; anything that reads as an odd one out; a regression on Table, Cards, the panel, Archive, or a tile). The orchestrator verifies each finding against the code before applying it.
- [x] **Neutral verification** — one `fable-high` agent, given only the BASELINE head, HEAD, and the intention under *§Constraints · Neutral Gate*, with no plan, log, or document, answers whether the result holds to every principle it states and what it would correct.
- [ ] **Own pass** — Task 6-3's live checks once more end to end as Nathan would use them, the Views Drive at `--landed 11` over every group, the Properties, Text Property, Option Picker, and Archive Drives against their baseline tallies (they exercise a card's value, the panel's value and **+**, and the Archive's shell and check by gesture), the gates from a clean state, baseline counts, the diff read once, and *§Completion Criteria* ticked.
- [ ] **Reconciliation** — *§Reconciliation* walked; *§Deviations* ruled on; STATUS and BASELINE's End filled.
- [ ] **Report** — in `closeout-review`'s closeout format, with the range presented through `/view-delta`, the per-phase and total delta, every deviation, and the neutral reviewer's answer verbatim.

#### Reconciliation

**Documentation**

- `.claude/Features/ViewTypesPM.md:4` — "Table and Cards have renderers, and the other four … don't switch" — Task 8-1
- `ViewTypesPM.md:8` — the column layout's fields, without sides — Task 8-1
- `ViewTypesPM.md:47` — "shown in both renderers" — Task 8-1
- `ViewTypesPM.md:62` — Layout pinning Cards' rows alone, and the editor's Layout listing "the properties above the kind's switches" — Task 8-1
- `ViewTypesPM.md:67` — Visibility as one flat list for every kind, and a hidden property's place — Task 8-1
- `ViewTypesPM.md:91` — a link's menu, without its view's Format — Task 8-1
- `ViewTypesPM.md:79` — the Table view "owns the shell … and the band rhythm" — Task 8-1
- `ViewTypesPM.md:95,97,113` — `table-view.css` as the sheet whose shell ArchiveView wears, and the Right Inset as TableView's own — Task 8-1
- `ViewTypesPM.md:159-161` — List among the kinds with no renderer — Task 8-1
- `ViewTypesPM.md:174` — "Neither renderer virtualizes" — Task 8-1
- `.claude/Features/PommoraDND.md:38` — "the settings frames" among the drop-line surfaces — Task 8-2
- `.claude/Features/PropertiesPM.md:115` — the views that seat a value, as "the Cards and Table views" — Task 8-2
- `.claude/Resources/PommoraUIX.md:393` — the surfaces wearing the tabular chrome, without ListView — Task 8-2
- *List View — Decisions & Intention §Open Items* 1 and 3 to 5 — settled by this plan (*§Open Items · Settled in Planning*), and 2 proposed and carried as *Open at Ratification* 5; removed there at ratification, on the owner's word
- `.claude/PommoraPRD.md:149` — "the active view is tracked per-machine" (false before this work: it's the sidecar's `active_view`) — Task 8-2
- `.claude/PommoraPRD.md:151` · `.claude/FrameworkPM.md:21` — "Table and Cards carry renderers" — Task 8-2
- `.claude/scripts/Views Drive/MATRIX.md` · `.claude/scripts/README.md` — the drive's groups — Task 7-1

**Comments**

- `Core/Views/Table/table-view.css:1` — "The table shell TableView and ArchiveView wear … (ArchiveView imports it from Views/Table)" — Task 2-1
- `Core/Archive/ArchiveView.tsx:18` — "archived items on TableView's sheet" — Task 2-1
- `Core/Views/Bands/group-band.css:1` — "the table's gutter chevron + sticky head" — Task 2-1
- `Core/Properties/Pickers/ValueSeat.tsx:92` — "shared by the table, cards, the Properties panel" — Task 6-2
- `UIX/Table/table.css:182` — "centering its grip, its check, or a band's or nested row's chevron" — Task 4-4
- `Core/Views/Cards/CardsView.tsx:145,535` — the two comments on a card's Add and its drag slop, which move with their code — Tasks 3-1, 3-2
- `Core/Views/Cards/cardColumns.ts:6,19` — the helpers' doc comments, which move with them — Task 3-2

**Tests**

- `Core/Views/Pipeline/columns.test.ts:234-241` — "writing the full visible order verbatim with hidden ids trailing" — Task 1-1
- `columns.test.ts:267` — "preserves foreign property_order ids at the tail" — Task 1-1
- `Core/Actions/cellMenu.test.ts:134-135` — a link context carrying no look — Task 4-3
- `Core/Views/Cards/cardGestures.test.tsx:344` · `Core/Views/Table/cellGestures.test.tsx:453` — a link value's menu listed without its view's Format — Task 4-3
- `Core/Views/Cards/cardColumns.test.ts` — the file, moved into `columns.test.ts` — Task 3-2
- `Core/Views/Settings/ViewFrame.test.tsx:296-314` — the Layout leaf's cases over two kinds — Task 6-3

**Issues, Raised in *§Final Verification · Reconciliation*, After the Stop That Follows Phase 6 (I-7)**

- Raised 11-11-2026 as I-069 to I-072, with I-073 (the pane's no-op `release`), I-074 (the rail's end at depth), and I-075 (a lane left scrolled), and I-054 extended to the Link value's Format.
- `IssuesPM.md` — "Archive's and Trash's rows draw a second copy of the row frame": `BundleRow` (`Core/Bundles/BundleTable.tsx:262-318`) composes `LineRow`, `RowLead`, a check, and the title markup by hand, with its row height held as a constant; folding it onto `PageRow` and `PageTitle` is the fix.
- `IssuesPM.md` — "Table's cells mount a value a third way": `DataRow`'s cell (`Core/Views/Table/TableView.tsx`) wires `click`, `menu`, the editor, and `Cell` beside the sweep's `pointerdown`; folding it onto `SeatedValue` is the fix.
- `IssuesPM.md` — "A value at a labeled row's end is ruled twice": the Properties panel's value rule (`Core/Properties/property-panel.css.ts`) and a Standard card's (`Core/Views/Cards/cards-view.css`, whose comment says "as the panel's does") both grow the value into the room its label leaves, at the row's end. Raised by Phase 3's review as a candidate; whether the two are equivalent is unproven.
- `IssuesPM.md` — "A card's value row restates a chip's height": `--card-row-h: 20px` (`Core/Views/Cards/cards-view.css`) is a hand-typed chip height, where List reads the kit's published `--label-height-roomy`. Raised by Phase 6's review as a candidate.

#### Open Items

**Settled in Planning (11-09-2026)**

- **E-7's premise holds.** Two displacement zones inside the real settings pane reorder, trade rows both ways, hold Title to Left, leave a hidden foot inert, step by keyboard, and survive Escape, a drop, and a scrolled pane. The zone needs to fill its column and read `--drag-floor` when empty, and the source zone needs `release`. No drag-kit change.
- **H-2 holds in plain CSS,** measured on an injected mock: one declaration, `flex-wrap`, is the whole of Wrap Rows, and H-1's deferral isn't needed. A title's floor is the smaller of its text and the minimum, through an unseen sizer.
- **A Text value's seat grows 24px on hover** unless its pen's room is held at rest; List holds it.
- **`Segments` draws nothing as a flex item** without a height; Task 4-2 gives it one.
- **One order, two columns (Decisions' Open Item 3):** the right group draws in stored order, the Right column lists it reversed, and a drop writes one placement in the one order, the side beside it where that changed.
- **A hidden property's place (Open Item 4):** its place in the one order; a reorder moves the dragged id alone.
- **Fresh-Eyes 6, 7, 9, 12, 13, 14, 16, 17, 21, 25, 30, 34:** settled as Tasks 5-1, 5-2, 6-1, 6-2, 6-3, 2-1, 2-2, 4-3, and 3-2 write them.

**Placements for Nathan** (each inside a home *§J* approved; the file names are the plan's, and the last is a file *§J* doesn't name)

- `Core/Views/Rows/RowFrame.tsx` and `Core/Views/Rows/table-shell.css` (J-2)
- `Core/Properties/Cells/SeatedValue.tsx` (J-3)
- `Core/Views/Settings/SidesFrame.tsx` and its sheet `Core/Views/Settings/sides-frame.css.ts`, as `LayoutFrame` and `FilterFrame` keep theirs (J-5)
- `Core/Views/List/ListView.tsx`, `listKind.ts`, `listSides.ts`, and `list-view.css` (J-1)
- `Core/Views/Settings/switchRows.ts`, inside J-5's home and a file *§J* doesn't name: the mapping from a kind's switch entries to their rows, which `LayoutFrame` and List's record both read. It delivers I-5 as written (List's switches in `rows`); a record can't import the mapping from `LayoutFrame.tsx`, which imports the registry that imports the records. The alternative with no new file is a third `leaf` member that draws the switches in the footing, which two more sites would then read by one-member tests.

**Open at Ratification** (ratified as written, 11-10-2026)

1. **E-4's centered heading.** On Nathan's mid-session word the columns' headings are the standard menu heading, which is left-aligned. Centering it would be a style of List's own over that heading.
2. **H-3's chevron.** The decision anchors the grip and a band's chevron to a row's first line as one rule. The plan anchors the grip and the check, and leaves the chevron centered in its own rule: it sits in a band's head or a bundle's title box, which never run to two lines.
3. **The Text pen's room.** A Text value on a List row keeps 24px after it at rest. The alternative, the pen laid over the text's tail on hover, covers a short value whole.
4. **Outlines in a flat Collection.** Under G-2 a top-level band draws no rail, so a Collection whose Sets hold no Sub-Sets and no sub-group shows none with Outlines on.
5. **Tuned live at the Stop:** `--list-view-value-max`, `--list-view-title-min`, `--list-view-wrap-gap`, `--list-view-bar-width`, the bar's height, and the row's padding (2px, B-12). The spacing between bands is Table's (B-15).
6. **A value inside a scrolling group.** A mouse wheel over a value that is itself a scroll cap doesn't scroll the group it sits in (`UIX/Interactions/OverScroll.tsx:46-60`), where a trackpad does; the group's own lane keeps the wheel on a crowded row. It comes from each group being one OverScroll lane (H-2) and is read at the Stop.
7. **H-2 past the title's floor.** The decision doesn't say what gives once the right group alone nearly fills the row. As landed, both groups shrink together from that point and each fades and scrolls, so the title holds its floor and nothing overflows; the alternatives are a right group that alone gives way, or a row that wraps on its own. Read at the Stop.
8. **Move to Left and Move to Right** write the side alone, so the property lands where its stored order puts it on the other side, not at a fixed end (D-3 covers a property's first showing). Read at the Stop.

#### Deviations

- **The drag engine changed past E-10's room.** *§Constraints* freezes it save for the room a landing zone grows by. Five follow-ups landed in `UIX/Interactions/engine.tsx` and `placement.ts`, each from the owner's "fix the pane overlap" or found by its tests: a line zone's spill is the room its displacement opens; a spill is held until its rows glide back; the engine re-measures two frames after a spill changes; `atHome` treats a missing home as home only when nothing is carried, since a carry whose source zone was clipped out of view was routed back to its own zone; and an empty zone off the x axis draws its slot and takes its spill at the item's height. **Ruling:** kept. Each carries a unit test except the second frame of the re-measure, which the Views Drive's upward-opening pane case alone pins. The pane's no-op `release`, which *§Open Items · Settled in Planning* names, is raised as I-073.
- **Three behavior changes outside List beyond the four *§Constraints* names.** (5) In Cards, a band pushed down by a carried card stays down about a third of a second after the card leaves, then moves up. (6) A carried drag whose home zone is scrolled out of view lands where its slot shows. (7) A hover-scrolled lane stays scrolled while the pointer is on anything inside it and slides back once the pointer leaves, and a lane holding an open layer's trigger keeps its place (`UIX/Interactions/OverScroll.tsx`, `dismissalStack.ts`); this reaches a Table cell's chip lane, the filter pane, and the field runs. **Ruling:** kept; each is tested, and the Views, Properties, Text Property, Option Picker, and Archive Drives hold their baseline tallies with them.
- **The neutral gate answered no.** Given the baseline, HEAD, and the intention alone, the `fable-high` reviewer found the intention delivered and the consolidations real, and "each rule stated once and nothing left over" unmet, with eleven corrections. Nine restate decisions it couldn't read (List's switches at the editor's root, I-5 and F-2; no selection fill on a List row, B-13; the pane on the displace engine, E-7 and E-10; compact rows under a Table's group spacing, B-12 and B-15; `addable` and the drawn flag, declined in review for cost) or the engine changes above; the rest are raised as I-073 and I-074 or left as they stood before this work (the `// PLACEHOLDER` on Title's eye). **Ruling:** *§Completion Criteria*'s Confidence clause and Conformance's "the drag engine … untouched" are unmet as written and are left for the owner's word; nothing was changed to turn the answer.
- **The Number.** The code delta is +728 (+1,276 / −548) against the estimate's +615. The growth bought the row's + as one element, the review fixes, and the owner's additions after the Stop: the group spacing, the pane's sizing, emphasized titles, and the engine corrections.

