#### Write × Model Grid

**Re-grounded:** 09-30-2026 at `d7d00240d`

**Legend:**
- **File Abbreviations:** MP `Core/Nexus/mutatePatch.ts` · WP `Core/Nexus/watchPatch.ts` · TP `Core/Nexus/treePatch.ts` · CF `Core/Nexus/confirm.ts` · NH `Core/Nexus/handlers.ts` · NS `Core/Session/nexusSlice.ts` · VC `Core/Nexus/valuesChanged.ts` · AW `Core/Files/atomicWrite.ts` · GW `Core/Properties/governedWrite.ts` · GS `Core/Properties/governedSweep.ts` · FE `Core/Nexus/folderEntity.ts` · CW `Core/Contexts/contextWrite.ts` · CC `Core/Contexts/contextCascade.ts` · CR `Core/Nexus/configReach.ts`.
- **LG:** The sidecar-ledger flush that runs inside every `confirmBy` (MP:221-225).
- **push:** The whole tree, sent CF:13-15 → `useBridgeSubscriptions.ts:46` → `applyTree` (NS:186-201). This is the only way anything reaches the window store tree, so that column says "push" wherever the host tree moved.
- **Echo AW:14:** A record with bytes, made by `atomicWriteFile`. Every `writeJson` and every RMW ends there. "path" means a record without bytes.
- **forgetParse:** Only AW:26 (`rewritePreservingTimes`) and AW:38 (`landBytes`) call it. Every other write relies on the `(mtime,size)` check plus the racy window (`walkCache.ts:44-49`).
- **Op Count:** `MutateRequest` has **31** ops, not 34 (mutateRequest.ts:59-108).

| # | Row | Host tree | Index | Win tree | Win optimistic | values ledger | pages: | tiles: | assets: | forgetParse | Echo |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | createPage | MP:57→TP:262; pin MP:166; seed re-read MP:169 | create.ts:66; seed GW:41 | push | NS:286 (only with `onCreated`) | create.ts:67; seed GW:40 | — | — | — | — | pageFile.ts:164→AW:14 |
| 2 | createContainer | MP:57; own-sidecar re-read MP:174; pin MP:176-178 | — | push | NS:286 (`onCreated`) | — | — | — | — | — | FE:53 path; FE:54→AW:14 |
| 3 | rename | MP:65→TP:472; adopted→walk MP:153; rescope NH:179 | rename.ts:39,45; folder FE:34 | push | NS:252 | cascade GS:88 | NH:177 | NH:178 | — | GS:86, tilesFile.ts:320→AW:26 | page.ts:56-57 / FE:68-69 path |
| 4 | renameHeading | MP:51 no-change | GS:89 | — | — | GS:88 | NH:177 | NH:178 | — | AW:26 | AW:14 |
| 5 | delete | page/set/coll MP:67→TP:486; Space/Context MP:119 walk; adopted parent MP:156 walk; CR:363→LG; exclusions settings.ts:77 | delete.ts:101; sweeps GS:89 | push | NS:255 (Context: none); navigationSlice.ts:677 | sweeps GS:88 | — | NH:178 | — | sweeps AW:26 | bundle.ts:39-40,80 path |
| 6 | restore | page MP:146 re-read; else MP:148 walk; rescope NH:179 | spend.ts:262 | push | — | spend.ts:263 (every landed content page) | — | — | — | — | spend.ts:249-250 path |
| 7 | emptyBundle | MP:50 no-change | — | — | — (NS:237 trash revision only) | — | — | — | — | — | spend.ts:105,124 path |
| 8 | setProfileImage | MP:143→WP:423 | — | push | — | — | — | — | NH:181 via assetWrite.ts:29 | — | AW:42; AW:14 |
| 9 | setProfileIcon | MP:143 | — | push | — | — | — | — | — | — | AW:14 |
| 10 | setBanner | page MP:132→MP:101 (no tree field); homepage MP:130; navview MP:131 'ok'; container/Space MP:132 | page GW:41 | push (not page/navview) | — (navigationSlice.ts:681) | page GW:40 | — | — | NH:181 | — | AW:14; AW:42 |
| 11 | setCrop | MP:138→WP:465 | — | push | — | — | — | — | — | — | AW:14 |
| 12 | setHeadingIconHidden | homepage MP:130; container/Space MP:132 | — | push | NS:266-272 | — | — | — | — | — | AW:14 |
| 13 | setIcon | page MP:123→WP:481; **Context MP:124→walk**; container/Space MP:124 | — | push | NS:258 (Context/page: none) | — | — | — | — | — | AW:14 |
| 14 | setDisclosureLock | MP:127→WP:360 | — | push | NS:261 | — | — | — | — | — | AW:14 |
| 15 | setActiveView | MP:127 | — | push | NS:264 | — | — | — | — | — | AW:14 |
| 16 | setProperty | MP:47 no-change; Space via CW:168→LG; **registry adoption: none** | page GW:41 | push (Space) | — | page GW:40 | — | — | — | — | AW:14 |
| 17 | setPageMeta | MP:136→WP:481 | — | push | — | — | — | — | — | — | AW:14 |
| 18 | movePage | MP:62→TP:566; source order drop move.ts:38; adopted walk; in-place/no-order→MP:161 walk | move.ts:40 | push | NS:248; a view drop paints ahead through `pendingView.ts:123-135` | move.ts:41 | — | — | — | — | page.ts:56-57 path |
| 19 | moveSet | MP:62; source order drop move.ts:66; rescope NH:179; CR:363→LG; exclusions settings.ts:77 | FE:34 | push | NS:248 | move.ts:69 (folder, no id) | — | NH:178 | — | — | FE:81-82 path |
| 20 | reorderChildren | MP:62 + pin MP:181 | — | push | NS:248 | — | — | — | — | — | AW:14 |
| 21 | reorderTop | MP:62 + pin MP:185 | — | push | NS:248 | — | — | — | — | — | AW:14 |
| 22 | createContextGroup | MP:57 | — | push | NS:286 (`onCreated`) | — | — | — | — | — | AW:14; **CW:240 mkdir unrecorded** |
| 23 | createSpace | MP:57 + pin MP:185 | — | push | NS:286 (`onCreated`) | — | — | — | — | — | FE:53; CW:258-259; CW:254 mkdir unrecorded |
| 24 | renameContext | MP:72→TP:343; GS:112→LG | GS:89 | push | NS:279 | GS:88 | — | — | — | AW:26 | CC:229-230 path |
| 25 | renameSpace | MP:72; GS:112→LG | GS:89 | push | NS:279 | GS:88 | — | — | — | AW:26 | CC:284-285 path |
| 26 | setContext | page MP:134 re-read; Space 'ok'+CW:168→LG; **registry adoption: none** | page GW:41 | push | — | page GW:40 | — | — | — | — | AW:14 |
| 27 | setSpaceColor | MP:48 no-change; CW:168→LG | — | push | NS:276 | — | — | — | — | — | AW:14 |
| 28 | reorderContexts | MP:70→TP:386 | — | push | NS:277 | — | — | — | — | — | AW:14 |
| 29 | reorderPanelContexts | MP:140→WP:443 | — | push | — | — | — | — | — | — | AW:14 |
| 30 | reorderSpaces | MP:71 + pin MP:184 | — | push | NS:278 | — | — | — | — | — | AW:14 |
| 31 | setSpaceRowOrder | MP:49 no-change; CW:168→LG | — | push | — | — | — | — | — | — | AW:14 |
| 32 | views:save/duplicate/reorder/delete/restore | Views/handlers.ts:23→CF:36-44→WP:360 | — | push | views:save only: `pendingView.ts` overlay (viewWrite.ts:42) | — | — | — | — | — | sidecar.ts:30→AW:14 |
| 33 | container:configure | CF:36-44 | — | push | — | — | — | — | — | — | AW:14 |
| 34 | schema:add/assign/reorder/unassign | CF:48→MP:204-209; sweeps/reach→LG | assign/unassign GS:89 | push | — | GS:88 | — | Properties/handlers.ts:68 | — | AW:26 | AW:14 |
| 35 | registry:reorder; property:setLinkConfig/setCheckboxColor/setIcon/setNumberFormat/setFileDirectory/editOption | CF:48→MP:204-205 | — | push | — | — | — | — | — | — | AW:14 |
| 36 | property:rename/delete/replay/renameOption/removeOption/clearOption | CF:48 + LG (CR:363, GS:112) | GS:89 | push | — | GS:88 | — | Properties/handlers.ts:68 | — | AW:26 | AW:14 |
| 37 | tiles:* (7) | — (off-tree) | — | — | `tileDocStore.ts` own copy | — | — | — (own writes never push) | — | via cascade only | tileDoc.ts:30, tilesFile.ts:85,267→AW:14 |
| 38 | personalization:set | Settings/handlers.ts:48→CF:54→WP:423 (always new root) | — | push | configSlice.ts:43-53 (tree only for `defaultIcons`) | — | — | — | — | — | AW:14 |
| 39 | page:updateBody | — | fileHistory.ts:116 | — | editor text | fileHistory.ts:117 bodyOnly; flushed Pages/handlers.ts:35 | — | — | — | — | pageFile.ts:164→AW:14 |
| 40 | history:restore | — | fileHistory.ts:116 | — | — | fileHistory.ts:117; Pages/handlers.ts:51 | — | — | — | — | AW:14 |
| 41 | editorPrefs:set, citations:set | — (KV, Interface/handlers.ts:24) | — | — | configSlice.ts:75-81 | — | — | — | — | — | — (no file) |
| 42 | nav:write | — | — | — | navigationSlice.ts:267; watcher re-read watcher.ts:93-94 | — | — | — | — | — | navigationFile.ts:50→AW:14 |
| 43 | matrix:write | — | — | — | matrixSlice.ts:191; watcher.ts:95-96 | — | — | — | — | — | matrixFile.ts:17→AW:14 |
| 44 | exclusions:set | settings.ts:77 (writer-side) then CF:58-64 walk | CF:61 | push | — | — | — | — | — | — | AW:14 |
| 45 | exclusions:clear | — | GS:89 | — | — | GS:88, **never flushed** | — | — | — | AW:26 | AW:14 |
| 46 | assets:setDir | settings.ts:77 then CF:58 walk | CF:61 | push | — | — | — | — | Assets/handlers.ts:61 | assetMigrate (AW:26) | AW:14/42 |

