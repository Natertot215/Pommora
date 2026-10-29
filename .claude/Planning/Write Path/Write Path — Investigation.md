### Write Path — Investigation

**DATE:** 10-28-2026
**REPO:** `~/The Studio/Projects/Project Pommora`, branch `active`, HEAD `15fe7422a`
**EVIDENCE:** code reads (cited `path:line`), the benchmark's per-op call counts (`.claude/Benchmarks/Reach-In/results/{Small,Medium}-0.jsonl`, baseline build), and isolated Node measurements on this machine while the full-app benchmark ran beside them. Microsecond figures are noisy (an identical write-file-atomic run read 6.6 ms and 4.5 ms per file on two passes); ratios are the finding. Anything marked *inferred* wasn't confirmed by a run.

---

#### 1. The Per-File Ledger

##### The Representative Case: A Property Rename

`rekeyProperty` (`Core/Properties/registryProperty.ts:205-233`) runs under the schema lock, notes the rename (`runNoted`, `Core/Nexus/owed.ts:242-269`), commits the registry, then sweeps `renameSweep` (`registryProperty.ts:153-156`) through `sweepGovernedRoots` (`Core/Nexus/governedSweep.ts:71-100`). Every step below runs once per holder file.

| # | Step | Where | What It's For | Verdict |
|---|---|---|---|---|
| P1 | `readTextOrNull` + `sweepParse` of every holder of either key | `Core/Index/keyHolders.ts:109-111`, called by `rekeyPlan` at `registryProperty.ts:179-185` | The clash check: refuse when a file holds both the old and the new key | **Redundant.** The check only needs files holding both keys; the index already lists each key's holders (`queryMembers`, `keyHolders.ts:82`), so their intersection names the candidates, and only those (usually none) need reading |
| S1 | Per-file lock (`serializeOnFile`) | `governedSweep.ts:52-55`; `Desktop/Platform/fileLock.ts:7-30` | Serializes every in-app writer of the path | **Necessary**, in-memory and cheap. write-file-atomic runs a *second* per-path queue of its own (`node_modules/write-file-atomic/lib/index.js:50-62,92`), which is **redundant** |
| S2 | `readTextOrNull` | `governedSweep.ts:80` | The fresh text the rewrite works from, under the lock | **Necessary**: the one read |
| S3 | `sweepParse` (parse + round-trip serialize), then `plan.text` → `renameFrontmatterKey` (parse + serialize again) | `governedSweep.ts:64-66`; `Core/Files/pageFile.ts:221-246,281-284` | Admission and the rewrite | **Redundant second parse**: `sweepParse` exists so "one parse serves a sweep's admission, its read of the values, and its merge" (`pageFile.ts:280`), and the text plan re-parses anyway |
| S4 | `stat` before the write | `Core/Files/atomicWrite.ts:29` | The mtime the rewrite preserves | **Necessary data, mis-ordered**: it runs after the read, so an outside write landing between the read and this stat is overwritten and its new mtime is the one preserved |
| S5 | `recordWrite` → `sha256Hex` of the new text | `atomicWrite.ts:14`; `Core/Files/writeEcho.ts:23-33` | Lets the watcher recognize the app's own bytes | **Necessary**; about 1 µs |
| S6 | `machine().writeText` → write-file-atomic 8.0.0 | `atomicWrite.ts:15`; `Desktop/Platform/nodeMachine.ts:52`; `lib/index.js:80-161` | All-or-nothing replace (`Core/Platform/machine.ts:18-19`) | **The atomic rename is necessary.** Inside it: `fs.realpath` (the JS implementation, an `lstat` per path segment), `stat`, `open`, `write`, **`fsync`**, `close`, `chown`, `chmod`, `rename`, `unlink` of the vanished temp. The realpath, stat, chown, and chmod are **redundant** for a file the sweep just read. The fsync protects against power loss and kernel panics only (see *§Where the Time Goes*), and the Machine contract doesn't promise it |
| S7 | `utimes` back to the old mtime | `atomicWrite.ts:33-35` | A sweep doesn't re-date a page | **Necessary**; can be `futimes` on the temp before the rename |
| S8 | `forgetParse` | `atomicWrite.ts:36`; `Core/Files/walkCache.ts:29-32` | Drops the walk cache's parse | Necessary, in-memory |
| S9 | `noteOwn` → `applyOwn` → `diskMoved` → `applyEvents([ev])` | `atomicWrite.ts:38`; `Core/Nexus/settle.ts:53-65`; `Core/Nexus/fileEvents.ts:647-666` | Lands the write in the index and the tree as it happens | **Necessary work, batchable**: one event per call today |
| S9a | `indexWrittenPage`: `stat` | `Core/Index/indexSeed.ts:117` | The (mtime, size) the index row records, which the open's seed compares (`indexSeed.ts:227`) | **Redundant**: the writer can take it from the temp's own handle after `futimes` |
| S9b | `readIndexedStat` SELECT, `extractPageIndex` (a third parse + a body scan), `reindex` → `readHeadings` SELECT + `upsertPageIndexes` | `indexSeed.ts:124-127,134-136`; `Desktop/Store/stores.ts:59-85` | Keeps the content index current | **Necessary, batchable**: `upsertPageIndexes` already takes many rows, but each event calls it with one, so each page is its own `BEGIN`/`COMMIT` with four fresh `prepare`s, on the main thread (`node:sqlite` is synchronous, `Desktop/Store/driver.ts:18-29`), under WAL at SQLite's default `synchronous` (`driver.ts:36`) |
| S9c | `classifyEvent` → `applyPage`: `pageRecordOf(text)` (a fourth parse), `contextLinker`, `stabilize`, `updateNodeInTree`, `patchLiveTree` | `fileEvents.ts:216-269,361-403`; `Core/Nexus/treePatch.ts:182-235`; `Core/Nexus/liveTree.ts:38-44` | Patches the held tree | **Necessary, batchable**; the parse is **redundant** with S9b's. `updateNodeInTree` scans pages linearly until it finds the path (O(pages), string compares only). Each patch mints a new `collections` array, so every `entityMemo` (`Core/Nexus/tree.ts:134-150`) misses on its next use, but nothing in this path consults one (no `pageIndexOf`, `liveIdIndex`, `nodesOf`, or `nexusPages` in `fileEvents.ts`, `indexSeed.ts`, `governedSweep.ts`, or `atomicWrite.ts`) |
| T1 | The settle's `registerHeldOptions(root, holders)`: per changed page with a Multi-Select in its schema, `readPageRecord` → `cachedParse`'s `stat` + `readText` + a fifth parse | `settle.ts:169-172`; `Core/Properties/optionOps.ts:123-153`; `walkCache.ts:39`; `Core/Nexus/readNexus.ts:129-135` | Registers option words a file holds beyond its definition | **Redundant**: always a cache miss, since S8 forgot the parse, and the index rows S9b just wrote hold the same values. `optionOps.ts:146` skips the index whenever `rels` is given, for "a rescope's reseed [that] has yet to index" (`:122`); that reason covers newly reachable paths, never the app's own writes |
| W1 | Watcher echo: chokidar `change` → `isRecentWrite` (false for a hashed record) → batch → `dropOwnEchoes`'s `readBytes` + `sha256` | `Desktop/FileWatch/watcher.ts:106,108-125,186`; `writeEcho.ts:98-108` | Tells an outside write that restored the app's bytes from the app's own echo | **Necessary**, already batched (`Promise.all`), about 50 µs. chokidar's `awaitWriteFinish` also polls `stat` every 50 ms per pending file for at least 200 ms (`watcher.ts:106`), which the counter can't see, and write-file-atomic's temp (`Page.md.<n>`, same folder) raises its own add and unlink, which classify as ignored (`fileEvents.ts:268`, *inferred* from the temp name) |

