## Views Drive — Matrix

The drive's cases, derived from the *Views Cleanup — Implementation Plan*'s *§Behavior Changes* and written against each phase's AFTER, its patch in `Planning/Views Cleanup/Scouts/Planning/Phases/`. Groups 2 to 10 follow the plan phase of their number. A group holds every behavior change its phase lands, crossed with each surface, input, and setting that reaches it, beside the interactions its refactor rewired on those surfaces, so a regression shows. Each case names its decision: `BC<n> <id>` is the numbered behavior change and its decision, owned by the group's phase, so it reads `AWAIT` at a head before that phase and must hold from it on; `R P<n>` is a regression crossing of phase `n`'s rewiring, owned by phase 0, so it holds at every head, the baseline included. `F<n> <tag>` is a behavior phase `n`'s checkpoint fold lands, owned by phase `n` like a behavior change. `T<task> <tag>` is a visible change a task lands that *§Behavior Changes* doesn't number, recorded under the plan's *§Deviations* and owned by the task's phase. Every case prints as `g<group> [P<owner> <decision>] <name>`, so a run reads against the tables below line for line. Groups 2 to 10 are built.

#### Dimensions

| Dimension | Values | Crossed Where |
| --- | --- | --- |
| **Surfaces** | The Table; Cards; Set bands; property bands; sub-grouped bands; the Trash and Archive table; the sidebar; View Tiles; the toolbar's view button and the views dropdown; the settings panes through both doors (the toolbar's Settings and the dropdown's per-view editor) | Each behavior change on every surface that draws it; each regression on the surfaces its phase rewired |
| **Inputs** | Mouse press; double-click; keyboard (Tab, Enter, Escape, the context-menu key); pointer drag; right-click popping a native menu | A gesture the phase rewired, by every input that reaches it; the context-menu key as a `contextmenu` event raised with no press, which is what the key delivers |
| **Settings** | Native Menus; Hide Disclosure Chevrons; Hide Empty Groups | Native Menus on and off for every list the menu door pops (group 3); Hide Disclosure Chevrons in group 7; Hide Empty Groups in group 6 |
| **States** | A locked row or tile; an active search; a custom Set order; a manual page order present or absent; a write held in flight | A locked tile in groups 8 and 10; a search in groups 7 and 10; the custom Set order in groups 6 and 7; the manual order in groups 2, 4, and 6; a held write in groups 2, 3, 5, and 6 |

**A held write:** the drive wraps the host's `mutate`, `views:save`, and `tiles:save` handlers in the main process, so a case can hold one call's reply or refuse it, and restores them at the end. It widens a round trip of a few milliseconds to seconds, which is what BC1, BC2, BC12, BC13, and F6 nest read inside.

**Drift:** selectors that changed between closed phases sit in one table, `DRIFT`, keyed by `--landed`: `.table-view` reads `.table-shell` from Phase 4 (Task 4-3); the Trash's `.trash-head-name` and `.trash-head-date` read `.col-header` cells from Phase 4 (Task 4-1); the dropdown's placeholder is found by `More` before Phase 3 and `More actions` from it (Task 3-3); the page-icon switch is found by `Page Icons` (Table) or `Hide Icons` (Cards) before Phase 3 and `Title Icons` from it; the disclosure chevron's `[data-drop-outline]` reads `[data-chevron]` from Phase 7 (Task 7-1); the bundle table's `.bundle-date` reads its row's last `.data-cell` from Phase 7 (its checkpoint fold). A selector difference is drift; a behavior difference is the case itself, so BC3 and BC6 assert the new label while their regression crossings find the control by the drifted one. Phase 9 adds no row: it renamed classes only through vanilla-extract's hashes, and group 9 reads every pane by `data-picker-portal`, role, label, inline style, and computed value. Phase 10 adds none: group 10 reads `aria-describedby`, a zone's `tabIndex`, `data-drag-source`, `aria-pressed`, and the drag announcer, which every head carries, and never `data-line-immovable`, which exists only from Phase 10.

#### Pruned