#### Empty Cells That Matter

1. **Registry Adoptions Reach No Copy:** Three ops call `applyAdoptions` → `addOptionToDef` → `updateNexusFile(properties.json)`: setProperty on a page (setProperty.ts:57), setContext on a page, and createPage with Context seeds (CW:130). The path runs through optionOps.ts:83-112 and propertiesRegistry.ts:81.
   - None of their confirm arms reads the registry. They are MP:47 `'no-change'`, MP:134, and MP:169.
   - The echo is dropped by bytes (writeEcho.ts:61-72, watcher.ts:158).
   - So the host tree, the push, and the window all keep the old option list until the next walk.
   - This is reachable whenever any other key on the page holds a multi-select value that isn't a registered option (contextResolve.ts:82-119, propertyValue.ts:99-109). That's the Obsidian-authored-note case.
2. **exclusions:clear Leaves Notes Behind:** It notes pages at GS:88 but never flushes them (Settings/handlers.ts:39-42). `flushValueWrites` takes every note unless given `only` (VC:128), so these notes go out with the next unrelated operation. Its `dropPageMetadata` shard writes (exclusionScan.ts:91) have no confirm at all.
3. **Unrecorded mkdirs:** CW:240 is F-205. The same pattern appears at CW:254 (createSpace's Context folder) and spend.ts:252 (restore's parent folder). An unrecorded `addDir` for a normal folder is classified full-refresh (WP:165, :168).
4. **Tree Reached, Window Only by Whole-Tree Push:** This is every row. The worst are single-field writes with no optimistic arm: setProperty (Space), setContext, setSpaceRowOrder, setPageMeta, setIcon (page), setBanner, setCrop, setProfileImage/Icon, reorderPanelContexts, and every views/schema/property/personalization row. Each pays a full `stabilize` and an index rebuild for one field (F-186).
5. **A Page Banner Re-Read Can't Carry the Fact:** MP:101 re-reads the page, but `PageNode` has no banner field (tree.ts:28-31, TP:12-14). The real consumers are `values:changed` (GW:40) and `patchPagesFor` (navigationSlice.ts:681-682), which both drop the same page detail.
6. **Space Values Bypass `values:changed`:** VC:135 resolves page paths only. Space-value writes reach the window only through `SpaceNode.values` in the tree push.
7. **No Index-Without-Tree Gaps:** renameHeading, page:updateBody, and history:restore update the index without moving the tree, and that's correct.

#### Confirm Shapes

