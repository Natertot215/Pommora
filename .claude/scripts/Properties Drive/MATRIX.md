## Properties Drive — Matrix

The drive's cases, derived from *Properties Restructure — Decisions & Intention* and written to the end-state contract of the Properties Restructure plan's AFTER blocks. Groups 16, 18, and 19 derive from *Metadata Picker — Decisions & Intention* instead, and print its letters with an `MP-` prefix so they're never read as the Restructure's. Each group lands with the plan phase that adds it and drives the channels and surfaces the interface uses. Every check prints as `[g<group> <decisions>] <name>`, so a run reads against the tables below line for line. Each group seeds what it needs in `~/Test` and puts it back; the harness restores `~/Test` when the run ends.

#### Group 1 — What Counts as a Property

| Case | Seeds | Operation | Expected | Decisions |
| --- | --- | --- | --- | --- |
| The header | the `Drive Filedata` table view showing `_title`, `_created_at`, `_modified_at`, its column icons on | open Collection A | `.table-head` reads Title, Creation Time, and Last Modified with `text-align-justify`, `clock-plus`, and `repeat` | F-2, F-3 |
| The sort targets | as above | view settings › Sort › Sort By | the picker offers the three with the same labels and glyphs | F-2, F-3 |
| The filter targets | as above | view settings › Filter › Filter property | the picker offers the three with the same labels and glyphs | F-2, F-3 |
| A hand-written Context definition | `prop_drive_witness` (Text) and `prop_drive_context` (`type: 'context'`) written into `.nexus/properties.json` from outside | the registry's file event | the witness reaches `tree.config.registry`; the Context definition doesn't | F-1 |
| The Properties pane | as above | view settings › Properties › All Properties | the pane holds `Drive Witness` and never `Drive Context` | F-1 |

#### Group 2 — Type Records and Looks

| Case | Seeds | Operation | Expected | Decisions |
| --- | --- | --- | --- | --- |
| A Number column's look | `Looks Number` (Number, Percent format) in Collection A's `Looks Table` view | right-click its header | the native menu holds Style and no Format | I-4 |
| A Link column's look | `Looks Link` (Link) in the same view | right-click its header | the native menu holds Format and no Style | I-4 |
| A compact Select chip | `Looks Select` (Select, option Alpha) shown compact, and the page `Looks One` holding Alpha | open Collection A | the row's chip draws `svg.lucide-tag` | M-1 |

#### Group 3 — The Value Write's One Home

| Case | Seeds | Operation | Expected | Decisions |
| --- | --- | --- | --- | --- |
| A several-word Select | `Status` (Select: Option 1, Option 2) and `Notes` (Text) added to Collection A; `Tidy` written by hand with `Status: [Option 1, Option 2]` | set Tidy's Notes to `edited` | the file's `Status` reads `[Option 2]` | P-1 |
| Spaces-only Text | `Spaces` written with `Notes: "   "`, `Filled` with `Notes: x` | the `Drive Values` view filters Notes Is Empty | `Spaces` draws and `Filled` doesn't | J-1 |
| A re-pick on a Space | Area One | set its Notes to `held` twice, a second apart | `_space.json`'s text and modified time are unchanged | J-9 |

#### Group 4 — One Home per Definition

| Case | Seeds | Operation | Expected | Decisions |
| --- | --- | --- | --- | --- |
| A damaged property list | `prop_drive_damage` (Checkbox) assigned in Collection A's sidecar, and `.nexus/properties.json` written as `{ not json` with the app closed | relaunch | `nexus:state` answers with an empty registry and an `unreadable` entry for `.nexus/properties.json` of kind `registry` | O-6 |
| Every Space still reads | as above | relaunch | the Spaces' paths in the tree match those before the damage | O-6 |
| Collection A's assigned ids | as above | relaunch | Collection A's `propertyIds` still hold `prop_drive_damage` | R4 |
| The fixed file | `.nexus/properties.json` rewritten by hand to hold `prop_drive_damage` | the registry's file event | the registry holds the definition and the `unreadable` entry clears, with no reopen | O-6 |
| The group leaves things as it found them | everything above | the sidecar and the registry written back (the registry removed if the group created it) | the registry's ids match the group's start and Collection A's sidecar reads as it did | — |

