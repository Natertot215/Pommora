#### Phase 11 — Notes

**Commit:** `50478025e` on `vc-p11`, parent `52d87dfa7` (Phase 10's `e9d4d3462` cherry-picked clean onto Phase 9's `04e94f523`, so every footnote anchors against the tree after both) · Task 11-1 `50478025e`

**Patch:** `Phase 11 — Docs and Issues.patch` (`git diff 52d87dfa7 50478025e`; documents, `Core/Tiles/README.md`, and `viewHarness.tsx:1` only)

**Delivers:** the decision log's documentation constraint; E-1 (`FrameworkPM.md:21`); A-5's three closures with I-069's; Investigation *§Becomes False* and *§Contradicts the Source*'s document lines; *§Reconciliation · Documents*

**Measures at the Phase Head:** Actionable from `cae07c129` =🔴-376=(=🟢+3282=/=🔴-3658=); the phase's own, from `52d87dfa7`, ±0 (+0 / −0) · Comments 3,493 (3,493 at the parent, 3,517 at BASELINE; `viewHarness.tsx:1` changed in place) · Tests 9,261 passed, 2 skipped, 546 files · `check-atlas.mjs` 17 tables agree · the plan's VERIFY grep, with `container:configure` added, prints nothing · typecheck and lint clean

---

#### Task 11-1 · Docs and Issues

**In Plain Terms:** The project's written descriptions of views, menus, and tables now say what the app does after the cleanup, in fewer words, and the lines that were already wrong are fixed with them. The four issues this work resolved left the Issues index, along with the Views section they emptied, and the issues that pointed at moved or shifted code point at where it now sits.

**What Leaves:**
- `ViewTypesPM.md`: `VIEW_RENDERERS`, `nests` as a registry field, `filterModel.ts`, `pendingView.ts`, the hook paths, the policy's ghost suppression and naming surface, "scroll root", the filler track and resolved-width sentence, the reorder helper, the `--labels-gap` and `--row-indent` token rows, the "flat door" editor description, and the persisted-ghost sentence.
- `IssuesPM.md`: I-040, I-059, I-069, I-070 (block, index row, footnote each); the `A7 • Views` area in the index and the body; I-026's `container:configure`; I-033's `filterModel`/`visibilityModel`/`placeNew` move and their three footnote paths.
- `PommoraUIX.md`: the Pickers table's `PickerMenu` row; the Menus table's `Listed outline` row; `listed-outline.css.ts` and `DropOutline` in the Menus paragraph and DisclosureRow row; "the cell content types" in Table.