- **Card Style (BC5):** a picker of two options toggles in place rather than opening a pane (`PickerControl`), so no background exists to compare; Card Image and Card Scale cover the record's rows.
- **Native Menus on for Cards' pickers (BC5):** the list becomes a system menu, which has no in-app background.
- **The Settings door for Card Scale (BC5):** both doors draw the kind's rows through one `kindRows` builder; the Settings door's Card Image case is kept.
- **The editor door for a property's and a sub-grouping's Order row (BC4):** both doors mount the one `GroupFrame`; the Sets order row is crossed through both doors.
- **BC14 in a Table Set band:** a kind that nests keeps each page in its own Set band, so nothing gathers there; the Table's crossing is its sub-grouped band, and Cards' is its Set band.
- **BC14 under a property grouping:** `resolveView` orders the Set tree for a Sets plan alone (`group.ts`'s `viewSetOrder` through `setOrderOf`), so a property grouping's buckets never read the custom Set order.
- **BC15 in Cards:** a kind that doesn't nest draws no sub-grouping (`groupPlan`'s `sub` is `undefined` unless the kind nests), so Cards never shows an option band under a Set.
- **BC14's Location-sorted flat list:** not delivered (*§Open Items*); nothing to assert.
- **BC1 in Cards:** the refusal arm lives in `dropIO(...).persistAfter`, which both renderers reach through `useViewInteractions`' `placeInView`; the Table case is kept. Its three unit pins (`liveView.test.tsx` · "a refused drop that a later write composed over returns its row to its prior slot", "a refused drop leaves a later write that moved the row off its dropped slot as written", "a refused drop in a view that never stored its order returns its row to the slot its drop was ranked from") hold the gate's other arms.
- **The detail header's rename (R P5):** the header mounts the same `RenamableName` the Table title does; the title's crossing is kept, and renaming a Collection would rewrite every path the other groups hold.
- **The locked tile's refused config write (R P2):** `liveView.test.tsx` · "a locked tile answers a config write with a refusal and writes nothing" and "a locked tile folds a state write narrowed to its state keys, manual order beside collapse" pin it; group 8 drives a locked tile live.
- **Selection per row (R P5):** `TableView`'s per-row subscription draws the same ring; no case reads the selection differently, and the view's search, rows, and creates already re-render every row the phase touched.
- **The search's keys (R P2):** `Pipeline/search.test.ts` pins `searchKeysOf`; the host's memo is unchanged.
- **The autocomplete's heading list (R P7):** `UIX/Menus/DisclosureRow.test.ts` pins `unfolded`, which `openHeadingRows`' cases followed into.
- **A band's chevron press (R P7):** group 6's three chevron cases fold and unfold a Table Set band and fold a Cards Set band through the drifted chevron.
- **A tile naming a missing Set (R P8):** the tile draws `inertTile()` for a source the tree no longer holds, a path Phase 8 left alone; `ContainerView`'s "Set not found" is the main pane's, and the drive found no gesture that leaves a tab on a missing Set.
- **The toolbar dropdown's Delete and its Undo (R P8):** group 2's case deletes a view from that dropdown and restores it.
- **Undo of a column drag and resize:** neither was undoable before or after; no decision names it.
- **The toolbar's Settings pane and views dropdown as MenuBase hosts (R P9):** both mount `MenuDropdown` over `MenuSurface`, which Phase 9 left alone; what Phase 9 rewired behind those doors is the panes they open, which group 9 crosses through both doors, and group 3 holds the doors' own slides.
- **Native Menus on for the lists (R P9):** with the setting on, `popMenu` asks the host for a system menu and nothing mounts MenuBase; group 3 holds that route.
- **A value picker's flip at the window's edge (R P9):** this drive holds no window-height control, and the Properties Drive's group 18 (MP-E-1) flips the tile's settings pane, a 40-option list, the calendar, and TextPane against a short window, all through MenuBase's one placement; group 9 reads the flip through the link autocomplete at the editor's foot.
- **The glance and the block menu's resize (R P9):** both size through the same `usePaneResize` the link autocomplete does, and the block menu through the same `CaretPane`; TextPane doesn't resize.
- **A Select cell's pick (R P9):** group 5's value-seat case picks through it.
- **The Color picker and the calendar's nested menus (R P9):** the Color picker mounts the shell with its defaults, which group 8's Edit Color picks cross; the Properties Drive's group 18 opens the Month, Year, Hour, and Minute menus nested over the calendar.
- **The ghost New Option chip (R P9):** its anchor waits for a second pointer move and a dwell, and the drive didn't raise it reliably; `ghostOptionRow` composes `optionRow` as it did, and `ghostChip`'s `&&` selector outranks any single-class tie a moved stylesheet could flip.
- **The All Properties list's rows and heading, and the assigned list's fill (R P9):** `~/Test` assigns every registry property to Collection A, so the list holds no row, and `assignedFill` is a flex grow with no drawn edge to read.
- **A pane's hideable rows without a save (BC24):** no surface draws one; both `OptionOrderList` callers, the Grouping and Sort panes, pass `onSave`, and Phase 10's checkpoint fold removes the flag.
- **A Trash row carried onto the sidebar (R P10):** the bundle table's zone declares no carry, so its rows lift at no head; the immovable row that carries is a nav search's result, crossed onto the tab bar.
- **A locked Matrix label carried onto a tab strip (R P10):** the label refuses its snapshot and keeps its carry as a nav search's result does, which group 10 carries; its BC24 read is kept.
- **The pointer half of a movable row's lift for Table rows, Set and property bands, the Grouping pane's Set list, the dropdown's rows, and a tile's pills (R P10):** groups 4, 6, 7, and 8 drag each; group 10 drags cards, Cards bands, the sidebar, and the Grouping pane's option list, which no other group does.
- **The Sort pane's option list (R P10):** it mounts the same `OptionOrderList` the Grouping pane's option rows cross.
- **A selected row's look (R P10, the fold's shared selection read):** the ring draws only on a row whose page is the app's selection, and a selected page replaces the view in its tab, so the drive found no surface drawing it; the fold's `activeCell` collapse and `RowApi` rename draw nothing either.
- **The alias list under a typed filter (BC24):** drafting and renaming cross the same zone-wide freeze; the filter is reached only through the editor's alias slot, which the Alias Drive holds.

#### Group 2 — The Views Root and the Live View

| Case | Surface · Input | Expected | Decision |
| --- | --- | --- | --- |
| with a stored manual order, a refused drop of Page A into Doing, with Alpha 1 reordered over it meanwhile, returns Page A to the head of Todo | Table property bands, `manual_order` stored · grip drag, its value write held 3.5 s and refused, a second drag inside the hold | Page A keeps `Todo`; the Todo band draws it ahead of Page C and Alpha 1, and `manual_order` on disk ranks it there | BC1 I-070 |
| a refused drop of Page A into Doing, with Alpha 1 reordered over it meanwhile, returns Page A to the head of Todo | the same with no stored order, the default for a property-grouped view | the same | BC1 I-070 |
| the reorder made during the refused drop's round trip stands: Alpha 1 above Page C | both | Alpha 1 draws above Page C | R P2 |
| the view button's menu Show Title saves view_button labeled | toolbar view button · right-click, native | `view_button: labeled` in the sidecar | R P2 |
| Hide Title takes it back to the icon | the same | `view_button` back to icon | R P2 |
| Visibility's eye hides VD Done from the view and its heading | Settings door · Visibility eye | `hidden_properties` holds VD Done; its heading leaves | R P2 |
| its eye shows VD Done again | the same | the heading returns | R P2 |
| the Filter's property list offers Title, Location, and the Collection's properties | Settings door · Filter's property field | the list holds Title, Location, VD Stage, VD Done, VD Due | R P2 |
| a Date cell draws its value in the Nexus's date form | Table · a Date value set over the channel | the cell draws the date | R P2 |
| Page C dropped inside the Doing run of a view sorted by VD Stage takes Doing | Table, ungrouped, sorted · grip drag | Page C's `VD Stage` reads `[Doing]` | R P2 |
| a page created from the ghost after Page A draws after it and is ordered after it in Set Alpha | Table · hover ghost press, name typed | the newborn draws after Page A and follows it in `page_order` | R P2 |
| a view deleted from the dropdown leaves the sidecar and its notice's Undo restores it | views dropdown · row right-click Delete, the notice's Undo | the view leaves the sidecar and returns | R P2 |

#### Group 3 — One Pane Route