| Class | Mutate ops | Non-mutate rows |
|---|---|---|
| (a) Pure transform | 8: rename, movePage, moveSet, delete, createContextGroup, renameContext, renameSpace, reorderContexts | 0 |
| (b) One-file re-read | 12: restore, setProfileImage, setProfileIcon, setBanner, setCrop, setHeadingIconHidden, setIcon, setDisclosureLock, setActiveView, setPageMeta, setContext, reorderPanelContexts | 0 |
| (c) Both | 6: createPage, createContainer, reorderChildren, reorderTop, createSpace, reorderSpaces | 0 |
| (d) Full walk | 0 as a primary class. Arms: delete Space/Context (MP:119), adopted parent (MP:156), restore non-page (MP:148), setIcon Context (MP:124), adopted subtree rename/move (MP:153), in-place movePage with no order (MP:161) | 0 |
| (e) No-change / ok | 5: setProperty, setSpaceColor, setSpaceRowOrder, emptyBundle, renameHeading | 14: page:updateBody, history:restore, editorPrefs:set, citations:set, nav:write, matrix:write, tiles ×7, exclusions:clear |
| (f) Separate helper | Rescope arm of rename/moveSet/restore (NH:179) | 26: views ×5 + container:configure (`confirmContainerWrite`); schema ×4 + registry:reorder + property ×12 (`confirmRegistryWrite`); personalization:set (`confirmSettingsWrite`); exclusions:set and assets:setDir (`confirmRescope`) |

The table misses two shapes:
- **Confirmed Through the Ledger:** setProperty (Space), setSpaceColor, setSpaceRowOrder, and setContext (Space) answer `'no-change'`/`'ok'` in the switch. They are really confirmed by LG (CW:168 → MP:221-225). So are every delete, moveSet, and property row that reaches other containers' views (CR:363).
- **Patched Inside the Writer:** `updateScope` patches the live tree from inside the writer (settings.ts:71-78). It's reached by exclusions:set, assets:setDir, and any rename, move, delete, or restore that moves an excluded entry (settings.ts:108, 119, 141, 152).

**Is "the Writer Normalizes" True?** Only for some writers:

| Writer | Normalizes? | Holds what it wrote? | Re-read needed? |
|---|---|---|---|
| setActiveView, views:* | Yes. Mints ids and resolves positional ones (viewsFile.ts:43-65, 127-129) | `patchSidecar` returns it (sidecar.ts:30-35); `done()` discards it (mutateRequest.ts:23) | No: decode the return value |
| Registry writes | Yes (`mutateRegistry`) | `updateNexusFile` returns it (AW:199-201) | No |
| setContext page, restore page | Yes (reconcile at GW:27-37; bundle scrub) | GW holds `content` (GW:32-39) | No |
| setPageMeta | Minor (null-drop, `clean(parse)` at pageMetadata.ts:25-33, 63-73) | Returned, then discarded at pageMetadata.ts:111 | No |
| setContext page, createPage seeds, setProperty page | Yes (governed reconcile) | `setGovernedRootKeys` holds `content` (GW:32-37) and returns only the adoptions (GW:38-42); `setPageContext` answers `ok(null)` (CW:131); `applyAdoptions` drops the registry record `addOptionToDef` wrote (optionOps.ts:104-112) | No, once the governed write returns its content and the adoption returns its registry |
| setDisclosureLock, setHeadingIconHidden, setIcon, setBanner, setCrop, setProfileImage/Icon, personalization:set, reorderPanelContexts | No. `setOrDrop` or a spread of the request value | Returned, then discarded (mutate.ts:120-124; settings.ts:21-22, 29-33) | No. The request already carries the fact |
| createContainer own sidecar (MP:173-174) | No. It reads back `{id, views:[default]}` that create.ts:82-84 built | Yes | No |
| (c) pins: createPage, reorder×3, createSpace, Collection create | Not normalization | — | Yes, **only because the tree discards the order arrays** after `resolveOrder` (containerFields.ts:37-38), and because three ranking rules disagree: `resolveOrder` (order.ts:10-27: unlisted sorted by title), `byOrder` (TP:401-406, 518: unlisted go last), and `atSlot` (TP:122-126) |

In every case the strict RMW already returns exactly what it wrote (AW:124-127), with one gap: a `mutate` that returns null yields `ok(base)` (AW:125), so a caller can't tell an unchanged file from a written one; `editJsonStrict` answers `'unchanged' | 'written'` (AW:207-219). The discard sites are the 21 `done()` calls (mutate.ts ×10, move.ts:34, :52, pageMetadata.ts:172, setIcon.ts:32, :37, setHeadingIconHidden.ts:18, :23, reorderContexts.ts:15, setProperty.ts:44, contextWrite.ts:217, :220), plus `setChildOrder` (reorder.ts:91-92), `writeSpaceSidecar` (CW:162-169), `updateSettings` and `updateCrops` (settings.ts:17-34), and `setProfileImageOp`/`setCropOp`, which answer `ok({})`. No confirm needs the disk. What they need is a writer that stops throwing its own return value away, plus order lists kept in the model.

#### The Window's Second Table

**Timing:**
- The handler waits for the whole confirm, walks included, before it replies (NH:179-182, CF:29-30).
- The push goes out one macrotask after the reply (CF:13).
- The window applies its "optimistic" patch after the reply arrives (NS:231, then 238-282).

So it beats the confirming push by one macrotask, and every patched mutation runs `applyTree` twice. The switch has 15 case labels (NS:243-280), plus a create insert (NS:286-295) that runs only when a caller passes `onCreated`.

**Disagreements:**
1. **Order Ops:** Both processes route movePage, moveSet, reorderChildren, and reorderTop through one `orderInTree` (TP:566-576; host MP:58-62, window NS:244-248), since `47c16173d`, and a view drop paints the same transform ahead of the reply (`pendingView.ts:123-135`, `3a8f7bb34`). F-187's named `?? cur` example is gone with it. The difference left is the host's pin at MP:180-185.
2. **reorderChildren, reorderTop, reorderSpaces, createSpace:** The window ranks with `byOrder`/`atSlot`; the host re-ranks from disk with `resolveOrder` (MP:180-185). They diverge whenever an id is missing from the order. For example, `persistable` strips adopted ids on write through `isAdoptedId` (reorder.ts:12), so that child moves from held order to title order when the push lands.
3. **setSpaceColor:** The window transforms (NS:276 → TP:375-385). The host answers `'no-change'` (MP:48) and confirms through LG. The host has a transform arm for this op and never calls it.
4. **setIcon:** For a Context, the window has no arm (TP:410-427 returns null), and the host walks the whole Nexus (MP:124, MP:107-108). For a page, the window does nothing and the host re-reads a metadata shard.
5. **setActiveView:** The window writes `req.viewId`. The host writer can re-id every positional view, so the push replaces both `views` and `activeView`.
6. **setDisclosureLock, setHeadingIconHidden, setIcon on containers:** The window uses a transform and the host re-reads the sidecar (MP:125-132). Same result through two mechanisms.
7. **delete:** For a Space, the window removes it (NS:255) and the host walks (MP:119). For a Context, the window can't patch and the host walks. Under an adopted parent, the window removes and the host walks (MP:156).
8. **Adopted Subtree Rename or Move:** The window keeps the old adopted id at the new path. The host walks (MP:153-158) and mints a different id, so the push changes ids under the window's selection.
9. **In-Place movePage With No Order:** The window gets null (TP:557). The host walks the whole Nexus for a write that never happened (move.ts:33-34).
10. **Rescope:** The window shows the moved node; the host walks under the new exclusion scope (CF:58-64).
11. **Collection create:** The window appends it (TP:297-304); the host pins it (MP:176-177). This is F-603.
12. **renameContext / renameSpace:** Only the host patches the Space sidecars the cascade rewrote (GS:112 → LG).
13. **A Third Table:** `patchPagesFor` (navigationSlice.ts:675-685) invalidates page details for delete and page setBanner. `values:changed` covers setBanner again (useBridgeSubscriptions.ts:51-62).

