### Scout 5 — Interface & Renderer

**Base:** `active` @ `15fe7422a`, read-only; cleaned against *Trash & Archive Restructure — Investigation* on 10-28-2026 under Decisions 10 through 14. The inventory, the behavior to preserve, and the test notes are this scout's own; every finding is stated once in the Investigation, and this report maps each to it. Corrected claims are marked **Corrected**.

**Grounding Check:** holds. Both skins draw from one hook (`Core/Bundles/browser.ts:264`) and one table (`Core/Bundles/BundleTable.tsx:33,83`); the Trash can't host an action bar (`notifications.ts:41-47`, `contentHost.ts:15-18`); Trash Mode has no setter, and Decision 14 removes it; `confirmDelete`'s `undoTo` has no production caller; and the split notice ownership drops an archive's cascade warning (B-4).
#### 1. Inventory

##### `Core/Bundles/browser.ts` (546 lines): The Renderer Half

| Symbol | Line | Job | Callers |
| --- | --- | --- | --- |
| `steppedTo` | 41 | `“T” as “L”` phrase for a stepped-aside restore | `restoreOne` 393, `many` 443 |
| `filterRows` | 44 | Search narrows rows in place | `useBundleBrowser` 335; exported for `browser.test.ts:17` |
| `crumbSegments` | 50 | Crumbs → `TrailSegment[]` with kind glyphs | `BundleTable.tsx:204`, `ArchiveView.tsx:38` |
| `archivedKind` | 60 | Coerces any non-Set row kind to `'page'` for an Archive delete | `requestOf` 119 |
| `TreeRow` / `treeRows` | 63 / 73 | Top rows plus open inner rows, with depth and open state | `reachedOver` 91, hook 338; `BundleTable.tsx` (type) |
| `OpenRows` | 70 | Open map: address → inner rows, or null while pending | Internal |
| `outermostOf` | 86 | Drops rows whose ancestor is in the same batch | Hook 341, 513 |
| `reachedOver` | 90 | Prunes open entries a new listing no longer reaches | `refresh` 318 |
| `keepsCheck` | 96 | Which checks survive a re-list | `refresh` 324 |
| `ARCHIVE_UNDO` | 108 | `{ kind: 'archive' }`, the Archive delete's Undo destination | `rulesOf` 256 |
| `BundleOp` / `requestOf` | 110 / 113 | Op + row → request (Archive delete by path; restore or empty by bundle) | `restoreOne` 387, `deleteOne` 403, `many` 436 |
| `DestinationKind`, `destinationKind`, `destinationTargets`, `askDestination` | 123-142 | Where a homeless row may go, and the one ask for it | `restoreOne`, `restoreBatch`, `openMenu` |
| `Undone` / `undoneOf` / `rearchive` | 145 / 148 / 152 | An Archive restore's Undo: re-sends the reply's `archive` request, re-found by id and renamed if needed | `rulesOf` 255; `restoreOne` 390, `many` 445 |
| `DateKey`, `WIDEST_AT`, `DAY_MS`, `widestDate` | 170-185 | The widest date sample a style writes | `useDateColumn` 201; `widestDate` exported for tests |
| `useDateColumn` | 188 | Date column: stored style, heading right-click pick, measured width | Hook 286 → `browser.date` → `BundleTable`, `DateHeading`, `BundleRows` |
| `rulesOf` | 236 | Per-store differences: date key, delete op, delete ask, the two Undos | Hook 285 |
| `Listing` | 261 | `loading`, `failed`, or `ready` | Both skins' `footing()` |
| `useBundleBrowser` | 264 | The hook: listing, disclosure, checks, clicks, flight guard, single and batch restore and delete, menu | `TrashFrame.tsx:22`, `ArchiveView.tsx:43`, `browser.test.ts` |
| ↳ `disclose`, `rowClick`, `flight`, `restoreOne`, `deleteOne`, `many`, `restoreBatch`, `deleteBatch`, `restore`, `remove`, `openMenu` | 347-531 | The hook's internals | Internal; `restore` and `remove` also called from ArchiveView's bar (`ArchiveView.tsx:49-52`) |