| Case | Surface · Input | Expected | Decision |
| --- | --- | --- | --- |
| a rename from the editor's title shows on the toolbar's button while its write is held | editor door · title field, `views:save` held 2.5 s | the button reads the new name while the sidecar still holds the old | BC2 1.11 |
| the editor's title rename lands in the sidecar and the button keeps it | the same | the sidecar takes the name | R P3 |
| an icon picked in the editor shows on the toolbar's button while its write is held | editor door · Edit Icon picker, held | the button draws `activity` before the sidecar holds it | BC2 1.11 |
| the picked icon lands in the sidecar | the same | `icon: activity` | R P3 |
| the Settings door opens Visibility | toolbar Settings · the Visibility row | the back bar reads Settings and Visibility | R P3 |
| the Settings door opens Layout | toolbar Settings · the Layout row | the back bar reads Settings and Layout | R P3 |
| the Settings door opens Group | toolbar Settings · the Group row | the back bar reads Settings and Group | R P3 |
| the Settings door opens Filter | toolbar Settings · the Filter row | the back bar reads Settings and Filter | R P3 |
| the Settings door opens Sort | toolbar Settings · the Sort row | the back bar reads Settings and Sort | R P3 |
| the editor door opens Layout | views dropdown editor · the Layout row | the back bar reads Views and Layout | R P3 |
| the editor door opens Group | views dropdown editor · the Group row | the back bar reads Views and Group | R P3 |
| the editor door opens Filter | views dropdown editor · the Filter row | the back bar reads Views and Filter | R P3 |
| the editor door opens Sort | views dropdown editor · the Sort row | the back bar reads Views and Sort | R P3 |
| Table's page-icon switch reads Title Icons with file-text, checked while icons show, through the Settings door | Layout · Settings door | `[role=switch][aria-label="Title Icons"]`, its row's glyph `file-text`, checked | BC3 F-2 |
| Table's page-icon switch reads Title Icons with file-text, checked while icons show, through the editor door | Layout · editor door | `[role=switch][aria-label="Title Icons"]`, its row's glyph `file-text`, checked | BC3 F-2 |
| Table's page-icon switch hides the title glyphs and writes hide_page_icons | Layout · Settings door, the switch found by its drifted label | the title glyphs leave and `hide_page_icons: true` | R P3 |
| Cards' page-icon switch reads Title Icons with file-text, checked while icons show, through the Settings door | Layout · Settings door | `[role=switch][aria-label="Title Icons"]`, its row's glyph `file-text`, checked | BC3 F-2 |
| Cards' page-icon switch reads Title Icons with file-text, checked while icons show, through the editor door | Layout · editor door | `[role=switch][aria-label="Title Icons"]`, its row's glyph `file-text`, checked | BC3 F-2 |
| Cards' page-icon switch hides the title glyphs and writes hide_page_icons | Layout · Settings door, the switch found by its drifted label | the title glyphs leave and `hide_page_icons: true` | R P3 |
| the Sets order row takes the folder glyph through the Settings door | Group · Settings door, Location grouping | the Order row's glyph is `folder` | BC4 E-5 |
| the Sets order row takes the folder glyph through the editor door | Group · editor door, Location grouping | the Order row's glyph is `folder` | BC4 E-5 |
| a sub-grouping's Order row takes arrow-down-up | Group · Location with a VD Stage sub-group | the second Order row's glyph is `arrow-down-up` | BC4 E-5 |
| a property grouping's Order row takes arrow-down-up | Group · grouped by VD Stage | `arrow-down-up` | BC4 E-5 |
| Cards' Card Image picker opens over the pane like every other picker, through the editor door | the kind's rows · editor door, Native Menus off | the pane's computed background and backdrop equal the Group By picker's | BC5 F-6 |
| Cards' Card Scale picker opens over the pane like every other picker, through the editor door | the kind's rows · editor door, Native Menus off | the pane's computed background and backdrop equal the Group By picker's | BC5 F-6 |
| Cards' Card Image picker opens over the pane like every other picker, through the Settings door | the kind's rows · Settings door, Native Menus off | the pane's computed background and backdrop equal the Group By picker's | BC5 F-6 |
| the views dropdown's placeholder reads More actions with the ellipsis glyph, drawn as Settings' footer button | views dropdown footing | `aria-label="More actions"`, glyph `ellipsis`, and Settings' More button's class | BC6 F-9 |
| the views dropdown's footing ends in its disabled placeholder | the same, found by its drifted label | disabled and last | R P3 |
| with Native Menus off, the Filter's property list draws Sort's compact rows | Settings door · Filter property field | every row's class equals a Sort list row's | R P3 |
| the Checkbox rule's closed operator reads Checked with the plain square-check glyph | Filter · VD Done picked | the closed field reads Checked with `square-check` | BC7 F-7 |
| the Checkbox operators list Checked and Unchecked with square-check and square | Filter · operator field | the two rows and their glyphs | BC7 F-7 |
| with Native Menus off, the operator list rings its current row as Sort's does | the same | the current row's class equals Sort's current row's, the other a plain row's | R P3 |
| a Checked rule over VD Done saves and empties the view, no page being checked | the same | one rule saved; no row drawn | R P3 |
| with Native Menus on, the Filter's property list is a system menu through the Settings door | Filter · Settings door, left press | a native menu listing VD Stage, no in-app list | BC7 F-7 |
| with Native Menus on, the Filter's operator list is a system menu reading Checked and Unchecked through the Settings door | the same | native rows `Checked`, `Unchecked` | BC7 F-7 |
| with Native Menus on, the Filter's property list is a system menu through the editor door | Filter · editor door, left press | a native menu listing VD Stage, no in-app list | BC7 F-7 |
| with Native Menus on, the Filter's operator list is a system menu reading Checked and Unchecked through the editor door | the same | native rows `Checked`, `Unchecked` | BC7 F-7 |
| with Native Menus on, Sort's list is a system menu | Sort By · left press | native rows list VD Stage | R P3 |

**BC8:** its look was already true at the baseline: with Native Menus off, `cae07c129`'s Filter lists draw Sort's compact rows, row classes, 23px height, pane, and ringed current row alike. Task 3-4 changed the route, the lists popping through the kit's menu door, not the look, so its two crossings are regressions owned by phase 0, and BC7's Native Menus half is what the route changes on screen.

#### Group 4 — The Table and the Second Table

| Case | Surface · Input | Expected | Decision |
| --- | --- | --- | --- |
| dragging VD Done's heading before VD Stage saves the column order and redraws the heading | Table heading · pointer drag | `property_order` and the heading read Title, VD Done, VD Stage, VD Due | R P4 |
| dragging VD Stage's resizer 60px saves its wider width | Table heading · resizer drag | `column_widths` holds the wider width | R P4 |
| the heading's menu Hide hides VD Due and drops its column | Table heading · right-click, native | `hidden_properties` holds VD Due; its heading leaves | R P4 |
| a row dragged by its grip above Page A saves the manual order and draws there | Table Set band · grip drag | `manual_order` ranks Page C above Page A; drawn Page C, Page A, Page B | R P4 |
| the Table wears the shell class | Table | the drifted shell class holds the grid | R P4 |
| the Trash's date heading and its dates left-align in their cells | Trash | the heading's lead and every date's text sit at their cell's content edge | BC9 F-8 |
| the Trash's date heading leads where its dates do | Trash | the heading's lead and the dates' share one left edge | BC9 F-8 |
| the Trash's title heading sets its glyph 6px from its label | Trash | glyph-to-label gap 6px | BC9 F-8 |
| the Archive's date heading and its dates left-align in their cells | Archive | as the Trash | BC9 F-8 |
| the Archive's date heading leads where its dates do | Archive | as the Trash | BC9 F-8 |
| the Archive wears the shell class | Archive | the drifted shell class holds its rows | R P4 |

