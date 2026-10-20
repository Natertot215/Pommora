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

The run's prologue saves and shows `Drive Table`, a table view of its own on Collection A, since Collection A's one saved view draws cards; the harness's restore takes it back. Seeds, with the app closed and before a relaunch, so the open's seed reads the Archive as its second root: `Drive Stage` (a Select with `Draft`, added through `schema:add` on Collection A before the quit, its draft's `id` empty as `propertyDraft` requires, `Core/Properties/properties.ts:161`, `:198-200`); `Collection A/Set Alpha/Drive Live.md` holding `Drive Stage: Draft`; `Drive Linker.md` beside it, its body `[[Drive Arc]]`; `Collection A/Drive Odd.md` carrying a task-marked ID, which the tree withholds; and the archived page `.nexus/archive/<Collection A's id>/Collection A/Set Alpha/2026-10-20T12-00-00-000Z__Drive Arc.md.archived/Drive Arc.md` with its `_record.json`, holding `Drive Stage: Draft`, `## Drive Heading`, and `[[Drive Live]]`. The group removes its seeds and empties the deleted property's bundle before it ends, leaving nothing behind; the harness restores `~/Test` when the run ends.

| Check | Decision | Asserts |
| --- | --- | --- |
| the tree holds the live pages and never the archived one | D-2 | `nexus:state`'s tree |
| Collection A's view search for Drive lists Drive Live and never Drive Arc | D-2 | DOM: `.data-row[data-rid]` |
| a link naming the archived page draws unresolved | D-1 | DOM: `md-connection-phantom` on Drive Linker's line |
| the Matrix graph holds the live page and the one the tree withholds, and no archived page or edge | K-2 | `matrix:graph` reply |
| the Matrix graph asked for the archived path answers no id | K-2 | `matrix:graph` reply |
| the headings answer no archived path, whole or asked by path | K-2 | `index:headings` reply |
| Collection A's value load reads the tree's pages, never the archived one or one the tree withholds | K-2 | `view:loadValues` reply |
| the delete confirmation’s count leaves the archived holder out | C-4 | `property:holders` reply is 1 |
| an option rename rewrites the archived page as it rewrites the live one | C-1 | disk: both frontmatters read `['Final']`, the one-item list the option cascade writes (`replaySchemaCascade.test.ts:523`) |
| renaming Drive Live re-spells the archived page's link | C-1 | disk: the archived body reads `[[Drive Live 2]]` |
| the property delete strips the archived page as it strips the live one | C-2 | disk: neither frontmatter holds `Drive Stage` |
| the group leaves Collection A’s Archive and the Trash as it found them | — | the seeds removed from outside, `Drive Stage`'s bundle emptied under `permanentDelete` (then off again); `bundles:list` answers no archived row and no `Drive Stage` row |

**Pruned:** the NavView sidebar search, which reads the same tree `nexus:state` answers and has no driven path in the harness (the Path Links Drive's `pending` at `:786`); link suggestions, which read the renderer's `pageIndexOf(tree)` and are covered by the tree check; Context and Space cascades into the Archive, which ride the content reach the link rename proves (`queryMembers ?? nexusCorpus`, `contextCascade.ts:72`) and are pinned in vitest.

#### Pruned

- **The write order, a case-only rename, the single watcher restart, nesting, an entry naming no folder, and the corrupt-settings refusals:** none is visible, and `mutate.test.ts` and `settings.test.ts` pin each.
- **The system Trash Mode:** the drive would leave its Set in the macOS Trash; `mutate.test.ts` pins the lift under it.
- **The Trash browser's Restore in group 1:** group 1 restores through `mutate`; group 2 drives today's browser through Restore and Restore All, and the groups after Phase 5 drive the rebuilt one.
