### A02: Main Engine, Dead / Stale / Obsolete

**Scope:** `src/main/*.ts` (excluding `index.ts`, `ipc.ts`, every `*Menu.ts`), plus `src/main/IO/`, `src/main/Database/`, `src/main/Connections/`, `src/main/Properties/`. 60 non-test files, ~6,900 lines. `CRUD/restoreScrub.ts` was read because the brief names it with the record family. `index.ts` was read only to confirm call sites and the open sequence; findings inside it are marked adjacent and not counted.

**Method:** every `export` in scope was grepped word-exactly across `src` (tests excluded, then counted separately); every file in scope was read in full; each candidate was traced to its callers; origins were dated with `git log -S`. Line numbers are as of the working tree at `7c7c7542`.

---

#### 1. Zero-Importer Exports

**Truly dead (no caller anywhere in `src`, not even inside its own file):**

| Location | Symbol | Notes | Lines | Confidence | If wrong |
|---|---|---|---|---|---|
| `session.ts:23-25` | `closeSession()` | Sets `currentRoot = null`. Imported by 17 test files and nothing else; `index.ts:2061-2064` shuts down via `stopWatcher` + `closeSessionDb` and never clears the root. | 3 | high | Tests that call it need a replacement (assign through `openSession` of a fresh temp root). |
| `IO/walk.ts:35-38, 45, 48` | `listMarkdownFiles(dir, opts.skipTopLevel)` | The `skipTopLevel` option: no caller passes it (only caller is `CRUD/restoreScrub.ts:69`, bare). The `Set`, the filter, and the `opts` parameter are unreachable by construction. | 4 | high | Nothing; the one caller passes no options. |
| `readNexus.ts:670` | `const collections = orderedCollections` | A dead alias; `orderedCollections` is used directly at 690 and the alias only at 708. | 1 | high | Nothing. |

**Exported but only used inside their own file (plus tests): the `export` keyword is the dead part.** Zero removable lines, but each is a false public surface a restructure would otherwise carry across a package boundary:

`Database/open.ts:17 DB_FILENAME` · `Database/versionsDb.ts:12 VERSIONS_FILENAME`, `:17 SnapshotRow` · `IO/navigationFile.ts:43 isAssetPath` · `IO/pageFile.ts:18 PageEnvelope`, `:73 assembleEnvelope` · `IO/propertiesRegistry.ts:12 RegistryFile` · `appConfig.ts:19 appConfigPath` · `assetMap.ts:51 patchAssetMap` · `assetMigrate.ts:34 AssetMigration` · `exclusionScan.ts:24 excludedArtifacts` · `folderKind.ts:31 AgendaSlot`, `:53 readAgendaRegistration` · `ids.ts:22 idAt` · `indexSeed.ts:33 extractPageIndex` · `linkTitles.ts:37 extractTitle`, `:49 makeTitleScanner` (the comment says "exported for tests") · `mutatePatch.ts:45 patchForMutation` · `provenance.ts:51 RECORD_FILENAME`, `:71 recordFile`, `:111 ParentRef`, `:143 bundleArtifact`, `:221 ContextEvidence` · `readNexus.ts:179 readCommands`, `:208 nexusFolderRefusal`, `:387 PageRecord` · `record.ts:19 BaselineEntry`, `:89 latchBaseline`, `:180 readBaseline`, `:184 writeBaseline` · `remint.ts:22 RemintTarget`, `:52 RemintedEntity` · `session.ts:47 isTrashedPath` · `settings.ts:23 updateNexusConfig` · `walkCache.ts:13 FileStat` · `watchPatch.ts:60 WatchClass` · `watcher.ts:47 isNavPath`, `:55 ignoredUnder`.

38 symbols. Roughly half exist so a test can reach a private helper; that is a test-design smell (testing through the public function instead) rather than dead code, but it means the module's real API is about half its declared one.

---

#### 2. Retired-Feature Remnants

