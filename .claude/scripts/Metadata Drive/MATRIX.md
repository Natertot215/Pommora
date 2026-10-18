## Metadata Drive — Matrix

The drive's cases, derived from *MetadataV3 — Decisions & Intention* and written to the end-state contract of the *MetadataV3 — Implementation Plan*'s AFTER blocks. Groups 1 to 8 each land with the plan phase of their number and drive the host channels the interface calls, except undo, which lives only in the interface and drives by gesture; group 9 drives each surface by real gesture. Every check prints as `[g<group> <decisions>] <name>`, so a run reads against the tables below line for line. A decision column marked **RULING** is written to the decision and waits on the orchestrator (*§Rulings*).

#### Dimensions

| Dimension | Values | Crossed Where |
| --- | --- | --- |
| **Types** | Text, Number, Checkbox, Date, Select, Status, Multi-Select, Link, File; `<Title>:` Context keys and the Space titles under them | Every type in group 2's value-spelling guard; Number, Select, Multi-Select, and Context keys for exact keys; Select, Status, and Multi-Select for exact words; Text and Multi-Select through the Key Format; Select, Status, and Multi-Select through the Value Format; Date and Link at restore |
| **Formats** | `Match Title` and the nine conventions | All ten through one Key Format cycle and one adoption property each; the B-5 creates; one representative per refusal |
| **Holders** | A page, a Space sidecar, a Collection cache (`property_cache`), a saved view, a View Tile, the Matrix filter | Pages and sidecars for every key and word operation; the cache and the three configuration holders for every option operation |
| **Operations** | Create, label rename, case-only rename, Key Format change, Value Format change, option add, rename, remove, and clear, property delete and restore, page delete and restore, Space retitle, Context rename, Try Again after a skip and after a rename back | Each in the group whose phase changes it |
| **Edge States** | A key or word in another casing, two keys differing only by case, an owed journal record, a collision and a crossing, a format writing no key, reserved keys, an unreadable file | Each beside the operation it constrains |

#### Pruned

- **Created Time and Last Edited Time:** stamps hold no key on disk, so no format or identity rule reaches them.
- **Date, Checkbox, Link, and File for exact keys:** after Phase 2B every type's read is `root[key]` and its write one set-or-delete; Number, Select, and Multi-Select cover the scalar, the governed list of one, and the list arms the spelling machinery used to split.
- **Every type but Text and Multi-Select for the Key Format:** `rekeyProperty` moves a key without reading its type (B-4); one scalar and one list prove the move keeps its line.
- **Sorts, groups, and collapsed and hidden bands:** every view operand rides the one configuration pass a filter rides (F-2); the filter, the View Tile, and the Matrix filter cover the three holder kinds.
- **Sets and Collections at restore:** their pages pass through the same page closure in `scrubReturning` a page restore uses; the page and the Space sidecar cover both closures.
- **Contexts and Spaces through a format:** B-4 gives them none, and no channel exists to drive.
- **Damaged frontmatter:** no decision names it, and the sweep's handling of it is unchanged.
- **An ID-less page and a page copying another's ID in the delete count:** the live app stamps both on admission, so only `deleteProperty.test.ts` can hold them as they are.
- **The old-shape `$order` and a refused Context delete putting the order back:** F-5 notes neither Nexus holds a `$order`, and the refusal needs a sweep failing mid-run; `spaceSidecar.test.ts` and `spend.test.ts` pin both.
- **The converter's edge cases** (`ß` beyond one create, final sigma, NFD labels, the `J. Crew` round trip): `keyFormat.test.ts`'s; the drive keeps one of each class the decisions quote.
- **The index generation:** no channel reads it; the exact holder counts in group 4 are what generation 19 serves.

#### Group 1 — Space Order by Id

| Case | Holders | Operation | Expected | Decisions |
| --- | --- | --- | --- | --- |
| Order written | Area One | `setSpaceRowOrder` | `$order` is the id list as sent | F-5 |
| Property rename | Area One | `property:rename` | the sidecar holds its bytes | F-5 |
| Context rename | Area One | `renameContext` | the sidecar holds its bytes | F-5 |
| Space retitle | M1 Space | `renameSpace` | its `$order` arrives unchanged | F-5 |
| Property delete | Area One, M1 Space | `property:delete` | the id leaves every list, and a list it empties leaves the sidecar | F-5 |
| Context delete | Area One | `delete` (context) | the Context's id leaves the list | F-5 |
| Empty order | Area One | `setSpaceRowOrder []` | `$order` leaves the sidecar | F-5 |

