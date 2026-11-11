### List View — Decisions & Intention

**DATE:** 11-09-2026
**STATUS:** RATIFIED 11-09-2026

### Context

A view is a saved presentation of a Collection's or Set's pages. Six kinds are registered in `VIEW_KINDS`; Table and Cards have renderers, and List, Gallery, Calendar, and Timeline don't, so their picker tiles are inert and a view saved as one of them draws as a Table. Each built kind is one record (`Core/Views/Host/viewKinds.ts`) naming its renderer, whether its bands nest, its switches, and its rows, and every renderer mounts through one host that supplies the pipeline, bands, creation, drops, the value pickers, and view persistence. A kind that nests behaves as Table does in grouping, sub-grouping, the Location sort, and band drops.

UIX already shares the pieces of Table's row that are styling and structure: the lead cell, the indent step, and the grip's and gutter rail's rules (`UIX/Table/`). What `TableView.tsx` and Table's sheet keep to themselves is the row's composition: the row frame with its grip, the title markup, the ghost row, the walk that lays rows inside bands, and the shell's geometry, which ArchiveView reaches across folders to wear. A clickable value is written out twice, on Cards and in the Properties panel, and Cards' rules for adding, showing, and hiding a property live in Cards' folder. A view's properties share one order, `property_order`, with `hidden_properties` flagging the hidden ones; a reorder writes the shown properties first and appends the rest, so a hidden property loses its place at the next reorder. *List View — Investigation* holds the verified state of the code at `4b18149ac`, and *List View — Brief* holds Nathan's notes, approach, and principles.

### Overview

List becomes Pommora's third view kind with a renderer. A List row is Table's row without cells: the page's title and its property values side by side in two groups, one holding the title and one flush to the row's right edge. Each property has a side, set per view over a default for its type, and the view's property pane shows the two sides as two columns. Bands, grouping, filtering, sorting, creation, and drag behave as they do in Table.

The work shares what Table, Cards, and the Properties panel each hold privately today rather than writing a third copy: the row frame, the clickable value, the add-show-hide rules, and the hover **+**. It also makes a hidden property keep its place through a reorder in every kind.

#### Concepts

- **List Row:** one page drawn as a single row: its grip, then a left group holding the title and the values beside it, then a right group.
- **Left Group · Right Group:** the title with the values beside it, and the values flush to the row's right edge.
- **Side:** which group a property's values sit in on a List row.
- **Bar:** the thin divider between one property's values and the next property's.
- **Add Control:** the hover **+** on a row, which opens the list of properties and Contexts not yet on it.
- **Property Pane:** the pane that lists a view's properties with their hide eyes; for List, two columns.
- **Outlines:** the indentation rails drawn beside nested rows.
- **Wrap Rows:** the switch under which a crowded row's right group drops to a second line.
- **Kind Record:** the one record a view kind declares itself through.
- **SettingsFrame · ViewFrame:** the toolbar's settings menu, and the views menu whose per-view editor holds the type grid and the Layout, Group, Filter, and Sort rows.

---

### Decisions

#### A — The Kind

- **A-1 [CONFIRMED]:** List should be Pommora's third view kind with a renderer, under `Core/Views/`, drawing rows that keep Table's grip, content inset, indentation, and bands, with property values shown side by side on the row in place of cells.
- **A-2 [CONFIRMED]:** Bands, grouping, filtering, sorting, creation, row and band drag, nesting, and the view's Scale should behave in List exactly as they do in Table.
- **A-3 [CONFIRMED]:** Gallery, Calendar, and Timeline should stay registered as placeholders with inert picker tiles, so the fallback for a kind without a renderer stays.
- **A-4 [INFERRED]:** List should take no cell sweep, which needs aligned columns.

#### B — The Row