**2a. The baseline's drift-diff shape (record.ts, shared/record.ts).** Commit `56b139d4` (08-08-2026, "the dead-code floor") removed `BaselineDiff`, `isEmptyDiff`, `diffBaselines` from `shared/record.ts` and `readDrift`/`writeDrift` from `main/record.ts`. What those consumed survived them:

- `shared/record.ts:12 ExistState = 'present' | 'unreadable'` and `:19 state: ExistState` on `EntityRecord` (adjacent scope). The field is written at `record.ts:54, 57, 68, 71, 74` (`state: 'present'`) and `:98, 102, 108, 115` (`state: 'unreadable'`) and read back by nothing. `remint.adjudicate` (`remint.ts:41-47`) reads `prior[id].path` and the live `unreadablePaths` set, never `.state`; `recordEldest` reads `prior?.[id]` existence; `provenance` reads `.kind`/`.path` of the live projection; `renderer/treeIndex.ts:46` picks `id | title | path`. A label nothing branches on.
- `record.ts:17-20 BaselineEntry = EntityRecord & { ambiguous?: true }`, set at `:102-103`, never read.
- `record.ts:1-3` and `shared/record.ts:1-2` still describe "the last non-empty drift" and "the pure union-diff over two baselines"; the code they describe is gone (comments, so not counted, but they are the trail).
- `record.ts:84-119 latchBaseline`: three rules stated for a diff that no longer runs. What the baseline still has to do is one thing: remember which nexus-relative path legitimately held each id, so `adjudicate` can pick the original among Finder duplicates next open, and keep an entry whose path is currently unreadable rather than forgetting it. That is ~15 lines, not 35.

**Estimated removable:** 12 lines at high confidence (the `state` literals, the `ambiguous` type and spreads, `readBaseline`/`writeBaseline` inlined into `runOpenRecord`), ~15 more at medium (restating the latch as the one rule). **If wrong:** `record.test.ts` asserts on `state`/`ambiguous`; nothing in the app does.

**Adjacent (index.ts, not counted):** `index.ts:358-360` `adoptNexus(path, latchRecord = true)` and the else-branch at `:389-397` exist so a mid-session rename (`index.ts:1962-1964`) skips `runOpenRecord`, "which would diff the live session against the launch baseline, reporting every change as drift." That diff is gone; running `runOpenRecord` on a re-point would remint against the same baseline with the same nexus-relative paths, exactly as a normal open does. The parameter, its threading through three signatures, and the else-branch are ~12 lines whose reason left on 08-08-2026. Medium.

**2b. Legacy bare-Record `properties.json` shim, `IO/propertiesRegistry.ts:16-31`.** `normalizeRegistry` detects a file that is a bare `Record<id, def>` and reads it as `{ order: [], defs }`. The writer has emitted `{ order, defs }` since `58c55046` (07-28-2026); the shim landed the next day (`b5fe3c69`, 07-29-2026). Every `mutateRegistry` rewrites the file in the new shape, so a bare-Record file is one untouched since 07-28-2026 and never mutated since. **Removable:** ~8 lines (lines 23-31 collapse to reading `obj.defs`/`obj.order` with type guards). **Confidence:** medium. **If wrong:** a six-week-old, never-since-touched `properties.json` reads as zero definitions until hand-wrapped.

**2c. `assetMigrate.ts` (245 lines) and `INVENTED`.** Moves files Pommora minted under `.nexus/assets` into the user's configured `asset_directory`, then sweeps the old root. `INVENTED` (`:57`, `/^(?:banner|profile)-[a-z0-9]{6,}$/i`) renames files minted under a naming scheme nothing has produced since `453ec68b` (07-29-2026); today `adoptFile` (`mutate.ts:127`) keeps the source basename. The module is probed at every open (`index.ts:417`) and answers null after one recursive `readdir` of `.nexus/assets` unless (a) `asset_directory` is set and (b) a non-thumbnail file still sits under the old root. It is not dead: it is the only mechanism by which changing `asset_directory` moves existing banners. But it is a one-shot migration dressed as a per-open probe, and its rename branch (`:55-57`, `:184-186`, ~5 lines) targets files that can only predate 07-29-2026. **Verdict:** keep the move; a restructure should fire it from the `asset_directory` setter, once, rather than stat `.nexus/assets` on every launch; the `INVENTED` branch is a retired-naming remnant. **Confidence:** medium on the 5 lines, low on anything more.