##### `Core/Bundles/rows.ts` (184): Host-Run Row Shaping

`BundleCrumb` 16, `BundleRow` 22, `frozenCrumbs` 48, `liveCrumbs` 55, `matched` 70 (also `Testing/fixtures.ts:37`), `bundleRowOf` 76, `bundleCrumbs` 107, `artifactRow` 118, `innerRows` 152, `bundleRows` 174. Called by `Bundles/handlers.ts:32,44`. `BundleRow.stored` is set for any page or Set with an id in either store (`rows.ts:143-145`), the Trash included.

##### `Core/Bundles/BundleTable.tsx` (221) + `bundle-table.css` (34)

`ROW_H` 30; `BundleTable` 33 (grid tracks from `date.width`); `DateHeading` 56; `RowApi` 78; `BundleRows` 83 (virtual window, LineZone keyboard); `rowIcon` 132; `BundleRowView` 139. The CSS lays out the row window, title, trail, partial mark, and date. Callers are the two skins.

##### `Core/Bundles/handlers.ts` (49)

`storeFrom` 13; `bundles:list` 20 (refuses `within` on the Trash, 24-25); `bundles:children` 34. Bridge entries are at `Core/Contract/bridge.ts:197-201`.

##### The Skins

- **`Core/Settings/TrashFrame.tsx` (80) + `trash-frame.css` (80):** `TrashFrame` 15 remounts its body per Nexus (`key`). `TrashBody` 20 holds its own SearchField, a hand-rolled heading (52-67), its own scroller and Scrollbar, and a `footing()` (26-42). It imports `../Navigation/nav-list.css` (`TrashFrame.tsx:11`) for `.nav-search-row`. Mounted from `Settings/frames.ts:947-952`.
- **`Core/Archive/ArchiveView.tsx` (115) + `archive-view.css` (8):** It gets its search from the tab's `viewSearch` (27), `open` → reader (31-42), `archiveId` with an `?? owner.id` fallback (30), a bar through `useStableApi` + `useDeclareActions` (49-58), `usePublishCount` (59), a `footing()` (61-77), a heading on TableView's `col-header`/`col-header-icon` (89-108), and InterfaceScaffold's scroller (85).
- **`Core/Archive/archivePlace.ts` (4):** `ARCHIVE_TITLE`, `ARCHIVE_ICON`. Callers: `ArchiveView.tsx:82`, `Interface/Subfield/crumbs.ts:101,103`, `Views/Settings/ViewFrame.tsx:195,199`, `Nexus/treeIndex.ts:133`. The Trash's equivalents are literals (`Settings/frames.ts:948-949`).

##### Commands and Asks

- **`Core/Actions/restoreMenu.ts` (26):** `restoreMenuItems`. Callers: `browser.ts:518` and `PageReaderWindow.tsx:208` (History, `restoresBatch: false`).
- **`Core/Actions/pageMenu.ts:41-43`:** `ARCHIVE_ROW`, `DELETE_ROW`, `REMOVAL_ROWS`, shared by page rows (`PAGE_ACTION_ROWS` 104-108) and Set rows (`entityMenu.ts:79`). The two verbs aren't defined in parallel: one row set, two dispatchers (`Interface/Menus/pageMenuActions.ts:66-71`, `entityMenuActions.ts:113-118`).
- **`Core/Interface/Confirm/confirmations.ts`:** `DELETE_FACTS_FALLBACK` 12, `deleteQuestion` 30, `ALWAYS_ASKS` 34, `waived` 41, `armed` 45, `spendUndo` 48, `offerUndo` 54, `askTrashing` 73, `confirmDelete` 89, `offerDeleted` 113, `confirmArchive` 126, `askEmptyTrash` 229. Callers are in the inventory greps: the browser for `askEmptyTrash`, `askTrashing`, `offerDeleted`, `offerUndo`, and `spendUndo`; the menu dispatchers and `PropertyFrame.tsx:246` for `confirmDelete`/`confirmArchive`.
- **`Core/Interface/Notifications/notifications.ts`:** `ActionBar` 29 (only declarer: ArchiveView), `warnCascade` 81, `unrestoredLine` 106 (browser, `nexusSlice.ts:268`), `notifyOutcome` 110 (browser ×3, `notifyDeleted`), `notifyDeleted` 130 (`offerDeleted`, ViewTile, deleteViewWithUndo), `notifyUndoable` 153 (`confirmArchive` among others).

