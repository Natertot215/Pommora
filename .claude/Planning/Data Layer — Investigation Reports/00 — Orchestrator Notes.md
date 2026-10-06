#### Settled Plan Inputs

**Re-grounded:** 09-30-2026 at `d7d00240d`

**Basis:** The six re-grounded slice reports (A, B, C, D, E, F), reconciled against the code wherever two of them disagreed, under the *Data Layer — Decision Log* as revised 09-30-2026. HEAD is `e45149890`, whose only change since `d7d00240d` is the web-guest refactor (`Core/Web`, `Desktop/Web`, `GlancePane.tsx`, `WebWindow.tsx`, `WebTile.tsx`, `folding.ts`), so every citation below holds at HEAD. The working tree carries another session's uncommitted edits to `Desktop/main.ts` (lines shift by +3), `Core/Actions/commands.ts`, `Core/Settings/codec.ts`, `Core/Contract/bridge.ts` (`web:key`), `Desktop/Actions/editorMenu.ts`, and a new `Desktop/Actions/hostCommands.ts` (`setHostCommands`), which is the surface I-1's `commands` defect touches; phase 1 re-pins there (J-6).

**Reading Order:** *§Cross-Phase Settlements* first, then each phase. Line estimates are production code only, judgment at about ±25%, de-duplicated where two slices sized the same file.

---

#### Cross-Phase Settlements

##### Names

Every introduced or renamed thing, for Nathan's ruling before ratification (Decision Log, *§Open Items* 3).

| Name | Kind | Where | Proposed By | Pick |
|---|---|---|---|---|
| `NexusChange` | Union type | `Core/Nexus/change.ts` (new) or `treePatch.ts` | Ruled; B proposed `TreeChange` | `NexusChange` (ruled). `Change` alone is taken by Sync's wire (`Core/Sync/Contract/wire.ts:102`) |
| `applyChanges` | Function, the shared applier | `treePatch.ts` | B, D | `applyChanges(picture, changes)`; `applyChange` stays private |
| `NexusConfig` | Interface, the config record | `tree.ts` | A, B, D | `NexusConfig`. Caveat: a case-only neighbour of the path helper `nexusConfig(root, file)` (`Core/Paths/paths.ts`), beside `readNexusConfig` and `updateNexusConfig`; the three already name the `.nexus/` config files the record is built from, so the family reads as one |
| `NexusPicture` | Interface `{ tree; config }` | `tree.ts` | New here | `NexusPicture`, after the Decision Log's "the Picture"; the `nexus:changed` payload from phase 1 and the applier's operand |
| `heldConfigOf` | Function | `liveTree.ts`, beside `heldTreeOf` | A | `heldConfigOf` |
| `patchLiveConfig` | Function | `liveTree.ts`, beside `patchLiveTree` | New here | `patchLiveConfig` |
| `setConfigTap` | Function | `liveTree.ts` | F asked for a hook "named with the settings move" | `setConfigTap`, matching `setWriteTap`, `setWatchTap`, `setRepairSeed` |
| `entities.ts`, `ENTITY_KINDS`, `EntityKind` | Module, table, type | `Core/Nexus/entities.ts` | Ruled (file); A (table, type) | As proposed |
| `isContainerKind`, `sidecarKeyOf` | Functions | `entities.ts` | A | As proposed |
| `MutateOutcome.changes` | Field | `mutateRequest.ts:8-20` | B | `changes: NexusChange[]` |
| `WriteReceipt` | Type | — | B, conditional | Not introduced: the change list is the receipt |
| `commit` | Host step: apply, push, walk fallback | `mutatePatch.ts` (what survives of it) | B | `commitChanges`; `commit` alone is too generic beside `commitPinned` |
| `nexus:changes` | Push channel | `bridge.ts` | B | Not introduced: `nexus:changed` carries a `NexusPush` union (whole picture or change list, both versioned) |
| `NexusPush` | Union type | `bridge.ts` or `tree.ts` | New here | `NexusPush` |
| `readPage`, `readContainer` | Functions, the page and folder-sidecar readers | `Core/Files/pageFile.ts`, `Core/Nexus/containerFields.ts` | A | As proposed |
| `readSpaceFile` | Function, the Space reader | `Core/Contexts/spaceSidecar.ts` | A | `readSpace` once `readNexus.ts`'s private `readSpace` (:235-253) goes, for one naming pattern across the three readers |
| `readPageDetail` (host) | Function | `pageFile.ts:168-181` | A flagged the collision with `pageDetailCache.ts:30` | Deleted in phase 3; the window's keeps its name |
| `stampArrival` (A), `stampArrived` (C), `stampMissing` (C) | Function | `adopt.ts` | A, C | `stampMissing(root, missing)`: one step the open, the settle, and the fallback walk share. `stampArrival` and `stampArrived` aren't introduced |
| `stampPage`, `stampFolder` | Exported (private today) | `adopt.ts:58-70`, `:104-116` | A, C | Exported under their names |
| `retryUnreadable` | `mutate` op | `mutateRequest.ts` | New here | The one Try Again for both notices; the admission reason decides mint (E-2) or re-read (E-4) |
| `markUnreadable` | Transform | `treePatch.ts` | C | Not introduced: the `unreadable` arm of `NexusChange` |
| `applyIndex` / `IndexBatch` | Store method / type | `Core/Platform/stores.ts`, `contentIndex.ts` | C | `writeIndex(batch: IndexBatch)`, keeping "apply" for the picture applier |
| `indexPage` | Function | `indexSeed.ts` | C | `indexPage(rel, text, stat)` |
| `diffTrees` | Function, walk-as-diff | `treePatch.ts` | C | `diffPicture(before, after): NexusChange[]` |
| `contextWorldOf`, `ContextWorld` | Function, reshaped type | `contextResolve.ts` or its own module | E | As proposed |
| `governedWorldOf` | Rename of `loadGovernedWorld` | `contextWrite.ts:150-160` | E | As proposed |
| `replayContextJournal` | Rename of `replayPendingRename` | `contextCascade.ts:298-361` | E | As proposed, once it replays deletes |
| `ContextJournal`, `DeleteJournal` | Union, variant | `contextJournal.ts` | E | As proposed |
| `registryDefsByName` | Function | `contextResolve.ts` | E | As proposed; keyed on `config.registry` |
| `spaceKeyHolders` | Function | `Core/Nexus/cascade.ts` | E, conditional | Introduced; `spaceArm` and `confirmedKeyHolders` read it |
| `relocate` | Function, the one move | `Core/Files/atomicWrite.ts` | F | As proposed |
| `nameSteps` | Private generator | `Core/Paths/names.ts` | F | As proposed |
| `held` | Parameter on `createDisambiguated` | `names.ts:63-72` | F | `taken`, matching `freeName(name, taken)`; "held" already means the live picture throughout |
| `rekeyContext` | Exported `Rewrite` | `contextCascade.ts` | F | As proposed |
| `spaceIdsIn` | Function | `spaceSidecar.ts` | F | As proposed, beside `spaceSidecarsIn` |
| `editMatrixFile` | Function | `Core/Matrix/matrixFile.ts` | F | As proposed |
| `remintContextEntry` | Private function | `Core/Nexus/remint.ts` | F | As proposed |