**2d. Raw mode (`sidecarMode === false`).** `readNexus.ts:1-4` says the walk "supports BOTH the sidecar-driven path and the structure-classification path (raw/un-adopted folders)". In the running app, `index.ts:337-344 prepareOpenedNexus` calls `ensureIdentity` (best-effort, try/catch) before the first walk, so `nexus.json` exists unless the write failed (read-only volume) or a user deletes it mid-session. Both are reachable, so this is a degraded state, not a second first-class mode. The machinery it carries: `readNexus.ts:630-633`, `folderKind.ts:97`, `watchPatch.ts:117-118, 189, 323, 357`, `mutatePatch.ts:96-106, 181-185, 243`, `mutate.ts:217`, `record.ts:48`, and the `?? adoptedId(...)` fallbacks at `readNexus.ts:405, 491, 535, 563, 631`, `watchPatch.ts:367, 405`, `readPage.ts:21`, `CRUD/contextWrite.ts:96`. The `adoptedId` fallbacks are separately live (a Finder-made folder before the next open stamps it); the *mode* (title-ordered, every root folder a Collection, container sidecars never opened) is the part that only a failed identity write reaches. ~40 lines across 8 files. **Confidence:** low that any of it is removable; high that the header oversells it.

**2e. Retired key names.** `PageID`/`TaskID`/`EventID` (`shared/identity.ts:5 RETIRED_ID_KEYS`) and `created_at`/`modified_at` survive only as reserved property names in `shared/properties.ts:166-172` ("a user property under any of them would collide with the vault's own history"). No reader, migrator, or shim for those keys exists in scope. That guard faces Obsidian-side history in NexusOS, so it is reachable; nothing to remove here. Likewise the "legacy area/topic/project dirs" migration that `readNexus.ts:637-640` mentions has no code remnant anywhere in `main` (grep for `'areas'|'topics'|'projects'|legacyDir` is empty).

**2f. `identity.ts:31, 36, 42, 46 createdAt`.** Written into `nexus.json`; no reader anywhere in `src` (the `createdAt` in `CRUD/loadValues.ts:57` derives from the ULID). A write-only on-disk field with a five-line comment about clock ordering. **Removable:** 4 lines. **Confidence:** low; it may be a deliberate human-readable fact on disk. **If wrong:** a nexus loses its creation stamp.

**2g. Schema-version reset lever, `Database/open.ts:21-29, 64-65`, `driver.ts:12 DB_SIBLINGS`, `schema.ts:8`.** `SCHEMA_VERSION` went 16 (07-05-2026) → 17 (07-22) → 1 (`c9b9feb2`, 07-28-2026) and has not moved since. The drop-and-recreate branch has not fired in six weeks and nothing pending bumps it. `INDEX_GENERATION` (`schema.ts:9`) did bump to 2 on 08-31-2026, so its branch is live. ~14 lines. **Confidence:** low; it is the documented lever, not dead code. Listed because it is a flag that has held one value for the life of the current schema.

---

#### 3. One-Reader Indirection

