## A03 — `src/main/CRUD/` + `mutate.ts` / `mutatePatch.ts` / `shared/mutate.ts`

Scope measured: 30 non-test CRUD files + 3 entry files = 4,336 wc lines (≈3,700 with comments/blanks stripped); 30 test files = 5,472 lines. No file in scope imports `electron`. Every fs touch is `node:fs/promises` / `node:path` / `node:crypto`, either direct or through `IO/atomicWrite`, `IO/pageFile`, `IO/fileLock`, `sidecarIO`, `IO/walk`, `Database/*`.

Line references are `file:line` against the current tree (HEAD `7c7c7542`).

---

### Part 1 — Placement

#### 1. File Table

Columns: **wc / stripped** · **class** (P = pure, N = node-bound with direct `node:*` imports listed, T = transitively node-bound only) · **non-test importers** (count → folders) · **domain** · **reduces to the primitive set?** · **Core home**.

| File | wc/strip | Class | Direct `node:*` | Importers | Domain | Primitive-reducible | Core home |
|---|---|---|---|---|---|---|---|
| `assignment.ts` | 134/112 | N | `path{join,sep}` | 8 → CRUD×6, `main/index`, `main/repairSweep` | schema assignment | yes (`sep` prefix test → posix) | `Core/Schema/assignment` (merge with `removeProperty`) |
| `cascade.ts` | 57/48 | N | `path{join}` | 1 → `main/mutate` | page CRUD ([[link]] rename cascade) | yes; SQLite `queryMentions` behind `contentIndex` | `Core/Connections/renameCascade` — not a schema/governed mechanism |
| `containerConfig.ts` | 43/34 | T | — (`sidecarIO`) | 1 → `main/index` | container config | yes | `Core/Containers/sidecarField` (fold) |
| `contextCascade.ts` | 337/287 | N | `fs{rename}`, `path{basename,join,sep}` | 3 → `main/index`, `main/mutate`, `main/provenance` | context cascade | yes | `Core/Contexts/cascade` |
| `contextJournal.ts` | 49/38 | T | — (`journalSlot`) | 1 → `CRUD/contextCascade` | journals | yes | fold into `Core/Journal/records` |
| `contextWrite.ts` | 302/275 | N | `fs{mkdir,readdir}`, `path{join}` | 5 → `CRUD/contextCascade`, `CRUD/restoreScrub`, `main/mutate`, `main/repairSweep`, `main/tiles` | context cascade (create group/space, set-context, governed world) | yes; reads `liveTree` singleton; imports `tileDoc` | `Core/Contexts/write` (tile seed leaves) |
| `deleteProperty.ts` | 125/106 | N | `fs{readFile}` | 2 → `CRUD/replaySchemaCascade`, `main/index` | property registry (global delete) | yes; writes a `.trash` bundle via `provenance` | `Core/Schema/delete` |
| `fileHistory.ts` | 222/189 | N | `crypto{createHash sha1}`, `fs{readFile}`, `path{join}`, `setTimeout`/`NodeJS.Timeout`, `console.error` | 2 → `main/index`, `main/watchPatch` | history (not CRUD) | no: sha1 not sha256; timers = a clock port; SQLite `versionsDb` | `Core/History` behind Clock + SnapshotStore ports |
| `folderEntity.ts` | 77/69 | N | `fs{mkdir,rename}`, `path{join,dirname,basename}` | 4 → `CRUD/contextWrite`, `CRUD/reorder`, `main/identity`, `main/mutate` | container CRUD | yes | `Core/Containers/folderEntity` |
| `governedSweep.ts` | 139/112 | N | `fs{readFile}`, `path{join}` | 5 → `CRUD/contextCascade`, `CRUD/deleteProperty`, `CRUD/replaySchemaCascade`, `main/exclusionScan`, `main/repairSweep` | governed sweeps | yes | `Core/Governed/sweep` — THE sweep |
| `governedWrite.ts` | 40/32 | N | `fs{readFile}` | 2 → `CRUD/contextWrite`, `CRUD/page` | value load/write (single governed write) | yes; reads `sessionRoot()` singleton (`:38`) | `Core/Governed/write` |
| `journalSlot.ts` | 45/40 | N | `fs{rm}` | 2 → `CRUD/contextJournal`, `CRUD/propertyJournal` | journals | yes; reads `sessionRoot()` (`:37`) | `Core/Journal/slot` |
| `keyHolders.ts` | 30/23 | T | — (`contentIndex`, `indexSeed`) | 4 → `CRUD/deleteProperty`, `CRUD/optionOps`, `CRUD/registryProperty`, `CRUD/replaySchemaCascade` | governed sweeps (target enumeration) | yes; SQLite behind seam | `Core/Governed/keyHolders` |
| `loadValues.ts` | 62/50 | N | `path{join}` | 1 → `main/index` | value load (READ) | yes | `Core/Read/values` — misfiled under CRUD |
| `optionOps.ts` | 311/261 | T | — | 6 → `CRUD/contextWrite`, `CRUD/registryProperty`, `CRUD/replaySchemaCascade`, `main/index`, `main/mutate`, `main/repairSweep` | option ops | yes | `Core/Schema/options` (`cascadePages` → sweep) |
| `page.ts` | 118/96 | N | `fs{rename}`, `path{join,dirname,basename}` | 4 → `CRUD/fileHistory`, `CRUD/removeProperty`, `CRUD/restoreProperty`, `main/mutate` | page CRUD | yes | `Core/Pages/page` |
| `pageValue.ts` | 62/48 | P* | — (*imports `splitFrontmatter` from `readNexus`, dragging the walker's fs at module load) | 3 → `CRUD/optionOps`, `CRUD/removeProperty`, `CRUD/replaySchemaCascade` | option ops (value edit, string→string) | pure | `Core/Frontmatter/valueEdit` |
| `propertyJournal.ts` | 49/39 | T | — | 4 → `CRUD/deleteProperty`, `CRUD/optionOps`, `CRUD/registryProperty`, `CRUD/replaySchemaCascade` | journals | yes | `Core/Journal/records` |
| `reconcile.ts` | 25/20 | P | — | 2 → `CRUD/removeProperty`, `main/provenance` | util | pure | `Core/Util/reconcile` |
| `registryProperty.ts` | 181/159 | T | — | 4 → `CRUD/deleteProperty`, `CRUD/replaySchemaCascade`, `CRUD/restoreProperty`, `main/index` | property registry | yes | `Core/Schema/registry` |
| `removeProperty.ts` | 145/129 | T | — | 2 → `CRUD/assignment`, `main/index` | schema assignment (unassign + Remove-cache) | yes | `Core/Schema/assignment` (merge) |
| `reorder.ts` | 93/76 | N | `fs{mkdir}` | 1 → `main/mutate` | container config (orders) | yes | `Core/Containers/order` |
| `replaySchemaCascade.ts` | 94/83 | T | `console.error` | 1 → `main/index` | journals (replay) | yes | `Core/Journal/replay` |
| `restoreProperty.ts` | 82/68 | N | `path{join}`, `console.warn` | 1 → `main/provenance` | trash (property restore) | yes; reads `liveTree.refreshTree` + `record.projectBaseline` | `Core/Trash/restoreProperty` |
| `restoreScrub.ts` | 89/68 | T | — (`IO/walk`, `atomicWrite`) | 1 → `main/provenance` | trash (returning-content reconcile) | yes | `Core/Trash/scrub` → mostly a `Governed/sweep` call |
| `schemaChain.ts` | 12/6 | P | — | 7 → CRUD×7 | governed sweeps (serialization) | pure; **module-global** promise chain | `Core/Schema/chain` — per-nexus instance |
| `trashRows.ts` | 86/61 | N | `path{basename,dirname}` on POSIX rel paths | 1 → `main/index` | trash (READ projection) | yes (→ posix string ops) | `Core/Trash/rows` |
| `util.ts` | 44/26 | T | — (`pageFile` drags fs) | 11 → CRUD×9, `main/indexSeed`, `main/provenance` | util | yes | split: `invalidName*` → `Core/Naming`; `sweepAdmits*` → `Core/Frontmatter/admission`; `pathExists` re-export → delete |
| `views.ts` | 77/65 | T | — (`sidecarIO`) | 1 → `main/index` | views | yes | `Core/Containers/views` |
| `main/mutate.ts` | 784/705 | N | `fs{readFile,realpath}`, `path{basename,dirname,extname,join,relative,sep}` | 1 → `main/index` (`handleMutate`, `adoptFile`, `MutateDeps`) | dispatcher + assets + trash-delete + banners/icons | **no**: `realpath` (`:150,:164,:175,:197`) is outside the set | `Core/Mutate/dispatch` (thin) + `Core/Assets/adopt` + `Core/Trash/delete` + `Core/Containers/sidecarField` |
| `main/mutatePatch.ts` | 266/232 | T | — (`watchPatch`, `liveTree`) | 1 → `main/index` | live-tree confirmation (read cache) | yes | `Core/LiveTree/confirm` — not CRUD |
| `shared/mutate.ts` | 156/121 | P | — | many (renderer, main, shared) | request/reply contract | pure | `Core/Contract/mutate` |

Electron-bound: **none**. `mutate.ts` receives `deps.trashToSystem` / `deps.trashMode` / `deps.permanentDelete` injected from `index.ts` (`mutate.ts:91-98`), so the OS-trash dependency is already a port.

Primitive-set exceptions worth naming: `realpath` (mutate.ts adoption + reserved-path guard), `sha1` (fileHistory:33), `setTimeout`/`unref` (fileHistory:107-111), `sep`-based prefix tests that assume platform separators on paths the rest of the code treats as POSIX (`assignment.ts:125`, `contextCascade.ts:131`, `mutate.ts:198`).

#### 2. The Dispatcher (`mutate.ts`)

`dispatch()` spans `:253-784` (532 lines); helpers above it `:100-252` (152 lines); imports `:10-88` (78 lines, ~60 symbols from 30 modules).

**Thin delegations** — resolve → one module call → wrap (13 arms, 96 lines):
`restore` :414-424 (11) · `emptyBundle` :425-431 (7) · `setProfileSubtitle` :432-437 (6, `updateSettings`) · `setProfileIcon` :453-458 (6) · `reorderChildren` :700-708 (9) · `reorderTop` :709-715 (7) · `createContextGroup` :716-721 (6) · `createSpace` :722-729 (8) · `setContext` :730-745 (16) · `setSpaceColor` :746-750 (5) · `renameContext` :751-755 (5) · `renameSpace` :756-760 (5) · `reorderSpaces` :773-777 (5).

**Orchestrations** — one module call plus sequencing that exists only here (5 arms, 111 lines):
`createPage` :255-285 (31: seed→def resolution, `createDisambiguated`, `setChildOrder`, `indexWrittenPage`, `noteValueWrite`) · `createContainer` :286-302 (17: default-view mint + disambiguate) · `setProperty` :637-661 (25: lock + registry + `loadGovernedWorld` + `updatePageProperty` + index + `applyAdoptions`) · `movePage` :662-680 (19) · `moveSet` :681-699 (19).

**Inline bodies** — the operation's logic lives nowhere else (9 arms, **316 lines**):
`rename` :303-353 (51: page rename + `renameCascade` + revert-on-failure + `rewriteTileConnections` + folder branch) · `delete` :354-413 (60: write-ahead bundle, per-kind record gathering, `unlinkSpaceValue`/`unlinkContextKey`, registry erase by id, `settleBundle` vs OS trash, `deindexPath`) · `setProfileImage` :438-452 (15) · `setCrop` :459-467 (9) · `setBanner` :468-548 (**81**: four owner arms — page frontmatter, navview JSON, homepage JSON, folder sidecar — plus adoption timing and replaced-asset deletion) · `setHeadingIconHidden` :549-575 (27) · `setIcon` :576-624 (49: page frontmatter arm, Context-registry arm, sidecar arm) · `setDisclosureLock` :625-636 (12) · `reorderContexts` :761-772 (12: inline registry mutation).

Plus **124 lines of op logic disguised as helpers**: `adoptFile` :127-194 (68 — exported and consumed by `index.ts:1805` for file-property adoption: an Assets module living in the dispatcher), `dropReplacedAsset` :105-126 (22), `movesInto` :210-224 (15), `setOrDrop` :226-236 (11), `isReserved` :195-199 (5), `adoptImageSource` :250-252 (3).

Total op logic in the dispatcher ≈ 316 + 124 = **~440 of 784 lines (56%)**. The Context doc's claim ("early ops tidy, later ones inline") is accurate: the registry-backed Context/Space family (`:716-777`) is uniformly thin; the banner/icon/asset/trash family is uniformly inline.

**If every arm were a module:** `dispatch` ≈ 27 arms × ~5 lines ≈ 135, plus `handleMutate` (12), `MutateDeps` (8), imports (~30) ≈ **~190 lines**. Extractions: `Core/Assets/adopt.ts` (~95: `adoptFile`, `adoptImageSource`, `dropReplacedAsset`), `Core/Trash/delete.ts` (~70: delete arm + `isReserved`), `Core/Pages/rename.ts` (~50: rename policy incl. revert), `Core/Containers/sidecarField.ts` (~60 after dedupe: the banner/icon/headingIcon/disclosure sidecar arms + `setOrDrop`, merged with `containerConfig.ts`), page banner/icon arms → two calls to `setGovernedRootKeys` (−30), `reorderContexts` + the Context-icon arm → `contextsRegistry`. Net line delta ≈ −100 because the three page-frontmatter spellings collapse into one and the four sidecar RMW arms collapse into one `patchSidecarField(cfgPath, key, value, { requireId, seed })`.

#### 3. The Journal Family — Call Graph

```
index.ts (open-time)
 ├─ replayPendingRename ────────────── contextCascade:275
 │    ├─ readJournal / clearJournal ── contextJournal:47-49 → journalSlot('context-rename.json')
 │    ├─ readRegistryStrict / mutateRegistryFile ── contextsRegistry
 │    └─ cascadeTitle:110 → sweepContextRoots:72 → sweepGovernedRoots({kind:'nexus'}) ── governedSweep:75
 └─ replaySchemaCascade ────────────── replaySchemaCascade:20  (under serializeSchemaOp ── schemaChain)
      ├─ readSchemaJournal / clearSchemaJournal ── propertyJournal:47-49 → journalSlot('property-cascade.json')
      ├─ 'rename'        → renameSweep ── registryProperty:84 → cascadePages ── optionOps:283 → keyHolderFiles ── keyHolders:10 → rewritePageSerialized(renameFrontmatterKey)
      ├─ 'delete'        → keyHolderFiles + sweepGovernedRoots({kind:'files'}, stripKeyRewrite ── deleteProperty:98) + unassignAndPurge ── deleteProperty:109 + removeFromRegistry ── registryProperty:157
      ├─ 'option-rename' → cascadePages(replacePageValue ── pageValue:47)
      └─ 'option-remove' → cascadePages(stripPageValue ── pageValue:43) + dropOptionFromDef ── optionOps:129

mutate.ts
 ├─ renameContext → renameContextOp ── contextCascade:176 : writeJournal → rename(dir) → cascadeTitle → mutateRegistryFile → settleJournal:169
 ├─ renameSpace   → renameSpaceOp   ── contextCascade:233 : writeJournal → rename(dir) → cascadeTitle → settleJournal
 ├─ delete(space)   → unlinkSpaceValue ── contextCascade:148 → sweepContextRoots   [UNJOURNALED; captures via closure]
 ├─ delete(context) → unlinkContextKey ── contextCascade:125 → sweepContextRoots   [UNJOURNALED; captures via closure]
 ├─ rename(page)  → renameCascade ── cascade:23  [NOT governed keys, NOT journaled: [[link]] body/frontmatter text via Connections/rewrite + queryMentions; caller reverts on failure mutate.ts:335-343]
 └─ setProperty   → updatePageProperty ── page:106 → setGovernedRootKeys ── governedWrite:17 → reconcileGovernedRoot (shared)  [single file; no sweep, no journal]

index.ts (property channels)
 ├─ editProperty ── registryProperty:113 : confirmedKeyHolders ── keyHolders:19 → stageRename(writeSchemaJournal) → mutateRegistry → renameSweep → clearSchemaJournal
 ├─ deleteProperty ── deleteProperty:69 : keyHolderFiles → snapshot(writePropertyBundle) → writeSchemaJournal → sweepGovernedRoots(files) → unassignAndPurge → removeFromRegistry → clearSchemaJournal
 ├─ renameOption / renameStatusOption ── optionOps:214 : stageOptionRename → mutateRegistry → cascadePages → clearSchemaJournal
 ├─ removeOption / removeStatusOption ── optionOps:264 : writeSchemaJournal → cascadePages(strip) → dropOptionFromDef → clearSchemaJournal
 ├─ clearOption ── optionOps:251 : cascadePages   [unjournaled by design]
 ├─ removeProperty ── removeProperty:25 : own folderCorpus loop → rmwJsonStrict(sidecar cache) → rewritePageSerialized(stripPageMember)   [unjournaled; NOT via cascadePages or sweepGovernedRoots]
 └─ assignProperty ── assignment:86 → restoreCachedValues ── removeProperty:98 → reconcile ── reconcile:6 → updatePageProperty

provenance.ts (restore)
 ├─ restoreArtifact:608 → scrubReturning ── restoreScrub:61 : own rewritePageSerialized loop + own Space-sidecar loop   [a third sweep]
 ├─ restoreArtifact → reapply:735 → reconcile → addContextValues:453 (own rewritePageSerialized)
 └─ restoreArtifact(property) → restoreProperty ── restoreProperty:35 → createProperty + assignInner + updatePageProperty

repairSweep.ts:45   → sweepGovernedRoots({kind:'files'}) + reconcileGovernedRoot
exclusionScan.ts:84 → sweepGovernedRoots({kind:'files'}, () => null, { rewriteText })
```

**Verdict: one mechanism — "rewrite a governed key across N roots, each under its file lock, with a crash journal" — expressed through three sweep engines, two journal slots, and two replay entry points.**

- **Sweep engine A** `sweepGovernedRoots` (governedSweep) — pages + Space sidecars, skipped/refused split, raw-or-text decision, preserves mtime, notes + indexes. Callers: context cascade (via adapter), deleteProperty, replay-delete, repairSweep, exclusionScan.
- **Sweep engine B** `cascadePages` (optionOps:283-303) — pages only, scoped by `keyHolderFiles`, text decision, returns an unreadable count. `sweepGovernedRoots({kind:'files', files: await keyHolderFiles(...)}, …, { rewriteText })` with `.skipped.length` **is** B. Callers: option rename/remove/clear, `renameSweep`, replay option arms.
- **Sweep engine C** — ad-hoc `for file … rewritePageSerialized(admit ? rewrite : null); noteValueWrite; indexWrittenPage` loops: `removeProperty.removeInner:69-77`, `restoreScrub.scrubReturning:70-79` (+ sidecar loop :81-88), `cascade.renameCascade:32-55`, `provenance.addContextValues:470-474`.
- And A itself re-implements `rewritePageSerialized` inline (`governedSweep.ts:84-105`) to tell skipped from refused, which `rewritePageSerialized` collapses to `false`.

**Journals:** `journalSlot` is the one primitive and is correct. `contextJournal` and `propertyJournal` are thin instantiations (decode + equality) producing two on-disk files and two open-time entry points (`index.ts:382`, `:399`). One slot file with a discriminated record (`{domain:'context'|'schema', …}`) and one `replayPending(root)` erases two files and one wrapper.

**Pass-through files / members:**
- `contextJournal.ts` — one reader; instantiation only.
- `contextCascade.sweepContextRoots:72-87` + `SweepResult` alias `:68` — an adapter over `sweepGovernedRoots` that (a) rewraps `Raw|null → {next}|null` and (b) **discards `captured`**, while both callers (`unlinkContextKey:132-139`, `unlinkSpaceValue:154-158`) rebuild the capture list through a closure. The generic capture channel `sweepGovernedRoots` was built with (`Rewrite<C>`, `capture?: C`, `captured: C[]`) has **zero producers** in the codebase (`rg "capture:" main` → only the unrelated `capture:thumbnail` IPC name). Three mechanisms to move one list; one is unused, one throws away what the unused one fills, the third does the work.
- `keyHolders.keyHolderFiles:10-16` — a one-line composition (`corpusUnder(root, queryKeyHolders(key) ?? nexusCorpus(root), folders)`); earns its name as the seam; `confirmedKeyHolders:19-30` has one reader (`registryProperty:122`).
- `reconcile.ts` — generic 20-line loop; two readers; a Util, not CRUD.
- `governedWrite.ts` — **not** pass-through; it is the seam that should absorb `mutate.ts`'s page banner/icon arms.
- `cascade.ts` — **not in this family**: different key space ([[links]] in the body and connection-typed frontmatter values), different discovery (`queryMentions`), no journal, caller-side revert. Listing it with the governed-key journal family conflates two mechanisms.
- `replaySchemaCascade.ts` — a feature, not a pass-through; but each of its four arms restates the forward op's tail (`:46`, `:60-64`, `:75-77`, `:86-90`) because the forward ops don't expose (precondition, tail) pairs.

#### 4. Folder Verdict

Proposed tree inside a host-neutral Core package (stripped-line estimates after the collapses in Part 2; "port" = an injected interface the Desktop/Mobile host implements):

```
Core/
  Contract/          ~120   types + pure constants only; imports only Contract.            (shared/mutate.ts)
  Frontmatter/       ~150   string→string / string→record; no fs, no lock, no session.
    envelope.ts             splitEnvelope + ONE lenient parser (readFrontmatterFields ≡ splitFrontmatter today)
    merge.ts                mergeFrontmatter, renameFrontmatterKey
    valueEdit.ts            pageValue strip/replace + stripKeyRewrite folded (one "delete key")
    admission.ts            sweepAdmits / sweepAdmitsBody (from util.ts)
  Governed/          ~230   may call Host.fs + Host.lock; every parse via Frontmatter; owns THE sweep and THE governed single-file write.
    write.ts                setGovernedRootKeys (absorbs mutate.ts page banner/icon arms; takes root, no sessionRoot())
    sweep.ts                sweepGovernedRoots (absorbs cascadePages; built on rewritePageSerialized returning skipped|refused|untouched|written; capture channel used or deleted)
    keyHolders.ts           keyHolderFiles / confirmedKeyHolders / one holdersOf(root,key,folders,{confirm}) → {file, raw}
  Journal/           ~150   one slot file; identity lives in the record; takes root — never reads a session singleton.
    slot.ts                 journalSlot
    records.ts              RenameJournal | SchemaJournal union + decode/same
    replay.ts               replayPendingRename + replaySchemaCascade → one replayPending(root)
  Schema/            ~700   property registry, assignment, options, delete; may import Frontmatter/Governed/Journal/Host only.
    registry.ts             registryProperty
    assignment.ts           assignment + removeProperty merged (assign/restore-cache/remove/cache are one lifecycle; one cache-block writer)
    options.ts              optionOps minus cascadePages
    delete.ts               deleteProperty
    chain.ts                schemaChain as a per-nexus instance (reentrant or root-keyed) — kills the 4 Inner/outer wrapper pairs
  Contexts/          ~600   registry-backed groups + spaces; does NOT import Tiles.
    write.ts                contextWrite minus createSpace's 2×2 tile seed (Tiles owns "seed a host dir")
    cascade.ts              contextCascade + contextJournal folded; sweepContextRoots deleted (use the capture channel)
  Pages/             ~150
    page.ts                 createPage (no dead icon/body opts), rename/move/body/property
    rename.ts               the mutate.ts rename arm's cascade+revert policy + Connections/renameCascade
  Containers/        ~300   folder entities + sidecar fields; ONE kind→schema table.
    folderEntity.ts
    sidecarField.ts         views.ts readViewSidecar + containerConfig.ts + folderEntity.updateFolderSidecar + reorder.setContainerOrder + the mutate.ts icon/banner/headingIcon/disclosure sidecar arms → one patchSidecar(folder, kind, patch, {requireId, seed})
    views.ts                saveView / reorderViews / deleteView on sidecarField
    order.ts                setStateOrder / setSpaceOrder / setChildOrder
  Trash/             ~200 (in-scope slices; provenance.ts itself is out of scope)
    delete.ts               mutate.ts delete arm + isReserved
    restoreProperty.ts
    scrub.ts                restoreScrub expressed as a Governed/sweep call over an explicit file list
    rows.ts                 trashRows (a READ projection; posix string ops, not node:path)
  Assets/            ~110
    adopt.ts                adoptFile, adoptImageSource, dropReplacedAsset (from mutate.ts)
  History/           ~190
    fileHistory.ts          Clock port for the quiet timer; Host.hash(algo); SnapshotStore port over versionsDb
  Read/               ~50   no writes; importable by UIX hosts directly.
    loadValues.ts
  Mutate/            ~190
    dispatch.ts             handleMutate + ~27 five-line arms; an arm longer than ~8 lines is a smell
    confirm.ts              mutatePatch (or under LiveTree/) — imports MutateOutcome from Contract, not its own copy
```

Admission rules per folder are the one-liners after each folder above. The two hard ones: **Frontmatter admits nothing that can touch a disk**, and **Governed is the only folder allowed to loop over files rewriting frontmatter** — every other folder hands it a decision function.

Totals: current ≈3,700 stripped → ≈3,100 after the collapses below (−~600), of which ~315 are the itemised removals in Part 2 and the remainder is dedupe that falls out of relocating `mutate.ts`'s inline arms onto the seams that already exist.

---

### Part 2 — Dead / Stale / Obsolete

Format per item: **file:line — what — why — removable lines — confidence — what breaks if wrong.**

#### 1. Zero-Importer Exports (tests don't count)

Export keyword dead (symbol used only inside its own file, or only by a test):

| # | Location | Symbol | Non-test external readers | Test readers | Removable | Conf. | Breaks if wrong |
|---|---|---|---|---|---|---|---|
| a | `contextCascade.ts:68` | `type SweepResult` (alias) | 0 | 0 | keyword | high | — |
| b | `contextCascade.ts:72` | `sweepContextRoots` | 0 (internal ×3) | 0 | keyword (function itself: see §3d) | high | — |
| c | `contextCascade.ts:110` | `cascadeTitle` | 0 (internal ×3) | 0 | keyword | high | — |
| d | `contextWrite.ts:47` | `interface ContextWorld` | 0 | 0 | keyword | high | — |
| e | `contextWrite.ts:133`, `:188` | `setPageContext`, `setSpaceContext` | 0 (only `setContextOnPath:217-219`) | `contextWrite.test.ts` | keyword | high | that test must drive `setContextOnPath` |
| f | `contextWrite.ts:157` | `contextDriftPresent` | 0 (only `loadGovernedWorld:182`) | `governedWorldWrite.test.ts` | keyword | high | same |
| g | `fileHistory.ts:26` | `SNAPSHOT_MAX_BYTES` | 0 | `fileHistory.test.ts` | keyword | high | test reads the constant |
| h | `fileHistory.ts:66` | `captureIfDue` | 0 (only `writeBody:139`) | `fileHistory.test.ts` | keyword | high | same |
| i | `fileHistory.ts:159` | `resetFileHistory` | 0 (only `retireFileHistory:167`) | `fileHistory.test.ts` | keyword | high | same |
| j | `governedSweep.ts:21` | `type SweepScope` | 0 | 0 | keyword | high | — |
| k | `journalSlot.ts:10` | `interface JournalSlot` | 0 | 0 | keyword | high | — |
| l | `optionOps.ts:91` | `addOptionToDef` | 0 (only `applyAdoptions:122`) | `optionOps.test.ts` | keyword | high | test |
| m | `reorder.ts:14` | `export type { StateOrderKey }` re-export | **0** (`mutate.ts:76` imports it from `@shared/mutate`) | 0 | **1 line** | high | — |
| n | `reorder.ts:16` | `type ContainerOrderKey` | 0 | 0 | keyword | high | — |
| o | `reorder.ts:61` | `setContainerOrder` | 0 (only `setChildOrder:87`) | `reorder.test.ts` | keyword (function: §3b) | high | test |
| p | `trashRows.ts:64` | `trashRowOf` | 0 (only `trashRows:83`) | `trashRows.test.ts` | keyword | high | test |
| q | `util.ts:9` | `export { pathExists }` re-export | 2 (`page.ts:12`, `folderEntity.ts:11`) while 5 siblings import it from `IO/atomicWrite` | — | 1 line + 2 import edits | high | — |

Not zero, listed for completeness because the brief may expect them: `assignment.assignInner` (→ restoreProperty), `assignment.withoutCacheBlock` (→ deleteProperty), `removeProperty.restoreCachedValues` (→ assignment), `registryProperty.renameSweep` (→ replay), `deleteProperty.stripKeyRewrite`/`unassignAndPurge` (→ replay), `keyHolders.confirmedKeyHolders` (→ registryProperty), `contextWrite.NO_CONTEXT_WORLD` (→ repairSweep), `restoreProperty`/`scrubReturning`/`reconcile` (→ provenance).

Line total for §1: **~2 lines** (the rest is `export` keywords — zero line count, but 16 symbols' surface area).

#### 2. Retired-Feature Remnants

None of the four names the brief flagged is retired:

- **`restoreScrub.ts`** — producer: `provenance.restoreArtifact:667` ← `mutate.ts:414` `'restore'` ← the renderer's trash browser. Live (git: born 09-01 in the frontmatter arc, `29833211`). Its problem is being a third sweep engine (§4i), not obsolescence.
- **`restoreProperty.ts`** — producer chain intact: `deleteProperty.snapshot:26-67` → `provenance.writePropertyBundle` (artifact-less `.trash` bundle) → `restoreArtifact:615-623` → `restoreProperty`. `restoreProperty.test.ts:76-103` drives it through `handleMutate`. Live.
- **`trashRecovery.test.ts`** — a test with no source module of that name; exercises `handleMutate` delete/restore + `trashRows` end to end (`:93-250`). Live feature; could merge into `trashRows.test.ts` + `mutate.test.ts` but that's test hygiene, not dead code.
- **`aliasAcceptance.test.ts`** — a test with no source module; exercises `renameCascade` over `[[Title|alias]]` and `[alias](url)` forms; `shared/links.ts:58-71` (`escapeAlias`, `encodeLinkTarget`) is live. Not retired.
- **`journalWiring.test.ts`**, `renameSweep.test.ts`, `governedWorld*.test.ts`, `cascadeRace.test.ts`, `writePathRace.test.ts` — likewise source-less test names over live modules.

**Retired key names** (`PageID`/`TaskID`/`EventID`/`created_at`/`modified_at`): `RETIRED_ID_KEYS` (`shared/identity.ts:5`) has exactly one reader, `shared/properties.ts:168`, where it joins `'created_at'`/`'modified_at'` (`:170-171`) in `RESERVED_KEY_NAMES` → `isReservedKeyName` → `registryProperty.nameRefusal:27-28`. No file in scope reads, migrates, strips, or special-cases those keys on disk; the identity commit `55c508b2` ("one `ID` key") left only the name refusal. That is the right residue — a refusal, not a migration. Nothing removable in scope. (`loadValues.ts:57-58` `createdAt`/`modifiedAt` are the reserved virtual columns `_created_at`/`_modified_at`, not the retired frontmatter keys — live.)

#### 3. One-Reader Indirection Worth Inlining

| # | Location | What | Removable | Conf. | Breaks if wrong |
|---|---|---|---|---|---|
| a | `contextJournal.ts` (whole file, 49 wc) | one reader (`contextCascade.ts:15`); a `journalSlot` instantiation + decode | ~10 net (49 out, ~35 move into a Journal records file) | high | `contextCascade.test.ts` imports `readJournal` — repoint |
| b | `folderEntity.ts:64-77 updateFolderSidecar` → `reorder.ts:61-71 setContainerOrder` → `reorder.ts:80-93 setChildOrder` | three layers for one sidecar RMW; `setChildOrder` can call `withSidecarLock`/`readSidecar`/`writeSidecar` (or the proposed `patchSidecar`) directly | ~20 | high | `reorder.test.ts` references `setContainerOrder` |
| c | `reorder.ts:73-76 CONTAINER_SIDECARS` + `views.ts:12-16 readViewSidecar` + `containerConfig.ts:16-20 readCfgSidecar` | three spellings of `kind → zod schema` for `'collection'|'set'` | ~10 | high | — |
| d | `contextCascade.ts:68-87 SweepResult` + `sweepContextRoots` | adapter over `sweepGovernedRoots` that discards `captured` while both callers rebuild it by closure (§4k) | ~20 | high | internal only |
| e | `pageValue.ts:58-62 stripPageMember` | one reader (`removeProperty:71`); ≡ `deleteProperty.stripKeyRewrite:98-105` over raw | ~6 | medium | `removeProperty` must go through the sweep or `stripKeyRewrite` must wrap text |
| f | `restoreScrub.ts:69-88` | 60% of the file is `sweepGovernedRoots({kind:'files', files}, raw ⇒ reconcile…)` + the Space-sidecar loop the nexus-scope sweep already performs | ~50 (file → ~35: `liveWorld` + the `inTransitKey` rule) | medium | sweep needs an explicit-sidecar or subtree scope |
| g | `util.ts:9` | `pathExists` re-export alias (§1q) | 1 | high | — |
| h | `reconcile.ts` | 2 readers; a Util misfiled as CRUD — relocate, don't inline | 0 | — | — |
| i | `keyHolders.confirmedKeyHolders:19-30` | one reader (`registryProperty:122`); fine where it is or beside `editProperty` | 0 | — | — |

Wrapper pairs created only by `schemaChain`'s non-reentrancy — `assignProperty`/`assignInner` (`assignment:49,86`), `deleteProperty`/`deleteInner` (`deleteProperty:69,73`), `removeProperty`/`removeInner` (`removeProperty:25,33`), `restoreProperty`/`restoreInner` (`restoreProperty:35,39`) — are indirection with one reader each, ~20 lines total; removable only with a reentrant or root-keyed chain (§6b). Medium.

#### 4. Duplicate Definitions (within or touching scope)

| # | The two (or more) | Evidence | Removable | Conf. | Breaks if wrong |
|---|---|---|---|---|---|
| a | **Page frontmatter writers ×3**: `IO/pageFile.writePageFile:185` (read → `mergeFrontmatter` → `atomicWriteFile`); `governedWrite.setGovernedRootKeys:17` (read → reconcile → merge → write → `noteValueWrite`); **`mutate.ts:475-501` (setBanner page arm) and `:580-595` (setIcon page arm)** — `serializeOnFile` + `readFile` + `splitEnvelope` + `mergeFrontmatter(existing, fields, [key], body)` + `atomicWriteFile` + `noteValueWrite`, i.e. `setGovernedRootKeys(abs, fields, [key])` without a world, twice | read side by side | ~30 | high | none — `setGovernedRootKeys` with no `world` performs exactly the merge; `banner`/`icon` are in `PAGE_MODELED_KEYS` |
| b | **"Rewrite one page under lock, keep mtime" ×2**: `IO/atomicWrite.rewritePageSerialized:134-152` vs `governedSweep.ts:84-105` inline (same loop, re-implemented to split skipped/refused, which the former collapses to `false`) | — | ~20 | medium | `rewritePageSerialized` gains a 4-state return; 6 callers adjust `if (wrote)` |
| c | **Lenient frontmatter → record parsers ×2**: `IO/pageFile.readFrontmatterFields:38-46` vs `readNexus.splitFrontmatter:321-333`; same body (`parseDocument(...).toJSON()`, `{}` on failure) but different closing-fence regexes (`\r?\n---` vs `splitEnvelope`'s `---[ \t]*\r?\n?`) and array handling. CRUD uses both: `util`, `keyHolders`, `removeProperty` → the first; `governedWrite`, `pageValue`, `deleteProperty`, `governedSweep`, `restoreScrub`, `contextWrite`, `mutate` → the second. A fence with trailing spaces parses in one and not the other. | — | ~12 + import churn | high on duplication; medium on which survives | a file that only one parser accepts flips admission |
| d | **"Which files hold key X" ×4**: `keyHolders.keyHolderFiles:10` (index ∩ folders); `keyHolders.confirmedKeyHolders:19` (corpus read); `removeProperty.removeInner:46-58` (folder corpus + `readFrontmatterFields` + `raw === undefined`, capturing values); `removeProperty.restoreCachedValues:114-119` (folder corpus → id map). The first two differ on purpose (index lag vs truth); the last two are `confirmedKeyHolders` scoped to a folder with payload. | — | ~20 via one `holdersOf(root, key, folders, {confirm}) → {file, raw}` | medium | perf: the confirm path reads every file |
| e | **Disambiguation ×2**: `disambiguate.createDisambiguated:6-15` (` 2`…` 50` on `exists`) vs `contextWrite.createContextGroup:233-236` inline `for (let n = 2; taken.has(normalizeContextValue(title)) && n <= 50; n++)`. `mutate.ts:724` wraps `createSpace` in the shared one but `:717` calls `createContextGroup` bare. Fix: `createContextGroup` returns `exists` on a case-folded clash; the dispatcher wraps it like every other create. | — | ~5 | high | `contextWrite.test.ts` asserts "… 2" through `createContextGroup` directly |
| f | **`property_cache` no-empties writers ×2**: `assignment.withoutCacheBlock:33-45` ≡ `removeProperty.patchCacheBlock(cur, id, undefined):82-94` | — | 13 | high | `deleteProperty.ts:10,123` imports `withoutCacheBlock` — repoint |
| g | **"Delete one key from a page" ×2**: `pageValue.stripPageMember:58-62` (text) vs `deleteProperty.stripKeyRewrite:98-105` (raw) | — | ~6 | medium | see §3e |
| h | **`MutateOutcome` ×2**: `shared/mutate.ts:12-22` (4 fields) vs `mutatePatch.ts:36-39` (2-field subset, **same name**); `index.ts:1647,1661` threads the shared reply into the local type | — | 4 | high | none — structural subtyping already makes them compatible |
| i | **Sweep engines ×2 + adapter**: `governedSweep.sweepGovernedRoots:75` vs `optionOps.cascadePages:283-303` vs `contextCascade.sweepContextRoots:72-87` (Part 1 §3). `cascadePages` ≡ `sweepGovernedRoots({kind:'files', files: keyHolderFiles(...)}, _, {rewriteText})` with `.skipped.length` | — | ~20 + 16 | high on equivalence; medium on effort (return-shape churn across 5 callers + `renameSweep`) | none semantically; `cascadePages` counts unreadable only, the sweep also reports refused |
| j | **Journal slots ×2 / replay entries ×2**: `contextJournal` + `propertyJournal`; `index.ts:382` + `:399` | — | ~40 | medium | on-disk file rename (`context-rename.json`, `property-cascade.json` → one) needs a one-shot read of both old names |
| k | **Capture channels ×3, one unused**: `governedSweep.ts:28-35` (`SweepResult<C>.captured`, `Rewrite<C>.capture`) has zero producers; `contextCascade` discards it (`:77-86`) and rebuilds by closure (`:132,:154`) | `rg "capture:" main` → only `capture:thumbnail` | ~8 (delete the generic) **or** 0 (adopt it and delete the adapter, §3d) | medium | — |
| l | **kind→schema tables ×3** — §3c | | | | |
| m | Touching scope: `cascade.renameCascade` vs `tiles.rewriteTileConnections` (`tiles.ts:174`) — two [[link]] rename cascades because tile files are id-less and `.nexus`-resident; `mutate.ts:330-343` runs both in sequence. Note only. | | | | |

#### 5. Guards for States Nothing Produces

| # | Location | Guard | Who would produce it | Removable | Conf. | Breaks if wrong |
|---|---|---|---|---|---|---|
| a | `page.ts:24 opts.icon` | icon stamped at birth | nothing — no caller anywhere (tests included) passes `icon`; the only non-test caller `mutate.ts:270` passes `{ values }` | 2 | high | — |
| b | `page.ts:25 opts.body` | body at birth | tests only (`page.test.ts:35…176`) | 2 | medium | 10 test call sites seed via `updatePageBody` instead |
| c | `mutate.ts:432-437` + `shared/mutate.ts:90` + `mutatePatch.ts:171` | `setProfileSubtitle` arm | no renderer sends it (`rg setProfileSubtitle renderer` → none); the union member is what keeps it compiling | 8 | high that nothing produces it; product call whether to delete (cheap to re-add) | — |
| d | `mutate.ts:553` | `kind === 'navview'` refusal in `setHeadingIconHidden` | `BannerOwner.kind` is `Exclude<BannerOwnerKind,'navview'>` (`renderer/Interface/scope.ts:8`); only a hostile renderer message | 1 | low (IPC hardening is deliberate) | — |
| e | `mutate.ts:554` | `kind === 'page'` refusal, same arm | **reachable**: `Banner.tsx:28` sends `owner.kind`, which admits `page` — keep | 0 | — | — |
| f | `containerConfig.ts:34-36` | Set + `open_in` refusal | the only producer `SettingsFrame.tsx:114` hardcodes `'collection'` | 3 | medium (same hardening caveat) | — |
| g | `mutate.ts:292-293` | `const extra: Record<…> = {}` then `extra.views = …` | not a guard, two statements for one literal | 1 | high | — |
| h | `optionOps.ts:99` | `type !== 'multi_select'` in `addOptionToDef` | adoptions arrive from `reconcileGovernedRoot`; if it emits only for multi-select this is unreachable — **unverified** (`shared/contextResolve.ts` not read) | 0 | — | — |

Guards that look speculative but have real producers (keep): `reorder.persistable:21` (`adopted-` ids exist: `ids.ts:60-71`, and the renderer sends tree ids); `journalSlot.supersedes?:22` (one of two instantiations passes it); `governedWrite.world?:21` (`restoreCachedValues:130`, `restoreProperty:76` call without one); `contextWrite:96` `adoptedId(rel)` for an id-less `_space.json` (hand-made); `fileHistory:44` `kindOf(pageId) !== 'page'` (`liveIdOf` returns T/E ids too); `deleteProperty:55` duplicate-id `partial` (a copied file); `contextCascade:37-41` merge onto a pre-existing new key (hand-authored / crash-then-retag); `pageValue:15-17` number/boolean list members (hand-authored YAML); `replayPendingRename:322-326` re-minted old title (crash → user creates → reopen).

#### 6. Read-Three-Times / Does It Earn Its Existence

- **`governedSweep`'s generic `C` + `sweepContextRoots` + closure captures** (§4k, §3d). Verdict: **no** — one of three survives.
- **`schemaChain.ts`**: a module-global promise chain gating every schema op, with the rule "wrap entry points ONLY — a chained fn awaiting a chained fn deadlocks". That rule is why `assignInner` is exported, why `createProperty` is unchained while `editProperty` is chained, why `deleteProperty` calls the unchained `removeFromRegistry`, and why four Inner/outer pairs exist (§3). Verdict: earns its existence as a lock; **does not** earn being a process singleton (one-nexus-per-process assumption baked into a Core engine) or being non-reentrant. ~20 lines of wrappers ride on that choice.
- **Session reach-ins from primitives**: `journalSlot.ts:37` `if (sessionRoot() !== root) return` and `governedWrite.ts:38` `noteValueWrite(sessionRoot(), absFile)`. Both functions already hold or can take `root`; every sibling writer passes it explicitly (`cascade:52`, `governedSweep:101`, `optionOps:298`, `removeProperty:74`). The clear-guard means a journal for any root that isn't the live session can never be cleared — a hard blocker for a multi-nexus host. Verdict: earns nothing; pass `root`. 2 lines each way.
- **`replaySchemaCascade` arms restating forward tails** (`:46`, `:60-64`, `:75-77`, `:86-90`): correct, deliberately state-gated, and duplicated because the forward ops (`editProperty`, `deleteInner`, `renameOp`, `removeOp`) don't expose (precondition, tail). Verdict: earns its existence; ~30 lines of structure debt.
- **`mutate.ts setBanner` (81 lines)**: four owner arms across three storage backends, adoption-after-validation ordering, replaced-asset deletion ordering. Verdict: earns its behavior, not its address — it is a Banners module wearing a `case`.
- **`contextWrite.createSpace:266-276`**: a Contexts write that knows tile layout (`ratios: [0.5, 0.5]`, `NEW_TILE_H`, `mintSeed('markdown')`) and imports `tileDoc`. Verdict: cross-domain leak; Tiles should own "seed a host dir" (~12 lines move, one import gone).
- **`contextCascade.rewriteRoot:31-59` + `pageLeg:99-106`**: one function handling a KEY rename (context) and a VALUE rename (space) discriminated by `j.spaceId === undefined`, with the page decision flipped to a text rewrite for the key case only. Verdict: earns its existence (position/comment preservation is real); the discriminant should be a `kind` on the record.
- **`trashRows.ts:5,20,30`**: `node:path` `basename`/`dirname` applied to POSIX nexus-relative bundle paths, then `.split('/')`. Verdict: the projection earns its existence; the node binding doesn't (3 call sites → posix string ops).
- **`mutatePatch.routeMutation:130-217`**: a second `switch (req.op)` mirroring `dispatch`, so every new op edits two switches. Verdict: targeted confirmation earns its existence; the shape doesn't — each arm could return its confirm strategy in the outcome. Design note, not a removal.
- **`loadValues.iso:19-24`**: claims to mirror "the shape the date picker writes"; no second local-clock formatter exists in `shared`/`renderer` (the only `padStart(2,'0')` hits are hex color helpers). Unverified claim; noted, not counted.

#### Totals

**High confidence removable (~125 lines):** page banner/icon arms → `setGovernedRootKeys` 30 · `withoutCacheBlock` dup 13 · `MutateOutcome` dup 4 · inline disambiguation in `createContextGroup` 5 · kind→schema tables 10 · `updateFolderSidecar`/`setContainerOrder` layering 20 · `sweepContextRoots` adapter + alias 20 · `contextJournal` as a file (net) 10 · two re-exports 2 · `createPage` icon 2 · `setProfileSubtitle` 8 · `extra` literal 1.

**Medium confidence removable (~190 lines):** `cascadePages` → sweep 20 · sweep's inline `rewritePageSerialized` 20 · one frontmatter parser 12 · one `holdersOf` 20 · `stripPageMember`/`stripKeyRewrite` 6 · `restoreScrub` as a sweep call 50 · unused capture generic 8 · Inner/outer wrappers via a reentrant chain 20 · replay tail duplication 30 · Set `open_in` refusal 3 · `createPage` body 2.

**≈315 lines (~8% of the stripped scope)**, exclusive of comments and tests, before the relocation of `mutate.ts`'s ~440 inline lines (a move, not a removal; net ≈ −100 after the dedupe it enables).

---

### Summary

The scope contains no Electron code and one clean host port (`MutateDeps`). Its real structure is one mechanism — a governed-key rewrite across files under per-file locks with a crash journal — expressed through three sweep engines (`sweepGovernedRoots`, `cascadePages`, ad-hoc `rewritePageSerialized` loops), two journal slots, two replay entries, and an adapter that discards the capture channel the sweep was built with. `mutate.ts` is 56% inline op logic (~440 lines): asset adoption, the write-ahead delete, and banner/icon writers that re-spell `setGovernedRootKeys` twice. Nothing flagged as retired is retired — `restoreScrub`, `restoreProperty`, and the alias/trash tests all have live producers; retired key names survive only as a property-name refusal. Genuine debt: three page-frontmatter writers, two lenient frontmatter parsers, four "who holds key X" scans, two disambiguators, two cache-block writers, a same-named `MutateOutcome` twice, a process-global schema chain, and two `sessionRoot()` reach-ins inside primitives that block multi-nexus hosting. High-confidence removal ≈125 lines; medium ≈190; the Core tree proposed above folds the scope from ≈3,700 to ≈3,100 stripped lines with `Governed/` as the only folder permitted to loop over files.
