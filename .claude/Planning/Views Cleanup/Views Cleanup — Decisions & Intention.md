### Views Cleanup — Decisions & Intention

**DATE:** 11-07-2026
**STATUS:** RATIFIED

### Context

A Collection's saved views live in `Core/Views` — 69 production files and 9,801 lines at `cae07c129`, comments and blanks included. Two view kinds are built, Table and Cards. List, Gallery, Calendar, and Timeline are registered but unbuilt: their tiles in the type picker do nothing, and a saved view of one draws as a Table. A kind is defined across three separate tables — `VIEW_KINDS` in `views.ts`, `VIEW_RENDERERS` in `ViewHost.tsx`, and `LAYOUT_OPTIONS` in `LayoutFrame.tsx` — and the Table fallback is written twice. Each renderer then assembles its own wiring from the 42 fields `useViewHost` returns, so Table and Cards each carry a rename path, a ghost-row loop, and a stable interface of their own.

Around the views sit the settings panes — Layout, Group, Filter, and Sort — built from the shared picker menus; View Tiles, which embed views on the homepage and Spaces; and the Trash and Archive table, which borrows the views' column layout and forms. Row disclosure is already shared piecewise: one chevron glyph and one fold animation serve every disclosing surface, and one line-row engine drives the sidebar, the bands, the Trash and Archive table, and the Grouping pane's folder list.

### Overview

Views Cleanup is a removal-first restructuring of the views system and the surfaces that share its work. It should leave adding a view kind needing less logic and less understanding, and it should prepare the row behavior that List, Gallery, Calendar, and Timeline would share — folding, indentation, and nesting — by consolidating what exists rather than abstracting anything new or building any of them.

The measure is less in the codebase overall: fewer ways to do the same thing, fewer files to trace, and names that say what they hold. The north star is 300 or more production lines removed — code and stylesheets, without tests, comments, or docs — counted across the whole scope and measured the same way before and after. Where two surfaces diverge, unifying them is in scope when the result fixes behavior or is what should always have been there, and each such change is surfaced to Nathan.

#### Concepts

- **Engine Side and Window Side:** Core's two halves — the engine half runs in the host process and may not reach React or UIX, as `Core/Contract/engineGraph.test.ts` enforces, while the window half draws the interface.
- **View Kind:** a saved view's layout type, registered in `VIEW_KINDS`; a kind's `nests` flag decides whether Sets nest as bands.
- **Renderer:** the window-side component that draws one kind, such as `TableView` or `CardsView`.
- **View Host:** the `useViewHost` hook — the per-view state and actions every renderer receives. The `ViewHost` component seats the renderer, and `Views/Host/` is the folder holding both with the hooks around them.
- **Band:** a group heading and its rows — a Set band when grouping by folder structure, or a bucket band when grouping by a property, whose face is an option for Select and Status or a date range for Date. Rows outside every band gather in a headerless tail: pages without a value under property grouping, or pages sitting directly in the container under Set grouping.
- **Rename Fence:** the app-wide rename claim in `Session/editSlice.ts`, which picks one surface when the same item shows on several at once.
- **Navigation Trees:** the tree-shaped lists that show the Nexus's folders — the sidebar, the Grouping pane's folder list, and the Filter pane's Location tree.

---

### Decisions

#### A - Scope

- **A-1 [CONFIRMED]:** The scope covers `Core/Views`; `UIX/Table`; the row pieces — `UIX/Table`'s `rowIndent` and `RowRail`, `UIX/Interactions`' line-row engine and ghost create, and `UIX/Menus/DisclosureRow.tsx`'s chevron and disclosure state; the Trash and Archive table (`Core/Bundles/BundleTable.tsx`, `Core/Trash/`, `Core/Archive/`); View Tiles; the settings panes' picker menus; and the sidebar tree (`Core/Interface/Sidebar/`) as a sharing candidate. The shared engines enter where the views' duplication sits, not for restructuring of their own, and the rest of Core — Session, Nexus, Actions, Properties and its cells, Interface, MarkdownPM, Tiles, and the Matrix — enters wherever real duplication with the views is found.
- **A-2 [CONFIRMED]:** No new view kind is built; the work prepares the ground for List, Gallery, Calendar, and Timeline.
- **A-3 [CONFIRMED]:** Where two surfaces diverge, consolidation may unify them when the result fixes behavior or is what should always have been there, with each such case surfaced to Nathan.
- **A-4 [CONFIRMED]:** Persisted names — the sidecar's saved-view fields and every other on-disk key — stay as they are; renaming for clarity applies to code identifiers, files, and folders.
- **A-5 [CONFIRMED]:** Three Issues entries ride along: I-040, where a view's new page opens its name field a frame after its row; I-070, where a refused cross-band drop can keep its dropped rank; and I-059, whose three drag-lock mechanisms become one per-row flag, as its own late phase of the plan, lifting its deferral in the Issues index.
- **A-6 [ASSUMED]:** The pending Wrapped Table Cells brainstorm isn't foreclosed, and nothing is built for it; its citations follow the files this work moves.