#### Group 2 — Exact Keys

| Case | Holders | Operation | Expected | Decisions |
| --- | --- | --- | --- | --- |
| Value spellings (153 pages) | pages | read, then write | Checkbox word pairs, Number shapes, Text, Link, and File quoting read and write as before | A-3 |
| `m2 amount: 1200` | page | read, write 1300 | reads nothing; writes `M2 Amount: 1300` beside the variant | A-1 |
| `M2 Amount: 5` beside `m2 amount: 7` | page | read, clear | reads 5; the clear leaves `m2 amount: 7` | A-1 |
| `m2 choice: Done`, `m2 labels: [Work]` | page | read, pick | read nothing; each pick lands its own key beside the variant | A-1 |
| `<areas>: [Area One]` | page | read, pick | reads nothing; the pick writes `<Areas>` beside it | A-2 |
| `<Areas>` beside `<areas>` | page | read, pick | reads `<Areas>` alone; the pick edits it alone | A-2 |
| Space write | Area Two | `setProperty` | `M2 Choice` lands beside `m2 choice` | A-1 |
| Property rename | pages, Area Two | `property:rename` | the exact key moves in its quotes; the variant stays | A-1 |
| Case-only rename | pages, Area Two | `property:rename` to `m2 memo` | the key moves; a page already holding `m2 memo` keeps its bytes | A-1 |
| Context rename and its case-only rename | pages | `renameContext` | `<M2 Group>` moves twice; `<m2 group>` stays | A-2 |
| Case-only Space retitle | pages | `renameSpace` to `m2 space` | the member moves under the Context's key alone | A-2 |
| Both spellings on one page | page | rename onto the variant | refused; nothing moves, no record | A-1 |
| Property delete and restore | page, Area Two | `property:delete`, `restore` | strips and refills the exact key; the variant stays | A-1 |
| Try Again after a skip | two pages, one unreadable | rename, `property:replay` | the rest sweep, the record is owed, the replay brings the file current and clears | F-1 |
| Chained rename | as above | rename, rename again, replay the first | the replay follows the property to its current key | F-1 |
| Rename back | as above | rename, rename back, replay | the replay writes nothing and no holder loses the key | F-1 |
| Context rename back | two pages, one unreadable | `renameContext`, back, the reply's `retry` | the retry writes nothing | F-1 |

#### Group 3 — Exact Words

| Case | Holders | Operation | Expected | Decisions |
| --- | --- | --- | --- | --- |
| Select and Status words (15 pages) | pages | read, pick | quotes, a bare numeral, stray spaces, and another Unicode composition name the option; `done` and `["todo"]` name none; a pick lands as a list of one in the file's quotes | A-3, A-1, E-2 |
| Multi-Select words (15 pages) | pages | read, pick | a fold-duplicate word isn't read; a pick keeps it after the picked options; emptying the property removes it | A-3, E-1, E-3 |
| Adoption under Match Title | page | read, pick | `green` and `PURPLE` adopt, `Red` beside `red` doesn't; a pick of `red` leaves `[red, Red]` | E-1, E-3 |
| Space titles (8 pages) | pages | read, `setContext` | an exact title reads in any quotes; `area one` reads nothing and the pick lists the picked Spaces | A-3, A-2 **RULING** |
| Is and Is Not | filter view | nine filters | Select and Status Is and Is Not compare exactly; Contains stays folded; Contains Any is exact | F-2 |
| Option rename | pages, Area One, two views | `renameOption` | every quote style follows; `[work]`, a Space's `work`, and a view naming `work` stay | A-1, F-2 |
| Space retitle | pages | `renameSpace` | every quote style follows; `[m3 place]` stays | A-2 |
| Case-only skip | two pages, one unreadable | rename to `m3 case`, `property:replay` | the owed case-only rename sweeps on Try Again; until the index keys exactly, the unreadable holder reads as holding both keys and the rename is refused | A-1, F-3 |
| Undo over a foreign word | page | pick Work in the table's picker, ⌘Z | `[work]` → `[Work, work]`; the undo puts back `[work]` byte for byte | A-1, E-3, Undo |
| Undo beside an adopted word | page | unpick Work, ⌘Z | `[Work, ideas]` → `[ideas]`; the undo puts back `[Work, ideas]` | E-1, Undo |
| Undo over another casing | page | pick Doing, ⌘Z | `done` → a list of one, `Doing`; the undo puts back `done` | A-1, E-2, Undo |
| Undo over an unreadable Number | page | type 5, ⌘Z | `abc` → `5`; the undo puts back `abc` | Undo |
| Undo of an added option | page | pick Play, ⌘Z | `[Work]` → `[Work, Play]`; the undo puts back `[Work]` | Undo |