- **B-1 [CONFIRMED]:** A row should hold two groups: a left group that includes the title, and a right group flush to the row's right edge.
- **B-2 [CONFIRMED]:** A bar should separate one property's values from the next property's, never two values of one property. Compact cards should keep their look as it is.
- **B-3 [CONFIRMED]:** The page's title alone should open the page. A click on the row's empty stretch, or on a value with no click action of its own such as Created or Modified, should do nothing.
- **B-4 [CONFIRMED]:** A property the page holds no value for should be left off its row, as on Compact cards, where an unchecked Checkbox still shows because it's the toggle.
- **B-5 [CONFIRMED]:** List should draw no lines between rows and carry no switch for them.
- **B-6 [CONFIRMED]:** The add control should look and reveal like the hover **+** that structural group bands carry, should open the add list, and should always trail the right group.
- **B-7 [CONFIRMED]:** On a row whose right group is empty, the add control should trail the last item of the left group, which is the title on a row with no other left values.
- **B-8 [CONFIRMED]:** A band's **+** should keep creating a page and a row's **+** should add a property; both meanings stay, as the Properties panel's **+** already adds a property.
- **B-9 [CONFIRMED]:** A bar should also sit between the title and each neighbor beside it, and none should sit before the add control.
- **B-10 [INFERRED]:** The add control should keep its slot while hidden, so nothing shifts on hover, and should be absent from a row with nothing left to add.
- **B-11 [CONFIRMED]:** Title should be an item of the left group that can move within it, so a property's values can sit before the title on a row, as a Table column can precede Title. Title always shows.
- **B-12 [CONFIRMED]:** A List row should be compact, shorter than a Table row.
- **B-13 [CONFIRMED]:** A List row whose page is the selection should draw no highlight; a Table row keeps its own.
- **B-14 [CONFIRMED]:** The line under the page header should be inset over a List as it is over Cards, not bled edge to edge as over a Table.
- **B-15 [CONFIRMED]:** The spacing between a List's groups should be a Table's: an open group keeps extra room between its last row and the next band, and closed groups sit evenly. A List's compact rows shouldn't shrink it: the room from the last row's content to the next band's heading should be a Table's. The room from a band's heading to its first row stays compact.
- **B-16 [CONFIRMED]:** A List row's title should draw in the emphasized text a card's title uses, so it stands out from the values beside it.

#### C — Values

- **C-1 [CONFIRMED]:** A value on a row should click, right-click, and edit as it does on every other surface, with its Style or Format choices on right-click.
- **C-2 [CONFIRMED]:** Picking a property from the add list should show it on the view, and removing a value's property should hide it from the view, as on Cards.
- **C-3 [CONFIRMED]:** Each property's values on a row should stop at a maximum width and end in an ellipsis under the OverScroll fade. Text and Link values share one maximum, about 200px, and a Text value should draw as it does in Table: its first line, with the pen beside it.
- **C-4 [CONFIRMED]:** A Link's per-view Format should be offered on its right-click on every view. Today only Table's column header reaches it. The Properties panel holds no per-view look and should stay without it.
- **C-5 [INFERRED]:** A type whose values are always short, such as Date, should need no maximum of its own.

#### D — Sides

- **D-1 [CONFIRMED]:** A property's side should be its own per-view setting, separate from Table's column alignment.
- **D-2 [CONFIRMED]:** Each property type should carry a default side: Select, Multi-Select, Status, and Contexts on the left; Date, Number, Link, Checkbox, Text, File, Created, and Modified on the right.
- **D-3 [INFERRED]:** A property shown for the first time should land at the far end of its side: last in the left group, and at the row's edge in the right group, beside the add control.

#### E — The Property Pane

- **E-1 [CONFIRMED]:** List's property pane should be two columns, Left and Right, side by side with Left on the left, opened from SettingsFrame's Visibility row. SettingsFrame's Layout should stay the type grid and the kind's switches, as for every kind.
- **E-2 [INFERRED]:** ViewFrame's Layout row should open the same two-column pane, as Table's opens its property list.
- **E-3 [CONFIRMED]:** The Left column should read top to bottom as the left group reads left to right, Title among its rows. The Right column should read from the row's edge inward: its top is the value farthest from the title.
- **E-4 [CONFIRMED]:** Each column should be a `fill-quaternary` list under the standard menu heading, in compact row padding, as wide as its property names need, equal to the other column, and capped at 180px before a property's name ends in an ellipsis and scrolls on hover. The pane's heading row keeps its existing shape, the back label at the left and the pane's name at the right.
- **E-5 [CONFIRMED]:** A hidden property should move to the foot of its own column, ghosted with its eye off, and should return to its remembered position and side when shown again.
- **E-6 [CONFIRMED]:** A hidden property's remembered position should survive a reorder of the other properties, in every view kind.
- **E-7 [CONFIRMED]:** A property should drag within its column and across to the other with no drag-kit work beyond E-10's, both columns reordering by displacement, the form in which the kit trades items between two zones today, as cards cross bands. This pane is a stated exception to the drop line every other settings list uses: a property hides by its eye alone, and a right-click row, Move to Left or Move to Right, changes its side without a drag.
- **E-8 [CONFIRMED]:** Title should be a row of the Left column that reorders within it and carries no working eye.
- **E-9 [INFERRED]:** Title should stay on the left side.
- **E-10 [CONFIRMED]:** A row carried into a column should make room there as a carried item does in a Table or a Cards view, and should never be drawn over the hidden rows at the column's foot. That a carried item "compresses the view" there is read as making room; the reading is the session's.