#### Group 5 — Undo From the File

| Case | Seeds | Operation | Expected | Decisions |
| --- | --- | --- | --- | --- |
| A pick on a bare key, undone | `Drive Undo Pick` (Select: Doing, Done) and `Drive Undo Link` (Link) in the `Drive Undo Table` view of Collection A; `Drive Undo Page` written by hand with a bare `Drive Undo Pick:` line | pick Doing in the cell's value picker, then ⌘Z | the pick writes `["Doing"]`; the undo leaves no `Drive Undo Pick` line in the frontmatter | E-2, P-5 |
| A Link value, undone | `Drive Undo Target` holding the alias `kept` | type `[[Drive Undo Target|launch]]` into `Drive Undo Page`'s Link cell and press Enter, then ⌘Z | the target gains `launch`; the undo leaves its aliases `["kept"]` and the page no `Drive Undo Link` key | E-3 |

#### Group 6 — One Door for Property Changes

| Case | Seeds | Operation | Expected | Decisions |
| --- | --- | --- | --- | --- |
| An option's menu reads Delete, and a delete nothing holds asks without a strip clause | `Drive Choice` (Select: Alpha, Beta) added to Collection A | view settings › Properties › Drive Choice, right-click Alpha › Delete, then Delete | the menu holds Delete and no Remove; the dialog asks `Delete “Alpha”?` with `The option is deleted from the property.`; the registry lists Beta alone | O-1 |
| An option a page holds asks with its count | `Drive Held` in Set Alpha holding Beta | right-click Beta › Delete, then Delete | the dialog says `…and its value stripped from 1 Item.`; `Drive Held.md` no longer holds `Drive Choice` | O-1 |
| Deleting a property nothing holds asks without "0 Items" | `Drive Bare` (Text) | its editor's Property Menu › Delete, then Delete | the dialog asks `Delete “Drive Bare” everywhere?` with no count; the pane returns to its list, the notice starts `Deleted “Drive Bare”`, and the Trash holds one property row | O-2 |
| The pane's + says the numbered name it took | `New Text` (Text) | view settings › Properties › New Property › Text | the notice reads `Created “New Text (2)”` and the editor opens on `New Text (2)` | O-4 |
| A property restored after its name was taken says the name it took | `Drive Bare` (Text) added again | Settings › Trash, right-click `Drive Bare` › Restore | the notice reads `Restored “Drive Bare” as “Drive Bare (2)”`; the registry holds both | O-4 |
| The group leaves things as it found them | everything above | delete each property and `Drive Held`, empty the bundles made | Collection A's `properties`, the registry's `order`, and the Trash's count match the group's start | — |

#### Group 7 — Option Identity

| Case | Seeds | Operation | Expected | Decisions |
| --- | --- | --- | --- | --- |
| A created Select's option ids | `P8 Stage` (Select) created, then an option `Done` added under a minted id | `addProperty`, then `editOption` add | the seeded option's id matches `opt_` and a ULID; `Done` lands under the id the window sent | D-1 |
| The view names options by id | pages `P8 One` (Done) and `P8 Two` (the seeded option); the `P8 Stages` table view with a sort order, a manual group order, a collapsed band, and an Is filter naming both options | `views:save` | the view's sort, group, filter, and collapsed bands name options by `opt_` id and never by word; the collapse reads `<propertyId>/<doneId>` | D-1 |
| An option rename rewrites the pages | as above | `renameOption` Done to Finished | `P8 One`'s frontmatter reads `Finished` | D-1 |
| The renamed option keeps its id | as above | as above | the registry holds the option under its id with the label `Finished` | D-1 |
| The view is untouched by the rename | as above | as above | the view's sort order, group order, collapse, and filter read as they did, across a 2-second window | D-1 |
| The table's band | `P8 Stages` as the active view | open Collection A | the first band reads `Finished` and is collapsed; the second reads `Option 1` and isn't, in the view's saved order | D-2 |

#### Group 8 — One Finder