#### B - Kinds & Host

- **B-1 [INFERRED]:** Each built kind should have one window-side record beside its renderer, holding the renderer, its layout options and rows, and its `nests`, since every `nests` read is window-side; `VIEW_KINDS` keeps only what the engine reads, each kind's label and icon. One lookup of the presented kind — the kind actually drawn, Table for an unbuilt one — answers the seat, the settings, and every `nests` read, with the Table fallback written once.
- **B-2 [INFERRED]:** The host should hand renderers only what they read: passthroughs no renderer uses leave its return, and behavior only the interactions read moves into them. The rename slot the interactions and creation take today goes once D-1's state takes its place.

#### C - Rows & Disclosure

- **C-1 [CONFIRMED]:** A future List view should have disclosable rows — folders and groups drawn as rows, since a page has no children; whether it has columns is undecided. Disclosure should read through one shape — open or collapsed, one chevron, one fold — that stands apart from the Table's column grid, while each surface keeps its own store for what's open, since those persist differently: a device preference for the sidebar, the saved view for bands, nothing for a pane tree, and the bundle browser's loaded map.
- **C-2 [INFERRED]:** Rows in a list should indent by depth through one indent step and one implementation of it — the Table, the Trash and Archive table, the sidebar, and a future List — while menu pickers keep their drawn line, which nests by its own clearance.
- **C-3 [INFERRED]:** Nothing inside a band's head should take a Tab stop: the list itself is the one stop, arrows move between rows, Enter toggles a band, and the context-menu key opens its menu. The chevron toggles through its own control as the sidebar's does, and the New Page button leaves the Tab order, since the band's menu offers New Page.
- **C-4 [CONFIRMED]:** The Hide Disclosure Chevrons setting should refer to Navigation Trees rather than the sidebar alone, reaching all three through one mechanism, so each shows its chevrons unless it's on.
- **C-5 [CONFIRMED]:** The Grouping pane's folder list and the Filter pane's Location tree should look identical — the same leaf spacing, the same chevron rule, and folders in the view's custom Set order — differing only in what their rows do: hiding, reordering, and holding sub-group options in the Grouping pane; searching and picking a location in the Filter pane.

#### D - Page Renaming

- **D-1 [INFERRED]:** A name should edit through one surface-held rename shape wherever a surface owns its own editing, grown from `PageNameRename` (`Interface/RenamableTitle.tsx`) to carry what views need: the row's ID, a create's empty start, and a cell's look. Tabs, page windows, and views take it for pages, and the other local-state renames — a view's name in the dropdown and in a tile, and the detail header's title — adopt it too, leaving two rename patterns: the fence and the surface-held shape. Inside a view, the host owns that state and both Table and Cards read it; the Table's title keeps editing as a cell, and Cards leaves the Rename Fence. Set bands stay on the fence, since a Set shows in the sidebar and as a band at once, and the fence's `'detail'` surface takes a name for the Set band, its one remaining claimant.
- **D-2 [INFERRED]:** Every page created inside a view — the ghost row, a band's New Page button, or a Set band's menu — should go through the view's one creation path and open its name field under the ID minted at the gesture, rather than after the reply. That state holds a create's ID until its row arrives, and settles when the create is refused, so a row still in flight isn't mistaken for one that's gone. The field mounts on the row the host's push draws, so its rename always carries that row's path; this resolves I-040. The Matrix keeps its fence claim for pages.

#### E - Grouping & Order

- **E-1 [CONFIRMED]:** `ViewTypesPM.md` holds — one Grouping pane adapts to each kind through `nests` — and `FrameworkPM.md:21`, which gives each future kind its own grouping surface, is rewritten to match.
- **E-2 [CONFIRMED]:** A custom Set order should also order the pages gathered from nested Sets inside one band or a Location-sorted list, in place of the Nexus's own order; a sort or a stored manual page order still wins, and no per-page order is added.
- **E-3 [CONFIRMED]:** Grouping by a Select or Status should show empty option bands at the top level and under each Set alike, with Hide Empty Groups governing both; Date bands have no options to show empty.
- **E-4 [CONFIRMED]:** The Grouping pane's eye dimming differs between Set rows and option rows by design: many folders can show at once, and a full-strength eye on each would crowd the list. The code states that reason where the difference sits.
- **E-5 [CONFIRMED]:** Grouping's Order rows should take the glyphs Sort's Order rows use — `folder` for the Sets order, `arrow-down-up` for a property's — rather than borrowing Sort By's `arrow-up-down`.

#### F - Panes & Visuals