| Location | What | Why inline | Lines | Confidence | If wrong |
|---|---|---|---|---|---|
| `ids.ts:46-52 isUlid` | `return isUlidShaped(value)` behind seven comment lines. One caller, `index.ts:686`. | Pure alias of a shared function. | 3 | high | Nothing. |
| `indexSeed.ts:41-44 frontmatterValues` | `splitFrontmatter(content) as Record<string, unknown>`; the cast is a no-op (`Json` already is that type). Callers `indexSeed.ts:35`, `CRUD/cascade.ts:38`. | Rename-only wrapper. | 3 | high | Nothing. |
| `contextsRegistry.ts:19-28 readRegistry` + `:30-35 ensureContextsRegistry` | `ensureContextsRegistry` awaits `readRegistry` and discards the `Result`; `readRegistry`'s only caller is `ensureContextsRegistry`; its only caller is `index.ts:341`. Two functions, one act, one caller. | Collapse into one seed-if-absent function. | 5 | high | Nothing; `readRegistryStrict` serves every lookup. |
| `settings.ts:74-78 readInterfaceScale` | Re-applies `coerceInterfaceScale` to a value `readPersonalization` already coerced at `readNexus.ts:155`. | Double coercion. | 1 | high | Nothing. |
| `readNexus.ts:415-417 readPage` (private) | `(await readPageRecord(...))?.node ?? null`; one reader at `:430`. Also shadows the exported `readPage` in `readPage.ts:16`. | Three lines, one reader, a name collision. | 3 | high | Nothing. |
| `readNexus.ts:224 assetDirRefusal`, `:228 excludedFolderRefusal` | Two `const` aliases of `nexusFolderRefusal` (`:208`). Callers: `assetDirValidate.ts:24`, `exclusionInput.ts:18`, `index.ts:970`, `readNexus.ts:232, 244`. | Three names for one function; the doc comments above each alias say why the rule is shared, which is the argument for one name. | 2 | high | Nothing. |
| `record.ts:180-186 readBaseline` / `writeBaseline` | One caller each in `runOpenRecord`; exported only for tests. | Inline `readKey<Baseline>('record', 'baseline')`. | 6 | high | `record.test.ts` reaches them directly. |
| `readNexus.ts:276-278 scopeOf` | `{ excluded, assetDir: leaves.assetDirectory }`: exists because `WatchScope.assetDir` (`exclusion.ts:36`) and `SettingsLeaves.assetDirectory` / `NexusTree.assetDirectory` spell one field two ways. Three readers. | A naming shim; one spelling makes it `Pick<>`. | 3 | medium | Renaming a `NexusTree` field touches the renderer. |

`sidecarIO.ts` (50 lines) is three one-line wrappers (`withSidecarLock`, `readSidecar`, `writeSidecar`) that exist so every sidecar RMW builds its lock key through `sidecarPath`, which `fileLock.ts`'s non-reentrant chain needs. Legitimate seam; 50 lines where ~20 would do. Not counted.

---

#### 4. Duplicate Definitions