Retired names: `TreeChange`, `relocatePage`, `rekeyPassengers`, `restoredSpaceTitles`, `adoptedId`, `isAdoptedId`, `stampListed`, `loadContextWorld`, `resolveTreeContextKeys`, `contextDriftPresent`, `readPageRecord`, host `readPageDetail`, `extractPageIndex` (folded into `readPage`), `patchPageFromDisk`, `patchContainerFromDisk`, `patchSpaceFromDisk`, `confirmMutation`, `confirmRegistry`, `confirmWrite`, `pushConfirmed`.

##### The Change Vocabulary

`NexusChange` covers every arm of both routing tables (B's grid) with nine entries: `upsert` (a page, Set, Collection, or Space node; a container upsert replaces its own fields and keeps its children, as `patchContainerFromDisk` does at `watchPatch.ts:376-393`), `remove(path)`, `move(from, to, title)`, `order(parent, key, ids)`, `contexts(groups)`, `registry(defs)` (writes `config.registry` and re-joins each Collection's `properties`, today's `repointRegistryInTree`, `treePatch.ts:326-341`), `config(section, value)`, `values(ValueChange)` (the value notebook's content; B-2 retires the notebook, so the value push derives from the list), and `unreadable(path, reason)` for M-2's notices. The applier is exhaustive over the union (B-5); its `values` arm leaves the picture unchanged, and the window's value consumers project `values:changed` from the list. A `contexts` entry replaces the groups array whole, which keeps E's lookup invariant (any change to a group's def or a Space's id, title, or path yields a new `contexts` array) true by construction.

##### The Picture and the Push

- **Phase 1:** `nexus:changed` (`bridge.ts:275`) carries `NexusPicture`. No `config:changed` channel: it would exist for one phase and retire in phase 2, when config changes ride the change list, and open, Reload, rescope, and the backup walk need tree and config in one message anyway. The window's `stabilize` keeps the tree's identity when only config moved, so the index keeps its cache and the reconciles see an unchanged root.
- **Phase 2:** `nexus:changed` carries `NexusPush = { version; picture } | { version; changes }`, one channel and one subscriber (`useBridgeSubscriptions.ts:46`), so the version stamp and its resync live in one place. A gap in `version` resyncs through Reload's existing ask.
- **The `commands` Fix (I-1):** F keyed it on `nexus:changed`, which both phases reshape and which has two emitters (`confirm.ts:10-16` through `HostContext.push`, `Desktop/FileWatch/watcher.ts:170`). Keyed instead on the host's config holder: `setConfigTap` fires when `patchLiveConfig` or a walk replaces `commands`, and `Desktop/main.ts` registers `refreshMenu` (`:172-177`) on it. It survives phase 2 unchanged, since the host's applier writes config through the same holder. `confirmBy`'s `now !== before` (`mutatePatch.ts:235-236`) compares the picture, or a config-only change never pushes.

##### Order Ranking (B-4)

One rule, and it exists: `resolveOrder` (`Core/Nexus/order.ts:10-27`) lists the order's ids first, then unlisted entities by title, and with no list at all sorts by id, which is creation order. Every read ranks through it (`containerFields.ts:37-38`, `readNexus.ts:270`, `:331`, `watchPatch.ts:349`, `:446`, `:448`). The window's rule is `reorderById` (`treePatch.ts:401-406`) behind `byOrder` (`:518-520`), which keeps unlisted entities last in their current order; the host pins by re-reading (`mutatePatch.ts:162-187`). B-4 is implementable in one rule once the lists are held: container nodes gain `pageOrder` and `setOrder` (read in `containerFieldsFrom` beside the `resolveOrder` calls that already parse them), and `NexusConfig.order` holds `state.json`'s `{ collections, spaces, contexts }` from phase 1 (`readOrder`, `readNexus.ts:54-65`, already decodes all three). The applier's `order` and `upsert` arms rank with `resolveOrder` in `treePatch.ts`; `reorderById`, `byOrder`, `atSlot` (`:122-126`), and the pins go. F-603's ruling (a new Collection lands last) is the create writer appending the id to `order.collections`, which it emits as an `order` change.

##### Receipts and Unchanged Writes

`rmwLocked` returns `ok(base)` when `mutate` answers null (`Core/Files/atomicWrite.ts:124-125`), so its result can't tell unchanged from written. The receipt needs no API change: every writer passes the `mutate` closure and knows when it answered null, so a writer whose closure answered null emits nothing. Where the corrupt-repair branch writes `base` (`:124`), emitting from it is still correct, since `base` is what landed. The applier's per-record equality is the backstop that makes a redundant emission a no-op, as `stabilize` does today. `editJsonStrict` (`:207-221`) already answers `'unchanged' | 'written'` for the writers that take it.

##### The Parse Cache and the One Page Reader

The parse cache (`Core/Files/walkCache.ts:34-57`) holds whatever the parse returns, keyed on `(mtime, size)` with the racy window and walk-generation eviction. Caching body and index rows would hold every page's text at 10,000 pages. `readPage` returns the record (admission with its reason, id, title, path, full frontmatter, the raw `<Context>` keys as a field in place of the `rawContextByNode` WeakMap, `mtimeMs`, size) and the cache holds only that, as today. The text lives for the parse call: the walk's parse closure extracts index rows from it when the index's stat for that path differs (the seed's gate, `indexSeed.ts:105`), and `page:open` derives body and `bodyHash` on demand. A cache hit means `(mtime, size)` is unchanged, which is the index's own freshness key, so a hit never owes the index rows. `pageValuesOf` (`Core/Views/loadValues.ts:18-28`) takes the record's frontmatter instead of re-decoding.

##### E-6: Every Temporary-ID Site

Nine mints and eleven special cases. The Decision Log's E-6 names its list by area (order lists, band ranks, the re-mint ledger, the rename and move confirms, `stampListed`); `idTime`'s guard, the page-metadata re-read, and the window's two pin guards sit outside it.