**Reconciled with the counts:** the Medium property rename made 20,883 `readText` = 3 × 6,961 (P1, S2, T1); 20,875 `stat` = 3 × 6,961 (S4, S9a, T1); 6,961 `writeText`, 6,958 `utimes`, 6,959 `readBytes` (S6, S7, W1). The bench's `calls` window runs from the request to the last I/O (`bench/lib.mjs:112-121`), so it includes the settle and the watcher's drain. The UI's pre-rename count (`rekeyHolders` → `sweepCount`, a dry-run sweep reading and re-serializing every holder, `registryProperty.ts:192-202`, `governedSweep.ts:110-113`) is a separate request outside the benchmark's window, so a real rename reads each holder a fourth time.

##### The Other Cascades

All of them reach the same S1-S9 and T1 through `sweepGovernedRoots`; they differ in what they read before it and in how many files the sweep reads but doesn't write.

- **Option Rename** (`optionOps.ts:217-247`): `findHolders` without values lists every holder of the property's key (`:222`), and the sweep reads all of them to rewrite the ones holding the option: 8,381 `readText` = 6,984 sweep reads + 1,397 T1 reads, for 1,397 writes. About 5,600 reads per rename are **redundant**: the index's `page_values` rows hold each page's value, so it can narrow to pages whose value carries the word, at the same trust level `findHolders` already gives the index for keys.
- **Property Delete** (`Core/Properties/deleteProperty.ts:121-139`): the `'values'` read (`:126`) builds the Trash record before the strip removes the values, so it's **required by write-ahead ordering**; then the sweep and T1. 21,702 `readText` = 3 × 7,034.
- **Context Rename** (`Core/Contexts/contextCascade.ts:130-166`): `titleHolders` lists without reading (`:53-64`), then the sweep and T1: 10,152 `readText` ≈ 2 × 4,895. Its 68,473 `stat` calls are 3 × 4,895 plus about 53,800 more, with 1,221 `readDir`. *Inferred:* about five full walks, and the two counts agree. Each walk stats every page through `cachedParse` (`readNexus.ts:129-135`, about 10,000 per walk on Medium) and lists each container folder twice (`readNexus.ts:138,154`), about 250 listings over Medium's roughly 127 content folders, so 1,221 listings is about five walks; Small's 55 listings over its roughly 32 content folders and its ~1,100 extra stats both read as about one. The rename owes a walk twice before its sweep starts, from the registry's title change (`fileEvents.ts:480-481`) and the folder move (`fileEvents.ts:584`). `runWalk` discards and restarts a walk whenever the epoch moved while it read (`liveTree.ts:105-119`), and every own write bumps the epoch (`settle.ts:57`), so a walk that starts while writes are still landing re-walks until they stop. The time agrees: 8.2 ms per written file against the property rename's 7.3 ms, about 4.4 s extra, or five walks at roughly a warm open's 1 s. This is the one claim the CPU profile should settle first, including what starts a walk mid-sweep.
- **Space Rename** (`contextCascade.ts:168-202`): the same shape, small on the bench (49 writes).
- **Page Rename's Relink** (`settle.ts:274-303` → `noteRelink`/`relinkReach` → `renameCascade`, `Core/Nexus/cascade.ts:224-276`): the sweep reads every page the index says mentions an old key (`cascade.ts:240-243`), some of which don't change, then T1: 1,535 `readText` for 514 writes.
- **Page Delete's Link Strip** (`deleteCascade`, `cascade.ts:96-140`): mention holders in governed reach plus Spaces, the sweep, and T1: 983 `readText` for 490 writes.
- **Restore Refill** (`refillValues` → `sweepRootsById`, `governedSweep.ts:119-168`): files by id from the record, the sweep, and T1; same per-file pipeline.