| # | The concept | Where it is defined more than once | Lines | Confidence | If wrong |
|---|---|---|---|---|---|
| 4a | `MutateOutcome` | `shared/mutate.ts:12-22` (canonical: `created`, `renamed`, `adopted`, `trashed`) and `main/mutatePatch.ts:36-39` (re-declared with two of the four fields instead of importing). | 4 | high | Nothing; the shared one is a superset. |
| 4b | Parent path of a `/`-joined rel | `valuesChanged.ts:9-10 containerOf` and `shared/treePatch.ts:24-27 parentOf`; `watcher.ts:160` uses the first, `watchPatch.ts:100, 140` the second. | 2 | high | Nothing. |
| 4c | "Is this a content `.md`" | `IO/walk.ts:19-21 isContentFile(entry: Dirent)` and `watchPatch.ts:113 isContentName(name)`; the comment on the second says "mirrors `isContentFile`". | 2 | high | Nothing. |
| 4d | `{ mtimeMs, size }` | `walkCache.ts:13-16 FileStat` and `Database/contentIndex.ts:22-25 IndexedStat`. | 4 | high | Nothing. |
| 4e | The " 2", " 3" step-aside naming rule | `disambiguate.ts:6-15 createDisambiguated` (async, against an `exists` answer) and `provenance.ts:298-308 disambiguate` (sync, against a title list, with its own NFC + lowercase fold). The `disambiguate.ts` comment calls itself "the one place the app decides what a stepped-aside name looks like." | 8 | medium | The two fold titles differently (the fs answers case-insensitively on APFS; provenance folds explicitly); unifying must pick one. |
| 4f | Exclusion-list sanitizing | `readNexus.ts:237-252 readExcludedLeaf` (drop a bad entry), `exclusionInput.ts:11-28 sanitizeExclusions` (fail on the first bad entry), `index.ts:969-971` (single entry). Same trim / refuse / `rootSegs` / `normalizeSeg` dedup body three times; only the refusal policy differs. `exclusionInput.ts` exists, per its own header, so the rule is "testable without the electron-coupled handler", which is a test-design reason. | 15 | high | Nothing, given a policy flag. |
| 4g | "Is this a valid nav ref" | `IO/navigationFile.ts:18-27, 31-37 NAV_KINDS + isNavRef` and `IO/tabsState.ts:13, 16-21 TAB_KINDS + isTabRef`. Identical logic; the kind sets differ only by `task`/`event`, and no code anywhere produces a `kind: 'task'` or `kind: 'event'` ref (grep across `renderer`, `shared`, `main` is empty). | 8 | high | When the Agenda layer ships, tabs may legitimately refuse task/event refs; that is a one-line set difference, not a second predicate. |
| 4h | "Skip this directory name" | `exclusion.ts:12-19 neverWatched`, `exclusion.ts:42-44 hiddenName`, `exclusion.ts:52` (`hiddenName(name) \|\| name === 'node_modules'`, though `neverWatched` already holds `node_modules`), `exclusionScan.ts:40` (`node_modules \|\| startsWith('.')`), `assetMigrate.ts:132` (`TRASH_DIR \|\| node_modules`). Two of these are hand-rolled inside walkers that could call the predicate. | 3 | high | A hand-rolled variant deliberately skipping less than `neverWatched` (e.g. wanting `.db` files) would change behavior; neither of the two does. |
| 4i | "Nexus-relative POSIX path, or null if outside root" | `paths.ts:11 relPosix` is the shared half; the `..` guard is re-derived at `watchPatch.ts:77-80 toPosixRel`, `indexSeed.ts:71-77 relCorpusPath`, `valuesChanged.ts:18-19`, `watcher.ts:61-62`, `IO/atomicWrite.ts:193-194`, `provenance.ts:643-651`, while `pathSafety.ts:12-14 escapes` is the one that also handles `isAbsolute` and the bare `..`. Seven spellings of one boundary test. | 10 | medium | Five of the sites use `startsWith('..')` alone, which refuses a legitimate entry whose name begins with two dots and skips the `isAbsolute` case `escapes` handles; consolidating onto `escapes` changes both, in the correct direction. |
| 4j | Strip `.md` from a title | `coerce.ts:15-17 basenameNoMd`, `provenance.ts:395` inline, `CRUD/trashRows.ts:71` inline. | 2 | high | Nothing. |
| 4k | `sidecarMode` | Derived from the identity file at `readNexus.ts:630` (`!!asString(identity?.id)`) and `mutate.ts:217` (`!!identity?.id`), and from the tree at `watchPatch.ts:117` (`!isAdoptedId(tree.nexus.id)`) and inline at `mutatePatch.ts:243`. Two derivations of one predicate. | 4 | medium | The identity-file form and the tree form can disagree for one walk after `nexus.json` changes; today nothing notices. |
| 4l | Building a `FolderKindContext` from a fresh identity read | `adopt.ts:171-174` (`ensureFolderId`), `adopt.ts:186-190` (`stampAdopted`), `mutate.ts:211-218` (`movesInto`, hand-building `{ agenda: {}, homed: new Set() }`), beside the walk's own at `readNexus.ts:615, 633`. Four sites read `nexus.json` to answer "what kind is this folder". | 8 | medium | `movesInto`'s empty registration is argued for in its comment (cost on a drag); a helper can keep that shortcut as a parameter. |
| 4m | Reading and parsing the contexts registry | `contextsRegistry.ts:20 readRegistry` (seeding), `:39 readRegistryStrict`, and `readNexus.ts:621, 641` (cached lenient `readSidecar` + `contextsRegistrySchema.safeParse`, bypassing `parseRegistry`). Separately, two exports named `readRegistry` (`contextsRegistry.ts:20`, `IO/propertiesRegistry.ts:49`) for two different registries. | 4 | medium | The walk's read is deliberately cached and lenient; routing it through `parseRegistry` keeps that if the parse stays inside the cache closure. |
| 4n | Name collisions, not logic | `readNexus.ts:336 readSidecar` (private, cached) vs `sidecarIO.ts:27 readSidecar` (exported, zod); `readNexus.ts:415 readPage` (private) vs `readPage.ts:16 readPage`. | 0 | high | Rename only. |
| 4o | `'id' \| 'title'` order fallback | `readNexus.ts:78 Fallback`, `order.ts:16` inline, `watchPatch.ts:118` inline. | 2 | low | Nothing. |
| 4p | Per-entity `localState` scopes | `Database/localState.ts:11-27 Scope` (the union) and `remint.ts:145-153 COPY_SCOPES` (the seven per-entity members restated so a re-mint can copy their rows). A second list of the same names, which drifts the day an eighth per-entity scope is added to the union and not to the copy. | 0 | medium | Fixing it needs the union to carry a per-entity tag; no lines come out today. |
| 4q | "Read a JSON sidecar" | `IO/atomicWrite.ts` `readJsonObject`, `readJsonStrict`, `readTextOrNull`; `sidecarIO.ts:27 readSidecar` (zod); `readNexus.ts:336 readSidecar` (cached), `:343 readSidecarNaming` (cached + unreadable bookkeeping), `:355 readContainerMeta`, `:368 readConfig`; `provenance.ts:148 sidecarId`; `watchPatch.ts:324, 360, 399` direct `readJsonObject` of a sidecar. Nine routines. Each layer states a reason (lenient vs strict, cached vs not, validated vs raw, naming the owner on failure); the count is the finding. | 0 | low | No single cut without a redesign of the read layer. |

