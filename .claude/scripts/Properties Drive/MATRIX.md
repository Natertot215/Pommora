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

#### Group 6 — One Door for Property Changes

| Case | Seeds | Operation | Expected | Decisions |
| --- | --- | --- | --- | --- |
| An option's menu reads Delete, and a delete nothing holds asks without a strip clause | `Drive Choice` (Select: Alpha, Beta) added to Collection A | view settings › Properties › Drive Choice, right-click Alpha › Delete, then Delete | the menu holds Delete and no Remove; the dialog asks `Delete “Alpha”?` with `The option is deleted from the property.`; the registry lists Beta alone | O-1 |
| An option a page holds asks with its count | `Drive Held` in Set Alpha holding Beta | right-click Beta › Delete, then Delete | the dialog says `…and its value stripped from 1 Item.`; `Drive Held.md` no longer holds `Drive Choice` | O-1 |
| Deleting a property nothing holds asks without "0 Items" | `Drive Bare` (Text) | its editor's Property Menu › Delete, then Delete | the dialog asks `Delete “Drive Bare” everywhere?` with no count; the pane returns to its list, the notice starts `Deleted “Drive Bare”`, and the Trash holds one property row | O-2 |
| The pane's + says the numbered name it took | `New Text` (Text) | view settings › Properties › New Property › Text | the notice reads `Created “New Text (2)”.` and the editor opens on `New Text (2)` | O-4 |
| A property restored after its name was taken says the name it took | `Drive Bare` (Text) added again | Settings › Trash, right-click `Drive Bare` › Restore | the notice reads `Restored “Drive Bare” as “Drive Bare (2)”`; the registry holds both | O-4 |
| The group leaves things as it found them | everything above | delete each property and `Drive Held`, empty the bundles made | Collection A's `properties`, the registry's `order`, and the Trash's count match the group's start | — |

#### Group 9 — One Note per Item

| Case | Seeds | Operation | Expected | Decisions |
| --- | --- | --- | --- | --- |
| A rename that misses a page offers Try Again | `Drive Priority`, `Drive Stage`, and `Drive Spare` (Text) added to Collection A; `Drive Held` holding all three and `Drive Locked` holding the first two, in Set Alpha; `Drive Locked.md` set to mode `000` | rename `Drive Priority` to `Drive Urgency` from its editor's title field, then Rewrite | the notice reads `Couldn’t update 1 Item.` with Try Again, and `.nexus/.owed.json` holds the property's `rename: ['Drive Priority']` | B-4, B-1 |
| A second property renames past the first's owed work | as above | rename `Drive Stage` to `Drive Phase` | `Drive Held` reads `Drive Phase: kept` | B-1 |
| A rename onto a name still owed is refused | as above | rename `Drive Spare` to `Drive Priority` | the notice reads `An earlier change hasn’t reached every file yet.` with Try Again, and `Drive Held` still reads `Drive Spare` | B-4 |
| The owed name's finish frees it | `Drive Locked.md` back to `644` | rename `Drive Spare` to `Drive Priority` again | `Drive Locked` reads `Drive Urgency` and `Drive Phase`, the notes file owes nothing, and `Drive Held` reads `Drive Priority: spare` | H-17, B-4 |
| The group leaves things as it found them | everything above | delete the three properties and both pages, and empty the bundles made | the Trash holds no row the group made | — |

#### Group 10 — The Stash and the Trash Records

| Case | Seeds | Operation | Expected | Decisions |
| --- | --- | --- | --- | --- |
| Remove's stamp | `Drive Kept` (Text) on Collection A; `Drive Stays` and `Drive Trashed` holding values | `unassignProperty` | Collection A's `property_stash` holds both values and a `removed_at` from the Remove's moment | C-3, LC-26 |
| The refill | `Drive Trashed` deleted to the Trash | `assignProperty`, then `restore` | `Drive Stays` holds its value; the Trash copy holds `Drive Trashed`'s; the stash block is gone; the restored page holds its value | C-2 |
| The open's cleanup | `historyDays: 7`; Collection B holds a block stamped eight days ago and one stamped today, written with the app closed | relaunch | the aged block is gone; today's stays | C-3 |
| The timeframe's cleanup | today's block backdated eight days by hand | `personalization:set` `historyDays` 7 | Collection B holds no `property_stash` | C-3, LC-26 |
| The partial mark | a property record with `partial: true`, written by hand | Settings › Trash; `restore` | its row alone holds the mark spoken `Recorded Partly`; the reply's warning names it as recorded partly | N-1, LC-37 |
