## Views Drive — Matrix

The drive's cases, derived from the *Views Cleanup — Implementation Plan*'s *§Behavior Changes* and written against each phase's landed change; group 11 is the *List View — Implementation Plan*'s, derived from *List View — Decisions & Intention*. Groups 2 to 10 follow the plan phase of their number. A group holds every behavior change its phase lands, crossed with each surface, input, and setting that reaches it, beside the interactions its refactor rewired on those surfaces, so a regression shows. Each case names its decision: `BC<n> <id>` is the numbered behavior change and its decision, owned by the group's phase, so it reads `AWAIT` at a head before that phase and must hold from it on; `R P<n>` is a regression crossing of phase `n`'s rewiring, owned by phase 0, so it holds at every head, the baseline included. `F<n> <tag>` is a behavior a fold lands at phase `n`'s checkpoint or, for `F10`, in the Final Verification after it, owned by phase `n` like a behavior change. `T<task> <tag>` is a visible change a task lands that *§Behavior Changes* doesn't number, recorded under the plan's *§Deviations* and owned by the task's phase. Group 11 tags a case by the List decision it proves, owned by `--landed 11`, which stands for the List View plan landed, and its regressions of the pieces that plan shared as `R P11`. Every case prints as `g<group> [P<owner> <decision>] <name>`, so a run reads against the tables below line for line. Groups 2 to 11 are built.

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
- **A selected row's look (R P10, the fold's shared selection read):** the highlight draws only on a row whose page is the app's selection, and a plainly pressed page replaces the view in its tab while a Command-pressed one parks it inert; `Core/Views/Table/cellGestures.test.tsx` pins a Table row's `selected` class and `Core/Views/List/ListView.test.tsx` a List row's absence of it (group 11's *§Pruned*). The fold's `activeCell` collapse and `RowApi` rename draw nothing.
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
| a row focused under a search inside a band saved collapsed gives its list the Tab stop back once Escape ends the search and folds the row away | Table Set bands, Set Alpha saved collapsed · search `Page`, focus on Page A, Escape | the zone's `tabIndex` -1 while the row holds focus; the search ended, Set Alpha folded, focus out of the list; the zone's `tabIndex` 0 | F10 stop |
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

**The fold's rows:** Phase 10's checkpoint fold gives displace items the per-item flag in place of `DisplaceSpec.fixed`, so Set cards under a search, cards under two sorts, the nav gallery's search results, and a tile's lone pill stop naming and taking a lift into a session that can't move; and an ungrouped Cards view draws its band list only around bands. The alias list keeps its zone-wide freeze, since Tab never reaches the list while a field inside it is open, so its case is BC24's disabled-zone half. Each reads FAIL at `37a08d0cb` and AWAIT at `daf7bb55f` bar the last, which reads AHEAD there, since Phase 10's own commit gave the searching list the empty Tab stop the fold takes away, where the Phase 9 zone was disabled under a search. Its `hide?: HideControls`, `listZone`'s one indent source, and the shared selection read preserve behavior, so the hide eyes and the drop lines are regressions. The stop row landed with the Final Verification's folds, which hand a line list its Tab stop back however its focused item leaves, so it reads FAIL at every head before them.

#### Group 11 — List