**`applyTree` on Every Push:**

| Step | Line | Cost now | Under the law |
|---|---|---|---|
| `stabilize` | NS:189 | Walks the whole tree every time (treeStabilize.ts:5-27) | Not needed for change lists; kept for open and walks |
| `reconcileIndexOf` | NS:191 | O(N) rebuild for every new root (treeIndex.ts:46-55, 146-175) | Incremental, per change |
| 3 reconciles | NS:192-194 | Every push | Only on a remove or move that touches a referenced id |
| personalization, `applyPersonalization` | NS:196-199 | Only when the tree's copy changed identity | One key per config change |
| commands | NS:200 | Only when the tree's copy changed identity | A config change |

`44885c23c` took the device-prefs gate, the headings gate, and the `theme:systemAccent` ask out of `applyTree`: `load` reads the device record ahead of the tree (NS:147-157) and asks headings after it (NS:159), and the OS accent is a host push (`useBridgeSubscriptions.ts:38`). `stabilize` and the index rebuild remain per push.

#### Ledgers & Side-Channels

| State | Location | Written by | Flushed or read by | Replacement under the law |
|---|---|---|---|---|
| Value ledger | VC:12-20 | create.ts:67, move.ts:41/69, GW:40, GS:88, fileHistory.ts:117, spend.ts:263 | CF:18-21 via CF:31-33, Pages/handlers.ts:35/51, NH:98; watcher.ts:178 (`only`) | The writer emits `upsert(page)` with a values/bodyOnly flag and names the id itself |
| Sidecar ledger | VC:23-35 | CW:168, CC:187, GS:112, CR:363, cascade.ts:219 (property caches) | Every `confirmBy` (MP:221), **including the watcher's settle** (watcher.ts:161) | `upsert(container/space)` decoded from the RMW's return value |
| Page id indices | VC:43-82 | Built lazily per tree | Ledger flush; fileHistory.ts:84/112/133 | A projection. It duplicates treeIndex's `pagesById` (treeIndex.ts:38-39) |
| Title projection | VC:84-120 | Built lazily per tree | rename.ts:46, cascade.ts:89-118, spend.ts:219, restoreProperty.ts:71, assignment.ts:89 | A projection over the id lookup; survives |
| Echo map, tap | writeEcho.ts:4-18 | `recordWrite` (9 files) | watcher.ts:97-98, 158; sync tap | Survives (disk seam) |
| Asset map, `owedPush` | assetMap.ts:74-84 | assetWrite.ts:29, WP:276 | CF:67-70 (NH:181, Assets/handlers.ts:84). The watcher uses an identity compare instead (watcher.ts:183-184) | An `asset(rel)` change; the flag goes |
| `lastRead` | AW:131 | AW:152, 200, 216 | AW:163-189 | Survives (repair policy) |
| Parse cache | walkCache.ts:12-15 | forgetParse AW:26/38 | readNexus.ts:78-79, 123 | Survives |
| Tile heading links | tilesFile.ts:283-287 | 6 drop sites | WP:256 | Survives (off-model cache) |
| View id repairs | viewsFile.ts:30 | viewsFile.ts:59 | viewsFile.ts:52, 118 | Survives. Never cleared or root-pinned |
| File-history maps | fileHistory.ts:21-23 | :115 | :113-124 | Survives (out of slice) |
| `setTimeout(0)` ×2 | CF:13, CF:31 | — | Orders reply → tree push → value push | Goes: the reply carries the change list |
| Writer-side patch | settings.ts:71-78 | `updateScope` | — | An emitted `config(settings)` change |

**Why CF:31 Exists:** VC resolves ids against the tree after the confirm (VC:126). The ledger also doesn't know which operation wrote a note, so an autosave's immediate flush (Pages/handlers.ts:35) can take a concurrent createPage's note before that page is in the tree, and the id is lost (VC:135-136).

#### File Primitives

**`atomicWrite.ts` Exports (caller files, tests excluded):**

| Group | Exports |
|---|---|
| Write safely | `atomicWriteFile` (3) · `atomicWriteBinary` (3) · `writeJson` (6) · `rewritePreservingTimes` (2) · `landBytes` (1, Sync; **no `recordWrite`**) · `rmwJsonStrict` (11) · `updateNexusFile` (3) · `updateNexusConfig` (7) · `editJsonStrict` (1) · `rewritePageSerialized` (4) · `setOrDrop` (13) |
| Read / repair policy | `parseJsonText` (0 external) · `parseJsonObject` (3) · `readJsonStrictly` (1) · `readJsonStrict` (8) · `readKept` (3) · `readAppFile` (5) · `readAppFileKnown` (1) · `readTextOrNull` (11) · `readJsonObject` (14) · `pathExists` (20) · `forgetLastReads` (1) · `setRepairSeed` (1) · `setAside` (1) · the `REPAIRABLE` table |
| Rename policy | `heldName` (1) · `recase` (2) · `targetTaken` (5) |

**`pageFile.ts`:**
- **Write:** `mergeFrontmatter` (7), `writePageFile` (1; it re-reads `previous` even though its caller already read under the same lock, F-206), `renameFrontmatterKey` (2), `assembleEnvelope` (0 external callers).
- **Admission:** `sweepAdmits` and `sweepAdmitsBody` (1 each).
- **Read:** `splitEnvelope` (9), `splitFrontmatter` (11), `bodyHash` (7), `stampedId` (6), `readPageDetail` (1 host caller).

**`sidecar.ts`:** `patchSidecar` (13), `readSidecar` (2: adopt.ts, folderKind.ts). readNexus.ts:78 defines a different cached reader with the same name.