| Site (HEAD) | What It Does | Becomes | Phase |
|---|---|---|---|
| `Core/Nexus/ids.ts:45-53` | `ADOPTED_PREFIX`, `adoptedId`, `isAdoptedId` | Deleted | 3 |
| `ids.ts:25` | `idTime` answers null for an adopted id (`shardOf`, `pageValuesOf` rely on it) | Guard deleted; `decodeTime`'s catch answers any non-ULID | 3 |
| `readNexus.ts:130` | Page mint for an id-less member | The walk reports it `missing`; `stampMissing` stamps it; a failed stamp lists it unreadable | 3 |
| `readNexus.ts:191`, `:225` | Set and Collection mint | As above, through `stampFolder` | 3 |
| `readNexus.ts:245`; `watchPatch.ts:404`; `contextWrite.ts:76` | Space mint for an id-less `_space.json` | Nothing stamps a Space today (`stampAdopted` never enters `.nexus/Contexts`). Recommended: `stampFolder` takes the Space kind (the same `rmwJsonStrict` adding `id`), run by `stampMissing` at open and settle; the alternative is listing it unreadable | 3; `contextWrite.ts:76` goes with `loadContextWorld` in 4 |
| `readNexus.ts:305` | Nexus-root mint when `nexus.json` has no readable id | Not a page or folder, so outside E-6. `ensureIdentity` (`identity.ts:17-45`) answers null only for an unreadable `nexus.json`; recommended: the root's fallback moves into `identity.ts` as its own inline hash, so `ids.ts` loses the whole adopted family | 3 |
| `watchPatch.ts:374` | Container patch mint | The id-mismatch walk covers it; the arm goes in 5 | 3 |
| `Core/Files/pageFile.ts:174` | `readPageDetail` takes any `ID`, else mints | `readPage`'s admission; `page:open` refuses unknown (E-2) | 3 |
| `mutatePatch.ts:78-88`, `:150-157` | `subtreeHoldsAdoptedId` and the rename, move, and delete walk arm | Phase 2 deletes the routing around them; `commitChanges` keeps one "adopted subtree walks" case on its `move` and `remove` arms until phase 3 deletes it, or parity against a fresh walk fails for a moved subtree holding path-hashed ids | 2, then 3 |
| `Core/Nexus/reorder.ts:12` | `persistable` strips adopted ids from four order writes (`:30`, `:33`, `:42`, `:91`) | Deleted (B placed it in phase 1; it depends on E-6) | 3 |
| `Core/Views/creationOrder.ts:54` | `tieOrderWith` strips adopted ids | Filter deleted | 3 |
| `Core/Views/Bands/bandRouter.ts:99` | `group_order` strips adopted ids | Filter deleted | 3 |
| `remintLedger.ts:34` | The baseline skips adopted ids | Deleted | 3 |
| `watchPatch.ts:484-488` | `patchPageMetaFromDisk` re-reads a page held under an adopted id | Deleted (the function goes in 2) | 2 |
| `adopt.ts:90-100` | `stampListed`, called from `cascade.ts:130` and `keyHolders.ts:59` | Deleted; both read the frontmatter id alone | 3 |
| `Core/Navigation/NavList.tsx:75` | The pin toggle hides for an `adopted-` target | Deleted | 3 |
| `Core/Session/navigationSlice.ts:488` | `pinTarget` refuses an `adopted-` target | Deleted | 3 |

**Stamps That Stay:** `ensurePageId` (`adopt.ts:77-88`) stays for `writePageMeta` (`pageMetadata.ts:169`) and the restore scrub (`restoreScrub.ts:90`), which can meet a page trashed before E-6. `ensureFolderId` (`adopt.ts:158-164`) loses `gatherParentRef`'s call (`Core/Trash/gather.ts:19-31`), which reads the tree's container id once every held folder carries one (F); `foldersById` (`Core/Trash/restoreProperty.ts:21-28`) reads the tree for the same reason. `stampAdopted` (`adopt.ts:166-189`) survives as the open's folder pass (adoption rules, the Agenda re-home, sidecar migration) and stops reading pages: pages stamp from the walk's read (F-197).

**Held Temporary IDs:** order lists, the baseline, and group ranks never persisted one. Tabs and recents can (`navRecents.test.ts`); after retirement an `adopted-` key resolves to nothing and reconcile drops it.

##### The Index Corpus and Agenda

The seed's corpus (`nexusCorpus`, `indexSeed.ts:86-88`) exceeds the tree's by root-level `.md` files, pages in root folders that resolve unknown, nested folders with an Agenda sidecar, and `/Tasks` and `/Events`, which the walk never enters (`readNexus.ts:320-328`, `:164-170`). Task and Event files index today with no rows, since `sweepAdmitsBody` admits them as pages that contradict (`pageFile.ts:184-186`); the root files and unknown folders index with full rows, so dropping them from the index loses their backlinks (A-2). On NexusOS and `~/Test` the gap is zero files today (C).

- **Extending the Walk:** about +50 in `readNexus.ts` (listing root files, unknown folders, and the Agenda folders, and reading their text into the index batch) against about −40 of the seed's traversal (`indexSeed.ts:185-223`), roughly flat. It needs a Task and Event reader that doesn't exist, and it puts files outside the model into the model's walk.
- **Recommended:** The walk indexes the tree's pages from its own read, and the seed keeps its traversal as a remainder pass over `nexusCorpus` less the tree's paths. D-2 holds, since every page is read once: the remainder reads only files outside the tree. Agenda joins the walk when Agenda gets its reader (*§Prospects*). C's phase-3 removal falls by the 40 lines this keeps.

##### The `treeIndex` Cache

The walk (`Core/Nexus/treeIndex.ts:57-142`) reads `personalization.defaultIcons` (`:59`), `nexus.name` (`:64`, which stays on the tree), `nexus.profileIcon` (`:65`), and `pageMetadata[id].icon` (`:98`), and `pagesOf` carries the page icon (`:239`). Recommended: the cache keys on the tree plus those three config fields, `identityOf`'s pattern (`contextIdentity.ts:23-33`), which already keys on `tree.contexts` plus `defaultIcons`. A settings toggle then keeps every projection; a page-icon or profile-icon write rebuilds, as it does today. Moving icon resolution out of the walk would spread `entityIcon(kind, raw, defaultIcons)` across every display surface. The cost is edits, not lines: every projection takes the config beside the tree across 43 non-test importer files, and `contextIdentity.ts` takes it too; `contextOptions.ts:6` reads entities only and keeps its tree key. It's phase 1's widest touch.

##### Own Plan

- **Phase 5:** Stays in the main plan as its last phase. J-8's threshold is manageability, and phase 5 is the smallest phase (about 140 removed and 140 added). Its cuttability is already served by running last, and J-6's re-pin at its start covers C's point that it builds on phase 2's vocabulary and phase 3's readers. The plan writes it to near-literal code where HEAD code exists (`land.ts`, `watchSettle.ts`, `watcher.ts`) and to signature level where it composes phase 2 and 3 names.
- **Phase 3's Watcher Stamp and Index-From-the-Walk:** Stay in phase 3; both follow `readPage`'s signature, and E-6 is phase 3's by the Decision Log's order.
- **Incremental `treeIndex` Maintenance:** Deferred, with an A-6 measurement at phase 2's closeout: today a mutation rebuilds the index twice (the optimistic apply and the confirming push); phase 2 rebuilds it once per change list, so nothing regresses. D sized it at about +60.
- **No other split.** E's delete replay goes to F-622 only if it grows past one record variant and one replay arm.

---

#### Phase 1: Foundation

Entities table, the config record, `profileSubtitle`'s deletion, the Trash rider (F-2, F-3, restore's duplicates), and the four standalone defects (I-1).

##### Files