Derived from *List View — Decisions & Intention*, each case naming the decisions it proves; the regressions are the pieces the List work shared with Table, Cards, and the Properties panel. Group 11 seeds what it reads inside its own run, after the drive's three properties: seven more on Collection A (VL Tags, a Multi-Select; VL Phase, a Status; VL Count, a plain Number; VL Meter, a percent Number in its bar look; VL Note, a Text; VL Site, a Link; VL Doc, a File), values for `~/Test`'s Areas, Topics, and Projects Contexts, a VL Rows Set inside Set Beta holding a row of each content kind (VL Bare, VL Left, VL Right, VL Both, VL Crowded, VL Full), a long-titled row at each indentation depth (the Collection's root, Set Beta, Sub-Set A, and a VL Deep Set inside it), and a List view on the empty Collection B. Every expectation is read, not assumed: what a row should draw comes from its page's front matter on disk, the tree's Context values, and its file's own times for the stamps; a width, a floor, a cap, a gap, or a weight from the view's computed tokens, the theme's, or another drawn box; a List's heights, spacings, sorts, and alignments against a Table's of the same Collection.

##### Dimensions

| Dimension | Values | Crossed Where |
| --- | --- | --- |
| **Grouping** | None; Sets, with Sub-Sets and a deeper VL Deep; a property (VD Stage); Sets sub-grouped by VD Stage; open, closed, and empty bands | The configurations; the spacing, empty-band, rail-ending, and creation cases. A property grouping takes no sub-group: `groupPlan` answers a property plan with no `sub` (`Core/Views/Pipeline/group.ts`), so that pair doesn't exist, and a case states it |
| **Switches** | Wrap Rows, Outlines, and Title Icons, each on and off; through the view editor's root and Settings' Layout footing | Stored by every configuration; written each way through each door by the switch cases; on and off for a view newly switched to a List |
| **Scale** | 1 and 1.25 | Every configuration; a row's and a band's drag. A View Tile draws at its own size whatever the view's Scale (`Core/Views/Host/ViewHost.tsx`), so a tile's configuration keeps 1 |
| **Sides and Order** | Each type's default; VD Stage moved Right and VD Due Left; VD Stage and VL Tags ahead of Title, both stamps shown last; every property Left; every property Right; three hidden; Title stored Right | The configurations; the pane cases |
| **A Row's Contents** | Title alone; left values only; right values only; both; crowded past the row, with a long Link target and a tag past the cap; a long title; a value of every type, its blank, Number plain and in its bar look, a Checkbox each way, a Link resolving and not, the two stamps, a newborn's stamps before its values load | The contents cases; every configuration's structure read, over every row drawn |
| **Width and Depth** | The window's own width; a pixel above and below each long-titled row's and the crowded row's wrap or scroll point; a 620px window; rows at depth 0 to 3 | Every configuration, over every row at each width |
| **Surface** | Collection A's main pane, Set Beta's own view, a View Tile on the homepage, one low on its board; with and without a banner | The configurations; a row's drag; the upward pane; the banner-line cases |
| **Pipeline** | None, a filter, a sort, a search | The configurations, each sort against a Table of the same view; a search and two sort keys against a row's drag |
| **Inputs** | Press, right-click on a native menu, pointer drag, keyboard (Space, the arrows, Enter, Escape), hover, the mouse wheel | The interaction cases, each by every input that reaches it |

##### The Configurations

Sides × grouping × pipeline × surface × Wrap Rows × Outlines × Title Icons × Scale is 5,376 views. The 28 below cover every pair of two dimensions' values, which 7 sides × 4 groupings make the least that can; a tile takes no search, since the search lives in the detail header a tile doesn't draw, and draws at its own size whatever the view's Scale. Each runs the same reads over every row it draws, so the crossings are data the cases iterate.

| # | Sides | Grouping | Pipeline | Surface | Wrap Rows | Outlines | Title Icons | Scale |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | defaults | none | none | tile | off | off | off | 1 |
| 2 | defaults | Sets | search | Collection | on | on | on | 1.25 |
| 3 | defaults | property | filter | Collection | on | off | on | 1.25 |
| 4 | defaults | Sets sub-grouped | sort | Set | off | on | off | 1.25 |
| 5 | moved | none | sort | Collection | off | on | on | 1.25 |
| 6 | moved | Sets | filter | Collection | on | off | off | 1 |
| 7 | moved | property | search | Set | off | off | on | 1 |
| 8 | moved | Sets sub-grouped | none | tile | on | on | off | 1 |
| 9 | ahead of Title | none | none | tile | on | on | on | 1 |
| 10 | ahead of Title | Sets | search | Set | off | off | off | 1.25 |
| 11 | ahead of Title | property | filter | Set | on | on | on | 1 |
| 12 | ahead of Title | Sets sub-grouped | sort | Collection | on | off | off | 1 |
| 13 | all Left | none | filter | Collection | on | on | off | 1 |
| 14 | all Left | Sets | sort | tile | on | off | on | 1 |
| 15 | all Left | property | none | Set | off | off | on | 1.25 |
| 16 | all Left | Sets sub-grouped | search | Collection | off | off | off | 1 |
| 17 | all Right | none | search | Set | on | off | on | 1.25 |
| 18 | all Right | Sets | filter | tile | on | off | on | 1 |
| 19 | all Right | property | sort | Collection | off | on | off | 1 |
| 20 | all Right | Sets sub-grouped | none | Collection | on | off | on | 1 |
| 21 | hidden | none | search | Set | off | on | off | 1.25 |
| 22 | hidden | Sets | none | Collection | on | on | off | 1 |
| 23 | hidden | property | sort | tile | off | on | off | 1 |
| 24 | hidden | Sets sub-grouped | filter | tile | off | off | on | 1 |
| 25 | Title stored Right | none | sort | Set | on | off | on | 1.25 |
| 26 | Title stored Right | Sets | filter | tile | off | on | off | 1 |
| 27 | Title stored Right | property | none | tile | on | on | on | 1 |
| 28 | Title stored Right | Sets sub-grouped | search | Collection | off | off | off | 1 |

| Case, for each configuration | Surface · Input | Expected | Decision |
| --- | --- | --- | --- |
| each row draws its title and values on their sides in order, barred, with its + last | the configuration at the window's width | every row's left and right groups hold exactly the columns its page holds a value for, or a checkbox's blank, on each column's stored or default side in `property_order`, drawn left to right in that order, Title on the left wherever stored; each value shows what its page holds, a date as the Full Date format writes it; a bar between each two items, none at a group's ends and none inside a value; the title's icon as Title Icons says; the + the line's last child, right after its group and on that group's line, a wrapped one's included; a filter or search leaves only VL rows, and a sort orders each band's rows descending by title | B-1 · B-2 · B-4 · B-9 · B-11 · D-2 · E-9 · F-1 |
| at the view's Scale, wide and narrow, no row or shell overflows, one-line rows match and stand under Table's, titles hold their floor, values their cap, grips their first line | the window's own width, then 620px | every row outside a tile drawn at the configuration's Scale (`currentCSSZoom`); no row or shell scrolls sideways; every one-line row one height, under a plain Table row of Collection A at the same scale; each title at least the smaller of its own width and `--list-view-title-min`; each value at most `--list-view-value-max`; each grip's center on its left group's; a wrapped right group flush to the line's end and one row pitch under the first line, an unwrapped one `--list-view-wrap-gap` off the left group | A-2 · B-12 · C-3 · H-2 · H-3 |
| each long-titled row and the crowded row, a pixel above its wrap or scroll point, holds one line with its title at its floor, and a pixel below it drops its right group to a second line with its title regaining its room up to its own width, or, with Wrap Rows off or no right group, scrolls its left group with its title at its floor; its groups the wrap gap apart above it | the window halved down to the widest at which each row has crossed, then read there and a pixel wider; a row crossed at the window's own width, as the crowded row is in a tile, halved toward a 3000px window instead | above: one line, the title at its floor, a right group `--list-view-wrap-gap` off the left within 1.5px; below, with Wrap Rows on and a right group: that group on a second line and the title past its floor again, or at its own width where that is its floor, as the crowded row's short title is; otherwise the left group scrolling with the title at its floor, since a row with nothing on the right has nothing to wrap (`list-view.css`, `.wraps .list-view-line:has(> .list-view-right)`); every other row's reads hold at both widths | H-1 · H-2 |
| a rail at each band's chevron from its head's outline gap to its last member's, and none on the tail or on an empty band; or no rail with Outlines off | the window's own width and 620px | each band's `::before` rail drawn exactly where it should be, at least one wherever Outlines is on and the view is grouped, in `--list-outline-color` and `--list-outline-width`; its center on its head's chevron; its top `--list-outline-gap` under its head row, its bottom that gap above its last drawn member's, a wrapped last row's included | G-1 · G-2 |
| the sort orders the List's rows band by band as it orders a Table's of the same view | each sort configuration, then its Table twin on the same surface | the two drawn orders equal | A-2 |

##### Pruned

- **A value's press and right-click crossed with its side, a wrapped line, or a surface:** a value is one `SeatedValue` whose click and menu go to the seat (`Core/Views/List/ListView.tsx`, `item`), wherever the row lays it; its crossing is its type, against the same value on a card.
- **A value's press against a Table cell or the panel:** Table's cells mount a value their own way and stay frozen (I-7), and a card mounts the same `SeatedValue`, so the card is the twin each value is held against; the panel's Format case reads the panel.
- **The pane's gestures through the editor door beyond its shape, a crossing, the eye, and Escape:** both doors draw the kind's `Visibility` (`Core/Views/Settings/ViewPane.tsx`, `ViewFrame.tsx`), so a gesture inside it is the pane's own; what differs by door is the container, which the shape and Escape cases read.
- **A switch's drawing crossed with grouping and surface beyond the configurations:** every configuration stores the three switches and reads what they draw; the switch cases cross the write through each door.
- **The rename and the title's press crossed with the title's place or Title Icons beyond icon and text:** the title is the frame's one `PageTitle`, pressed through its own span's `rowOpen` (`ListView.tsx`), wherever it sits.
- **C-5's Date maximum:** the cap is one rule over every value (`.list-view .value-inline`), and no date reaches it.
- **I-5's empty switch list drawing no separator:** `SettingsFrame.test.tsx` · "a list view's Layout is the type grid over its three switches in the footing, with no section between" pins it.
- **B-13's selected row:** nothing in the main pane draws a selected row, since a pressed page replaces the view and a Command-pressed one parks it inert, so a case could only force the class; a List row never takes `selected` and a Table row whose page is the selection does, which `Core/Views/List/ListView.test.tsx` · "carries no selected class when its page is the selection" and `Core/Views/Table/cellGestures.test.tsx` · "a row whose page is the selection carries the selected class" pin.
- **Native Menus off and Hide Empty Groups:** a List opens no list of its own through the menu door, which group 3 crosses with the setting, and empty bands are the pipeline's, which group 6 crosses; the empty-band case reads them with the setting off.

##### Stated Behavior

These hold as written and are asserted as they are: a property grouping takes no sub-group; an empty sub-band followed by the ungrouped tail's row reads as if that row belongs to it, in Table too; a property band's head carries no **+** in Table or List; a row stepped by keyboard past its band's top lands last in the band above, in Table too; the engine steps no row across the pane's columns by keyboard, and the Move rows carry a side; a mouse wheel over a capped value on a crowded row scrolls neither it nor its group, since a cap whose lane overflows leaves the wheel alone (`UIX/Interactions/OverScroll.tsx`, `wheelCap`), where a sideways trackpad scroll moves the group; the crowded row's right group shrinks and scrolls with its left past the floor; Move to Left and Move to Right write the side alone, so the property lands where its stored order puts it; a line under a banner is the banner's own and spans alike over every kind; the room from a band's heading to its first row stays under a Table's. The room before and between the ungrouped tail rows, which no decision names, is measured and printed as `NOTE` lines without a rule.

##### Cases

A row naming both doors, each switch each way, each kind's tile, each side, or each grouping is a template, as each configuration's are: it prints once per door, switch and way, tile, side, or grouping it names.

| Case | Surface · Input | Expected | Decision |
| --- | --- | --- | --- |
| a row holding nothing the view shows draws its title alone, its + after the title | List, VD Done hidden · VL Bare | one item, the title; no right group; the + last, past the title | B-4 · B-7 |
| a row holding left values only draws no right group, its + after its last left value | the same · VL Left | four left items, no right group, the + past the left group | B-7 |
| a row holding right values only draws its title alone on the left and its values flush right, the + after them | the same · VL Right | the title alone; three right values ending at the line's end; the + past them | B-1 · B-6 |
| a row holding both draws its title and Stage on the left and its Date and Link flush right | the same · VL Both | two left items, two right ending at the line's end | B-1 |
| in the emphasized title weight, a long title at a narrow window stops at exactly the view's title minimum of text, and a short one keeps exactly its own width | the same at 620px · VL One's long title and VL Both | the long title's text `--list-view-title-min` wide, the short one's its width in a view showing titles alone | H-2 |
| a List title draws in the emphasized weight a card title draws in, and its values in another | List and standard Cards · VL Both | the title's computed weight `--weight-emphasized` and a card title's; a value's different | B-16 |
| a crowded row past its width with Wrap Rows off keeps one line, its left group scrolling under its fade with its title at its floor, nothing overflowing | the same · VL Crowded | one line; the left group's content wider than its box under a trailing fade, which a fitting row's group doesn't draw; the title the smaller of its width in a view of titles alone and `--list-view-title-min`; the row no wider | H-2 |
| the same crowded row's right group shrinks with its left and scrolls too (stated) | the same | the right group's content wider than its box, under its fade | H-2 |
| a crowded row past its width with Wrap Rows on drops its right group to a second line | the same, Wrap Rows on | the right group under the left; the row no wider | H-2 |
| a row holding a value of every type draws each, on its type's side, showing what its page holds | every column and both stamps shown · VL Full | fifteen values, each on its default side, each showing its value | B-1 · C-1 · D-2 |
| a row holding no value draws no blank of any type but its unchecked checkbox and the two stamps | the same · VL Bare | the title alone on the left; the unchecked checkbox and two stamps on the right | B-4 |
| a checked and an unchecked checkbox each draw in their state | the same | VL Right's and VL Crowded's checked, VL Both's not | B-4 |
| a long Text value stops at the view's value maximum, cut in an ellipsis under its fade, its first line with the pen beside it | the same · VL Crowded's VL Note | its width `--list-view-value-max`; its line cut, `text-overflow: ellipsis` under a mask; the pen drawn | C-3 |
| a long Link value stops at the maximum a Text value shares, cut in an ellipsis under its fade, and a Multi-Select holding more than fits stops at the same cap under its fade, spilling past it nowhere | the same · VL Crowded's VL Site, a long target, and VL Tags with a long fourth tag | each `--list-view-value-max` wide; the Link's cut part in an ellipsis under a mask; the tags' cut under a mask | C-3 |
| hovering a Text value grows nothing and moves no neighbor | the same · hover | every item's box on the row unchanged | C-3 |
| a Number in its bar look draws a bar the view's bar width wide | the same · VL Full's VL Meter | a bar `--list-view-bar-width` wide | C-3 |
| a mouse wheel over a capped value on a crowded row scrolls neither the value nor its group, where a sideways trackpad scroll moves the group and not the value (stated) | the same · the pointer on VL Crowded's VL Note, a vertical wheel turn, then a sideways one | neither scroll moves on the wheel; the group's moves on the sideways turn and the value's doesn't | H-2 · C-3 |
| a mouse wheel over a bar of a crowded row's left group scrolls the group, which stays scrolled while the pointer is inside it, a value now under it included, and returns to its start once the pointer leaves the row, or once a value's pane opened from it closes on a pick with the pointer off the row | List, VD Done hidden · the pointer on the bar after VL Crowded's title, a vertical wheel turn, then the pointer moved off the row; turned again, VD Stage's pane pressed open from the part of its value the group shows, and Doing picked | the group's `scrollLeft` past 0 after the turn settles, with a value's cap now under the pointer; 0 once the pointer has left; past 0 with the pane open, and 0 after the pick with the pointer resting off the row | H-2 |
| a mouse wheel over a capped value on a row whose lane fits scrolls the value | List showing Title and VL Note · VL Crowded's VL Note | the lane fits; the value's `scrollLeft` past 0 | C-3 |
| the same Number in its plain look draws its digits | the view with no look stored | `30%` | C-1 |
| each type's value draws the text its Table cell draws | the same columns in a Table · VL Full | each value's text equals its cell's | C-1 |
| a Link that resolves and one that doesn't each draw as their Table cells draw them, and differently from each other | VL Both's and VL Crowded's VL Site | each value's drawn classes equal its cell's, and the two differ | C-1 |
| a List title's press opens its page, on its text and on its icon, and with Title Icons off | List · press | the page's tab is active each time | B-3 |
| a List title's press in a View Tile opens its page | a List tile · press | the page's tab is active | B-3 |
| a press on a Created value opens nothing | List · press | no pane, field, menu, dialog, or tab, the press landing on the value | B-3 |
| a press on a List row's empty stretch opens nothing, on its one line and on a wrapped row's second | List · press between the groups; at 620px, left of a wrapped right group | nothing opens either time | B-3 |
| a right-click on a List row's empty stretch, on one line and on a wrapped second, pops the page menu a Table title pops | List and Table · right-click, native | the three menus' rows equal, Rename among them | B-3 · A-2 |
| the page menu's Rename from a List row renames its page | List · right-click, Rename, typed | the page takes the name and the row draws it | B-3 · A-2 |
| a List title's rename field draws in the emphasized weight a card title's rename field does | List and standard Cards · right-click, Rename | the field's weight `--weight-emphasized` and the card's | B-16 |
| a press on a List value carried across the rows below sweeps no cells, where a Table cell's sweeps its column | List and Table · VL Left's VL Tags pressed and carried to VL Crowded's, then Escape | no `.cell-sweep` on the List; more than one on the Table | A-4 |
| each type's value on a List row answers a press as the decisions name it, as the same value on a card does: options for a choice or a Context, the calendar for a date, a field for a number or a Text, the toggle for a checkbox, its page for a Link, the file dialog for a File, and nothing for a Created or a Modified | List and standard Cards · press on each of fifteen values' first text | the press landing on the value; the named response per type, and the card's the same | C-1 · B-3 |
| each type's value on a List row pops the right-click menu the same value pops on a card, holding its Style or Format where its type has one, its Clear where it can be emptied, and its Remove | the same · right-click, native | a choice's Style, Clear, Remove; a Context's Clear, Remove; a date's and a stamp's Format; a bar Number's Style; a checkbox's Style, Remove; a Link's Format, Clear, Remove; a Text's Clear, Remove; a plain Number's Remove; a File's Remove from View; the card's rows equal | C-1 · C-2 · C-4 |
| Todo picked from VL Full's VD Stage pane writes it to the page and the row draws it | List · press, Todo | the front matter and the drawn value read Todo | C-1 |
| a Link's Format picked from a List value's right-click writes that view's look alone, the menu checking the pick again, no other view's and not the property's own | List · right-click, Format | the view's `column_styles` takes the look and the reopened menu checks the pick; no other view's does, and the definition's `link_display` stays unset | C-4 |
| a List value's Remove hides its property from the view, every row drawn as the view now stores it | List · right-click, Remove | `hidden_properties` takes VD Due; every row's structure read against the stored view | C-2 |
| a row's + is unseen at rest in a slot it keeps, and shows on hover with nothing on the row moving | List · hover | opacity 0 at rest and 1 on hover; the row's boxes unchanged | B-6 · B-10 |
| a row's + opens the Add list of what the row doesn't draw, and stays shown while the list is open | the same · press, the pointer moved to another row | VL Tags offered and VL Phase not; the + shown and held | B-6 |
| a single Select picked from a List row's Add list writes it and closes the list, as the same pick on a card does | VL Bare's + and its compact card's Add list · VD Stage, Todo | the value written each time, and the list closed after the pick on both, since a single Select takes one pick | B-6 · C-1 |
| a Multi-Select on the left, and on the right, added from a row with no right values takes two picks, shows on the view at the far end of its side and draws there, the list staying open and the + the same element trailing its group | VL Bare · +, VL Tags, One, Three, with VL Tags stored on each side | both picks written with the list open; `property_order` ends in VL Tags; the value the side's last item; the same + element, last and after its group | B-6 · B-7 · C-2 · D-3 |
| a Multi-Select on the left, and on the right, added from a row already holding values on that side draws at the far end of its side | VL Both on the left; VL Right on the right | the value the left group's last item; the right group's last item at the row's edge, the + after it | D-3 |
| a row drawing every property and Context draws no +, where the others keep theirs | every property and Context shown · VL Full | no + on VL Full; one on every other row | B-10 |
| every row's right group ends on one line, a row with no + as one with it | the same | every right group's right edge within a pixel, VL Full's among them | B-10 |
| compact cards draw no bar between their values, where a List row draws one between each two (stated) | compact Cards of every property and Context · the List's bar class | none inside the cards; some on the List | B-2 |
| a List row's hover ghost stands under it at its indent and height, and its press names a newborn placed after it in its Set | List, Sets · hover, press, typed | the ghost's lead and height the row's; the newborn after VL Both in `page_order` | A-2 · B-12 |
| a row's + draws as a Set band's +, the same glyph, size, and color, unseen at rest and shown on its carrier's hover | List, Sets · VL Both's + and VL Rows' head + | equal looks at rest (opacity 0) and on each one's hover (opacity 1) | B-6 · I-3 |
| a List Set band's + names a newborn last in its Set | the same · hover, press | `VL Rows/VL Band.md`, last in `page_order` | A-2 · B-8 |
| a property band's head carries no + on a List, as on a Table (stated) | List and Table by VD Stage | no head holds one, alike | A-2 |
| a List grouped by a property draws its three option bands and no sub-group under them, a sub-grouping saved beside it included (stated) | by VD Stage with a VL Phase sub-group stored | the heads Todo, Doing, Done; no nested band | A-2 |
| a sub-grouped List draws its empty Done bands, and its tail row after one, where a Table does | List and Table, Sets by VD Stage | equal head lists with Done; the tail row's lead equal | A-2 |
| an empty Collection's List stands a ghost row with no hover, whose press names a newborn in the Collection | Collection B · press | the ghost drawn; `Collection B/VL Standing Page.md` | A-2 |
| a List's hover ghost and standing ghost title New Page in the emphasized weight a Cards ghost does | the two List ghosts and a card's hover ghost | each `--weight-emphasized`, the card's the same | B-16 · A-2 |
| a newborn row draws no blank stamp while its values load, each stamp it draws its created or modified date, and then both | List showing Title and the stamps · a page created through the host | every frame's stamps (a newborn's are null until its values load, `Core/Views/viewRow.ts`) its id's or its file's date in the Full Date format, then both | B-4 |
| a List row dragged by its grip above another in its band saves the manual order and draws there | List, Sets · grip drag | `manual_order` and the drawn order put VL Right above VL Left | A-2 |
| a plain List's rows each name the drag gesture | the same | every row described | A-2 |
| a List row lifts by Space, steps by ArrowUp, and drops by Enter, saving the manual order | the same · keyboard | VL Both above VL Left | A-2 |
| a List row stepped by keyboard past its band's top lands last in the band above, Sub-Set B, as a Table row does (stated) | List and Table · Space, ArrowUp, Enter on VL Bare | `Set Beta/Sub-Set B/VL Bare.md`, drawn last in Sub-Set B, each time | A-2 |
| a searching List and one sorted by two keys name no drag gesture on their rows, as a Table's | List · search, then two sort keys | no row described | A-2 |
| a List row dragged into a deeper Set's rows moves its page there and draws it at that Set's indent | the same · Page A onto Alpha 2 | `Sub-Set A/Page A.md`, at Alpha 2's indent | A-2 |
| a Set's own last row dragged across its band end onto a nested band's first row moves into that band at its indent, and a keyboard step up past that band's top returns it | List, Sets · VL One's long title by its grip onto Alpha 1, then Space, ArrowUp, Enter | `Sub-Set A/…` at Alpha 1's indent, then `Set Beta/…` again | A-2 · B-15 |
| a List row dragged across property bands takes the band's value | List by VD Stage · grip drag | VL Both reads Todo | A-2 |
| a List row stepped by keyboard past its band's head takes the band above's value | the same · Space, ArrowUp past Doing's head, Enter | VL Both reads Todo | A-2 |
| at the view's Scale of 1.25, a List row dragged by its grip lands above the row it was dropped on, and a Set band dragged by its head lands above Set Alpha, each saved and drawn there | List, Sets, Scale 1.25 · grip drag, head drag | `manual_order` and `group_order` written and drawn; the rows at zoom 1.25 | A-2 |
| a List row wrapped to two lines, dragged by its grip, lands above the row it was dropped on | List, Wrap Rows on, 620px · VL Two's long title onto Alpha 1 | the row wrapped; `manual_order` puts it first | A-2 |
| a List's Set band dragged by its head above Set Alpha saves the group order and draws there | List, Sets, its own Scale · head drag | `group_order` puts Set Beta first; the heads drawn Set Beta, Set Alpha | A-2 |
| a List row dropped on an open Set's head moves its page into that Set and draws it in that band | List, Sets · Page B's grip onto Set Beta's head | `Set Beta/Page B.md`; the row in Set Beta's band | A-2 |
| a List row held over a collapsed Set's head springs it open, and dropped there moves its page into that Set | List, Set Beta collapsed · held 1.5s over its head | `aria-expanded` true while held; `Set Beta/Page B.md`; the row in its band | A-2 |
| a List row dropped on an empty Set's head moves its page into that Set and draws it in that band | List, Set Beta collapsed, an empty VL Hollow Set made for the case · Page B onto its head | `VL Hollow/Page B.md`; the row in its band | A-2 |
| a List row in a View Tile dragged by its grip lands above the row it was dropped on, saved in the tile | a List tile · grip drag | the tile's `manual_order` in `_tiles.json` puts VL Right above VL Left | A-2 |
| a List row in a View Tile dragged into another Set's rows moves its page there and draws it at that Set's indent, above the row it was dropped on | the same tile, Sets · Alpha 1's grip onto Page B | `Set Alpha/Alpha 1.md`; drawn above Page B at its indent | A-2 |
| the Settings door's Visibility, and the editor door's Layout, opens List's pane: Left and Right side by side, equal and as wide as their widest name, under the cap | both doors | two columns headed Left and Right, equal, each a `--fill-quaternary` list of rows in the menu kit's compact padding (`--row-pad-compact`), every row as wide as the widest name takes unbounded, hidden rows included, and none cut, under 180px; Left as the group reads, Title without an eye; Right reversed; each hidden property ghosted at its column's foot with its eye off | E-1 · E-2 · E-3 · E-4 · E-5 · E-8 |
| Settings' Layout on a List holds no Left and Right columns | Settings door · Layout | no columns | E-1 |
| a pane row dragged within its column reorders the view, and the List draws it | Settings door · pointer drag | one save; the drawn rows match the stored view | E-7 |
| a pane row held over its column draws no drop line, the pane's stated exception | the same, read while held | a row held; no drop line drawn | E-7 |
| a pane row dragged from Left into Right lands between the rows it was dropped between, writing its side and place in one save, and the List draws it there | the same | Right reads VL Site, VD Stage, VL Note, VD Due; one save | E-7 · I-4 |
| the columns keep their widths while a row is carried from one into the other | the same, read while held | both widths as at rest | E-4 |
| a row carried into the Right column grows its zone by the row, so its hidden foot moves down and nothing draws over it | the same, read while held | the zone's `--drag-spill` set; the foot a row lower and below every zone row | E-10 |
| a row carried into Right and taken out again without a drop, or cancelled by Escape, makes room and closes it, the column's last shown row never over its first hidden one, nothing written | the same · a carry out past the pane and released; a carry cancelled by Escape | read each frame: the zone spilling, its last shown row's bottom never under its first hidden row's top; no save; both columns as before | E-10 |
| a pane row dragged from Right into Left takes the left side where it was dropped, in one save | the same | VL Note last on Left | E-7 |
| Title, lifted and carried toward Right, stays in Left and writes nothing | the same, read while held | a row held; Title never in Right; no save | E-8 · E-9 |
| Title dragged below another Left row reorders within Left, so that value draws ahead of the title | the same | `property_order` puts that property ahead of `_title`; one save; a row led by a value | E-8 · B-11 |
| a hidden row at a column's foot lifts no drag and writes nothing | the same | no lift, no save | E-5 · E-7 |
| a property stored off its default side, hidden by its eye, rests ghosted at its own column's foot, and shown again after another row moved returns to its place and side | the same, VL Tags stored Right · eye, a drag, eye | VL Tags at Right's foot; `property_order` equal to its order before the hide but for the moved id; `column_sides` Right; its place among Right's other rows kept | E-5 · E-6 |
| a pane row lifts by Space, steps down by an arrow, and drops by Space, saving the order | the same · keyboard | one save, the row a slot down | E-7 |
| Escape on a lifted pane row through the Settings door cancels it and leaves the pane open | the same · Space, ArrowDown, Escape | no save; the back bar stands | E-7 |
| a keyboard lift steps no row across the pane's columns; the Move rows carry a side (stated) | the same · Space, ArrowRight, Space | the row stays on Left | E-7 |
| a pane row's right-click offers Move to the other side and writes the side alone, the property landing where its stored order puts it (stated); Title's offers none | the same · right-click, native | `column_sides` takes the side, `property_order` unchanged | E-7 |
| a hidden row's Move to Left takes it to the other column's foot | the same | VL Doc at Left's foot | E-5 · E-7 |
| the empty Right column stands as wide as Left, draws the slot of a pane row carried into it one row tall, and takes the row dropped there | Settings door, nothing on the right · read while held | equal widths; the slot as tall as the carried row; Right lists VL Tags | E-4 · E-7 |
| a property name past the cap stands both columns at 180px, cut in an ellipsis that scrolls on hover, and the widths hold while its row is carried out of its column | Settings door, a Text property with a long name assigned for the case · wheel, carry | both columns 180px; the name cut in an ellipsis; its `scrollLeft` past 0 under a wheel; both 180px while held | E-4 |
| a pane row dragged in a scrolled column reorders it | Settings door, every column and ten Text properties assigned for the case shown, the pane scrolled to its foot | the pane scrolled; the row two slots up | E-7 |
| a row held still for over a second over the column's foot, its own slot scrolled out of view, opens its slot under the pointer and keeps it there | the same · a row lifted at the head, the pane scrolled to its foot, held | the column's row tops read each frame for 1.3s: one reading, a row's gap opened under the pointer | E-10 |
| a View Tile low on its board opens its settings upward, and a row carried into Right between two rows opens its slot under the pointer and lands at that slot | a List tile under a filler tile · its settings, Visibility, pointer drag | the pane above its button; the slot opened between Right's first two rows with the pointer in it; the row lands second | E-10 |
| through the editor door, a pane row dragged from Right into Left lands there in one save | editor door · pointer drag | one save, on the left | E-2 · E-7 |
| through the editor door, the eye hides a property to its foot and shows it again | editor door · eye twice | to the foot and back | E-2 · E-5 |
| Escape on a lifted pane row through the editor door cancels it and leaves the editor open | editor door · Space, ArrowUp, Escape | no save; the back bar stands | E-2 · E-7 |
| a Table's Visibility eye rests hidden, shows dimmed on its row's hover and keyboard focus, hides while its row is lifted, a hidden row's eye stands, and Title holds none | Table, VD Due hidden · Settings door, pointer away, hover, keyboard focus, Space | the shown eye's opacity 0, then `--state-ghost` twice, then 0; the hidden eye's 1; no eye on Title | E-11 · E-8 |
| a Group pane option's eye rests hidden, shows dimmed on its row's hover and keyboard focus, and a hidden option's eye stands | the same, grouped by VD Stage, Done hidden · Settings door, Group | Todo's eye 0, then `--state-ghost` twice; Done's 1 | E-11 |
| a List's Sides eye rests hidden, shows dimmed on its row's hover and keyboard focus, hides while its row is lifted, a hidden row's eye stands, and Title holds none | List · Settings door, the same inputs | as the Table's | E-11 · E-8 |
| a Sides row on keyboard focus draws no outline and wears the focus wash, as a Table's Visibility row does | both panes · keyboard focus | `outline-style: none` and the wash's gradient on the row it holds, equal to the Table's | E-4 |
| List's Title Icons, Outlines, and Wrap Rows sit at the view editor's root, before Layout is pressed, and in the footing of Settings' Layout | both doors | three switches each | F-1 · F-2 · I-5 |
| through each door, each switch switched off and on writes its key and the List draws it or stops | both doors × three switches × each way | the key written; the title icons, rails, or a wrapped VL Crowded follow | F-1 · F-2 · G-1 · H-1 |
| Table's Title Icons stays in Layout and off the view editor's root | Table · both doors | in Layout only | F-2 |
| a List draws no line between its rows, its Hide Borders stored off, and its Layout offers no switch for one but Outlines and Wrap Rows, where a Table draws them and offers Hide Borders and neither of List's | List and Table, `hide_borders` stored false · Settings door, Layout | no top or bottom border on a List row or its cells, some on a Table's; Hide Borders among the Table's switches and not the List's; Outlines and Wrap Rows among the List's and not the Table's | B-5 · G-1 · H-1 |
| a band's rail ends its outline gap above its last member when that is a row, an open band ending on a row, the hover ghost, a closed band, or an open band ending on a closed one, through as many open bands as Sets nested five deep hold, wide and with the last row wrapped | List, Sets, Wrap Rows on, VL Depth Three, Four, and Five made each inside the last under VL Deep for the case, a row in each · open wide, open at 620px, VL Depth Five's row hovered, each of the three closed in turn | each ending drawn, and an open band ending on a row, the ghost, and an open band ending on a closed band each reached four bands down; every rail's look and extent as the configurations read them | G-1 · G-2 |
| a property dragged ahead of Title in a Table view draws ahead of the title once the view is a List | Table heading drag, then the List tile | VD Stage first in `property_order`; VL Both's left group a value, then the title | B-11 |
| each door's type tile switches the view between Table, List, and Cards, its order, sides, and hidden set kept, a List's rows drawn by them and shorter than the Table rows they replaced | Settings door List, Table; editor door List, Cards; Settings door List | the type written, its renderer drawn, the three fields unchanged | A-1 · I-4 |
| the Gallery tile on a List writes nothing and leaves it a List | Settings door | no save | A-3 |
| a view saved as a Gallery, which has no renderer, draws as a Table | `type: 'gallery'` saved and shown | a Table drawn, no List or Cards | A-3 |
| a view newly switched to a List draws its rails, Outlines on, and doesn't wrap its crowded row, Wrap Rows off | a Table of Sets · Settings door, the List tile | rails drawn; VL Crowded on one line; the two switches read on and off; neither key stored | G-1 · H-1 |
| with Colored Outlines on, each option band's rail draws in its chip's border at the top level and under a Set, a Set's rail keeps the outline token, and with it off every rail does | List by VD Stage, Sets sub-grouped by VD Stage, and by VD Stage with the switch off | each option band's `::before` background its `--band-color`, which differs from `--list-outline-color`; each Set's and, with the switch off, every rail's the token | G-3 |
| a List draws each property on its side whatever its Table alignment, and a Table aligns VD Stage right by its alignment and VL Count alike whether or not the List stores it Left | List with `column_alignments` and VL Count stored Left; the same as Tables, with and without its sides | every row's structure read on its stored or default side; VD Stage's cell right-aligned; VL Count's cell alike in both Tables | D-1 |
| a List with each grouping reads a Table's room from a band's last row or the tail's to the next heading, between headings, and to its end, and a heading's own room to its first row stays under it (stated) | List and Table, the pointer away, with the VL Depth chain nesting Sets five deep: Sets open and nested, the deepest and the third level closed, every Set closed, a nested band closed, property bands open and closed, Sets sub-grouped, Sets sub-grouped with Set Beta first, Sets with the ungrouped rows on top | content to content, inside each row's and head's padding: every row-to-head, tail-to-head, head-to-head, and row- or tail-to-end room within half a pixel of the Table's; every head-to-row room under it; the rooms before and between the tail rows printed as a `NOTE` | B-15 |
| with the hover ghost up under a band's last row, before a nested band, before a sibling, and five bands deep, the heading below moves by exactly the ghost's height and back, and stands a Table's room below the ghost | List and Table, Sets with the VL Depth chain · hover VL One's long title (before Sub-Set A), Beta 1 (before VL Rows), and VL Depth Five's row (before Sub-Set B), then away | the heading's move the ghost's height, its return 0; the room from the ghost to the heading the Table's | B-15 |
| the line under a bannerless header over a List is inset as over Cards, not bled as over a Table | Set Beta's own view in each kind | List's line equals Cards' and not Table's | B-14 |
| the line under a banner spans alike over a List, Cards, and a Table (stated) | Collection A in each kind | equal | B-14 |
| a hidden Table column shown again after another column was dragged past it returns to its own place | Table · heading Hide, heading drag, Visibility eye | headings Title, VD Done, VD Due, VD Stage | E-6 |
| a hidden Cards property shown again after another was dragged past it in Visibility returns to its own place | Cards · Visibility eye, a drag below VD Due, eye | VD Done shown; `property_order` Title, VD Done, VD Due, VD Stage | E-6 |
| a Link value's right-click offers its view's Format on a card and in a Table cell, and none in the Properties panel | Cards, Table, the panel · right-click, native | Format, Format, none | C-4 |
| a value in the Properties panel pressed and moved 8px lifts nothing, where 20px lifts its row | the panel · pointer drag | no drag source, then one | R P11 |
| a Table Set band's + still names a newborn last in its Set | Table · hover, press | `VL Rows/VL Table Band Page.md`, last in `page_order` | R P11 |
| a Table row's grip sits at its lead cell's center, List's first line unset on it | Table | within a tenth of a pixel of its lead cell's center, the box the grip's rule centers in (`UIX/Table/table.css`, `.row-grip`); `--row-first-line` unset on the row | R P11 |
| a card carried into another Set's band spills that band a row only when its cards fill their last row, and lands in its Set | Cards, Set bands, List's VL pages filtered out · Page C onto Beta 1's band, which leaves room; Beta 1 onto Set Alpha's at a window narrowed until its three cards fill their row | no `--drag-spill` on the first, one on the second; each card in its new Set, the band a kind that doesn't nest gathers | R P11 |
| a nav search's result carried onto the tab bar spills no room there, and opens its tab | a new tab's nav search · pointer drag onto the tab bar | a row held; no `--drag-spill` on the strip or its ancestors while held; Page A's tab opened | R P11 |
| a Trash row's check sits at its lead cell's center, and every List band's chevron at its head's center while rows wrap | the Trash, holding a page the case trashes; a List of Sets, Wrap Rows on, at 620px | the check within half a pixel; each chevron within 0.75px; a row wrapped | H-3 |

**Counts:** 119 configuration cases (28 configurations × 4, and the 7 sort configurations each against its Table twin) and 152 others, 271 in all, 266 owned by `--landed 11` and 5 regressions, beside 10 `NOTE` lines.