#### Group 4 — Counts and Items

| Case | Holders | Operation | Expected | Decisions |
| --- | --- | --- | --- | --- |
| Delete count | two pages, a variant page, Area One holding the value, Area Two holding only the `$order` id | `property:holders`, then `property:delete` | the count is 4, writes nothing, and the delete rewrites exactly those 4 | J-1, F-4 |
| Clear count | three pages, Area Two | `property:holders(id, 'a')`, then Clear | 3, writes nothing, rewrites exactly those | F-4 |
| Remove count | two pages | `property:holders(id, 'b')`, then Remove | 2, writes nothing, rewrites exactly those | F-4 |
| Rename refusal | one page, then two | rename onto the variant | `1 Item holds both …` and `2 Items hold both …` | J-1 |
| Unswept notice | one unreadable page | rename | `Couldn’t update 1 Item.` | J-1 |

#### Group 5 — The Label and Key Registry

| Case | Holders | Operation | Expected | Decisions |
| --- | --- | --- | --- | --- |
| Create | registry | `schema:add` Select and Status | `label` and `key` on the definition and every option, no `name` or `value` | C-1, C-2 |
| A key apart from its label | registry, pages | hand-written `{ label: 'M5 Due', key: 'm5_due' }` | `m5_due` reads, `M5 Due` doesn't, a write lands on `m5_due` | C-2 |
| No label | registry, page | hand-written `{ key: 'M5 Bare' }` | reads its key, and rides an unrelated write without gaining a label | C-3 |
| Decode and encode | pages | read, pick | `[done]` reads Done; a pick writes `[in-progress, done]`; a Select's label written as a word is foreign | A-1, C-1 |
| Clear by label | pages | `clearOption('Urgent')` | strips `urgent`, leaves `Urgent` | C-1 |
| Uniqueness | registry | creates and renames | a fold-duplicate label or key steps aside on both words at create and is refused at rename; `Id` and `Banner` are refused; a hand-written `banner` key isn't admitted | D-1 |
| Option uniqueness | registry | option add, creates | a fold-duplicate label, two keys in two casings, a blank key, and a Status's duplicate or blank option are refused | D-2, J-1 |

#### Group 6 — The Journal and the Cascades

| Case | Holders | Operation | Expected | Decisions |
| --- | --- | --- | --- | --- |
| Option rename | page, Area One, Collection B cache, view, View Tile, Matrix filter | `renameOption` | files and cache by key, the three configurations by label | F-2 |
| Key apart from label | page, view | rename `Urgent`, then remove it | Match Title moves the key with the label; the view follows; the removal strips both | F-2 |
| Option removal | page, cache | `removeOption` | strips the page and the cache | F-2 |
| Clear | cache, Collection B | Clear, reassign | the cache loses the value and the reassign brings it back nowhere | J-1 |
| Records carry keys | journal | rename, option rename, delete, option removal, each over an unreadable file | `{ op: 'rename', from, to }` in keys; `{ op: 'option-rename', keys, labels }`; `{ op: 'delete', key }`; `{ op: 'option-remove', key }` | F-1 |
| An owed record | registry, pages, journal | option rename and removal; Clear; property rename | the two option changes are refused and write nothing; Clear and a property rename run | F-1 |
| Adoption shield | a new page holding the old word | settle | the owed record's old key isn't adopted | F-1 |
| Try Again | the skipped files | `property:replay` | each record's replay brings its file current and clears | F-1 |

#### Group 7 — The Formats