#### Group 5 — The Host and Its Renderers

| Case | Surface · Input | Expected | Decision |
| --- | --- | --- | --- |
| the Table band's + opens the newborn's name field in the frame its row first draws | Table Set band · + press | the first mutation drawing the newborn's row draws its field inside it | BC10 I-040 |
| the name typed in the band +'s newborn names its page in Set Alpha | the same · typed, Enter | `Set Alpha/VD Plus.md` | R P5 |
| the Table's ghost opens the newborn's name field in the frame its row first draws | Table · hover ghost press | as above | BC10 I-040 |
| the Table ghost's newborn lands after Page C in Set Alpha | the same | `Set Alpha/VD Ghost.md` | R P5 |
| the title menu's New Page Below opens the newborn's name field in the frame its row first draws | Table title · right-click, native | as above | BC10 I-040 |
| a Set band's menu New Page creates through the view, opening the newborn's field with its row | Table Set band head · right-click, native | as above, landing in Set Alpha | BC10 D-2 |
| the Table's anchored ghost stays drawn until its newborn lands, no frame showing neither | Table ghost · press, `createPage` held 2.5 s | every frame draws the ghost or the newborn | BC13 2.4 |
| a press on the Table ghost held for an in-flight create starts no second create | the same · a second press inside the hold | one `createPage` reaches the host | BC12 D-1 |
| the Table title's menu Rename renames the page | Table title · right-click Rename, typed | the page takes the name | R P5 |
| a Set band's menu Rename renames the Set | Set band head · right-click Rename (the `'band'` host) | the Set takes the name | R P5 |
| a Table title's press opens its page | Table title · press | the page's tab is active | R P5 |
| a Table Select cell picks through its value seat | Table cell · press, in-app picker | `VD Stage: [Done]` | R P5 |
| the Cards band's + opens the newborn's name field in the frame its card first draws | Cards Set band · + press | as the Table | BC10 I-040 |
| the Cards ghost opens the newborn's name field in the frame its card first draws | Cards · hover ghost press | as the Table | BC10 I-040 |
| the Cards ghost's newborn lands in Set Alpha under its typed name | the same | `Set Alpha/VD Card Ghost.md` | R P5 |
| a Cards title rename commits with no frame showing the old title | Cards title · right-click Rename, typed, Enter | after the field closes, no mutation draws the old title | BC11 D-1 |
| a Cards ghost closing as a page-menu rename opens folds away rather than vanishing | Cards title · `contextmenu` event (the menu key), Rename chosen the moment the menu pops | the ghost's fold wrapper holds a `0fr` rows track, the ghost inside it, for 120 ms or more before it leaves, rather than leaving as the rename opens | BC12 D-1 |
| a sidebar rename open leaves the Cards hover ghost drawn | sidebar row · right-click Rename, then a card hovered | the ghost card draws | BC12 D-1 |

#### Group 6 — The Pipeline and the Bands

| Case | Surface · Input | Expected | Decision |
| --- | --- | --- | --- |
| a Cards band gathers Sub-Set B's page ahead of Sub-Set A's under their custom Set order | Cards Set band, `group_order` Sub-Set B first, nothing sorting | Beta 1, Alpha 1, Alpha 2, Alpha 3 | BC14 E-2 |
| a sub-grouped Table band gathers Sub-Set B's Doing page ahead of Sub-Set A's | Table, Location sub-grouped by VD Stage | Beta 1 before Alpha 2 | BC14 E-2 |
| a sort still orders a gathered Cards band over the custom Set order | Cards, sorted by Title | Alpha 1, Alpha 2, Alpha 3, Beta 1 | R P6 |
| a manual page order still orders a gathered Cards band over the custom Set order | Cards with `manual_order` | the manual order | R P6 |
| a sub-grouped Table shows the empty Done band under Set Alpha | Table, Hide Empty Groups off | a Done head between Set Alpha and Set Beta | BC15 E-3 |
| under Hide Empty Groups no empty option band shows under any Set | Table, Hide Empty Groups on | no Done head | R P6 |
| a property grouping shows its empty Done band at the top level | Table grouped by VD Stage | a Done head | R P6 |
| a Set a filter empties leaves the sub-grouped view, its empty option bands with it | Table sub-grouped, Title contains Page | Set Alpha and its option bands alone | R P6 |
| a row dropped on Set Alpha's empty Done band takes Done | Table sub-grouped · grip drag onto the head | Page A's `VD Stage` reads Done | BC15 E-3 |
| an empty Done band dragged above Todo under its Set saves the sub-group's order | the same · head drag | `sub_group.order` begins with Done | BC15 E-3 |
| a collapsed Set holding only empty bands springs open under a dragged row | Table sub-grouped, an empty Set collapsed · drag held over its head | the head reads expanded with its Done band drawn | BC15 E-3 |
| a drag carried back to its row moves nothing | the same | Page B keeps its value and row | R P6 |
| the drop line over the ungrouped tail's row stands off its indent as it does over a banded row | Table grouped by VD Stage · drag over Alpha 3, then Page A | the line's offset from the lead cell's content edge is equal over both | BC16 6.6 |
| a refused nest of VD Delta, which the stored group_order never ranked, returns it to the end it was ranked from while VD Gamma's reorder over it stands | Table Set bands, `group_order` ranking every Set but VD Delta, Set Alpha holding a sub-Set · VD Delta's head dragged into Set Alpha, its `moveSet` held 3.5 s and refused, VD Gamma's head dragged above Set Beta inside the hold | VD Delta stays at the Collection's root; the top-level heads read Set Alpha, VD Gamma, Set Beta, VD Delta; the saved `group_order` ends in VD Delta with VD Gamma above Set Beta | F6 nest |
| an empty Location-sorted flat Cards view draws its Set cards with no band or gap below, as an unsorted one does | Cards, ungrouped, Set cards on, a filter emptying it · sorted by Location against unsorted | the same Set cards, no `.group-band` or `.cards-grid`, and the same drawn extent | F6 flat |
| a Table Set band's chevron folds it, saving collapsed_groups and hiding its rows | Table Set band · chevron press | `collapsed_groups` holds Set Alpha, its rows leave, `aria-expanded="false"` | R P6 |
| the chevron again unfolds it and drops it from collapsed_groups | the same | its rows return | R P6 |
| Set Beta's head dragged above Set Alpha saves the group order and draws there | Table Set bands · head drag | `group_order` ranks Set Beta first, drawn first | R P6 |
| a row dropped among Sub-Set B's rows moves its page into Sub-Set B | Table · grip drag across Sets | Page C moves into Sub-Set B | R P6 |
| the Doing band dragged above Todo saves the grouping's order and draws there | Table property bands · head drag | `group.order` begins with Doing | R P6 |
| a Cards Set band's chevron folds it and saves collapsed_groups | Cards Set band · chevron press | `collapsed_groups` holds Set Beta; its cards leave | R P6 |