---

#### 5. Defensive Code For Unreachable States

Almost every guard in scope faces one of two producers that exist: an outside editor (Obsidian, Finder, vim, a sync client) or the renderer trust boundary. Those are reachable and are not findings:

- Hand-edited files: `readNexus.ts:208-219` (`settings.json` folder names), `IO/navigationFile.ts:31-37` (a homepage ref smuggling an id), `IO/atomicWrite.ts:49` (BOM), `provenance.ts:643-651` (a `_record.json` steering a restore outside the nexus), `remint.ts:90` (a duplicated Context id can only come from a hand-edited `contexts.json`), `IO/atomicWrite.ts:119-122` (`onCorrupt`, a corrupt `_tiles.json`), `Database/versionsDb.ts:31-49` (a damaged store).
- Finder: `adopt.ts:34-57 reHomeRegistered` (a Tasks folder dragged into a subfolder), `adopt.ts:110-121 migrateContainerSidecar` (a Set dragged to the root), `folderKind.ts:121-155` (a duplicated Tasks folder), `record.ts:124-144 recordEldest` and all of `remint.ts` (a duplicated page or folder), `mutatePatch.ts:96-106 subtreeHoldsAdoptedId` (a folder created in Finder mid-session, before the next open stamps it).
- Renderer trust boundary: `mutate.ts:195-198 isReserved` ("defense against a buggy/hostile renderer message"), `webGuests.ts:125-133` (an attach not carrying the shared partition; the comment itself says app code cannot reach it), `webGuests.ts:165-168` (a non-webview `WebContents` id off the wire), `mutate.ts:144-164` (a renderer-supplied asset subfolder with `..` or a symlink out).

Guards against states nothing produces:

