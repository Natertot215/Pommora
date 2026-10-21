## Archive Drive — Matrix

The drive's cases, derived from *Archive — Decisions & Intention* and written to the end-state contract of *Archive — Implementation Plan*'s AFTER blocks. Each group lands with the plan phase of its number and drives the channels the interface calls, with a real gesture wherever the decision names one. Every check prints as `[g<group> <decisions>] <name>`, so a run reads against the tables below line for line, and a check owned by a phase past `POMMORA_ARCHIVE_LANDED` (default 1) prints `AWAIT` and leaves the exit code alone. `~/Test` holds no excluded folder and names no asset directory, so each group seeds its own Sets and settings and puts the settings back; the harness restores `~/Test` when the run ends.

#### Group 1 — The Lift and the Carry

| Case | Seeds | Operation | Expected | Decisions |
| --- | --- | --- | --- | --- |
| The carry | Set `AR Lift`; `AR Lift/Private` excluded through `exclusions:set`, then written with `Keep.md` | `mutate` rename to `AR Moved` | `excluded_folders` and the held scope read `Collection A/AR Moved/Private`; the folder moved with its page unstamped and no sidecar | K-1 |
| The lift, by gesture | as above | the sidebar row's right-click › Delete › the confirmation's Delete | the question reads `Delete “AR Moved”?`; `Collection A/Private` holds `Keep.md` untouched; the entry reads `Collection A/Private`; the bundle holds no `Private` and its record no `excluded`; the sidebar draws neither row | F-3 |
| The restore | the bundle above, found under `.trash/Collection A/` | `mutate` restore | `AR Moved` returns without `Private`, which stays where it was left; the entry is unchanged; the sidebar draws the Set and never the folder | F-2 |
| A namesake | Set `AR Second`; `AR Second/Private` excluded beside `Collection A/Private` | `mutate` delete | the folder lands as `Private (2)`, both folders untouched and both entries held | F-2 |
| The asset directory's carry | Set `AR Carry`; `asset_directory` written from outside ahead of `AR Carry/Media/Pixel.png` | `mutate` rename to `AR Media` | `AR Media/Media/Pixel.png`, no sidecar; `asset_directory` and the held scope read `Collection A/AR Media/Media`; `excluded_folders` holds only the two lifted folders | K-1 |
| The asset directory | the carry above | `mutate` delete | `Collection A/Media/Pixel.png`, no sidecar; `asset_directory` and the held scope read `Collection A/Media` | F-2 |

#### Group 2 — The Owner and the Format

| Case | Seeds | Operation | Expected | Decisions |
| --- | --- | --- | --- | --- |
| Page slot | `AR Before`, `AR Middle`, `AR After` in Set Alpha | `delete`, then `restore` | `page_order` drops the id at the delete and holds it between its neighbours after the restore; the sidebar draws them in that order | E-2 |
| Set slot | `AR Set One`–`Three` in Collection A | `delete`, then `restore` | `set_order` holds `AR Set Two` between the others | E-2 |
| Collection slot | `AR Coll` between Collection A and B | `delete`, then `restore` | `state.json` `order.collections` drops the id at the delete and holds it between them after the restore; the sidebar agrees | E-2 |
| Space slot | `AR Space` in one Context | `delete`, then `restore` | `order.spaces[<id>]` drops the id at the delete and holds it between its neighbours after the restore | E-2 |
| Outside file | `AR Squat` and a task-marked squatter | Trash browser › Restore | `AR Squat (2).md` lands; the squatter's bytes hold; the notice reads `Restored “AR Squat” as “AR Squat (2)”` | E-4 |
| Excluded folder | Set `AR Excl` and the entry `Collection A/AR Excl` | `restore` | `landedAs: 'AR Excl (2)'`; the folder lands as `AR Excl (2)`; `settings.json` unchanged by the restore, the entry taken back out after | E-4 |
| The browser | every Trash row | Settings › Trash; Restore All of two | rows match `bundles:list`; the notice reads `Restored 2 Pages`; a shot beside it | A-3 |