- **F-1 [CONFIRMED]:** The views dropdown's editor and the toolbar's Settings keep their current split — the type grid at the editor's root, and inside Layout under Settings — and consolidation between them that changes nothing visible is in scope.
- **F-2 [CONFIRMED]:** Both page-icon switches should read "Title Icons" with Table's `file-text` icon, on meaning shown; the saved key stays `hide_page_icons`.
- **F-3 [CONFIRMED]:** The title labels stay as they are: each surface's "Title" names its own heading — the view's name on the toolbar's button, an embed's heading in its menus — and a tile's "Show Titles" toggles the names across its many views.
- **F-4 [CONFIRMED]:** Duplicating a view keeps switching to the copy in a tile only, and the Settings header keeps renaming the view in a tile and the container in the main pane.
- **F-5 [INFERRED]:** A view's duplicate and delete should share their naming and splice between the main pane and tiles, which write to different stores; each store keeps its own confirmation wording, exit, and undo.
- **F-6 [CONFIRMED]:** Cards' Layout pickers should open like every other picker over a settings pane, dropping the solid background `34234d098` gave them for stacking over the pane (`LayoutFrame.tsx:99`). Card Image and Card Scale visibly change, while Card Style's two options toggle in place.
- **F-7 [CONFIRMED]:** The Filter pane's property and operator lists should follow the Native Menus setting like Sort and Group, and the value pickers stay in-app. The Checkbox operators read "Checked" and "Unchecked", in the list and the closed field alike, with a plain check glyph in place of the colored checkbox a native menu can't draw.
- **F-8 [CONFIRMED]:** Trash and Archive's date column should left-align, heading and dates alike.
- **F-9 [CONFIRMED]:** The disabled "More" placeholders in the views dropdown and Settings stay, drawn as the page menu's live control and glyph.

#### G - Names & Placement

- **G-1 [CONFIRMED]:** `PickerMenu` keeps its name unless planning finds that a rename to `MenuBase` earns its own phase; `Views/Host/` keeps its name.
- **G-2 [INFERRED]:** `useBandHeads` should become `useBandSource`; `.table-view`, the shell layer the Table and Archive wear, should become `.table-shell`; and `RowRail`, the table's lead-cell gutter, should take a name that doesn't share "rail" with the menu trees' drawn line.
- **G-3 [INFERRED]:** The page record should stop straddling the engine and window halves: its window-side type `ViewRow` and the functions that build it share one file, and the engine-side value pair lives with the engine reader that produces it, with the exact split confirmed against both boundary tests.
- **G-4 [INFERRED]:** The settings panes' row descriptor, also named `ViewRow` (`LayoutFrame.tsx:102`), should take a name of its own.

---

#### Constraints

- Removal comes first: nothing is added unless its absence would leave a real gap.
- Nothing here makes decisions for, or materially affects, future cross-device sync work.
- Nothing here is feature-level; the work does what's necessary to enable future view kinds, without building them.
- Nathan's *Approach* and *Principles* govern every phase and task, and every agent brief on this topic — scouts, executors, and reviewers — carries both sections in full.
- Every placement of a file within the codebase comes to Nathan for approval.
- Documentation on this work's surface that's false, whether this work or earlier work made it so, is rewritten as user-facing summary in fewer words, since detail that needs correcting is likely too specific for a feature document.
- Any PickerMenu-related cleanup found joins this line of work.
- A neutral before-and-after assessment given zero context should prefer the after state, without being told what to look for.

#### Rejections

- **Rename Fence for Every Page Title:** a fence claim picks among twin surfaces by rank and arrival, which the Table's per-instance editing avoids, and routing a cell edit through it serves no surface the Table has.
- **One Editor Root:** moving the type grid into Layout so the views dropdown's editor matches the toolbar's Settings would visibly change an intended split.
- **One Title Label and "Hide …" Wording:** the title labels serve their surfaces, and "Title Icons" covers both icon switches.
- **Centered Date Headings:** left-aligned headings are preferred for both.
- **Uniform Eye Dimming and Uniform Duplicate Behavior:** each difference is intended.
- **Picker Lines on the Row Indent Step:** the menu trees' wider nesting clears their drawn line, and matching the rows would visibly shift every picker tree.
- **One Store for What's Open:** the stores persist differently, and merging them would move saved or device state.
- **`PopoverPane` for `PickerMenu`:** `MenuBase` is the candidate if planning earns the rename its own phase.
- **`Views/Seat/` for `Views/Host/`:** the folder holds the View Host, which its name already says.
- **`pickTargets.ts` for `paneTargets.ts`:** "pick" already names the active-view choice and the picker runs, so the new name would say less.

#### Open Items

#### Prospects

---

#### Sources

- *Views Cleanup — Investigation* — the synthesized findings, placements, calls, and totals at `cae07c129`.
- `Scouts/1–8` — the eight reconciled scout reports beside it.
- *Views Cleanup — Fresh-Eyes Read* — a zero-context reading of this document against the code.