#### Group 7 — Disclosure and Rows

| Case | Surface · Input | Expected | Decision |
| --- | --- | --- | --- |
| the Trash's folder chevron opens the folder on a double-click's first click and closes it on its second, as the sidebar's does | Trash · chevron double-click | `aria-expanded` reads false, true, false, and stays false | BC17 7.1 |
| a nested bundle row's trail caps at 55% of its cell, measured inside its indent | Trash · a folder's inner row | the inner cell's content box is the folder row's less one step, and the capped trail is 55% of it | BC17 7.1 |
| the Archive's folder chevron opens the folder on a double-click's first click and closes it on its second | Archive · chevron double-click | as the Trash | BC17 7.1 |
| Tab from the Table's band list passes every band chevron and New Page button by | Table Set bands · the list's Tab stop, then Tab | the list hands focus to a head; Tab lands outside every head | BC18 C-3 |
| a band head carries aria-expanded and its chevron no Collapse or Expand label | Table Set band head | `aria-expanded` on the head; no `Collapse group` or `Expand group` inside it | BC18 C-3 |
| the Table band's chevron shows no pointer cursor | Table band chevron | computed `cursor` isn't `pointer` | BC18 C-3 |
| Enter on a focused Table band head folds it in place, focus kept, and saves collapsed_groups; Enter again unfolds it | Table Set band head · Enter, twice | `aria-expanded` flips, focus stays on the head, `collapsed_groups` follows | R P7 |
| the menu key on a focused Table Set band head opens its menu with New Page | Table Set band head · `contextmenu` with no press | the native band menu holds New Page | R P7 |
| the ghost row draws the data rows' lead cell, gutter included | Table ghost row | its lead cell holds the rail at the data row's place and width, with the data row's padding | BC19 7.5 |
| Tab from the Cards band list passes every band chevron and New Page button by | Cards Set bands · the list's Tab stop, then Tab | the list hands focus to a head; Tab lands outside every head, on a card | BC18 C-3 |
| Enter on a focused Cards band head folds it in place, focus kept, and saves collapsed_groups; Enter again unfolds it | Cards Set band head · Enter, twice | as the Table | R P7 |
| the menu key on a focused Cards Set band head opens its menu with New Page | Cards Set band head · `contextmenu` with no press | as the Table | R P7 |
| a Table search opens every band, a folded one included, and its chevron changes nothing | Table, Set Alpha folded · search, chevron press | Set Alpha drawn open with its rows; `collapsed_groups` unchanged; every band back once the search empties | R P7 |
| a Cards search opens every band, a folded one included, and its chevron changes nothing | Cards, Set Alpha folded · the same | the same | R P7 |
| the sidebar's chevron expands a Collection, drawing its Sets | sidebar · chevron press | its Sets draw | R P7 |
| rows nest by one 14px step in the Table, the bundle table, and the sidebar | Table rows, Trash rows, sidebar rows | each depth's lead steps 14px; the sidebar's is read between two nested rows, since a Collection's own row takes the section's padding | R P7 |
| Hide Disclosure Chevrons' caption names the sidebar and the Grouping pane | Settings · Interface | the caption names both | BC20 C-4 |
| with Hide Disclosure Chevrons on, a sidebar row keeps its 8px gap where the chevron sat and its hover fill stays where it reaches with chevrons shown | sidebar · setting off, then on | the row's left edge is unchanged; its icon sits the row's gap past its content edge | BC20 C-4 |
| with Hide Disclosure Chevrons on, the Grouping pane's folder list draws no chevron | Group pane · setting on | no chevron drawn | R P7 |
| bands, the bundle table, and the Location tree keep their chevrons under Hide Disclosure Chevrons | each · setting on | each chevron drawn | R P7 |
| the Grouping pane's folder list expands and collapses by its chevron | Group pane · chevron press, twice | the sub-Sets show, then hide | R P7 |
| the Location tree lists Set Beta before Set Alpha and Sub-Set B before Sub-Set A under the view's custom Set order | Filter · Location value, `group_order` Set Beta first | the tree's order | BC21 C-5 |
| a Location tree leaf sits flush where the Grouping list's does | Filter's Location tree and the Group pane · Set Alpha | the leaf's glyph sits at its row's content edge in both | BC21 C-5 |
| the Filter's Location tree expands and collapses by its chevron | Filter · Location value, chevron press, twice | the sub-Sets show, then hide | R P7 |
| a refused nest of VD Delta in the Grouping pane's Set list, which the stored group_order never ranked, returns it to the end it was ranked from while VD Gamma's reorder over it stands | Group pane's Set list, `group_order` ranking every Set but VD Delta, Set Alpha holding a sub-Set · VD Delta's row dragged into Set Alpha, its `moveSet` held 3.5 s and refused, VD Gamma's row dragged above Set Beta inside the hold | as group 6's F6 nest, read from the pane's rows | F7 nest |

**BC18's and BC20's held halves:** at Phase 6's head the band head already toggled on Enter (`LineRow`'s `open`), carried `aria-expanded`, and opened its menu on `contextmenu`; the Grouping pane already drew no chevron under the setting (`GroupFrame` read it), and the old sidebar rule reached only `.row`, which the Location tree's rows don't wear. Tasks 7-2 and 7-4 rewired these without changing them on screen, so their crossings are regressions, and each behavior change's cases assert what changed: the head's Tab stops, the chevron's label and cursor, the caption, and the sidebar row's geometry.

#### Group 8 — View Tiles

The tile sits on the homepage's board, written whole to `.nexus/interface/homepage/_tiles.json` as another window's write, which the open board reloads.