**Not Quadratic:** the Small Nexus (1,000 pages) renamed a property across 674 files in 4.74 s, 7.0 ms per file; the Medium one (10,000 pages) across 6,961 files in 50.8 s, 7.3 ms per file. A tenfold Nexus moved the per-file cost by about 4%, which fits `updateNodeInTree`'s linear scan and nothing heavier. The Context rename's walks are an O(Nexus) cost per *operation*, repeated a handful of times, rather than per file.

---

#### 2. Where the Time Goes

##### Measured in Isolation

1,000 copies of a real benchmark page (961 bytes), on this machine's internal SSD, one at a time unless noted:

| Operation | µs per File |
|---|---|
| `readFile` | 49 |
| `stat` | 10 |
| `utimes` | 45 |
| sha256 of the text | 1 |
| JS `fs.realpath` (inside write-file-atomic) | 97 |
| `writeFile` in place, no fsync | 194 |
| temp + rename, no fsync | 496 |
| temp + **fsync** + rename | 6,329 |
| write-file-atomic, as `nodeMachine.writeText` calls it | 6,918 |
| write-file-atomic with `fsync: false` | 1,077 |
| Today's whole I/O sequence (read, stat, write-file-atomic, utimes, stat) | 7,109 |
| One handle-based read + temp + futimes + **fsync** + rename | 6,545 |
| The same without fsync | 682 |
| `node:sqlite`, one transaction per page (today's shape, WAL, default `synchronous`) | 466 |
| `node:sqlite`, one transaction for 1,000 pages | 41 |
| `yaml` `parseDocument` of the page's frontmatter (the pipeline parses 5-6 times per file) | 63-67 each |

Batching the flush:

| Shape | µs per File |
|---|---|
| write-file-atomic, 4 / 16 files at a time | 4,539 / 3,982 (4,137 / 3,647 with a 16-thread pool) |
| Write every temp, fsync them 4 at a time, rename every temp | 2,657 |
| Chunks of 64: temps, fsync together, renames | 2,649 (1,617 with `UV_THREADPOOL_SIZE=16`) |
| Temps and renames with no per-file fsync | 436-474 |

##### What It Means

- **The flush is the largest single cost:** in isolation it measured about 85-90% of a write's cost, and inside the running app the profile puts it at 51-60% of a rename's wall time. On macOS, Node's `fsync` (libuv) issues `F_FULLFSYNC`, which waits for the drive to empty its own cache; *inferred* from libuv's documented macOS behavior and consistent with the 6.3 ms measured. A plain `fsync` that stops at the drive isn't reachable from Node.
- **The rest:** the per-page index transaction (about 0.45 ms, on the main thread), five or six frontmatter parses plus two or three serializations (about 0.4-0.5 ms CPU), and the reads and stats (about 0.2 ms). Summed: roughly 7.7 ms against the 7.3 ms observed.
- **Question 1's answer:** yes, each cascade can do one read per file that serves every check, and it should, but that alone saves well under 1 ms of 7.3. What decides the cost is how often the app waits for the drive to flush.
- **The flush doesn't coalesce much:** sixteen at once still cost about 2.6-4 ms each, because each `F_FULLFSYNC` holds one of libuv's four pool threads for the full flush. Writing every temp first and flushing them together gets it down to about 1.6-2.7 ms per file.

##### The Profile

The benchmark's CPU profiles (*Trash & Archive Restructure — Reach-In Measurement · §Where the Time Goes*; their summaries in `.claude/Benchmarks/Reach-In/profiles/`) answered these predictions. The flush is the largest single cost at 51-60% of wall time, not 85-90%. The per-page index commits are the largest main-thread self time. The YAML parses tie with chokidar's directory rescans at about a fifth of main-thread time each. The Context rename's walks run one to five times, every one started by the settle's `walkWhileOwed`.
---

#### 3. The Necessary Minimum

**Shape:** a sweep reads each file once, lands its writes in flushed chunks, and records them in the index and the tree once per chunk; single writes take the same writer as a chunk of one.

##### Per File, Under Its Lock (the Read Pass)

1. `stat`, then read. The stat moves *ahead of* the read (today it follows, S4), so the (mtime, size) it holds is never newer than the text.
2. One parse. `sweepParse` serves admission, values, and the merge, and a text plan receives the parsed page rather than re-parsing the content (`renameFrontmatterKey` and `pageLeg` become rewrites of the held document; *inferred* feasible, since both already work on a `parseDocument` result).
3. Write the new text to a temp beside the file, opened with the mode the step-1 stat holds (what write-file-atomic's `stat` and `chmod` pair exists for; the stat already carries it, and owner is kept since the app writes as the file's owner, *inferred*), `futimes` it to the held mtime, and `fstat` it: that's the stat the index records. Release the lock.

##### Per Chunk (the Flush)

4. Flush every temp in the chunk together, then close them. Chunks of about 64 bound the extra time a file waits.

##### Per File, Under Its Lock Again (the Land)

5. `stat` the original. If (mtime, size) moved since step 1, another writer, in-app or outside, landed in between: drop the temp and count the file `skipped`, which keeps the note owed for Try Again. Otherwise `recordWrite` its hash and rename the temp over it.

##### Per Chunk (the Record)

6. One `applyEvents` over the chunk's events, each carrying its text and stat. One indexing call handles the chunk: one `readHeadings`, one `upsertPageIndexes` transaction, and no stat. The tree patches still run per event inside the same loop, since each is cheap. An event whose path has taken a newer own write since (the echo record's hash no longer matches, `writeEcho.ts:7`) is skipped, so a later writer's index row and tree node aren't overwritten by this chunk's older text.