| Case | Holders | Operation | Expected | Decisions |
| --- | --- | --- | --- | --- |
| The Key Format cycle | two pages, Area One | `property:holders(id, { key_format })`, `property:setKeyFormat` through all ten | the count, written nothing, then `url slug`, `URL SLUG`, `url-slug`, `UrlSlug`, `urlSlug`, `url_slug`, `Url-Slug`, `URL_SLUG`, `URL-SLUG`, and `URL Slug` on every holder; a page already holding the new key isn't counted and reads after | B-2, B-5, B-6, F-1, F-4, B-1 |
| The format it holds | registry, pages | `setKeyFormat` to the same format | `ok(null)`, nothing written | F-1 |
| A list key | page, Area Two | `setKeyFormat` lowercase | the key moves on its line on both holders, no record | B-4, F-1 |
| Label renames | page | rename to `Labels`, then `LABELS` | the key follows through the format, then holds | C-2 |
| Both spellings on one page | page | `setKeyFormat` lowercase | `1 Item holds both "Sorts" and "sorts".`, nothing moves | D-1, J-1 |
| The B-5 creates | registry | ten creates | `v5.0`, `j.-crew`, `new property`, `due-date`, `i-phone`, `xml-http`, `IPhone17`, `aBTest`, `due_date`, `STRASSE` | B-5 |
| Create keys | registry | create handed a key; create beside `Ship_Date` | the key comes from the label; the create steps aside to `Ship Date (2)` / `ship_date_(2)` | C-2, D-1 |
| Refusals | registry | Key Format onto another's key, a format writing no key at create and at change, onto `heading_icon_hidden`, a create writing `ID` | each refused, the key unchanged | D-1, B-5 |
| Stored key trusted | page | hand-written key under `snake_case`, then a rename | reads under the stored key, then the rename writes `due_later` | C-2 |
| Type changed outside | registry | `setIcon` on a hand-written Select | seeds `option 1` through its Value Format | C-2 |
| Value Format seeds, adds, renames | registry, page | creates, option add, option rename | seeded and added keys through the format; a create keeps its keys; a rename moves the page's key | C-2 |
| Adopted rename | page, view | rename `in-progress` to `In Progress` under kebab-case | no page rewritten, the view follows the label | E-1, F-2 |
| Value Format change | page, Area One, cache, view, View Tile, Matrix filter | count, then `setValueFormat` kebab-case | count 2 with the cache left out; every option re-keyed, labels kept; files and cache by key; the configuration byte-identical; the table and the view still read labels; a reassign refills the new key | F-1, F-2, F-4, C-2 |
| Value Format refusals | registry, pages, journal | collision, crossing, a Text property, an owed record | each refused, nothing changes; a Key Format change still runs while owed | D-2, F-1, B-3 |
| Adoption per format | ten Multi-Selects | settle | `Red`, `BLUE`, `green` adopt as B-6's table says; `AB` and `J.Crew` don't under PascalCase; `in-progress` does and `due_date` doesn't under kebab-case | E-1, B-6 |
| Adoption under lowercase | page | settle, picks | `green` adopts; `PURPLE` and `Red` stay foreign through a pick | E-1, E-3 |
| A Value Format change owes adoption | page | `setValueFormat` lowercase | `green`, refused under UPPERCASE, adopts | E-1 |

#### Group 8 — The Restore Re-Spell

| Case | Holders | Operation | Expected | Decisions |
| --- | --- | --- | --- | --- |
| The eight spellings | eight pages | trash, restore | each returns under `Value One` | G-1 |
| A Key Format and a Value Format change in the Trash | pages | trash, change, restore | `priority: [hi]`; `Severity: [HI]` | G-1 |
| Exact key beside a variant | page | trash, restore | `Urgency` keeps its value, `urgency` stays foreign | G-1 **RULING** |
| A shared spelling; a label renamed in the Trash | pages | trash, restore | each returns as written | G-1, G-2 |
| Option words | pages | trash, restore | `top-tier` and `TOP TIER`, `low_tier` take back their options | G-1 |
| Context keys and Space titles | pages | trash, restore | `[area one]` and `<areas>` take back `Area One` and `<Areas>` | G-1 |
| Reserved keys | a page, a Space | trash, restore | the page's `ID` and the Space's `heading_icon_hidden` stay | G-1, D-1 |
| A Link key | page | trash, restore | `source link` returns as `Source Link`, its connection as written | G-1, A-3 |
| A foreign key a format could have written | pages | trash, restore | `deadline_date` returns as `Deadline Date`; a value the Date can't read leaves with it | G-1, G-2 **RULING** |
| A Space sidecar | M8 Returning | trash, restore | `<projects>`, its title, and `grade` return current | G-1 |