##### Settings and Trash Mode

Everything Trash Mode reaches here leaves under Decision 14 (L-1); `permanentDelete` and its live read stay.

- **`Settings/frames.ts:635-665`:** four toggles. **`Settings/personalization.ts:192-199`:** `permanentDelete`, `confirmDeletion`, `confirmArchiving`, `restoreLinksOnDeletion`, `trashColumnStyle`, `archiveColumnStyle`.
- **`Core/Trash/trashMode.ts` (4):** `TrashMode`, `DEFAULT_TRASH_MODE`.
- **`Core/Trash/handlers.ts` (21):** `delete:facts`. Its null-root arm is at 16-18.
- **`Desktop/Config/appConfig.ts`:** reads `trashMode` at 14, 20, 43. `Desktop/main.ts:301` hands it to `HostContext.trashMode` (`Contract/handlers.ts:63`).
- **Renderer readers of `delete:facts`:** only `askTrashing` (75, reads `trashMode`) and `askEmptyTrash` (230, reads `permanentDelete`).

##### Contract and Session

- **`Nexus/mutateRequest.ts`:** `MutateOutcome` 15-30 (`bundled` 21, `unrestored` 23, `landedAs` 25, `undo` 27), `restoreDestination` 49-53, ops at 96 (`delete`), 98-104 (`archive` with `back`), 105 (`restore`), 106 (`emptyBundle`); `changesStores` 201-209.
- **`Session/nexusSlice.ts`:** `storesChanged` 83; `mutate` 248-289 (`quiet` 260/267, the slice's success notices 268-279, the op-list exclusion 270, store emit 281); `finishOwed` 290.
- **Other `storesChanged` consumers:** `browser.ts:331,447` and `PageReaderWindow.tsx:325` (ArchiveReader).

---

#### 2. Findings, as the Investigation Holds Them

- **Three Undo Shapes (§2.1), Two Delete Flows (§2.2):** confirmed; M-13, L-6.
- **Three Notice Builders (§2.3) and Two Notice Owners (§4.3):** confirmed; B-4 and M-14.
- **Single Versus Batch (§2.4):** confirmed; M-14.
- **Two `footing()`s, Two Headings, the Date Column Split (§2.5, §2.6, §3.1, §3.2):** confirmed; M-15, with the visual deltas in *§Questions for Nathan*, 5.
- **`useDateColumn` Versus `useColumnStyles` (§2.7):** confirmed as a small parallel (about −8, inferred); not carried as its own ledger item.
- **`DateKey` (§2.8):** confirmed; M-15.
- **Two Trash-Mode Fallbacks (§2.9), `delete:facts` Bundling Two Facts (§3.5), the Fallback Guard (§4.6):** under Decision 14 the `trashMode` half leaves (L-1), and `delete:facts` narrows to `permanentDelete`, read at the moment of asking for the reason `bridge.ts:202` states (P-6).
- **`SettingsWindow` Naming the Frame's Classes, `ActionBar`'s Name, the Skins' Two Homes, the Borrowed Stylesheet (§3.3, §3.4, §3.6, §3.7):** confirmed; M-15 and P-6.
- **`confirmDelete.undoTo` (§4.1):** confirmed dead; L-6.
- **Trash Mode Has No Setter (§4.2):** confirmed; removed by Decision 14 (L-1).
- **`archivedKind` (§4.4), `?? owner.id` (§4.5):** confirmed; M-13 and L-7.
- **`BundleRows`' No-Op Drag Engine (§4.7):** confirmed; the repo's only `lineList` with dummy `commit`, `label`, and `watch`; carried with I-078 and I-080 in *§What Becomes False · Issues*.
- **The Kit Naming Its Consumers (§4.8):** confirmed; *§What Becomes False*.
- **Reach-In Implications (§5):** confirmed; the renderer barely depends on the Trash's model.
- **Proposals (§6):** 1 → M-13; 2 → M-14; 3 → M-15; 4 → settled by Decision 14 (L-1); 5 → L-6, L-7; 6 → I-078 and I-080; 7 → I-079; 8 → P-6.
- **Questions (§9):** 1 → Decision 14; 2 → *§Questions for Nathan*, 5; 3 (separate date-column styles) stays as it is, since sharing one would change behavior; the risks → M-13 and M-14.
#### 7. Behavior to Preserve

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

---

#### 8. Tests

1. **The shared browser is tested through three harnesses.** `browser.test.ts:119-170`, `TrashFrame.test.tsx:107-175`, and `ArchiveView.test.tsx:58-166` each stub `bundles:list`, `bundles:children` (the same `children[address] ?? []` map), `menu`, `mutate`, and `delete:facts`, and each define their own `rowOf`, `boxOf`, `press`, and `indentOf`. The `vi.mock(virtualRows)` line repeats too (`TrashFrame.test.tsx:24`, `ArchiveView.test.tsx:22`). One harness in `Core/Testing/` would serve all three.
2. **Duplicated cases:**
   - Homeless batch ask: `browser.test.ts:256`, `TrashFrame.test.tsx:473`, `ArchiveView.test.tsx:489`.
   - Disclosure: `browser.test.ts:236`, `TrashFrame.test.tsx:513`, `ArchiveView.test.tsx:250`.
   - Double-click leaves checked: `browser.test.ts:243`, `TrashFrame.test.tsx:536`, `ArchiveView.test.tsx:193`.
   - Keyboard: `BundleTable.test.tsx:174`, `TrashFrame.test.tsx:176`, `ArchiveView.test.tsx:214`.
   - Checks across collapse: `browser.test.ts:171,183`, `TrashFrame.test.tsx:570`.
   - Outermost: `browser.test.ts:110,251`, `ArchiveView.test.tsx:302`.
   - Inner trail: `TrashFrame.test.tsx:584`, `ArchiveView.test.tsx:285`. Both only echo fixture crumbs; the shaping is pinned host-side at `rows.test.ts:373`.
   - Nexus switch: `TrashFrame.test.tsx:498`, `ArchiveView.test.tsx:475`.
   - Search hides the checked row: `TrashFrame.test.tsx:57`, `ArchiveView.test.tsx:527`.
   - Checkbox: `TrashFrame.test.tsx:44`, `BundleTable.test.tsx:198,217`.
3. **Shared behavior is pinned through one skin only.** The batch-notice and Undo-spend cases (`TrashFrame.test.tsx:262-498`) and the date-column cases (`TrashFrame.test.tsx:225-283`) exercise the hook and `useDateColumn` but live in the Trash skin's file. They belong with the browser; skin tests should keep only skin-specific facts (headings, copy, bar, reader, search source, Nexus remount).
4. **Implementation pins:**
   - `confirmations.test.ts:275` pins the dead `undoTo`.
   - The two `indentOf`s read different DOM paths for the same measure (`TrashFrame.test.tsx:131` reads `.bundle-title`; `ArchiveView.test.tsx:111` reads `.cell-title`'s parent).
   - `TrashFrame.test.tsx:196-199` pins `.trash-empty`'s parent and sibling class order, and `pickFromDateMenu` targets `.trash-head-date` (226). Both break under §6.3 by design.
   - `browser.test.ts:58-79` pins `widestDate`'s sample construction rather than the column's measured outcome.
5. **The single-file Undo test** (`browser.test.ts:300-375`) pins `rearchive`'s id lookup and rename rewrite. It moves host-side under §6.1.

---