| File | Deleted (HEAD Lines) | Added (Signature Level) |
|---|---|---|
| `Core/Nexus/entities.ts` | — | `ENTITY_KINDS` over collection, set, page, context, space, task, event, each with node type, record kind, mutable, container, sidecar key, id mark (`P`, `T`, `E` for content), and phase-3 reader; derived `EntityKind`, `NodeKind`, `RecordKind`, `MutableKind`, `ContainerKind`, `MUTABLE_KINDS`, `CONTAINER_KINDS`; `isContainerKind(k)`, `sidecarKeyOf(k)`. `Core/Paths` imports nothing from `Core/Nexus`, so Paths keeps `SIDECAR_FILENAME` (`nexusPaths.ts:50-56`) and the table maps kind to its key |
| `tree.ts` | `NodeKind` (`:9`); root fields `profileImage`, `profileIcon`, `profileSubtitle` (`:95-98`), `homepage`, `crops`, `pageMetadata` (`:100-102`), `contextOrder`, `personalization`, `commands`, `excluded`, `assetDirectory`, `registry` (`:106-112`) | `NexusConfig { profile, homepage, crops, pageMetadata, order, personalization, commands, excluded, assetDirectory, registry }`; `NexusPicture`; `NexusState`'s open arm (`:117`) carries `config`. Stays on the tree: `collections`, `contexts`, `nexus.id`, `nexus.rootPath`, `nexus.name`, `unreadable` |
| `record.ts`, `mutateRequest.ts`, `schemas.ts` | Literals at `record.ts:4`, `mutateRequest.ts:32`, `:39`, `schemas.ts:72` | Derived from the table; `bannerOwner` (`mutateRequest.ts:36`) reads it plus the two surfaces |
| `Core/Settings/codec.ts` | `profileSubtitle` (`:41`, `:99`) | — |
| `readNexus.ts` | `profileSubtitle` (`:361`); the root's config assembly (`:354-375`) | `walkNexus` returns `NexusPicture`; `readNexusConfig` (`:286-287`) builds `NexusConfig` |
| `watchPatch.ts` | Root spreads in `applySettingsLeaves` (`:427-441`), `patchOrderFromDisk` (`:443-458`), `patchHomepageFromDisk` (`:460-463`), `patchCropsFromDisk` (`:465-468`), `patchMetadataFromDisk` (`:470-479`) | Each writes the config record through `patchLiveConfig` |
| `liveTree.ts` (114) | — | `heldConfigOf(root)`, `patchLiveConfig(fn)`, `setConfigTap(fn)`; the walk's writers (`seedLiveTree`, `runWalk`) set both |
| `mutatePatch.ts` | — | `confirmBy` (`:212-237`) compares the picture |
| `Core/Settings/settings.ts` (171) | `liveLeaves`'s tree read (`:36-41`); `updateScope`'s tree patch (`:72-78`) | Both read and patch the config record |
| `treeIndex.ts` (361) | The cache key (`:46-55`) | Keyed on tree plus `defaultIcons`, `profileIcon`, `pageMetadata` |
| `contextIdentity.ts`, `sidebarDndModel.ts:58` | `tree.personalization` reads | Config reads |
| `Core/Session/configSlice.ts` (83) | The tree patch (`:46-53`) | — |
| `Core/Session/nexusSlice.ts` (300) | `applyTree`'s settings copy (`:195-200`) | `applyPicture(picture)`: `stabilize` the tree, apply config by key |
| `bridge.ts`, `useBridgeSubscriptions.ts`, `confirm.ts:10-16`, `Desktop/FileWatch/watcher.ts:170` | — | `nexus:changed` carries `NexusPicture` |
| `Desktop/main.ts` | — | `refreshMenu` (`:172-177`) registered on `setConfigTap` |
| About 70 reader sites (A *§Model*, D's field table) | `tree.<field>` reads | `config.<field>` reads |
| `Core/Files/atomicWrite.ts` | — | `relocate<T>(from, to, landed?): Promise<T \| undefined>`: `lock(from)` around `recordWrite` both ends and `rename`, then `landed`, then `reportRename` |
| `Core/Nexus/page.ts` | `relocatePage` (`:53-61`) | `renamePage` and `movePage` call `relocate` |
| `Core/Nexus/folderEntity.ts` | `landedFolder`'s `reportRename` (`:36`); the echo-and-rename lines (`:68-70`, `:81-83`) | `landed` parameter on `renameFolderEntity` and `moveFolderEntity` |
| `Core/Trash/bundle.ts`, `delete.ts` | `settleBundle`'s body (`:38-41`); delete's lock narrows to `discardFile` (`:88-91`) | `settleBundle` wraps `relocate` (`deleteOrder.test.ts:73-76` mocks it) |
| `Core/Trash/spend.ts` | `rekeyPassengers` (`:50-71`), `restoredSpaceTitles` (`:73-80`), the unreachable path guard (`:198-207`), the echo, `mkdir`, and rename (`:249-253`) | `relocate(artifactAbs, targetAbs, landed)`; `landed` runs `moveIndexPaths` and, for a folder, `reseatExcludedFolders` |
| `gather.ts`, `holdings.ts` | Space-sidecar loops (`gather.ts:93-98`, `holdings.ts:113-116`); the stale doc line (`holdings.ts:75`) | Read `spaceIdsIn` |
| `Core/Contexts/spaceSidecar.ts` | — | `spaceIdsIn(contextDir)`: name to id, and whether a present sidecar was unusable |
| `Core/Contexts/contextCascade.ts` | Echo-and-rename lines (`:229-232`, `:245-249`, `:283-287`) | `rekeyContext`, the Context branch of `rewriteRoot` (`:43-60`) in `withOrderEntry` (`:128`) |
| `Core/Paths/names.ts` | `createDisambiguated`'s loop (`:67-71`) | `nameSteps(name, bareHeld)`; `createDisambiguated(name, attempt, taken)` |
| `create.ts:58`, `:85`, `:100`; `rename.ts:37`; `Core/Assets/assetWrite.ts:22` | — | A `taken` probe per call |
| `Core/Matrix/matrixFile.ts`, `configReach.ts` | `configReach.ts:379-383`'s raw write | `editMatrixFile(root, mutate)`; both writers call it |
| `Core/Nexus/remint.ts` | The Context early return (`:68`) | `remintContextEntry`, which also copies `order.spaces` to the fresh id |
| `Core/Nexus/session.ts` | — | `whileAdopting` (`:15-23`) chains each adoption behind the last |

##### Decisions

- **The Push:** `nexus:changed` carries `NexusPicture` (*§The Picture and the Push*).
- **The `treeIndex` Key:** tree plus the three icon inputs (*§The `treeIndex` Cache*).
- **`order` in Config From Phase 1:** `NexusConfig.order` holds all of `state.json`'s order record, so phase 2's ranking needs only the container fields.
- **The `registry` Join:** `registry` moves to the config record; each Collection's `properties` join stays on the tree, and `repointRegistryInTree` stays its one writer.
- **The `commands` Fix:** keyed on `setConfigTap`, and coordinated with the uncommitted `hostCommands.ts` work, whose `setHostCommands` becomes part of what the tap calls.
- **Name Stepping (F-3):** `createDisambiguated` asks `taken(bare)` only when `attempt(name)` answered `exists` and `name` ends in a counter.
- **Behavior on a Corrupt `matrix.json`:** a delete's reach rebuilds it from its last read (`REPAIRABLE.matrix`, `atomicWrite.ts:227`) instead of skipping it and counting it in `reach.skipped`, matching the Matrix's own writes.

##### Tests

- **Kinds:** `confirmations.test.ts` (157), `deleteReach.test.ts` (388), `mutateRequest.test.ts` (44), `schemas.test.ts` (42).
- **Config Record:** `Core/Testing/testTree.ts` (104; 35 test files build through `makeTree`) gains a config builder. Direct readers of root config fields: `spend.test.ts` (1,713), `mutate.test.ts` (2,439), `readNexus.test.ts` (858), `watchPatch.test.ts` (787), `matrixInput.test.ts` (163), `matrixRuntime.test.ts` (831), `store.test.tsx` (1,120), `devicePrefsSeed.test.tsx` (389), `configSlice.test.ts` (69), `applyPersonalization.test.ts` (36), `treeIndex.test.ts` (195), `contextIdentity.test.ts` (135), `contextOptions.test.ts` (34), `useBridgeSubscriptions.test.tsx` (209), `treePatch.test.ts` (531), and A's grep list of 27 files, which includes some false positives.
- **Trash Rider:** `atomicWrite.test.ts` (374), `deleteOrder.test.ts` (327), `page.test.ts` (296), `writePathRace.test.ts` (114), `folderEntity.test.ts` (88), `trashRecovery.test.ts` (714), `restoreScrub.test.ts` (457), `restoreProperty.test.ts` (378), `trashRows.test.ts` (231), `contextCascade.test.ts` (666), `spaceSidecar.test.ts` (126), `names.test.ts` (134), `assetWrite.test.ts` (38), `assetMigrate.test.ts` (361).
- **Defects:** `matrixFile.test.ts` (96), `configReach.test.ts` (561), `remint.test.ts` (442), `remintLedger.test.ts` (392), `session.test.ts` (43), `sessionGate.test.ts` (49), `menu.test.ts` (154), `editorMenu.test.ts` (148).

##### Lines

About −145 removed and +200 added, net about +55. A's config and kinds (−40, +95) carry D's overlapping `tree.ts` and `applySettingsLeaves` share; D adds `configSlice.ts` and the push (−10, +10); F's rider (−90, +50) and defects (−5, +35); the config tap (+8).

---

#### Phase 2: Changes Report Themselves

The receipt, the one applier, the reply's change list, the versioned push, B-4's held order lists and F-603, and F-4 (a restore and a Space or Context delete confirm by their change list).

##### Files

| File | Deleted (HEAD Lines) | Added (Signature Level) |
|---|---|---|
| `Core/Nexus/mutatePatch.ts` (237) | `patchForMutation` (`:41-76`), `subtreeHoldsAdoptedId` (`:78-88`), `patchPage`, `patchEntityFromDisk`, `routeMutation` with the order pins (`:90-191`), `confirmMutation`, `confirmRegistry`, `routeRegistry` (`:193-210`), `confirmBy`'s sidecar flush (`:221-226`) | `commitChanges(root, changes): Promise<void>`: applies to the held picture in lock order, pushes, and keeps the walk fallback and root pin (`:212-237`) |
| `Core/Nexus/confirm.ts` (70) | `pushConfirmed`, `pushValueChanges`, `confirmWrite`, `confirmContainerWrite`, `confirmRegistryWrite`, `confirmSettingsWrite`, both `setTimeout` orderings (`:10-56`) | — (`confirmRescope` `:58-64` and `pushAssetWrites` `:67-70` stay) |
| `Core/Nexus/valuesChanged.ts` (143) | `noteValueWrite`, `noteSidecarWrite`, `flushSidecarWrites` (`:10-35`), `flushValueWrites` (`:123-143`) | — (`titlesOf`, `titleHeldOutside`, `frozenWorld`, the id indices stay) |
| `Core/Nexus/treePatch.ts` (576) | `reorderById` (`:401-406`), `byOrder` (`:518-520`), `atSlot` (`:122-126`) | `NexusChange`; `applyChanges(picture, changes): NexusPicture`, exhaustive, ranking through `resolveOrder` |
| `Core/Nexus/mutateRequest.ts` | `done` as a discard (`:23`) | `MutateOutcome.changes`; `retryUnreadable` lands in phase 3 |
| `mutate.ts`, `create.ts`, `move.ts`, `rename.ts`, `page.ts`, `reorder.ts` (`setChildOrder`, `dropFromChildOrder`), `pageMetadata.ts:111`, `Core/Settings/settings.ts:17-34`, `setBanner.ts`, `setHeadingIconHidden.ts`, `setIcon.ts`, `viewsFile.ts`, `contextWrite.ts:162-169`, `contextCascade.ts`, `governedSweep.ts`, `governedWrite.ts`, `optionOps.ts:104-112`, `Core/Trash/spend.ts`, `delete.ts` | `noteValueWrite` calls (`create.ts:67`, `move.ts:41`, `:69`, `spend.ts:263`, `governedWrite.ts:40`, `governedSweep.ts:88`, `fileHistory.ts:117`); `noteSidecarWrite` calls | Each writer returns its `NexusChange[]` from its request or its record; `setGovernedRootKeys` and `applyAdoptions` return the registry record they drop today |
| `Core/Nexus/handlers.ts:165-183`, `Core/Settings/handlers.ts`, `Core/Properties/handlers.ts` (`:69`, `:136`, `:153`), `Core/Views/handlers.ts:23`, `Core/Pages/handlers.ts` (`:35`, `:51`), `Core/Assets/handlers.ts:60` | The confirm calls | `commitChanges` with the reply's list |
| `Core/Session/nexusSlice.ts` (300) | The optimistic switch and its apply (`:236-282`) | `applyChanges` action; the create insert (`:284-296`) keeps `onCreated` ordering over the reply's `upsert` |
| `Core/Session/navigationSlice.ts` | — | `patchPagesFor` (`:675-685`) keys off `remove` and page `upsert` changes |
| `Core/Views/Host/pendingView.ts:121-157` | `orderInTree` fold | Composes `applyChanges` |
| `Core/Session/useBridgeSubscriptions.ts`, `bridge.ts:275` | — | `NexusPush` with `version`; resync on a gap |
| `Desktop/FileWatch/watcher.ts` | `flushValueWrites` (`:178`) | The watcher's patches still re-read until phase 5 and commit their result through `commitChanges` |
| `Core/Nexus/watchPatch.ts` | `patchSettingsFromDisk` (`:423-425`), `patchPageMetaFromDisk` (`:481-491`) | — |
| `Core/Testing/confirmedMutate.ts` (21) | — | B-6's side-by-side comparison: snapshot `getLiveTree()`, run today's confirm, apply `reply.changes` to the snapshot, assert `stabilize(applied, confirmed) === confirmed` |

##### Decisions

- **Seven Arms Still Read Unless Their Writers Change (B):** seeded `createPage`, `setContext` on a page, and `setProperty`'s adoption (through `setGovernedRootKeys` returning only adoptions, `governedWrite.ts:38-42`, and `applyAdoptions` discarding the registry); Space and Context delete (the member cascade returns no records); folder, Space, and Context restore; `setIcon` on a Context; the three rescope arms, which keep `confirmRescope` (B-8). Recommended: the adoption and cascade writers return their records (small), a page restore emits from `scrubReturning`'s written content, and a folder, Space, or Context restore keeps the walk until phase 3 hands it `readContainer` for one subtree.
- **Temporary IDs Between Phases 2 and 3:** `commitChanges` keeps one case: a `move` or `remove` over a subtree holding an adopted id walks. Phase 3 deletes it with E-6.
- **Lock Order (Architecture, Safety Properties):** emitted changes apply in the order their file locks were taken; `commitChanges` serializes per root.
- **B-6:** run the old confirm and the new list side by side through `confirmedMutate` (174 existing calls in six files) and one helper per side channel (views, properties, settings, pages); delete each confirm arm when its writer agrees.
- **Unchanged Writes:** a writer whose `mutate` answered null emits nothing (*§Receipts and Unchanged Writes*).

##### Tests

`mutatePatch.test.ts` (428), `watchPatch.test.ts` (787), `treePatch.test.ts` (531), `treeShape.test.ts` (76), `treeStabilize.test.ts` (52), `confirm.test.ts` (29), `valuesChanged.test.ts` (95), `mutate.test.ts` (2,439), `page.test.ts` (296), `configReach.test.ts` (561), `contextCascade.test.ts` (666), `optionOps.test.ts` (770), `governedSweep.test.ts` (74), `removeProperty.test.ts` (353), `Properties/handlers.test.ts` (191), `trashRecovery.test.ts` (714), `watcher.test.ts` (452), `useViewHost.test.tsx` (940), `store.test.tsx` (1,120), `useTileDoc.test.tsx` (498), `useBridgeSubscriptions.test.tsx` (209), `Ribbon.test.tsx` (196), `TrashFrame.test.tsx` (265); through `confirmedMutate.ts`: `spend.test.ts` (1,713; 116 calls), `indexMaintenance.test.ts` (304), `restoreScrub.test.ts` (457), `trashRows.test.ts` (231), `deleteReach.test.ts` (388).

##### Lines

About −380 removed and +335 added, net about −45. B's figures (−330, +300: the vocabulary and applier about +120, emissions about +110, `commitChanges` and the versioned push about +50, the window apply about +20) carry D's window half except the create insert and version check (−10, +10); A's remint share (−30, +10; the post-re-mint walk becomes applying the remint's changes); F-4 (−10, +15).