#### Group 9 — The Gesture Pass

| Case | Surface | Gesture | Expected | Decisions |
| --- | --- | --- | --- | --- |
| The Metadata leaf | Settings window | open the leaf | the rail reads Metadata, not Properties; one section, Maintenance, holding Repair Properties On Open | J-1 |
| Foreign words | the value picker on a table cell | open, pick Life | `work` draws no chip and no row; the pick writes `[Work, Life, work]` | E-3 |
| The rows | the Property Frame | open a Number and a Status | Key Format at Match Title with its hint, no Value Format on the Number; both rows above the Status's options, divided from them | H-1 |
| The pane | the Key Format row | open it | Match Title and the nine conventions in order | B-2 |
| The counted confirmation | the Key Format and Value Format rows | pick at 0, 1, and 2 Items; cancel; confirm | silent at 0 and 1; asks with `2 Items` at 2; a cancel writes nothing; a confirm re-keys | F-4, F-1 |
| Clear at zero | the option editor's row menu | Clear an option nothing holds | asks nothing | F-4 |
| The Trash | the Trash browser | right-click, Restore | the page returns under the Key Format set while it was away | G-1 |
| Row order on a Space | the Property Panel | drag a row, then rename a property | `$order` lists ids in the dragged order; the rename leaves the order and the panel | F-5 |

#### Rulings

- **Undo puts back what the file held** (group 3's undo cases, `Undo`): Nathan's ruling, recorded in the plan's *§Deviations*; each case cites it beside the decisions its gesture exercises.
- **A Context pick drops a foreign Space title** (group 3, `area one`): E-3 carries foreign words for a Multi-Select alone, and A-2 makes `area one` foreign data, so the pick writes the picked Spaces only; *§Open Items* lists it to read once.
- **An exact current key beside a variant** (group 8, `Urgency`): G-1's INFERRED entry gives an exact key its property and says nothing of the variant; the case follows the plan's Phase 8 GOAL, where the variant stays foreign.
- **A re-spelled Date losing an unreadable value** (group 8, `deadline_date: soon`): G-1 re-spells the key and G-2's reconcile drops what the Date can't read; *§Open Items* lists it to read once.
- **A restored Collection's cache** keeps its old keys (*§Open Items*); no decision names it, so the drive doesn't pin it either way.
- **The hints' apostrophes:** H-1 quotes the hints with straight apostrophes and the plan's `FormatRows.tsx` writes `’`; the drive asserts the AFTER block's.
- **"The value picker (foreign words, captions)":** captions exist only on the two format rows (`PickerRowLook.caption`), so the drive asserts them there and asserts foreign words in the value picker.

#### Copy To Fill

The six `{COPY: …}` messages in *§Open Items* sit in the drive's `COPY` table, one entry each, as functions of the words their messages name. While an entry is null, its checks assert that the refusal or the dialog is present at its place; once filled, they assert the text.

| Entry | Where It's Asserted |
| --- | --- |
| `aKeyAnotherPropertyWrites` | group 5's rename onto `m5_due`; group 7's Key Format change onto `Ship_Date` |
| `twoOptionsWritingOneKey` | group 5's create holding `A` and `a`; group 7's collision |
| `anOptionChangeWaitingForTryAgain` | group 6's option rename and removal; group 7's Value Format change |
| `aFormatThatWritesNoKey` | group 7's create and Key Format change on `---` |
| `aValueFormatChangeCrossingTwoOptionsKeys` | group 7's `Router` crossing |
| `theFormatChangesConfirmation` | group 9's dialogs, asserted by their `2 Items` until worded |

#### Expectations the Plan Doesn't Spell Byte for Byte

Each follows the writer rules the old drive and the plan's Phase 9 rows already pin, and is the first place to look if a run disagrees: a Context write onto a page holding only a variant key (`<Areas>:\n  - Area One` beside `<areas>`), a Multi-Select write onto a new key (`M2 Labels:\n  - Life`), a Select pick over `" Done "` (`\n  - Doing`, bare, since `nodeSpelledAs` carries only quotes the file chose where yaml wouldn't, and yaml needs them for the stray spaces), and the scalar a Space's Select write leaves (`['Doing']`). Restore cases compare parsed values where the reconcile may reshape a value.
