### Scout 4 — Interface & Renderer

**Base:** `active` at `776f3ea94`, read-only; cleaned against *Trash & Archive Restructure — Investigation* on 10-29-2026 under Decision B-1 through 37. The inventory, the behavior to preserve, and the test notes are this scout's own; every finding is stated once in the Investigation, and this report maps each to it.

**What Moved Since `15fe7422a`:** nothing in `Core/Bundles/browser.ts`, `BundleTable.tsx`, `bundle-table.css`, `rows.ts`, `handlers.ts`, `Core/Settings/TrashFrame.tsx`, `trash-frame.css`, `SettingsWindow.tsx`, `Core/Archive/ArchiveView.tsx`, `archive-view.css`, `confirmations.ts`, `notifications.ts`, `nexusSlice.ts`, `mutateRequest.ts`, `Core/Trash/handlers.ts`, `bridge.ts`, or this domain's tests. `Desktop/main.ts:301` is now `:304`; `frames.ts`'s Trash & Archive group is `:636-664`, I-079's caption `:643`, and the Trash frame `:946-952`; `record.ts:14`'s docstring lost its temp-sibling clause. **What Reach-In Changes Here:** nothing. The only renderer-side destination is `ARCHIVE_UNDO`, which M-13 removes under any model; the homeless-row ask reads the live tree and the host-computed `homeResolves` (`rows.ts:134,146`); `rulesOf` keeps `{ deleteOp, askDelete }`, a real per-store difference; and no stale-row guard exists to remove, since the host refuses a gone bundle (`bundle.ts:233`; `spend.ts:136-137`) and a gone row's check drops at the next listing (`keepsCheck`, `browser.ts:96-106`). `bundles:list` and `bundles:children` already pass `byId` into `resolveRecord` (`Bundles/handlers.ts:27,37`), and `heldElsewhere` already exempts every path inside the restoring bundle, so `rows.ts` needs no change.

#### 1. Inventory

##### `Core/Bundles/browser.ts` (546 Lines): The Renderer Half

| Symbol | Line | Job | Callers |
| --- | --- | --- | --- |
| `steppedTo` | 41 | `“T” as “L”` phrase for a stepped-aside restore | `restoreOne` 393, `many` 443 |
| `filterRows` | 44 | Search narrows rows in place | `useBundleBrowser` 335; `browser.test.ts:17` |
| `crumbSegments` | 50 | Crumbs → `TrailSegment[]` with kind glyphs | `BundleTable.tsx:204`, `ArchiveView.tsx:38` |
| `archivedKind` | 60 | Coerces any non-Set row kind to `'page'` for an Archive delete | `requestOf` 119 |
| `TreeRow` / `treeRows` / `OpenRows` | 63-73 | Top rows plus open inner rows, with depth and open state | hook, `BundleTable.tsx` |
| `outermostOf` / `reachedOver` / `keepsCheck` | 86 / 90 / 96 | Batch roots; open entries a listing no longer reaches; checks surviving a re-list | hook |
| `ARCHIVE_UNDO` | 108 | `{ kind: 'archive' }`, the Archive delete's Undo destination | `rulesOf` 256 |
| `BundleOp` / `requestOf` | 110 / 113 | Op + row → request | `restoreOne` 387, `deleteOne` 403, `many` 436 |
| `DestinationKind`, `destinationKind`, `destinationTargets`, `askDestination` | 123-142 | Where a homeless row may go, and the one ask for it | `restoreOne`, `restoreBatch`, `openMenu` |
| `Undone` / `undoneOf` / `rearchive` | 145 / 148 / 152 | An Archive restore's Undo: re-sends the reply's `archive` request, re-found by id over `nodesByIdOf` (155-157) and renamed if needed | `rulesOf` 255; `restoreOne` 390, `many` 445 |
| `DateKey`, `WIDEST_AT`, `DAY_MS`, `widestDate` | 170-185 | The widest date sample a style writes | `useDateColumn` 201 |
| `useDateColumn` | 188 | Date column: stored style, heading right-click pick, measured width; repeats the pick path `pickedStyle` wraps (`useColumnStyles.ts:35-42`) | hook 286 |
| `rulesOf` | 236 | Per-store differences: date key, delete op, delete ask, the two Undos | hook 285 |
| `Listing` | 261 | `loading`, `failed`, or `ready` | both `footing()`s |
| `useBundleBrowser` | 264 | The hook: listing, disclosure, checks, clicks, flight guard, single and batch restore and delete, menu | `TrashFrame.tsx:22`, `ArchiveView.tsx:43` |
| ↳ `restoreOne`, `deleteOne`, `many`, `restoreBatch`, `deleteBatch` | 383-497 | Single twins beside the batch; `many` sends one request per row (436) and emits `storesChanged` once (447) | internal; ArchiveView's bar |