---

#### Phase 3: One Reader Per Kind

`readPage`, `readSpace`, `readContainer`; the index from the same read; M-2's notices; E-6.

##### Files

| File | Deleted (HEAD Lines) | Added (Signature Level) |
|---|---|---|
| `Core/Files/pageFile.ts` | `readPageDetail` (`:168-181`) | `readPage(abs, rel): Promise<PageRead \| null>`: admission (`member`, `missing`, or `unknown` with `contradicting` or `malformed`), id, title, path, frontmatter, raw `<Context>` keys, stat; the text for the parse call only |
| `Core/Nexus/readNexus.ts` (376) | `rawContextByNode`, `retainContextKeys` (`:103-114`), `PageRecord`, `readPageRecord` (`:116-137`), `readSet` (`:177-196`), `readPageCollection` (`:210-233`), `readSpace` (`:235-253`), the mints (`:130`, `:191`, `:225`, `:245`, `:305`) | `walkNexus` enumerates and calls the three readers; reports `missing` records; hands the index its rows |
| `Core/Nexus/containerFields.ts` | — | `readContainer(sidecar, name, children)`: the Collection-only fields in one place |
| `Core/Contexts/spaceSidecar.ts` | — | `readSpace(abs)`: `read`, `absent`, or `unreadable`; each caller keeps its own policy (the walk lists, the watcher walks, the world refuses) |
| `Core/Contexts/contextWrite.ts` | The inline decode (`:64-87`) | `loadContextWorld` reads through `readSpace` until phase 4 deletes it |
| `Core/Index/indexSeed.ts` | `extractPageIndex`'s admission prelude (`:44-46`), `recordPage` (`:107-111`), `indexWrittenPage`'s stat and read (`:120-151`) | `indexPage(rel, text, stat)`; the seed becomes the remainder pass |
| `Core/Index/contentIndex.ts`, `Core/Platform/stores.ts`, `Desktop/Store/stores.ts`, `Core/Testing/memoryStores.ts` | The five write wrappers (`contentIndex.ts:22-40`), methods (`Platform/stores.ts:44-48`), and implementations (`Desktop/Store/stores.ts:50-97`) | `writeIndex(batch: IndexBatch)` under one `inTransaction` (`driver.ts:16-26`), statements prepared once, the gate row last per page |
| `Core/Nexus/adopt.ts` | `stampListed` (`:90-100`); `stampTree`'s page read | `stampPage`, `stampFolder` exported; `stampMissing(root, missing): Promise<StampResult[]>` |
| `Desktop/FileWatch/watcher.ts` | — | `stampMissing` in `settle` after `dropOwnEchoes` (`:158`), over the patch's and the fallback walk's `missing` records |
| `Core/Nexus/watchPatch.ts` | `patchContainerFromDisk`'s builder (`:376-393`), `patchSpaceFromDisk`'s builder (`:406-414`), inline context resolution (`:332-334`), the mints (`:374`, `:404`) | The patchers read through the readers |
| `ids.ts`, `reorder.ts`, `creationOrder.ts`, `bandRouter.ts`, `remintLedger.ts`, `NavList.tsx`, `navigationSlice.ts`, `cascade.ts:130`, `keyHolders.ts:59`, `mutatePatch.ts`' remaining case | *§E-6: Every Temporary-ID Site* | — |
| `Core/Pages/handlers.ts` | — | `page:open` through `readPage`; refuses unknown |
| `Core/Interface/Notifications/notifications.ts` | — | The two notices' copy beside `notifyRetry` (`:57-62`) |
| `mutateRequest.ts`, `mutate.ts` | — | `retryUnreadable(path)` |
| `Core/Trash/gather.ts:19-31`, `restoreProperty.ts:21-28` | The stamp and the disk scan | Tree lookups |
| `Core/Views/loadValues.ts:18-28` | The second frontmatter decode | Takes the record's frontmatter |