#### F — Switches

- **F-1 [CONFIRMED]:** List should carry three switches: **Title Icons**, the one Table and Cards already share; **Outlines**; and **Wrap Rows**.
- **F-2 [CONFIRMED]:** List's switches should sit at the root of ViewFrame's view editor, in the footing where Cards' Card Image, Card Style, and Card Scale rows sit, and inside Layout in SettingsFrame. Table's and Cards' switches should stay where they are.

#### G — Outlines

- **G-1 [CONFIRMED]:** Outlines should be a List-only per-view switch named **Outlines**, on for a new List view, drawn from the outline tokens the menus' and the editor's rails already read. Leaving Table without them is a design choice; nothing in the code rules them out there.
- **G-2 [INFERRED]:** Outlines should begin one level in, since a top-level line would run down the gutter where the grip appears.

#### H — Wrapping

- **H-1 [CONFIRMED]:** Row wrapping should ship with List's first version as the per-view **Wrap Rows** switch, off for a new List view. Deferring it until one treatment can serve both Table cells and List rows is acceptable where planning shows that's genuinely the better outcome.
- **H-2 [CONFIRMED]:** A row whose values, each at its maximum, still exceed its width should shorten its title with an ellipsis down to a minimum width, and then fade the left group, the title at its minimum included, which scrolls on hover. With Wrap Rows on, the right group should instead drop to a second line, staying flush right, once the title is at its minimum and the right group comes within a set gap of the left group, 12–16px.
- **H-3 [INFERRED]:** The grip and the check should anchor to a row's first line, which a two-line row needs, as one rule Table shares. A band's chevron stays centered in its head, which never runs to two lines.

#### I — The Shape of the Work

These are readings of the code from *List View — Investigation*, which the plan confirms against its own HEAD.

- **I-1 [INFERRED]:** A List row should be built from Table's row frame, lifted out of `TableView.tsx` so Table and List compose one frame, rather than from `UIX/Menus` rows or a row component of its own.
- **I-2 [INFERRED]:** The clickable value should be one component that Cards, the Properties panel, and List mount, and Cards' add, show, and hide rules should be stated once for Cards and List.
- **I-3 [INFERRED]:** The band's **+** and the row's add control should converge on `AccessoryButton`, the primitive the panel's **+** already is.
- **I-4 [INFERRED]:** A side should be stored as one per-view map over List-owned per-type defaults, with `property_order` staying the only order.
- **I-5 [CONFIRMED]:** List's switches should ride the kind record's existing rows slot, the one Cards' Card Image, Card Style, and Card Scale use, which already draws at ViewFrame's root and in the footing of SettingsFrame's Layout; Nathan left this mechanism to the session. List's switch list is then empty and should draw nothing, including no separator, and the Title Icons entry should be written once and read by all three records.
- **I-6 [CONFIRMED]:** The work may end net-positive in lines; the gain buys the renderer itself and should leave one implementation wherever two or three stand today.
- **I-7 [CONFIRMED]:** Folding Archive's and Trash's rows into the shared row frame, and Table's cells into the shared clickable value, should stay out of the plan. Once List's design is confirmed in the app, each is raised as an Issues follow-up.

#### J — Placement

- **J-1 [CONFIRMED]:** List's renderer, kind record, sheet, and side defaults should live in a new `Core/Views/List/`.
- **J-2 [CONFIRMED]:** The row frame lifted out of `TableView.tsx`, and the shell sheet Table, List, and Archive share, should live in a new `Core/Views/Rows/`.
- **J-3 [CONFIRMED]:** The shared clickable value should live in `Core/Properties/Cells/`.
- **J-4 [CONFIRMED]:** Cards' column helpers should move into `Core/Views/Pipeline/columns.ts`, and `Core/Views/Cards/cardColumns.ts` should leave.
- **J-5 [CONFIRMED]:** The two-column pane should live in `Core/Views/Settings/`, beside the Visibility pane.
- **J-6 [CONFIRMED]:** The side, Outlines, and Wrap Rows settings should join the saved view in `Core/Views/views.ts`.

---

#### Constraints