| Case | Seeds | Operation | Expected | Decisions |
| --- | --- | --- | --- | --- |
| A Context rename's sidecars | the Context `Drive Finder` holding Spaces `Alpha` and `Beta`, `Alpha` linked to `Beta` | `renameContext` to `Drive Found` | both sidecars inside the renamed Context carry `<Drive Found>` (`Alpha` holding Beta, `Beta` holding Alpha) and neither the old key | G-1 |
| The link survives | as above | as above | `nexus:state`'s tree gives `Alpha` the Context's value `[Beta]` | G-1 |

#### Group 9 — One Note per Item

| Case | Seeds | Operation | Expected | Decisions |
| --- | --- | --- | --- | --- |
| A rename that misses a page offers Try Again | `Drive Priority`, `Drive Stage`, and `Drive Spare` (Text) added to Collection A; `Drive Held` holding all three and `Drive Locked` holding the first two, in Set Alpha; `Drive Locked.md` set to mode `000` | rename `Drive Priority` to `Drive Urgency` from its editor's title field, then Rewrite | the notice reads `Couldn’t update 1 Item.` with Try Again | B-4 |
| The entry keeps the old key | as above | as above | `.nexus/.owed.json` holds the property's `rename: ['Drive Priority']` | B-1 |
| A second property renames past the first's owed work | as above | rename `Drive Stage` to `Drive Phase` | `Drive Held` reads `Drive Phase: kept` | B-1 |
| A rename onto a name still owed is refused | as above | rename `Drive Spare` to `Drive Priority` | the notice reads `An earlier change hasn’t reached every file yet.` with Try Again, and `Drive Held` still reads `Drive Spare` | B-4 |
| The owed name's finish frees it | `Drive Locked.md` back to `644` | rename `Drive Spare` to `Drive Priority` again | `Drive Locked` reads `Drive Urgency` and `Drive Phase` and holds neither old key | H-17 |
| The notes file owes nothing | as above | as above | `.nexus/.owed.json` holds no entry | H-17 |
| The rename onto the owed name lands | as above | as above | `Drive Held` reads `Drive Priority: spare` | B-4 |

#### Group 10 — The Stash and the Trash Records

| Case | Seeds | Operation | Expected | Decisions |
| --- | --- | --- | --- | --- |
| Remove's stamp | `Drive Kept` (Text) on Collection A; `Drive Stays` and `Drive Trashed` holding values | `unassignProperty` | Collection A's `property_stash` holds both values and a `removed_at` from the Remove's moment | C-3 |
| The refill | `Drive Trashed` deleted to the Trash | `assignProperty` | `Drive Stays` holds its value; the Trash copy holds `Drive Trashed`'s; the stash block is gone | C-2 |
| The restore | as above | `restore` of `Drive Trashed`'s bundle | the restored page holds its value | C-2 |
| The open's cleanup | `historyDays: 7`; Collection B holds a block stamped eight days ago and one stamped today, written with the app closed | relaunch | the aged block is gone; today's stays | C-3 |
| The timeframe's cleanup | today's block backdated eight days by hand | `personalization:set` `historyDays` 7 | Collection B holds no `property_stash` | C-3 |
| The partial mark | a property record with `partial: true`, written by hand | Settings › Trash | `bundles:list` reports it partial; its row alone holds the mark spoken `Recorded Partly` | N-1 |
| The partial restore | as above | `restore` | the reply's warning names `Drive Partial` as recorded partly | N-1 |
| The group leaves things as it found them | everything above | delete and empty both properties and both pages; the settings written back | Collections A and B, the settings, and the Trash's count match the group's start | — |

#### Group 11 — Columns Carry Their Answer

| Case | Seeds | Operation | Expected | Decisions |
| --- | --- | --- | --- | --- |
| A new view | Drive Text, Drive Link, and Drive Select written to the registry; Drive Text and Drive Link assigned to Collection A | Views › New View, then show it | the saved view holds `hidden_properties: []` and `property_order: ['_title']`; the head reads Title alone | 07-08 |
| A later property | as above | assign Drive Select to Collection A | the new view's head still reads Title alone | — |
| Revealing | as above | view settings › Visibility › Show Drive Text | the head reads Title and Drive Text | 07-08 |
| The columns | a Drive Columns table view of the four columns; the Drive Columns page holding a text, a link, and Alpha | open Collection A | the row's cells read `Drive words`, the address's Full Link text, and `Alpha`, each from its distinct leaf texts | 07-01, 06-08 |
| A Select edit | as above | click the Select cell, pick Beta | the page's front matter holds `Drive Select` as the one-item list `[Beta]` | 07-01 |