##### Decisions

- **What the Reader Returns and What's Cached:** *§The Parse Cache and the One Page Reader*.
- **Stamp Placement:** the read is read-only; `stampMissing` writes after it, at open (pages from the walk's read, F-197), at settle, and after a fallback walk. A folder's stamp writes the sidecar its reader then reads, so at settle a new folder stamps before its read; a nested folder under a held container resolves as a Set (`folderKind.ts:54`). Each stamp is one read plus the stamp's own read-modify-write: `stampPage` re-reads inside `rewritePageSerialized`'s lock by design. Both stamps take the file's lock and record their echo with bytes, so the stamp's own event drops at the next settle.
- **A New Root Folder Mid-Session:** resolves unknown today (`folderKind.ts:55-56`) and appears only at the next open. E-6 reads as covering it; recommended: the settle applies the open's adoption rule (a sidecar, or content inside) to a root folder that gains content, so it becomes a Collection live. Nathan's call if he reads E-6 as pages and nested folders only.
- **Space Stamp:** *§E-6* (recommended: `stampFolder` takes the Space kind).
- **Nexus Root Fallback:** *§E-6* (recommended: moves into `identity.ts`).
- **J-4 Duplicate Re-Mint Timing:** live at settle. The store already holds the original's path, which is E-5's first evidence, and E-6 already writes into a file on first sight.
- **Notices (M-2):** `tree.unreadable` entries gain a reason. **'Item' contains unreadable metadata** covers a foreign or malformed `ID:`, a duplicate whose copy can't be written, and a failed stamp; **'Item' contains invalid metadata** covers a Pommora ID of the wrong kind. `retryUnreadable` reads the file through `readPage`, mints for `malformed` (E-3's explicit override of the Unknown rule), only re-reads for `contradicting`, and upserts a `member`.
- **The Index Corpus:** *§The Index Corpus and Agenda* (recommended: the remainder pass).
- **F-206:** four of `indexWrittenPage`'s eight callers hold the text they wrote (`governedWrite.ts:41`, `governedSweep.ts:89`, `contextCascade.ts:186`, `fileHistory.ts:116`) and call `indexPage`; `stampListed`'s call goes; `cascadeSeen` takes the patch's record; `moveIndexPaths` stays text-free.