##### `Core/Bundles/rows.ts` (184), `BundleTable.tsx` (221), `bundle-table.css` (34), `handlers.ts` (49)

`BundleRow.stored` is set for any page or Set with an id in either store (`rows.ts:143-145`), its doc naming two uses (`:41`). `BundleTable` (33) sizes its tracks from `date.width`; `DateHeading` 56; `BundleRows` 83 (virtual window, LineZone keyboard, the dummy `lineList` at 106); `BundleRowView` 139; the row menu opens only on pointer (177, I-080). `bundles:list` 20 (refuses `within` on the Trash, 24-25) and `bundles:children` 34; bridge entries at `bridge.ts:197-201`.

##### The Skins

- **`Core/Settings/TrashFrame.tsx` (80) + `trash-frame.css` (80):** remounts its body per Nexus (`key`); its own SearchField, a hand-rolled heading (51-68) with its own glyph class, its own scroller, a `footing()` (26-42); imports `../Navigation/nav-list.css` (11) for `.nav-search-row`; mounted from `frames.ts:946-952`.
- **`Core/Archive/ArchiveView.tsx` (115) + `archive-view.css` (8):** search from the tab's `viewSearch` (27); `open` → reader (31-42); `archiveId` with `?? owner.id` (30); a bar through `useStableApi` + `useDeclareActions` (49-58); `usePublishCount` (59); a `footing()` (61-77); a heading on TableView's `col-header`/`col-header-icon` (89-108).
- **`Core/Archive/archivePlace.ts` (4):** `ARCHIVE_TITLE`, `ARCHIVE_ICON`; callers `ArchiveView.tsx:82`, `crumbs.ts:101,103`, `ViewFrame.tsx:195,199`, `treeIndex.ts:133`; the Trash's equivalents are literals (`frames.ts:948-949`).

##### Commands, Asks, and Notices

- **`Core/Actions/restoreMenu.ts`:** `restoreMenuItems`; callers `browser.ts:518`, `PageReaderWindow.tsx:208`.
- **`Core/Actions/pageMenu.ts:41-43`:** `ARCHIVE_ROW`, `DELETE_ROW`, `REMOVAL_ROWS`, shared by page rows (`:107,135`) and Set rows (`entityMenu.ts:79`): one row set, two dispatchers (`pageMenuActions.ts:66-71`, `entityMenuActions.ts:113-118`).
- **`confirmations.ts`:** `DELETE_FACTS_FALLBACK` 12, `deleteQuestion` 30, `ALWAYS_ASKS` 34, `waived` 41, `armed` 45, `spendUndo` 48, `offerUndo` 54 (its restore at 64 is non-quiet), `askTrashing` 73, `confirmDelete` 89, `offerDeleted` 113, `confirmArchive` 126, `askEmptyTrash` 229 (never reads the waiver, I-079).
- **`notifications.ts`:** `useDeclareActions` 41-48 (gates on `useHostShown()`), `ActionBar` (only declarer `ArchiveView`), `post` 56-59 (one notice at a time), `warnCascade` 81, `unrestoredLine` 106, `notifyOutcome` 110, `notifyDeleted` 130, `notifyUndoable` 153.

##### Settings, Trash Mode, Contract, and Session