**Entanglement:** Inside the primitives, only `recordWrite` (AW:14, AW:42) and `forgetParse` (AW:26, AW:38) touch shared state. Both are disk-seam concerns and survive: `forgetParse` is required because time-preserving writes defeat the mtime key. `noteValueWrite` and `noteSidecarWrite` sit one layer up (GW, GS, CW, CC, create, move, cascade, fileHistory, spend, CR). **Every primitive survives the candidate law unchanged.** The one change needed is to stop discarding the RMW's return value (the `done()` sites and writers listed in *§Confirm Shapes*).

#### Inventory & Collapse

The last column is the safety property that file holds.

| File | LOC | Twin | Under law | Est. | Safety held |
|---|---|---|---|---|---|
| Nexus/mutate.ts | 194 | unique | Survives; arms return changes | 204 | Contexts folder lock :66-68 |
| Nexus/mutateRequest.ts | 118 | unique | Survives | 120 | — |
| Nexus/create.ts | 104 | unique | Survives; emits upsert + order | 110 | — |
| Nexus/move.ts | 72 | unique | Survives | 76 | — |
| Nexus/rename.ts | 48 | unique | Survives | 51 | — |
| Nexus/reorder.ts | 93 | unique | Survives; emits `config(order)` | 95 | Single state.json RMW :16-24 |
| Nexus/cascade.ts | 229 | unique | Survives | 229 | — |
| Nexus/folderEntity.ts | 85 | unique | Survives | 85 | Echo records :53, :68-69 |
| Nexus/pageMetadata.ts | 173 | Parallel to WP:470-491 | Survives; emits config | 175 | — |
| **Nexus/mutatePatch.ts** | 237 | Parallel to NS:239-295 | **Collapses into `apply`** | 40 | Walk fallback :161, :217-234; re-read confirm :121 |
| **Nexus/confirm.ts** | 70 | 4 parallel helpers | **Becomes one `commit`** | 25 | `setTimeout` ordering :13, :31 |
| **Nexus/valuesChanged.ts** | 143 | indices duplicate treeIndex | **Ledgers go** | 60 | — |
| Nexus/liveTree.ts | 114 | unique | Survives as the store holder; walk emits a diff | 124 | Epoch :26-39, :93-113 |
| Nexus/handlers.ts | 184 | — | Mutate handler shrinks | 179 | — |
| Contract/handlers.ts | 101 | — | Unchanged | 101 | Write gate :97-101 |
| Views/handlers.ts | 73 | — | `commit(changes)` | 73 | — |
| Properties/handlers.ts | 188 | — | Same | 188 | — |
| Settings/handlers.ts | 55 | — | Same | 55 | — |
| Tiles/handlers.ts | 114 | — | Unchanged | 114 | — |
| Pages/handlers.ts | 62 | — | Same | 62 | — |
| Navigation/handlers.ts | 46 | — | Unchanged | 46 | — |
| Matrix/handlers.ts | 46 | — | Unchanged | 46 | — |
| Assets/handlers.ts | 87 | — | Push flag goes | 85 | — |
| Interface/handlers.ts | 84 | — | Unchanged | 84 | — |
| Files/atomicWrite.ts | 319 | — | Unchanged | 319 | Strict RMW :102-128; locks :108, 197, 211, 255 |
| Files/pageFile.ts | 191 | — | Unchanged | 191 | Broken-YAML refusal :50-106 |
| Files/sidecar.ts | 36 | Name twin of readNexus.ts:78 | Unchanged | 36 | id gate :31-33 |
| Files/writeEcho.ts | 72 | — | Unchanged | 72 | Echo by bytes :20-24, :61-72 |
| Files/jsonMerge.ts | 46 | — | Unchanged | 46 | — |
| Pages/setBanner.ts | 58 | — | Emits | 62 | Page lock :24 |
| Pages/setIcon.ts | 38 | — | Emits | 41 | — |
| Pages/setHeadingIconHidden.ts | 24 | — | Emits | 26 | — |
| Assets/setProfileImage.ts | 16 | — | Emits | 17 | — |
| Assets/setCrop.ts | 17 | — | Emits | 18 | — |
| Views/viewsFile.ts | 179 | — | Emits | 182 | — |
| Settings/settings.ts | 171 | `updateScope` is a writer-side confirm | Emits | 171 | — |
| Tiles/tilesFile.ts | 331 | — | Unchanged | 331 | Stale-hash refusal :261-266 |
| **Session/nexusSlice.ts** | 300 | NS switch duplicates MP | **Optimistic switch goes; side effects gated** | 255 | — |
| Session/useBridgeSubscriptions.ts | 133 | — | Three subscriptions fold into one | 125 | — |

**Totals:**
- **SOURCES:** 4,651 lines now → about 4,319 (−332, about 7%).
- **Adjacent Files Outside SOURCES:** `treePatch.ts` (576) and `watchPatch.ts` (491) become `apply`, record readers, and projections, about 700 lines in total. The root pin (WP:229-234) survives in `apply`. `treeIndex.ts` probably gains about 60 lines for incremental maintenance.
- **Whole Slice:** about 6.1K lines → about 5.4K, roughly 11% smaller.

#### Divergences