##### Tests

`ids.test.ts` (99), `reorder.test.ts` (163), `creationOrder.test.ts` (163), `bandRouter.test.ts` (298), `remintLedger.test.ts` (392), `mutatePatch.test.ts` (428), `adopt.test.ts` (207), `admission.test.ts` (330), `normalizeSavedViews.test.ts` (145), `readNexus.test.ts` (858), `readPageDetail.test.ts` (68), `loadValues.test.ts` (126), `pageMetadata.test.ts` (188), `identity.test.ts` (181), `treeIndex.test.ts` (195), `navRecents.test.ts` (54), `navRef.test.ts` (19), `tabsModel.test.ts` (444), `glanceSlice.test.ts` (119), `windowSlice.test.ts` (132), `watchPatch.test.ts` (787), `watcher.test.ts` (452), `watchSettle.test.ts` (128), `spaceSidecar.test.ts` (126), `deleteProperty.test.ts` (304), `contextWrite.test.ts` (296), `viewsFile.test.ts` (375), `indexSeed.test.ts` (331), `indexMaintenance.test.ts` (304), `contentIndex.test.ts` (159), `matrixGraph.test.ts` (76), `Desktop/Store/stores.test.ts` (106), `Desktop/Store/open.test.ts` (255), `exclusionScan.test.ts` (274), `cascade.test.ts` (617), `keyHolders.test.ts` (179), `restoreProperty.test.ts` (378), `spend.test.ts` (1,713), `mutate.test.ts` (2,439); test support `memoryStores.ts` (304) and `storesContract.ts` (451, 26 call sites).

##### Lines

About −340 removed and +245 added, net about −95. A's readers and E-6 (−230, +140); C's share net of the E-6 sites A counted and of the seed traversal the remainder pass keeps (−95, +100: the batch, the stamp pass, the unreadable arm, `indexPage`); F's two tree lookups (−13, +3).

---

#### Phase 4: Contexts and Properties

G-3's one lookup and fixes, under G-4's three rules; F-200 and F-201 (K-1, K-2).

##### Files

| File | Deleted (HEAD Lines) | Added or Changed |
|---|---|---|
| `Core/Contexts/contextWrite.ts` (291) | `SpaceRef` (`:41-48`), `NO_CONTEXT_WORLD` (`:55-58`), `loadContextWorld` (`:60-90`), `contextDriftPresent` (`:134-148`) | `contextTarget` (`:93-107`) reads `spaceById`; `governedWorldOf` (`:150-160`) reads the tree world; `setSpaceContext` (`:172-205`) decides each far half inside its read-modify-write and passes defs; `setContextOp` (`:207-221`); `setSpaceColor` (`:266-278`) |
| `Core/Contexts/contextResolve.ts` (138) | `idsByExactTitle`, `spacesByTitle` (`:31-42`), `resolveTreeContextKeys` (`:67-74`) | `contextWorldOf(groups): ContextWorld`, a WeakMap on the groups array; `resolveContextKeys(raw, world)`; `reconcileGovernedRoot` (`:82-120`) reads the maps; `preservedChanges` (`:128-137`) unchanged |
| `Core/Nexus/readNexus.ts` | `resolveEntityContexts`' rebuild (`:67-76`); the attach pass (`:333-352`), which also closes F-211's in-place write | Callers of `contextWorldOf` |
| `Core/Contexts/contextCascade.ts` (361) | The failure arm's discarded reversal (`:242-253`) | A reversed journal record written first; `renameSpaceOp` (`:260-296`) reads the lookup; `replayContextJournal` gains the delete arm |
| `Core/Contexts/contextJournal.ts` (49) | — | `ContextJournal = RenameJournal \| DeleteJournal` |
| `Core/Trash/delete.ts` | — | The delete record around `:53-102` |
| `Core/Properties/setProperty.ts` (59) | — | `setSpaceProperty` (`:17-32`) reconciles with the registry's defs |
| `Core/Properties/repairSweep.ts` (56), `keyHolders.ts` (72), `pageRow.ts` | `:13`, `:25-26`; `keyHolders.ts:34-37` if the tree answer is taken; `pageRow.ts:7`, `:17` | Lookup reads |
| `Core/Trash/restoreScrub.ts` (104) | `liveWorld` (`:26-36`) | `reconciledSidecar` (`:38-50`) takes defs |
| `Core/Nexus/mutate.ts` | — | `setProperty` (`:133-134`), `setSpaceColor` (`:164-165`), `setSpaceRowOrder` (`:182-186`) under `underContexts` |
| `registryProperty.ts:112`, `optionOps.ts:186`, `:235`, `deleteProperty.ts:91`, `contextCascade.ts:223`, `:282` | — | One refused-journal policy |
| `Core/Nexus/create.ts:39-49`, `Core/Nexus/handlers.ts:81` | — | Lookup reads; the delete replay's placement |

##### Decisions

- **`GovernedWorld`:** wraps `ContextWorld` beside `defs` rather than keeping a second map shape.
- **Refused Journal Writes:** proceed unjournaled and report it, the policy `journalSlot.ts:1` states and Properties' option edits follow. The property rename gains `replayable`; Contexts' two sites report through `MutateOutcome.cascade`'s warning, with no new channel.
- **Widen the Lock:** `setSpaceColor` and `setSpaceRowOrder` join `setProperty` under `underContexts` (one line each; the same race class).
- **Delete Replay Placement:** the sweep and settle replay at `handlers.ts:81`; the config reach runs after the walk through `refreshAfterWrite`, as `replaySchemaCascade`'s does (`:94-97`), so the record carries no serialized `ConfigEdit`.
- **`confirmedKeyHolders`' Space Half:** answered from the tree through `spaceKeyHolders`, matching the page half's index window; the rename's refusal (`registryProperty.ts:109-110`) accepts that window.
- **Re-Earned First:** a test pinning that a Space absent from the tree leaves a property write's tags naming it untouched and fails a Context write targeting it with not-found, before `loadContextWorld` goes (`governedWorldWrite.test.ts:125`, `:159` pin the disk world today).

##### Tests

