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

#### Pruned

- **The write order, a case-only rename, the single watcher restart, nesting, an entry naming no folder, and the corrupt-settings refusals:** none is visible, and `mutate.test.ts` and `settings.test.ts` pin each.
- **The system Trash Mode:** the drive would leave its Set in the macOS Trash; `mutate.test.ts` pins the lift under it.
- **The Trash browser's Restore:** Phase 2 renames its channel and Phase 5 rebuilds the browser, so group 1 restores through `mutate` and later groups drive the browser in its final form.