| Case | Surface · Input | Expected | Decision |
| --- | --- | --- | --- |
| a tile's pill switches its view | tile pills · press | the entry's `active` is the pill's, and the tile draws its Cards | R P8 |
| a new pill's entering class stays after its entrance plays, until the tile's list next changes | tile strip · New View, then New View again | the newborn's own class holds 1.5 s on, so a remount or reorder replays it, and leaves at the next new view | BC22 8.2 |
| a locked tile's view pill opens no rename on a double-click | locked tile · pill double-click | no field opens | BC23 3.2 |
| a tile's duplicate names its copy from the stored entry, a sibling another window named meanwhile included | tile pill · `contextmenu`, the entry's second view renamed `VD Tile A (2)` on disk while the menu is up, then Duplicate | the copy reads `VD Tile A (3)` after its source | BC23 3.2 |
| duplicating in a tile switches the tile to the copy | the same | `active` is the copy's | R P8 |
| a view deleted from a tile leaves the entry and its notice's Undo restores it in place | tile pill · right-click Delete, confirmed, then Undo | the view leaves and returns at its index | R P8 |
| a lock another window writes while a tile pill's Edit Color, Edit Icon, or delete confirm is open stops its pick | tile pill · right-click Edit Color, Edit Icon, or Delete, the entry written `locked: true` on disk while the picker or confirm is up, then the pick | the entry keeps no color, its `view-cards` icon, and both views | F8 lock |
| a pill dragged before its sibling reorders the tile's views | tile pills · drag | the entry's views reorder | R P8 |
| a tile dropdown row's rename field doesn't auto-size, matching the toolbar dropdown's | tile dropdown row and toolbar dropdown row · right-click Rename | the two fields' classes and `size` match | BC22 8.1 |
| the tile's and the toolbar's row menus offer the same rows, the tile adding its Titles row | both dropdowns · right-click | Rename, Edit Icon, Edit Color, Duplicate, Delete in both, and the tile's Hide Titles | R P8 |
| a rename through the shared row commits, cancels, and stands refused in the tile's dropdown | tile dropdown row · Rename typed and Escape, typed and Enter, typed and Enter with `tiles:save` refused | the entry keeps, takes, then keeps the name, and the row draws what the entry holds | R P8 |
| a rename through the shared row commits, cancels, and stands refused in the toolbar's dropdown | toolbar dropdown row · the same with `views:save` refused | the sidecar keeps, takes, then keeps the name, and the row draws what it holds | R P8 |
| the shared row's Edit Icon and Edit Color save in the tile and the toolbar alike | both dropdowns · Edit Color `red-3`, Edit Icon `activity` | each store holds both | R P8 |
| duplicating in the toolbar dropdown leaves the shown view | toolbar dropdown row · Duplicate | a copy in the sidecar; the button keeps the shown view | R P8 |
| a toolbar dropdown row dragged above its sibling reorders the views | toolbar dropdown · row drag | the sidecar's views reorder | R P8 |
| a toolbar dropdown row's rename shows the new name through its held save, on the shown view's row and another's, and a refused one returns to the old | toolbar dropdown row · Rename with `views:save` held 2.5 s, then held and refused | every frame from the commit draws the new name alone; the refused rename draws the new name, then the old | F8 rename |
| the last view can't be deleted from either list | a one-view tile's pill and Collection B's dropdown row · right-click | Delete disabled in both | R P8 |
| a tile's reveal anchors to the Table's heading, not its rows | Table tile, views hidden · hover | the heading reveals the strip; a row doesn't | R P8 |
| a tile's reveal anchors to Cards' first row of cards | flat Cards tile, Set cards off · hover | the first card reveals the strip | R P8 |
| a grouped Cards tile's reveal anchors to its first band as a zone, its cards outside it | grouped Cards tile, Set cards off · hover | the band row reveals the strip; a card doesn't | R P8 |
| a Cards tile whose bands show with no card drawn anchors its reveal to its first band | Cards tile grouped by VD Stage, Set cards off, a filter emptying every band, Hide Empty Groups off · hover | the first band row reveals the strip | T8-3 peek |
| a tile's Table draws at the embed zoom with no heading fill, and its Cards at the embed zoom inside the tile's inset | Table and Cards tiles | the shell's `--zoom` is the tile's `--view-embed-zoom` with `--heading-fill: none`; Cards' `--zoom` is `--embed-zoom`, its grid's padding the tile's `--tile-inset-l` once zoomed | R P8 |

**The fold's rows:** the lock is written to the board's file, the path another window's write takes; its delete arm already held at both heads, since the confirm's exit reads the lock from the render after it, so the color and icon arms are what discriminate. The empty-band peek already holds at `4a77ab628`, where Task 8-3's band lead draws it, and reads AWAIT at Phase 7's head, where the reveal anchored only on a card.

**The reveal and the embed:** Task 8-3 moved what the tile reads from the renderers' classes to their `data-view-lead` and `[data-view-embed]` declarations, so its four cases hover and measure the drawn elements by the classes every head carries; they're regressions, holding where the declarations didn't exist yet.

#### Group 9 — MenuBase

Phase 9 lands no numbered behavior change; it re-files the shell every pane mounts in, so its cases are regression crossings of the panes MenuBase hosts on the views' surfaces, each opened and placed inside the window, dismissed by Escape, an outside press, and choosing, and, where it resizes, resized, beside the computed look of each style that moved files. A pane hangs `MENU_GAP`'s 6px off its trigger, keeps `VIEWPORT_MARGIN`'s 8px from the window, and caps its list at `PANE_MAX_HEIGHT`'s 240px, read as `MenuScrollFrame`'s inline ceiling.