#### Group 12 — The Per-Kind View Record

| Case | Seeds | Operation | Expected | Decisions |
| --- | --- | --- | --- | --- |
| An unreadable Number value | `Kinds Score` (Number), `Kinds Done` (Checkbox), `Kinds Stage` (Select: Alpha, Beta) written into `.nexus/properties.json` and assigned to Collection A; `Kinds A` (5, checked, Alpha), `Kinds B` (9, Beta), `Kinds C` (nothing) | the `Drive Kinds` view filters Any of `Kinds Score is "abc"` and `Title is "Kinds A"` | only `Kinds A` draws | K-1 |
| Checkbox "is not empty" | as above | the view filters All of `Title starts with "Kinds "` and `Kinds Done is not empty` | only `Kinds A` draws | K-1 |
| An empty Select in both directions | as above | the view sorts by `Kinds Stage` ascending, then descending | `Kinds A`, `Kinds B`, `Kinds C`, then `Kinds B`, `Kinds A`, `Kinds C` | K-2 |

#### Group 13 — The Filter's Clock

| Case | Seeds | Operation | Expected | Decisions |
| --- | --- | --- | --- | --- |
| The filter's clock | `Drive Due` (Date & Time) with a 24-hour column style, the `Drive Clock` view filtering it on `2026-10-22T15:30`, `~/Test` on its 12-hour clock | view settings › Filter › the date field | the picker shows `15:30` with no AM or PM, and no End Date | J-1 |

#### Group 14 — One Value Seat

| Case | Seeds | Operation | Expected | Decisions |
| --- | --- | --- | --- | --- |
| An option's click | `Seat Stage` (Select) holding `Seat Open` on `Seat One` | click the value in the Seat Table, on its card in Seat Cards, and in the page's Properties panel | the same option list on every surface | X6 |
| An option's right-click | as above | right-click the value on each surface | Clear everywhere; Remove on the card and the panel, not the table; Style in both views, never the panel | X6 |
| A Text click | `Seat Notes` (Text) holding `words` | click the value on each surface | the inline editor opens | X6 |
| A Link row's label | `Seat Site` (Link) holding `https://example.com` | right-click the row's label in the panel | Edit Title, Edit Link, Clear, Remove | J-3 |
| A File chip's menu | `Seat Doc` (File) holding `[[Drive.pdf]]` | right-click the value's chip in the panel | Add File, Replace File, Remove File, Remove; no Clear | J-10, LC-15 |
| The File's Remove | as above | choose Remove | the page file drops `Seat Doc` and the row leaves the panel | J-10, LC-15 |
| The panel's picker and its row | `Seat Stage` on `Seat One`, its row not revealed | open its picker, then clear the value from outside | the picker closes with the row | — |
| A card's picker per value | `Seat Stage` on `Seat One` and `Seat Two` | open Seat One's option picker on its card, then press Seat Two's twice while it leaves, its dismissal taking the first press | a fresh picker element mounts | LC-54 |
| A Link from a card's Add list | `Seat Site` hidden in Seat Cards | click Seat Two's card off any value, choose Seat Site | the field opens empty | — |
| The sidebar's Properties menu | `Seat Due` (Date & Time) holding `2026-10-22` | right-click Seat One in the sidebar, choose Properties › Seat Due | the calendar opens | X6 |

#### Group 15 — The Properties Pane