| Location | Guard | Who would have to produce it | Lines | Confidence |
|---|---|---|---|---|
| `IO/walk.ts:45, 48` | `skipTopLevel` filter | A caller passing the option; none does. | 4 | high (counted in §1) |
| `record.ts:98, 102-103, 108, 115` | `state: 'unreadable'`, `ambiguous: true` labels | A reader of those fields; none exists since 08-08-2026. | (counted in §2a) | high |
| `record.ts:112-117` | Carry every prior Context/Space entry as `unreadable` when `contexts.json` is unparseable | A corrupt `contexts.json` (reachable) *and* a consumer of the carried entries: `adjudicate` reads a prior entry only for an id the walk saw twice, and Context ids never re-mint (`remint.ts:90`), so only a Space duplicated while the registry is corrupt can use this. Keep the path carry, drop the label. | 2 | medium |
| `Database/open.ts:64-65`, `:21-29` | Drop `nexus.db` on a `schema_version` mismatch | A `nexus.db` written by a build with `SCHEMA_VERSION !== 1`, i.e. a pre-07-28-2026 build. | 14 | low (see §2g) |
| `IO/propertiesRegistry.ts:23-31` | Read a bare-Record `properties.json` | A file last written before 07-28-2026 and never mutated since. | 8 | medium (see §2b) |
| `assetMigrate.ts:57, 184-186` | Rename a `banner-<hash>`/`profile-<hash>` file on migration | A file minted before 07-29-2026. | 5 | medium (see §2c) |

---

#### 6. Obscure Or Unnecessary: Verdicts

**The record / provenance / remint / restoreScrub family (186 + 747 + 204 + 89 = 1,226 lines; 91K of tests).** Live and reachable, all four. `provenance.ts` is the trash record and restore end to end (written by `mutate.ts:368-405 delete`, listed by `index.ts:1638 listBundles → trashRows`, spent by `mutate.ts:414-430 restore`/`emptyBundle`); one feature, one file, coherent. `restoreScrub.ts` is one step of `restoreArtifact` (`provenance.ts:667`) and could live beside it; fine where it is. `remint.ts` is what happens when Finder duplicates a folder: real, reachable, and the reason the baseline exists at all. `record.ts` is the odd one: after the 08-08-2026 drift removal, the "record" is two things wearing one name, a memoized tree→entries projection that `provenance` uses for the id-live check and membership re-apply (`projectBaseline`, live, ~45 lines) and a per-session `id → path` memory that only `remint.adjudicate` and `recordEldest` consult. The latch's three-rule commentary, `ExistState`, `ambiguous`, and the exported reader/writer pair are the drift feature's silhouette. **Verdict:** keep the family; shrink `record.ts` by ~25 lines and rename what is left for what it now does (a re-mint ledger, not a "record"). The header claims in `record.ts:1-3` and `shared/record.ts:1-2` describe code that does not exist.

**`walkCache.ts` (77).** The walk's `(mtime, size)` parse gate; on the hot path of every walk. The `forgets` counter (`:22, 43, 53, 74`) closes a real race with `forgetParse`. Needs to exist. Its `FileStat` is the `IndexedStat` twin (§4d).

**`sidecarIO.ts` (50).** Three one-line wrappers whose job is to force one lock-key spelling. Legitimate; over-documented. Not counted.

**`valuesChanged.ts` (91).** The write-side ledger for `values:changed` and a per-tree page index. Live. `containerOf` is `parentOf` (§4b).

**`exclusionScan.ts` (88).** The "Clear exclusion data" feature (`exclusions:clear`, one renderer caller). Live. Its walker hand-rolls the skip rule (§4h).

**`exclusionInput.ts` (28).** Exists so one rule can be tested without Electron; the rule already lives in `readNexus.ts:237-252`. **Verdict:** fold and delete the module (§4f).

**`disambiguate.ts` (15), `coerce.ts` (17), `order.ts` (35).** Fine. The problem with `disambiguate` is its twin in `provenance.ts` (§4e).