| Case | Surface · Input | Expected | Decision |
| --- | --- | --- | --- |
| a Select cell's picker hangs below its cell inside the window, its list capped at the pane ceiling | Table VD Stage cell · press | below, 6px off, inside; `240px` | R P9 |
| Escape and an outside press each close a Select cell's picker, writing nothing | the same · Escape; a press on the view's foot | the pane leaves; Page B's stage unchanged | R P9 |
| a Date cell's calendar hangs below its cell inside the window and closes on Escape, writing nothing | Table VD Due cell · press, Escape | below, inside; no VD Due written | R P9 |
| the calendar rings today alone, in the accent stroke | the same | one day pill draws a shadow, today's, its `--field-ring` the root's `--accent-stroke-hot` (`pillToday`) | R P9 |
| with Native Menus off, the Sort By list hangs below its field inside the window through the Settings door, capped at the pane ceiling | Settings door · Sort By | below, 6px off, inside; `240px` | R P9 |
| with Native Menus off, the Sort By list hangs below its field inside the window through the editor door, capped at the pane ceiling | editor door · Sort By | the same | R P9 |
| with Native Menus off, the Group By and Filter property lists hang below their fields inside the window | Settings door · Group By, Filter property | the same | R P9 |
| Escape and a press beside the Sort By list each close it alone, the Sort pane staying, and choosing VD Stage closes it and saves the sort | Sort By · Escape; a press in the Settings pane's gutter; VD Stage | the list leaves and the back bar stays; `sort` names VD Stage | R P9 |
| choosing VD Stage from the Group By list closes it and saves the grouping | Group By · VD Stage | the list leaves; `group` names VD Stage | R P9 |
| the Location tree hangs below its field inside the window, between its 140px floor and 260px ceiling, capped at the pane ceiling | Filter · Location value | below, inside; the shell's `min-width` 140px, `max-width` 260px (`treePane`); `240px` | R P9 |
| choosing Set Alpha in the Location tree saves the rule and keeps the tree open; Escape and an outside press each close it, the Filter pane staying | the same · Set Alpha; Escape; a press in the gutter | `values` holds Set Alpha, the tree stays; it leaves and the back bar stays | R P9 |
| the Properties pane's VD Stage options sit 6px apart under a 6px lead in a 12px-gapped group list, each chip's lead 8px, and Edit Option dims until its row is hovered | Settings door · Properties, VD Stage | the option list's `row-gap` and `padding-top` 6px and its rows 6px apart (`optionList`), the group list's gap 12px (`statusGroups`), the lead's gap 8px (`optionLead`), Edit Option's opacity rising on hover (`optionEditButton`) | R P9 |
| an option's editor pane hangs below its Edit Option inside the window; Escape and an outside press each close it, the Properties pane staying | the same · Edit Option; Escape; a press in the gutter | below, 6px off, inside; it leaves and the option rows stay | R P9 |
| VD Due's type editor sets its format rows 8px apart | Properties · VD Due | the Date, Day, and Time Format rows 8px apart (`configEditor`) | R P9 |
| the editor's icon picker hangs below its button inside the window, closes on Escape writing nothing, and narrows to activity under a search | editor door · Edit Icon, Escape, then typed | below, inside; the view's icon unchanged; every cell names `activ` | R P9 |
| a card's VD Stage value opens its picker below it inside the window, and choosing Done writes it and closes the picker | Cards value seat · press, Done | below, 6px off, inside; Page B reads Done; the pane leaves | R P9 |
| the link autocomplete hangs below its caret inside the window, its free edges below | a page's editor · `[[#` on its first line | below the caret, 6px off; edges `e`, `w`, `s`, `se`, `sw` | R P9 |
| the autocomplete's south edge shortens it and its east edge widens it, its top holding | the same · `resize-edge-s` 30px up, `resize-edge-e` 60px right | 30px shorter, 60px wider, the same top | R P9 |
| the autocomplete's heading list folds a heading's children by its chevron and unfolds them again | the same · Two's chevron, twice | Two A leaves, then returns | R P9 |
| folding a heading in the autocomplete returns its highlight to the first row | the same · ArrowDown twice, then Two's chevron | the highlight leaves One, then rests on One | R P9 |
| Escape closes the autocomplete, reopening it lists every heading unfolded, and choosing One A writes its link and closes it | the same · One folded, Escape, `[[#` again, One A pressed | every heading listed; the line reads `[[#One A]]` | R P9 |
| at the window's foot the autocomplete opens above its caret inside the window, its free edges above | the same · `[[#` past sixty blank lines | above, 6px off, inside; edges `e`, `w`, `n`, `ne`, `nw` | R P9 |
| a tile's settings pane hangs below its button inside the window, its gutter the toolbar Settings pane's | View Tile · View settings | below, inside; its padding the toolbar pane's, less the toolbar's notch (`bareSurface`, `hostedGutter`) | R P9 |
| a tile's settings pane slides to Filter and back inside the window, and Escape and an outside press each close it | the same · Filter, Back; Escape; a press on the board | inside on each slide; it leaves | R P9 |
| a tile's view list hangs below its switcher inside the window, capped at the pane ceiling; Escape and an outside press each close it, and choosing VD Tile B switches the tile, the list staying open | dropdown-style tile · switcher | below, inside, `240px`; it leaves; `active` is 1 and the switcher reads VD Tile B | R P9 |
| a tile pill's rename cancels on Escape and commits on Enter | tile pill · double-click, typed, Escape; again, Enter | the entry keeps, then takes, the name | R P9 |
| a tile pill's rename field auto-sizes to its text | the same · `VD`, then a longer name | the field widens with its text | R P9 |
| a tile pill's rename shows its new name through its held save | the same · Enter with `tiles:save` held 2.5 s | every frame draws the new name alone | R P9 |

**The fold's rows:** Phase 9's checkpoint fold moved the link autocomplete's folding onto the `Disclosure` shape and gave the pill and the dropdown row one `viewNameField`, the pill returning its save to the field as the dropdown row has since Phase 8. Each preserves behavior, so their four autocomplete rows and three pill rows hold at `3f4734b35` and are regressions. The held save included: the tile paints its write ahead, so the pill's name held through it before the fold as well. The pill's lock half is BC23's case.

#### Group 10 — One Lock per Row

Before Phase 10 every immovable row already refused its lift: `lineList`'s `locked`, the band spec's `disabled` and `draggable` check, and `MatrixView`'s refused snap each answered no snapshot, so the engine declined a keyboard lift, and a pointer one unless the row carries. What Behavior Change 24 changes is what the rows say, `aria-describedby` dropping to nothing, and the Cards band list's Tab stop under a search; each BC24 case gates on those reads alone, and each refusal or own action rides as a regression. A lift reads the row's `data-drag-source` or a sortable's `aria-pressed` and the drag announcer's "Picked up"; a description is the element `aria-describedby` names, its text telling to press Space.

