## Views Drive — Matrix

The drive's cases, derived from the *Views Cleanup — Implementation Plan*'s *§Behavior Changes* and written against each phase's AFTER, its patch in `Planning/Views Cleanup/Scouts/Planning/Phases/`. Groups 2 to 10 follow the plan phase of their number. A group holds every behavior change its phase lands, crossed with each surface, input, and setting that reaches it, beside the interactions its refactor rewired on those surfaces, so a regression shows. Each case names its decision: `BC<n> <id>` is the numbered behavior change and its decision, owned by the group's phase, so it reads `AWAIT` at a head before that phase and must hold from it on; `R P<n>` is a regression crossing of phase `n`'s rewiring, owned by phase 0, so it holds at every head, the baseline included. `F<n> <tag>` is a behavior phase `n`'s checkpoint fold lands, owned by phase `n` like a behavior change. Every case prints as `g<group> [P<owner> <decision>] <name>`, so a run reads against the tables below line for line. Groups 2 to 6 are built; groups 7 to 10 are built at their own checkpoints from the rows below.

#### Dimensions

| Dimension | Values | Crossed Where |
| --- | --- | --- |
| **Surfaces** | The Table; Cards; Set bands; property bands; sub-grouped bands; the Trash and Archive table; the sidebar; View Tiles; the toolbar's view button and the views dropdown; the settings panes through both doors (the toolbar's Settings and the dropdown's per-view editor) | Each behavior change on every surface that draws it; each regression on the surfaces its phase rewired |
| **Inputs** | Mouse press; double-click; keyboard (Tab, Enter, Escape, the context-menu key); pointer drag; right-click popping a native menu | A gesture the phase rewired, by every input that reaches it; the context-menu key as a `contextmenu` event raised with no press, which is what the key delivers |
| **Settings** | Native Menus; Hide Disclosure Chevrons; Hide Empty Groups | Native Menus on and off for every list the menu door pops (groups 3 and 9); Hide Disclosure Chevrons in group 7; Hide Empty Groups in group 6 |
| **States** | A locked row or tile; an active search; a custom Set order; a manual page order present or absent; a write held in flight | A locked tile in groups 8 and 10; a search in groups 7 and 10; the custom Set order in groups 6 and 7; the manual order in groups 2, 4, and 6; a held write in groups 2, 3, 5, and 6 |

**A held write:** the drive wraps the host's `mutate` and `views:save` handlers in the main process, so a case can hold one call's reply or refuse it, and restores them at the end. It widens a round trip of a few milliseconds to seconds, which is what BC1, BC2, BC12, BC13, and F6 nest read inside.

**Drift:** selectors that changed between closed phases sit in one table, `DRIFT`, keyed by `--landed`: `.table-view` reads `.table-shell` from Phase 4 (Task 4-3); the Trash's `.trash-head-name` and `.trash-head-date` read `.col-header` cells from Phase 4 (Task 4-1); the dropdown's placeholder is found by `More` before Phase 3 and `More actions` from it (Task 3-3); the page-icon switch is found by `Page Icons` (Table) or `Hide Icons` (Cards) before Phase 3 and `Title Icons` from it. A selector difference is drift; a behavior difference is the case itself, so BC3 and BC6 assert the new label while their regression crossings find the control by the drifted one.

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
- **The Grouping pane's Set list under the F6 nest:** it keeps the unranked gap until Phase 7, so its crossing is group 7's.
- **Undo of a column drag and resize:** neither was undoable before or after; no decision names it.

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
| the Trash's / Archive's folder chevron opens and closes the folder on a double-click, as the sidebar's does | Trash and Archive · chevron double-click | the folder opens on the first click and closes on the second | BC17 7.1 |
| a nested bundle row's trail caps against its indented cell | Trash · nested row | the trail's right edge sits inside the indented title cell | BC17 7.1 |
| Tab from the band list passes no band chevron or New Page button | Table and Cards bands · Tab | the next focus is outside the band list | BC18 C-3 |
| Enter on a focused band head folds and unfolds it | Table and Cards band heads · Enter | `aria-expanded` flips and `collapsed_groups` follows | BC18 C-3 |
| the menu key on a focused band head opens its menu | band head · `contextmenu` with no press | the native band menu with New Page | BC18 C-3 |
| the band head carries aria-expanded; its chevron carries no label | band head | `aria-expanded` on the head, no `Collapse group` label | BC18 C-3 |
| the Table band's chevron shows no pointer cursor | Table band chevron | computed `cursor` isn't `pointer` | BC18 C-3 |
| the ghost row draws the data rows' lead cell, gutter included | Table ghost row | its lead cell holds the gutter and the same left padding as a data row at its depth | BC19 7.5 |
| Hide Disclosure Chevrons' caption names the sidebar and the Grouping pane | Settings · Interface | the caption names both | BC20 C-4 |
| with Hide Disclosure Chevrons on, a sidebar row keeps its 8px gap where the chevron sat | sidebar · setting on | the icon sits about 2px right of the old place; the hover fill reaches 6px further left | BC20 C-4 |
| with Hide Disclosure Chevrons on, the Grouping pane's folder list hides its chevrons and the Location tree keeps them | Group and Filter panes · setting on | no `[data-chevron]` drawn in the Grouping list; drawn in the Location tree | BC20 C-4 |
| the Location tree lists folders in the view's custom Set order with the Grouping tree's leaf spacing | Filter · Location value, `group_order` set | Sub-Set B listed before Sub-Set A; a leaf's lead equals the Grouping list's | BC21 C-5 |
| a band's chevron press folds and persists it, Table and Cards | bands · chevron press | as group 6 (the chevron now `[data-chevron]`) | R P7 |
| a search opens every band, a folded one included, and its chevron changes nothing | Table and Cards · search | every band drawn open; `collapsed_groups` unchanged | R P7 |
| the Grouping pane's folder list and the Filter's Location tree expand and collapse | both panes · chevron press | children show and hide | R P7 |
| the sidebar's chevron expands a Collection | sidebar · chevron press | its Sets draw | R P7 |
| rows nest by one 14px step in the Table, the Bundle table, and the sidebar | each, nested rows | each depth's lead steps by the `--disclosure-indent` token | R P7 |
| bands, the Bundle table, and the Location tree keep their chevrons under Hide Disclosure Chevrons | each · setting on | `[data-chevron]` drawn | R P7 |