#### Group 3 — Reach (Phase 3)

The run's prologue saves and shows `Drive Table`, a table view of its own on Collection A, since Collection A's one saved view draws cards; the harness's restore takes it back. Seeds, with the app closed and before a relaunch, so the open's seed reads the Archive as its second root: `Drive Stage` (a Select with `Draft`, added through `schema:add` on Collection A before the quit, its draft's `id` empty as `propertyDraft` requires, `Core/Properties/properties.ts:161`, `:198-200`); `Collection A/Set Alpha/Drive Live.md` holding `Drive Stage: Draft`; `Drive Linker.md` beside it, its body `[[Drive Arc]]`; `Collection A/Drive Damaged/Drive Withheld.md` under a `_pageset.json` that doesn't parse, so the tree lists the Set unreadable and withholds the page, which the index and a folder walk still read; and the archived page `.nexus/archive/<Collection A's id>/Collection A/Set Alpha/2026-10-20T12-00-00-000Z__Drive Arc.md.archived/Drive Arc.md` with its `_record.json`, holding `Drive Stage: Draft`, `## Drive Heading`, and `[[Drive Live]]`. The group removes its seeds and empties the deleted property's bundle before it ends, leaving nothing behind; the harness restores `~/Test` when the run ends.

| Check | Decision | Asserts |
| --- | --- | --- |
| the tree holds the live pages and never the archived one | D-2 | `nexus:state`'s tree |
| Collection A's view search for Drive lists Drive Live and never Drive Arc | D-2 | DOM: `.data-row[data-rid]` |
| a link naming the archived page draws unresolved | D-1 | DOM: `md-connection-phantom` on Drive Linker's line |
| the Matrix graph holds the live page and the one the tree withholds, and no archived page or edge | K-2 | `matrix:graph` reply |
| the Matrix graph asked for the archived path answers no id | K-2 | `matrix:graph` reply |
| the headings answer no archived path, whole or asked by path | K-2 | `index:headings` reply |
| Collection A's value load reads the tree's pages, never the archived one or one under a Set whose sidecar doesn't parse | K-2 | `view:loadValues` reply: the withheld page is one a walk of the Collection's folder would read |
| the delete confirmation’s count leaves the archived holder out | C-4 | `property:holders` reply is 1 |
| an option rename rewrites the archived page as it rewrites the live one | C-1 | disk: both frontmatters read `['Final']`, the one-item list the option cascade writes (`replaySchemaCascade.test.ts:523`) |
| renaming Drive Live re-spells the archived page's link | C-1 | disk: the archived body reads `[[Drive Live 2]]` |
| the property delete strips the archived page as it strips the live one | C-2 | disk: neither frontmatter holds `Drive Stage` |
| the group leaves Collection A’s Archive and the Trash as it found them | — | the seeds removed from outside, `Drive Stage`'s bundle emptied under `permanentDelete` (then off again); `bundles:list` answers no archived row and no `Drive Stage` row |

#### Group 4 — The Archive's Ops (Phase 4)

Seeds through `mutate` on `~/Test`, Collection ids read from the sidecars at run time: `Drive Arc` in Set Alpha, created with an explicit `order` that places its id right after `Page A`'s in the `page_order` the group starts from, so its neighbours are `Page A` and the page following it then (`Page B` on `~/Test`), its body `[[Drive Live]]` written from outside, beside `Drive Live`; Set `Drive Sub` in Set Alpha holding `Drive Deep`; Collection `Drive Coll` holding `Drive Kept`. One relaunch, after `Drive Coll`'s delete, writes while the app is closed an Archive under a fresh id holding `Drive Gone/2026-10-20T00-00-00-000Z__Drive Orphan.md.archived/` with `Drive Orphan.md` and a record whose parent is a second fresh id. With `permanentDelete` on, the group deletes and empties everything it made, resets `permanentDelete`, removes Collection A's and B's Archive folders and the Trash chain folders it made where empty, and asserts the start-of-group orders, `bundles:list` lengths, and setting; the harness restores `~/Test` when the run ends.

| Check | Decision | Asserts |
| --- | --- | --- |
| a page archives into its Collection’s Archive under the chain it left | A-2 | `bundled.bundlePath` under `.nexus/archive/<A id>/Collection A/Set Alpha/<stamp>__Drive Arc.md.archived`, holding the page and a record with `entity: 'page'`, its id, Set Alpha's id as `parent`, `place` with the follower above and `Page A` below, `trail: [<A id>]`; the page gone from Set Alpha and its id from `page_order` |
| the archived page leaves the tree and lists in its Archive | D-2 | `nexus:state`'s tree holds no page with its id; `bundles:list({ kind: 'archive', id: <A id> })` answers one row titled `Drive Arc`, crumbs `Collection A`, `Set Alpha` |
| a rename reaches the archived file | C-1 | disk: after `Drive Live`'s rename, the archived body reads `[[Drive Live Renamed]]` |
| a restore returns it to its exact place by a plain move | E-2 | disk: `Drive Arc.md` back in Set Alpha byte-equal, between `Page A` and the follower in `page_order`; the bundle gone; no `unrestored` or `landedAs` |
| a delete from the Archive goes to the Trash keeping the bundle it left | E-3 | `bundled.bundlePath` under `.trash/Collection A/Set Alpha/<stamp>__Drive Arc.md.deleted`, its record's `archive` naming the Archive bundle, which is gone |
| its Undo returns it to the Archive under the same name | E-3 | `restore` with `destination: { kind: 'archive' }`: the Archive bundle holds the page and a record without `archive`, `links`, or `targets`; the Trash bundle gone; the tree holds no `Drive Arc` |
| a Trash restore returns it to where it was archived from | E-3 | a plain `restore` of a second Trash bundle: `Collection A/Set Alpha/Drive Arc.md` |
| a Set moved to another Collection carries what was archived from within it | F-6 | `moveSet` of `Drive Sub` into Collection B: `.nexus/archive/<B id>/Collection A/Set Alpha/Drive Sub/<the bundle's leaf>/Drive Deep.md`, `trail: [<B id>]`; the bundle gone from A's Archive |
| a Set moved within its Collection rewrites the trail alone | F-6 | `moveSet` into Collection B's Set Alpha: the bundle stays, `trail: [<B id>, <B's Set Alpha id>]` |
| an Archive whose Collection exists nowhere moves into the Trash at the next open | F-5 | disk after the relaunch: `.trash/Drive Gone/` holds one `__Drive Orphan.md.deleted` bundle with an equal record; the orphaned Archive's folder gone |
| a Collection in the Trash keeps its Archive, and emptying it empties both | F-4 | disk after the relaunch: `.nexus/archive/<Drive Coll id>/` stands; an `emptyBundle` of `Drive Coll`'s Trash row under `permanentDelete` leaves neither it nor the bundle |
| the group leaves Collections A and B, their Archives, and the Trash as it found them | — | start-of-group values: Set Alpha's `page_order`, Collection B's and its Set Alpha's `set_order`, `state.json`'s `order.collections`, `bundles:list` lengths for the Trash and both Archives, `permanentDelete`, and which Trash chain folders exist |

#### Group 5 — Shared Chrome (Phase 5)

Seeds through `mutate` on `~/Test`: `G5 One`, `G5 Two`, `G5 Note`, `G5 Note Long`, and `G5 Diff` in Set Alpha, `G5 Diff`'s body a `diff` fence written from outside, and the first four deleted into the Trash. The group restores `G5 One` and `G5 Two` and empties the two notes through the browser; with `permanentDelete` still on, it deletes and empties the three pages left, puts `permanentDelete` and `iconFavorites` back, and asserts the start-of-group values; the harness restores `~/Test` when the run ends.

| Check | Decision | Asserts |
| --- | --- | --- |
| the Trash keeps its look and lists newest first | G-1 | DOM: Settings › Trash's `.trash-frame.table` holds `.nav-search-row`, then `.trash-head.table-head` with `.trash-head-name` and `.trash-head-date`, then `.trash-row.table-divider` rows; the rows' `Select …` labels begin `G5 Note Long, G5 Note, G5 Two, G5 One`; `shot` beside it |
| typed search narrows in place, keeping newest first | G-1 | DOM: typing `g5 note` in the Trash's search field leaves exactly `['G5 Note Long', 'G5 Note']` (ranking would put `G5 Note` first); clearing the field restores the four |
| one row's menu reads Restore and Delete | K-4 | native rows: `chooseNative` on the unchecked `G5 One` row, path `[]`, reads `['Restore', 'Delete']` |
| a checked row's menu names the batch; an unchecked one acts alone | K-4 | native rows: with `G5 One` and `G5 Two` checked, `['Restore All', 'Delete All']` on `G5 Two` and `['Restore', 'Delete']` on the unchecked `G5 Note` |
| Restore All restores the checked rows | K-4 | disk and DOM: `Restore All` on `G5 Two` leaves both `.md` files under `Collection A/Set Alpha` and their bundles gone from `.trash`; the list holds neither; the label's text starts `Restored 2 Pages` |
| a notice posted under the pointer drains | K-3 | DOM: right after it posts, `mouseMoved` to the label's centre and 10 px across it, never leaving, and the label's host gains `inert` within 4500 ms |
| Delete All empties the checked rows | K-4 | DOM and disk: with `G5 Note` and `G5 Note Long` checked, `Delete All` on one asks `Delete these 2 Pages?`; after Delete both bundles are gone from `.trash` and the label's text starts `Deleted 2 Pages` |
| once the pointer has left its band, returning stalls the drain and leaving drains it | K-3 | DOM: right after that notice posts, `mouseMoved` far from it (the window's bottom-left), then into its band: no `inert` after 5000 ms; `mouseMoved` far again: `inert` within 4500 ms |
| the date column's right-click picks a style and returns to the Nexus's own | G-1 | native rows and disk: `Short Date` on `.trash-head-date` writes `trashColumnStyle: { date_format: 'short' }` to `.nexus/settings.json`; the Nexus's own form (`Full Date` on `~/Test`) takes the key out |
| the icon picker's rows sit where its list starts and virtualize while scrolled | 4.7 | DOM: with `iconFavorites: ['alarm-clock']` seeded (so the favorites strip sits above the list and its offset isn't 0), `G5 One` opened from Collection A's table and `Edit Icon` chosen on `.detail-title-text`, the list's top lies below the strip and the first rendered row's top equals it; after setting the grid's `scrollTop` to 600 and a frame, fewer rows render than the icon set holds and one row spans the grid's top edge; Escape closes |
| the lock glyph cross-fades through the one swap | G-6 | DOM: with `Collection A` locked through `setDisclosureLock`, its sidebar `Unlock Folder` button holds one swap whose closed-lock face is `data-face="shown"` and whose open face carries `inert` and `aria-hidden="true"`; unlocked by a press on that button, with the pointer still in the row, the `Lock Folder` button's faces are the other way round |
| Clear History cross-fades to Cleared, holds, and returns | G-6 | DOM: Settings › Files & Links › Clear History's shown face reads `Clear` at width `w`; after the press and the dialog's Clear, the shown face reads `Cleared`, the `Clear` face carries `inert` and `aria-hidden="true"`, and the width is still `w`; after 1800 ms the shown face reads `Clear` |
| the diff tally swaps its counts for Copied in place | G-6 | DOM: `mouseClick` on `G5 Diff`'s `.codeblock-tally` leaves its faces hidden counts and shown `Copied`, the pill's width unchanged, and the tag carrying `.is-copied`; after 1800 ms the counts are shown and `.is-copied` is gone |
| Settings › Files & Links' Trash & Archive section reads its rewritten hints | K-5 | DOM: Permanently Delete Files' caption is `Erase items emptied from the Trash instead of moving them to the system trash.`; Confirm Before Deletion's ends `Collections, Sets, Contexts, Spaces, views and properties always ask.` |
| the group leaves Set Alpha and the Trash as it found them | — | start-of-group values: Set Alpha's `page_order`, the Trash's `bundles:list` length, and `permanentDelete`; no `G5 One`, `G5 Two`, or `G5 Diff` file in Set Alpha |

#### Group 6A — Archiving (Phase 6A)

Seeds through `mutate` on `~/Test`, each with an explicit `order` built from the held tree's drawn children: `Arc Page`, second among Set Alpha's pages, and Set `Arc Set`, second among Collection A's Sets, so a restore's exact place has neighbours. Each archive is undone in its own check and each declined question changes nothing; the group saves `historyDays`, `archiveHistoryDays`, and `confirmArchiving` from `settings.json`'s personalization at its start and writes each back through `personalization:set` at its end, an absent key as `null`; the harness restores `~/Test` when the run ends.

| Check | Decision | Asserts |
| --- | --- | --- |
| a page's row menu closes on Archive above Delete | I-1 | native rows: `popNative` on `Arc Page`'s `.cell-title-text` in Collection A's table; the last three raw rows are `{ separator }`, `Archive`, `Delete`, both enabled |
| Archive asks its question | I-2 §Copy | DOM: after `Archive`, the `alertdialog`'s `aria-label` is `Archive “Arc Page”?`, its detail `“Arc Page” will be moved to this Collection’s archive, where it can be restored.`, its non-Cancel button `Archive` |
| the notice reads Archived “Arc Page” with Undo | I-3 §Copy | DOM: after the dialog's Archive, the label, read while its host isn't `inert`, reads `Archived “Arc Page”Undo`, its one button `Undo` |
| pressing Archive moved the page into its Collection's Archive | I-1 | disk and DOM, read while the notice shows: `Collection A/Set Alpha/Arc Page.md` gone; the `__Arc Page.md.archived` bundle under `.nexus/archive/<A id>/` holds `Arc Page.md` with the seeded `ID`; Set Alpha's `page_order` lacks it; the table has no row for it |
| Undo returns the page to its exact place | I-3 | disk: after the notice's Undo, `Arc Page.md` is back in Set Alpha, the bundle gone, and `page_order` holds it between its seeded neighbours |
| Settings › Trash & Archive holds Confirm Before Archiving under Confirm Before Deletion, on | I-2 §Copy | DOM: Settings › Files & Links has no `Deletion` heading; Trash & Archive's controls read `Confirm Before Deletion`, `Confirm Before Archiving` in that order; its text holds `Ask before archiving a page or a Set.`; the switch's `aria-checked` is `true` |
| the switch off writes confirmArchiving: false | I-2 | disk: after a press on the switch, `settings.json`'s `personalization.confirmArchiving` is `false` |
| with the switch off, Archive asks nothing and still posts its Undo | I-3 | DOM and disk: Archive on `Arc Page` raises no `alertdialog` for 1500 ms, the bundle stands, the notice reads `Archived “Arc Page”Undo`; its Undo brings the page back |
| a Set's menu holds Rename alone and closes on Archive above Delete | I-1 | native rows: on `Arc Set`'s sidebar row, `Rename`'s group holds nothing else; the last three rows are `{ separator }`, `Archive`, `Delete` |
| with the switch off, a Set archives unasked | I-2 | DOM and disk: no `alertdialog` for 1500 ms; the `__Arc Set.archived` bundle holds `Arc Set/_pageset.json`; `Collection A/Arc Set` is gone from disk and the sidebar; the notice reads `Archived “Arc Set”Undo`; its Undo returns the folder to disk and the sidebar, between its seeded neighbours in `set_order` |
| with the switch on, a Set asks | I-2 | DOM and disk: the switch pressed back on reads `aria-checked="true"` and leaves `confirmArchiving` absent; Archive on `Arc Set` asks `Archive “Arc Set”?`; after Cancel the folder stands and no bundle exists |
| a Collection's menu closes on Delete alone, which still asks | I-1 | native rows and DOM: Collection A's sidebar menu holds no `Archive` and ends `{ separator }`, `Delete`; its Delete asks `Delete “Collection A”?`; after Cancel its sidecar is byte-equal |
| Archive History Timeframe follows History Timeframe until picked | J-1 §Copy | DOM and disk: with History Timeframe at 30 through its picker, File History's controls read `History Timeframe`, `Archive History Timeframe` in that order; its text holds `How long archived pages keep their snapshots; it follows 'History Timeframe' until set, and never exceeds it.`; the archive picker reads `30 Days`; personalization has no `archiveHistoryDays` |
| steps above History Timeframe show dimmed and can't be picked | J-1 | DOM and disk: in `[data-picker-portal]`, `7 Days`, `14 Days`, and `30 Days` carry `role="button"` and `60 Days` and `90 Days` don't; a press on `90 Days` writes no `archiveHistoryDays`; Escape closes the list |
| a pick stores, and a typed value clamps to History Timeframe | J-1 | disk and DOM: picking `14 Days` writes `archiveHistoryDays: 14`; a right press, `60` typed, and Enter write 30, the picker reading `30 Days` |
| shortening History Timeframe switches the archive timeframe down in one write | J-1 | disk and DOM: under `watch`, picking History Timeframe `7 Days` lands one `settings.json` write holding `historyDays: 7` and `archiveHistoryDays: 7`; the archive picker reads `7 Days` once the host's echo lands |
| lengthening History Timeframe leaves the pick where it is | J-1 | disk and DOM: picking History Timeframe `60 Days` leaves `archiveHistoryDays` at 7, the archive picker reading `7 Days` and its list dimming `90 Days` alone |

#### Pruned

- **The write order, a case-only rename, the single watcher restart, nesting, an entry naming no folder, and the corrupt-settings refusals:** none is visible, and `mutate.test.ts` and `settings.test.ts` pin each.
- **The system Trash Mode:** the drive would leave its Set in the macOS Trash; `mutate.test.ts` pins the lift under it.
- **The Trash browser's Restore in group 1:** group 1 restores through `mutate`; group 2 drives today's browser through Restore and Restore All, and the groups after Phase 5 drive the rebuilt one.
- **The NavView sidebar search in group 3:** it reads the same tree `nexus:state` answers and has no driven path in the harness (the Path Links Drive's `pending` at `:786`).
- **Link suggestions in group 3:** they read the renderer's `pageIndexOf(tree)`, which the tree check covers.
- **Context and Space cascades into the Archive in group 3:** they ride the content reach the link rename proves (`queryMembers ?? nexusCorpus`, `contextCascade.ts:72`), and vitest pins them.
- **Sync Now riding the timed label in group 5:** the harness runs no sync hub; `NexusRows` reads the `useTimedLabel` the Clear History check proves.
- **File History's batch offering Delete All alone in group 5:** two snapshots need two saves a Snapshot Interval apart; `restoreMenu.test.ts` pins the rows and `actedOn` the batch.
- **A delete under the system Trash Mode naming the system trash in group 5:** the Trash Mode is device configuration the harness doesn't write; `confirmations.test.ts` pins the detail.
- **The archive timeframe's sweep in group 6A:** the snapshot store is device-local and a snapshot's age can't be driven without faking time; `fileHistory.test.ts` and the store contract pin the sweep.
- **The archive refusal in group 6A:** `Only pages and Sets inside a Collection can be archived.` needs a Collection whose id isn't ULID-shaped, which nothing in-app writes; `archive.test.ts` pins its copy, and the menu reaches it through `mutate`'s `reportRefusal`.