| Case | Seeds | Operation | Expected | Decisions |
| --- | --- | --- | --- | --- |
| Create then edit | none; each property is created through the pane | New Property, then Number, Date, Link, Checkbox, and File in turn | each editor opens with no animation frame showing the list between the pick and the editor | O-5 |
| The Number rhythm | the new Number | the editor as created, then Fraction on | 8px between every shown row (3 gaps), then 4 gaps of 8px with Value revealed; screenshots `g15-number-collapsed`, `g15-number-revealed` | L-1 |
| The denominator | as above, Fraction on | type `4` in Value, Enter; then `0` | the definition holds 4 after both; Style then reveals, 5 gaps of 8px; screenshot `g15-number-style` | L-3, L-1 |
| The Date rhythm | the new Date & Time | Date Format Full Date, then MM/DD/YYYY | 8px through Date, Day, and Time; with Day collapsed, Date to Time is 8px; screenshots `g15-date-revealed`, `g15-date-collapsed` | L-1 |
| Link and Checkbox | the new Link and Checkbox | open each editor | 8px between rows; screenshots `g15-link`, `g15-checkbox`, `g15-file` | L-1 |
| Delete from ⋮ | the new File, its editor open | ⋮ › Delete, confirm | the definition is gone and the list is the live slot | O-5 |
| Removed from outside | the new Number, its editor open | `mutate` `unassignProperty` from outside the pane | the list is the live slot, and no "Property not found." shows | O-5 |

#### Group 16 — The Add List

The surfaces are a Standard card, a Compact card, the page dropdown, the SidePane, and the Space dropdown, and every row below runs on each that lists it; a Compact card draws its Checkbox, so it doesn't list one. A card slides an entry's picker in under a back bar, while a panel shows the entry's row and opens that row's own picker on it; once a panel's row shows, a later open of it presses the row.

| Case | Seeds | Operation | Expected | Decisions |
| --- | --- | --- | --- | --- |
| A Table's empty cell | `Add Select`, `Add Multi`, `Add Status`, `Add Due`, `Add Start`, `Add Check`, `Add File`, `Add Number`, `Add Text`, `Add Link`, and the option-less `Add Bare` on Collection A; the Context `Add Empty` with no Spaces; `Add Blank`, and `Add Held` holding `Add Select` and `Add Text`; the views `Add Standard` (cards hiding every property), `Add Compact`, and `Add Table` | click `Add Blank`'s empty Select cell in `Add Table` | its own option list opens, with no "›" row and no back bar | MP-B-1 |
| Stamps in Visibility | as above | view settings › Visibility | Creation Time and Last Modified are listed | MP-C-6 |
| A settings pane's bar | as above | as above | the bar's label ends flush with the bar and the controls beneath it, with no margin | MP-C-3 |
| The panel leaves out what's held | as above | `Add Held`'s page dropdown › Add Property | `Add Select` and `Add Text` aren't listed | MP-C-5 |
| The "›" | as above | open each surface's Add list | on a card, "›" on exactly the Contexts, Select, Multi-Select, Status, both Dates, and `Add Bare` (at HEAD on every fillable row), and on no panel row; a Compact card lists every blank but the Checkbox; Creation Time and Last Modified are absent (at HEAD both listed); screenshot `g16-add-list` | MP-C-1, MP-B-5, MP-C-5, MP-C-6 |
| The ceiling | as above | the Standard card's 15-row list | it caps at 240px and scrolls (at HEAD it stood 365px); the slid calendar never scrolls | MP-C-4 |
| The back bar | as above | slide into Select, Multi-Select, Status, Areas, and Add Due on each card | every bar has one height, padding, and glyph size, matching a settings pane's bar (at HEAD 14px, no padding, a 12px glyph); its label sits 8px in from the pane's right edge, as far as the chevron draws from its left; a Context's reads "Spaces"; screenshots `g16-slid-select`, `g16-slid-calendar` | MP-C-3, MP-C-4, MP-B-4 |
| The panel's row | as above | choose Select, Multi-Select, Status, Areas, and Add Due in each panel | each shows its row and opens the row's own picker hanging from it, with no back bar; screenshot `g16-panel-spaces-row` | MP-B-1 |
| Select | as above | open it, then Back on a card; open it, then Escape; open it, then press outside; open it and pick Red | New Option shows; a card's Back returns to the list, and Escape and the outside press close everything, none writing; the pick writes and closes everything, and a panel shows its row | MP-C-1, MP-C-2 |
| Multi-Select | as above | open it, pick One, then Two | the pane stays across both picks, outliving its entry leaving the list, and both write | MP-C-1 |
| Status | as above | open it, pick Open | Open and Closed sit behind one divider with no New Option; the pick writes and closes everything | MP-C-1 |
| Context | as above | open Areas, pick its first Space | pick-only rows with no New Option; the pane stays and the pick writes | MP-C-1 |
| Nothing to pick | as above | open `Add Bare`, then `Add Empty` | New Option alone, then an empty pane, under the back bar on a card and on its row in a panel | MP-C-1 |
| Date | as above | pick a day and leave by Back on a card, by Escape, and by an outside press; pick two days, then open `Add Start`, on a card by pressing Back and sliding straight into it in the same list before the calendar's exit ends | the pane stays after each day and each pick writes once; two days keep the last; `Add Start` opens with no day selected | MP-C-1, MP-C-2 |
| Checkbox | as above, but a Compact card | press `Add Check`, then the drawn box | it checks with nothing left open; unchecking keeps it drawn | MP-C-1 |
| File | a path handed to the dialog stub for the Standard card's second press | press `Add File` with the dialog cancelled, then with the path | the dialog opens and the list closes; the cancel writes nothing and leaves no panel row; the path adopts a chip on the card | MP-C-2, MP-C-1 |
| Typed values | as above | press `Add Number`, `Add Text`, and `Add Link`, and type | a card pops a small empty window, TextPane, and an empty field, and a panel focuses the row's own field; each value lands; screenshot `g16-panel-typed-row` | MP-C-2 |
| The `+` held | as above | open a panel's Add list, the pointer moved away | the `+` stays shown | MP-B-1 |
| The standing row | Area One, holding nothing | press its standing Add Property row | the list hangs from the row; screenshot `g16-panel-row-anchored` | MP-B-1 |
| A held hidden value | `Add Held` on the Standard card | open its Add list, press `Add Text` | the two held rows list last with no "›"; the press shows `Add Text` in the saved view and closes the list | MP-C-5, MP-C-7 |