##### Elsewhere

7. **The Settle:** `registerHeldOptions` reads the index for every path it holds, which every own write is, and reads files only for paths a rescope brought into reach.
8. **The Pre-Reads:**
   - The rename's clash check reads only the files the index lists under both keys.
   - An option edit narrows its sweep to pages whose indexed value carries the word.
   - The delete's values read stays, because write-ahead requires it.
   - A rename's pre-confirmation count (`sweepCount`, a fourth read and parse per holder today) can be answered by the index's holder count, since every readable holder of the old key changes; files the index can't vouch for still read.
9. **The Walk:** the Context rename's mid-sweep walks are confirmed by the profile first. The owed walk then pays once, after the sweep, as `underContexts`' `finally` already intends (`settle.ts:250-257`).
10. **One Writer:** `atomicWriteFile`, `rewritePageSerialized`, and (under the seam choice below) Sync's `landBytes` land through the same primitive as a chunk of one, keeping one flush each. write-file-atomic and its second per-path queue leave.

##### What It Replaces and Who Owns It

- **The Machine Seam** (`Core/Platform/machine.ts`, implemented in `Desktop/Platform/nodeMachine.ts`): `writeText` and `writeBytes` fold into one batched landing that takes `{ path, data, mtimeMs?, expect? }[]` and answers each file's stat or its refusal, so the batching lives where the flush happens, since only the host can flush. `utimes` can fold in too, but its other caller is Sync's `landBytes` (`atomicWrite.ts:42-52`), and the constraint says Sync changes as little as possible: keeping `utimes` on the seam leaves `landBytes` byte-for-byte (two methods become one); folding it changes `landBytes`' body without changing its behavior (three become one). The plan chooses. The test machines follow (`Core/Testing/machines.ts`, `Core/Testing/machineContract.ts`).
- **The Sweep** (`Core/Nexus/governedSweep.ts`): `sweepGovernedRoots` runs the read, land, and record passes. `rewritePreservingTimes` (`atomicWrite.ts:28-39`) folds into the landing.
- **Recording:** `noteOwn` takes many events (`writeEcho.ts:59`, `settle.ts:53-65`); `indexWrittenPage` takes many rows (`indexSeed.ts:109-131`), a single write being one row.
- **Reads:** `registerHeldOptions` (`optionOps.ts:123-181`); the clash check (`registryProperty.ts:178-187`); the option sweep's narrowing (`optionOps.ts:217-224`, plus one value query in `Desktop/Store/stores.ts`, `Core/Index/contentIndex.ts`, and `Core/Platform/stores.ts`).