1. **CorePM.md:83, "Every Write Channel Confirms Itself":**
   - Adoptions write the registry with no confirm (Empty Cells #1).
   - exclusions:clear confirms nothing and flushes nothing (Settings/handlers.ts:39-42).
   - Four ops confirm through a module-level ledger while their switch arm says `'no-change'` (MP:48-49, :134).
2. **CorePM.md:83, "A Pure Transform Where the Request Carries the Whole Fact":** These ops carry the whole fact in the request and still re-read disk: setDisclosureLock (MP:125-127), setHeadingIconHidden, setIcon, setCrop (MP:138), setProfileIcon (MP:143), and reorderPanelContexts (MP:140). The window does them as pure transforms (NS:258-272). A setSpaceColor transform exists (TP:375) and the host doesn't use it. createContainer re-reads a sidecar it just wrote (MP:174).
3. **CorePM.md:83, "A One-File Re-Read Where the Writer Normalizes":**
   - Most re-read writers don't normalize (see the table in *§Confirm Shapes*).
   - A page banner re-read can't reflect the write (MP:101).
   - A Context icon walks the whole Nexus instead of re-reading one file (MP:124).
   - A movePage that wrote nothing walks the whole Nexus (MP:161).
4. **DesktopPM.md:14 and CorePM.md:77, "Structural Sharing Keeps the Push Cheap":**
   - `stabilize` walks the whole tree (treeStabilize.ts:5-27).
   - Every new root rebuilds the index (treeIndex.ts:48-55).
   - Settings patches always build a new root (WP:428), so they always push (MP:235-236).
   - An echoed push that `stabilize` collapses still costs the O(N) compare; the accent ask and the personalization pass left it in `44885c23c`.
5. **CLAUDE.md, "Read and Write Are Cleanly Separable," and CorePM.md:83, "The Write Path Never Runs Inside a Read":**
   - The watcher's patch runs `renameCascade`, which writes files (WP:244-263, :279, :286).
   - `updateScope` patches the model from inside a writer (settings.ts:71-78).
6. **DesktopPM.md:14, "The Write-Confirmation Path and the Watcher Share That Funnel":** This is true, and it means they also share the sidecar ledger. A watcher settle flushes a mutation's notes (watcher.ts:161 → MP:221).

#### Plan Inputs

**The Shared Mechanism:** The model is a nested tree addressed by path, and its only propagation primitive is "replace the tree." The host calls `patchLiveTree(fn)` to get a new root, the wire carries the whole tree, and the window runs `stabilize` plus a re-index. The ledgers, re-reads, pins, the two switches, and the per-push side effects each stand in for a change value the writer never returns.

##### The Change Vocabulary

`treePatch.ts` already holds every transform the vocabulary needs; each is path-addressed and returns null when it can't resolve.

| Transform at HEAD | Lines | Callers (non-test) | Candidate entry |
|---|---|---|---|
| `updateNodeInTree` (replace or drop one node at a path, Spaces first) | TP:410-428 | WP:237-238 (`replaceNode`) and every transform below | `upsert(node)` |
| `insertCreatedInTree` (page or Set at the order's `$new` slot, Collection appended, Context group appended, Space at slot) | TP:262-323 | MP:57, NS:287 | `upsert(node)` plus `order` |
| `removeNodeInTree` (with the unreadable-list prune) | TP:486-492 | MP:67, WP:240-241, NS:255 | `remove(path)` |
| `renameNodeInTree` (re-title, re-path the subtree, repoint unreadable) | TP:472-484 | MP:65, NS:252 | `move(from, to, title)` |
| `relocateNodeInTree` (extract, re-path, insert) | TP:175-189 | treePatch-internal and `treePatch.test.ts` only | `move(from, to)` |
| `orderInTree` over `moveInTree`, `reorderChildrenInTree`, `reorderPagesInTree` | TP:522-576 | MP:62, NS:248, `pendingView.ts:130` | `move` plus `order(parent, key, ids)` |
| `patchNodeInTree` (icon, heading icon, disclosure lock, active view) | TP:494-516 | NS:258-272 only | `upsert(node)` |
| `patchContextGroupsInTree` (renameContext, renameSpace, setSpaceColor, reorderContexts, reorderSpaces) | TP:343-399 | MP:72, NS:279 | `contexts(groups)` plus `order` |
| `repointRegistryInTree` (defs into `tree.registry` and each Collection's `properties`, by identity) | TP:326-340 | MP:204 | `registry(defs)` |
| Root leaves outside treePatch: `applySettingsLeaves`, `patchOrderFromDisk`, `patchHomepageFromDisk`, `patchCropsFromDisk`, `patchMetadataFromDisk` | WP:427-479 | watcher (`applyOne` WP:265-318), MP, CF, settings.ts:77 | `config(section, value)` |

Six entries cover every arm: `upsert`, `remove`, `move`, `order`, `registry`, and `config`, with Context groups either a seventh entry or an `upsert` of a group record. `byOrder` (TP:518-520) has no caller outside treePatch and its test. The ranking rule is the one decision the vocabulary forces: `order` applied through `byOrder` puts unlisted entities last (TP:401-406), while every open ranks them by title (order.ts:25), so the applier ranks with `resolveOrder` and the order lists live in the model (B-4).

##### What Each Op's Writer Holds

"Request" means the fact is in the request; "record" means the RMW's returned record, decoded through the reader, carries it; "read" means the writer doesn't hold it today.

| Op | Entries | From | Confirm today |
|---|---|---|---|
| createPage | `upsert(page)`, `order` when `req.order` | createPage's `{id, path}` (page.ts:46-50), `fillSlot(req.order)` | (c) |
| createPage with seeds | plus `upsert(page)` with contextValues, `registry` on adoption | read: `setPageContext` answers `ok(null)` (CW:131), `applyAdoptions` drops the registry record | (c) plus a page re-read |
| createContainer | `upsert(container)`, `order` | request plus the sidecar create.ts:82-84 built; `setChildOrder` discards its record (reorder.ts:91-92) | (c) |
| rename | `move`; folder with excluded content: rescope | `renamed` (rename.ts:32-35), `renameFolderEntity`'s path | (a) or rescope |
| renameHeading | none | — | (e) |
| delete (page, Set, Collection) | `remove`; `upsert(container)` for each view config reached | request; `reachConfig` writes (CR:363) | (a) |
| delete (Space, Context) | `remove`; member `upsert`s | read: the unlink cascade doesn't return member records | walk |
| restore (page) | `upsert(page)` | read, unless `scrubReturning` (spend.ts:231) hands back the content it wrote; not verified | (b) |
| restore (folder, Space, Context) | `upsert` of a subtree | read: one walk of the landed folder | walk |
| emptyBundle | none | — | (e) |
| setProfileImage, setProfileIcon | `config(settings)` | request plus `adopted`; `updateSettings` discards the record (settings.ts:17-23) | (b) |
| setBanner | homepage `config(homepage)`; container/Space `upsert`; page none (no tree field) | record (setBanner.ts:44-57) | (b) |
| setCrop | `config(crops)` | request; `updateCrops` discards (settings.ts:25-34) | (b) |
| setHeadingIconHidden | `config(homepage)` or `upsert` | record, discarded by `done()` (setHeadingIconHidden.ts:18, :23) | (b) |
| setIcon | page `config(pageMetadata)`; container/Space `upsert`; Context `contexts` | record, discarded by `done()` (setIcon.ts:32, :37; pageMetadata.ts:111) | (b); Context walks |
| setDisclosureLock | `upsert(container)` | record (mutate.ts:120-124) | (b) |
| setActiveView | `upsert(container)` | record: the writer re-ids positional views (viewsFile.ts:43-65, 122-130) | (b) |
| setProperty (page) | none; `registry` on adoption | read: adoption record dropped | (e) |
| setProperty (Space) | `upsert(space)` | record: `writeSpaceSidecar` discards (CW:162-169) | (e) via LG |
| setPageMeta | `config(pageMetadata)` | record, discarded at pageMetadata.ts:111 | (b) |
| movePage | `move`, `order(dst)`, `order(src)` | request; `dropFromChildOrder` and `setChildOrder` discard (reorder.ts:70-93) | (a) |
| moveSet | `move`, `order(dst)`, `order(src)`, view-config `upsert`s; rescope | request; `reachConfig` | (a) or rescope |
| reorderChildren, reorderTop, reorderSpaces | `order` | request; records discarded by `done()` | (c) |
| reorderPanelContexts | `config(order)` | request | (b) |
| createContextGroup | `contexts` upsert | returned `{id, path}` (CW:223-242) | (a) |
| createSpace | `upsert(space)`, `order` | returned `{id, path}` (CW:244-264) | (c) |
| renameContext, renameSpace | `contexts`, Space `upsert`s from the cascade | request; cascade sidecar writes (GS:112) | (a) plus LG |
| setContext (page) | `upsert(page)` with contextValues; `registry` on adoption | read: same gap as seeded create | (b) |
| setContext (Space) | `upsert(space)` | record: `writeSpaceSidecar` discards | (e) via LG |
| setSpaceColor | `upsert(space)` | request | (e) via LG |
| reorderContexts | `contexts` | record, discarded by `done()` (reorderContexts.ts:15) | (a) |
| setSpaceRowOrder | none (the row order isn't a `SpaceNode` field) | — | (e) via LG |

Seven arms still need a read unless their writers change: seeded createPage, setContext on a page, and setProperty's adoption (all through `setGovernedRootKeys` returning only adoptions, GW:38-42, and `applyAdoptions` discarding the registry, optionOps.ts:104-112); Space and Context delete (the member cascade); restore (a folder, Space, or Context, and a page unless the scrub returns what it wrote); setIcon on a Context; and the three rescope arms, which keep `confirmRescope` (B-8). Every other op emits from its request or its own record.

##### What `done()` Discards

The record path is `rmwLocked` → `ok(next)` (AW:111-129) → `rmwJsonStrict` (AW:103-109) or `updateNexusFile` (AW:192-203) → `patchSidecar` (sidecar.ts:20-36) or `updateNexusConfig` (AW:232-238) → the writer's `Result` → `done()` (mutateRequest.ts:23) → `ok({})` → `handleMutate` (mutate.ts:50-62) → the handler (NH:165-183), which then runs `confirmWrite(confirmMutation)` to re-derive what `done()` dropped. A `MutateOutcome` carrying the change list replaces:

- `confirmWrite`, `pushConfirmed`, `confirmContainerWrite`, `confirmRegistryWrite`, `confirmSettingsWrite` (CF:10-16, 24-55), and both `setTimeout` orderings (CF:13, :31).
- `routeMutation`, `patchForMutation`, `patchEntityFromDisk`, `patchPage`, `subtreeHoldsAdoptedId`, `confirmMutation`, `confirmRegistry`, `routeRegistry` (MP:41-210), including the order re-reads (MP:163-188).
- The value ledger and its flush (VC:10-20, 122-143) and the sidecar ledger (VC:22-35).
- `patchPageMetaFromDisk` (WP:481-491) and `patchSettingsFromDisk` (WP:423-425), whose only callers are the confirms and `updateScope` (settings.ts:72-78).
- The window's switch (NS:238-282), which becomes one apply of `reply.changes`.

What stays: `confirmRescope` (CF:58-64), `pushAssetWrites` until an asset change exists (CF:67-70), the root pin (WP:229-235), the epoch (liveTree.ts:19, 26-39), and the walk fallback, which moves out of `confirmBy` into whatever commits a change list, since the watcher's settle calls it too (watcher.ts:161).

##### Per File

| File | Deleted (phase 2 unless noted) | Survives | Added |
|---|---|---|---|
| `Core/Nexus/mutatePatch.ts` (237) | Everything but the walk fallback: MP:41-210, and `confirmBy`'s sidecar flush (MP:221-225) | The walk fallback and root-pin check (MP:212-237 less the flush at :221-225), renamed to the commit step | — |
| `Core/Nexus/confirm.ts` (70) | CF:10-55 | `confirmRescope` (CF:58-64), `pushAssetWrites` (CF:67-70) | `commit(ctx, root, changes): Promise<void>` or its equivalent |
| `Core/Nexus/valuesChanged.ts` (143) | `noteValueWrite`, `noteSidecarWrite`, `flushSidecarWrites`, `flushValueWrites` (VC:10-35, 122-143) | `titlesOf`, `titleHeldOutside`, `frozenWorld` (VC:84-120); `pageIdIndex`, `liveIdIndex`, `liveIdOf`, `livePathOf` (VC:37-82) until the record map's id lookup replaces them (F-188) | — |
| `Core/Nexus/mutateRequest.ts` (118) | `done` (:23) as a discard | The request schema (:59-108) | `changes: TreeChange[]` on `MutateOutcome` (:8-20) |
| `Core/Nexus/mutate.ts` (194) | — | Every arm | Ten `done()` arms return their record's changes |
| `Core/Nexus/treePatch.ts` (576) | `patchForMutation`'s routing role; `byOrder` if the applier ranks with `resolveOrder` | Node factories (TP:12-73), path addressing, every transform | `applyChange(tree, change)` and `applyChanges(tree, changes)`, exhaustive over the union |
| `Core/Nexus/reorder.ts` (93) | `persistable` (:12) in phase 1 (E-6 retires `isAdoptedId`) | Both writers | `setChildOrder` and `dropFromChildOrder` return their record |
| `Core/Nexus/create.ts`, `move.ts`, `rename.ts` | `noteValueWrite` calls (create.ts:67, move.ts:41, :69) | Every op | Each returns its entries |
| `Core/Nexus/pageMetadata.ts` (173) | The discard at :111 | Everything | `updatePageMetadata` returns the shard record |
| `Core/Files/atomicWrite.ts` (319) | — | Everything | An unchanged/written distinction on `rmwJsonStrict`'s result, or writers use `editJsonStrict` |
| `Core/Settings/settings.ts` (171) | Phase 1: `updateScope`'s tree patch (:72-78) moves to the settings record; phase 2: the patch goes | Every writer | `updateSettings` and `updateCrops` return their record |
| `Core/Contract/bridge.ts` | — | `nexus:changed` (:275) for open, Reload, rescope, and the walk | A change-list push (:267-284) |
| `Desktop/FileWatch/watcher.ts` | `flushValueWrites` (:178) once cascades return their pages | Its `nexus:changed` (:170) until phase 5 | — |

**Non-Test Importers of What Goes:**

- `mutatePatch.ts`: `confirm.ts` (`confirmBy`, `confirmRegistry`), `Core/Nexus/handlers.ts` (`confirmBy`, `confirmMutation`), `Desktop/FileWatch/watcher.ts` (`confirmBy`), `Core/Testing/confirmedMutate.ts` (both).
- `confirm.ts`: `Core/Nexus/handlers.ts`, `Core/Settings/handlers.ts`, `Core/Properties/handlers.ts` (:69, :136, :153), `Core/Views/handlers.ts` (:23), `Core/Pages/handlers.ts` (:35, :51), `Core/Assets/handlers.ts` (:60).
- `valuesChanged.ts` ledgers: `noteValueWrite` in create.ts, move.ts, governedWrite.ts, governedSweep.ts, fileHistory.ts, spend.ts; `noteSidecarWrite` in contextWrite.ts, contextCascade.ts, cascade.ts, configReach.ts, governedSweep.ts; `flushValueWrites` in confirm.ts and watcher.ts; `flushSidecarWrites` in mutatePatch.ts.
- `treePatch.ts` transforms: mutatePatch.ts, watchPatch.ts, nexusSlice.ts, `Core/Views/Host/pendingView.ts` (`orderInTree`); 31 non-test files import the module for its lookups (`containerAt`, `pageAt`, `owningCollection`, `containerSchema`, and the rest), which survive.
- `patchSettingsFromDisk`: confirm.ts, mutatePatch.ts, settings.ts. `patchPageMetaFromDisk`: mutatePatch.ts.

**Test Files:** `mutatePatch.test.ts` (428), `watchPatch.test.ts` (787), `treePatch.test.ts` (531), `treeShape.test.ts` (76), `treeStabilize.test.ts` (52), `confirm.test.ts` (29), `valuesChanged.test.ts` (95), `mutate.test.ts` (2,439), `page.test.ts` (296), `configReach.test.ts` (561), `contextCascade.test.ts` (666), `optionOps.test.ts` (770), `governedSweep.test.ts` (74), `removeProperty.test.ts` (353), `Properties/handlers.test.ts` (191), `trashRecovery.test.ts` (714), `Desktop/FileWatch/watcher.test.ts` (452), `useViewHost.test.tsx` (940). Through `Core/Testing/confirmedMutate.ts` (21), which runs `handleMutate` then `confirmMutation`: `spend.test.ts` (1,713; 116 calls), `trashRecovery.test.ts` (25), `indexMaintenance.test.ts` (304; 13), `restoreScrub.test.ts` (457; 12), `trashRows.test.ts` (231; 4), `deleteReach.test.ts` (388; 4).

##### The Side-by-Side Proof (B-6)

**Already There:** `mutatePatch.test.ts` asserts `stabilize(await readNexus(root), live)).toBe(live)` after 12 confirms (rename, delete with create, seeded create, createContainer, Space delete, setContext, three registry writes, a view save, and two ledger-noted sidecar writes), and `watchPatch.test.ts` does the same in 7 watcher cases plus a settings-leaves describe (:255-294) and a container-mapper agreement describe (:711). No test compares a tree for movePage, moveSet, the five reorders, setIcon, setBanner, setCrop, setProfileImage/Icon, setDisclosureLock, setActiveView, setPageMeta, restore, folder rename, renameContext, renameSpace, createSpace, createContextGroup, setSpaceColor, or personalization.

**What the Harness Needs:** `confirmedMutate` is the seam: hold `getLiveTree()` before the write (records are immutable, so the reference is the snapshot), run today's confirm to get the old tree, apply `reply.value.changes` to the snapshot with the shared applier, and assert `stabilize(applied, confirmed)` returns `confirmed`. That covers the 174 existing calls across six files for free. The channels outside `mutate` (views, properties, settings, pages) need one equivalent helper each, since they reach the confirm through their handlers rather than `confirmedMutate`. Once an op's writer agrees, its confirm arm and the comparison go together.

##### Names

Candidates, none existing today: `TreeChange` (the union), `applyChange`/`applyChanges` (the shared applier in treePatch.ts), `MutateOutcome.changes`, `commit` (the host step that applies, pushes, and falls back to the walk), `nexus:changes` (the change-list push, with a version stamp for resync), and `WriteReceipt` if the writers return a typed record rather than `Result<Record<string, unknown>>`. Renames: `done` becomes a receipt-to-changes step rather than a discard; `confirmBy` becomes `commit`'s fallback.

##### Own Plan?

No. The write half barely moves: writers, locks, strict RMW, cascades, sweeps, and echo suppression survive, and the propagation layer that collapses is one mechanism. Phase 2 stages naturally by writer family under the side-by-side harness.

##### Estimated Lines

| Phase | Removed | Added | Basis |
|---|---|---|---|
| 1 | ~5 | ~0 | `persistable` and its `isAdoptedId` import (reorder.ts:6, :12) |
| 2 | ~330 | ~300 | MP:41-210 and :221-225 (~175), CF:10-55 (~45), VC:10-35 and :122-143 (~45), NS:238-282 (~45), WP:423-425 and :481-491 (~15); added the union and applier (~120), emission across ~25 writers (~110), commit and the push with its version (~50), the window apply (~20) |

#### Out-of-Slice

- Container node assembly exists twice: readNexus.ts:190-231 and WP:376-393. Space assembly likewise: readNexus.ts:237-251 and WP:397-416.
- `pushConfig` for state.json and matrix.json skips echo suppression (watcher.ts:93-96). Every order write re-reads navigation.
- `deleteOp` never drops `pageMetadata` for deleted pages (delete.ts:24-108).
- `reviseTile` (remove/convert) doesn't call `dropTileHeadingLinks` (tilesFile.ts:97-120); restoreTile and writeMarkdownTile do.
- `landBytes` (Sync landing) writes without `recordWrite` (AW:29-39).
- `loadContextWorld` strictly re-reads every Space sidecar per setContext, setSpaceColor, or renameSpace (CW:60-90, CW:273), even though the live tree holds the Spaces.
- `pendingView.ts` is a window-side optimistic overlay outside `nexusSlice`.
- `rawContextByNode` (readNexus.ts:103-113) is a WeakMap attached to nodes by the read path.
- File history keeps its own "what did the app write" ledger (fileHistory.ts:22) alongside writeEcho.

#### Confidence

- **High:** Every line citation, the 31-op count, the confirm classification, the timing claim (reply waits for the confirm, the push follows one macrotask later), and the adoption gap. I verified the adoption gap statically end to end but did not reproduce it live.
- **Medium:** The concurrent ledger bleed. The structure permits it; I didn't observe it.
- **Low to Medium:** The LOC estimates. They're rough judgments per file, counted as physical lines, and caller counts are files that reference each name (comments included).
