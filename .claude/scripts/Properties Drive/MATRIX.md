## Properties Drive — Matrix

The drive's cases, derived from *Properties Restructure — Decisions & Intention* and written to the end-state contract of the Properties Restructure plan's AFTER blocks. Each group lands with the plan phase that adds it and drives the channels and surfaces the interface uses. Every check prints as `[g<group> <decisions>] <name>`, so a run reads against the tables below line for line. Each group seeds what it needs in `~/Test` and puts it back; the harness restores `~/Test` when the run ends.

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
| The pane's + says the numbered name it took | `New Text` (Text) | view settings › Properties › New Property › Text | the notice reads `Created “New Text (2)”.` and the editor opens on `New Text (2)` | O-4 |
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
| A Link from a card's chooser | `Seat Site` hidden in Seat Cards | click Seat Two's card off any value, choose Seat Site | the field opens empty | — |
| The sidebar's Properties menu | `Seat Due` (Date & Time) holding `2026-10-22` | right-click Seat One in the sidebar, choose Properties › Seat Due | the calendar opens | X6 |


#### Group 15 — The Properties Pane

| Case | Seeds | Operation | Expected | Decisions |
| --- | --- | --- | --- | --- |
| Create then edit | none; each property is created through the pane | New Property, then Number, Date, Link, Checkbox, and File in turn | each editor opens with no animation frame showing the list between the pick and the editor | O-5 |
| The Number rhythm | the new Number | the editor as created, then Fraction on | 8px between every shown row (3 gaps), then 4 gaps of 8px with Value revealed; screenshots `g15-number-collapsed`, `g15-number-revealed` | L-1 |
| The denominator | as above, Fraction on | type `4` in Value, Enter; then `0` | the definition holds 4 after both; Style then reveals, 5 gaps of 8px; screenshot `g15-number-style` | L-3, L-1 |
| The Date rhythm | the new Date & Time | Date format Full Date, then MM/DD/YYYY | 8px from the heading through Date, Day, and Time; with Day collapsed, Date to Time is 8px; screenshots `g15-date-revealed`, `g15-date-collapsed` | L-1 |
| Link and Checkbox | the new Link and Checkbox | open each editor | 8px between rows; screenshots `g15-link`, `g15-checkbox`, `g15-file` | L-1 |
| Delete from ⋮ | the new File, its editor open | ⋮ › Delete, confirm | the definition is gone and the list is the live slot | O-5 |
| Removed from outside | the new Number, its editor open | `mutate` `unassignProperty` from outside the pane | the list is the live slot, and no "Property not found." shows | O-5 |