| Case | Surface · Input | Expected | Decision |
| --- | --- | --- | --- |
| a movable Table row and Set band head still name the gesture and lift by Space | Table Set bands · Space, Escape | both described; each lifts | R P10 |
| a movable row still lifts by Space, moves by ArrowUp, and drops by Enter, saving manual_order | Table row · Space, ArrowUp, Enter | Page C above Page B on disk and drawn | R P10 |
| a band's drop line and a row's at the same depth stand at one indent, one inset past each lead, and a row a level deeper draws its line one step right | Table Set bands · Sub-Set B's head over Sub-Set A's; Page B's grip over Page A and over Alpha 1, each cancelled | the head's line equals the row's; each the same inset past its lead; the deeper line 14px right | R P10 |
| Enter on a movable Table row still opens its page | Table row · Enter | Page A's tab is active | R P10 |
| a Table sorted by two keys names no drag gesture on its rows while its band heads still do | Table, two sort keys | no row described; every head described | BC24 I-059 |
| a two-key sorted Table's row draws no drop line under a drag and writes nothing, and Space opens its page rather than lifting it | the same · grip drag released on another row; Space | no line, no `manual_order`, the value kept; Page B's tab active | R P10 |
| a Date band head names no drag gesture | Table grouped by VD Due | no head described | BC24 I-059 |
| Space on a Date band head folds it and Space again unfolds it, lifting nothing | the same · Space, twice | `aria-expanded` false, then true; no lift | R P10 |
| a searching Table's rows and band heads name no drag gesture | Table · search `1` | none described | BC24 I-059 |
| a searching Table's band list keeps its Tab stop, its band head lifts by neither Space nor drag, and a row dragged onto another band draws no line and moves nothing | the same · Space and a drag on Sub-Set B's head; Beta 1 dragged onto Alpha 1 | the zone's `tabIndex` 0; no lift; no line, nothing written | R P10 |
| a searching Cards view's band list keeps its Tab stop | Cards Set bands · search `a` | the zone's `tabIndex` 0 | BC24 I-059 |
| a searching Cards view's band heads name no drag gesture | the same | none described | BC24 I-059 |
| a searching Cards band head lifts by neither Space nor drag | the same · Space; Set Beta's head dragged onto Set Alpha's | no lift; no `group_order` | R P10 |
| a searching Cards view's Set cards name no drag gesture and lift by no Space | Cards with Set cards · search `1`, Space | none described; no lift | F10 displace |
| a Cards view sorted by two keys names no drag gesture on its cards and lifts none by Space | Cards, two sort keys · Space | none described; no lift | F10 displace |
| a searching ungrouped Cards view draws no empty band-list Tab stop | Cards, flat · search `Page` | no tabbable `.line-zone` without a band head | F10 flat |
| a card and a Cards band head still name the gesture and lift by Space and by drag | Cards Set bands · Space; a drag, cancelled | all described; each lifts both ways, the head's line drawn; nothing written | R P10 |
| the Grouping pane's option rows still name the gesture and lift by Space and by drag | Group pane, grouped by VD Stage · Space; Done dragged onto Todo, cancelled | all described; each lifts, its line drawn; no `group.order` | R P10 |
| the Grouping pane's option eye hides Done and shows it again | the same · Hide Done, Show Done | `hidden_groups` gains Done's key, then loses it | R P10 |
| the Grouping pane's Set rows still name the gesture and lift by Space | Group pane, Location grouping · Space | all described; lifts | R P10 |
| the Grouping pane's Set eye hides Set Beta and shows it again | the same · Hide Set Beta, Show Set Beta | `hidden_groups` gains Set Beta, then loses it | R P10 |
| with two views or more, every dropdown row names the gesture, lifts by Space, and switches the view on Enter | Collection A's views dropdown · Space; Enter | all described; lifts; the button reads the row's view | R P10 |
| the views list's one row names no drag gesture | Collection B's views dropdown | its one row undescribed | BC24 I-059 |
| the views list's one row lifts by neither Space nor drag | the same · Space | no lift | R P10 |
| the Trash's and Archive's rows name no drag gesture | Trash and Archive rows | none described | BC24 I-059 |
| Space on a Trash row toggles its check, and the row lifts by neither Space nor drag | a trashed folder's row · Space, twice; a drag released | the check flips; no lift either way | R P10 |
| the sidebar's reorderable rows still name the gesture and lift by Space and by drag | sidebar, Collection A open · Space on Set Beta; Set Beta dragged onto Set Alpha, cancelled | all described; lifts both ways, its line drawn | R P10 |
| the nav view's Recents rows, which reorder, still name the gesture and lift by Space | New Tab's nav view · Space | all described; lifts | R P10 |
| a nav search's result rows name no drag gesture | the nav view · search `Page` | none described | BC24 I-059 |
| a nav search result still carries onto the tab bar by pointer, opening its tab | the same · Page A's result dragged onto the tab bar | held with no drop line; a Page A tab opens | R P10 |
| a nav search's gallery results name no drag gesture and lift by no Space | the same in the gallery · Space | none described; no lift | F10 displace |
| Space on a nav search result opens it rather than lifting it | the list · Space on Page B | no lift; Page B's tab active | R P10 |
| the alias list's rows still name the gesture and lift by Space | Page B's Aliases pane · Space | all described; lifts | R P10 |
| the alias list freezes while drafting and renaming, its rows naming no drag gesture and lifting by no drag | the same · Add alias; Rename from a row's menu; a row dragged onto another in each | the field open; none described; no lift | BC24 I-059 |
| an unlocked tile's pills still name the gesture and lift by Space | View Tile, two views · Space | all described; lifts | R P10 |
| a locked tile's pills name no drag gesture | locked tile | none described | BC24 I-059 |
| Space on a locked tile's pill switches the tile's view rather than lifting it | the same · Space on VD Tile B | no lift; `active` 1 | R P10 |
| a tile's lone view pill names no drag gesture and lifts by neither Space nor drag | one-view tile · Space; a drag, cancelled | undescribed; no lift; the tile draws its Table | F10 pill |
| a locked Matrix's node label names no drag gesture | Matrix, `display.locked` · Page A's node hovered | the anchor carries the row handle and no description | BC24 I-059 |

**The fold's rows:** Phase 10's checkpoint fold gives displace items the per-item flag in place of `DisplaceSpec.fixed`, so Set cards under a search, cards under two sorts, the nav gallery's search results, and a tile's lone pill stop naming and taking a lift into a session that can't move; and an ungrouped Cards view draws its band list only around bands. The alias list keeps its zone-wide freeze, since Tab never reaches the list while a field inside it is open, so its case is BC24's disabled-zone half. Each reads FAIL at `37a08d0cb` and AWAIT at `daf7bb55f` bar the last, which reads AHEAD there, since Phase 10's own commit gave the searching list the empty Tab stop the fold takes away, where the Phase 9 zone was disabled under a search. Its `hide?: HideControls`, `listZone`'s one indent source, and the shared selection read preserve behavior, so the hide eyes and the drop lines are regressions.