**Rough Line Delta:** about +60 net production (*inferred*). The Desktop writer is about +35, replacing two library calls; the sweep's passes about +20; the value query about +15; the folds remove about 15 (`rewritePreservingTimes`, the index stat, the settle's file branch, the clash read). Net-positive lines are justified by what leaves: one dependency (`write-file-atomic` and its types), two Machine methods, a duplicate per-path serializer, two or three reads and stats and three parses per file, and a per-file database transaction.

##### Expected Effect (Inferred From the Measurements)

| Medium Property Rename | Per File | 6,961 Files |
|---|---|---|
| Today | about 7.3 ms | about 50 s |
| With chunked flushing | about 3-3.5 ms | about 20-25 s |
| Without a per-file flush (ruled out by Decision 21) | about 1 ms | about 7 s |

These add the remaining parse, batched index, and tree work (about 0.5 ms) to the measured write shapes (1.6-2.7 ms and about 0.5 ms).

Reach-in's extra cost per cascade shrinks by the same factor, since it's the per-file cost times the trashed copies a cascade also reaches.

##### The Durability Choice

Chunked flushing keeps today's guarantee: a page's new bytes are on the drive before its name points at them. Dropping the flush for cascade rewrites is about three times faster again, and it keeps atomicity against running readers. What it gives up is protection from power loss or a kernel panic during or just after a cascade, which could leave pages empty or torn (*inferred*; APFS's ordering of a renamed file's data isn't documented). The owed notes recover interrupted *work*, never lost *content*, since the bytes are gone. A flush pushes only its own file's bytes out of memory before emptying the drive's cache, so one flush covers a group only when every temp is written through to the drive as it's written (`O_DSYNC`). **Ruled:** the flush stays, chunked (*Trash & Archive Restructure — Decisions & Intention*, Decision 21).

---

#### 4. Invariants It Must Keep

- **Atomic Replace:** a reader sees old or new bytes, never a mix (`machine.ts:18-21`); the temp-and-rename keeps it.
- **Durability:** content is flushed before the rename (Decision 21).
- **Write-Ahead and Owed Work:** the note lands, flushed, before the list step and the sweep (`owed.ts:242-263`). A file the land pass refuses counts `skipped`, so `retries` keeps the entry and its Try Again (`owed.ts:266-268`, `configReach.ts`). `finishOwed` re-runs a sweep idempotently, because a rewrite of an already-rewritten file answers null and writes nothing (`governedSweep.ts:91`). The crash-window suite (`Core/Nexus/finishOwed.test.ts`) kills the process rather than the OS, so it pins ordering and not the flush; a test that pins the land pass's refusal is new.
- **Echo Suppression:** `recordWrite` with the landed bytes' hash runs before each rename, and the event follows the landing (`writeEcho.ts:22-33`). The watcher's byte check stays (`writeEcho.ts:98-108`). Sync's write tap still hears every file (`writeEcho.ts:32`), and Sync's own landing still records no echo and notes no event (`atomicWrite.ts:41-52`). Sync code doesn't change.
- **Outside Edits Racing a Sweep:** today an outside write landing between the read and the rename (about 7 ms) is overwritten silently. The land pass's recheck shrinks that window to the instant between its stat and its rename. Chunking holds a computed temp for up to one chunk's flush (about 100-170 ms at 64 files), and the recheck covers that wait.
- **Locks:** every in-app writer takes the path's lock. The sweep takes each file's lock twice, never nested, so the re-entrancy rule (`fileLock.ts:9-16`) holds.
- **The Index's Stat Matches the File's:** taken from the temp's `fstat` after `futimes`, since a rename keeps a file's mtime; the open's seed then skips the file (`indexSeed.ts:227`).
- **The Tree's Epoch:** each chunk bumps it after its renames and before its record, so a walk that read earlier discards its result (`liveTree.ts:37-48`, `settle.ts:56-57`).
- **Refusal Semantics:** an unreadable file, or one whose root can't round-trip, is skipped and refused exactly as today (`governedSweep.ts:25-32,56-68`).
- **Dry Runs:** `sweepCount` stays a read-only pass with no landing.

---

#### 5. Scope

##### What Shares the Pipeline

Every caller of `sweepGovernedRoots`:

- **Properties:** a property rename and a Label Format change (`registryProperty.ts:155`); option rename, delete, and value-format changes (`optionOps.ts:246`); a property delete's strip (`deleteProperty.ts:137`); an unassign (`unassignProperty.ts:88`).
- **Contexts:** a Context or Space rename (`contextCascade.ts:78`); a Context or Space delete's unlink (`contextCascade.ts:115`).
- **Links:** a page, Set, or Collection delete's Link strip (`cascade.ts:131`); a page rename's, a heading rename's, and an outside move's relink (`cascade.ts:265`); a relink entry's Try Again (`cascade.ts:306,316`).
- **Restores:** restore refills through `sweepRootsById` (`restoreProperty.ts:84`, `spend.ts:280,313`, `assignment.ts:73`); the restore scrub (`restoreScrub.ts:194`); the trashed-copy refill (`trashedCopies.ts:100`).
- **Repairs:** the exclusion scan (`exclusionScan.ts:83`) and the repair sweep (`repairSweep.ts:25`).
- **Dry Runs:** every pre-confirmation count (`sweepCount`, `governedSweep.ts:110`).

The single writers (`atomicWriteFile`, `rewritePageSerialized`, `landBytes`) carry every page save, JSON write, tile, stamp, and Sync landing, so the writer change reaches every write the app makes.

##### Files a Fix Touches

- **Platform:** `Desktop/Platform/nodeMachine.ts`, `Desktop/package.json`, `Core/Platform/machine.ts`, `Core/Testing/machines.ts`, `Core/Testing/machineContract.ts`
- **Writes and Sweeps:** `Core/Files/atomicWrite.ts`, `Core/Files/writeEcho.ts`, `Core/Nexus/governedSweep.ts`, and `Core/Files/pageFile.ts` for the text plans over a parsed page
- **Recording:** `Core/Nexus/settle.ts`, `Core/Nexus/fileEvents.ts`, `Core/Index/indexSeed.ts`
- **Reads:** `Core/Properties/optionOps.ts`, `Core/Properties/registryProperty.ts`, `Core/Index/keyHolders.ts`, `Core/Contexts/contextCascade.ts`'s `pageLeg`
- **The Value Query:** `Core/Index/contentIndex.ts`, `Core/Platform/stores.ts`, `Desktop/Store/stores.ts`
- **The Walk Race:** after the profile, likely `Core/Nexus/liveTree.ts` or `settle.ts`

No new file is needed, so no placement goes to Nathan.

##### Inside and Outside Decision 7

Of the roughly 17 files, only `settle.ts` is on Decision 7's list, and the fix touches its event and settle half rather than the restore's and archive's re-spell. The Trash and Archive callers (`restoreProperty`, `spend`, `restoreScrub`, `trashedCopies`, `archive`) consume the sweep and don't change. The fix is shared machinery outside the plan's surface; the Trash plan is its largest beneficiary.

---

#### 6. Recommendation

##### The Threshold

Nathan's threshold: the fix joins the Trash & Archive plan if it's one contained phase, or if the whole cleanup, fix included, stays reasonably under six phases.

##### Sizing the Rest of the Plan

The Investigation's Removal & Consolidation Ledger groups naturally into about five phases (*inferred* grouping):

1. **System Trash Mode Out:** L-1, L-2, M-7, M-8, L-4.
2. **One Mint-and-Record and the Delete:** M-1, M-2, M-4, M-6, L-3, L-7, L-9, with B-1.
3. **One Restore and the Archive Carry:** M-3, M-5, M-10, M-11, M-12, L-5, with B-2, B-3, B-5, B-6, B-7 where reach-in doesn't dissolve them.
4. **One Undo Shape, One Notice Owner, and the Browser Folds:** M-13, M-14, M-15, L-6, P-6, with B-4.
5. **The Store-of-Path Rule:** M-16, P-4, with B-8.

Reach-in adds a sixth.

##### Sizing the Fix

The write-path fix is honestly two phases:

- **W-1, One Landing:** the batched writer, the Machine seam, the sweep's passes, recording per chunk, and the settle reading the index. This phase carries the speedup.
- **W-2, One Read:** the pre-reads answered by the index, the option narrowing, and the Context rename's walk race, which waits on the profile.

Compressed into one phase, it would be the largest phase of the plan and touch every write the app makes.

##### The Call

The deciding ground is containment, which holds however the rest of the plan is grouped:

- About 16 of the fix's 17 files sit outside Decision 7.
- Its regression risks (echo suppression, write-ahead ordering, index and tree consistency, outside-edit races) have nothing to do with bundles, so its reviews need a different focus.
- It carries a durability decision Nathan has to make.

The count points the same way: on the grouping above (this report's, not the plan author's), five phases plus reach-in plus one or two makes seven or eight, past "reasonably under six." A tighter grouping of the ledger into three or four phases would bring the count near six, and the containment ground still stands.

**Recommendation:** give it its own short plan, two phases, and run it **first**, then re-run the reach-in measurement on the fixed pipeline before the Trash plan decides its model. Reach-in's cost is this per-file cost multiplied by the trashed copies a cascade reaches, so measuring reach-in on today's pipeline overstates it about twofold with flushing kept, and about sevenfold without it.

---

#### 7. For Nathan

When Pommora renames a property, it rewrites every page that uses it. For each page, it reads the file, changes the text, saves a new copy, and updates its own lookup tables. On a 10,000-page Nexus, that's about 7,000 pages at about 7 thousandths of a second each, which adds up to roughly 50 seconds.

The obvious suspect was the app reading each page several times, and it does: three reads per page where one would do. But those extra reads are cheap. More than half of the time goes to one thing: after saving each page, the app waits for the drive to confirm the page is physically stored, not just held in memory. That confirmation is called a *flush*, and the app waits for one after every single page, one page at a time.

The flush protects you from one specific event: the power cutting out, or the computer crashing hard, in the instant after a save. Without it, a page could come back empty. It doesn't matter when Pommora itself crashes or quits; only a whole-computer failure. Keeping that protection is the right default. What changes is the batching: Pommora would prepare about 64 pages, flush them together, then swap them in. That should make big renames about twice as fast without giving up the protection. Turning the flush off for these bulk rewrites would make them about seven times faster, at the cost of that protection, which is your call to make.

The fix sits in the part of the app that every save passes through, not in the Trash or the Archive. That's why I'd give it its own short plan of two steps and run it before deciding how the Trash should work. The Trash decision depends on how expensive these rewrites are, and today's numbers make them look about twice as bad as they'll be.