#### Group 18 — Placement

| Case | Seeds | Operation | Expected | Decisions |
| --- | --- | --- | --- | --- |
| A low window | `Place Due` (Date & Time), `Place Tall` (Select, 40 options with long labels), `Place Notes` (Text), and four `Place Filler` Text properties on Collection A; `Place One` holding `2026-10-22T09:30` and `words`, the views showing the pages titled `Place `; a homepage View Tile of `Place Table` between two filler tiles | `Emulation.setDeviceMetricsOverride` to 600 CSS pixels | `innerHeight` reads back 600 | MP-E-1 |
| Visibility flips | as above, the window sized so the settings' root fits below its trigger and Visibility doesn't, while the room above holds Visibility | open the tile's settings, then Visibility, with an rAF sampler on the pane | the root opens below and Visibility ends above its trigger; every frame stays inside the window, its largest per-frame step under 60px and printed in the case's name; screenshot `g18-visibility-flipped` | MP-E-1 |
| Back from the flip | as above | Back | the pane stays above its trigger and the edge it hangs from never moves; screenshot `g18-visibility-back` | MP-E-1 |
| A tall list | a 400-pixel window, the tile scrolled so `Place Tall`'s cell sits 200 pixels down | open the cell's option list, sampled | the list opens above from its first frame and never moves; neither side holds it, so it's fenced at the top margin, over its cell; screenshot `g18-fence-top` | MP-E-1 |
| End Date at the edge | the window sized so `Place Due`'s calendar fits below its cell and the calendar with End Date on doesn't | open the calendar, then turn End Date on | the calendar keeps its side and rises inside the window; screenshot `g18-end-date-risen` | MP-E-1 |
| The 24-hour clock | `timeFormat` set to `twentyFourHour` | open the calendar | the clock reads `09` and `30` with no AM or PM | MP-E-5 |
| Nested lists | as above | open Month, Year, Hour, and Minute in turn and pick November, 2027, 10, and 45 | each list opens over the calendar and its pick lands; screenshot `g18-month-nested` | MP-E-5 |
| TextPane on a low card | `Place Cards` shown, the window sized so the pane opens below the card's value with less than a line to spare | open TextPane from the pen, then four Shift-Enter lines, each sampled | the pane keeps its side and rises with the lines, and every frame of each Shift-Enter stays inside the window; screenshot `g18-textpane-risen` | MP-E-1 |
| A low card's slid calendar | `Place Two`, holding nothing; `Place Cards` shown, the window sized so `Place Two`'s Add list fits below its card and the slid calendar doesn't | open the card's Add list, slide into `Place Due`, sampled | the list opens below and the calendar ends above the card, every frame inside the window; screenshot `g18-card-calendar-flipped` | MP-E-1 |
| End Date on the flipped calendar | as above | turn End Date on, then off | the calendar keeps its side and rises from the edge it hangs from, inside the window | MP-E-1 |
| Back after the flip | as above | Back, sampled | the list returns above the card and the edge it hangs from never moves | MP-E-1 |
| A 40-option list on a low card | as above | slide into `Place Tall`, sampled | every frame stays inside the window, capped | MP-E-1 |
| The last card in a row | `Place Two`'s card, the row's last | open its Add list, slide into `Place Due` | the calendar stays inside the window | MP-E-1 |
| Add at a panel's end | `Place One` in the page dropdown, then the SidePane | Add Property, choose `Place Tall`, sampled | its row shows, and every frame of the row's own picker stays inside the window | MP-E-1 |
| A sweep's pane | `Place One` and `Place Two` in `Place Table` | click `Place Two`'s `Place Tall` cell, then sweep the column from `Place One` to `Place Two` | both panes share one rect (at HEAD the mass pane sat 29px right of the single one); screenshot `g18-sweep-pane` | MP-B-8 |