Contexts: `contextWrite.test.ts` (296), `contextResolve.test.ts` (184), `contextCascade.test.ts` (666), `contextJournal.test.ts` (20), `contextIdentity.test.ts` (135), `contextOptions.test.ts` (34). Properties: `governedWorldWrite.test.ts` (223), `setSpaceProperty.test.ts` (85), `governedWrite.test.ts` (185), `pageValue.test.ts` (120), `repairSweep.test.ts` (184), `keyHolders.test.ts` (179), `deleteProperty.test.ts` (304), `pageRow.test.ts` (32), `columnLabel.test.ts` (57), `valueContext.test.ts` (42), `registryProperty.test.ts` (253), `journalWiring.test.ts` (353), `optionOps.test.ts` (770), `replaySchemaCascade.test.ts` (510). Nexus: `mutate.test.ts` (2,439), `admission.test.ts` (330), `handlers.test.ts` (261), `readNexus.test.ts` (858), `watchPatch.test.ts` (787), `mutatePatch.test.ts` (428), `liveTree.test.ts` (142). Trash, through `mutate`: `trashRecovery.test.ts` (714), `restoreProperty.test.ts` (378), `deleteOrder.test.ts` (327), `deleteReach.test.ts` (388), `spend.test.ts` (1,713). Elsewhere: `sessionGate.test.ts` (49), `indexMaintenance.test.ts` (304), `loadValues.test.ts` (126), `propertyMenuActions.test.ts` (237), `watcher.test.ts` (452).

##### Lines

About −120 removed and +150 added, net about +30 (E; A's attach-pass share and F's `liveWorld` are inside it). The projection is about +40, the delete record and replay about +55, the journal policy 10 to 20, the Space reconcile about +15, the reversal, lock, and in-RMW decision about +10.

---

#### Phase 5: Outside Edits

The watcher reads one file through phase 3's readers, the walk returns its diff, and Sync's landings emit. Last, and cuttable (H-1).

##### Files

| File | Deleted (HEAD Lines) | Added (Signature Level) |
|---|---|---|
| `Core/Nexus/watchPatch.ts` | `patchPageFromDisk` (`:319-358`), what remains of `patchContainerFromDisk` (`:360-395`) and `patchSpaceFromDisk` (`:397-416`), `replaceNode` and `removePage` (`:237-241`), the batch forfeit (`:215`), the convenience walks (`:165`, `:167-168`, `:184`, and the foreign-ID walk at `:144-145`), `WatchPatch.touched` and `classes` (`:197-201`) | `applyWatchEvents(root, events, scope): Promise<{ changes: NexusChange[]; walked: boolean }>` |
| `Core/Nexus/watchSettle.ts` | `classifyBatch` (`:50-54`), `valueChangesOf` (`:56-70`), `tilesChangedIn` (`:72-79`), `pagesChangedIn` (`:81-85`) | Push lists projected from `NexusChange[]` |
| `Desktop/FileWatch/watcher.ts` | The walk-only tail (`:185-194`) folds into the change list | The asset relist keyed on `walked` |
| `Core/Nexus/treePatch.ts` | — | `diffPicture(before, after): NexusChange[]` for Reload, the fallback walk, and `confirmBy`'s walk, which closes F-620 |
| `Core/Sync/Arrival/land.ts` | — | `landWrite`, `landDelete`, `landRename` (`:83-144`) return `Promise<NexusChange[]>` read through the readers; each records its echo (bytes for a write, bytes-less on both endpoints for a rename, as `page.ts` does) |
| `Core/Sync/Client/pull.ts` | — | Collects the landings' changes and commits them (`:35`, `:51`, `:54`, `:63`, `pull.ts:88-96`) |

##### Decisions

- **Walks That Stay:** the root escape, a missing tree, `nexus.json`, a thrown patch, a moved scope, and the fallback.
- **F-620:** closes only if `confirmBy`'s fallback walk returns its diff and `settle` pushes and indexes from that list.
- **`landBytes` Echo:** `atomicWrite.ts:29-39` never calls `recordWrite`; the landing records it so the watcher drops the landing's own events and the tap's hash check turns its push into nothing.

##### Tests

`watchPatch.test.ts` (787), `watchSettle.test.ts` (128), `watcher.test.ts` (452), `mutatePatch.test.ts` (428), `indexMaintenance.test.ts` (304), `Core/Sync/Client/tap.test.ts` (141), `Core/Sync/Arrival/land.test.ts` (332), `pull.test.ts` (255), `push.test.ts` (577).

##### Lines

About −140 removed and +140 added, roughly flat. C's figures (−165, +140) less the two builders phase 3 already replaced (−27).

---

#### Lines, All Phases

| Phase | A | B | C | D | E | F | Reconciled Removed | Reconciled Added | Net |
|---|---|---|---|---|---|---|---|---|---|
| 1 | −40 / +95 | −5 / 0 | — | −30 / +40 | — | −95 / +85 | −145 (−110 to −180) | +200 (+150 to +250) | about +55 |
| 2 | −60 / +20 | −330 / +300 | — | −55 / +40 | — | −12 / +30 | −380 (−300 to −450) | +335 (+270 to +420) | about −45 |
| 3 | −230 / +140 | — | −160 / +120 | — | — | −13 / +3 | −340 (−270 to −400) | +245 (+190 to +310) | about −95 |
| 4 | −40 / +10 (with 5) | — | — | — | −120 / +150 | −11 / +2 | −120 (−90 to −150) | +150 (+115 to +190) | about +30 |
| 5 | (with 4) | — | −165 / +140 | — | — | — | −140 (−110 to −180) | +140 (+110 to +180) | about 0 |
| **Total** | −370 / +265 | −335 / +300 | −325 / +260 | −85 / +80 | −120 / +150 | −131 / +120 | **about −1,125** | **about +1,070** | **about −55 (+200 to −350)** |

**De-Duplication:** B's phase-1 `persistable` is E-6 and sits in A's phase 3. D's phase-1 `tree.ts` fields and `applySettingsLeaves` overlap A's; D's phase-2 switch and window apply overlap B's. C's phase-3 E-6 sites overlap A's, and its seed traversal stays under the remainder pass. C's phase-5 patchers include the builders A replaces in phase 3. A's phase 4 and 5 share (the attach pass and `resolveEntityContexts`) and F's `liveWorld` are E's. Not sized by any slice: the handler call sites of the confirm helpers (about −30) and incremental `treeIndex` maintenance (about +60, deferred).

**Against the Decision Log:** *§Overview*'s "about 850 to 2,300 fewer" comes from the investigation's untrimmed catalogue, which counted F-611's door folding, F-622's shared machinery, and a flat store. With those deferred or rejected and the nested store kept, the slices size the mandate at roughly flat to about −350 net. The added side is the least certain, since the applier, the readers, and the lookup aren't designed yet.

---

#### Unverified

- Every line figure is a code-read judgment; nothing was prototyped or driven live.
- The 43 `treeIndex` importers are counted by file; how many read a resolved `.icon` wasn't counted.
- The unsized remainder: the confirm call sites in the handlers, and whether `pendingView.ts` composes the applier without its own rules.
- chokidar's event order for a Finder or Obsidian create-then-rename, and whether a folder moved in from outside emits one `add` per child, which the settle stamp relies on.
- Whether a Context's device rows keyed by its id need copying on its re-mint (F).
- Whether `openStores` reuses the index store when the same root reopens, which decides whether the delete replay gets index answers on a reopen (E).