#### Group 8 — View Tiles

| Case | Surface · Input | Expected | Decision |
| --- | --- | --- | --- |
| a tile dropdown row's rename field doesn't auto-size, matching the toolbar dropdown's | tile dropdown row · Rename | the field's width equals the toolbar row field's rule | BC22 8.1 |
| a new pill's entering class stays until the tile's list next changes | tile pills · New View | the class holds across a remount until the next list change | BC22 8.2 |
| a locked tile's view pill opens no rename on double-click | locked tile · pill double-click | no field opens | BC23 3.2 |
| a tile's duplicate names its copy from the stored entry's names | tile dropdown row · Duplicate, a stored name the strip doesn't draw | the copy's name skips the stored sibling's | BC23 3.2 |
| a tile's pills switch its view | tile pill · press | the tile draws that view | R P8 |
| the tile's and the toolbar's row menus offer the same rows and run Rename, Icon, Color, Duplicate, and Delete | both dropdowns · right-click | identical native rows; each runs on its own store | R P8 |
| duplicating in a tile switches to the copy; in the toolbar dropdown it doesn't | both · Duplicate | F-4 as before | R P8 |
| the last view can't be deleted from either list | both · Delete with one view | Delete disabled | R P8 |
| a tile's reveal anchors to the Table's heading and to Cards' first row | Table and Cards tiles · hover | the strip reveals over the declared lead | R P8 |
| a tile's view draws at its embed zoom and padding | Table and Cards tiles | the zoom and side padding match the tile's | R P8 |
| a tile naming a missing Set draws Set not found | tile on a removed Set | the placeholder | R P8 |

#### Group 9 — MenuBase

Phase 9 lands no numbered behavior change; it re-files the shell every menu pane mounts in, so its cases are regression crossings of every pane through every door, each opened, placed inside the window, dismissed, and, where it resizes, resized.

| Case | Surface · Input | Expected | Decision |
| --- | --- | --- | --- |
| the toolbar's Settings pane and the views dropdown open, slide between panes, and close on Escape | both doors | each opens in place, its back bar slides, Escape closes | R P9 |
| a Select cell's value picker opens under its cell, picks, and dismisses on an outside press | Table cell | placed below the cell inside the window | R P9 |
| the Group By, Sort By, and Filter lists open as in-app panes with Native Menus off and as system menus with it on | Group, Sort, Filter | in-app pane, then native rows | R P9 |
| the Filter's Location tree pane opens with its tree | Filter · Location value | the tree pane draws | R P9 |
| the calendar picker rings today | a Date cell | today's pill wears the today ring | R P9 |
| the icon picker opens, searches, and picks | editor · Edit Icon | the icon lands | R P9 |
| the Properties editor's option list draws and edits | Settings · Properties | rows, edit buttons, and the ghost option chip draw | R P9 |
| a resizable pane resizes by its edge | a TextPane or glance pane | its height follows the drag | R P9 |
| a tile's settings pane sits as the toolbar's does | View Tile · View settings | its gutter equals the toolbar pane's | R P9 |

#### Group 10 — One Lock per Row

| Case | Surface · Input | Expected | Decision |
| --- | --- | --- | --- |
| the Trash's and Archive's rows name no drag gesture | Trash and Archive rows | no `aria-describedby` | BC24 I-059 |
| a navigation list's rows without a reorder name no drag gesture | sidebar Recents | no `aria-describedby` | BC24 I-059 |
| a pane's hideable rows without a save name no drag gesture | a read-only option list | no `aria-describedby` | BC24 I-059 |
| the views list's one row names no drag gesture; with two views both do | views dropdown | the description follows the count | BC24 I-059 |
| a searching Table's rows and band heads name no drag gesture and refuse a Space lift | Table · search, Space | no description; Space runs the row's own action | BC24 I-059 |
| a Date band head names no drag gesture | Table grouped by a Date | no description | BC24 I-059 |
| a searching Cards view's band list keeps its Tab stop | Cards · search, Tab | the band list takes focus | BC24 I-059 |
| a displace item in a disabled zone names no drag gesture | a locked tile's pills | no description | BC24 I-059 |
| a movable row still lifts by Space and drops by Enter | Table row · keyboard | the row moves and `manual_order` saves | R P10 |
| a movable row still drags by pointer | Table row · grip drag | as group 4 | R P10 |
| an immovable row still carries out to another zone by pointer where the engine allows it | Trash row onto the sidebar | as before | R P10 |