**`pathSafety.ts` (51) vs `paths.ts` (86).** Different jobs: one validates a renderer-supplied path under the root with `realpath`; the other builds absolute paths and names on-disk files. Not duplicates. The duplication is that `pathSafety.escapes` is the one correct boundary test and six other sites re-derive a weaker one (§4i).

**`assetMigrate.ts` (245).** See §2c. The heaviest module in scope relative to how often it does anything.

**`repairSweep.ts` (60).** Opt-in (`personalization.repairOnOpen`), off the critical path. Live. Fine.

**`readNexus.ts` (717).** Three files in one: settings/leaf decoding (80-302, of which `readPersonalization` is 88 lines of per-key coercion), the frontmatter and sidecar readers (321-417), and tree assembly (419-717). Live throughout; the split is a structure question for a different lens.

**One thing read three times:** `Database/schema.ts:59-61 truncateIndex` clears `page_values` and `indexed_files` on an `INDEX_GENERATION` bump but not `mentions`; with `indexed_files` empty, the seed's prune loop (`indexSeed.ts:165`) has nothing to prune, so a `mentions` row for a file deleted before the bump survives it. Not dead code; a gap in the reset. Noted because it took three reads to see what the generation bump actually resets.

---

#### Totals

**High confidence, removable now (code lines, excluding comments and tests):** `closeSession` 3 · `skipTopLevel` 4 · dead alias 1 · drift labels + inlined baseline I/O 12 · `isUlid` 3 · `frontmatterValues` 3 · `ensureContextsRegistry`/`readRegistry` collapse 5 · `readInterfaceScale` re-coerce 1 · private `readPage` 3 · refusal aliases 2 · `MutateOutcome` 4 · `containerOf` 2 · `isContentName` 2 · `FileStat` 4 · exclusion sanitizing ×3 → 1 (module deleted) 15 · `isTabRef` → `isNavRef` 8 · hand-rolled skip predicates 3 · inline `.md` strips 2. **≈ 83 lines**, plus 38 `export` keywords.

**Medium confidence, additional:** latch restated as one rule 15 · legacy bare-Record shim 8 · one `relUnderRoot` for seven boundary checks 10 · one `sidecarMode` 4 · one `FolderKindContext` builder 8 · one contexts-registry parse 4 · one step-aside naming rule 8 · `scopeOf` naming shim 3 · `INVENTED` branch 5 · `Fallback` type 2. **≈ 67 lines**; cumulative **≈ 150**.

**Low confidence, listed but not counted:** `assetMigrate.ts` as a whole (245), raw-mode machinery (~40 across 8 files), the schema-version drop lever (14), `createdAt` (4), `sidecarIO` slack (~30), `index.ts` `latchRecord` (12, adjacent).

---

#### Summary

The main engine has little outright dead code: one dead function (`closeSession`), one dead option (`skipTopLevel`), one dead alias, and 38 exports nothing outside their file imports. The stale weight is in shapes that outlived their feature. The baseline in `record.ts` still writes `state` and `ambiguous` labels for a drift diff removed on 08-08-2026; nothing reads them, and the latch's three rules reduce to one now that only `remint.adjudicate` consumes the row. Two compatibility shims target files that can only predate late July 2026 (the bare-Record `properties.json` reader; `assetMigrate`'s `INVENTED` rename), and `assetMigrate` itself is a one-shot migration probed on every open. The larger finding is duplication rather than death: the same predicate defined two to seven times (`MutateOutcome`, `containerOf`/`parentOf`, `isNavRef`/`isTabRef`, three exclusion sanitizers, four skip-name rules, seven path-boundary checks, four `sidecarMode` derivations, two step-aside naming rules). The record/provenance/remint family is live and reachable end to end; `record.ts` is the only member that should shrink. Roughly 83 lines are removable at high confidence and ~150 cumulatively at medium; the rest of the scope is doing work.