- **Settings:** `frames.ts:636-664` (four toggles); `personalization.ts:192-199` (`permanentDelete`, `confirmDeletion`, `confirmArchiving`, `restoreLinksOnDeletion`, `trashColumnStyle`, `archiveColumnStyle`).
- **Trash Mode (Leaves Under L-1):** `trashMode.ts`; `delete:facts` (`Core/Trash/handlers.ts:8-20`, null-root arm 16-18); `appConfig.ts:6,14,20,43`; `main.ts:304`; renderer readers `askTrashing` (75, `trashMode`) and `askEmptyTrash` (230, `permanentDelete`).
- **`mutateRequest.ts`:** `MutateOutcome` 15-30 (`bundled` 20-21, `unrestored` 23, `landedAs` 25, `undo` 27), `undoOf` 35-36, `restoreDestination` 49-53, ops 96-106, `changesStores` 201-209.
- **`nexusSlice.ts`:** `storesChanged` 83; `mutate` 248-289 (`quiet` 259-260, the slice's notices 268-279, store emit 281). Other `storesChanged` consumers: `browser.ts:331` and `PageReaderWindow.tsx:325`.

#### 2. Findings, as the Investigation Holds Them

- **Three Undo Shapes, `undoTo`, `deleteOne`'s Hand-Rolled Flow, `archivedKind`:** M-13, L-6, M-14, L-7.
- **`MutateOutcome.undo` Already the Shape; Bundle Ops the Exception:** M-13.
- **Two Renderer Ways to Follow an Item by ID:** *§Approaches Worth Weighing*, 3; the renderer retarget through a Set-covering sibling of `livePagePath` matches `assignValue`'s `atPageNow` (`assignValue.ts:95-98`).
- **Two Notice Owners, Single Versus Batch, `quiet`'s One Caller, the Undo's Own Restore:** M-14 and B-4; M-14 covers the Undo's restore, or one notice owner still leaves two.
- **Two `footing()`s, the Date Column in the Hook, `DateKey`, `DRAG_SURFACES`:** M-15, re-estimated at about −20 to −30, since both looks stay (Decision C-7) and the headings differ in glyph, labels, alignment, and the Trash's reach-back CSS (`trash-frame.css:30-61` against `archive-view.css:2-4`).
- **`delete:facts` Bundling Two Facts, Two Freshness Readings, the Skins' Two Homes:** L-1 and P-6.
- **`BundleRow.stored` With One Reader:** M-13.
- **`?? owner.id`, the Dummy Drag Engine, the Kit Naming Its Consumers:** L-7; *§What Becomes False*; I-080.
- **B-4, B-5, I-079, I-080:** as the Investigation states them.
- **I-033 Under Reach-In:** its cause dissolves; no batch channel is added (*§What Becomes False · Issues*).
- **Recognition Has No Renderer Signal:** *§The Trash's Model · §Recognition by ID*.

#### 3. Behavior to Preserve

| Behavior | Pinned By |
| --- | --- |
| Search narrows in place, keeping store order; matches title and location | `browser.test.ts:24-55`, `ArchiveView.test.tsx:355`, `TrashFrame.test.tsx:57` |
| Empty, failed, and no-match lines, per store copy | `TrashFrame.test.tsx:195`, `ArchiveView.test.tsx:331,338,345,364` |
| A container click discloses; a second folds; descendants close with it | `browser.test.ts:220,236`, `ArchiveView.test.tsx:250`, `TrashFrame.test.tsx:513` |
| A page click checks; a double-click leaves it checked and opens it (Archive) or does nothing more (Trash) | `browser.test.ts:243`, `ArchiveView.test.tsx:193`, `TrashFrame.test.tsx:536` |
| Space checks; Enter discloses a container, opens a page in the Archive, and checks it in the Trash | `BundleTable.test.tsx:174`, `ArchiveView.test.tsx:214`, `TrashFrame.test.tsx:176` |
| Checks survive collapse and a re-list while their container is closed; a gone row drops its check | `browser.test.ts:171-213`, `TrashFrame.test.tsx:570` |
| A batch acts on outermost rows only | `browser.test.ts:110,251`, `ArchiveView.test.tsx:302` |
| Homeless rows ask once per kind; only they go there; a dismissed ask restores nothing | `browser.test.ts:256`, `TrashFrame.test.tsx:473`, `ArchiveView.test.tsx:489` |
| A right-click on a homeless row offers a destinations submenu | `browser.test.ts:277`, `TrashFrame.test.tsx:548` |
| One action in flight; an empty press does nothing | `ArchiveView.test.tsx:539,582` |
| Notices: Restored “T” / “T” as “L” / N Pages / N Renamed, unrestored and warning lines, refused counts, Try Again when owed | `TrashFrame.test.tsx:354-465`, `ArchiveView.test.tsx:402,434` |
| A Trash restore or empty spends the delete's Undo and the chord; a refused restore doesn't | `TrashFrame.test.tsx:262-299,301`; `confirmations.test.ts:291,392` |
| An Archive delete moves to the Trash with an Undo back to the Archive; an Archive restore's Undo re-archives exactly, following a rename | `ArchiveView.test.tsx:385,402`, `browser.test.ts:300-375` |
| A Nexus switch mid-batch posts nothing and emits stores once | `TrashFrame.test.tsx:498`, `ArchiveView.test.tsx:475` |
| A batch restore closes an open reader of its pages | `ArchiveView.test.tsx:601,615` |
| The date column follows the Nexus form and clock until picked, and picking the Nexus's own form unsets it | `TrashFrame.test.tsx:234,249` |
| The Archive bar declares only while shown and checked | `ArchiveView.test.tsx:375,527` |
| Asks: Delete “T”? / these N; Confirm Before Deletion waives single non-containers; Archive asks under its own switch; an empty always asks | `confirmations.test.ts:252,348,363,413,434,470` |
| The Trash re-lists per Nexus | `TrashFrame.test.tsx:217` |
| A partial mark, row icons, the chevron placement, and tree-item ARIA | `BundleTable.test.tsx:88-217` |

#### 4. Tests

1. **The shared browser is tested through three harnesses.** `browser.test.ts:119-170`, `TrashFrame.test.tsx:107-175`, and `ArchiveView.test.tsx:58-166` each stub `bundles:list`, `bundles:children`, `menu`, `mutate`, and `delete:facts`, and each define their own `rowOf`, `boxOf`, `press`, and `indentOf`; the `vi.mock(virtualRows)` line repeats (`TrashFrame.test.tsx:24`, `ArchiveView.test.tsx:22`). One harness in `Core/Testing/` would serve all three (P-9).
2. **Duplicated Cases:** homeless batch ask (`browser.test.ts:256`, `TrashFrame.test.tsx:473`, `ArchiveView.test.tsx:489`); disclosure (`browser.test.ts:236`, `TrashFrame.test.tsx:513`, `ArchiveView.test.tsx:250`); double-click (`browser.test.ts:243`, `TrashFrame.test.tsx:536`, `ArchiveView.test.tsx:193`); keyboard (`BundleTable.test.tsx:174`, `TrashFrame.test.tsx:176`, `ArchiveView.test.tsx:214`); checks across collapse (`browser.test.ts:171,183`, `TrashFrame.test.tsx:570`); outermost (`browser.test.ts:110,251`, `ArchiveView.test.tsx:302`); inner trail (`TrashFrame.test.tsx:584`, `ArchiveView.test.tsx:285`, both echoing fixture crumbs shaped at `rows.test.ts:373`); Nexus switch (`TrashFrame.test.tsx:498`, `ArchiveView.test.tsx:475`); search hides the checked row (`TrashFrame.test.tsx:57`, `ArchiveView.test.tsx:527`); checkbox (`TrashFrame.test.tsx:44`, `BundleTable.test.tsx:198,217`).
3. **Shared behavior pinned through one skin:** the batch-notice and Undo-spend cases (`TrashFrame.test.tsx:262-498`) and the date-column cases (`:225-283`) exercise the hook and `useDateColumn` but live in the Trash skin's file; skin tests keep only skin-specific facts.
4. **Implementation Pins:** `confirmations.test.ts:275` pins the dead `undoTo`; the two `indentOf`s read different DOM paths for the same measure (`TrashFrame.test.tsx:131`, `ArchiveView.test.tsx:111`); `TrashFrame.test.tsx:196-199` pins `.trash-empty`'s parent and sibling class order and `pickFromDateMenu` targets `.trash-head-date` (226), both breaking under M-15 by design; `browser.test.ts:58-79` pins `widestDate`'s sample rather than the column's measured outcome; `browser.test.ts:300-375` pins `rearchive`'s id lookup, replaced under M-13.