- **Approach (Nathan's, in Full):**
  - Any approaches being considered here must first assess what’s true *now* that would be able to be removed, deleted, changed, consolidated, or replaced. We’re not going to design based on what’s currently there and simply adjust course, we’re ensuring totality-first application, removal-first scoping, and residue-eliminating frameworks that provide a clean slate rather than building changes on top of what’s ultimately going to be replaced.
  - We’re approaching this through consolidation-first properties, ensuring the codebase ends up more understandable, less complex, more efficient in what it does, less conflicting in defining that, and an overall cleaner foundation to work within.
  - We shouldn’t adding anything new unless there’s evidence that it’s required. We’d approach this through the perspective of ending up with cumulatively “less stuff” in the codebase overall — less ways to do similar things, less complexity, fewer paths to go through, less tech debt waiting to surface, less things to maintain, and fewer headaches when approaching future work entirely — while the line-count *may* end up positive. Net-negative lines are the north star, but any net-positive gain *must* have its rationale for that outcome be genuinely backed through this framework and our principles.
  - Anything within our surface area should be left reading as always-intentional, without any odd-ones-out designs, and be reflective across the broader codebases' resulting shape — not just maintaining remnants or adherence to what’s true *now* that’s ultimately going to change. The approach should reflect the outcome and shouldn’t be bound to constraints that were only relevant before.
  - Ensure we're looking *outward* for cross-file opportunities and shared design, avoiding hand-rolling or duplicating what's already there or can be adjusted accordingly. Pommora is an established codebase and we’re not starting from scratch.
  - The complex data-level mechanics of the codebase are what least reflect *Nathan’s* intentions and are primarily reflective of what’s determined appropriate via past session agents. Treat it with care and respect, but don’t assume it’s beyond changing within reason, where simply presenting the approach to Nathan may be all that’s required to genuinely change the codebase for the betterment of everything within it and future iterations.
- **Principles (Nathan's, in Full):**
  - **Less to Carry:** No more functions, helpers, wrappers, types, layers, and call sites than necessary, and no logic stated twice. New code earns its place by removing more than it adds, fixing incorrect behavior, or delivering required behavior in its minimal form.
  - **Less to Understand:** A reader finds what exists, where it lives, what owns it, and what calls it with less searching and tracing than before, whether a developer reading code or Nathan reading file names and headers. A blind-eye review of the surface areas impacted by this implementation should find less confusion, less conflict about intent, and an unambiguously more approachable, maintainable ecosystem to iterate on.
  - **Clearer Boundaries:** Each responsibility has one owner, and the next change of a kind has one obvious place to go, with no choice between layers, helpers, or modules — nothing that exists somewhere where it shouldn't; nothing implemented where something else already does it or adjusting it accordingly would be the more appropriate approach; nothing that increases the risk of misassumption when working here in the future.
  - **Reads as Designed:** Nothing temporary, transitional, kept for compatibility, unreachable, needlessly indirect, or left over from the work remains. Nothing designed around codebase shapes that will ultimately be changed for the better.
  - **One Way:** Each thing has one implementation, one pattern, and one source of truth. No part contradicts another. Exceptions carry their reason where a reader meets them, in code or feature documentation.
  - **Real Purpose:** Anything added to the codebase should have its purpose clearly stated from the perspective of its value in enhancing what's already there — complexity, duplications, divergences, multiple ways to do the same thing — and anything "new" added should be assessed using that. Line-count increases shouldn't translate into maintenance cost or complexity.
  - Anything introduced should have independent justification behind its existence that isn't simply self-induced requirements.
  - Anything changed or implemented should be reflected across the board — nothing that's done this way here, while something else works differently elsewhere, unless that's *genuinely* correct.
  - Zero data-level spaghetti, complexity, or additional 'stuff' should be added without reason. Rewiring things to become more understandable, more efficient, more appropriate, and more effective is preferred when the alternative is just adding more to something that's inherently unfit to suit the long-term mandate of what's actually being offered.
- **Removal First:** planning assesses what can leave, merge, or be replaced before anything is added, and nothing is added unless its absence would leave a real gap.
- **Agent Briefs:** every agent brief on this topic, for scouts, executors, and reviewers, carries the Approach and the Principles in full.
- **Placement:** every new file's location comes to Nathan for approval before it's written into a plan; *§J — Placement* holds what he has approved.
- **Shared First:** nothing is designed in isolation where the shared view structure should carry it.
- **Documentation:** changes are surgical and follow `~/The Studio/.claude/references/studio-documentation.md`. List is the least unique view kind, so its own section and its mentions elsewhere stay brief and at feature-overview level.
- **Re-Verify, Then Reuse:** *List View — Investigation* and *List View — Scout Findings* are leads; planning and every review re-verify each claim they lean on against their own HEAD. The Investigation was written against this document's first twelve entries, so where its approaches and this document disagree, this document holds, and planning brings the Investigation into agreement with the plan.
- **Planning Process:** planning runs on the draft Plan-Creation (`~/NexusOS/Studio/Athena/II. Drafts/Plan-Creation.md`), with the installed `writing-plans` skill and the completed plans under `.claude/Planning/Completed/` filling its blank sections. The plan is reviewed before ratification as *Metadata Picker — Plan Reviews* records: an outward wave of a simplification read and an adversarial read, an inward wave of an executor read and a simplification read, then one neutral read both ways. The finished work is verified as *MetadataV3 — Implementation Plan §Final Verification* records: a simplification lens, then an adversarial lens read inward and outward, then a neutral reviewer given only the baseline, HEAD, and a plain statement of intent. Both run on the models those records used, on Nathan's word: `opus-xhigh` for the simplification, adversarial, and executor reads, and `fable-high` for the neutral read.
- **Cost:** no measuring or layout-reading work runs per row on a high-frequency trigger; wrapping is the browser's own layout.

#### Rejections

- **`UIX/Menus` Rows as the List Row:** they carry no gutter grip, indent from a different origin, and wear a rounded look.
- **A Standalone Row Component:** it would restate the grip, rail, selection, ghost, and rename behavior Table's row already has.
- **List as a Mode of Table:** a renderer would switch on its view's kind, which the host exists to prevent.
- **Growing Sideways Like Table:** without columns, one long row would push every row's right group out of view.
- **A Stacked Left-over-Right Pane:** the two columns sit side by side.
- **The Two Columns Under SettingsFrame's Layout:** they open from Visibility, so every kind has one property pane and Layout stays the grid and switches.
- **Moving Table's and Cards' Switches to ViewFrame's Root:** they stay where they are.
- **A Drop Line in the Two-Column Pane:** a zone is a line or displacement, never both, and only displacement trades items between two zones without engine work. The pane gives up drag-to-hide and a keyboard drag across sides for it.
- **The Bordered Text Field of Compact Cards on a List Row.**
- **Side Stored in Table's Alignment:** center means nothing in a List, and the per-type defaults disagree.
- **Outlines on Table.**
- **A Switch for Lines Between Rows.**
- **Bars Between Properties on Compact Cards.**
- **Hidden Properties Kept in Place in Their List.**
- **Wrapping Always On.**

#### Open Items

1. Each type's maximum width and the title's minimum, which planning proposes and Nathan tunes live.
2. Any file a plan names beyond *§J — Placement*, which returns to Nathan for approval.
3. The live checks *List View — Investigation §What Can't Be Known Without Running the App* lists, which planning runs before it leans on them.

#### Prospects

- **Wrapped Titles:** Cards' Wrap Titles made a switch any kind can carry.
- **Values Wrapping Within a Side.**
- **Wrapped Table Cells:** the parked *Wrapped Table Cells — Brainstorm Brief*; List's wrapping shares only the first-line grip anchor with it.
- **Flatten:** a no-grouping mode for kinds that nest, which Table has pending.
- **Virtualized Rows.**

---

#### Sources

- *List View — Brief* — Nathan's notes, approach, principles, and planning rules, verbatim.
- *List View — Investigation* — the verified state of the code at `4b18149ac`.
- *List View — Scout Findings* — the five scouts' cleaned reports.
- *List View — Fresh-Eyes Read* — a zero-context agent's thirty-six questions on this document.
- `.claude/Features/ViewTypesPM.md` — how views work today.
- `Core/Views/Host/viewKinds.ts` · `Core/Views/Table/tableKind.ts` · `Core/Views/Cards/cardsKind.ts` — the kind record and its two entries.
- `Core/Views/Table/TableView.tsx` · `UIX/Table/` — Table's row.
- `Core/Views/Cards/CardsView.tsx` · `Core/Views/Cards/cardColumns.ts` · `Core/Properties/Pickers/ValueSeat.tsx` — values, the add list, and the show and hide rules.
- `Core/Views/Pipeline/columns.ts` — the property order and hidden flags.
- `Core/Views/Settings/` — the panes behind SettingsFrame and ViewFrame.
- `UIX/Interactions/engine.tsx` — drag zones.