#### Group 19 — Settings Panes

| Case | Seeds | Operation | Expected | Decisions |
| --- | --- | --- | --- | --- |
| The toolbar's Layout | Collection A's Cards view shown | open Card Scale's list, then press Card Image beside it, then again | the first press lands on the list's own shield, closes the list, opens nothing, and reaches no `click` listener on Card Image; the second opens Card Image's list; the control, since the toolbar's settings draw no shield, so the list's shield stands with or without `ownShield` | MP-E-3 |
| A View Tile's Layout | a homepage View Tile of the Cards view, scrolled near the window's top | as above, in the tile's settings | the same two presses and outcomes; this case discriminates, since the tile's settings pane draws the shield and only `MenuPresenter`'s `ownShield` gives the list its own; screenshot `g19-tile-list-only-closes` | MP-E-3 |
| A View Tile's filter field lists | as above, the Cards view filtering on Title and on Location | in the tile's settings › Filter, open the second rule's field list, then press the first rule's field, then again | the same two presses and outcomes as the toolbar's Layout; this case discriminates, since the tile's settings pane draws the shield and only `FilterFrame`'s `ownShield` gives the list its own | MP-E-3 |
| A tile's handle menu | as above | press the tile's handle | the menu draws in `[data-picker-portal]` and `Menu.popup` records nothing; screenshot `g19-tile-handle-menu` | MP-D-6 |
| Month, then Year | `Panes Due` (Date & Time) on Collection A; `Panes One` holding `2026-10-22T09:30` in the `Panes Table` view | open Month's list, then press Year, then again | the same two presses and outcomes as the toolbar's Layout | MP-E-3 |
| Hour, then Minute | as above | open Hour's list, then press Minute, then again | the first press reaches Minute rather than a shield, closes the list, and its click is dropped; the second opens Minute's list | MP-E-3 |
| A double-click on Hour | as above | double-click Hour | its field takes focus and no list stays open | MP-E-3 |
| The toolbar's filter field lists | `Panes Table` filtering on Title and on Location | as above, in the toolbar's Filter | the same two presses and outcomes as the toolbar's Layout; the control, since the toolbar's settings draw no shield, so the list's shield stands with or without `ownShield` | MP-E-3 |
| LocationField's pane | as above | open the Location rule's value pane, then press the first rule's operator | the press lands on the operator, the `focus="keep"` pane closes, and the operator's list opens | MP-E-3 |
| A slider row | Settings › Pages & Writing | open Editor Scale's list, then press a Heading size slider beside it | the press lands on the list's shield and closes it, and every slider keeps its value | MP-E-3 |
| The frames' titles | sixteen `Panes Filler` Text properties on Collection A, beside `Panes Due`; `Panes Table` shown | view settings › Group, then Sort, then Filter | the back bars read "Grouping", "Sorting", and "Filtering" | MP-F-4 |
| Layout's flat form | as above | view settings › Layout | the pane sits in the settings' one slide and mounts none of its own, with no ⋮; screenshot `g19-layout-flat` | MP-F-3 |
| Visibility by both routes | as above | view settings › Visibility; then the Views dropdown › `Panes Table`'s chevron › Layout | both panes stand 440px and scroll (at HEAD 320 by Settings); screenshots `g19-visibility-settings`, `g19-visibility-editor` | MP-F-1, MP-F-7 |
| The Properties list | as above | view settings › Properties | it stands 440px and scrolls (at HEAD 320); screenshot `g19-properties-440` | MP-F-7 |
| The view list's floor | as above, two views | open the Views dropdown, slide into `Panes Table`'s editor and back, sampled | the list stands 245px and no frame of either slide falls below it (at HEAD 225); screenshot `g19-view-list-floor` | MP-F-7 |
| Preview Rules | twelve Open In Preview rules, put back after | Settings › Navigation › Open In Preview's Manage | the pane stands 440px and scrolls (at HEAD 320); screenshot `g19-preview-rules-440` | MP-F-7 |
| The ⋮ | as above, Use Native Menus off, then on, then off again | in `Panes Table`'s editor, ⋮ › Duplicate; in the copy's editor, ⋮ › Delete, confirmed; view settings › Properties › `Panes Due`, its ⋮ opened and closed | off, the view editor's ⋮ draws Duplicate and Delete and the property editor's Remove and Delete in `[data-picker-portal]`, and `Menu.popup` records nothing; on, `Menu.popup` records each pair with a separator between and nothing draws in-app; either way the copy lands, then leaves, and Delete closes the dropdown; screenshot `g19-view-menu-in-app` | MP-F-6 |
| The icon choices | `Choice Check` (Checkbox) and `Choice Pick` (Select, option Alpha) on Collection A, beside `Panes One` | pick an icon from each of the thirteen sites: the view settings' header, a property editor's header, an option's popup, a Table title's menu, a view row's menu, a Collection's banner glyph, a page's title glyph, a page dropdown's header, a sidebar Context's menu, a Space dropdown's header, a Matrix node's menu, the Nexus photo's menu, and a View Tile's title glyph | each picker hangs from its trigger and closes on the pick, which lands in its file: the Collection's sidecar, the registry, the page metadata, `contexts.json`, `_space.json`, `settings.json`, or `homepage.json`; screenshots `g19-option-icon-popup`, `g19-icon-view-row`, `g19-matrix-icon` | MP-F-2 |
| The color choices | as above | pick a color from each of the six: a Checkbox's Color row, a view row's menu, a Space dropdown's footer, a Matrix node's menu, Settings › Appearance › External Link Color, and a View Tile's strip row | as above; screenshot `g19-space-color` | MP-F-2 |
| A Matrix label | Area One's node | Edit Icon, then the pointer moved away | the node's label stays while the picker is open | MP-F-2 |
| A tile's hidden strip | the View Tile's views hidden from its title menu | hover the title until the strip reveals, then Edit Icon from its view's row, the pointer moved away | the strip stays revealed while the picker is open, and the pick lands; screenshot `g19-tile-strip-pick` | MP-F-2 |
| A row leaving | `Panes Gone`, a second view | Edit Icon from its row in the Views dropdown, then `views:delete` it | the row leaves the list and its picker closes | MP-F-2 |
| The view editor's header | `Panes Table`'s editor | press its header's icon, then pick | the header draws the view's glyph as its row does, the picker hangs from it, and the pick lands on the view and draws in the header; screenshot `g19-f5-header-icon` | MP-F-5 |