**What Arrives:**
- `PommoraUIX.md`: a `MenuBase` row in the Menus table (the former `PickerMenu` row's text); a `Disclosure` row in Elements (`DisclosureChevron` · `chevron` · `chevronOpen` · `chevronSpacer` · `railRow` · `navigationTree`); `RowLead` · `rowIndent` in Table's file list.
- `Core/Tiles/README.md`: the `viewTileEntry.ts` module-map row.
- `IssuesPM.md`: `index-issues.py` renumbered the index after the closures — 72 → 68 entries, Minimal 20 → 16, A8 • Matrix → A7 — and moved every ID above I-040 down: I-041→040, 042→041, 043→042, 044→043, 045→044, 046→045, 047→046, 048→047, 049→048, 050→049, 051→050, 052→051, 053→052, 054→053, 055→054, 056→055, 057→056, 058→057, 060→058, 061→059, 062→060, 063→061, 064→062, 065→063, 066→064, 067→065, 068→066, 071→067, 072→068. The brief's I-057, I-060, and I-065 are now I-056, I-058, and I-063.

**Issue Closures:**
- **I-040:** the view holds which row is being named, opened with the ID minted at the gesture (`beginNaming(req.id, flight)` in `createPageIn`), so a created page's field mounts with its row (Phase 5, Task 5-1).
- **I-059:** each line row carries `immovable`, which refuses its keyboard lift and drops its drag description; `lineList`'s `locked`, `groupedLine`'s per-kind `disabled`, and the band spec's `draggable` guard folded into it (Phase 10).
- **I-069:** the shell is `MenuBase` in `UIX/Menus/` with its placement and resize beside it (Phase 9).
- **I-070:** `dropIO`'s refusal arm re-places the dropped row at its prior slot over any later write, pinned in `Host/liveView.test.tsx` (Phase 2, Task 2-3).

**Per Document · Sentences That Went False → Their Words · Net Words**

- **`.claude/Features/ViewTypesPM.md` (−99):**
  - `:4` "each entry carrying the kind's label, its icon, and whether its bands nest (`nests`); … mapped by kind in `ViewHost`'s `VIEW_RENDERERS`" → "each entry carrying the kind's label and icon"; "dashboard and page tiles" → "dashboard and Space tiles".
  - `:14` "the renderer opens its own naming field over the row already real" → "its name field opens with its row".
  - `:16` "Views created within a collection or set without pages are use the ghosting mechanism, where a persisted ghosted page is displayed to offer creation in the otherwise empty view" → "A view with no pages shows a standing ghost that offers creation".
  - `:20` "composes four pure stages" → "composes pure stages".
  - `:26` "defined in `Core/Views/filterModel.ts`" → removed.
  - `:34` Checkbox "Is (true / false)" → "Checked · Unchecked".
  - `:47` "bands(`GroupBand.tsx`)" → "bands (`GroupBand.tsx`)".
  - `:55` "The Sorting pane" → "The Sort pane"; `:64-66` "**Grouping**", "**Sorting**", "**Filtering**" → "**Group**", "**Sort**", "**Filter**"; `:130` "the Grouping pane's Order" → "the Group pane's Order".
  - `:62` "**LayoutFrame** — the per-view editor, reached from a ViewFrame row's chevron (…) or from the SettingsFrame's Layout entry (the flat door). It holds the click-to-rename name, the 3×2 type picker, and the type's options: the Layout frame is the visibility list for a Table, and the cards options for Cards with Card Image, Card Style, and Card Scale pinned below its rows. Deleting a view — here or …" → "**Layout** — the 3×2 type picker and the kind's switches, with Cards' Card Image, Card Style, and Card Scale pinned below. A ViewFrame row's chevron opens that view's own editor: the click-to-rename name, the ⋮ Duplicate and Delete, the type picker, and the four frame rows, whose Layout lists the properties above the kind's switches. Deleting a view — from the ⋮ or …".
  - `:71` "(`Core/Views/Host/ViewHost.tsx`), which resolves the container's active view type, seats a renderer, and hands it a single `host` object from `useViewHost` (`Core/Views/Host/useViewHost.ts`)" → "(`Core/Views/Host/`), which seats the active view's renderer and hands it a single `host` object from `useViewHost`"; "(`…/useViewInteractions.tsx`) …, stating its ghost timing and what suppresses the ghost, and the naming surface it opens over a page that already exists on disk" → "…, stating its ghost timing, where its value editor anchors, and its New Page rows"; "scroll root" → "view root"; "from the registry" → "from the kind"; "(`Core/Views/Host/pendingView.ts`)" → removed.
  - `:79` "the borderless regime, and the cell renderers live in `UIX/Table/`" → "and the borderless regime live in `UIX/Table/`".
  - `:83` "a trailing filler track absorbs any pane width past the summed columns. Every column, including the title, maintains its resolved width." → "the title column absorbs any pane width past the summed columns."
  - `:87` "the alignment default, the reorder helper, and the column layer" → "the alignment default and the column layer".
  - `:95` "`table-view.css`, which ArchiveView wears too" → "`table-view.css`, whose shell ArchiveView and the Trash wear too".
  - `:103-104` "Cell Icon Gap / Label Run Gap | `--cell-icon-gap` / `--labels-gap` | `6px` / `4px`" → "Cell Icon Gap | `--cell-icon-gap` | `6px`"; the Nesting Indent row removed.
  - `:118` "**Wrap Titles** and **Hide Icons**" → "**Wrap Titles** and **Title Icons**".
- **`.claude/Features/SymbolsPM.md:18` (±0):** "`SettingsFrame.tsx` and `LayoutFrame.tsx` … the view types in `Core/Views/Settings/LayoutFrame.tsx`" → "`SettingsFrame.tsx` and `ViewPane.tsx` … the view types in `Core/Views/views.ts`".
- **`.claude/Features/InteractionPM.md` (−1):** `:36` "the shared `dropOutline`" → "the shared `DisclosureChevron`"; `:46` "a picker pane's free edges" → "a pane's free edges", "A PickerMenu pane opts in through `UIX/Pickers/usePaneResize.tsx`" → "A MenuBase pane opts in through `usePaneResize`".
- **`.claude/Features/InterfacePM.md:89` (±0):** "on the PickerMenu chassis.." → "on the MenuBase chassis.".
- **`.claude/Features/MarkdownPM.md:242` (±0):** "the pane is a PickerMenu" → "the pane is a MenuBase".
- **`.claude/Features/ConfigurationPM.md:30` (+1):** "Collapses the sidebar's chevron gutter." → "Collapses the sidebar's and Grouping pane's chevron gutter."
- **`.claude/Features/PommoraDND.md:38` (±0):** "the Grouping and Sorting panes" → "the Group and Sort panes".
- **`.claude/CLAUDE.md` (+2):** `// Menus` "Menu surfaces, rows, …" → "The menu base, surfaces, rows, …"; `// Pickers` "Color • Calendar • Icon • Text" → "Color • Calendar • Icon • Field".
- **`.claude/Resources/PommoraUIX.md` (+27):** the Menus paragraph's "`DisclosureRow.tsx` the folding row over `listed-outline.css.ts`'s chevron-and-rail styles" → "`DisclosureRow.tsx` the folding row, `MenuBase.tsx` the pane action menus, managed lists, and pickers mount"; the DisclosureRow row "`DropOutline` … A folding row on the listed outline." → "`unfolded` · `Disclosure` … A folding row; `unfolded` lists the rows its open folds show."; the `PickerMenu` row → the `MenuBase` row under Menus; the `Listed outline` row "`dropOutline` · `dropOutlineOpen` · `dropOutlineSpacer` · `railRow` … on `--disclosure-rail-x` (`listed-outline.css.ts`)" → Elements' `Disclosure` row; Table "`table.css` · `table-tokens.css` … and the cell content types" → "`table.css` · `table-tokens.css` · `RowLead` · `rowIndent` … and the lead cell a row indents through". The net gain is the two moved rows' new names and the Table section's two files.
- **`.claude/Guidelines/Development-Environment.md:20`, `Editor-Internals.md:37, 39`, `Web-Guests.md:19` (±0 each):** `PickerMenu` → `MenuBase`.
- **`.claude/FrameworkPM.md:21` (±0):** "Each groups mechanically differently, so each carries its own grouping surface." → "Each groups differently, and the one Group pane adapts to each."
- **`.claude/Planning/Cross-Device Mutation Checklist.md:68` (±0):** "`Core/Views/handlers.ts` `container:configure` → `Core/Views/containerConfig.ts` `setContainerConfig`" → "`Core/Nexus/mutate.ts` `setViewButton` → `Core/Files/sidecar.ts` `patchSidecar`", the form of the disclosure-lock row above it.
- **`.claude/IssuesPM.md` (−1,414):** the four closures and the Views area; I-026's title, index row, and body "Twenty-three" → "Twenty-two", "six view and container channels" → "five view channels", "the remaining thirteen" → "the remaining twelve", "(`setActiveView` and `setDisclosureLock` beside `views:*` and `container:configure`)" → "(`setActiveView`, `setDisclosureLock`, and `setViewButton` beside `views:*`)", "Fold the thirteen" → "Fold the twelve"; I-033 "host handlers, window files, and Settings-pane models" → "host handlers and window files" and its `filterModel`/`visibilityModel`/`placeNew` clause removed; both dated 11-08-2026. Footnotes re-anchored against the tree: I-006 (`order.ts:12-29`, `viewsFile.ts:25`, `properties.ts:109-118,143-144`), I-013 (`useColumns.ts:242-335`), I-016 (`ContentView.tsx:192-197`), I-026 (`bridge.ts:56-210`, `mutateRequest.ts:73-153`, `mutate.ts:153-198` with `setViewButton`, `mutate.ts:235-236`, `Views/handlers.ts:23-50`), I-028 (`Core/Views/viewRow.ts:89-105` for `pageRow.ts:11-27`; `treePatch.ts:293-319`), I-029 and I-032 (`mutate.ts:275-280`), I-031 (`treePatch.ts:293-319`), I-043 (`TileGrid.tsx:152-279`), I-046 (`MenuRows.tsx:94-173`), I-051 (`useConnectionAutocomplete.ts:~139-152`), I-055 (`typeRows.tsx:~261, ~91-151, ~154-179, ~181-201, ~203-219`), I-057 (`CalendarPicker.tsx:~487-500`, `TabItem.tsx:~65,~90-92,~114`, `DetailTitleHeader.tsx:~96-108,~129-133`, `GroupBand.tsx:~134-135,~172-188,~239`), I-060 (`BundleTable.tsx:~277`, `engine.tsx:1344-1382`), I-066 (`treePatch.ts:133-140`); IDs as they read before the renumber.
- **`Core/Tiles/README.md` (+15):** the module map gains "`viewTileEntry.ts` | A view tile's embedded views and the edits that write them".
- **`Core/Testing/viewHarness.tsx:1` (±0):** "every view suite mounts through" → "the view suites mount through".
- **Re-read, Unchanged:** `SurfacePM.md:28` (a tile's Duplicate switches to the copy, F-4; the reveal from a table's heading or a grouped Cards view's first band holds through `data-view-lead`); `ViewTypesPM.md:162` (`presentedKind` seats Table for an unbuilt kind, as it says); `ViewTypesPM.md:4`'s "appear in the type picker at full weight but don't switch" (`typeGrid` draws every kind and switches only to a built one); `InteractionPM.md:20` and `PommoraUIX.md:211` (`pickerBloom` keeps its name).

**Words Across the Documents:** −1,469 net by `wc -w` (73,605 → 72,136); by word diff, +505 / −1,974, where the Issues index's renumbering accounts for most of its +199 and PommoraUIX's two moved rows for most of its +155.

**Pins:** none named.

**Key Hunks:**

```diff
-Each groups mechanically differently, so each carries its own grouping surface.
+Each groups differently, and the one Group pane adapts to each.
```

```diff
-| Set the view button              | `Core/Views/handlers.ts` `container:configure` → `Core/Views/containerConfig.ts` `setContainerConfig` |
+| Set the view button              | `Core/Nexus/mutate.ts` `setViewButton` → `Core/Files/sidecar.ts` `patchSidecar`                       |
```

```diff
-| Cell Icon Gap / Label Run Gap | `--cell-icon-gap` / `--labels-gap` | `6px` / `4px` |
-| Nesting Indent | `--row-indent` | → `var(--disclosure-indent)` |
+| Cell Icon Gap | `--cell-icon-gap` | `6px` |
```

**Deviations:**
- **The checklist's home:** the brief and *§Reconciliation* place `Cross-Device Mutation Checklist.md` in `.claude/Guidelines/`; it lives in `.claude/Planning/`, which the brief also says stays as written. Its `:68` row named a deleted handler and file, so it changed alone.
- **Lines no list named, fixed on this surface:** `ViewTypesPM.md:14, :34, :55, :118, :130`; `PommoraUIX.md`'s Menus paragraph, `Listed outline` and `DisclosureRow` rows; `PommoraDND.md:38`; the drifted footnotes of I-016, I-029, I-031, I-032, I-043, I-046, I-051, I-055, I-066 (pre-renumber IDs), which cite files this work changed.
- **Not changed though flagged:** `InterfacePM.md:89`'s spelling ("surfacace", "accesiable", "it's") — nothing false, and the line reads as the owner's own wording; `PommoraUIX.md:161`'s `DISCLOSURE_INDENT`, which stays a token in `theme-vars.css.ts` though its export left; I-033's "Views 6 of 58", a measurement of its own date.
- **Trailer:** the commit carries the session's own model trailer; the patch is a bare diff.
