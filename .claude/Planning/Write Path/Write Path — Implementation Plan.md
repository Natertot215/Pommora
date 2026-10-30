## Write Path — Implementation Plan

**DATE:** 10-29-2026
**STATUS:** Complete (10-29-2026)
**SOURCE:** *Write Path — Brief* (its Context, Mandate, Constraints, Verification, and Insights), *Write Path — Investigation*, *Trash & Archive Restructure — Reach-In Measurement · §5 Where the Time Goes*, *Write Path — Merged Design* and its inputs (`Scouts/A-Writers-Seam.md`, `Scouts/B-Sweep-Recording-Reads.md`), *Trash & Archive Restructure — Decisions & Intention* (Decisions A-7, B-1, C-3, and F-1–F-5), and the planning session's rulings on the merged design's open points (10-29-2026), which *§Constraints · Rulings* records.

**BASELINE** (filled after ratification; the end logged in the final report)

| Head | Tests | Start | End |
|------|-------|-------|-----|
| `15fe7422a` | 8,967 passed, 2 skipped (546 files); typecheck and lint clean | 10-29-2026 10:55 AM | `58a7b41a6` (code): 9,023 passed, 2 skipped (546 files); typecheck, lint, and build clean; 10-29-2026 06:59 PM |

### Context

Pommora's cascades are the writes that touch many files at once: a property, option, Context, or Space rename, a delete's Link strip, a page rename's relink, and a restore's refill. Each runs through one sweep (`Core/Nexus/governedSweep.ts`), and every write the app makes lands through the machine seam's `writeText` or `writeBytes` (`Core/Platform/machine.ts`), which the host (`Desktop/Platform/nodeMachine.ts`) implements with the `write-file-atomic` library. A property rename across 7,027 pages of a 10,000-page Nexus took 48.4 s, about 6.9 ms per file. The host-process CPU profile (*Reach-In Measurement · §5*) split that time. The flush, one `F_FULLFSYNC` per file waited on in turn, is 51-60% of wall time, which supersedes the Investigation's isolated 85-90%. The main thread is busy for 22% of it, led by one SQLite transaction per indexed page (`indexWrittenPage`, 32% of busy, the top self entry), five or six YAML parses per file (20%), and chokidar's directory rescans (23%). Each rewritten file is read three times and stat'ed three times, and a Context rename re-walks the Nexus one to five times, every walk started by the settle's `walkWhileOwed` while the rename's own writes still land; with the flush removed, the restarts rose to 177.

Nathan ruled the fix its own plan, run before the Trash & Archive Restructure decides its model (Decision F-2), with the flush kept and taken in groups (Decision F-3), and the whole fix taken so the write path needn't be revisited (Decision F-5). *Write Path — Merged Design* is the design this plan writes from: its Core, its four Read Cuts, and its two recommended offsets, with the open points ruled as *§Constraints · Rulings* states. Its code was applied to scratch copies but never compiled; every AFTER below was applied to a detached worktree of `15fe7422a`, task by task, and each task's state passed `npm run typecheck`'s six code projects, Biome's check, and `npm run test` in full, with lint's two comment and name hooks clean at the final state (*§Open Items* holds what that run couldn't reach).

### Overview

**W-1 · One Landing** replaces the per-file write with a grouped one. The seam's `writeText`, `writeBytes`, and `utimes` fold into one method, `land(files)`, which the host implements without the library: every file in a group is written to a dotted temp beside it (beside its target, for a symlink, which it lands through as the library did), dated where the caller keeps its time, and flushed, all before any temp is renamed over its file, so a group's flushes overlap and every page's bytes still reach the drive before its name points at them. A file whose `expect` stat no longer matches, or that a read found missing and that now exists, is left as the other writer left it, its landing rejected rather than written over it, and each file answers its own stat or its own failure. In Core, `landOwn` records the echoes, lands the group, and notes the landed files as one batch, so the index takes a chunk in one transaction and the tree patches from the text and stat each event carries; a watched batch commits as the seed does, 200 pages a transaction, keeping a row another writer landed during its read. One held rewrite, `rewriteHeld`, holds a chunk of files' locks from read through record and lands them together (64 files, or 16 where Task 1-8's measure leaves the thread pool at its four threads), and a file whose rewrite throws costs only itself; the sweep, a lone page rewrite, a relink's tile rewrites, and the stamps a first adoption writes all run through it. The settle reads registered option words from the index rather than re-reading every page; the Context and Space renames run inside the settle's turn, so the walk they owe is paid once after the sweep; and every landing that follows a read carries the stat that read saw. One `statOrNull` replaces the eight hand-written stat-or-null forms the new code would otherwise repeat. `write-file-atomic`, its types, its transitive `signal-exit`, `rewritePreservingTimes`, `atomicWriteBinary`, the private `land`, `guarded`, the per-event index path, and the settle's forced file read all leave.

**W-2 · One Read** removes the reads and parses the sweep or the index's own read already answered: a text plan rewrites the parse the sweep admitted its page by (R-3); the index's one read and parse of a written page serves its tree patch too, for the app's own writes and outside edits alike, while no index commit has landed at its path since (OP-3); and a page the app just wrote hands its parsed record to the walk cache, so the walk it owes doesn't read it again (R-4). A cascade still reaches every page the index lists as holding its key and reads each from its file, since Tasks 2-1's and 2-2's narrowing by index rows (R-1, R-2) was withdrawn (*§Deviations · D-2*). After both phases, each file an option or Context cascade rewrites is read once and parsed once from disk, a property rename's clash check reads and parses each holder once more, and each landed text is parsed once; a relink's merge parses a page once more where it re-spells a frontmatter Link (`mergeFrontmatter`). An outside edit, and every page another device's cascade lands here through Sync, is read and parsed once rather than twice.

**Grouping:** the merged design placed its two offsets, O-1 (one own writer for text and bytes) and O-2 (a rewrite is handed the stat its read was checked against), after its Read Cuts. Both are the landing's own shape: Task 1-4 rewrites `atomicWriteBinary` and `rewritePageSerialized` onto the new seam regardless, so writing them in their old shape there and changing them a phase later would leave an intermediate form in two commits for nothing. They land in Task 1-4, and W-2 holds the Read Cuts and OP-3 alone.

**Race-Only Changes:** what a user sees and gets is unchanged apart from speed, except in these cases, each reached only by a race or an edge:

- **Outside Edits Are Kept:** a file another program changes between the app's read and its landing is left as that program left it, and so is a file another program creates between a read that found none and the landing (a tile's first body, a seeded JSON file, the identity file's create, the Contexts registry's seed, a page's or an asset's create, a removed tile's file put back). A sweep counts it `skipped`, so the owed note keeps it for Try Again; a lone write fails as a failed write already does (a stamp, a remint, a tile, a page save reported once, a property write's error, a create's error). Today it's overwritten. Sync's own landing keeps its behavior and states why where it stands.

- **The Group:** a rewritten file whose group differs from its folder's takes the folder's, where the library's `chown` restored a group the user belongs to; its owner stays the app's user, as the library's `chown` already left it for any process that isn't root.
- **The Length Limit:** a page whose name runs past about 244 bytes now saves, since the temp is named a fixed 21 characters rather than the file's own name plus up to 11 more, which the library's temp needed under the 255-byte limit.
- **The Wait:** while a held rewrite lands a chunk (a sweep's, a relink's tiles, an adoption's stamps), its flushes hold the host's thread pool, so any other read or write the app makes, of any file, waits behind them for tens of milliseconds, about 30-45 ms with Task 1-8's sixteen threads or 16-20 ms with sixteen files a chunk, where today a read doesn't wait; and an in-app write to a page inside the chunk waits for the chunk, up to about 50-200 ms, where today it waits about 7 ms.
- **The Temps:** a crash, a force quit, or a power loss while a chunk flushes, or a folder another operation moves while a chunk inside it flushes, can leave that chunk's dotted `.landing-*` temps beside their files, where the library left at most one undotted `Name.md.<digits>`. They're accepted as they lie, with no cleanup pass: Finder and the shell hide them, though Windows Explorer lists them, every reader and Sync ignore a dotted name, and only a crash or that mid-flush move makes them. Git and cloud clients do list them.

**The Number:** this plan is net-positive in lines, about **+180 Actionable** by `view-delta`, against the Mandate's north star of net-negative: about +190 in production code (blank lines included, +174 without), +73 in `Core/Testing/`'s machines, contract cases, and landing seams, which `view-delta` counts as code, and about −83 in the lockfile and `Desktop/package.json`, the dead `Pommora` lockfile entry that also listed the library among them. What it buys is what leaves: a third-party dependency and its transitive one, three Machine methods folded into one, the library's duplicate per-path queue and its per-file `realpath` (an `lstat` in its place, with `realpath` only for a link), `stat`, `chown`, and `chmod`, a per-file database transaction, two of three reads and stats and three or four of five or six parses per rewritten file, the settle's re-read, the owed walk's re-read, an outside edit's second stat, read, and parse, zero to four redundant Nexus walks per Context rename, a relink's tiles' and a first adoption's stamps' one flush per file, eight duplicated stat-or-null forms, and the second pipeline that read, rewrote, and landed a held file. About 47 of the production lines are the host doing what about 160 lines of library code did, flushing as a group and writing through a symlink. Task 1-4 is +4 in all: the held rewrite and its per-file catch cost about +25 against the sweep loop and the lone rewrite they replace, and carrying the adoption stamps and the tile relink onto it about +19 more, against the library's removal from the test machines (−22) and the host (−17). Task 1-2 is +21: the batch's commit taking the seed's own rules, its in-flight row kept and its switch check, with the seed's skip and in-flight rule folded into `describes` and `unmoved`. OP-3 is +31, about eleven of it the commit carrying each read to the tree's patch and the patch's check that the read is still the index's, and Task 1-1's consolidation pays back 21. The ruling's +110 counted OP-5 at `rmwLocked` alone; Task 1-7, which carries it through all ten landings that follow a read, is +12. Task 1-8 sits outside the estimates: AFTER A adds three lines, AFTER B none. Each phase's measure is recorded in the Net Ledger, and growth past an estimate is reported with what it buys.

**Net Ledger** (Actionable column of `view-delta --exclude .claude`, per phase, cumulative from the BASELINE head; the estimates are measured on the validated worktree and include `Core/Testing/` and the lockfile, which `view-delta` counts as code):

| Phase | Estimate | Measured | Cumulative |
| ----- | -------- | -------- | ---------- |
| 1 | +518 / −400 (+118) | +560 / −417 (+143), its checkpoint fold included | +143 |
| 2 | +107 / −45 (+62) | +138 / −79 (+59), its checkpoint fold included | +202 |
| Final Verification | — | +141 / −151 (−10), Waves One and Two, the neutral gate's fold, the temp guard's removal (D-3), and the scaled pool (D-4) | +192 |
| Closeout | — | ±0 (comments and docs only) | +192 |

**Task 1-8's Measure:** the Medium-0 property rename's median was 3.292 ms per file (23,135 ms over 7,027 files) at four pool threads and 2.388 ms (16,782 ms) at sixteen, 0.904 ms apart, so the line shipped and `CHUNK` stayed 64.

**The Own Pass's Measure** (Medium-0, code head `9b9c0d630`): the property rename took 14,708 ms over 7,027 files (2.09 ms per file, against 6.89), with 2 `readText`, 1 `stat`, and 1 `readBytes` per holder; the Context rename 9,569 ms over 4,927 (1.94 ms, against 6.99), one walk; the page rename 1,680 ms over 522 (3.22 ms, against 7.83). Chokidar's rescans are 968 ms, 21.6% of a property rename's busy time (2.53 s, 23% at the baseline). The baseline's "four walks" counted root listings, two per walk, so it was two walks.

#### Concepts

**ADDED**

| Concept | Description | Location |
| ------- | ----------- | -------- |
| `Landing` • Interface | One file a landing writes: its bytes, the modification time it keeps where given, and the stat its read saw, or null where it found no file. | `Core/Platform/machine.ts` |
| `Machine.land` • Method | Writes a group of files whole, flushed together before any is renamed into place, answering each file's stat or failure in order; replaces `writeText`, `writeBytes`, and `utimes`. | `Core/Platform/machine.ts` |
| `sameFile` • Function | Whether a stat still describes the file another stat was taken of: the same time, size, and birth, a null stat describing no file; the walk cache's hit test too. | `Core/Platform/machine.ts` |
| `statOrNull` • Function | A path's stat, or null when it's missing or can't be read; the one form of what eight call sites spelled by hand, Desktop's `appConfig.ts` among them. | `Core/Platform/machine.ts` |
| `stage` • Function | The host's half of one file's landing: writes, dates, and flushes its temp beside the file, or beside a symlink's target, which it lands at, and answers the commit that checks `expect`, keeps the mode, and renames it. | `Desktop/Platform/nodeMachine.ts` |
| `fileStat` • Function | A host's stat of a file as the seam's `FileStat`, typed by its shape so Core imports nothing from Node; the host's and the disk test machine's `stat` and landing share it. | `Core/Platform/machine.ts` |
| `entryKind` • Function (Moved) | A host's directory entry as the seam's `DirEntry` kind, moved beside `fileStat` from the host and the disk test machine, which each spelled it. | `Core/Platform/machine.ts` |
| `.landing-<12 hex>` • Temp Name | The temp a landing writes beside its file: dotted, so the walk, the watcher, and Sync never admit it, and one a crash strands is left where it lies; and fixed-length. | `Desktop/Platform/nodeMachine.ts`, `Core/Testing/machines.ts` |
| `landOwn` • Function | Lands the app's own writes as one group: records each echo, lands, forgets the echo of a file whose landing rejects, and notes the landed files as one batch carrying each one's stat; private to its file. | `Core/Files/atomicWrite.ts` |
| `forgetWrite` • Function | Forgets the write recorded at a path while it still holds a given hash, so a rejected landing's bytes, landed by another writer, read as theirs; `dropOwnEchoes` asks it too. | `Core/Files/writeEcho.ts` |
| `sole` • Function | A lone file's landing, its failure thrown. | `Core/Files/atomicWrite.ts` |
| `rewriteHeld` • Function | The one held rewrite: reads each file's stat and then its text under its chunk's locks, rewrites it, and lands the chunk as one group, a page keeping its time, a file changed since its read left as its writer left it and answered failed, and a file whose rewrite throws costing only itself; behind the sweep, `rewritePageSerialized`, the tile relink, and `stampMissing`. | `Core/Files/atomicWrite.ts` |
| `Rewritten` • Type | What a held rewrite did with each file it reached: unread, refused by its rewrite (a root that can't round-trip), failed, or rewritten; private to its file. | `Core/Files/atomicWrite.ts` |
| `CHUNK` • Constant | The files a held rewrite holds and lands together: 64 with Task 1-8's thread-pool line, 16 without. | `Core/Files/atomicWrite.ts` |
| `holding` • Function | Runs a function holding each of a chunk's locks, taken in sorted order. | `Core/Files/atomicWrite.ts` |
| `atomicWriteFile`'s `{ bodyOnly, expect }` • Parameter | The writer's options, `expect` being the stat a read of the file saw, as `Landing` spells it. | `Core/Files/atomicWrite.ts` |
| `writeJson`'s `{ expect }` • Parameter | The same stat for a JSON landing, passed straight through to `atomicWriteFile`. | `Core/Files/atomicWrite.ts` |
| `HeldRewrite` • Type | A held rewrite's answer for one file from its text and the stat its read saw; `rewriteHeld` and `rewritePageSerialized` take it, so a lone rewrite is handed its file and the stat its read was checked against, and `stamping` builds one. | `Core/Files/atomicWrite.ts` |
| `NameLanding` • Type | `owed.ts`' private name a create or rename lands on, renamed from `Landing` so the seam's type owns the word. | `Core/Nexus/owed.ts` |
| `Changed.stat` • Field | The stat an own write's landing answered, which the index records in place of its own stat. | `Core/Files/writeEcho.ts` |
| `ParsedPage` • Type | What `parsePage` answers: the frontmatter and its admission. | `Core/Files/pageFile.ts` |
| `stamping` • Function | The rewrite that stamps a page missing its ID, shared by `stampPage`, which takes a page and its kind alone, and `stampMissing`'s one held rewrite. | `Core/Nexus/adopt.ts` |
| `inContextsTurn` • Function | Runs an operation in the settle's turn under the Contexts lock, the turn nested inside it. | `Core/Nexus/settle.ts` |
| `addressed`'s `turn` • Parameter | The turn a page-addressed write runs in: `inSettleTurn`, or `inContextsTurn` for a create that seeds a Context. | `Core/Nexus/mutate.ts` |
| `indexEvents` • Function | Maintains the index for a slice of up to 200 events, which `applyEvents` hands it before their patches, answering each page's read for the tree's patch; replaces `indexEvent`. | `Core/Nexus/fileEvents.ts` |
| `indexWrittenPages` • Function | Re-indexes written pages as the seed does, 200 a transaction, a row another writer landed mid-read kept, from the text and stat their events carry or else from their files; replaces `indexWrittenPage`. | `Core/Index/indexSeed.ts` |
| `INDEX_BATCH` • Constant | The index's commit size, 200 pages: the seed's commits, a watched batch's, and `applyEvents`' slices; renamed from `SEED_BATCH`. | `Core/Index/indexSeed.ts` |
| `describes` • Function | Whether the index's recorded stat describes a file's, the same time and size: the seed's skip. | `Core/Index/indexSeed.ts` |
| `commit` · `commits` · `lastCommits` • Commit Sequence | Counts each commit of index rows, written, moved, or removed, and records each path's last one per store, so a switch's store starts with none; every index write of a page goes through `commit`. | `Core/Index/indexSeed.ts` |
| `unmoved` • Function | Whether no commit landed at a page's path after a sequence taken ahead of its read, or after the commit that took it: the seed's in-flight rule, which the batch's commit and the tree's patch share, every read taken where no index holds rows. | `Core/Index/indexSeed.ts` |
| `PageRead` • Type | What the index read of a written page, its text, stat, and parse, and the sequence of the commit that took it, which the tree's patch takes rather than reading the page again. | `Core/Index/indexSeed.ts` |
| `indexWrittenPages`' `reads` · `applyOne`'s and `applyPage`'s `given` • Parameters | Each page's `PageRead`, from the index half to the tree half. | `Core/Index/indexSeed.ts`, `Core/Nexus/fileEvents.ts` |
| `rekeyed` • Function | A parsed page with one key renamed in its place; `renameFrontmatterKey`'s body. | `Core/Files/pageFile.ts` |
| `SweptPage.rekey` • Field | `rekeyed` over the parse the sweep admitted the page by. | `Core/Files/pageFile.ts` |
| `rekeySweep` • Function | The one plan that renames a key in place, in each page's parse and each Space sidecar's object, behind a property rename and a Context's. | `Core/Nexus/governedSweep.ts` |
| `rekeyContext` • Function | A Context rename's `rekeySweep`, which `cascadeTitle` sweeps and a relink's rekey takes the `raw` of. | `Core/Contexts/contextCascade.ts` |
| `rememberParse` • Function | Holds a parse in the walk cache under the stat of the read that built it, which the tree's patch hands over for the app's own write. | `Core/Files/walkCache.ts` |
| `extractPageIndex`'s and `pageRecordOf`'s `page` • Parameters | A parse the caller already holds, defaulting to parsing the content. | `Core/Index/indexSeed.ts`, `Core/Nexus/readNexus.ts` |
| `failLandings` • Function | The test seam that fails the landings a predicate picks; replaces `refuseWrites`. | `Core/Testing/hostFs.ts` |
| `raceLandings` • Function | The test seam that overwrites the files a predicate picks just before their landing, as another program's write. | `Core/Testing/hostFs.ts` |
| `land`, `entryStat`, `landOnDisk` • Test Machine Members | The memory and disk test machines' landing. | `Core/Testing/machines.ts` |

**REMOVED**

| Concept | Description | Location |
| ------- | ----------- | -------- |
| `write-file-atomic` · `@types/write-file-atomic` • Dependencies | The library behind every write, and its types; `signal-exit@4.1.0` leaves the lockfile with it. | `Desktop/package.json`, `package-lock.json` |
| `Machine.writeText` · `Machine.writeBytes` · `Machine.utimes` • Methods | Folded into `land`, in the contract and all three machines. | `Core/Platform/machine.ts`, `Desktop/Platform/nodeMachine.ts`, `Core/Testing/machines.ts` |
| `asBuffer` • Function | The library's byte adapter. | `Desktop/Platform/nodeMachine.ts` |
| `land` (private) • Function | The single-file record-then-write the recorder replaces. | `Core/Files/atomicWrite.ts` |
| `rewritePreservingTimes` • Function | A kept-time rewrite with its stat after the read; folded into `rewriteHeld`. | `Core/Files/atomicWrite.ts` |
| `atomicWriteBinary` • Function | The byte writer; `atomicWriteFile` takes bytes. | `Core/Files/atomicWrite.ts` |
| `guarded` • Function | The sweep's per-file lock and catch; the catch moves into `rewriteHeld`, and a lock's rejection, which only re-entrancy causes, now fails the sweep. | `Core/Nexus/governedSweep.ts` |
| `indexEvent` • Function | The per-event index switch. | `Core/Nexus/fileEvents.ts` |
| `TEMP_SUFFIX` · `manifestAdmits`' `siblings` • Rule and Parameter | The guard against a `Name.md.<digits>` temp beside its file, and the argument only it read, threaded through Sync's `push.ts` and `reconcile.ts` (D-3). | `Core/Paths/exclusion.ts` |
| `pageLeg` • Function | A Context rename's own page plan; `rekeyContext` builds it through `rekeySweep`. | `Core/Contexts/contextCascade.ts` |
| `stampPage`'s `overForeign` · `held` • Parameters | Left without a caller once `stampMissing` stamps through one held rewrite. | `Core/Nexus/adopt.ts` |
| `indexWrittenPage` • Function | The per-page index transaction and stat. | `Core/Index/indexSeed.ts` |
| `refuseWrites` · `writers` • Test Helpers | Replaced by `failLandings`. | `Core/Testing/hostFs.ts` |
| `put` · `atomicWrite` • Test Machine Helpers | The test machines' single-file writers. | `Core/Testing/machines.ts` |
| `unlessVouched` · `HolderQuery.every` • Function and Field | The pass-over by index row behind R-1 and R-2, which Tasks 2-1 and 2-2 added and *§Deviations · D-2* withdrew. | `Core/Index/indexSeed.ts`, `Core/Index/keyHolders.ts` |

#### Constraints

- **Mandate (Nathan's, verbatim from *Write Path — Brief*):**
  - **Approach:**
    - Any approaches being considered here must first assess what’s true *now* that would be able to be removed, deleted, changed, consolidated, or replaced. We’re not going to design based on what’s currently there and simply adjust course, we’re ensuring totality-first application, removal-first scoping, and residue-eliminating frameworks that provide a clean slate rather than building changes on top of what’s ultimately going to be replaced.
    - We’re approaching this through consolidation-first properties, ensuring the codebase ends up more understandable, less complex, more efficient in what it does, less conflicting in defining that, and an overall cleaner foundation to work within.
    - We shouldn’t adding anything new unless there’s evidence that it’s required. We’d approach this through the perspective of ending up with cumulatively “less stuff” in the codebase overall — less ways to do similar things, less complexity, fewer paths to go through, less tech debt waiting to surface, less things to maintain, and less headaches when approaching future work entirely — while the line-count *may* end up positive. Net-negative lines are the north star, but any net-positive gain *must* have its rationale for that outcome be genuinely backed through this framework and our <principles>.
    - Anything within our surface area should be left reading as always-intentional, without any odd-ones-out designs, and be reflective across the broader codebases' resulting shape — not just maintaining remnants or adherence to what’s true *now* that’s ultimately going to change. The approach should reflect the outcome and shouldn’t be bound to constraints that were only relevant before.
    - Ensure we're looking *outward* for cross-file opportunities and shared design, avoiding hand-rolling or duplicating what's already there or can be adjusted accordingly. Pommora is an established codebase and we’re not starting from scratch.
    - The complex data-level mechanics of the codebase are what least reflect *Nathan’s* intentions and are primarily reflective of what’s determined appropriate via past session agents. Treat it with care and respect, but don’t assume it’s beyond changing within reason, where simply presenting the approach to Nathan may be all that’s required to genuinely change the codebase for the betterment of everything within it and future iterations.
  - **Principles:**
    - **Less to Carry:** No more functions, helpers, wrappers, types, layers, and call sites than necessary, and no logic stated twice. New code earns its place by removing more than it adds, fixing incorrect behavior, or delivering required behavior in its minimal form.
    - **Less to Understand:** A reader finds what exists, where it lives, what owns it, and what calls it with less searching and tracing than before, whether a developer reading code or Nathan reading file names and headers. A blind-eye review of the surface areas impacted by this implementation should find less confusion, less conflict about intent, and an unambiguously more approachable, maintainable ecosystem to iterate on.
    - **Clearer Boundaries:** Each responsibility has one owner, and the next change of a kind has one obvious place to go, with no choice between layers, helpers, or modules — nothing that exists somewhere where it shouldn't; nothing implemented where something else already does it or adjusting it accordingly would be the more appropriate approach; nothing that increases the risk of misassumption when working here in the future.
    - **Reads as Designed:** Nothing temporary, transitional, kept for compatibility, unreachable, needlessly indirect, or left over from the work remains. Nothing designed around codebase shapes that will ultimately be changed for the better.
    - **One Way:** Each thing has one implementation, one pattern, and one source of truth. No part contradicts another. Exceptions carry their reason where a reader meets them, in code or feature documentation.
    - **Real Purpose:** Anything added to the codebase should have its purpose clearly stated with the perspective of its value enhancing what's already there — complexity, duplications, divergences, multiple ways to do the same thing — and anything "new" added should be assessed using that. Line-count increases shouldn't translate into maintenance cost or complexity.
    - Anything introduced should have independent justification behind its existence that isn't simply self-induced requirements.
    - Anything changed or implemented should be reflected across the board — nothing that's done this way here, while something else works differently elsewhere, unless that's *genuinely* correct.
    - Zero data-level spaghetti, complexity, or additional 'stuff' should be added without reason. Rewiring things to become more understandable, more efficient, more appropriate, and more effective is preferred when the alternative is just adding more to something that's inherently unfit to suit the long-term mandate of what's actually being offered.
- **Briefs:** every agent brief on this plan — executors, checkpoint reviewers, the final waves, and every compaction continuation — carries the Mandate above in full and has its agent read *§Constraints* whole from this file before anything else, so the brief and the plan never hold two copies. The neutral gate's brief carries the Mandate alone.
- **Rulings (Not Re-Raised):** every entry in *Trash & Archive Restructure — Decisions & Intention*, and these, the planning session's calls on the merged design's open points, which Nathan delegated (Decisions A-3 and F-5):
  - **Scope:** the merged design's Core, its Read Cuts R-3 and R-4 (R-1 and R-2 withdrawn under *§Deviations · D-2*), the two recommended offsets (O-1, O-2), OP-3 (one parse of each landed page serves the index and the tree), and OP-5 (every landing that follows a read carries the stat that read saw).
  - **OP-1:** `TEMP_SUFFIX` and `manifestAdmits`' `siblings` leave (D-3): with the library gone they guarded only other programs' temps, and the app's own temp is dotted, so the walk, the watcher, and Sync never admit it.
  - **Symlinks:** the host's `land` resolves a symlinked file and lands at its real path, so a symlinked page is written through as it is today; an `lstat` per file, with `realpath` only for a link, and the temp staged beside the real file.
  - **OP-2:** the race-only changes in *§Overview · Race-Only Changes* are accepted.
  - **OP-4:** `deleteCascade`'s post-sweep parse and `restoreScrub`'s text plan stay with the Trash & Archive plan (*§Open Items*).
  - **OP-5, As Planned:** the ruling named `rmwLocked`; the planning read found nine more landings that follow a read (`editJsonStrict`, `rewriteRootAt`, `updatePageBody`, `writeMarkdownTile`, `ensureIdentity`, and four creates that follow a read finding no file, `ensureContextsRegistry`, `createPage`, `restoreTile`, and `writeAssetFile`), and Task 1-7 carries the stat through all ten so the rule's exception list holds Sync's landing alone, as the ruling asked.
  - **D-5:** `UV_THREADPOOL_SIZE` ships only if Task 1-8 measures the threshold it states, and `CHUNK` follows it: 64 with the line, 16 without.
  - **The Index's Trust:** a cascade's reach is the index's membership, as at the baseline: every page the index lists as holding its key, or the corpus before the index is ready, each read from its file. No index row decides what a cascade passes over.
  - **Chokidar's Directory Rescans:** outside this plan, since the watcher is its own owner; *§Final Verification* re-profiles them and *§Reconciliation* files the issue.
  - **The Confirmation Count:** stays its operation's own dry run (Decision F-5); no index-based count.
  - **One Held Rewrite:** the sweep's chunk and `rewritePageSerialized` are one pipeline, `rewriteHeld`, and a relink's tile rewrites and `stampMissing`'s page stamps land through it in groups, each page's stamp landing or failing on its own and an ID the tree held going back to one page alone, as it does today.
  - **OP-3's Placement:** the index half hands its one read and parse of each written page to the tree half, for the app's own events and outside ones alike, so no event carries a parse.
  - **Phases:** two, W-1 and W-2, with O-1 and O-2 folded into Task 1-4 for the reason *§Overview · Grouping* gives.
- **Placement:** no new file in the codebase, test files included; every test this plan adds goes into an existing suite (*§Constraints · Tests*). Verified against the tree at `15fe7422a`.
- **Not Feature-Level:** what a user sees and gets is unchanged apart from speed and the race-only changes *§Overview* names. Every page still lands whole or not at all, and its bytes reach the drive before its name points at them (Decision F-3). Anything else that would change what a user sees is recorded under *§Deviations* for Nathan and taken at its simplest reading that changes nothing visible.
- **Sync:** Sync code doesn't change: nothing under `Core/Sync/` or `Sync/` changes. Sync's landing, `landBytes`, is Core code (`Core/Files/atomicWrite.ts`): its body becomes one `land` call, its behavior is unchanged except that its time is set on the temp before the rename, and Task 1-7 states at it why it carries no `expect`.
- **Gates:** `npm run typecheck`, `npm run test`, and `npm run lint`, from the repo root; each prints its own failures, and lint runs clean. Biome formats every TS and JSON write, so an edit failing on whitespace means it reformatted: re-read and retry. "Run the gates" in a task means those three. `npm run build`, confirming `✓ built in`, runs from a clean state at the final head.
- **Commits:** each task commits once its VERIFY passes, through `git commit --only -m "…" -- <paths>` after `git add` for new files (*Development-Environment · §Gates & Commits*); `package-lock.json` is among Task 1-4's paths. Messages are past tense, one to three sentences, and end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. The post-commit hook pushes `active`. A Bash command carrying `git` can't contain a personal name anywhere, paths included (`no-name-mentions.mjs`).
- **Tests:** each new behavior gets a test that fails without its change, run once against the code with the change reverted and watched red; a rewritten case counts as that test. The new cases, by task, each in the existing suite named:

  | # | Task | Suite | The Case | Fails Without |
  |---|---|---|---|---|
  | T-N1 | 1-3 | `Core/Testing/machineContract.ts` | A group of two whose first `expect` is stale: the first rejects and keeps the other writer's bytes, and the second lands | `sameFile` in `land` |
  | T-N2 | 1-3 | `machineContract.ts` | `expect` on a path removed since: it rejects and creates nothing; `expect: null` on a path another writer created since: it rejects and keeps that writer's bytes | `sameFile`'s two `null` arms |
  | T-N3 | 1-3 | `machineContract.ts`; `Desktop/Platform/nodeMachine.test.ts` | A group landing onto a folder and onto `b.md`: the folder rejects, `b.md` lands, and the sorted listing is `['b.md', 'dir']`, no `.landing-*` left; host only, a landing whose data can't be written (`42 as never`) rejects and leaves no temp | `discard` in the commit; `discard` in `stage` |
  | T-N4 | 1-3 | `machineContract.ts` | A landing keeps the time it's given (a whole second), and its answer equals a later `stat` | the time on the temp, or answering a stat taken before it |
  | T-N19 | 1-3 | `nodeMachine.test.ts` | `vi.mock('node:fs/promises')` spreads the real module, so the contract cases in the same file run unchanged, wraps each handle `open` returns so its `sync` logs as it finishes (`const sync = handle.sync.bind(handle); handle.sync = async () => { const r = await sync(); log.push('synced'); return r }`), and logs each handle's `close` with the path `open` took and each `rename`; the case lands three files through a host imported after `vi.resetModules()`, since the setup file imported the host before the mock: `synced` is logged three times, the last `synced` comes before the first `rename`, and each temp's `close` comes before its `rename` | every flush finishing before any commit (`void handle.sync().catch(() => {})` in `stage` turns it red); the handle closed before the rename (`close` moved after it turns it red) |
  | T-N35 | 1-3 | `nodeMachine.test.ts` | Under T-N19's mock, a hook in the mocked `sync` rewrites the target while its group flushes: that file's landing, carrying the stat taken before, rejects, and the file keeps the outside bytes | `sameFile` checked in the commit, after the flush (moved into `stage` ahead of the flush, it turns red) |
  | T-N20 | 1-3 | `nodeMachine.test.ts` | A file at `0o664` landed over keeps `0o664` (skipped under `noModeBits`) | the `chmod` |
  | T-N21 | 1-3 | `nodeMachine.test.ts` | The temp a landing renames (captured through the `rename` mock) is ignored by `syncIgnoredUnder` and refused by `manifestAdmits` | the leading dot |
  | T-N27 | 1-3 | `nodeMachine.test.ts` | A landing onto a symlink lands at its target: the link is still a link (`lstat`), and the target holds the new bytes | the `lstat` and `realpath` in `stage` |
  | T-N10 | 1-2 | `Core/Index/indexMaintenance.test.ts` | One `noteOwn` of 70 page events makes one `upsertPageIndexes` call, one page event makes one, and 201 make two, of 200 and 1 | `indexEvents` batching; the flush at `INDEX_BATCH` |
  | T-N31 | 1-2 | `Core/Index/indexSeed.test.ts` | A `readText` hook that writes page P and indexes it, as a maintaining writer does, fired during a batch's read of Q and, again, during its read of P itself: P's row holds the writer's value; a hook that installs fresh stores during the batch's read leaves them with no row; and so does one that installs them during the settings read of a last entry outside the corpus (`Hidden/Secret.md`), armed from the batch's read of the page before it | `unmoved` at the batch's commit; its prior read ahead of the page's; the switch check in the loop; the switch check before the last commit |
  | T-N34 | 1-2 | `indexSeed.test.ts` | A seed of exactly `INDEX_BATCH` (200) pages makes one `upsertPageIndexes` call | `reindex`'s empty-batch guard |
  | T-N5 | 1-4 | `Core/Nexus/governedSweep.test.ts`, `Core/Properties/registryProperty.test.ts` | A property rename over pages A and B, with `raceLandings` overwriting B: B keeps the outside bytes and is `skipped`, A is rewritten, the note stays owed, and, after the spy's `.mockRestore()`, `finishOwed` rewrites B and clears it | `expect: was` in `rewriteHeld` |
  | T-N6 | 1-4 | `governedSweep.test.ts` | With the chunk's own landing paused (the next `land` call alone), `updatePageBody` on a chunk page stays pending; once released, both edits land and nothing is skipped | the chunk holding its locks through its landing |
  | T-N7 | 1-4 | `governedSweep.test.ts` | Before the sweep, `writer = gate.then(() => rewritePageSerialized(A, (c) => c + 'Z [[P1]]'))`, a link so the index and the tree can tell the write apart, with the chunk's record slowed 50 ms (the first `indexWrittenPages` call carrying files, since each origin takes its own call) so a writer not held behind the chunk would record first; a `readText` hook on A only resolves `gate` (a `lock(A)` started inside the hook would inherit the chunk's held keys and reject as re-entrant). After the sweep and `await writer`, A reads the swept text plus `Z [[P1]]`, and the index and the tree agree with a fresh seed and a fresh `readNexus` | the record running inside the chunk's locks |
  | T-N8 | 1-4 | `governedSweep.test.ts` | Sweeps over `[a, b]` and `[b, a]` started together, with `land` delayed, both finish within a 2 s timeout | the sort in `holding` |
  | T-N9 | 1-4 | `governedSweep.test.ts` | 65 files make two `land` calls, of 64 and 1, and two `upsertPageIndexes` calls; where Task 1-8 lands AFTER B, 17 files make two, of 16 and 1 | `CHUNK` |
  | T-N26 | 1-4 | `governedSweep.test.ts` | A plan whose `raw` throws for A, over `[A, B]`: A is `skipped` and not `refused`, and B is rewritten | the per-file catch in `rewriteHeld` |
  | T-N11 | 1-4 | `Core/Index/indexMaintenance.test.ts` | `sweepGovernedRoots` over two indexed pages, with `machine().stat` spied: each rewritten page is stat'ed once (`rewriteHeld`'s `was`), `readIndexedStat(rel)` equals `fs.stat`'s `(mtimeMs, size)` for each, and a following `seedContentIndex` re-reads none of them | the landing's stat riding the event (without it the index stats each page again, and the count doubles) |
  | T-N22 | 1-4 | `Core/Nexus/adopt.test.ts` | `stampPage` stats its page once (spy `machine().stat`), and the ID it mints matches that stat's time | O-2 |
  | T-N28 | 1-4 | `adopt.test.ts` | `stampMissing` over pages A, B, and C missing their IDs, with `failLandings` failing B: one `land` call, A and C stamped and answered, B left as it was; and two pages listed with one `held` ID no tree holds: one takes it, the other a fresh ID | the stamps' one `rewriteHeld`; `heldBack` |
  | T-N29 | 1-4 | `Core/Tiles/tilesFile.test.ts` | `rewriteTileConnections` over two hosts, the homepage's two linking tiles and a Space's one, makes one `land` call, and a tile whose landing fails counts as `failed` | the tile relink's one `rewriteHeld` across every host |
  | T-N36 | 1-4 | `Core/Files/atomicWrite.test.ts` | `raceLandings` writes exactly the bytes the landing would write: the landing rejects, and a watched event carrying that file's `writtenHash` survives `dropOwnEchoes` | `forgetWrite` in `landOwn` |
  | T-N12 | 1-5 | `Core/Properties/optionOps.test.ts` | With a warm index, an own write adding an unregistered Multi-Select word registers it with no `readText` of that page | the settle reading the index |
  | T-N13 | 1-6 | `Core/Contexts/contextCascade.test.ts` | A Context with 70 tagged pages renamed through the dispatch, with a mid-sweep `settleNow` fired from a gate registered before the rename, makes exactly one `readNexus` call | `inSettleTurn` around the rename |
  | T-N23 | 1-7 | `Core/Files/atomicWrite.test.ts` | `rmwJsonStrict` and `editJsonStrict` over a file `raceLandings` overwrites: each rejects, and the file keeps the outside bytes | `expect` in `rmwLocked` and `editJsonStrict` |
  | T-N24 | 1-7 | `Core/Nexus/page.test.ts` | `updatePageBody` with `raceLandings` overwriting its page answers a failed `Result`, and the page keeps the outside bytes | `expect` in `updatePageBody` |
  | T-N32 | 1-7 | `Core/Contexts/contextsRegistry.test.ts`, `page.test.ts` | `ensureContextsRegistry` on a Nexus with no registry, with `raceLandings` writing one just before the seed lands: it rejects, and the file keeps the outside registry; `createPage` the same way: it rejects, and the page keeps the outside bytes | `null` in `ensureContextsRegistry` and `createPage` |
  | T-N15 | 2-1 | `registryProperty.test.ts` | With the index warm, a page holding both keys refuses the rename, and so does a page the index holds with the old key alone, whose file gained the new key with no event | the clash check reading every holder's file |
  | T-N16 | 2-2 | `optionOps.test.ts` | With the index warm, an option rename rewrites a page whose file took the word with no event since its row was written | the option edit reading every holder's file |
  | T-N17 | 2-3 | `governedSweep.test.ts` | `vi.mock('yaml', …)` counts `parseDocument`: `sweepGovernedRoots` over one page with a property rename's plan, no session open, parses once | R-3's `rekey` |
  | T-N25 | 2-4 | `Core/Nexus/settle.test.ts` | With a session, a tree, and an index, one `atomicWriteFile` of a page makes exactly one `parsePage` call (spy `pageFile.parsePage`) | the index's read handed to the tree's patch |
  | T-N30 | 2-4 | `Core/Nexus/fileEvents.test.ts` | A watched `change` of one page makes one `machine().readText` and one `parsePage` call for it (the rewritten "an ID: 42 page saved twice is read once per save" counts the reads) | the index's read handed to the tree's patch |
  | T-N33 | 2-4 | `fileEvents.test.ts` | With an index and a tree, a watched batch of `Notes/_pagecollection.json` and page A, A's file changed outside: A dated to a whole second and tagged with a title no Space holds: a `readText` hook on the sidecar's read retags A through `rewritePageSerialized`, keeping its time and size, after the batch's commit and before A's patch, and the tree's A holds the own write's tag and agrees with a fresh walk | `unmoved`'s commit sequence in `applyPage` (the `(mtime, size)` comparison turns it red) |
  | T-N37 | 2-4 | `fileEvents.test.ts` | T-N33's batch, with the hook moving A to `Notes/Moved.md` through `relocate` in place of the own write: the tree holds the page at `Notes/Moved.md` alone and agrees with a fresh walk | the move's commit in `moveIndexPaths` |
  | T-N38 | 2-4 | `indexSeed.test.ts` | A batch over A and B, A seeded at a whole-second time, whose `readText` hook on B's read rewrites A at the same size and time and indexes it, as a maintaining writer that keeps a page's time does: A's row holds the writer's value | `unmoved`'s commit sequence at the batch's commit (the `(mtime, size)` comparison turns it red) |
  | T-N39 | 2-4 | `settle.test.ts` | The three cases that hold an event mid-arm do it through `machine().readText` hooks on the path production takes: "an event whose arm resumes…" holds the index's read of B and fails it and the patch's read after it; "a reply while a batch applies…" holds the tree half's read of the Collection sidecar, an event between the two pages; "a stamp never lands on a file…" fails the index's read of the page, so the patch reads it for each event, and holds the second | the owed record emptied in place; the stamp's `batching` gate and `shown`; the stamp's `batching` gate |
  | T-N18 | 2-5 | `contextCascade.test.ts`; `Core/Views/loadValues.test.ts`; `fileEvents.test.ts` | After a Context rename, its owed walk makes no `readText` of the pages the rename rewrote, and `loadValues` still serves each page's kept modified time; and an own event whose patch reads its page again, a write having landed since the index's read, leaves the walk cache that read, so a walk makes no `readText` of it | `rememberParse`; the landed time `pageRecordOf` takes from Task 2-4's read; `rememberParse` taking only the handed read, under its own stat |
  | T-N40 | 2-5 | `Core/Files/walkCache.test.ts` | A cached file replaced whole by rename with a twin of the same time and size re-parses, the original born before the time set on its twin (skipped off macOS, since it relies on APFS moving a file's birth back to an earlier time set on it) | `sameFile` in `cachedParse`'s hit test |
  | T-N41 | FV | `nodeMachine.test.ts` | A `0o600` file landed over while `FileHandle.chmod` rejects with `EPERM` still lands its bytes (skipped under `noModeBits`) | the `chmod`'s catch in the commit |
  | T-N42 | FV | `fileEvents.test.ts` | A page a walk cached at a whole-second time, rewritten in place outside at the same size and time so it keeps its birth: after its watched `change`, the tree holds the new tag and agrees with a fresh walk | `forgetParse` in `applyPage` |
  | T-N43 | FV | `fileEvents.test.ts` | A watched batch of 201 page adds: no patch comes before the first `upsertPageIndexes` call, and 200 come before the second | `applyEvents`' slices |
  | T-N44 | FV | `Core/Trash/restoreScrub.test.ts` | "An edit made after the restore keeps it through Try Again" asserts the restore's owed cascade before the edit, and the edit kept after Try Again | the failed landing it's built on (`trashPage` answering false turns it red) |
  | T-N45 | FV | `Core/Index/indexSeed.test.ts` | A batch over A and B whose read of B unindexes A (deleted): the batch's commit leaves A's row out | `commit` in `unindexed` |
  | T-N46 | FV | `indexSeed.test.ts` | A batch whose read of B removes A's folder by prefix: only the page outside it keeps a row | `commit` in `deindexPath`'s prefix removal |
  | T-N47 | FV | `indexSeed.test.ts` | A batch whose read of B moves A's folder: the rows stand at the new path alone | `commit` in `moveIndexPaths`' folder arm |
  | T-N48 | FV | `Core/Files/atomicWrite.test.ts` | `rewriteHeld` over A and B, with A's `readText` held until B's `stat` begins, finishes within 2 s | the chunk's reads taken together |

  The break-on-purpose rewrites are each task's AFTER, and the ones stated as a rule are stated where they land.
- **Comments:** docstrings in the house register where a neighbor has one, and a comment only where the code would otherwise be misread; an AFTER block's comments are the ones that land. These comments misdescribe the code after the plan and are rewritten or removed by the task named: `atomicWrite.ts`'s "Both text writers report 'change'…" (1-4, into `landOwn`'s docstring), `rewritePreservingTimes`' two comments (1-4, with it), `governedSweep.ts`'s `guarded` comment (1-4, onto `rewriteHeld`'s per-file catch) and `SweepResult.skipped`'s and `sweepGovernedRoots`' docstrings (1-4), `writeEcho.ts`'s header, "the own tap lands each write as an event" (1-2), and its "The app's own event carries the text it wrote…" (1-2), `Desktop/FileWatch/watcher.ts`'s header, "Events settle, then apply one at a time…" (1-2), `settle.ts`'s "Every own write marks the disk moved…" (1-2), `fileEvents.ts`'s header (1-2), `indexSeed.ts`'s "Re-indexes a written page…" (1-2, again 2-4), its seed's "A maintaining writer that landed…" (1-2, into `unmoved`'s docstring), `optionOps.ts`'s `registerHeldOptions` docstring (1-5), `finishOwed.ts`'s header (1-6), `mutate.ts:88`'s turn rule, whose nesting clause moves into `inContextsTurn`'s docstring (1-6), `machine.ts`'s two `writeText`/`writeBytes` docstrings (1-4, into `land`'s), `landBytes`' comment (1-7), `renameFrontmatterKey`'s docstring (2-3, into `rekeyed`'s), `SweepPlan`'s docstring (2-3), `rootValues.ts:47`'s "the twin of `renameFrontmatterKey`" (2-3), and the test comment at `Core/Nexus/mutate.test.ts:1909` naming `atomicWriteBinary` (1-4). One becomes true without an edit: `pageFile.ts:280`'s "one parse serves a sweep's admission, its read of the values, and its merge" (2-3).
- **The Number:** every phase's VERIFY runs `python3 ~/"The Studio/.claude/scripts/view-delta/view-delta.py" <BASELINE>..HEAD --exclude .claude` and records the **Actionable** column in the Net Ledger beside the phase's estimate, additions and removals apart. A phase that lands above its estimate is reported in chat before the next phase opens, with what the increase buys.
- **Execution:** the plan runs end to end through `c/plan-execution`, headlessly and overnight once Nathan ratifies it, and no step waits on Nathan. An ambiguity is taken at its simplest reading and recorded under *§Deviations*; anything that needs Nathan's word is recorded there for the final report. Each task goes to an `execution-agent` (`opus-medium`) informed of *§Context* and *§Overview*, which applies the task's AFTER as written and reports insights, concerns, and suggestions rather than diverging; the orchestrator checks its result against the task's AFTER and VERIFY. Every phase ends with its review checkpoint: two read-only agents, one under `code-simplification` and one under `adversarial-review`, each weighing the phase against the Mandate and these constraints and reading outward across Core, Desktop, and UIX for twins, duplication, hand-rolling, and odd-ones-out rather than at the diff alone, with no implementation running meanwhile; the orchestrator reconciles both before the next phase opens. A `PushNotification` of one line under 200 characters goes out at each phase's end, on any blocker, and at the end. After any compaction, the orchestrator rereads *§Constraints* and `c/plan-execution` from the files before the next task opens, with no stop.
- **Cold Machine:** when the run ends, no process, worktree, benchmark Nexus, scratch userData, test fixture, or temporary script it created remains; *§Final Verification · The Cold-Machine Check* proves it with commands, and the final report states the result. A Pommora instance launched from the main checkout before the run isn't the run's, and it's left alone.
- **Neutral Gate:** the post-implementation neutral reviewer (`fable-high`) gets only the BASELINE head, HEAD, the Mandate, and this intention: *"Pommora's cascades rewrote each file through a pipeline that read it up to four times, parsed it five or six times, waited for the drive to store it one file at a time through a third-party library, and recorded each write in the index and the in-memory tree one file at a time, while a Context rename's owed walk raced its own writes. This work reads and parses each file once, a relink's merge parsing a page once more where it re-spells a frontmatter Link, writes every file through one host primitive that waits for the drive in groups while keeping every file's bytes stored before its name points at them, records each group once, leaves rather than overwrites a file another program changed or created after the app read it, pays a rename's walk once, and removes the per-file steps the index or the write already answered, with nothing left over."* It answers, without hedging, whether the result holds to every principle under **Mandate**, and what it would correct. Every phase is written so that review passes.

#### Process Overview

- [x] **Phase 1** — W-1 · One Landing
  - [x] Task 1-1 · One stat-or-null
  - [x] Task 1-2 · Recording takes a batch
  - [x] Task 1-3 · The host lands a group
  - [x] Task 1-4 · Every write lands through the group, and the library leaves
  - [x] Task 1-5 · The settle reads the index
  - [x] Task 1-6 · A rename pays its walk once
  - [x] Task 1-7 · Every landing after a read checks it
  - [x] Task 1-8 · The chunk and the thread pool, measured together
  - [x] Review Checkpoint
- [x] `[After any compaction: reread §Constraints and c/plan-execution from the files before the next task opens; no stop]`
- [x] **Phase 2** — W-2 · One Read
  - [x] Task 2-1 · The clash check reads only files holding both keys
  - [x] Task 2-2 · An option edit sweeps only pages its value changes
  - [x] Task 2-3 · A text plan rewrites the parse the sweep admitted
  - [x] Task 2-4 · One parse serves the index and the tree
  - [x] Task 2-5 · The owed walk reuses the write's parse
  - [x] Review Checkpoint
- [x] *§Final Verification* over `<BASELINE>..HEAD`
- [x] `[Stop: the final report, per §Final Verification]`

---

### Phase 1 — W-1 · One Landing

**GOAL:** Every write the app makes lands through one seam method that flushes a group of files together and leaves a file changed since its read as its writer left it, a sweep lands its files in chunks (64, or 16 without Task 1-8's thread-pool line) with one index transaction each, the settle stops re-reading what the index holds, and a Context or Space rename pays its owed walk once. `write-file-atomic` and every shape built around a single-file write leave. This phase carries the speedup and the durability rule (Decision F-3); W-2's cuts are a few percent of a rename each, so they're judged apart. The stat consolidation leads, since the new landing code would otherwise repeat it.

#### Task 1-1

One function, `statOrNull`, answers a path's stat or null, beside `machine()` in the seam's own file; the six call sites that spelled `machine().stat(p).catch(() => null)` by hand take it, `pathExists` becomes one line over it, and so does Desktop's `isExistingDir` (`Desktop/Config/appConfig.ts`), which spelled the same check with Node's own `stat` while the rest of its file writes through the seam. `readTextOrNull`, the one try/catch or-null form left beside them, takes the same `.catch` shape; it stays in `atomicWrite.ts`, since the walk cache `statOrNull` serves can't import that file, and `statOrNull`'s docstring says so. Behavior doesn't change, and the existing suite is the proof.

**AFTER**

```Core/Files/atomicWrite.ts diff
@@ imports @@
 import { fail, ok, type Result } from '../Contract/result'
 import { forgetParse } from './walkCache'
 import { noteOwn, recordWrite, reportRename } from './writeEcho'
-import { machine } from '../Platform/machine'
+import { machine, statOrNull } from '../Platform/machine'
 import { basename, dirname, join } from '../Paths/posix'
 import { foldKey } from '../Paths/caseFold'
 import { newId } from '../Nexus/ids'
@@ readTextOrNull @@
   })
 }
 
-export async function readTextOrNull(absPath: string): Promise<string | null> {
-  try {
-    return await machine().readText(absPath)
-  } catch {
-    return null
-  }
-}
+/** `absPath`'s text, or null when it's missing or can't be read. */
+export const readTextOrNull = (absPath: string): Promise<string | null> =>
+  machine()
+    .readText(absPath)
+    .catch(() => null)
 
 // READ PATH ONLY: null conflates absent with unreadable, so a write based on it would clobber a file it merely failed to read.
 export async function readJsonObject(absPath: string): Promise<Record<string, unknown> | null> {
@@ pathExists @@
   return text === null ? null : parseJsonObject(text)
 }
 
-export async function pathExists(p: string): Promise<boolean> {
-  try {
-    return (await machine().stat(p)) !== null
-  } catch {
-    return false
-  }
-}
+export const pathExists = async (p: string): Promise<boolean> => (await statOrNull(p)) !== null
 
 export async function heldName(abs: string): Promise<string | null> {
   const names = (await machine().readDir(dirname(abs))).map((e) => e.name)
```

```Core/Files/walkCache.ts diff
@@ imports @@
-import { type FileStat, machine } from '../Platform/machine'
+import { type FileStat, statOrNull } from '../Platform/machine'
 
 // A hit is refused while the parse happened within this window of the file's own mtime — a same-tick edit on a coarse-mtime volume (exFAT/SMB) is invisible to (mtime, size). git's racy-index rule.
 const RACY_WINDOW_MS = 2000
@@ cachedParse @@
   parse: (stat: FileStat | null) => Promise<T>,
 ): Promise<T> {
   const forgetsAtStart = forgets
-  const s = await machine()
-    .stat(absPath)
-    .catch(() => null)
+  const s = await statOrNull(absPath)
   if (!s) return parse(null)
   const e = entries.get(absPath)
   if (
```

```Core/Index/indexSeed.ts diff
@@ imports @@
   type Relation,
   type PageIndexEntry,
 } from '../Platform/stores'
-import { machine } from '../Platform/machine'
+import { statOrNull } from '../Platform/machine'
 import { readTextOrNull } from '../Files/atomicWrite'
 import { corpusFiles, corpusFilesUnder } from '../Files/walk'
 import { outsideContent } from '../Paths/exclusion'
@@ indexWrittenPage @@
   if (!isMarkdownFile(abs)) return NOTHING_SEEN
   const rel = await relCorpusPath(root, abs)
   if (!rel) return NOTHING_SEEN
-  const st = await machine()
-    .stat(abs)
-    .catch(() => null)
+  const st = await statOrNull(abs)
   if (!st) return { ...NOTHING_SEEN, vanished: unindexed(rel) }
   // An unreadable page keeps its rows, so a sweep the index seeds still reaches the file and counts it.
   const content = text ?? (await readTextOrNull(abs))
@@ seedContentIndex @@
     for (const rel of rels) {
       const abs = join(root, rel)
       const prior = indexed.get(rel)
-      const st = await machine()
-        .stat(abs)
-        .catch(() => null)
+      const st = await statOrNull(abs)
       if (!st) {
         seen.delete(rel)
         continue
```

```Core/Nexus/handlers.ts diff
@@ imports @@
 import { basename, dirname, join } from '../Paths/posix'
 import { retireFileHistory, sweepFileHistory } from '../Pages/fileHistory'
 import { mutateRequest } from './mutateRequest'
-import { machine } from '../Platform/machine'
+import { machine, statOrNull } from '../Platform/machine'
 import { devicePref, readDevicePrefs } from '../Settings/devicePrefs'
 import { registerHeldOptions } from '../Properties/optionOps'
 import { runRepairSweep } from '../Properties/repairSweep'
@@ nexusHandlers @@
   // A renderer-origin path, accepted only if it's an existing directory.
   'nexus:openPath': async (ctx, p: unknown) => {
     if (typeof p !== 'string' || p.length === 0) return ok(false)
-    const stat = await machine()
-      .stat(p)
-      .catch(() => null)
+    const stat = await statOrNull(p)
     if (!stat?.isDirectory) return ok(false)
     await adoptNexus(ctx, p)
     return ok(true)
```

```Core/Nexus/remintLedger.ts diff
@@ imports @@
 import { join } from '../Paths/posix'
 import { CONTEXTS_REGISTRY_REL } from '../Paths/nexusPaths'
-import { machine } from '../Platform/machine'
+import { statOrNull } from '../Platform/machine'
 import { type EntityRecord, recordsOf } from './record'
 import { errText } from '../Contract/result'
 import type { NexusTree, Unreadable } from './tree'
@@ pickEldest @@
     if (prior?.[id]) continue
     const births = await Promise.all(
       claims.map(async (c) => {
-        const st = await machine()
-          .stat(join(root, c.path))
-          .catch(() => null)
+        const st = await statOrNull(join(root, c.path))
         return st?.birthtimeMs ?? Number.POSITIVE_INFINITY
       }),
     )
```

```Core/Platform/machine.ts diff
@@ machine @@
   if (!installed) throw new Error('no platform installed')
   return installed
 }
+
+/** `p`'s stat, or null when it's missing or can't be read; beside the seam rather than `readTextOrNull`, since the walk cache it serves can't import `atomicWrite.ts`, which imports the cache. */
+export const statOrNull = (p: string): Promise<FileStat | null> =>
+  machine()
+    .stat(p)
+    .catch(() => null)
```

```Core/Settings/assetDirValidate.ts diff
@@ imports @@
 import { join, relative } from '../Paths/posix'
-import { machine } from '../Platform/machine'
+import { statOrNull } from '../Platform/machine'
 import { fail, ok, type Result } from '../Contract/result'
 import { isContentName, listEntries } from '../Files/walk'
 import { hiddenFolder } from '../Paths/exclusion'
@@ validateAssetDir @@
   if (!resolved.ok) return resolved
   const refusal = nexusFolderRefusal(rel)
   if (refusal) return fail('invalid-path', refusal)
-  const stats = await machine()
-    .stat(resolved.value)
-    .catch(() => null)
+  const stats = await statOrNull(resolved.value)
   if (!stats) return fail('not-found', 'Path not found.')
   // `realpath` succeeds on a file and a directory listing of one reads as empty, so without this a picked image would be accepted and every asset would quietly stop resolving.
   if (!stats.isDirectory) return fail('invalid-path', 'That is a file, not a folder.')
```

```Desktop/Config/appConfig.ts diff
@@ imports @@
 // Device-level config, not nexus data. Parametrized by the userData dir (not app.getPath) so the logic stays testable without Electron.
 
 import { join } from '@pommora/core/Paths/posix'
-import { stat } from 'node:fs/promises'
+import { statOrNull } from '@pommora/core/Platform/machine'
 import { readJsonObject, rmwJsonStrict } from '@pommora/core/Files/atomicWrite'
 import { DEFAULT_TRASH_MODE, type TrashMode } from '@pommora/core/Trash/trashMode'
 import { TRASH_DIR } from '@pommora/core/Paths/nexusPaths'
@@ isExistingDir @@
   return [path, ...recents.filter((p) => foldKey(p) !== foldKey(path))].slice(0, cap)
 }
 
-async function isExistingDir(p: string): Promise<boolean> {
-  try {
-    return (await stat(p)).isDirectory()
-  } catch {
-    return false
-  }
-}
+const isExistingDir = async (p: string): Promise<boolean> =>
+  (await statOrNull(p))?.isDirectory === true
 
 /** Never prompts — a launch must not block on a modal (headless runs and tests must not hang). */
 export async function resolveRestorePath(config: AppConfig): Promise<string | null> {
```

**VERIFY**

- [x] `git grep -n -A2 "machine()$" -- 'Core/*.ts' 'Desktop/*.ts' ':!*.test.ts' | grep -c "\.stat("` prints `1`, `statOrNull`'s own body; `pathExists` is one line over it; and `git grep -n "node:fs/promises" -- Desktop/Config` prints nothing.
- [x] Run the gates.
- [x] Check for unnecessary code or mistakes.

#### Task 1-2

The own tap takes a batch: `noteOwn` takes any number of events, the settle's `applyOwn` marks the disk moved once per batch and hands the batch on whole, and the index half of `applyEvents` runs once over a batch, indexing its written pages through `indexWrittenPages`, each from the text and stat its event carries or else from its file. `indexWrittenPages` commits as the seed commits its own: `INDEX_BATCH` (200) pages a transaction, so a watched batch of thousands (a Sync pull, a `git pull`) never holds the main thread for one unbounded commit; a row another writer landed while a page's read was in flight is kept, since each page's prior row is read ahead of its read and checked at the commit; and nothing is written once a Nexus switch has moved the database, checked before the last commit as the seed checks it. The seed's two hand-written stat comparisons become `describes`, and its in-flight rule becomes `unmoved`, which the batch shares, so each is spelled once; `reindex` skips an empty batch, so neither commit guards its own. An own event gains `stat`, which the landing supplies from Task 1-4; until then each writer still notes one event and the index stats the page itself, as today.

**PROCEDURE**

1. Apply the AFTER.
2. In `Core/Index/indexSeed.test.ts`, `Core/Index/keyHolders.test.ts`, `Core/Nexus/heldPages.test.ts`, and `Core/Nexus/finishOwed.test.ts`, every `indexWrittenPage(root, X)` becomes `indexWrittenPages(root, [{ absPath: X }])`, and each import names `indexWrittenPages`; the result shape is the same, so no expectation changes. `Desktop/FileWatch/watcher.test.ts:137` spies `indexWrittenPages` in place of `indexWrittenPage`.
3. Write T-N10, T-N31, and T-N34 in the suites *§Constraints · Tests* names; for each, revert the change its row names, watch it go red, and restore it.

**AFTER**

```Core/Files/atomicWrite.test.ts diff
@@ beforeEach @@
   const noted: { ev: FileEvent; text: string | null; mtimeMs: number | null }[] = []
   beforeEach(() => {
     noted.length = 0
-    setOwnTap(async (ev) => {
-      const st = await stat(ev.absPath).catch(() => null)
-      const text = st?.isFile() ? await readFile(ev.absPath, 'utf8') : null
-      noted.push({ ev, text, mtimeMs: st?.mtimeMs ?? null })
+    setOwnTap(async (evs) => {
+      for (const ev of evs) {
+        const st = await stat(ev.absPath).catch(() => null)
+        const text = st?.isFile() ? await readFile(ev.absPath, 'utf8') : null
+        noted.push({ ev, text, mtimeMs: st?.mtimeMs ?? null })
+      }
     })
   })
   afterEach(() => setOwnTap(null))
@@ it 'notes a relocate as a move, with the source free for the tap to lock' @@
     const to = join(dir, 'to.md')
     await writeFile(from, 'moving')
     const locked: string[] = []
-    setOwnTap((ev) =>
-      ev.event === 'move'
-        ? machine().lock(ev.from, async () => {
+    setOwnTap(async (evs) => {
+      for (const ev of evs)
+        if (ev.event === 'move')
+          await machine().lock(ev.from, async () => {
             locked.push(ev.from)
           })
-        : Promise.resolve(),
-    )
+    })
     await relocate(from, to)
     expect(locked).toEqual([from])
     expect(await readFile(to, 'utf8')).toBe('moving')
```

```Core/Files/writeEcho.ts diff
@@ top of file @@
-// The app's writes and the watcher's events pass through here: the echo window tells the app's writes from outside ones, the own tap lands each write as an event (`Core/Nexus/settle.ts` installs it when imported, so a process that writes without importing the settle reaches neither the tree nor the index), and the write and watch taps feed sync.
+// The app's writes and the watcher's events pass through here: the echo window tells the app's writes from outside ones, the own tap lands each landing's files as one batch of events (`Core/Nexus/settle.ts` installs it when imported, so a process that writes without importing the settle reaches neither the tree nor the index), and the write and watch taps feed sync.
 
-import { machine } from '../Platform/machine'
+import { type FileStat, machine } from '../Platform/machine'
 
 // A write recorded with its bytes is an echo while the file still holds them, however late its event arrives, until an event finds other bytes there, so an outside write reaches the watcher even when it restores the app's bytes; a move or rename, recorded without bytes, is an echo for the whole window.
 type Echo = { at: number; hash?: string }
@@ ChangeEvent @@
 
 export type ChangeEvent = 'add' | 'change' | 'unlink' | 'addDir' | 'unlinkDir'
 
-// The app's own event carries the text it wrote, since its writer still holds the file's lock.
+// The app's own event carries the text it wrote and the stat its landing answered, since its writer still holds the file's lock.
 export type Changed = { event: ChangeEvent; absPath: string } & (
-  | { origin: 'watched'; written?: string; text?: never; bodyOnly?: never }
-  | { origin: 'own'; text?: string; bodyOnly?: boolean; written?: never }
+  | { origin: 'watched'; written?: string; text?: never; bodyOnly?: never; stat?: never }
+  | { origin: 'own'; text?: string; bodyOnly?: boolean; stat?: FileStat; written?: never }
 )
 
 export interface Moved {
@@ ownTap @@
 
 export type FileEvent = Changed | Moved
 
-let ownTap: ((ev: FileEvent) => Promise<void>) | null = null
+let ownTap: ((evs: FileEvent[]) => Promise<void>) | null = null
 
-export function setOwnTap(fn: ((ev: FileEvent) => Promise<void>) | null): void {
+export function setOwnTap(fn: ((evs: FileEvent[]) => Promise<void>) | null): void {
   ownTap = fn
 }
 
-export const noteOwn = (ev: FileEvent): Promise<void> => ownTap?.(ev) ?? Promise.resolve()
+export const noteOwn = (...evs: FileEvent[]): Promise<void> => ownTap?.(evs) ?? Promise.resolve()
 
 let watchTap: ((ev: Changed) => void) | null = null
 
```

```Core/Index/indexSeed.ts diff
@@ imports @@
   type Relation,
   type PageIndexEntry,
 } from '../Platform/stores'
-import { statOrNull } from '../Platform/machine'
+import { type FileStat, statOrNull } from '../Platform/machine'
 import { readTextOrNull } from '../Files/atomicWrite'
 import { corpusFiles, corpusFilesUnder } from '../Files/walk'
 import { outsideContent } from '../Paths/exclusion'
@@ NO_ROWS @@
 const NO_ROWS: PageIndexEntry = { relations: [], headings: [], values: {} }
+const INDEX_BATCH = 200
@@ unindexed @@
   return pageOf(rel, stat)
 }
 
+/** Whether the index's recorded `held` describes `st`, the same time and size: the one test by which the index vouches for a page, against its file's stat or against what it held before a read. The index keeps no birth time, so unlike `sameFile` it passes a replacement at the same time and size. */
+const describes = (
+  held: IndexedStat | null | undefined,
+  st: Pick<IndexedStat, 'mtimeMs' | 'size'> | null | undefined,
+): boolean => !!held && !!st && held.mtimeMs === st.mtimeMs && held.size === st.size
+
+/** Whether `path`'s row is still the one `prior` saw ahead of a page's read: a maintaining writer that landed while the read was in flight left a fresher row than the read knew, so the read's row gives way to theirs. */
+const unmoved = (
+  path: string,
+  prior: Pick<IndexedStat, 'mtimeMs' | 'size'> | null | undefined,
+): boolean => {
+  const now = readIndexedStat(path)
+  return !now || describes(now, prior)
+}
+
-// Re-indexes a written page, from `text` when its writer hands it over, and reports what it saw.
-export async function indexWrittenPage(
+// Re-indexes written pages as the seed commits its own, INDEX_BATCH a transaction, a row another writer landed during a page's read kept and nothing written once a switch has moved the database; each from the text and stat its writer hands over or else from its file, a page listed twice as it last stood. Reports what it saw.
+export async function indexWrittenPages(
   root: string,
-  abs: string,
-  text?: string,
+  written: readonly { absPath: string; text?: string; stat?: FileStat }[],
 ): Promise<IndexSeen> {
-  if (!isMarkdownFile(abs)) return NOTHING_SEEN
-  const rel = await relCorpusPath(root, abs)
-  if (!rel) return NOTHING_SEEN
-  const st = await statOrNull(abs)
-  if (!st) return { ...NOTHING_SEEN, vanished: unindexed(rel) }
-  // An unreadable page keeps its rows, so a sweep the index seeds still reaches the file and counts it.
-  const content = text ?? (await readTextOrNull(abs))
-  if (content === null) return NOTHING_SEEN
-  const prior = readIndexedStat(rel)
-  const stat = { mtimeMs: st.mtimeMs, size: st.size }
-  const entry = extractPageIndex(content)
-  const renames = reindex([{ path: rel, entry, stat }])
-  const [now] = idOf(entry)
-  if (prior?.id === now) return { ...NOTHING_SEEN, renames }
-  return { renames, vanished: pageOf(rel, prior), landed: now === undefined ? [] : [now] }
+  const seen: IndexSeen = { renames: [], vanished: [], landed: [] }
+  const db0 = contentIndexStore()
+  const queued: { row: PageIndexRow; prior: IndexedStat | null }[] = []
+  const flush = (): void => {
+    const rows = queued.splice(0).filter(({ row, prior }) => unmoved(row.path, prior))
+    seen.renames.push(...reindex(rows.map(({ row }) => row)))
+    for (const { row, prior } of rows) {
+      const [now] = idOf(row.entry)
+      if (prior?.id === now) continue
+      seen.vanished.push(...pageOf(row.path, prior))
+      if (now !== undefined) seen.landed.push(now)
+    }
+  }
+  for (const { absPath, text, stat } of new Map(written.map((w) => [w.absPath, w])).values()) {
+    const rel = isMarkdownFile(absPath) && (await relCorpusPath(root, absPath))
+    if (!rel) continue
+    // Ahead of the read, so a writer that lands while it's in flight shows at the commit.
+    const prior = readIndexedStat(rel)
+    const st = stat ?? (await statOrNull(absPath))
+    const content = st && (text ?? (await readTextOrNull(absPath)))
+    if (contentIndexStore() !== db0) return NOTHING_SEEN
+    if (!st) {
+      seen.vanished.push(...unindexed(rel))
+      continue
+    }
+    // An unreadable page keeps its rows, so a sweep the index seeds still reaches the file and counts it.
+    if (content === null) continue
+    const entry = extractPageIndex(content)
+    queued.push({ row: { path: rel, entry, stat: { mtimeMs: st.mtimeMs, size: st.size } }, prior })
+    if (queued.length === INDEX_BATCH) flush()
+  }
+  if (contentIndexStore() !== db0) return NOTHING_SEEN
+  flush()
+  return seen
 }
 
 // Writes each page's rows and reports the heading renames they show against the rows they replace: one heading gone and one fresh heading at its ordinal, the outline otherwise unchanged. Anything murkier is left to the muted heading.
 function reindex(rows: readonly PageIndexRow[]): HeadingRenameSeen[] {
+  if (!rows.length) return []
   const held = readHeadings(rows.map(({ path }) => path)) ?? {}
@@ moveIndexPaths @@
     const landed = isMarkdownFile(newRel)
       ? [newRel]
       : await corpusFilesUnder(root, newAbs, await readWatchScope(root))
-    for (const rel of landed) await indexWrittenPage(root, join(root, rel))
+    const pages = landed.map((rel) => ({ absPath: join(root, rel) }))
+    await indexWrittenPages(root, pages)
     return
   }
   if (isMarkdownFile(oldRel)) renamePathIndex(oldRel, newRel)
   else renamePathPrefixIndex(oldRel, newRel)
-  await indexWrittenPage(root, newAbs)
+  await indexWrittenPages(root, [{ absPath: newAbs }])
 }
 
 /** What a seed saw and the pages it re-read, bound to the database it read them into; none when it built a cold index, bailed, or failed. */
@@ NO_REREAD @@
 const NO_REREAD: SeedReread = { ...NOTHING_SEEN, db: null, rels: [] }
 
-const SEED_BATCH = 200
-
 export async function seedContentIndex(root: string): Promise<SeedReread> {
@@ seedContentIndex @@
   const landed: string[] = []
   const flush = (): void => {
-    const rows = queued.splice(0).filter(({ path }) => {
-      // A maintaining writer that landed while this file's read was in flight left a fresher row than the snapshot knew — keep theirs; this read predates their write.
-      const prior = indexed.get(path)
-      const row = readIndexedStat(path)
-      return !row || (row.mtimeMs === prior?.mtimeMs && row.size === prior?.size)
-    })
+    const rows = queued.splice(0).filter(({ path }) => unmoved(path, indexed.get(path)))
     renames.push(...reindex(rows))
     for (const { path, entry } of rows) {
@@ seedContentIndex @@
         seen.delete(rel)
         continue
       }
-      if (prior && prior.mtimeMs === st.mtimeMs && prior.size === st.size) continue
+      if (describes(prior, st)) continue
       const content = await readTextOrNull(abs)
       if (content === null) continue
       if (contentIndexStore() !== db0) return NO_REREAD
       queued.push({
         path: rel,
         entry: extractPageIndex(content),
         stat: { mtimeMs: st.mtimeMs, size: st.size },
       })
-      if (queued.length === SEED_BATCH) flush()
+      if (queued.length === INDEX_BATCH) flush()
```

```Core/Nexus/fileEvents.ts diff
@@ top of file @@
-// Every change to a Nexus file is one event through here, whoever made it: the watcher's batch for an outside edit, the app's own write as it lands. An event maintains the index, then patches the held tree from the one file that changed; one no arm can place owes a walk, and the rest of its batch still applies.
+// Every change to a Nexus file is one event through here, whoever made it: the watcher's batch for an outside edit, the app's own writes as they land. A batch maintains the index in commits of up to `INDEX_BATCH` pages, then each event patches the held tree from the one file that changed; one no arm can place owes a walk, and the rest of its batch still applies.
 
 import { basename, isMarkdownFile, join, relDirname, relative } from '../Paths/posix'
 import { escapes } from '../Paths/pathSafety'
@@ imports @@
   deindexPath,
   type HeadingRenameSeen,
   type IndexSeen,
-  indexWrittenPage,
+  indexWrittenPages,
   moveIndexPaths,
 } from '../Index/indexSeed'
 import type { ConnPage } from '../Connections/pageIndex'
@@ indexEvent @@
 
 // ── The index's half ──
 
-export async function indexEvent(root: string, ev: FileEvent): Promise<void> {
+// Removals and moves first, in order, then every written page in commits of up to `INDEX_BATCH`, each from the text its writer handed over or from its file as it now stands, so it reads right whichever event came first. What the app's own writes show is theirs to have spoken for, so only what an outside one shows is owed.
+export async function indexEvents(root: string, events: readonly FileEvent[]): Promise<void> {
   try {
-    switch (ev.event) {
-      case 'move':
-        await moveIndexPaths(root, ev.from, ev.absPath)
-        return
-      case 'unlink':
-      case 'unlinkDir': {
-        const seen = await deindexPath(root, ev.absPath)
-        if (ev.origin === 'watched') oweSeen(root, seen)
-        return
-      }
-      case 'addDir':
-        return
-      case 'add':
-      case 'change': {
-        const seen = await indexWrittenPage(root, ev.absPath, ev.text)
-        if (ev.origin === 'watched') oweSeen(root, seen)
-        return
-      }
-    }
+    const written: Changed[] = []
+    for (const ev of events) {
+      switch (ev.event) {
+        case 'add':
+        case 'change':
+          written.push(ev)
+          break
+        case 'move':
+          await moveIndexPaths(root, ev.from, ev.absPath)
+          break
+        case 'unlink':
+        case 'unlinkDir': {
+          const seen = await deindexPath(root, ev.absPath)
+          if (ev.origin === 'watched') oweSeen(root, seen)
+          break
+        }
+        case 'addDir':
+          break
       }
     }
+    const outside = written.filter((ev) => ev.origin === 'watched')
+    const own = written.filter((ev) => ev.origin === 'own')
+    oweSeen(root, await indexWrittenPages(root, outside))
+    await indexWrittenPages(root, own)
   } catch (e) {
     console.error('events: the index missed an event and reseeds:', errText(e))
     owedFor(root).corpus = true
@@ applyEvents @@
 ): Promise<FileEvent[]> {
   const owed = owedFor(root)
   const later = new Map<string, FileEvent>()
+  if (!replay) await indexEvents(root, events)
   for (const ev of events) {
-    if (!replay) await indexEvent(root, ev)
     try {
       const applied = await applyOne(root, ev, owed)
       if (applied === 'later') later.set(ev.absPath, ev)
```

```Core/Nexus/settle.test.ts diff
@@ it 'a batch of notes under a folder that just appeared without a sidecar i…' @@
     await mkdir(abs('Bulk'))
     const names = Array.from({ length: 50 }, (_, i) => `n${i}.md`)
     for (const name of names) await writeFile(abs('Bulk', name), `${name}\n`)
-    const indexed = vi.spyOn(indexSeed, 'indexWrittenPage')
+    const indexed = vi.spyOn(indexSeed, 'indexWrittenPages')
     await settleBatch(pusher, root, [
       ev('addDir', 'Bulk'),
       ...names.map((name) => ev('add', 'Bulk', name)),
     ])
     expect(heldTreeOf(root)?.collections.find((c) => c.path === 'Bulk')?.pages).toHaveLength(50)
     const times = new Map<string, number>()
-    for (const [, file] of indexed.mock.calls) times.set(file, (times.get(file) ?? 0) + 1)
+    for (const [, written] of indexed.mock.calls)
+      for (const { absPath } of written) times.set(absPath, (times.get(absPath) ?? 0) + 1)
     for (const name of names) expect(times.get(abs('Bulk', name))).toBeLessThanOrEqual(2)
   })
 
```

```Core/Nexus/settle.ts diff
@@ imports @@
 import { stampMissing } from './adopt'
 import {
   applyEvents,
-  indexEvent,
+  indexEvents,
   nothingOwed,
   oweAgain,
   oweCascade,
@@ applyOwn @@
 
 // ── The app's own events ──
 
-async function applyOwn(ev: FileEvent): Promise<void> {
+async function applyOwn(evs: FileEvent[]): Promise<void> {
   const root = sessionRoot()
-  if (root === null || escapes(relative(root, ev.absPath))) return
-  // Every own write marks the disk moved, since one that leaves the tree as it already stood (a rename's later writes) would otherwise let a walk in flight install what it read before it; the editor's body save is the exception, since it leaves the frontmatter a walk reads as it was.
-  if (ev.event === 'move' || !ev.bodyOnly) diskMoved()
+  if (root === null) return
+  const mine = evs.filter((ev) => !escapes(relative(root, ev.absPath)))
+  // Each landing marks the disk moved once, after its renames and before its record, since one that leaves the tree as it already stood (a rename's later writes) would otherwise let a walk in flight install what it read before it; the editor's body save is the exception, since it leaves the frontmatter a walk reads as it was.
+  if (mine.some((ev) => ev.event === 'move' || !ev.bodyOnly)) diskMoved()
   if (heldTreeOf(root)) {
     // Under a folder awaiting its stamp, that folder's read holds the page if it carries its ID, and otherwise leaves it for its own event or a walk.
-    await applyEvents(root, [ev])
+    await applyEvents(root, mine)
     return
   }
   // No tree to patch: an open stamps before it holds a tree, and the tree it seeds is read after its stamps.
-  if (!adopting()) await indexEvent(root, ev)
+  if (!adopting()) await indexEvents(root, mine)
 }
 
 // The writers reach the settle through a tap rather than an import because the settle's own imports (`adopt`, `fileEvents`, `liveTree`) import `Core/Files`, so a writer importing the settle would close a cycle; it is installed on import, not by a host's call, since it is the same function for the life of the process, where the Sync taps are a session's to set and clear and the commands tap is the host's.
```

```Core/Pages/fileHistory.test.ts diff
@@ it 'notes the editor's own save held, and a restore not' @@
 describe('writeBody', () => {
   it("notes the editor's own save held, and a restore not", async () => {
     const noted: FileEvent[] = []
-    setOwnTap(async (ev) => {
-      noted.push(ev)
+    setOwnTap(async (evs) => {
+      noted.push(...evs)
     })
     try {
       await writeBody(root, file, 'two', 'edit')
```

```Desktop/FileWatch/watcher.ts diff
@@ top of file @@
-// Events settle, then apply one at a time through the path the app's own writes take; what they listed missing is stamped before the batch's settle.
+// Events settle, then apply as one batch through the path the app's own writes take: the index in commits of up to `INDEX_BATCH` pages, then each event's patch; what they listed missing is stamped before the batch's settle.
 
 import chokidar, { type FSWatcher } from 'chokidar'
 import {
```

**VERIFY**

- [x] `git grep -n "indexWrittenPage\b\|indexEvent\b" -- Core Desktop` prints nothing.
- [x] T-N10, T-N31, and T-N34 are green and went red against their rows' reverts.
- [x] Run the gates.
- [x] Check for unnecessary code or mistakes.

#### Task 1-3

The seam gains `land(files)`, `Landing`, and `sameFile`, and all three machines implement it while `writeText`, `writeBytes`, and `utimes` still stand, so the host's landing is proven on its own before Task 1-4 moves every writer onto it and removes them. The host stages each file (resolves a symlink to its target, writes its temp beside the file it lands at, dates it where a time is kept, flushes it) and only then commits each one: it checks `expect` against the file as it stands, restores the file's mode where the umask changed it, closes the handle, and renames the temp over the file, retrying the rename alone on Windows; a failure at either stage removes the temp and costs only that file. An `expect` of null rejects a file that now exists, as one a read found missing. `owed.ts`' private `Landing`, a name a create lands on, becomes `NameLanding`, so the seam's exported type owns the word. The memory machine checks `expect` and keeps a given time, and the disk machine lands through the host's dotted temp name without the flush, the mode, or the symlink's target, which `nodeMachine.test.ts` carries.

**PROCEDURE**

1. Apply the AFTER.
2. T-N1 to T-N4 are in the AFTER; write T-N3's host half, T-N19 to T-N21, T-N27, and T-N35 in `Desktop/Platform/nodeMachine.test.ts`, its `node:fs/promises` mock passing every call through to the real module so the contract cases in the same file run unchanged. `Desktop/vitest.setup.ts` imports the host before the file's mock takes hold, so a case that reads the mock lands through `(await import('./nodeMachine')).nodeMachine` after `vi.resetModules()`.
3. For each, revert the change its row names, watch it go red, and restore it.

**AFTER**

```Core/Platform/machine.ts diff
@@ DirEntry @@
   kind: 'file' | 'dir' | 'other'
 }
 
+/** One file a landing writes: its bytes; the modification time it keeps in place of now, where given; and the stat its read saw, or null where its read found no file, so a file another writer changed or created since is left as that writer left it. */
+export interface Landing {
+  path: string
+  data: string | Uint8Array
+  mtimeMs?: number
+  expect?: FileStat | null
+}
+
+/** Whether `now` is still the file `was` describes: the same time, size, and birth, which a file replaced whole doesn't keep; a `was` of null describes no file. */
+export const sameFile = (was: FileStat | null, now: FileStat | null): boolean =>
+  was === null
+    ? now === null
+    : now !== null &&
+      now.mtimeMs === was.mtimeMs &&
+      now.size === was.size &&
+      now.birthtimeMs === was.birthtimeMs
+
+/** A host's stat of a file as the seam's `FileStat`. */
+export const fileStat = (s: {
+  size: number
+  mtimeMs: number
+  birthtimeMs: number
+  isDirectory(): boolean
+}): FileStat => ({
+  size: s.size,
+  mtimeMs: s.mtimeMs,
+  birthtimeMs: s.birthtimeMs,
+  isDirectory: s.isDirectory(),
+})
+
 export interface Machine {
   /** Absent → null; any other failure throws. */
   readText(p: string): Promise<string | null>
@@ Machine @@
   writeText(p: string, text: string): Promise<void>
   /** Atomic: all-or-nothing. A failed write leaves no partial file, and a concurrent reader sees the old or the new bytes, never a torn mix. */
   writeBytes(p: string, bytes: Uint8Array): Promise<void>
+  /** Writes each file whole and answers each one in order, with the stat its new bytes hold or why they didn't land: a failed file leaves no partial file and costs only itself, a concurrent reader sees the old or the new bytes, never a torn mix, and the new bytes reach the drive before the name points at them. A group is flushed together, each file holding an open handle until it lands, so a caller passes a bounded group, each path once. */
+  land(files: readonly Landing[]): Promise<PromiseSettledResult<FileStat>[]>
   stat(p: string): Promise<FileStat | null>
   /** Absent → []. */
   readDir(p: string): Promise<DirEntry[]>
```

```Core/Nexus/owed.ts diff
@@ Landing @@
 /** A name a create or rename lands on, and the item landing there, whose own owed names never refuse it. */
-type Landing = { owner: Owner; name: string; except?: string }
+type NameLanding = { owner: Owner; name: string; except?: string }
@@ owedName @@
-export function owedName(notes: Notes, { owner, name, except }: Landing): boolean {
+export function owedName(notes: Notes, { owner, name, except }: NameLanding): boolean {
@@ runNoted @@
   change: {
-    lands?: readonly Landing[]
+    lands?: readonly NameLanding[]
     note: (e: Entry | undefined) => Entry
```

```Core/Testing/machineContract.ts diff
@@ describeMachine @@
     let machine: Machine
     let root: string
     const at = (rel: string): string => `${root}/${rel}`
+    const write = async (rel: string, data: string | Uint8Array): Promise<void> => {
+      const [landed] = await machine.land([{ path: at(rel), data }])
+      if (landed.status === 'rejected') throw landed.reason
+    }
 
     beforeEach(async () => {
       ;({ machine, root } = await make())
@@ it 'a landing keeps the time it is given and answers the stat the file the…' @@
       expect((await machine.stat(at('t.txt')))?.mtimeMs).toBe(2_000_000_000_000)
     })
 
+    it('a landing keeps the time it is given and answers the stat the file then holds', async () => {
+      const [landed] = await machine.land([
+        { path: at('t.txt'), data: 'v', mtimeMs: 2_000_000_000_000 },
+      ])
+      expect(landed).toEqual({ status: 'fulfilled', value: await machine.stat(at('t.txt')) })
+      expect((await machine.stat(at('t.txt')))?.mtimeMs).toBe(2_000_000_000_000)
+    })
+
+    it('rejects a file changed since its expected stat and lands the rest of its group', async () => {
+      await write('a.md', 'read')
+      const was = await machine.stat(at('a.md'))
+      await write('a.md', 'outside, longer')
+      const [a, b] = await machine.land([
+        { path: at('a.md'), data: 'mine', expect: was },
+        { path: at('b.md'), data: 'other' },
+      ])
+      expect(a.status).toBe('rejected')
+      expect(b.status).toBe('fulfilled')
+      expect(await machine.readText(at('a.md'))).toBe('outside, longer')
+      expect(await machine.readText(at('b.md'))).toBe('other')
+    })
+
+    it('rejects a file removed since its expected stat, or created since a read found none', async () => {
+      await write('gone.md', 'read')
+      const was = await machine.stat(at('gone.md'))
+      await machine.remove(at('gone.md'))
+      await write('new.md', 'outside')
+      const [gone, created] = await machine.land([
+        { path: at('gone.md'), data: 'mine', expect: was },
+        { path: at('new.md'), data: 'mine', expect: null },
+      ])
+      expect(gone.status).toBe('rejected')
+      expect(created.status).toBe('rejected')
+      expect(await machine.stat(at('gone.md'))).toBeNull()
+      expect(await machine.readText(at('new.md'))).toBe('outside')
+    })
+
+    it('a file that fails to land costs only itself and leaves no temp beside it', async () => {
+      await machine.mkdir(at('dir'))
+      const [dir, b] = await machine.land([
+        { path: at('dir'), data: 'x' },
+        { path: at('b.md'), data: 'y' },
+      ])
+      expect(dir.status).toBe('rejected')
+      expect(b.status).toBe('fulfilled')
+      expect((await machine.readDir(root)).map((e) => e.name).sort()).toEqual(['b.md', 'dir'])
+    })
+
     it('realpath answers the root it was given', async () => {
       expect(await machine.realpath(root)).toBe(root)
     })
```

```Core/Testing/machines.ts diff
@@ imports @@
 import { AsyncLocalStorage } from 'node:async_hooks'
-import { createHash } from 'node:crypto'
+import { createHash, randomBytes } from 'node:crypto'
 import { mkdir, readdir, readFile, rename, rm, stat, utimes, writeFile } from 'node:fs/promises'
-import { dirname } from '../Paths/posix'
+import { dirname, join } from '../Paths/posix'
 import { realpathPosix, windows } from './hostFs'
-import { type DirEntry, type FileStat, type Machine, machine } from '../Platform/machine'
+import {
+  type DirEntry,
+  fileStat,
+  type FileStat,
+  type Landing,
+  type Machine,
+  machine,
+  sameFile,
+} from '../Platform/machine'
 
 const sha256Hex = (input: string | Uint8Array): string =>
   createHash('sha256').update(input).digest('hex')
@@ memoryMachine @@
   const put = (p: string, text: string): void => {
     files.set(p, { text, mtimeMs: ++clock })
   }
+  const entryStat = (e: { text: string; mtimeMs: number }): FileStat => ({
+    size: e.text.length,
+    mtimeMs: e.mtimeMs,
+    birthtimeMs: null,
+    isDirectory: false,
+  })
   const machine: Machine = {
     readText: async (p) => files.get(p)?.text ?? null,
     readBytes: async (p) => {
@@ memoryMachine @@
     },
     writeText: async (p, text) => put(p, text),
     writeBytes: async (p, bytes) => put(p, decoder.decode(bytes)),
+    land: (list) =>
+      Promise.allSettled(
+        list.map(async ({ path, data, mtimeMs, expect }) => {
+          if (dirs.has(path)) throw new Error(`EISDIR ${path}`)
+          if (expect !== undefined && !sameFile(expect, await machine.stat(path)))
+            throw new Error(`${path} changed`)
+          const text = typeof data === 'string' ? data : decoder.decode(data)
+          const e = { text, mtimeMs: mtimeMs ?? ++clock }
+          files.set(path, e)
+          return entryStat(e)
+        }),
+      ),
     stat: async (p): Promise<FileStat | null> => {
       const e = files.get(p)
-      if (e)
-        return { size: e.text.length, mtimeMs: e.mtimeMs, birthtimeMs: null, isDirectory: false }
+      if (e) return entryStat(e)
       return dirs.has(p) ? { size: 0, mtimeMs: 0, birthtimeMs: null, isDirectory: true } : null
     },
     readDir: async (p): Promise<DirEntry[]> => {
@@ atomicWrite @@
   }
 }
 
+// The fast double Core's suites install: the host's temp and rename without its flush, its mode, or its symlink's target, which `nodeMachine.test.ts` carries.
+async function landOnDisk({ path, data, mtimeMs, expect }: Landing): Promise<FileStat> {
+  const was = await absentToNull(stat(path))
+  if (expect !== undefined && !sameFile(expect, was && fileStat(was)))
+    throw new Error(`${path} changed`)
+  const tmp = join(dirname(path), `.landing-${randomBytes(6).toString('hex')}`)
+  try {
+    await writeFile(tmp, data, { flag: 'wx' })
+    if (mtimeMs !== undefined) await utimes(tmp, mtimeMs / 1000, mtimeMs / 1000)
+    await rename(tmp, path)
+  } catch (e) {
+    await rm(tmp, { force: true })
+    throw e
+  }
+  return fileStat(await stat(path))
+}
+
 export function diskMachine(): Machine {
   return {
     readText: (p) => absentToNull(readFile(p, 'utf8')),
     readBytes: (p) => absentToNull(readFile(p)),
     writeText: (p, text) => atomicWrite(p, text),
     writeBytes: (p, bytes) => atomicWrite(p, bytes),
+    land: (list) => Promise.allSettled(list.map(landOnDisk)),
     async stat(p) {
       const s = await absentToNull(stat(p))
-      return (
-        s && {
-          size: s.size,
-          mtimeMs: s.mtimeMs,
-          birthtimeMs: s.birthtimeMs,
-          isDirectory: s.isDirectory(),
-        }
-      )
+      return s && fileStat(s)
     },
     async readDir(p) {
       const entries = await absentToNull(readdir(p, { withFileTypes: true }))
```

```Desktop/Platform/nodeMachine.ts diff
@@ imports @@
-import { createHash } from 'node:crypto'
-import { realpathSync } from 'node:fs'
-import { mkdir, readdir, readFile, realpath, rename, rm, stat, utimes } from 'node:fs/promises'
+import { createHash, randomBytes } from 'node:crypto'
+import { realpathSync } from 'node:fs'
+import {
+  lstat,
+  mkdir,
+  open,
+  readdir,
+  readFile,
+  realpath,
+  rename,
+  rm,
+  stat,
+  utimes,
+} from 'node:fs/promises'
 import { homedir } from 'node:os'
 import writeFileAtomic from 'write-file-atomic'
-import type { DirEntry, Machine } from '@pommora/core/Platform/machine'
+import {
+  type DirEntry,
+  fileStat,
+  type FileStat,
+  type Landing,
+  type Machine,
+  sameFile,
+} from '@pommora/core/Platform/machine'
 import { serializeOnFile } from './fileLock'
 import { isWindows, posixPath } from './hostPath'
-import { basename } from '@pommora/core/Paths/posix'
+import { basename, dirname, join } from '@pommora/core/Paths/posix'
 
 const isAbsent = (e: unknown): boolean => {
   const code = (e as NodeJS.ErrnoException).code
@@ stage @@
 const asBuffer = (bytes: Uint8Array): Buffer =>
   Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength)
 
+// Beside its file, or a symlink's target, which it lands at (a link to nothing is landed over), so the rename stays on one volume; dotted, so the walk, the watcher, and sync never admit it, which is also why a temp a crash or a folder moved mid-flush strands is left where it lies; and fixed-length, so a file named to the length limit still has room for it. Answers the file's commit, which lands it once its group has flushed.
+async function stage({
+  path: named,
+  data,
+  mtimeMs,
+  expect,
+}: Landing): Promise<() => Promise<FileStat>> {
+  const path = (await absentToNull(lstat(named)))?.isSymbolicLink()
+    ? posixPath(await realpath(named).catch(() => named))
+    : named
+  const temp = join(dirname(path), `.landing-${randomBytes(6).toString('hex')}`)
+  const handle = await open(temp, 'wx')
+  const discard = async (e: unknown): Promise<never> => {
+    await handle.close()
+    await rm(temp, { force: true })
+    throw e
+  }
+  try {
+    await handle.writeFile(data)
+    // A volume that refuses the time leaves the file dated now; its bytes still land.
+    if (mtimeMs !== undefined) await handle.utimes(mtimeMs / 1000, mtimeMs / 1000).catch(() => {})
+    await handle.sync()
+  } catch (e) {
+    return discard(e)
+  }
+  return async () => {
+    try {
+      const held = await absentToNull(stat(path))
+      if (expect !== undefined && !sameFile(expect, held && fileStat(held)))
+        throw new Error(`${basename(path)} changed while its write waited.`)
+      const own = await handle.stat()
+      // The temp was created through the umask, so the file keeps the permissions it had.
+      if (held && held.mode !== own.mode) await handle.chmod(held.mode)
+      await handle.close()
+      await outlastHolder(path, () => rename(temp, path))
+      return fileStat(own)
+    } catch (e) {
+      return discard(e)
+    }
+  }
+}
+
 export const nodeMachine: Machine = {
   readText: (p) => absentToNull(readFile(p, 'utf8')),
   readBytes: (p) => absentToNull(readFile(p)),
   writeText: (p, text) => outlastHolder(p, () => writeFileAtomic(p, text, { encoding: 'utf8' })),
   writeBytes: (p, bytes) => outlastHolder(p, () => writeFileAtomic(p, asBuffer(bytes))),
+  // Every temp is written and flushed before any rename, so the group's flushes overlap rather than wait in turn.
+  async land(files) {
+    const staged = await Promise.allSettled(files.map(stage))
+    return Promise.allSettled(
+      staged.map(async (s) => {
+        if (s.status === 'rejected') throw s.reason
+        return s.value()
+      }),
+    )
+  },
   async stat(p) {
     const s = await absentToNull(stat(p))
-    return (
-      s && {
-        size: s.size,
-        mtimeMs: s.mtimeMs,
-        birthtimeMs: s.birthtimeMs,
-        isDirectory: s.isDirectory(),
-      }
-    )
+    return s && fileStat(s)
   },
   async readDir(p) {
     const entries = await absentToNull(readdir(p, { withFileTypes: true }))
```

**VERIFY**

- [x] T-N1 to T-N4 are green on all three machines (`Core/Testing/contracts.test.ts`, `Desktop/Platform/nodeMachine.test.ts`), and T-N3's host half, T-N19 to T-N21, T-N27, and T-N35 are green.
- [x] Run the gates.
- [x] Check for unnecessary code or mistakes.

#### Task 1-4

Every writer moves onto `land`, and what only a single-file write needed leaves. `landOwn`, private to `atomicWrite.ts`, records each file's echo, lands the group, forgets the echo of a file whose landing rejects (`forgetWrite`, the rule `dropOwnEchoes` already applied), so another writer's landing of the same bytes still reaches the index and the tree, drops the walk cache's parse for a file kept at its time, and notes the landed files as one batch with each one's stat; `atomicWriteFile` takes text or bytes (O-1), the event kind following the data, so `atomicWriteBinary` leaves. One held rewrite, `rewriteHeld`, reads, rewrites, lands, and records each chunk of 64 files under the chunk's locks, taken in sorted order, a chunk with nothing due landing nothing: it takes each file's stat ahead of its text, so its landing can keep a page's time and leave a file that changed since as its writer left it, and a file whose rewrite or landing fails costs only itself, as under `guarded`. `guarded` also skipped a file whose lock rejected; the only rejection is re-entrancy, a programming error no sweep caller reaches (Step 3 re-checks it), so a lock's rejection now fails the sweep instead. The sweep is one call to it; `rewritePageSerialized` is a one-file call taking the same `HeldRewrite`, so its rewrite is handed the stat it read (O-2) and `stampPage`, taking a page and its kind alone, passes `stamping` straight through, minting from that stat rather than stat'ing outside the lock; a relink's tile rewrites land every host's tiles through one call per relink; and `stampMissing` lands its page stamps through one call, each stamp landing or failing on its own and an ID the tree held going back to one page alone, so a first adoption flushes a chunk at a time. Sync's `landBytes` becomes one landing. The seam's three old methods, the library, and its types leave; `TEMP_SUFFIX` stays and gains its comment (*§Constraints · Rulings · OP-1*); the test seam `refuseWrites` becomes `failLandings`, a spy on the landing that sees every writer, and `raceLandings` beside it is the outside writer T-N5, T-N23, T-N24, and T-N32 share. `notesWiring.test.ts`'s six module mocks become one spy on the landing, so its three assertions that the notes file isn't written can fail, and `cascade.test.ts`'s two tile cases spy `rewriteHeld` in place of `rewritePageSerialized`.

**PROCEDURE**

1. Apply the AFTER.
2. From the repo root, `npm uninstall write-file-atomic @types/write-file-atomic -w Desktop`. The lockfile's extraneous `"Pommora"` entry (`pommora-react`, a folder that no longer exists) lists the library and its types too, and npm keeps it (`npm prune --package-lock-only` and `npm install --package-lock-only` both leave it), so remove that entry from `package-lock.json` by hand, run `npm install --package-lock-only`, and confirm it leaves the lockfile as it stands; `git grep -c "write-file-atomic" -- package-lock.json` must then print nothing. `signal-exit@4.1.0` leaves with it (`signal-exit@3.0.7` stays, under `proper-lockfile`).
3. Re-read `git grep -n "\.lock(" -- Core Desktop Sync ':!*.test.ts'` and confirm no body holding a page's or a Space sidecar's lock takes another page's or Space sidecar's lock (a property write's walk takes the config files' locks under its page's, which no chunk holds), and that nothing under `renameContextOp`, `renameSpaceOp`, `finishContext`, or `finishSpace` awaits `inTurn`, `payOwedWalk`, or `settleNow` (Task 1-6 relies on it). A body that takes a second page's or sidecar's lock goes to *§Deviations*, since the sweep's deadlock freedom rests on none existing.
4. Write T-N5 to T-N9, T-N11, T-N22, T-N26, T-N28, T-N29, and T-N36 in the suites *§Constraints · Tests* names, each suite restoring its spies in `afterEach` with `vi.restoreAllMocks()`.
5. For each, revert the change its row names, watch it go red, and restore it.
6. The three `notesWiring.test.ts` assertions that the notes file isn't written (in "writes no entry for a rename refused before the commit", "writes no entry for a non-rename edit", and "editOption never writes an entry"): for each, land the notes file once inside the case, watch it go red, and remove it.

**AFTER**

```Core/Archive/archive.test.ts diff
@@ imports @@
   bytesUnder,
   putJson,
   readJsonAt,
-  refuseWrites,
+  failLandings,
   seedNexus,
   tempRoot,
 } from '../Testing/hostFs'
@@ it 'an inner Set’s delete owes the view edit naming it and its sub-Sets' @@
     })
     await reseed()
     const archived = await archive('Notes/Daily', 'set')
-    refuseWrites('editJsonStrict', (file) => file === sidecar)
+    failLandings((file) => file === sidecar)
     await trash(join(archived, 'Daily', 'Sub'), 'set')
     const [owed] = Object.values(await readNotes(root))
     const edit = owed?.kind === 'container' ? owed.edit : undefined
@@ it 'a live page’s delete owes an archived linker whose strip failed, and i…' @@
 
   it('a live page’s delete owes an archived linker whose strip failed, and its record stays whole', async () => {
     const linker = await archive('Notes/Linker.md')
-    refuseWrites('rewritePreservingTimes', (file) => file.startsWith(at(linker)))
+    failLandings((file) => file.startsWith(at(linker)))
     const r = await mutate({ op: 'delete', path: 'Notes/Daily/Beta.md', kind: 'page' })
     expect(r.ok && r.value.cascade).toMatchObject({
       warning: 'Couldn’t update 1 Item.',
```

```Core/Assets/assetWrite.ts diff
@@ imports @@
 import { machine } from '../Platform/machine'
 import { expressibleInLink, fileLinkText } from '../Connections/connections'
 import { ok, fail, type Result } from '../Contract/result'
-import { atomicWriteBinary, pathExists } from '../Files/atomicWrite'
+import { atomicWriteFile, pathExists } from '../Files/atomicWrite'
 import { liveAssetMap, resolveAssetName } from './assetMap'
 import { createDisambiguated, reservedAssetLeaf } from '../Paths/names'
 import { assetsDir } from '../Paths/paths'
@@ writeAssetFile @@
       const file = `${stem}${ext}`
       if (await taken(stem)) return fail('exists', `${file} already exists.`)
       const abs = join(dir, file)
-      await atomicWriteBinary(abs, bytes)
+      await atomicWriteFile(abs, bytes)
       return ok(fileLinkText(file))
     },
     taken,
```

```Core/Files/atomicWrite.test.ts diff
@@ imports @@
 import { dirname, join, basename } from '../Paths/posix'
 import { tempRoot, readJsonAt } from '../Testing/hostFs'
 import {
-  atomicWriteBinary,
   atomicWriteFile,
   editJsonStrict,
   heldName,
@@ imports @@
   setRepairSeed,
   updateNexusConfig,
   relocate,
-  rewritePreservingTimes,
   updateNexusFile,
 } from './atomicWrite'
 import { mintBundle } from '../Bundles/bundle'
@@ it 'notes one change carrying its text, once the file holds it' @@
     await atomicWriteFile(p, 'first')
     expect(noted).toEqual([
       {
-        ev: { event: 'change', absPath: p, origin: 'own', text: 'first', bodyOnly: false },
+        ev: {
+          event: 'change',
+          absPath: p,
+          origin: 'own',
+          text: 'first',
+          stat: expect.objectContaining({ size: 5 }),
+        },
         text: 'first',
         mtimeMs: expect.any(Number),
       },
@@ it 'notes a preserved-time rewrite after the file keeps its old time' @@
     await writeFile(p, 'old')
     const past = new Date('2020-06-01T12:00:00Z')
     await utimes(p, past, past)
-    await rewritePreservingTimes(p, 'new')
+    await rewritePageSerialized(p, () => 'new')
     expect(noted).toHaveLength(1)
-    expect(noted[0].ev).toEqual({ event: 'change', absPath: p, origin: 'own', text: 'new' })
+    expect(noted[0].ev).toEqual({
+      event: 'change',
+      absPath: p,
+      origin: 'own',
+      text: 'new',
+      stat: expect.objectContaining({ mtimeMs: past.getTime() }),
+    })
     expect(noted[0].text).toBe('new')
     expect(Math.floor((noted[0].mtimeMs ?? 0) / 1000)).toBe(Math.floor(past.getTime() / 1000))
   })
 
   it('notes a binary write as an add', async () => {
     const p = join(dir, 'x.png')
-    await atomicWriteBinary(p, new TextEncoder().encode('bytes'))
-    expect(noted.map((n) => n.ev)).toEqual([{ event: 'add', absPath: p, origin: 'own' }])
+    await atomicWriteFile(p, new TextEncoder().encode('bytes'))
+    expect(noted.map((n) => n.ev)).toEqual([
+      { event: 'add', absPath: p, origin: 'own', stat: expect.objectContaining({ size: 5 }) },
+    ])
   })
 
   it('notes a relocate as a move, with the source free for the tap to lock', async () => {
```

```Core/Files/atomicWrite.ts diff
@@ imports @@
 import { stableStringify } from './stableJson'
 import { fail, ok, type Result } from '../Contract/result'
 import { forgetParse } from './walkCache'
-import { noteOwn, recordWrite, reportRename } from './writeEcho'
-import { machine, statOrNull } from '../Platform/machine'
-import { basename, dirname, join } from '../Paths/posix'
+import { type FileEvent, forgetWrite, noteOwn, recordWrite, reportRename } from './writeEcho'
+import { type FileStat, type Landing, machine, statOrNull } from '../Platform/machine'
+import { basename, dirname, isMarkdownFile, join } from '../Paths/posix'
 import { foldKey } from '../Paths/caseFold'
 import { newId } from '../Nexus/ids'
 import { nexusConfig } from '../Paths/paths'
 import { NEXUS_CONFIG_FILES, type NexusConfigFile } from '../Paths/nexusPaths'
 
-async function land(filePath: string, data: string): Promise<void> {
-  recordWrite(filePath, data)
-  await machine().writeText(filePath, data)
+/** Lands the app's own writes as one group: each echo is recorded before its name points at the new bytes and forgotten where its landing rejects, a file kept at its time drops the walk cache's parse that time would otherwise vouch for, and the files that landed are noted as one batch carrying the stat each now holds. Text reports 'change' for a new file too, since the tree and the index take an add and a change alike; bytes are an asset's and report 'add', since the asset arm lists a path only on an add, where a 'change' bumps the version of one already listed. */
+async function landOwn(
+  files: readonly Landing[],
+  bodyOnly?: boolean,
+): Promise<PromiseSettledResult<FileStat>[]> {
+  for (const { path, data } of files) recordWrite(path, data)
+  const landed = await machine().land(files)
+  const events: FileEvent[] = []
+  files.forEach(({ path, data, mtimeMs }, i) => {
+    const at = landed[i]
+    if (at.status === 'rejected') {
+      forgetWrite(path, machine().sha256Hex(data))
+      return
+    }
+    if (mtimeMs !== undefined) forgetParse(path)
+    const text = typeof data === 'string' ? data : undefined
+    const event = text === undefined ? 'add' : 'change'
+    events.push({ event, absPath: path, origin: 'own', text, bodyOnly, stat: at.value })
+  })
+  await noteOwn(...events)
+  return landed
+}
+
+/** A lone file's landing, its failure thrown. */
+function sole([landed]: PromiseSettledResult<FileStat>[]): void {
+  if (landed.status === 'rejected') throw landed.reason
 }
 
-// Both text writers report 'change' for a new file too, since the tree and the index take an add and a change alike.
 export async function atomicWriteFile(
   filePath: string,
-  data: string,
-  bodyOnly = false,
+  data: string | Uint8Array,
+  bodyOnly?: boolean,
 ): Promise<void> {
-  await land(filePath, data)
-  await noteOwn({ event: 'change', absPath: filePath, origin: 'own', text: data, bodyOnly })
-}
-
-export async function rewritePreservingTimes(filePath: string, data: string): Promise<void> {
-  const before = await machine().stat(filePath)
-  if (!before) throw new Error(`${basename(filePath)} vanished before its rewrite.`)
-  await land(filePath, data)
-  // A volume that refuses utimes leaves the page dated now; the write itself already landed.
-  await machine()
-    .utimes(filePath, before.mtimeMs)
-    .catch(() => {})
-  forgetParse(filePath)
-  // After the times settle, so the index records the stat the file keeps.
-  await noteOwn({ event: 'change', absPath: filePath, origin: 'own', text: data })
+  sole(await landOwn([{ path: filePath, data }], bodyOnly))
+}
+
+/** The files a held rewrite holds and lands together, so their flushes overlap. */
+const CHUNK = 64
+
+/** Runs `fn` holding each file's lock, taken in sorted order, so two held rewrites sharing files never each hold a lock the other waits on; nothing a chunk runs takes another lock, and no other writer holds two of the files a chunk can hold. A lock rejects only when re-taken inside its own hold, so a rejection fails the whole rewrite. */
+const holding = (files: readonly string[], fn: () => Promise<void>): Promise<void> =>
+  [...files]
+    .sort()
+    .reduceRight<() => Promise<void>>((inner, file) => () => machine().lock(file, inner), fn)()
+
+/** What a held rewrite did with a file it reached: couldn't read it, was refused by its rewrite, failed in its rewrite or its landing, or rewrote it, as a dry run would have. A file its rewrite left alone is absent. */
+type Rewritten =
+  | { status: 'unread' | 'refused' }
+  | { status: 'failed'; reason: unknown }
+  | { status: 'rewritten'; before: string; after: string }
+
+/** A held rewrite's answer for one file: its next text from the text and the stat its read saw, null to leave it, or undefined to refuse it. */
+export type HeldRewrite = (before: string, file: string, was: FileStat) => string | null | undefined
+
+/** Rewrites `files` a chunk at a time, each chunk held from its read through its record, so no write of the app's lands between, and landed as one group: a page keeps its modification time, and a file changed since its read is left as its writer left it and answered failed; a dry run stops short of the landing. */
+export async function rewriteHeld(
+  files: readonly string[],
+  rewrite: HeldRewrite,
+  dry = false,
+): Promise<Map<string, Rewritten>> {
+  const out = new Map<string, Rewritten>()
+  // A path listed twice would take its own lock twice within one chunk.
+  const unique = [...new Set(files)]
+  for (let at = 0; at < unique.length; at += CHUNK) {
+    const chunk = unique.slice(at, at + CHUNK)
+    await holding(chunk, async () => {
+      const due: { file: string; was: FileStat; before: string; after: string }[] = []
+      for (const file of chunk) {
+        // The stat ahead of the text, so the stat the landing checks never postdates the text it works from.
+        const was = await statOrNull(file)
+        const before = was && (await readTextOrNull(file))
+        if (!was || before === null) {
+          out.set(file, { status: 'unread' })
+          continue
+        }
+        try {
+          const after = rewrite(before, file, was)
+          if (after === undefined) out.set(file, { status: 'refused' })
+          else if (after !== null) due.push({ file, was, before, after })
+        } catch (reason) {
+          // A file whose rewrite throws costs only itself, so the rest of its chunk still lands.
+          out.set(file, { status: 'failed', reason })
+        }
+      }
+      const landed =
+        dry || !due.length
+          ? []
+          : await landOwn(
+              due.map(({ file, was, after }) => ({
+                path: file,
+                data: after,
+                expect: was,
+                mtimeMs: isMarkdownFile(file) ? was.mtimeMs : undefined,
+              })),
+            )
+      due.forEach(({ file, before, after }, i) => {
+        const settled = landed[i]
+        out.set(
+          file,
+          dry || settled.status === 'fulfilled'
+            ? { status: 'rewritten', before, after }
+            : { status: 'failed', reason: settled.reason },
+        )
+      })
+    })
+  }
+  return out
 }
 
 // Sync's landing records no echo and notes no event, so the watcher reports it like any outside write and the tree and index take it from that event.
@@ landBytes @@
   bytes: Uint8Array,
   mtimeMs: number,
 ): Promise<void> {
-  await machine().writeBytes(filePath, bytes)
-  await machine()
-    .utimes(filePath, mtimeMs)
-    .catch(() => {})
+  sole(await machine().land([{ path: filePath, data: bytes, mtimeMs }]))
   forgetParse(filePath)
 }
 
-export async function atomicWriteBinary(filePath: string, data: Uint8Array): Promise<void> {
-  recordWrite(filePath, data)
-  await machine().writeBytes(filePath, data)
-  // 'add', since the asset arm lists a path only on an add, where a 'change' bumps the version of one already listed.
-  await noteOwn({ event: 'add', absPath: filePath, origin: 'own' })
-}
-
 /** Under the SOURCE path's lock, the same key every other write to it takes: a write queued behind the move fails not-found rather than recreating the vacated file as a ghost. `landed` runs before sync hears of the rename, so it pushes under what the landing settled. */
 export async function relocate(
   from: string,
@@ rewritePageSerialized @@
   )
 }
 
-export function rewritePageSerialized(
-  file: string,
-  rewrite: (content: string) => string | null,
-): Promise<boolean> {
+export async function rewritePageSerialized(file: string, rewrite: HeldRewrite): Promise<boolean> {
-  return machine().lock(file, async () => {
-    const content = await readTextOrNull(file)
-    if (content === null) return false
-    const next = rewrite(content)
-    if (next === null) return false
-    await rewritePreservingTimes(file, next)
-    return true
-  })
+  const done = (await rewriteHeld([file], rewrite)).get(file)
+  if (done?.status === 'failed') throw done.reason
+  return done?.status === 'rewritten'
 }
 
 /** `absPath`'s text, or null when it's missing or can't be read. */
```

```Core/Files/writeEcho.ts diff
@@ forgetWrite @@
   tap?.wrote(absPath)
 }
 
+/** Forgets the write recorded at `absPath` while it still holds `hash`, so a later write of those bytes reads as another writer's. */
+export function forgetWrite(absPath: string, hash: string): void {
+  if (recent.get(absPath)?.hash === hash) recent.delete(absPath)
+}
+
 export const reportRename = (absFrom: string, absTo: string): void => tap?.renamed(absFrom, absTo)
@@ dropOwnEchoes @@
       if (e.written === undefined) return true
       const bytes = await machine().readBytes(e.absPath)
       if (bytes !== null && machine().sha256Hex(bytes) === e.written) return false
-      if (recent.get(e.absPath)?.hash === e.written) recent.delete(e.absPath)
+      forgetWrite(e.absPath, e.written)
       return true
     }),
```

```Core/Nexus/adopt.test.ts diff
@@ it 'answers every id it wrote, a folder’s as well as a page’s' @@
       { path: 'Notes/Daily/Day1.md', kind: 'page', reason: 'missing' },
     ])
     expect(landed).toEqual([
-      await idOf('Notes', 'Note1.md'),
       (await coll(join(root, 'Notes')))?.id,
+      await idOf('Notes', 'Note1.md'),
       await idOf('Notes', 'Daily', 'Day1.md'),
     ])
   })
```

```Core/Nexus/adopt.ts diff
@@ imports @@
+  type HeldRewrite,
   readJsonStrict,
   readTextOrNull,
   pathExists,
   relocate,
+  rewriteHeld,
   rewritePageSerialized,
   rmwJsonStrict,
 } from '../Files/atomicWrite'
@@ Stamping @@
   return false
 }
 
+type Stamping = { overForeign?: boolean; held?: string }
+
+/** The rewrite that stamps each page `pages` names, recording the ID each one takes in `ids`: a page missing its ID, or holding a foreign one where its entry says `overForeign`, takes the entry's `held` ID or one minted from its file's age; one that keeps its ID is left. */
+const stamping =
+  (
+    kind: ContentKind,
+    pages: ReadonlyMap<string, Stamping>,
+    ids: Map<string, string>,
+  ): HeldRewrite =>
+  (content, file, { birthtimeMs, mtimeMs }) => {
+    const { overForeign, held }: Stamping = pages.get(file) ?? {}
+    const { admission } = parsePage(content, kind)
+    // The long-term approach is remembering an old ID to re-stamp in such an event; this *must* be done before any official release.
+    const foreign = admission.state === 'unknown' && admission.reason === 'malformed'
+    if (admission.state !== 'missing' && !(overForeign && foreign)) return null
+    // A filesystem with no birthtime reports 0 or null, and mtime is then the honest floor.
+    const id = held ?? contentIdAt(birthtimeMs ? Math.min(birthtimeMs, mtimeMs) : mtimeMs, kind)
+    ids.set(file, id)
+    return mergeFrontmatter(content, { [ID_KEY]: id }, [ID_KEY], splitEnvelope(content).body)
+  }
+
-export async function stampPage(
-  absFile: string,
-  kind: ContentKind,
-  overForeign = false,
-  held?: string,
-): Promise<string | null> {
+export async function stampPage(absFile: string, kind: ContentKind): Promise<string | null> {
-  const st = await machine().stat(absFile)
-  if (!st) return null
-  // A filesystem with no birthtime reports 0 or null, and mtime is then the honest floor.
-  const { birthtimeMs, mtimeMs } = st
-  let id: string | null = null
-  const landed = await rewritePageSerialized(absFile, (content) => {
-    const { admission } = parsePage(content, kind)
-    // The long-term approach is remembering an old ID to re-stamp in such an event; this *must* be done before any official release.
-    const foreign = admission.state === 'unknown' && admission.reason === 'malformed'
-    if (admission.state !== 'missing' && !(overForeign && foreign)) return null
-    id = held ?? contentIdAt(birthtimeMs ? Math.min(birthtimeMs, mtimeMs) : mtimeMs, kind)
-    return mergeFrontmatter(content, { [ID_KEY]: id }, [ID_KEY], splitEnvelope(content).body)
-  })
-  return landed ? id : null
+  const ids = new Map<string, string>()
+  const landed = await rewritePageSerialized(absFile, stamping(kind, new Map(), ids))
+  return landed ? (ids.get(absFile) ?? null) : null
 }
 
 async function pageAdmission(absFile: string) {
@@ stampMissing @@
 /** Answers every id it stamped or found written, a folder's as well as a page's: for the index, a page that arrived without one arrives when its ID lands. */
 export async function stampMissing(root: string, listed: readonly Stamp[] = []): Promise<string[]> {
   const landed: string[] = []
+  const pages = new Map<string, Stamping>()
+  const heldBack = new Set<string>()
   for (const { path, kind, reason, held } of listed) {
     if (reason !== 'missing' && reason !== 'malformed') continue
     const abs = join(root, path)
-    const kept = held && !idHeld(root, held) ? held : undefined
-    let id: string | null = null
-    if (kind === 'page')
-      id = await stampPage(abs, 'page', reason === 'malformed', kept).catch(() => null)
-    else if (reason === 'missing') id = await stampFolder(abs, kind).catch(() => null)
-    if (id !== null) landed.push(id)
+    if (kind === 'page') {
+      if (pages.has(abs)) continue
+      // A held ID goes back to one page alone.
+      const kept = held && !idHeld(root, held) && !heldBack.has(held) ? held : undefined
+      if (kept) heldBack.add(kept)
+      pages.set(abs, { overForeign: reason === 'malformed', held: kept })
+    } else if (reason === 'missing') {
+      const id = await stampFolder(abs, kind).catch(() => null)
+      if (id !== null) landed.push(id)
+    }
   }
+  // The pages land as one held rewrite, so a first adoption's stamps flush a chunk at a time, each landing or failing on its own.
+  const ids = new Map<string, string>()
+  const done = await rewriteHeld([...pages.keys()], stamping('page', pages, ids))
+  for (const [file, id] of ids) if (done.get(file)?.status === 'rewritten') landed.push(id)
   return landed
 }
 
```

```Core/Nexus/cascade.test.ts diff
@@ imports @@
 import { closeSession, openSession } from './session'
 import { createProperty } from '../Properties/registryProperty'
 import { mergeFrontmatter, splitEnvelope, splitFrontmatter } from '../Files/pageFile'
-import { rewritePageSerialized } from '../Files/atomicWrite'
+import { rewriteHeld, rewritePageSerialized } from '../Files/atomicWrite'
 import { installStores, NO_STORES } from '../Platform/stores'
 import { memoryStores } from '../Testing/memoryStores'
 import { seedContentIndex } from '../Index/indexSeed'
@@ imports @@
 
 vi.mock('../Files/atomicWrite', async (importOriginal) => {
   const mod = await importOriginal<typeof import('../Files/atomicWrite')>()
-  return { ...mod, rewritePageSerialized: vi.fn(mod.rewritePageSerialized) }
+  return { ...mod, rewriteHeld: vi.fn(mod.rewriteHeld) }
 })
 
 const sweepSpy = vi.mocked(sweepGovernedRoots)
-const rewriteSpy = vi.mocked(rewritePageSerialized)
+const rewriteSpy = vi.mocked(rewriteHeld)
 const sweptFiles = (): string[] => sweepSpy.mock.calls[0]?.[0] ?? []
 
 let root: string
@@ it 'locks and rewrites no tile file when no tile links a mapped key' @@
     rewriteSpy.mockClear()
     const r = await renameCascade(root, titled('Target', 'Omega'))
     expect(r.hosts).toEqual([])
-    expect(rewriteSpy.mock.calls.map(([file]) => file)).not.toContain(
+    expect(rewriteSpy.mock.calls.flatMap(([files]) => files)).not.toContain(
       tileFilePath(homepageDir(root), tile),
     )
   })
@@ it 'locks and rewrites no tile file when no tile links the heading' @@
     const r = await renameCascade(root, { path: 'Notes/A.md', heading: 'Setup', to: 'Intro' })
     installStores(NO_STORES)
     expect(r.hosts).toEqual([])
-    expect(rewriteSpy.mock.calls.map(([file]) => file)).not.toContain(
+    expect(rewriteSpy.mock.calls.flatMap(([files]) => files)).not.toContain(
       tileFilePath(homepageDir(root), tile),
     )
     expect(await readMarkdownTile(homepageDir(root), tile)).toEqual(ok('see [[A#Other]]'))
```

```Core/Nexus/governedSweep.ts diff
@@ imports @@
-import {
-  atomicWriteFile,
-  jsonText,
-  parseJsonObject,
-  readTextOrNull,
-  rewritePreservingTimes,
-} from '../Files/atomicWrite'
-import { machine } from '../Platform/machine'
+import { jsonText, parseJsonObject, rewriteHeld } from '../Files/atomicWrite'
 import { damagedFolders } from './treePatch'
 import type { NexusTree } from './tree'
 import { isMarkdownFile, join, relative } from '../Paths/posix'
@@ SweepResult @@
 export interface SweepResult {
   /** Each file the sweep wrote, or a dry run would write, with the text it held before and the text the write leaves. */
   touched: Map<string, { before: string; after: string }>
-  /** Each file left as it was that the sweep should have reached: one it couldn't read, and one whose root can't round-trip. */
+  /** Each file left as it was that the sweep should have reached: one it couldn't read, one whose root can't round-trip, one whose rewrite failed, and one that changed outside the app while its chunk waited or whose landing failed. */
   skipped: string[]
   /** The files among `skipped` whose root can't round-trip, which only a fix by hand lets a sweep reach, so they're named once and let go (B-5). */
   refused: string[]
@@ collectionFolders @@
     ...damagedFolders(tree.unreadable).filter((u) => u.kind === 'collection'),
   ].map((c) => join(root, c.path))
 
-// A file whose lock or write throws costs only itself, so the files after it are still reached.
-const guarded = (file: string, missed: string[], body: () => Promise<void>): Promise<void> =>
-  machine()
-    .lock(file, body)
-    .catch(() => void missed.push(file))
 /** A file's text after `plan`, by its kind: null when nothing changes, undefined when its root can't round-trip (an Unknown page, a sidecar nobody can parse), which won't read any better on a retry, so it's left byte-identical. */
 function rewritten(plan: SweepPlan, file: string, content: string): string | null | undefined {
   if (!isMarkdownFile(file)) {
@@ rewritten @@
   return rewriteRoot((root) => plan.raw(root, file), plan.above?.(page.raw, file))(page)
 }
 
-/** Files are absolute, pages and Space sidecars alike. */
+/** Files are absolute, pages and Space sidecars alike, each rewritten as `rewriteHeld` rewrites it. */
 export async function sweepGovernedRoots(
   files: string[],
   plan: SweepPlan,
   dry = false,
 ): Promise<SweepResult> {
   const out: SweepResult = { touched: new Map(), skipped: [], refused: [] }
-
-  for (const file of files) {
-    await guarded(file, out.skipped, async () => {
-      const content = await readTextOrNull(file)
-      if (content === null) {
-        out.skipped.push(file)
-        return
-      }
-      const next = rewritten(plan, file, content)
-      if (next === undefined) {
-        out.skipped.push(file)
-        out.refused.push(file)
-        return
-      }
-      if (next === null) return
-      if (!dry)
-        await (isMarkdownFile(file)
-          ? rewritePreservingTimes(file, next)
-          : atomicWriteFile(file, next))
-      out.touched.set(file, { before: content, after: next })
-    })
+  const done = await rewriteHeld(files, (before, file) => rewritten(plan, file, before), dry)
+  for (const [file, r] of done) {
+    if (r.status === 'rewritten') out.touched.set(file, { before: r.before, after: r.after })
+    else out.skipped.push(file)
+    if (r.status === 'refused') out.refused.push(file)
   }
   return out
 }
```

```Core/Nexus/mutate.test.ts diff
@@ it 'an unreadable source fails and leaves the store untouched' @@
     expect(await bannerOf()).toBeUndefined()
   })
 
-  // `atomicWriteBinary` records its own write and the watcher drops the echo, so a test that rebuilds the map from the directory passes while the app renders blank. The adopted value must resolve against the map main is HOLDING.
+  // `atomicWriteFile` records its own write and the watcher drops the echo, so a test that rebuilds the map from the directory passes while the app renders blank. The adopted value must resolve against the map main is HOLDING.
   it('the adopted value resolves against the map main holds, and that map is owed a push', async () => {
     await withAssetDir()
     await refreshTree(root)
```

```Core/Nexus/settle.test.ts diff
@@ imports @@
 import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
 import { mkdir, open, readFile, rm, utimes, writeFile } from 'node:fs/promises'
 import { join } from '../Paths/posix'
-import { putJson, readJsonAt, refuseWrites, tempRoot } from '../Testing/hostFs'
+import { putJson, readJsonAt, failLandings, tempRoot } from '../Testing/hostFs'
 import { settledMutate } from '../Testing/settledMutate'
 import type { TrashDeps } from '../Trash/discard'
 import { assignProperty } from '../Properties/assignment'
@@ beforeEach @@
 
   beforeEach(() => {
-    const refusing = (file: string): boolean => failing.some((f) => file.endsWith(f))
-    refuseWrites('atomicWriteFile', refusing)
-    refuseWrites('rewritePreservingTimes', refusing)
+    failLandings((file) => failing.some((f) => file.endsWith(f)))
   })
   afterEach(() => {
     failing.length = 0
```

```Core/Paths/exclusion.ts diff
@@ STORE_FILE @@
 /** None is content, and a journal's churn must never cost a walk. */
 const STORE_FILE = /\.db(-wal|-shm)?$/
 
+// An atomic writer's transient temp beside its file, `Name.md.<digits>`, refused while that file is its sibling; the app's own temp is dotted, so it never reaches this.
 const TEMP_SUFFIX = /\.\d+$/
 
 export function hiddenName(name: string): boolean {
```

```Core/Platform/machine.test.ts diff
@@ imports @@
   readJsonStrict,
   readTextOrNull,
   rewritePageSerialized,
-  rewritePreservingTimes,
   writeJson,
 } from '../Files/atomicWrite'
 import { memoryMachine, type MemoryFs } from '../Testing/machines'
@@ it 'a sweep rewrite keeps the modification time; a plain write moves it' @@
 
   it('a sweep rewrite keeps the modification time; a plain write moves it', async () => {
     const page = join(ROOT, 'Notes', 'A.md')
-    await rewritePreservingTimes(page, 'swept\n')
+    await rewritePageSerialized(page, () => 'swept\n')
     expect(fs.files.get(page)).toEqual({ text: 'swept\n', mtimeMs: 500 })
     await atomicWriteFile(page, 'edited\n')
     expect(fs.files.get(page)?.mtimeMs).toBeGreaterThan(500)
```

```Core/Platform/machine.ts diff
@@ Machine @@
   /** Absent → null; any other failure throws. */
   readText(p: string): Promise<string | null>
   readBytes(p: string): Promise<Uint8Array | null>
-  /** Atomic: all-or-nothing. A failed write leaves no partial file, and a concurrent reader sees the old or the new bytes, never a torn mix. */
-  writeText(p: string, text: string): Promise<void>
-  /** Atomic: all-or-nothing. A failed write leaves no partial file, and a concurrent reader sees the old or the new bytes, never a torn mix. */
-  writeBytes(p: string, bytes: Uint8Array): Promise<void>
   /** Writes each file whole and answers each one in order, with the stat its new bytes hold or why they didn't land: a failed file leaves no partial file and costs only itself, a concurrent reader sees the old or the new bytes, never a torn mix, and the new bytes reach the drive before the name points at them. A group is flushed together, each file holding an open handle until it lands, so a caller passes a bounded group, each path once. */
   land(files: readonly Landing[]): Promise<PromiseSettledResult<FileStat>[]>
   stat(p: string): Promise<FileStat | null>
@@ Machine @@
   mkdir(p: string): Promise<'created' | 'exists'>
   rename(from: string, to: string): Promise<void>
   remove(p: string): Promise<void>
-  utimes(p: string, mtimeMs: number): Promise<void>
   /** Hosts without one return `p`. */
   realpath(p: string): Promise<string>
   /** Re-taking a key already held inside `fn` rejects rather than deadlocks. */
```

```Core/Properties/notesWiring.test.ts diff
@@ imports @@
 import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
 import { join } from '../Paths/posix'
 import { tempRoot } from '../Testing/hostFs'
-import {
-  atomicWriteFile,
-  editJsonStrict,
-  rewritePageSerialized,
-  rewritePreservingTimes,
-  updateNexusConfig,
-  writeJson,
-} from '../Files/atomicWrite'
-import { nexusConfig } from '../Paths/paths'
-import { NEXUS_CONFIG_FILES, OWED_REL } from '../Paths/nexusPaths'
+import { machine } from '../Platform/machine'
+import { OWED_REL } from '../Paths/nexusPaths'
 import { closeSession, openSession } from '../Nexus/session'
 import { dropLiveTree, refreshTree } from '../Nexus/liveTree'
 import { seedConfigSurfaces, viewOn } from '../Testing/configSurfaces'
@@ imports @@
 import { clearOption, editOption, deleteOption, renameOption } from './optionOps'
 import { readNotes } from '../Nexus/owed'
 
-vi.mock('../Files/atomicWrite', async (importOriginal) => {
-  const mod = await importOriginal<typeof import('../Files/atomicWrite')>()
-  return {
-    ...mod,
-    atomicWriteFile: vi.fn(mod.atomicWriteFile),
-    editJsonStrict: vi.fn(mod.editJsonStrict),
-    writeJson: vi.fn(mod.writeJson),
-    rewritePageSerialized: vi.fn(mod.rewritePageSerialized),
-    rewritePreservingTimes: vi.fn(mod.rewritePreservingTimes),
-    updateNexusConfig: vi.fn(mod.updateNexusConfig),
-  }
-})
-
 let root: string
 const notesFile = (): string => join(root, OWED_REL)
 const abs = (...segs: string[]): string => join(root, ...segs)
@@ observed @@
   )
   await openSession(root)
   observed = []
-  const note = (path: string): void => {
-    observed.push({ path, noted: existsSync(notesFile()) })
-  }
-  const real = await vi.importActual<typeof import('../Files/atomicWrite')>('../Files/atomicWrite')
-  vi.mocked(atomicWriteFile).mockImplementation(async (path, data) => {
-    note(path)
-    return real.atomicWriteFile(path, data)
-  })
-  vi.mocked(writeJson).mockImplementation(async (path, data) => {
-    note(path)
-    return real.writeJson(path, data)
-  })
-  vi.mocked(rewritePageSerialized).mockImplementation(async (path, fn) => {
-    note(path)
-    return real.rewritePageSerialized(path, fn)
-  })
-  vi.mocked(rewritePreservingTimes).mockImplementation(async (path, data) => {
-    note(path)
-    return real.rewritePreservingTimes(path, data)
-  })
-  vi.mocked(editJsonStrict).mockImplementation(async (path, mutate) => {
+  const m = machine()
+  const land = m.land.bind(m)
+  vi.spyOn(m, 'land').mockImplementation(async (files) => {
     const noted = existsSync(notesFile())
-    const outcome = await real.editJsonStrict(path, mutate)
-    if (outcome === 'written') observed.push({ path, noted })
-    return outcome
-  })
-  vi.mocked(updateNexusConfig).mockImplementation(async (at, file, mutate) => {
-    const noted = existsSync(notesFile())
-    let changed = false
-    const r = await real.updateNexusConfig(at, file, (cur) => {
-      const next = mutate(cur)
-      changed = next !== null
-      return next
-    })
-    if (r.ok && changed) observed.push({ path: nexusConfig(at, NEXUS_CONFIG_FILES[file]), noted })
-    return r
+    for (const { path } of files) observed.push({ path, noted })
+    return land(files)
   })
 })
 afterEach(async () => {
-  vi.mocked(atomicWriteFile).mockRestore()
-  vi.mocked(writeJson).mockRestore()
-  vi.mocked(rewritePageSerialized).mockRestore()
-  vi.mocked(rewritePreservingTimes).mockRestore()
-  vi.mocked(editJsonStrict).mockRestore()
-  vi.mocked(updateNexusConfig).mockRestore()
+  vi.restoreAllMocks()
   dropLiveTree()
   closeSession()
   await rm(root, { recursive: true, force: true })
```

```Core/Testing/hostFs.ts diff
@@ imports @@
 import { mkdir, readFile, realpath, writeFile } from 'node:fs/promises'
 import { tmpdir } from 'node:os'
 import { vi } from 'vitest'
-import * as atomicWrite from '../Files/atomicWrite'
 import { listFilesRecursive } from '../Files/walk'
+import { type FileStat, machine } from '../Platform/machine'
 import { contextsDir, nexusConfig, sidecarPath } from '../Paths/paths'
 import { CONTEXTS_REGISTRY_REL, NEXUS_CONFIG_FILES, SPACE_SIDECAR } from '../Paths/nexusPaths'
 import { basename, dirname, join } from '../Paths/posix'
@@ writers @@
     ),
   )
 
-const writers = {
-  atomicWriteFile: atomicWrite.atomicWriteFile,
-  rewritePreservingTimes: atomicWrite.rewritePreservingTimes,
-  editJsonStrict: atomicWrite.editJsonStrict,
+/** Fails each landing `fails` picks, as a disk failing the write, and lands every other file. */
+export const failLandings = (fails: (file: string) => boolean) => {
+  const m = machine()
+  const real = m.land.bind(m)
+  return vi.spyOn(m, 'land').mockImplementation(async (files) => {
+    const landed = await real(files.filter((f) => !fails(f.path)))
+    return files.map(
+      (f): PromiseSettledResult<FileStat> =>
+        fails(f.path) ? { status: 'rejected', reason: new Error('failed') } : landed.shift()!,
+    )
+  })
 }
 
-/** Refuses `name`'s write to each file `refuses` picks, and hands every other file to the real write. */
-export const refuseWrites = (name: keyof typeof writers, refuses: (file: string) => boolean) => {
-  const real = writers[name] as (file: string, ...rest: never[]) => Promise<unknown>
-  return vi
-    .spyOn(atomicWrite, name)
-    .mockImplementation(((file: string, ...rest: never[]) =>
-      refuses(file) ? Promise.reject(new Error('refused')) : real(file, ...rest)) as never)
+/** Overwrites each file `picks` chooses with `outside` just before its landing, as another program writing between the app's read and its landing; `outside` differs in length from what the file holds. */
+export const raceLandings = (picks: (file: string) => boolean, outside: string) => {
+  const m = machine()
+  const real = m.land.bind(m)
+  return vi.spyOn(m, 'land').mockImplementation(async (files) => {
+    for (const f of files) if (picks(f.path)) await writeFile(f.path, outside)
+    return real(files)
+  })
 }
 
 /** A Space the tree holds: its sidecar, and its Context in the Context list when the list doesn't name it. */
```

```Core/Testing/machineContract.ts diff
@@ it 'writes then reads text and bytes' @@
       expect(await machine.readBytes(at('ghost.md'))).toBeNull()
     })
 
-    it('writes then reads text and bytes', async () => {
-      await machine.writeText(at('a.txt'), 'hello')
+    it('lands then reads text and bytes', async () => {
+      await write('a.txt', 'hello')
       expect(await machine.readText(at('a.txt'))).toBe('hello')
-      const bytes = await machine.readBytes(at('a.txt'))
-      expect(bytes && new TextDecoder().decode(bytes)).toBe('hello')
+      await write('b.bin', new TextEncoder().encode('bytes'))
+      const bytes = await machine.readBytes(at('b.bin'))
+      expect(bytes && new TextDecoder().decode(bytes)).toBe('bytes')
     })
 
-    it('writes atomically — a concurrent reader sees the old or the new bytes, never a torn mix', async () => {
+    it('lands atomically — a concurrent reader sees the old or the new bytes, never a torn mix', async () => {
       const p = at('atomic.md')
       const a = 'a'.repeat(64 * 1024)
       const b = 'b'.repeat(64 * 1024)
-      await machine.writeText(p, a)
-      const writes = Array.from({ length: 20 }, (_, i) => machine.writeText(p, i % 2 ? a : b))
+      await write('atomic.md', a)
+      const writes = Array.from({ length: 20 }, (_, i) => write('atomic.md', i % 2 ? a : b))
       const reads = await Promise.all(Array.from({ length: 200 }, () => machine.readText(p)))
       await Promise.all(writes)
       for (const seen of reads) expect(seen === a || seen === b).toBe(true)
     })
 
     it('stats a file and a directory, and an absent path as null', async () => {
-      await machine.writeText(at('a.txt'), 'hello')
+      await write('a.txt', 'hello')
       const s = await machine.stat(at('a.txt'))
       expect(s?.size).toBe(5)
       expect(s?.isDirectory).toBe(false)
@@ it 'lists a directory by kind and an absent one as []' @@
 
     it('lists a directory by kind and an absent one as []', async () => {
       await machine.mkdir(at('sub'))
-      await machine.writeText(at('a.txt'), 'x')
+      await write('a.txt', 'x')
       const entries = (await machine.readDir(root)).sort((a, b) => a.name.localeCompare(b.name))
       expect(entries).toEqual([
         { name: 'a.txt', kind: 'file' },
@@ it 'renames a file' @@
     })
 
     it('renames a file', async () => {
-      await machine.writeText(at('x.txt'), 'v')
+      await write('x.txt', 'v')
       await machine.rename(at('x.txt'), at('y.txt'))
       expect(await machine.readText(at('y.txt'))).toBe('v')
       expect(await machine.readText(at('x.txt'))).toBeNull()
     })
 
     it('removes a file', async () => {
-      await machine.writeText(at('z.txt'), 'v')
+      await write('z.txt', 'v')
       await machine.remove(at('z.txt'))
       expect(await machine.readText(at('z.txt'))).toBeNull()
     })
 
-    it('utimes moves the modification time', async () => {
-      await machine.writeText(at('t.txt'), 'v')
-      await machine.utimes(at('t.txt'), 2_000_000_000_000)
-      expect((await machine.stat(at('t.txt')))?.mtimeMs).toBe(2_000_000_000_000)
-    })
-
     it('a landing keeps the time it is given and answers the stat the file then holds', async () => {
       const [landed] = await machine.land([
         { path: at('t.txt'), data: 'v', mtimeMs: 2_000_000_000_000 },
```

```Core/Testing/machines.ts diff
@@ memoryMachine @@
   let clock = 1000
   const encoder = new TextEncoder()
   const decoder = new TextDecoder()
-  const put = (p: string, text: string): void => {
-    files.set(p, { text, mtimeMs: ++clock })
-  }
   const entryStat = (e: { text: string; mtimeMs: number }): FileStat => ({
     size: e.text.length,
     mtimeMs: e.mtimeMs,
@@ memoryMachine @@
       const e = files.get(p)
       return e ? encoder.encode(e.text) : null
     },
-    writeText: async (p, text) => put(p, text),
-    writeBytes: async (p, bytes) => put(p, decoder.decode(bytes)),
     land: (list) =>
       Promise.allSettled(
         list.map(async ({ path, data, mtimeMs, expect }) => {
@@ memoryMachine @@
       files.delete(p)
       dirs.delete(p)
     },
-    utimes: async (p, mtimeMs) => {
-      const e = files.get(p)
-      if (e) e.mtimeMs = mtimeMs
-    },
     realpath: async (p) => p,
     lock: chainLock(),
     sha256Hex,
@@ atomicWrite @@
   isDirectory: s.isDirectory(),
 })
 
-async function atomicWrite(p: string, data: string | Uint8Array): Promise<void> {
-  const tmp = `${p}.${process.pid}.${Math.random().toString(36).slice(2)}.tmp`
-  try {
-    await writeFile(tmp, data)
-    await rename(tmp, p)
-  } catch (e) {
-    await rm(tmp, { force: true })
-    throw e
-  }
-}
-
 // The fast double Core's suites install: the host's temp and rename without its flush, its mode, or its symlink's target, which `nodeMachine.test.ts` carries.
 async function landOnDisk({ path, data, mtimeMs, expect }: Landing): Promise<FileStat> {
   const was = await absentToNull(stat(path))
@@ diskMachine @@
   return {
     readText: (p) => absentToNull(readFile(p, 'utf8')),
     readBytes: (p) => absentToNull(readFile(p)),
-    writeText: (p, text) => atomicWrite(p, text),
-    writeBytes: (p, bytes) => atomicWrite(p, bytes),
     land: (list) => Promise.allSettled(list.map(landOnDisk)),
     async stat(p) {
       const s = await absentToNull(stat(p))
@@ diskMachine @@
     },
     rename,
     remove: (p) => rm(p, { recursive: true, force: true }),
-    utimes: (p, mtimeMs) => utimes(p, mtimeMs / 1000, mtimeMs / 1000),
     realpath: realpathPosix,
     lock: chainLock(),
     sha256Hex,
```

```Core/Tiles/tilesFile.ts diff
@@ imports @@
   TILE_KINDS,
   type TileDoc,
+  type TileHostRef,
   type TilesChanged,
 } from './tiles'
@@ imports @@
 import type { Json } from '../Files/stableJson'
 import { findContainerById } from '../Nexus/treePatch'
 import { resolveUnderRoot } from '../Paths/pathSafety'
-import { atomicWriteFile, pathExists, rewritePageSerialized } from '../Files/atomicWrite'
+import { atomicWriteFile, pathExists, rewriteHeld } from '../Files/atomicWrite'
 import { linksIn } from '../Connections/scan'
 import { discardFile, type TrashDeps } from '../Trash/discard'
 import { machine } from '../Platform/machine'
@@ rewriteTileConnections @@
 ): Promise<{ hosts: TilesChanged[]; failed: number }> {
   const found = tileHostsOf(root, await liveTreeOf(root))
-  const hosts: TilesChanged[] = []
   let failed = found.unreadable
+  const boards: { host?: TileHostRef; dir: string; ids: string[] }[] = []
   for (const { host, dir } of found.hosts) {
-    const wrote: string[] = []
     const ids = await markdownTileIds(dir)
-    if (!ids) failed++
-    for (const id of ids ?? []) {
-      // The timestamp-preserving path: a rename cascade must not re-date every tile it merely rewrites a link inside.
-      const landed = await rewritePageSerialized(tileFilePath(dir, id), (body) => {
-        const next = rewrite(body)
-        return next === body ? null : next
-      }).catch(() => null)
-      if (landed === null) failed++
-      else if (landed) wrote.push(id)
-    }
-    if (!wrote.length) continue
-    dropTileLinks()
-    if (host) hosts.push({ host, ids: wrote })
+    if (ids) boards.push({ host, dir, ids })
+    else failed++
   }
-  return { hosts, failed }
+  // The timestamp-preserving path: a rename cascade must not re-date every tile it merely rewrites a link inside.
+  const done = await rewriteHeld(
+    boards.flatMap(({ dir, ids }) => ids.map((id) => tileFilePath(dir, id))),
+    (body) => {
+      const next = rewrite(body)
+      return next === body ? null : next
+    },
+  )
+  const hosts: TilesChanged[] = []
+  for (const { host, dir, ids } of boards) {
+    const wrote = ids.filter((id) => done.get(tileFilePath(dir, id))?.status === 'rewritten')
+    if (host && wrote.length) hosts.push({ host, ids: wrote })
+  }
+  const statuses = [...done.values()].map(({ status }) => status)
+  if (statuses.includes('rewritten')) dropTileLinks()
+  return { hosts, failed: failed + statuses.filter((s) => s === 'failed').length }
 }
```

```Core/Trash/restoreScrub.test.ts diff
@@ imports @@
 
 import { chmod, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
 import { splitFrontmatter } from '../Files/pageFile'
-import { join } from '../Paths/posix'
-import { readJsonAt, seedNexus, tempRoot } from '../Testing/hostFs'
+import { isMarkdownFile, join } from '../Paths/posix'
+import { readJsonAt, failLandings, seedNexus, tempRoot } from '../Testing/hostFs'
 import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
 import { dropLiveTree, refreshTree } from '../Nexus/liveTree'
 import { pathExists } from '../Files/atomicWrite'
@@ trashWrites @@
 import { noModeBits } from '../Testing/hostFs'
 import { STATUS_DEF } from '../Testing/definitions'
 
-const trashWrites = vi.hoisted(() => ({ fail: false }))
-vi.mock('../Files/atomicWrite', async (importOriginal) => {
-  const actual = await importOriginal<typeof import('../Files/atomicWrite')>()
-  return {
-    ...actual,
-    rewritePreservingTimes: (file: string, data: string): Promise<void> =>
-      trashWrites.fail && file.includes('/.trash/')
-        ? Promise.reject(new Error('read-only'))
-        : actual.rewritePreservingTimes(file, data),
-  }
-})
+const trashWrites = { fail: false }
 
 const PAGE_A = '01KVGMT8BFP350FZZXAMG1QDVA'
 const PROP = 'prop_01KVGMT8BFP350FZZXAMG1QDVZ'
@@ cycle @@
     `---\nID: ${PAGE_A}\n<Projects>:\n  - Pommora\nPriority: hi\n---\nbody`,
   )
   await openSession(root)
+  failLandings((file) => trashWrites.fail && file.includes('/.trash/') && isMarkdownFile(file))
 })
 
 afterEach(async () => {
+  vi.restoreAllMocks()
   dropLiveTree()
   closeSession()
   await rm(root, { recursive: true, force: true })
```

```Core/Trash/spend.test.ts diff
@@ imports @@
   noModeBits,
   putJson,
   readJsonAt,
-  refuseWrites,
+  failLandings,
   seedNexus,
   seedSpaceSidecar,
   tempRoot,
 } from '../Testing/hostFs'
 import { seedPropertyBundle } from '../Testing/fixtures'
 import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
-import * as atomicWrite from '../Files/atomicWrite'
+import { machine } from '../Platform/machine'
 import { pathExists } from '../Files/atomicWrite'
 import { settledMutate } from '../Testing/settledMutate'
 import { contextsDir, contextsRegistryFile } from '../Paths/paths'
@@ it 'a Set delete records them bundle-wide from the index, reading none of …' @@
   })
 
   it('a Set delete records them bundle-wide from the index, reading none of its pages', async () => {
-    const reads = vi.spyOn(atomicWrite, 'readTextOrNull')
+    const reads = vi.spyOn(machine(), 'readText')
     try {
       const r = await settledMutate(
         root,
@@ describe 'an inner item emptied out of its bundle' @@
       })
       await putJson(sidecar(), { id: 'col-other', views: located(values) })
       await refreshTree(root)
-      const refusal = refuseWrites('editJsonStrict', (file) => file === sidecar())
+      const refusal = failLandings((file) => file === sidecar())
       await settledMutate(root, { op: 'delete', path: 'Notes', kind: 'collection' }, nexusDeps)
       refusal.mockRestore()
       expect((await readJsonAt(sidecar())).views).toEqual(located(values))
@@ it 'disposes only that item, drops its pages’ metadata, takes its carried …' @@
       const taker = join(root, 'Other', 'Taker.md')
       await writeFile(taker, `---\nID: ${PAGE_D}\nRelated: "[[Alpha]]"\n---\ntaker`)
       await refreshTree(root)
-      refuseWrites('rewritePreservingTimes', (file) => file === taker)
+      failLandings((file) => file === taker)
       const handed: string[] = []
       const item = join(bundle, 'Daily', 'Alpha.md')
       const r = await settledMutate(
```

```Core/Trash/trashRecovery.test.ts diff
@@ imports @@
 // Every restoration combination the surface can produce, driven through the same ops the leaf calls, against a real nexus on disk.
 import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises'
 import { join } from '../Paths/posix'
-import { bytesUnder, putJson, readJsonAt, refuseWrites, tempRoot } from '../Testing/hostFs'
+import { bytesUnder, putJson, readJsonAt, failLandings, tempRoot } from '../Testing/hostFs'
 import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
 import { dropLiveTree, refreshTree } from '../Nexus/liveTree'
-import * as atomicWrite from '../Files/atomicWrite'
+import { machine } from '../Platform/machine'
 import { pathExists } from '../Files/atomicWrite'
 import { settledMutate } from '../Testing/settledMutate'
 import { contextsDir, contextsRegistryFile } from '../Paths/paths'
@@ it 'a link parks with the trashed page its path names, and with neither of…' @@
     if (!inPlain || !inJournal) throw new Error('setup failed')
     const bare = { page: BETA_ID, property: 'prop_related', value: '[[Alpha]]' }
     const pathed = { page: BETA_ID, property: 'prop_parent', value: '[[Plain/Alpha]]' }
-    const reads = vi.spyOn(atomicWrite, 'readTextOrNull')
+    const reads = vi.spyOn(machine(), 'readText')
     try {
       await parkLinks(root, [bare, pathed])
       expect(reads.mock.calls.filter(([file]) => file.endsWith('.md'))).toEqual([])
@@ it 'with Restore Links On Deletion off, the values stay removed' @@
     const sidecar = join(root, 'Plain', '_pagecollection.json')
     const views = ['set-daily', 'set-sub'].map(located)
     await writeFile(sidecar, JSON.stringify({ id: 'col-plain', views }))
-    const refusal = refuseWrites('editJsonStrict', (file) => file === sidecar)
+    const refusal = failLandings((file) => file === sidecar)
     await del('Journal/Daily', 'set')
     refusal.mockRestore()
     return { sidecar, views, bundle: await bundleOf('Daily') }
@@ it 'a nested Set pulled out lands with its pages, and carries what was arc…' @@
     [true, false],
   ])('a page pulled while its Set’s delete still owes its strip comes off the strip, and Try Again keeps the linker on its landing (stepped aside %s, linker refused at the pull %s)', async (aside, refusedAtPull) => {
     await linker(gamma, GAMMA_ID, 'Related: "[[Daily/Alpha]]"')
-    const refusal = refuseWrites('rewritePreservingTimes', (file) => file === join(root, gamma))
+    const refusal = failLandings((file) => file === join(root, gamma))
     await del('Journal/Daily', 'set')
     expect(await owed()).toContain('Journal/Daily/Alpha.md')
     if (aside) await page(join('Journal', 'Alpha.md'), ALEPH_ID)
@@ it 'a Set pulled from a trashed Collection keeps its own and its sub-Set’s…' @@
     const sidecar = join(root, 'Plain', '_pagecollection.json')
     const views = ['set-daily', 'set-sub', 'set-weekly'].map(located)
     await writeFile(sidecar, JSON.stringify({ id: 'col-plain', views }))
-    const refusal = refuseWrites('editJsonStrict', (file) => file === sidecar)
+    const refusal = failLandings((file) => file === sidecar)
     await del('Journal', 'collection')
     refusal.mockRestore()
     const entry = Object.values(await readNotes(root)).find((e) => e.kind === 'container')
```

```Desktop/Capture/thumbnails.ts diff
@@ imports @@
 import type { BrowserWindow, NativeImage } from 'electron'
 import { WINDOW_BG } from '@pommora/uix/Theme/colors'
 import type { ThumbRect } from '@pommora/core/Interface/chrome'
-import { atomicWriteBinary } from '@pommora/core/Files/atomicWrite'
+import { atomicWriteFile } from '@pommora/core/Files/atomicWrite'
 import { thumbKey, thumbRel, thumbsRel } from '@pommora/core/Paths/nexusPaths'
 import { assetUrl } from '@pommora/core/Platform/assetScheme'
 
@@ captureThumbnail @@
   const key = thumbKey(navKey)
   const rel = thumbRel(nexusId, key)
   await mkdir(dirname(join(root, rel)), { recursive: true })
-  await atomicWriteBinary(join(root, rel), buf)
+  await atomicWriteFile(join(root, rel), buf)
   return assetUrl(rel)
 }
 
```

```Desktop/Platform/nodeMachine.ts diff
@@ imports @@
 import { createHash, randomBytes } from 'node:crypto'
 import { realpathSync } from 'node:fs'
-import {
-  lstat,
-  mkdir,
-  open,
-  readdir,
-  readFile,
-  realpath,
-  rename,
-  rm,
-  stat,
-  utimes,
-} from 'node:fs/promises'
+import { lstat, mkdir, open, readdir, readFile, realpath, rename, rm, stat } from 'node:fs/promises'
 import { homedir } from 'node:os'
-import writeFileAtomic from 'write-file-atomic'
 import {
   type DirEntry,
   type FileStat,
@@ asBuffer @@
 const entryKind = (e: { isFile(): boolean; isDirectory(): boolean }): DirEntry['kind'] =>
   e.isDirectory() ? 'dir' : e.isFile() ? 'file' : 'other'
 
-const asBuffer = (bytes: Uint8Array): Buffer =>
-  Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength)
-
 // Beside its file, or a symlink's target, which it lands at (a link to nothing is landed over), so the rename stays on one volume; dotted, so the walk, the watcher, and sync never admit it, which is also why a temp a crash or a folder moved mid-flush strands is left where it lies; and fixed-length, so a file named to the length limit still has room for it. Answers the file's commit, which lands it once its group has flushed.
@@ nodeMachine @@
 export const nodeMachine: Machine = {
   readText: (p) => absentToNull(readFile(p, 'utf8')),
   readBytes: (p) => absentToNull(readFile(p)),
-  writeText: (p, text) => outlastHolder(p, () => writeFileAtomic(p, text, { encoding: 'utf8' })),
-  writeBytes: (p, bytes) => outlastHolder(p, () => writeFileAtomic(p, asBuffer(bytes))),
   // Every temp is written and flushed before any rename, so the group's flushes overlap rather than wait in turn.
   async land(files) {
     const staged = await Promise.allSettled(files.map(stage))
@@ nodeMachine @@
   },
   rename: (from, to) => outlastHolder(from, () => rename(from, to)),
   remove: (p) => outlastHolder(p, () => rm(p, { recursive: true, force: true })),
-  utimes: (p, mtimeMs) => utimes(p, mtimeMs / 1000, mtimeMs / 1000),
   realpath: async (p) => posixPath(await realpath(p)),
   lock: serializeOnFile,
   sha256Hex: (input) => createHash('sha256').update(input).digest('hex'),
```

```Desktop/package.json diff
@@ top of file @@
     "package": "electron-vite build && electron-builder"
   },
   "dependencies": {
-    "chokidar": "^5.0.0",
-    "write-file-atomic": "^8.0.0"
+    "chokidar": "^5.0.0"
   },
   "devDependencies": {
     "@pommora/core": "*",
     "@pommora/uix": "*",
     "@types/react": "^19.2.17",
     "@types/react-dom": "^19.2.3",
-    "@types/write-file-atomic": "^4.0.3",
     "electron": "42.4.0",
     "electron-builder": "^26.15.3",
     "electron-vite": "^5.0.0",
```

**VERIFY**

- [x] `git grep -n -w -e writeText -e writeBytes -e rewritePreservingTimes -e atomicWriteBinary -e refuseWrites -e writeFileAtomic -- Core Desktop Sync` prints only `Desktop/main.ts`'s `clipboard.writeText`; `git grep -n "utimes" -- Core Desktop Sync ':!*.test.ts'` prints three lines: `Core/Testing/machines.ts`'s `node:fs/promises` import and `landOnDisk`'s call, and `Desktop/Platform/nodeMachine.ts`'s `handle.utimes`; and `git grep -c "write-file-atomic" -- Desktop/package.json package-lock.json` prints nothing.
- [x] `git diff --stat -- Core/Sync Sync`, before the commit, prints nothing.
- [x] T-N5 to T-N9, T-N11, T-N22, T-N26, T-N28, T-N29, and T-N36 are green, and the three `notesWiring.test.ts` assertions went red against a notes write.
- [x] Run the gates, then `npm run build`.
- [x] Check for unnecessary code or mistakes.

#### Task 1-5

`registerHeldOptions` reads each page's values from its index row, which every event writes ahead of its settle, and reads the file only where the index holds no row, as for a page a rescope just brought into reach; the forced file read for every page a settle hands it leaves. A Space's values are still collected after the pages, so an open registers new words in the order it always has. The rows take no stat check against their files, as the Read Cuts' do (*§Task 2-1*): an open's rows were checked against each file's stat by the seed that just ran, and a settle's were written by the events it settles, so a row that lags an outside edit belongs to a page whose own event has yet to settle and register what it holds. The handlers test that pinned the forced read now pins the rule: a page whose file changed with no event registers what its row holds, and the same page with its row gone registers what its file holds.

**PROCEDURE**

1. Apply the AFTER.
2. Write T-N12 in the suite *§Constraints · Tests* names.
3. Revert the change its row names, watch it go red, and restore it.

**AFTER**

```Core/Nexus/handlers.test.ts diff
@@ imports @@
 import { currentStatus } from '../Sync/Client/status'
 import { putJson, readJsonAt, seedNexus, tempRoot } from '../Testing/hostFs'
 import { memoryStores } from '../Testing/memoryStores'
-import { seedContentIndex } from '../Index/indexSeed'
+import { deindexPath, seedContentIndex } from '../Index/indexSeed'
 import * as indexSeedModule from '../Index/indexSeed'
 import * as refileModule from '../Archive/refile'
 import { jsonText, pathExists } from '../Files/atomicWrite'
@@ it 'the open registers the Multi-Select members its pages hold from the in…' @@
     expect(openStores).toHaveBeenLastCalledWith(root, NEXUS)
   })
 
-  it('the open registers the Multi-Select members its pages hold from the index, and a settle registers from the file it’s handed', async () => {
+  it('the open and a settle register the Multi-Select members each page’s index row holds, and a page with no row from its file', async () => {
     const registry = join(root, '.nexus', 'properties.json')
     await seedNexus(root, {
       defs: [
@@ it 'the open and a settle register the Multi-Select members each page’s in…' @@
     expect(reads).not.toHaveBeenCalled()
     expect(await options()).toEqual(['alpha', 'Ideas'])
     await registerHeldOptions(root, ['Library/Notes.md'])
+    expect(await options()).toEqual(['alpha', 'Ideas'])
+    await deindexPath(root, notes)
+    await registerHeldOptions(root, ['Library/Notes.md'])
     expect(await options()).toEqual(['alpha', 'Ideas', 'Later'])
   })
 
```

```Core/Properties/optionOps.ts diff
@@ unregisteredMembers @@
   })
 }
 
-/** Registers each Multi-Select member the files at `rels` hold beyond their definition — a page, a container's pages, or a Space — or every file's when `rels` is omitted, in one write. It reads under the schema lock, so a cascade is read whole: an open's pages from the index its seed just filled, and a settle's from the files it was handed, which a rescope's reseed has yet to index. */
+/** Registers each Multi-Select member the files at `rels` hold beyond their definition — a page, a container's pages, or a Space — or every file's when `rels` is omitted, in one write. It reads under the schema lock, so a cascade is read whole: each page from its index row, which every event writes ahead of its settle, and from its file where the index holds none, as for a page a rescope just brought into reach. */
 export async function registerHeldOptions(root: string, rels?: readonly string[]): Promise<void> {
   const r = await serializeSchemaOp(root, async (): Promise<Result<null>> => {
     const tree = heldTreeOf(root)
@@ registerHeldOptions @@
       ...tree.collections.map((c) => c.path),
       ...tree.contexts.flatMap((g) => g.spaces.map((s) => s.path)),
     ]
+    const pages = new Map<string, PropertyDefinition[]>()
+    const spaces: [Json, PropertyDefinition[]][] = []
     for (const rel of rels ?? everywhere) {
-      const pages = isMarkdownFile(rel) ? [rel] : null
-      const space = pages ? null : spaceAt(tree, rel)
+      const isPage = isMarkdownFile(rel)
+      const space = isPage ? null : spaceAt(tree, rel)
       const defs = holderSchema(tree, space ?? rel).filter(
         (d) => PROPERTY_TYPES[d.type].registersMembers,
       )
       if (!defs.length) continue
-      const files = pages ?? pagePathsIn(containerAt(tree, rel))
-      const indexed = rels || space ? null : readPageRelations(files)
-      if (space) collect(space.values ?? {}, defs)
-      else if (indexed) for (const { values } of Object.values(indexed.pages)) collect(values, defs)
+      if (space) spaces.push([space.values ?? {}, defs])
       else
-        for (const page of files) {
-          const read = await readPageRecord(join(root, page), page).catch(() => null)
-          if (read?.kind === 'read') collect(read.fm, defs)
-        }
+        for (const file of isPage ? [rel] : pagePathsIn(containerAt(tree, rel)))
+          pages.set(file, defs)
     }
+    const indexed = readPageRelations([...pages.keys()])?.pages
+    for (const [file, defs] of pages) {
+      const row = indexed?.[file]
+      const read = row ? null : await readPageRecord(join(root, file), file).catch(() => null)
+      const values = row?.values ?? (read?.kind === 'read' ? read.fm : null)
+      if (values) collect(values, defs)
+    }
+    // Spaces register after pages, so new words keep collection order.
+    for (const [values, defs] of spaces) collect(values, defs)
     if (!held.size) return ok(null)
     const notes = await readNotes(root)
     return mutateRegistry(root, (registry) => {
```

**VERIFY**

- [x] T-N12 and the rewritten handlers case are green, and the handlers case went red against the old loop.
- [x] Run the gates.
- [x] Check for unnecessary code or mistakes.

#### Task 1-6

The Context and Space renames, and `finishOwed`'s Context and Space pass, run in the settle's turn inside `underContexts`, as a Context delete and a restore already do (`mutate.ts:134,153`), so a settle the watcher queues mid-sweep waits for the turn and the owed walk runs once, after the sweep, where today `runWalk` (`liveTree.ts:103-124`) restarts it each time the sweep's landings move the epoch: one to five walks at the baseline, and 177 restarts once the flush was removed. What HEAD already guarantees stays as it is: the epoch loop keeps a walk from installing what it read before a landing, and a reply's settle already waited for the sweep to stop landing, so the turn adds no wait a reply didn't have. The five sites take that nesting through one helper, `inContextsTurn`, whose docstring carries the ordering rule `mutate.ts:88` stated by hand, and a create that seeds a Context, which spelled the same nesting around `addressed`, hands `addressed` that helper as its turn. The mutate test that staged a walk inside a rename's registry commit pinned the epoch loop's re-read; under the turn that walk can't start until the rename ends, so it now pins the wait.

**PROCEDURE**

1. Apply the AFTER.
2. Write T-N13 in the suite *§Constraints · Tests* names.
3. Revert the change its row names, watch it go red, and restore it.

**AFTER**

```Core/Nexus/finishOwed.ts diff
@@ top of file @@
-// The one finishing pass, at the open and on Try Again: Context entries under the Contexts lock, then Space entries, then property entries under the schema lock, then the content deletes' and moves' entries in the settle's turn, the notes file's own lock innermost and never nested; each entry under a catch that logs it and counts it missed, so one that throws costs only itself and still offers Try Again. Every arm re-derives from the lists as they read now: a name a live entity holds now is skipped and dropped, and an entity gone takes its owed renames with it.
+// The one finishing pass, at the open and on Try Again: Context and then Space entries under the Contexts lock in the settle's turn, then property entries under the schema lock, then the content deletes' and moves' entries in the settle's turn, the notes file's own lock innermost and never nested; each entry under a catch that logs it and counts it missed, so one that throws costs only itself and still offers Try Again. Every arm re-derives from the lists as they read now: a name a live entity holds now is skipped and dropped, and an entity gone takes its owed renames with it.
 
 import { errText } from '../Contract/result'
 import { readRegistry, serializeSchemaOp } from '../Properties/propertiesRegistry'
@@ imports @@
   unlinkContextKey,
   unlinkSpaceValue,
 } from '../Contexts/contextCascade'
-import { inSettleTurn, underContexts } from './settle'
+import { inContextsTurn, inSettleTurn } from './settle'
 import { dropContextOrder } from './reorder'
 import { liveTreeOf, refreshTree } from './liveTree'
 import {
@@ finishOwed @@
       }
     }
   }
-  await underContexts(root, async () => {
+  await inContextsTurn(root, async () => {
     await each('context')
     await each('space')
   })
```

```Core/Nexus/mutate.test.ts diff
@@ it 'a walk that read the disk before a Context rename committed its regist…' @@
     expect('<Projects>' in fm).toBe(false)
   })
 
-  it('a walk that read the disk before a Context rename committed its registry reads it again', async () => {
+  it('a settle queued during a Context rename waits for it, and its walk reads the committed registry', async () => {
     await refreshTree(root)
     const gamma = join(root, '.nexus', 'contexts', 'Projects', 'Gamma')
     await mkdir(gamma)
     await writeFile(join(gamma, '_space.json'), JSON.stringify({ id: newId() }))
-    const signal = (): { promise: Promise<void>; open: () => void } => {
-      let open = (): void => {}
-      const promise = new Promise<void>((resolve) => {
-        open = resolve
-      })
-      return { promise, open }
-    }
-    const atCommit = signal()
-    const walkRead = signal()
-    const committed = signal()
+    let open = (): void => {}
+    const release = new Promise<void>((resolve) => {
+      open = resolve
+    })
+    let atCommit = (): void => {}
+    const committing = new Promise<void>((resolve) => {
+      atCommit = resolve
+    })
     const commit = contextsRegistry.mutateRegistryFile
     vi.spyOn(contextsRegistry, 'mutateRegistryFile').mockImplementation(async (r, fn) => {
-      atCommit.open()
-      await walkRead.promise
-      const out = await commit(r, fn)
-      committed.open()
-      return out
-    })
-    const walk = readNexusModule.readNexus
-    vi.spyOn(readNexusModule, 'readNexus').mockImplementationOnce(async (r) => {
-      const walked = await walk(r)
-      walkRead.open()
-      await committed.promise
-      return walked
+      atCommit()
+      await release
+      return commit(r, fn)
     })
+    const walks = vi.spyOn(readNexusModule, 'readNexus')
     const renaming = settledMutate(
       root,
       { op: 'renameContext', contextId: 'ctxA', newName: 'Zones' },
       nexusDeps,
     )
-    await atCommit.promise
+    await committing
     const batch = settleBatch({ push: () => {}, watch: async () => {} }, root, [
       { event: 'addDir', absPath: gamma, origin: 'watched' },
       { event: 'add', absPath: join(gamma, '_space.json'), origin: 'watched' },
     ])
+    await new Promise((resolve) => setTimeout(resolve, 50))
+    expect(walks).not.toHaveBeenCalled()
+    open()
     expect((await renaming).ok).toBe(true)
     await batch
     vi.restoreAllMocks()
```

```Core/Nexus/mutate.ts diff
@@ imports @@
 import { oweRetry, oweWalk } from './fileEvents'
 import { reachReport } from './configReach'
 import { finishOwed } from './finishOwed'
-import { inSettleTurn, relink, settledIndex, underContexts } from './settle'
+import { inContextsTurn, inSettleTurn, relink, settledIndex, underContexts } from './settle'
 import { pageMoves } from './record'
 import { putBackEntries } from './governedRoot'
 
@@ dispatch @@
 
 async function dispatch(ctx: MutateContext, req: MutateRequest): Promise<MutateReply> {
   const { root, deps } = ctx
-  // A write that moves, adds, sweeps, or removes a page runs in the settle's turn, nested inside `underContexts` rather than around it, since that lock's `finally` takes a turn of its own. One that can move or add a page re-spells by the index's difference across it: a first commit's rename arrives without moving, so a stale link to the name the page was born with never follows it, and a page created under the default name is no arrival, since its first commit is where it arrives.
+  // A write that moves, adds, or removes a page, re-spells its links, or renames a Context or Space runs in the settle's turn. One that can move or add a page re-spells by the index's difference across it: a first commit's rename arrives without moving, so a stale link to the name the page was born with never follows it, and a page created under the default name is no arrival, since its first commit is where it arrives.
   const addressed = (
     req: Extract<MutateRequest, { op: 'createPage' | 'rename' | 'movePage' | 'moveSet' }>,
     fn: () => Promise<MutateReply>,
+    turn: typeof inSettleTurn = inSettleTurn,
   ): Promise<MutateReply> =>
-    inSettleTurn(root, async () => {
+    turn(root, async () => {
       const before = await settledIndex(root)
       const reply = await fn()
       if (!reply.ok) return reply
@@ case 'createPage' @@
   switch (req.op) {
     case 'createPage':
-      return seedsContext(req)
-        ? underContexts(root, () => addressed(req, () => createPageOp(ctx, req)))
-        : addressed(req, () => createPageOp(ctx, req))
+      return addressed(
+        req,
+        () => createPageOp(ctx, req),
+        seedsContext(req) ? inContextsTurn : inSettleTurn,
+      )
 
     case 'createContainer':
@@ case 'delete' @@
 
     case 'delete':
       return req.kind === 'space' || req.kind === 'context'
-        ? underContexts(root, () => inSettleTurn(root, () => deleteOp(ctx, req)))
+        ? inContextsTurn(root, () => deleteOp(ctx, req))
         : inSettleTurn(root, () => deleteOp(ctx, req))
 
     case 'archive':
@@ case 'restore' @@
       }
       return bundleAddressOf(root, resolved.value)?.store.kind === 'archive'
         ? inSettleTurn(root, restore)
-        : underContexts(root, () => inSettleTurn(root, restore))
+        : inContextsTurn(root, restore)
     }
 
     case 'emptyBundle': {
@@ case 'renameContext' @@
       return done(await underContexts(root, () => setSpaceColor(root, req.spaceId, req.color)))
 
     case 'renameContext':
-      return underContexts(root, () => renameContextOp(root, req.contextId, req.newName))
+      return inContextsTurn(root, () => renameContextOp(root, req.contextId, req.newName))
 
     case 'renameSpace':
-      return underContexts(root, () => renameSpaceOp(root, req.spaceId, req.newName))
+      return inContextsTurn(root, () => renameSpaceOp(root, req.spaceId, req.newName))
 
     case 'reorderContexts':
       return reorderContextsOp(ctx, req)
```

```Core/Nexus/settle.ts diff
@@ inSettleTurn @@
     return op()
   })
 
+/** `op` in the settle's turn under the Contexts lock, the turn nested inside the lock rather than around it, since the lock's `finally` takes a turn of its own. */
+export const inContextsTurn = <T>(root: string, op: () => Promise<T>): Promise<T> =>
+  underContexts(root, () => inSettleTurn(root, op))
+
 /** The index once the walk the latest writes may have owed is paid; null when the tree isn't this root's. */
 export async function settledIndex(root: string): Promise<PageIndex | null> {
   await walkWhileOwed(root)
```

**VERIFY**

- [x] T-N13 and the rewritten mutate case are green, and the mutate case went red against the old dispatch.
- [x] Run the gates.
- [x] Check for unnecessary code or mistakes.

#### Task 1-7

Every landing that follows a read of the same file carries the stat that read saw, so the stale-read check reads the same everywhere: the JSON read-modify-write (`rmwLocked`, behind `rmwJsonStrict`, `updateNexusFile`, and every sidecar patch) and `editJsonStrict`, a property value's write (`rewriteRootAt`), a page's body save (`updatePageBody`), a Markdown tile's save (`writeMarkdownTile`), the identity file's two rewrites and its create (`ensureIdentity`), the Contexts registry's seed (`ensureContextsRegistry`), a page's create (`createPage`), a removed tile's file put back (`restoreTile`), and an asset's create (`writeAssetFile`). `atomicWriteFile` takes `{ bodyOnly, expect }` in place of its positional `bodyOnly`, and `writeJson` takes `{ expect }` the same way. A read that found no file passes `null`, which rejects a file created since: a tile's first body, a seeded JSON file, the identity file's create, the registry's seed, and the three creates whose functions checked the name was free, as their own comments promise ("never over the file its id names", `fail('exists')`); a rebuilt JSON file passes `null` too, since its damaged copy has moved aside. Sync's landing is the one exception, and its comment states why.

**PROCEDURE**

1. Apply the AFTER.
2. Write T-N23, T-N24, and T-N32 in the suites *§Constraints · Tests* names.
3. For each, revert the change its row names, watch it go red, and restore it.

**AFTER**

```Core/Assets/assetWrite.ts diff
@@ writeAssetFile @@
       const abs = join(dir, file)
-      await atomicWriteFile(abs, bytes)
+      await atomicWriteFile(abs, bytes, { expect: null })
       return ok(fileLinkText(file))
```

```Core/Contexts/contextsRegistry.ts diff
@@ ensureContextsRegistry @@
   const raw = await readJsonStrict(contextsRegistryFile(root))
   if (raw.ok || raw.error.code !== 'not-found') return
-  await writeJson(contextsRegistryFile(root), seededRegistry(newId))
+  await writeJson(contextsRegistryFile(root), seededRegistry(newId), { expect: null })
 }
```

```Core/Files/atomicWrite.ts diff
@@ atomicWriteFile @@
+/** Lands one file as the app's own write, its failure thrown. A write that follows a read passes as `expect` the stat that read saw, a create whose read found no file passes null, and a write no read preceded passes none, so a file another writer changed or created since its read is left as that writer left it. */
 export async function atomicWriteFile(
   filePath: string,
   data: string | Uint8Array,
-  bodyOnly?: boolean,
+  { bodyOnly, expect }: { bodyOnly?: boolean } & Pick<Landing, 'expect'> = {},
 ): Promise<void> {
-  sole(await landOwn([{ path: filePath, data }], bodyOnly))
+  sole(await landOwn([{ path: filePath, data, expect }], bodyOnly))
 }
 
 /** The files a held rewrite holds and lands together, so their flushes overlap. */
@@ rewriteHeld @@
   return out
 }
 
-// Sync's landing records no echo and notes no event, so the watcher reports it like any outside write and the tree and index take it from that event.
+// Sync's landing records no echo, notes no event, and checks no stat its read saw: an arrival replaces what the file holds by Sync's own rules, which capture what it would lose, so the watcher reports it like any outside write and the tree and index take it from that event.
 export async function landBytes(
   filePath: string,
   bytes: Uint8Array,
@@ writeJson @@
 
 export const jsonText = (value: unknown): string => `${stableStringify(value)}\n`
 
-export async function writeJson(filePath: string, value: unknown): Promise<void> {
-  await atomicWriteFile(filePath, jsonText(value))
+export async function writeJson(
+  filePath: string,
+  value: unknown,
+  options: Pick<Landing, 'expect'> = {},
+): Promise<void> {
+  await atomicWriteFile(filePath, jsonText(value), options)
 }
 
 type StrictRead =
@@ rmwLocked @@
   seedOnAbsent?: () => Record<string, unknown>,
   repair?: (absPath: string) => Promise<Record<string, unknown>>,
 ): Promise<Result<Record<string, unknown>>> {
+  const was = await statOrNull(absPath)
   const read = await readJsonStrictly(absPath)
   let base: Record<string, unknown>
   if (read.kind === 'ok') base = read.value
@@ rmwLocked @@
   // A mutate that finds nothing to change returns null, so a sweep touching a file it doesn't alter neither rewrites nor re-dates it; a repaired file lands regardless, since its damaged copy has moved aside.
   const next = mutate(base) ?? (read.kind === 'corrupt' ? base : null)
   if (next === null) return ok(base)
-  await writeJson(absPath, next)
+  // A rebuilt file's damaged copy has moved aside, so its landing expects no file there, as a seeded one's does.
+  await writeJson(absPath, next, { expect: read.kind === 'corrupt' ? null : was })
   return ok(next)
 }
 
@@ editJsonStrict @@
   mutate: (current: Record<string, unknown>) => Record<string, unknown> | null,
 ): Promise<StrictEdit> {
   return machine().lock(absPath, async () => {
+    const was = await statOrNull(absPath)
     const read = await readJsonStrictly(absPath)
     if (read.kind !== 'ok') return read.kind
     const next = mutate(read.value)
-    if (next !== null) await writeJson(absPath, next)
+    if (next !== null) await writeJson(absPath, next, { expect: was })
     lastRead.set(absPath, next ?? read.value)
     return next === null ? 'unchanged' : 'written'
   })
```

```Core/Nexus/governedRoot.ts diff
@@ imports @@
 import { fail, fault, ok, type Result } from '../Contract/result'
 import { isBlankRaw, landValue, memberKey, namesValue } from '../Files/rootValues'
 import { atomicWriteFile, parseJsonObject } from '../Files/atomicWrite'
-import { machine } from '../Platform/machine'
+import { machine, statOrNull } from '../Platform/machine'
 import {
   type Place,
   splitFrontmatter,
@@ rewriteRootAt @@
   absFile: string,
   rewrite: (page: SweptPage) => string | null,
 ): Promise<Result<null>> {
+  const was = await statOrNull(absFile)
   let content: string | null
   try {
     content = await machine().readText(absFile)
@@ rewriteRootAt @@
   const page = sweepParse(content)
   if (!page) return fault(UNPARSED_FRONTMATTER)
   const next = rewrite(page)
-  if (next !== null) await atomicWriteFile(absFile, next)
+  if (next !== null) await atomicWriteFile(absFile, next, { expect: was })
   return ok(null)
 }
 
```

```Core/Nexus/identity.ts diff
@@ imports @@
 import { capitalize } from '@pommora/uix/Utilities/capitalize'
-import { machine } from '../Platform/machine'
+import { machine, statOrNull } from '../Platform/machine'
 import { errText, valueOr } from '../Contract/result'
 import { newId } from './ids'
 import { readJsonStrict, readKept, writeJson } from '../Files/atomicWrite'
@@ ensureIdentity @@
   root: string,
 ): Promise<{ id: string | null; created: boolean }> {
   const path = nexusConfig(root, NEXUS_CONFIG_FILES.identity)
+  const was = await statOrNull(path)
   const read = await readJsonStrict(path)
   if (!read.ok && read.error.code !== 'not-found') return { id: null, created: false }
   const existing = valueOr(read, null)
   const existingId = existing && asString(existing.id)
   if (existing && existingId) {
     if ('agenda_singletons' in existing) {
-      await writeJson(path, retireAgendaKey(existing)).catch((e) =>
+      await writeJson(path, retireAgendaKey(existing), { expect: was }).catch((e) =>
         console.error('nexus.json retired-key cleanup failed:', errText(e)),
       )
     }
@@ ensureIdentity @@
   const createdAt = new Date().toISOString()
   // An id-less file is a damaged identity, not a new nexus: mint an id over it and seed nothing, or folders its owner deleted would be recreated and every asset keyed to the old id orphaned.
   if (existing) {
-    await writeJson(path, { ...retireAgendaKey(existing), id, createdAt })
+    await writeJson(path, { ...retireAgendaKey(existing), id, createdAt }, { expect: was })
     return { id, created: false }
   }
 
-  await writeJson(path, { id, createdAt })
+  await writeJson(path, { id, createdAt }, { expect: was })
   const agenda_folders = await seedAgenda(root)
+  // This write lands over the app's own create just above, so it checks no stat.
   if (Object.keys(agenda_folders).length) await writeJson(path, { id, createdAt, agenda_folders })
   return { id, created: true }
```

```Core/Nexus/page.ts diff
@@ imports @@
 import { ID_KEY, PAGE_MODELED_KEYS } from './identityMark'
 import { bodyHash, mergeFrontmatter } from '../Files/pageFile'
 import type { Json } from '../Files/stableJson'
-import { machine } from '../Platform/machine'
+import { machine, statOrNull } from '../Platform/machine'
 import { ok, fail, type Result, fault } from '../Contract/result'
 import { atomicWriteFile, pathExists, relocate, targetTaken } from '../Files/atomicWrite'
 import { nameError } from '../Paths/names'
@@ createPage @@
   return machine().lock(file, async () => {
     if (await pathExists(file)) return fail('exists', `"${name}" already exists.`)
-    await atomicWriteFile(file, mergeFrontmatter('', modeled, keys, opts.body ?? ''))
+    await atomicWriteFile(file, mergeFrontmatter('', modeled, keys, opts.body ?? ''), {
+      expect: null,
+    })
     return ok({ path: file })
@@ updatePageBody @@
 ): Promise<Result<PageWrite | { stale: true }>> {
   return machine().lock(absFile, async () => {
     try {
+      const was = await statOrNull(absFile)
       const previous = await machine().readText(absFile)
       if (previous === null) return fail('not-found', 'Page not found.')
       if (baseHash !== undefined && bodyHash(previous) !== baseHash) return ok({ stale: true })
       const written = mergeFrontmatter(previous, {}, [], body)
-      await atomicWriteFile(absFile, written, bodyOnly)
+      await atomicWriteFile(absFile, written, { bodyOnly, expect: was })
       return ok({ previous, written })
     } catch (e) {
       return fault(e)
```

```Core/Tiles/tilesFile.ts diff
@@ imports @@
 import { atomicWriteFile, pathExists, rewriteHeld } from '../Files/atomicWrite'
 import { linksIn } from '../Connections/scan'
 import { discardFile, type TrashDeps } from '../Trash/discard'
-import { machine } from '../Platform/machine'
+import { machine, statOrNull } from '../Platform/machine'
 import { liveTreeOf } from '../Nexus/liveTree'
 import { tileFilePath } from '../Paths/paths'
 import { tileHostsOf } from './tileHosts'
@@ restoreTile @@
     await machine().lock(file, async () => {
-      if (!(await pathExists(file))) await atomicWriteFile(file, body)
+      if (!(await pathExists(file))) await atomicWriteFile(file, body, { expect: null })
     })
@@ writeMarkdownTile @@
 ): Promise<BodyWrite> {
   const file = tileFilePath(dir, tileId)
   return machine().lock(file, async () => {
+    const was = await statOrNull(file)
     const held = await machine().readText(file)
     if (held !== null && machine().sha256Hex(held) !== baseHash) return { stale: true }
-    await atomicWriteFile(file, body, true)
+    await atomicWriteFile(file, body, { bodyOnly: true, expect: was })
     dropTileLinks()
     return { stale: false, hash: machine().sha256Hex(body) }
   })
```

**VERIFY**

- [x] Every `atomicWriteFile(` and `writeJson(` call in `git grep -n "atomicWriteFile(\|writeJson(" -- Core Desktop ':!*.test.ts'` passes `expect`, or is one of these, whose functions read nothing of the file first: `writeRecord`'s record (`Core/Bundles/record.ts`), a new folder's sidecar after its `mkdir` answered `created` (`folderEntity.ts`), a new Space's blank tiles (`contextWrite.ts`), a new tile's body (`addTile`), the thumbnail (`Desktop/Capture/thumbnails.ts`), and `ensureIdentity`'s Agenda write over the file its own create just landed; each is checked by reading its function.
- [x] T-N23, T-N24, and T-N32 are green.
- [x] Run the gates.
- [x] Check for unnecessary code or mistakes.

#### Task 1-8

`CHUNK` and the thread-pool line are one decision. Each `F_FULLFSYNC` holds a libuv pool thread until the drive answers, so a chunk's flushes fill the pool, and every other read or write the app makes, of any file, queues behind them. A probe on this machine's APFS volume, staging temps as `stage` does while a loop of unrelated reads timed itself, measured the longest such read:

| Pool | Chunk | Flush per File | Longest Other Read |
|---|---|---|---|
| 4 | one at a time (today) | 4.0 ms | 0.1-0.4 ms |
| 4 | 64 | 2.1 ms | 105-114 ms |
| 4 | 16 | 2.2-2.3 ms | 16-20 ms |
| 16 | 64 | 1.3-1.4 ms | 28-45 ms |
| 16 | 16 | 2.0 ms | 4 ms |

`UV_THREADPOOL_SIZE=16` buys its per-file gain only at 64 (about 0.8 ms; about 0.25 ms at 16, under the bar below), and at four threads 64 gains about 7% over 16 for a wait five times as long. So the harness measures the line at `CHUNK = 64`, as Task 1-4 lands it: the Medium-0 property rename's median per-file cost with the line must be at least **0.5 ms** below its median without it, half the 1.0 ms the isolated figures predict (about 1.6 ms per file against 2.6 ms for a chunked flush alone), three runs each, since libuv reads the variable once, when its pool first starts, and a bundled import or Electron's own startup may start it first. At the threshold, the line ships and `CHUNK` stays 64 (AFTER A); below it, no line is written and `CHUNK` becomes 16 (AFTER B). Either way, another read or write waits tens of milliseconds behind a chunk, as *§Overview · Race-Only Changes · The Wait* records, and the completion bar holds: about 2.2 ms per file with the line, about 3.1 ms without it.

**PROCEDURE**

1. Work from `.claude/Benchmarks/Reach-In/`, with `REPO` the main checkout and `WORK` the harness's working folder (`REACH_IN_WORK`, left at its default `${TMPDIR}/pommora-reach-in`). Build a baseline-only harness worktree at HEAD, as `setup.sh` builds its first:
   1. `git -C "$REPO" worktree add --detach "$WORK/baseline" HEAD`, then the same `node_modules` and `@pommora` links `setup.sh` makes.
   2. Re-fit `instrumentation.patch` onto HEAD and save it in place, since the Trash plan's re-run needs it at this shape too: its `handlers.ts` hunk applies as it stands, and its `nodeMachine.ts` hunk, which anchored on the `asBuffer` Task 1-4 removes, adds `benchIo` and `counted` as written after `stage` and replaces the method loop after the object with this, which counts `land` by the files it's handed:

      ```ts
      for (const k of ['readText', 'readBytes', 'stat', 'readDir', 'mkdir', 'rename', 'remove'] as const)
        (nodeMachine as any)[k] = counted(k, (nodeMachine as any)[k])
      const landAll = nodeMachine.land
      nodeMachine.land = (files) => {
        benchIo.calls.land = (benchIo.calls.land ?? 0) + files.length
        const trashed = files.filter((f) => f.path.includes('/.trash/')).length
        if (trashed) benchIo.trash.land = (benchIo.trash.land ?? 0) + trashed
        return landAll(files)
      }
      ```

      `profile.mjs` times flushes through callback `fs.fsync`, which `FileHandle.sync()` doesn't call, so its `fsyncMs` reads 0 after Phase 1 and isn't read.
   3. `git -C "$WORK/baseline" apply "$PWD/instrumentation.patch"`, then `npm run build` inside `$WORK/baseline`.
2. Build Medium-0 alone, as `fills.sh` builds it: `mkdir -p "$WORK/nexus" "$WORK/ud-gen"`; from the repo root, `POMMORA_USERDATA=$WORK/ud-gen node .claude/scripts/make-benchmark-nexus.mjs medium` and `mv ~/Benchmark-Medium "$WORK/nexus/"`; then, back in the harness folder, `node augment.mjs "$WORK/nexus/Benchmark-Medium" base` and `node fill.mjs Medium 0`.
3. `node profile.mjs timing renameProperty` three times. Each prints its `settleMs`; the per-file cost is `settleMs / calls.land`, read from `profiles/timing.json`.
4. Add AFTER A's `Desktop/main.ts` line to `$WORK/baseline` alone, rebuild there, and run step 3 three more times.
5. Compare the medians. At 0.5 ms or more, apply AFTER A to the main checkout; below it, apply AFTER B and rewrite T-N9 to its 16-file form (*§Constraints · Tests*). Run the gates and commit, with both medians in the message, and record both on a line beneath the Net Ledger and in the final report.
6. Leave the harness worktree and `Medium-0` for *§Final Verification · The Own Pass*, and delete `profiles/timing.json`.

**AFTER A** (the line ships; `CHUNK` stays 64)

```Core/Files/atomicWrite.ts diff
@@ CHUNK @@
-/** The files a held rewrite holds and lands together, so their flushes overlap. */
+/** The files a held rewrite holds and lands together, so their flushes overlap: each holds one of the host's I/O threads until the drive answers, so the app's other reads and writes wait tens of milliseconds behind a chunk. */
 const CHUNK = 64
```

```Desktop/main.ts diff
@@ after the imports @@
   wheelGuest,
 } from './Web/webGuests'
 
+// A held rewrite flushes a chunk's files at once, and each flush holds a pool thread until the drive answers, so the default four threads would queue every other read and write behind a chunk for about 110 ms; libuv sizes the pool at its first task, which nothing imported above starts.
+process.env.UV_THREADPOOL_SIZE ??= '16'
+
 // FIRST, ahead of anything that could read a path: the name resolves userData, and Electron caches
```

**AFTER B** (no line; `CHUNK` becomes 16)

```Core/Files/atomicWrite.ts diff
@@ CHUNK @@
-/** The files a held rewrite holds and lands together, so their flushes overlap. */
-const CHUNK = 64
+/** The files a held rewrite holds and lands together, so their flushes overlap: each holds one of the host's four pool threads until the drive answers, so 16 keeps the app's other reads and writes waiting about 20 ms behind a chunk rather than about 110, within about 7% of 64's throughput. */
+const CHUNK = 16
```

**VERIFY**

- [x] Both medians are recorded; the line exists in `Desktop/main.ts` and `CHUNK` is 64 exactly when the difference is at least 0.5 ms, and otherwise `CHUNK` is 16 and T-N9 reads its 16-file form.
- [x] `git -C "$REPO" worktree list` shows what it showed at the baseline, plus `$WORK/baseline`.
- [x] Run the gates.

#### Review Checkpoint

- [x] Two read-only agents, one under `code-simplification` and one under `adversarial-review`, read Phase 1's range outward against Core, Desktop, and UIX: the landing's durability (every temp flushed before any rename; the handle closed before the rename on Windows), the stale-read check (`expect` checked under the caller's lock, immediately before the rename), deadlock freedom (sorted chunk locks, no page's or Space sidecar's lock taken under another's, and the tile relink and the stamps holding nothing their record takes), echo suppression and Sync's tap, the index's stat matching the file's, a watched batch's commit keeping a row another writer landed mid-read, the epoch moving once per landing after its renames, and the turn around the renames; and for anything that reads as an odd-one-out beside the code around it.
- [x] Run the gates and `npm run build` from a clean state; record Phase 1's Actionable in the Net Ledger.
- [x] `PushNotification`: Phase 1's delta and the gates' result.

---

### Phase 2 — W-2 · One Read

**GOAL:** Each file a property, option, or Context cascade rewrites is read once and parsed once from disk, and its landed text is parsed once, a relink's merge parsing a page once more where it re-spells a frontmatter Link (`mergeFrontmatter`): the clash check, the option sweep, the text plans, the record, and the owed walk stop re-reading or re-parsing what the index or the sweep already holds, the clash check and the option sweep trusting a page's index row only while it still describes the file, and an outside edit is read and parsed once. These cuts are a few percent of a rename each and touch no landing, so they're judged apart from W-1.

#### Task 2-1

A rename's clash check asks the index for the pages holding both the old and the new key, intersecting the two holder lists rather than joining them, so with no page holding the new key it reads none. A page the index lists under one key alone is still read where its row no longer describes its file, through `unlessVouched`, which holds the one condition on which the index may pass over a page it lists: a page's row is trusted only while its recorded time and size match the file's stat, and otherwise the file is read. The filter runs after `pagesInReach`, so only the pages in the rename's reach are stat'ed. Without it, a page an outside edit gave the new key, still in the watcher's debounce or drain, passes the check, and the sweep's `prefer-new` silently drops the old key's value where today the rename is refused. Paying the watcher's pending batch first can't stand in for the stat, since an edit still inside the debounce isn't in any batch yet. The stat reaches only the pages the index lists under a key: a page it indexed with neither, whose file gains both inside the debounce, is listed under none and passes the check, which matches the rename sweep's own reach, the index's holders of the old key, and predates this plan. A stat costs about 10 µs against a read and parse's 115 µs, so the cut keeps most of its saving. Spaces still answer for either key and are read as before, since the tree keeps no stat to vouch for them; an index that isn't ready still falls back to the corpus, and unreadable Spaces are still listed and read.

**PROCEDURE**

1. Apply the AFTER.
2. Write T-N14 and T-N15 in the suites *§Constraints · Tests* names.
3. For each, revert the change its row names, watch it go red, and restore it.

**AFTER**

```Core/Index/indexSeed.ts diff
@@ unmoved @@
   const now = readIndexedStat(path)
   return !now || describes(now, prior)
 }
+
+/** The files among `files` a cascade still reads: each `passOver` doesn't name as one the index answers for, handed its root-relative path, and each whose row no longer describes its file. That row describing the file is the one condition on which the index may pass over a page it lists, since an outside edit the index hasn't taken yet may still sit in the watcher's debounce. */
+export async function unlessVouched(
+  root: string,
+  files: readonly string[],
+  passOver: (rel: string, file: string) => boolean,
+): Promise<string[]> {
+  const kept = await Promise.all(
+    files.map(async (file) => {
+      const rel = relative(root, file)
+      return !passOver(rel, file) || !describes(readIndexedStat(rel), await statOrNull(file))
+    }),
+  )
+  return files.filter((_, i) => kept[i])
+}
```

```Core/Index/keyHolders.ts diff
@@ imports @@
 import { queryMembers, readPageRelations } from './contentIndex'
-import { nexusCorpus } from './indexSeed'
+import { nexusCorpus, unlessVouched } from './indexSeed'
 import { parseJsonObject, readTextOrNull } from '../Files/atomicWrite'
@@ HolderQuery @@
   title?: string
   id?: string
   moved?: FolderMove
+  /** Only the pages holding every key, as a rename's clash check asks, each page the index can't vouch for read as well; Spaces still answer for any key. */
+  every?: true
 }
 
 /** A holder a finder read: the id `byId` addresses it by, the query keys it holds, their values as written, or null when it couldn't be read, and, for a page read from its own file, the key each one's line stood above, in the page's own key order. */
@@ findHolders @@
   const tree = await liveTreeOf(root)
   const title = q.title === undefined ? undefined : exactTitle(q.title)
   const rels = q.keys.map((key) => queryMembers(key, title))
-  const pages = await pagesInReach(
-    root,
-    tree,
-    rels.includes(null) ? null : [...new Set(rels.flatMap((r) => r ?? []))],
-    q.reach,
-  )
+  const listed = rels.map((r) => r && new Set(r))
+  const named = rels.includes(null) ? null : [...new Set(rels.flatMap((r) => r ?? []))]
+  const reached = await pagesInReach(root, tree, named, q.reach)
+  // A page the index lists without every key is passed over only while its row still describes the file, since an outside edit the index hasn't taken may have given it the rest.
+  const pages =
+    named && q.every
+      ? await unlessVouched(root, reached, (rel) => !listed.every((l) => l?.has(rel)))
+      : reached
   const holds = (s: SpaceNode): boolean =>
@@ findHolders @@
   const files = [...pages, ...spaces]
   if (!read) return { files, held: [] }
-  const listed = rels.map((r) => r && new Set(r))
   const { byId } = await nexusPages(root, tree)
   const held: Held[] = []
   const heldOut = new Set<string>()
```

```Core/Properties/registryProperty.ts diff
@@ rekeyPlan @@
   if (moved.key !== prior.key) {
     const { held } = await findHolders(
       root,
-      { keys: [prior.key, moved.key], reach: 'governed' },
+      { keys: [prior.key, moved.key], reach: 'governed', every: true },
       'values',
     )
     const clashes = held.filter((h) => h.keys.length === 2 && outsideArchive(root, h.file))
```

**VERIFY**

- [x] T-N14 and T-N15 are green, and the existing refusal of a page holding both keys still passes.
- [x] Run the gates.
- [x] Check for unnecessary code or mistakes.

#### Task 2-2

An option rename, delete, or value-format change runs its own rewrite over each holder's indexed value and sweeps only the files whose value it changes, plus every file the index holds no row for (every Space sidecar, and any page it never read) and every page whose row no longer describes its file, by Task 2-1's rule (`unlessVouched`). Without the rule, a page whose value an outside edit changed, still in the watcher's debounce, would be passed over with no skip and nothing owed, and its old word registered again once its event settles. Which files hold the key it takes from `findHolders`, at the trust `findHolders` already has.

**PROCEDURE**

1. Apply the AFTER.
2. Write T-N16 in the suite *§Constraints · Tests* names.
3. Revert each change its row names, watch it go red, and restore it.

**AFTER**

```Core/Properties/optionOps.ts diff
@@ imports @@
 import { validateOptionValues } from './validation'
 import { readPageRelations } from '../Index/contentIndex'
+import { unlessVouched } from '../Index/indexSeed'
 import { findHolders } from '../Index/keyHolders'
@@ imports @@
 import { readPageRecord } from '../Nexus/readNexus'
 import { containerAt, holderSchema, pagePathsIn, spaceAt } from '../Nexus/treePatch'
 import type { Json } from '../Files/stableJson'
-import { isMarkdownFile, join } from '../Paths/posix'
+import { isMarkdownFile, join, relative } from '../Paths/posix'
 import { findOption, NO_OPTION } from './propertyValue'
 
 const NO_GROUP = fail('not-found', 'That group no longer exists.')
@@ valueEditPlan @@
   def: PropertyDefinition,
   keys: ValueEdit,
 ): Promise<{ files: string[]; plan: SweepPlan }> {
+  const raw = valueEditRewrite(def, keys)
   const { files } = await findHolders(root, { keys: [def.key], reach: 'governed' })
-  return { files, plan: { raw: valueEditRewrite(def, keys) } }
+  // The index's last read of each page's value names the pages the edit changes, while its row still describes the file; a file it holds no row for, or can't vouch for, is read.
+  const rows = readPageRelations(
+    files.map((file) => relative(root, file)),
+    def.key,
+  )?.pages
+  const passOver = (rel: string, file: string): boolean => {
+    const row = rows?.[rel]
+    return !!row && raw(row.values, file) === null
+  }
+  return { files: await unlessVouched(root, files, passOver), plan: { raw } }
 }
 
 async function stashSweep(root: string, def: PropertyDefinition, keys: ValueEdit): Promise<number> {
```

**VERIFY**

- [x] T-N16 is green, all three halves.
- [x] Run the gates.
- [x] Check for unnecessary code or mistakes.

#### Task 2-3

A text plan receives the parse the sweep admitted its page by. `renameFrontmatterKey`'s body after its parse becomes `rekeyed`, which `SweptPage.rekey` runs over the held document, so a property or Context rename's page plan stops re-parsing; both renames take their plan from one builder, `rekeySweep`, which pairs `SweptPage.rekey` with `rekeyHeld` under the caller's collision rule, and the Context rename's own `pageLeg` leaves, `rekeyContext` answering the Context's `rekeySweep` and a relink's rekey taking its `raw`; `renameFrontmatterKey` stays as parse plus `rekeyed` for its one remaining caller (`restoreScrub.ts:105`, the Trash plan's). The relink's plan reads the held page's values in place of `splitFrontmatter(content)`.

**PROCEDURE**

1. Apply the AFTER.
2. Write T-N17 in the suite *§Constraints · Tests* names.
3. Revert the change its row names, watch it go red, and restore it.

**AFTER**

```Core/Contexts/contextCascade.ts diff
@@ imports @@
 import { ok, fail, fault } from '../Contract/result'
 import { mutateRegistryFile, readRegistryStrict } from './contextsRegistry'
 import { pathExists, relocate, targetTaken } from '../Files/atomicWrite'
-import { renameFrontmatterKey } from '../Files/pageFile'
 import type { Json } from '../Files/stableJson'
 import { contextDirRel } from '../Paths/nexusPaths'
 import type { MutateReply } from '../Nexus/mutateRequest'
 import { followRelinks, owedRename, owedSwept, runNoted } from '../Nexus/owed'
-import { type Rewrite, type RewriteText, sweepGovernedRoots } from '../Nexus/governedSweep'
+import {
+  type Rewrite,
+  rekeySweep,
+  sweepGovernedRoots,
+  type SweepPlan,
+} from '../Nexus/governedSweep'
 import { type ConfigReach, sweptReach } from '../Nexus/configReach'
@@ imports @@
   namesValue,
-  rekeyHeld,
   stripKeys,
@@ rekeyContext @@
-export const rekeyContext =
-  (oldTitle: string, newTitle: string): Rewrite =>
-  (raw) =>
-    rekeyHeld(raw, contextKey(oldTitle), contextKey(newTitle), NEITHER_KEY_IS_FRESHER)
+export const rekeyContext = (oldTitle: string, newTitle: string): SweepPlan =>
+  rekeySweep(contextKey(oldTitle), contextKey(newTitle), NEITHER_KEY_IS_FRESHER)
@@ pageLeg @@
-function pageLeg(from: string, to: string): RewriteText {
-  const oldKey = contextKey(from)
-  const newKey = contextKey(to)
-  return (content) => renameFrontmatterKey(content, oldKey, newKey, NEITHER_KEY_IS_FRESHER)
-}
-
 /** The files holding the key a title change rewrites, found before the rename's list or folder step, so no settle between them can drop a moved Space from the tree; `moved` points a Space the tree still lists under the folder it left at the one it went to. The key comes from the old title, never the registry title, which may already read old or new. */
@@ cascadeTitle @@
   files: string[],
 ): Promise<ConfigReach> {
-  const raw: Rewrite = space
-    ? (r) => retitleSpace(r, contextTitle, from, to)
-    : rekeyContext(from, to)
-  return sweptReach(
-    await sweepGovernedRoots(files, space ? { raw } : { raw, text: pageLeg(from, to) }),
-  )
+  const plan: SweepPlan = space
+    ? { raw: (r) => retitleSpace(r, contextTitle, from, to) }
+    : rekeyContext(from, to)
+  return sweptReach(await sweepGovernedRoots(files, plan))
 }
```

```Core/Files/pageFile.ts diff
@@ mergeFrontmatter @@
   return envelope(fenced, mergeInto(parseDocument(frontmatter), modeled, modeledKeys), body)
 }
 
-/** Renames `from` to `to` in its place; null when nothing moves. A held `to` is the rival: under `'prefer-new'` it keeps its value and `from` goes; under `'merge'` the two combine through `joinValues` in `from`'s place. The value lands through `setAbove`, so a blank one leaves. */
+/** `content` with `from` renamed to `to` as `rekeyed` renames it. */
 export function renameFrontmatterKey(
   content: string,
   from: string,
   to: string,
   collision: KeyCollision,
 ): string | null {
-  if (from === to) return null
   const { frontmatter, body } = splitEnvelope(content)
   const doc = parseDocument(frontmatter)
-  if (doc.errors.length > 0 || !isMap(doc.contents)) return null
+  return doc.errors.length > 0 ? null : rekeyed(doc, body, from, to, collision)
+}
+
+/** The page of `doc` and `body` with `from` renamed to `to` in its place; null when nothing moves. A held `to` is the rival: under `'prefer-new'` it keeps its value and `from` goes; under `'merge'` the two combine through `joinValues` in `from`'s place. The value lands through `setAbove`, so a blank one leaves. */
+function rekeyed(
+  doc: Document,
+  body: string,
+  from: string,
+  to: string,
+  collision: KeyCollision,
+): string | null {
+  if (from === to || !isMap(doc.contents)) return null
   const items = doc.contents.items
   const held = (key: string) => items.find((i) => String(i.key) === key)
   const pair = held(from)
@@ SweptPage @@
 
 export interface SweptPage {
   raw: Record<string, unknown>
+  /** `rekeyed` over this parse. */
+  rekey: (from: string, to: string, collision: KeyCollision) => string | null
   merge: (modeled: Record<string, unknown>, modeledKeys: readonly string[], above?: Place) => string
   /** `key`'s pair as the block was parsed, its quoting, style, comment, and alias kept; undefined when the block holds no `key`. */
   pair: (key: string) => string | undefined
@@ sweepParse @@
   }
   return {
     raw,
+    rekey: (from, to, collision) => rekeyed(doc, body, from, to, collision),
     merge: (modeled, keys, above) => envelope(fenced, mergeInto(doc, modeled, keys, above), body),
     pair,
     above: (key) => {
```

```Core/Files/rootValues.ts diff
@@ KeyCollision @@
 
 export type KeyCollision = 'prefer-new' | 'merge'
 
-/** A JSON root with `from` moved to `to`, null when nothing moves; the twin of `renameFrontmatterKey`, by the same collision rule, landing through `landValue`. */
+/** A JSON root with `from` moved to `to`, null when nothing moves; the twin of `rekeyed`, by the same collision rule, landing through `landValue`. */
 export function rekeyHeld(
   raw: Json,
   from: string,
```

```Core/Nexus/cascade.ts diff
@@ imports @@
 import { isBlankRaw, landValue, stripKeys } from '../Files/rootValues'
 import { type Json, same } from '../Files/stableJson'
 import { errText, ok } from '../Contract/result'
-import { splitEnvelope, mergeFrontmatter, splitFrontmatter, sweepParse } from '../Files/pageFile'
+import { splitEnvelope, mergeFrontmatter, sweepParse } from '../Files/pageFile'
 import {
   type Rewrite,
   type RewriteText,
@@ fileRewrites @@
   const withPatch = (raw: Json, patch: Record<string, string>): Json | null =>
     Object.keys(patch).length ? { ...raw, ...patch } : null
   return {
-    text: (content, file) => {
+    text: (content, file, page) => {
       const { body } = splitEnvelope(content)
       const own = relative(root, file) === ownRel
-      const patch = patchOf(splitFrontmatter(content), isLinkKey, own, body)
+      const patch = patchOf(page.raw, isLinkKey, own, body)
       const keys = Object.keys(patch)
       const next = own && settled ? body : rewrite(body, own)
       return next === body && keys.length === 0
@@ relinkReach @@
-    const rekey = e.rekey && rekeyContext(...e.rekey)
+    const rekey = e.rekey && rekeyContext(...e.rekey).raw
     const raw: Rewrite = rekey
```

```Core/Nexus/governedSweep.ts diff
@@ imports @@
 import { asString } from './coerce'
 import { addressable } from './heldPages'
 import type { EntityRecord } from './record'
-import { sweepParse } from '../Files/pageFile'
+import { type Place, type SweptPage, sweepParse } from '../Files/pageFile'
 import type { Json } from '../Files/stableJson'
 import { type Frozen, gonePageEntry, liveLanding, reencode, rewriteRoot } from './governedRoot'
-import type { Place } from '../Files/pageFile'
 import { type PropertyDefinition, PROPERTY_TYPES } from '../Properties/properties'
-import { isBlankRaw, landValue } from '../Files/rootValues'
+import { isBlankRaw, type KeyCollision, landValue, rekeyHeld } from '../Files/rootValues'
 
@@ RewriteText @@
 
 export type Rewrite = (root: Json, file: string) => Json | null
 
-export type RewriteText = (content: string, file: string) => string | null
+export type RewriteText = (content: string, file: string, page: SweptPage) => string | null
 
-/** `raw` rewrites a page's front matter or a Space sidecar's object; `text`, when given, rewrites a page's whole text in its place; `above`, when given, places each key a page's rewrite adds. */
+/** `raw` rewrites a page's front matter or a Space sidecar's object; `text`, when given, rewrites a page's whole text in its place, handed the parse the sweep admitted it by; `above`, when given, places each key a page's rewrite adds. */
 export type SweepPlan = {
   raw: Rewrite
   text?: RewriteText
   above?: (root: Json, file: string) => Place
 }
+
+/** The plan that renames `from` to `to` in place, in each page's parse and each Space sidecar's object, a held `to` met by `collision`. */
+export const rekeySweep = (from: string, to: string, collision: KeyCollision): SweepPlan => ({
+  raw: (raw) => rekeyHeld(raw, from, to, collision),
+  text: (_content, _file, page) => page.rekey(from, to, collision),
+})
@@ rewritten @@
   }
   const page = sweepParse(content)
   if (!page) return undefined
-  if (plan.text) return plan.text(content, file)
+  if (plan.text) return plan.text(content, file, page)
   return rewriteRoot((root) => plan.raw(root, file), plan.above?.(page.raw, file))(page)
 }
 
```

```Core/Properties/registryProperty.ts diff
@@ imports @@
   withOptionGroups,
 } from './properties'
 import { ok, fail, type Result } from '../Contract/result'
-import { renameFrontmatterKey } from '../Files/pageFile'
 import { findHolders } from '../Index/keyHolders'
 import {
   outsideArchive,
+  rekeySweep,
   sweepCount,
   sweepGovernedRoots,
   type SweepPlan,
 } from '../Nexus/governedSweep'
 import { type ConfigReach, NO_REACH, sweptReach } from '../Nexus/configReach'
-import { rekeyHeld, type KeyCollision } from '../Files/rootValues'
+import type { KeyCollision } from '../Files/rootValues'
@@ renamePlan @@
 ): Promise<{ files: string[]; plan: SweepPlan }> {
   // Queried by the OLD key: a page holding only the new one needs no rewrite, and one holding both holds the old one too.
   const { files } = await findHolders(root, { keys: [from], reach: 'governed' })
-  const text = (content: string): string | null =>
-    renameFrontmatterKey(content, from, to, NEW_KEY_IS_FRESHER)
-  return {
-    files,
-    plan: { text, raw: (raw) => rekeyHeld(raw, from, to, NEW_KEY_IS_FRESHER) },
-  }
+  return { files, plan: rekeySweep(from, to, NEW_KEY_IS_FRESHER) }
 }
```

**VERIFY**

- [x] T-N17 is green.
- [x] Run the gates.
- [x] Check for unnecessary code or mistakes.

#### Task 2-4

The index half reads and parses each written page once and hands that read to the tree half: `indexWrittenPages` puts each page's text, stat, and parse into `reads`, `indexEvents` answers them, and `applyEvents` hands each page event its own, so the index row (`extractPageIndex`) and the tree patch (`pageRecordOf`) take one parse, for the app's own writes and outside edits alike, and the record carries the read's modification time where an own write's record carried none. The patch takes that read only while the page's index row is still the one the read committed (`unmoved`, exported for it): an own write, move, or Trash can land between a watched batch's commit and that page's patch, while the apply loop awaits an earlier event's folder or sidecar read, and its fresher row, or its row's leaving, sends the patch back to the file. `unmoved` therefore counts a row that left after its read as one the read no longer describes, a rule the batch's commit shares, so a page moved or trashed during the batch's read keeps no row at the path it left; a page with no row before its read or after it still takes the read, and a host with no index holds no row to contradict the read, so its patch always takes it. An outside edit, and every page another device's cascade lands here through Sync, drops from two stats, reads, and parses per page to one. A page the index didn't read (a replay, or one its read couldn't reach) is read from its file by the tree half, an own event's replay among them, which took the text its event carried before; both functions take the parse as a defaulted last argument, so every other caller parses as before. Four existing cases pinned the tree half's own read: the three `settle.test.ts` cases that held an event mid-arm on `readPageRecord` now hold it through `machine().readText` hooks on the path production takes (T-N39), and "an ID: 42 page saved twice is read once per save" counts `machine().readText` in place of `readPageRecord`.

**PROCEDURE**

1. Apply the AFTER.
2. Write T-N25, T-N30, T-N33, T-N37, T-N38, and T-N39 in the suites *§Constraints · Tests* names.
3. For each, revert the change its row names, watch it go red, and restore it.

**AFTER**

```Core/Files/pageFile.ts diff
@@ parsePage @@
 export const splitFrontmatter = (content: string): Record<string, unknown> =>
   valuesOf(parseDocument(splitEnvelope(content).frontmatter))
 
-export function parsePage(
-  content: string,
-  kind: ContentKind = 'page',
-): { frontmatter: Record<string, unknown>; admission: Admission } {
+export type ParsedPage = { frontmatter: Record<string, unknown>; admission: Admission }
+
+export function parsePage(content: string, kind: ContentKind = 'page'): ParsedPage {
   const frontmatter = splitFrontmatter(content)
   return { frontmatter, admission: admitContentFile(frontmatter, kind) }
 }
```

```Core/Index/indexSeed.ts diff
@@ imports @@
 import { inCodeAt, scanDoc } from '../MarkdownPM/Engine/docScan'
 import { contextTitles, parseContextKey } from '../Contexts/contexts'
 import { normalizeTitle } from '../Paths/caseFold'
-import { parsePage, splitEnvelope } from '../Files/pageFile'
+import { type ParsedPage, parsePage, splitEnvelope } from '../Files/pageFile'
 import {
   markIndexReady,
   readHeadings,
@@ extractPageIndex @@
 
 const NO_ROWS: PageIndexEntry = { relations: [], headings: [], values: {} }
 
-export function extractPageIndex(content: string): PageIndexEntry {
-  const { frontmatter: values, admission } = parsePage(content)
+export function extractPageIndex(content: string, page = parsePage(content)): PageIndexEntry {
+  const { frontmatter: values, admission } = page
   if (admission.state === 'unknown') return NO_ROWS
   const { body } = splitEnvelope(content)
   const scan = scanDoc(body)
@@ unmoved @@
-/** Whether `path`'s row is still the one `prior` saw ahead of a page's read: a maintaining writer that landed while the read was in flight left a fresher row than the read knew, so the read's row gives way to theirs. */
-const unmoved = (
+/** Whether `path`'s row is still the one `prior` describes, the row taken ahead of a page's read or the stat its batch committed: a writer that landed since left a fresher row, and one that moved or removed the page took its row away, so the read gives way to theirs. A page with no row then or now takes the read, and so does every read where no index holds rows. */
+export const unmoved = (
   path: string,
   prior: Pick<IndexedStat, 'mtimeMs' | 'size'> | null | undefined,
 ): boolean => {
   const now = readIndexedStat(path)
-  return !now || describes(now, prior)
+  return now ? describes(now, prior) : !prior || contentIndexStore() === null
 }
@@ indexWrittenPages @@
+/** What the index read of a written page, for the tree's patch to take rather than read and parse it again. */
+export type PageRead = { text: string; stat: FileStat; page: ParsedPage }
+
-// Re-indexes written pages as the seed commits its own, INDEX_BATCH a transaction, a row another writer landed during a page's read kept and nothing written once a switch has moved the database; each from the text and stat its writer hands over or else from its file, a page listed twice as it last stood. Reports what it saw.
+// Re-indexes written pages as the seed commits its own, INDEX_BATCH a transaction, a row another writer landed during a page's read kept and nothing written once a switch has moved the database; each from the text and stat its writer hands over or else from its file, a page listed twice as it last stood. Reports what it saw, and puts each committed page's one read and parse into `reads`.
 export async function indexWrittenPages(
   root: string,
   written: readonly { absPath: string; text?: string; stat?: FileStat }[],
+  reads?: Map<string, PageRead>,
 ): Promise<IndexSeen> {
   const seen: IndexSeen = { renames: [], vanished: [], landed: [] }
   const db0 = contentIndexStore()
-  const queued: { row: PageIndexRow; prior: IndexedStat | null }[] = []
+  const queued: {
+    row: PageIndexRow
+    prior: IndexedStat | null
+    absPath: string
+    read: PageRead
+  }[] = []
   const flush = (): void => {
     const rows = queued.splice(0).filter(({ row, prior }) => unmoved(row.path, prior))
     seen.renames.push(...reindex(rows.map(({ row }) => row)))
-    for (const { row, prior } of rows) {
+    for (const { row, prior, absPath, read } of rows) {
+      reads?.set(absPath, read)
       const [now] = idOf(row.entry)
       if (prior?.id === now) continue
@@ indexWrittenPages @@
     // An unreadable page keeps its rows, so a sweep the index seeds still reaches the file and counts it.
     if (content === null) continue
-    const entry = extractPageIndex(content)
-    queued.push({ row: { path: rel, entry, stat: { mtimeMs: st.mtimeMs, size: st.size } }, prior })
+    const page = parsePage(content)
+    const entry = extractPageIndex(content, page)
+    const row = { path: rel, entry, stat: { mtimeMs: st.mtimeMs, size: st.size } }
+    queued.push({ row, prior, absPath, read: { text: content, stat: st, page } })
     if (queued.length === INDEX_BATCH) flush()
```

```Core/Nexus/fileEvents.test.ts diff
@@ it 'an ID: 42 page saved twice is read once per save and costs no walk' @@
   })
 
   it('an ID: 42 page saved twice is read once per save and costs no walk', async () => {
-    const reads = vi.spyOn(readNexusModule, 'readPageRecord')
+    const reads = vi.spyOn(machine(), 'readText')
     for (const body of ['one', 'two']) {
       await writeFile(abs('Notes', 'Foreign.md'), `---\nID: 42\n---\n\n${body}\n`)
       await settled([ev('change', 'Notes', 'Foreign.md')])
```

```Core/Nexus/fileEvents.ts diff
@@ imports @@
   type IndexSeen,
   indexWrittenPages,
   moveIndexPaths,
+  type PageRead,
+  unmoved,
 } from '../Index/indexSeed'
 import type { ConnPage } from '../Connections/pageIndex'
 import { contentIndexStore } from '../Platform/stores'
@@ classifyEvent @@
 
 // ── The index's half ──
 
-// Removals and moves first, in order, then every written page in commits of up to `INDEX_BATCH`, each from the text its writer handed over or from its file as it now stands, so it reads right whichever event came first. What the app's own writes show is theirs to have spoken for, so only what an outside one shows is owed.
-export async function indexEvents(root: string, events: readonly FileEvent[]): Promise<void> {
+// Removals and moves first, in order, then every written page in commits of up to `INDEX_BATCH`, each from the text its writer handed over or from its file as it now stands, so it reads right whichever event came first, and answers each page's read for the tree's patch. What the app's own writes show is theirs to have spoken for, so only what an outside one shows is owed.
+export async function indexEvents(
+  root: string,
+  events: readonly FileEvent[],
+): Promise<Map<string, PageRead>> {
+  const reads = new Map<string, PageRead>()
   try {
     const written: Changed[] = []
     for (const ev of events) {
@@ indexEvents @@
     }
     const outside = written.filter((ev) => ev.origin === 'watched')
     const own = written.filter((ev) => ev.origin === 'own')
-    oweSeen(root, await indexWrittenPages(root, outside))
-    await indexWrittenPages(root, own)
+    oweSeen(root, await indexWrittenPages(root, outside, reads))
+    await indexWrittenPages(root, own, reads)
   } catch (e) {
     console.error('events: the index missed an event and reseeds:', errText(e))
     owedFor(root).corpus = true
   }
+  return reads
 }
 
 // Without an index there is no memory to pair against, so nothing is owed; a seed that bailed reads none, so a root a switch left behind never takes the record.
@@ applyPage @@
   rel: string,
   ev: Changed,
   owed: Owed,
+  given?: PageRead,
 ): Promise<Applied> {
   const dirRel = relDirname(rel)
   if (!containerAt(tree, dirRel)) {
@@ applyPage @@
   const abs = join(root, rel)
+  // A write that landed, moved, or removed the page since the index read it left a row the read no longer describes, so the patch reads the page again.
+  const taken = given && unmoved(rel, given.stat) ? given : undefined
   let read: PageRecord
   try {
-    read = ev.text === undefined ? await readPageRecord(abs, rel) : pageRecordOf(ev.text, rel, null)
+    read = taken
+      ? pageRecordOf(taken.text, rel, taken.stat.mtimeMs, taken.page)
+      : await readPageRecord(abs, rel)
   } catch {
     if (await pathExists(abs)) return 'walk'
     return applyPatch(root, (t) => removeNodeInTree(t, rel))
@@ applyOne @@
   return left === 'ok' ? landed : 'walk'
 }
 
-async function applyOne(root: string, ev: FileEvent, owed: Owed): Promise<Applied> {
+async function applyOne(
+  root: string,
+  ev: FileEvent,
+  owed: Owed,
+  given?: PageRead,
+): Promise<Applied> {
   if (ev.event === 'move') return applyMove(root, ev, owed)
   const tree = heldTreeOf(root)
   if (!tree) return 'walk'
@@ case 'page' @@
       if (patchHeldAssetMap(root, c.rel, ev.event)) owed.assets = true
       return 'ok'
     case 'page':
-      return applyPage(root, tree, c.rel, ev, owed)
+      return applyPage(root, tree, c.rel, ev, owed, given)
     case 'gone': {
       const cleared = applyPatch(root, (t) => removeNodeInTree(t, c.rel))
       // A sidecar that left a folder still on disk changes what the folder is, which the walk decides.
@@ applyEvents @@
 ): Promise<FileEvent[]> {
   const owed = owedFor(root)
   const later = new Map<string, FileEvent>()
-  if (!replay) await indexEvents(root, events)
+  const reads = replay ? undefined : await indexEvents(root, events)
   for (const ev of events) {
     try {
-      const applied = await applyOne(root, ev, owed)
+      const applied = await applyOne(root, ev, owed, reads?.get(ev.absPath))
       if (applied === 'later') later.set(ev.absPath, ev)
       if (applied !== 'walk') continue
     } catch (e) {
```

```Core/Nexus/readNexus.ts diff
@@ pageRecordOf @@
   | { kind: 'read'; node: PageNode; fm: Json; mtimeMs: number | null }
   | { kind: 'unread'; reason: UnreadReason }
 
-export function pageRecordOf(content: string, relFile: string, mtimeMs: number | null): PageRecord {
-  const { frontmatter: fm, admission } = parsePage(content)
+export function pageRecordOf(
+  content: string,
+  relFile: string,
+  mtimeMs: number | null,
+  page = parsePage(content),
+): PageRecord {
+  const { frontmatter: fm, admission } = page
   if (admission.state === 'missing')
     return { kind: 'unread', reason: frontmatterWritable(content) ? 'missing' : 'unparsed' }
   if (admission.state === 'unknown') return { kind: 'unread', reason: admission.reason }
```

```Core/Nexus/settle.test.ts diff
@@ imports @@
 import { memoryStores } from '../Testing/memoryStores'
+import { machine } from '../Platform/machine'
 import { buildPageIndex, connPage } from '../Connections/pageIndex'
@@ it 'an event whose arm resumes after a concurrent settle has pushed still …' @@
     await writeFile(abs('Notes', 'B.md'), `---\nID: ${ULID_B}\n---\n\nbeta\n`)
     const reached = gate<void>()
     const read = gate<never>()
-    vi.spyOn(readNexusModule, 'readPageRecord').mockImplementationOnce(() => {
+    const text = machine().readText
+    let failing = true
+    // The index's read of B is held and then fails, and so does the patch's own read after it.
+    vi.spyOn(machine(), 'readText').mockImplementation((path) => {
+      if (!failing || path !== abs('Notes', 'B.md')) return text(path)
       reached.open()
       return read.promise
     })
@@ it 'an event whose arm resumes after a concurrent settle has pushed still …' @@
     const walk = vi.spyOn(liveTree, 'refreshTree')
     read.fail(new Error('mid-read'))
     await applying
+    failing = false
     expect(owedFor(root).walk).toBe(true)
@@ it 'a reply while a batch applies stamps nothing the batch listed, and the…' @@
     await writeFile(abs('Notes', 'Late.md'), 'late\n')
     const reached = gate<void>()
     const release = gate<void>()
-    const read = readNexusModule.readPageRecord
-    vi.spyOn(readNexusModule, 'readPageRecord').mockImplementation(async (file, rel) => {
-      if (rel === 'Notes/Late.md') {
+    const sidecar = abs('Notes', '_pagecollection.json')
+    const read = machine().readText
+    let armed = true
+    vi.spyOn(machine(), 'readText').mockImplementation(async (path) => {
+      if (armed && path === sidecar) {
+        armed = false
         reached.open()
         await release.promise
       }
-      return read(file, rel)
+      return read(path)
     })
     const batch = settleBatch(pusher, root, [
       ev('add', 'Notes', 'Bare.md'),
+      ev('change', 'Notes', '_pagecollection.json'),
       ev('add', 'Notes', 'Late.md'),
     ])
@@ it 'a stamp never lands on a file while the batch that listed it is still …' @@
     await writeFile(abs('Notes', 'Bare.md'), 'bare\n')
     const reached = gate<void>()
     const release = gate<void>()
-    const read = readNexusModule.readPageRecord
+    const page = abs('Notes', 'Bare.md')
+    const read = machine().readText
     let reads = 0
-    vi.spyOn(readNexusModule, 'readPageRecord').mockImplementation(async (file, rel) => {
-      const record = await read(file, rel)
-      if (++reads === 2) {
+    // The index's read of Bare fails, so the patch reads it for each event, and the second read is held.
+    vi.spyOn(machine(), 'readText').mockImplementation(async (path) => {
+      if (path !== page) return read(path)
+      if (++reads === 1) throw new Error('unreadable')
+      const text = await read(path)
+      if (reads === 3) {
         reached.open()
         await release.promise
       }
-      return record
+      return text
     })
```

**VERIFY**

- [x] T-N25, T-N30, T-N33, T-N37, T-N38, and T-N39 are green.
- [x] Run the gates.
- [x] Check for unnecessary code or mistakes.

#### Task 2-5

The tree patch builds a written page's record from the index's one read of its landed text (Task 2-4), so for the app's own write it hands that record to the walk cache under that read's own stat, and the walk the write owes reuses it rather than reading and parsing the page again. It hands over only the read it took: a patch that read the page again leaves the entry `cachedParse` stored for that read, and a watched read hands nothing, since no forget stands behind it to stop a walk in flight from caching older bytes over it. `loadValues` serves a cached record's time as the page's modified time, which the record carries from Task 2-4's read. The cache holds each entry's whole stat and asks `sameFile` whether it still describes the file, so a file replaced whole at the same time and size misses, as the landing's own check already treats it. `forgetParse` stays in `landOwn`: its bump is what stops a walk in flight from caching the old bytes over this entry, and a freshly dated page still misses under the cache's racy window.

**PROCEDURE**

1. Apply the AFTER.
2. Write T-N18 and T-N40 in the suites *§Constraints · Tests* names.
3. For each, revert the change its row names, watch it go red, and restore it.

**AFTER**

```Core/Files/walkCache.ts diff
@@ imports @@
-import { type FileStat, statOrNull } from '../Platform/machine'
+import { type FileStat, sameFile, statOrNull } from '../Platform/machine'
 
 // A hit is refused while the parse happened within this window of the file's own mtime — a same-tick edit on a coarse-mtime volume (exFAT/SMB) is invisible to (mtime, size). git's racy-index rule.
 const RACY_WINDOW_MS = 2000
 
-type Entry = Pick<FileStat, 'mtimeMs' | 'size'> & {
-  verifiedAt: number
-  gen: number
-  value: unknown
-}
+type Entry = { stat: FileStat; verifiedAt: number; gen: number; value: unknown }
 
 let cacheRoot: string | null = null
 let gen = 0
@@ forgetParse @@
   forgets++
 }
 
+/** Holds `value` as the parse of the file `stat` describes, as a write that knows its own bytes' parse leaves it for the next walk. */
+export function rememberParse(absPath: string, stat: FileStat, value: unknown): void {
+  entries.set(absPath, { stat, verifiedAt: Date.now(), gen, value })
+}
+
 export async function cachedParse<T>(
   absPath: string,
   parse: (stat: FileStat | null) => Promise<T>,
@@ cachedParse @@
   const s = await statOrNull(absPath)
   if (!s) return parse(null)
   const e = entries.get(absPath)
-  if (
-    e &&
-    e.mtimeMs === s.mtimeMs &&
-    e.size === s.size &&
-    e.verifiedAt - s.mtimeMs > RACY_WINDOW_MS
-  ) {
+  if (e && sameFile(e.stat, s) && e.verifiedAt - s.mtimeMs > RACY_WINDOW_MS) {
     e.gen = gen
     return e.value as T
   }
   const value = await parse(s)
-  // null is a non-answer (absent OR transiently unreadable) — caching it against a healthy (mtime, size) would serve the failure until the file next changes. A parse that straddled a forget may hold the bytes the forget retired, under the same (mtime, size).
+  // null is a non-answer (absent OR transiently unreadable) — caching it against a healthy stat would serve the failure until the file next changes. A parse that straddled a forget may hold the bytes the forget retired, under the same stat.
   if (value !== null && forgets === forgetsAtStart)
-    entries.set(absPath, { mtimeMs: s.mtimeMs, size: s.size, verifiedAt: Date.now(), gen, value })
+    entries.set(absPath, { stat: s, verifiedAt: Date.now(), gen, value })
   return value
 }
```

```Core/Nexus/fileEvents.ts diff
@@ imports @@
   readOrder,
   readPageRecord,
 } from './readNexus'
+import { rememberParse } from '../Files/walkCache'
 import { readSettingsLeaves, scopeOf } from '../Settings/codec'
 import { errText } from '../Contract/result'
 import { containerNodeFrom } from './containerFields'
@@ applyPage @@
   } catch {
     if (await pathExists(abs)) return 'walk'
     return applyPatch(root, (t) => removeNodeInTree(t, rel))
   }
+  // The app's own write leaves the record its landed bytes give for the next walk, under the stat that read was taken at; a watched read has no forget behind it to stop a walk in flight from caching older bytes over it.
+  if (taken && ev.origin === 'own') rememberParse(abs, taken.stat, read)
   oweValue(owed, rel, !!ev.bodyOnly)
   if (ev.origin === 'watched') owed.pages.add(rel)
```

**VERIFY**

- [x] T-N18 is green, all three halves, and T-N40 is green.
- [x] Run the gates.
- [x] Check for unnecessary code or mistakes.

#### Review Checkpoint

- [x] Two read-only agents, one under `code-simplification` and one under `adversarial-review`, read Phase 2's range outward: each cut against the one rule for trusting the index (`unlessVouched`) and the trust `findHolders` already has, the tree's patch taking the index's read only while `unmoved` vouches for it, the shared parse never mutated between its two readers, the walk cache's racy window and forget counter, and anything that reads as an odd-one-out.
- [x] Run the gates and `npm run build` from a clean state; record Phase 2's Actionable in the Net Ledger.
- [x] `PushNotification`: Phase 2's delta and the gates' result.

---

### Completion Criteria

- **Conformance:** every change sits under *§Constraints*; one landing primitive for every write the app makes, one held rewrite, one recorder, one stat-or-null, one stale-read check with one stated exception, one in-flight check on the index's commits, and one parse per landed page; nothing changed outside the files the tasks name, and nothing under `Core/Sync/` or `Sync/` changed.
- **Correctness:** the harness's after-run of *§Final Verification · The Own Pass* shows a Medium-0 property rename at **below 4.0 ms per file** (`settleMs / calls.land`), today's flush alone. The figure comes from the Investigation's chunked-flush measurement (about 2.6 ms per file for temps, a grouped flush, and renames at four threads) plus the profile's remaining shares per file after this plan: the clash check's and the sweep's read passes (about 0.2 ms each), the record (about 0.3 ms), and chokidar's rescans, which this plan leaves (0.36 ms), about 3.7 ms in all. The Context rename shows one walk (`walks` of 1 in the profile's tally); every gesture behind the renames still behaves as before in the suite.
- **Completeness:** every task and checkpoint in *§Process Overview* is ticked; every *§Concepts* removal is gone (`git grep` of each removed name prints nothing outside history and planning documents); `write-file-atomic` is absent from `Desktop/package.json` and `package-lock.json`; no scaffolding, debug output, or unauthorized TODO remains.
- **Confirmation:** every new and rewritten test went red without its change and green with it; every VERIFY ran and its output was read; the harness's I/O counts show two `readText`s and one `stat` per holder for the property rename (the clash check's read, and the rewrite's read and stat) and one `readText` per rewritten page with no re-read by its walk for the Context rename, with no per-file index `stat`.
- **Continuity:** *§Reconciliation* is walked, the feature documents read true, and every deviation is fixed or ruled on.
- **Confidence:** the gates are green from a clean state at the final head, the test count moved only by the cases the plan adds and removes, and `view-delta <BASELINE>..HEAD` is reported with additions and removals apart, per phase and in total, against *§Overview · The Number*; growth past it is reported with what it bought.

#### Final Verification

**THE STANDARD:** The work is finished when a later review of it finds nothing to correct. Not just doing the chores — doing the laundry, folding it, picking up what fell out of the hamper, emptying the lint trap, leaving no trace that anything went wrong. Nothing is carried as a concern, nothing is deferred where the fix is known, and nothing is declared that wasn't watched happen. Where something genuinely couldn't get there, the report names which and why, and everything else is still finished. Ambiguity encountered during execution was taken at its simplest reading and recorded; it didn't stop the run.

The reviews run over `<BASELINE>..HEAD`, each wave closed before the next opens. Every reviewer brief carries the Mandate verbatim and has its agent read *§Constraints* whole, except the neutral gate's, which carries the Mandate alone.

- [x] Phase Review: Phase 1 · Phase 2
- [x] **Wave One:** two read-only `opus-xhigh` reviewers briefed with `code-simplification`, one reading inward at the diff and one outward against the rest of Core, Desktop, and UIX; one fix agent folds what holds as numbered fixes beside a Not Taken list with reasons, and the fold commits.
- [x] **Wave Two:** two fresh `opus-xhigh` reviewers, inward and outward, briefed with `adversarial-review` over the folded range and given the Not Taken list, so a fold left out returns only on new evidence; folded and committed the same way.
- [x] **The Neutral Gate:** one `fable-high` agent given only `<BASELINE>..HEAD`, the Mandate, and the intention under *§Constraints · Neutral Gate*; a yes-or-no verdict, its corrections, and the strengths to keep, re-run after a fold.
- [x] **The Own Pass:**
  1. The gates from a clean state, and `npm run build`.
  2. The harness's before-and-after for the three renames on Medium-0. With the harness worktree moved to HEAD and rebuilt (`git -C "$WORK/baseline" checkout -- .`, `git -C "$WORK/baseline" checkout --detach <HEAD>`, the re-fitted patch applied again, and `npm run build` inside it), copy `profiles/profile.json`, the baseline's own run at `15fe7422a`, to `profiles/profile-15fe7422a.json`, then run `node profile.mjs profile`. For the property, Context, and page renames, report wall time, files landed, per-file cost, and the machine call counts beside the baseline's, against OP-7's expected counts: the property rename at two `readText`s and one `stat` per holder (the clash check's read, and the rewrite's read and stat) plus one `readBytes` (the echo); the Context rename at one `readText` per rewritten page and one walk's `stat` and `readDir`; the page rename at one `readText` per page the index names as mentioning the old title, with no settle re-read. The option rename isn't among the profile's operations. The baseline's figures: property rename 48,384 ms over 7,027 files (6.89 ms per file), 21,081 `readText`, 21,073 `stat`; Context rename 34,448 ms over 4,927 (6.99 ms), 10,036 `readText`, 36,319 `stat`, four walks; page rename 4,088 ms over 522 (7.83 ms).
  3. The chokidar re-profile: `node analyze-profile.mjs renameProperty _read,filterPath` and the same for `renameContext`, recording their inclusive time and share of main-thread busy time beside the baseline's (2.53 s, 23% of a property rename's busy time), for *§Reconciliation*'s issue. Then delete the `*.cpuprofile` files the run wrote; `profile.json` and `profile-15fe7422a.json` stay beside the harness as its results.
  4. The diff read once; *§Completion Criteria* ticked.
- [x] **The Cold-Machine Check:** `./teardown.sh` from the harness folder, then each of these prints nothing, or only what it names: `git -C "$REPO" worktree list` (the main checkout alone); `ls -d ~/Benchmark-* 2>/dev/null`; `ls "${TMPDIR}/pommora-reach-in" 2>/dev/null`; `ps -A -o pid=,command= | grep -E "pommora-reach-in|Benchmark-" | grep -v grep`; `lsof -nP -iTCP:9391-9396 -sTCP:LISTEN`; `git -C "$REPO" status --short` (nothing, since the planning folders and the harness are committed at closeout); and `git -C "$REPO" stash list` (as it stood at the baseline). A Pommora instance launched from the main checkout before the run is left running.
- [x] **Reconciliation:** *§Reconciliation* walked; *§Deviations* ruled on; STATUS and BASELINE's End filled.
- [x] **The Report:** in `closeout-review`'s closeout format, with the range presented through `view-delta`, the per-phase and total delta, the before-and-after numbers, Task 1-8's two medians and the chunk they set, every deviation, the Cold-Machine Check's result, and the neutral gate's answer verbatim.

#### Reconciliation

**Code and Tests**

- The comments *§Constraints · Comments* names — the task named there.
- `Core/Testing/machineContract.ts` — "writes then reads text and bytes", "writes atomically", "utimes moves the modification time" — Task 1-4
- `Core/Nexus/handlers.test.ts` — "the open registers the Multi-Select members its pages hold from the index, and a settle registers from the file it’s handed" — Task 1-5
- `Core/Nexus/mutate.test.ts` — "a walk that read the disk before a Context rename committed its registry reads it again" — Task 1-6
- `Core/Nexus/cascade.test.ts` — the two cases that pin a tile left alone, spying `rewritePageSerialized` — Task 1-4
- `Core/Nexus/adopt.test.ts` — "answers every id it wrote, a folder’s as well as a page’s", whose order follows the folders' stamps and then the pages' one held rewrite — Task 1-4
- `Core/Properties/notesWiring.test.ts` — the six module mocks, for one landing spy — Task 1-4
- `Core/Nexus/settle.test.ts` — the three cases that hold an event mid-arm on `readPageRecord` — Task 2-4
- `Core/Nexus/fileEvents.test.ts` — "an ID: 42 page saved twice is read once per save and costs no walk" — Task 2-4

**Feature Docs**

- `.claude/Features/CorePM.md` *§Mutations · Sweeps and owed work* — "share one walk (enumerate, lock, admission-check, decide, write only what changed) … confirm each under its own lock": a sweep holds a chunk of files' locks from its read through its record and lands the chunk in one flush, and a file another program changed since its read is skipped and owed — with the final report
- `.claude/Features/CorePM.md` *§The Atomic-Write Contract* — "temp file plus rename in the host … leaving either the whole old file or the whole new file after a crash": the host writes a group's temps beside their files and flushes them together before any is renamed into place, a crash mid-flush leaving its dotted temps where they lie, which no reader admits and nothing removes, and every landing that follows a read leaves a file changed since as its writer left it, Sync's arrivals excepted — with the final report
- `.claude/Features/CorePM.md` *§The Device-Local Database* — the content index's role gains that the app's own writes record the stat their landing answered, so the open's seed skips them, that a watched batch commits as the seed does, that the settle reads a page's option words from its row, and that a cascade reaches the pages the index lists and reads each from its file, no row deciding what it passes over — with the final report
- `.claude/Features/CorePM.md:84` — "An mtime-gated parse cache keeps a walk cheap by reusing decoded sidecars and frontmatter for unchanged files": "… for unchanged files and for a page the app just wrote, an outside edit's patch dropping its page's cached parse" — with the final report
- `.claude/Features/CorePM.md:92` — "An operation that changes a page's address runs inside the settle's own turn" and "Every write notes itself as a file event as it lands": "An operation that changes a page's address, and a Context or Space rename, runs inside the settle's own turn …" and "Every landing notes its files as one batch of file events …" — with the final report
- `.claude/Features/CorePM.md:129` *§Adoption* — "the stamp restores the file's modification time afterward": "the stamp keeps the file's modification time", and a first adoption's page stamps land a chunk at a time — with the final report
- `.claude/Features/DesktopPM.md` *§The Shape of the App · Platform* — `nodeMachine.ts` implements the landing itself, no library, writing a symlinked file through to its target — with the final report
- `.claude/Features/DesktopPM.md:14` *§The Push Path* — "each write noting itself as a file event … an address-changing write holding the settle's turn through its own re-spell": "each landing noting its files as one batch of file events … an address-changing write holding the settle's turn through its own re-spell, and a Context or Space rename through its sweep" — with the final report
- `.claude/Features/DesktopPM.md` *§The File Watcher* — "Past the tap, the watcher skips the app's own writes, since each applied as it landed" and "Events accumulate through a debounced settle, then apply one at a time through the same path the app's own writes take: each maintains the content index and patches the live tree": the app's writes apply as each group lands, and a batch applies 200 events at a time, each slice maintaining the index before its events patch the tree from the index's read; and the same paragraph's "owes a verification walk that reuses the parse of any page or sidecar whose mtime and size are unchanged": "… whose mtime and size are unchanged, or that the app just wrote" — with the final report
- `.claude/Features/ContextsPM.md:22` — "under per-file locks for each root it rewrites": "under each root's lock, a sweep holding a chunk's locks together"; and after "under one lock on the Contexts folder": "a rename in the settle's turn as well, so the walk it owes runs once, after its sweep" — with the final report
- `.claude/Guidelines/Development-Environment.md` *§Data-Layer Traps* — a new **Held Chunks** entry: a held rewrite holds its chunk's file locks from the read through the record, so a `readText` or `land` hook that takes one of those locks rejects as re-entrant; resolve a gate from the hook and take the lock outside it (T-N7) — with the final report
- `.claude/Features/PommoraUIX.md` — nothing; checked, no passage names the write path.

**Issues**

- `.claude/IssuesPM.md` I-037 (`:770`) — "and `applyOwn` marks the disk moved for every write but the editor's body save": once per landing, for every landing but the editor's body save — with the final report
- `.claude/IssuesPM.md` I-038 (`:864`, `[^38]`) — `indexWrittenPage` reads `indexWrittenPages`, and the footnote's line ranges read true — with the final report
- `.claude/IssuesPM.md` — a new entry in *A3 • Nexus & Data*, in the file's own entry format (an index row and a section with its table, **Description**, **Solution** [Proposed], and footnote), filed through `c/batch-issues`' *§Reconciliation* rules and `$/index-issues`: chokidar's directory rescans after a write, with the re-profile's numbers (inclusive time, share of busy time, and `lstat`s per written file for the property and Context renames), `readdirp`'s `_read` and chokidar's `filterPath` cited, and a proposed solution weighed against the watcher's own owner; one read-only agent that didn't write it reviews it against the code before it's filed, as the index's bar requires — with the final report

**History**

- `.claude/HistoryPM.md` — one entry, *PM-156 · One Landing*, in the file's own format (an index row; `#### PM-156 || One Landing`, its **DATE**, two paragraphs, **Commits**, and **Delta**), written with the final report

#### Open Items

- **The Trash Plan's Two Parses (OP-4):** `deleteCascade`'s post-sweep parse (`cascade.ts:142`, about 0.03 s per Medium delete strip) could take each stripped root from the plan's own `raw` callback, and `restoreScrub`'s text plan re-parses with `splitFrontmatter` and `renameFrontmatterKey` (`restoreScrub.ts:104-107,195-197`) and lands unchanged files. Both are record-minting code the Trash & Archive plan reworks, so they're that plan's.
- **Chokidar's Directory Rescans:** `readdirp` rescans each directory a write touches, about 28 `lstat`s per written file and 2.5 s of main-thread time per Medium property rename at the baseline. They're the watcher's own cost and outside this plan; the item stands until *§Final Verification* re-profiles them and *§Reconciliation* files the issue with those numbers.
- **The Per-File Landings Left:** Sync's pull lands each arrival alone (`Core/Sync/Arrival/land.ts:96`), one flush per file, and *§Constraints · Sync* keeps Sync's code as it is; the open's Agenda stamps (`stampTree`, before the open's read) stay one landing each inside a folder walk, over the few files Agenda's scaffolding holds; a new Space's blank tiles land one at a time (`Core/Contexts/contextWrite.ts`); and a remint, an asset migration, and a strict sidecar edit write single files or a handful.
- **A Restore's Move From Outside the Tree:** a move whose old path the tree never held, as a Trash restore lands one, re-indexes through `moveIndexPaths` without handing its read on, so `applyPage` reads the page again; carrying `reads` through is about three lines, and it belongs with the Trash & Archive plan, which reworks restore.
- **The Thread-Pool Line's Placement:** `Desktop/main.ts` sets `UV_THREADPOOL_SIZE` after the bundle's hoisted imports, and Task 1-8's measure shows it takes effect; nothing pins that a later import won't start the pool first, and the structural fix is a first side-effect-only import, a new file whose placement is Nathan's.
- **A Timing Case:** `Core/Matrix/matrixRuntime.test.ts` "wakes on a shuffle" failed once in the fourteen full runs the planning worktree made, at Task 1-4's state, and passed on its rerun and in every other run; it touches nothing this plan changes, so a failure there is rerun once before it's investigated.

#### Deviations

- **D-4 · The Thread Pool Scales With the Machine (Final Verification, Nathan's Ruling, 10-29-2026):** Task 1-8 shipped `UV_THREADPOOL_SIZE` as a fixed sixteen; Nathan ruled it shouldn't be absolute, so `Desktop/main.ts` sets twice the machine's cores, kept between libuv's four and sixteen (`58a7b41a6`). The measuring machine has ten cores, so it still takes sixteen and Task 1-8's medians stand; a four-core machine takes eight.

- **D-3 · The Temp Guard Removed (Final Verification, Nathan's Ruling, 10-29-2026):** both neutral gates found `TEMP_SUFFIX` kept past its reason, since `write-file-atomic`, whose `Name.md.<digits>` temp it refused, left with Task 1-4. Nathan ruled it removed, which reached Sync's code against *§Constraints · Sync*: `push.ts` and `reconcile.ts` hand `admits` to `listPathsUnder` directly in place of a lambda that forwarded the removed `siblings`, with no change to what Sync admits (`4a1e2e96a`).

- **D-2 · The Index's Trust Withdrawn (Final Verification, for Nathan):** Wave Two's two adversarial reviewers reproduced one root problem: the index tells whether a row is still its file by `(mtime, size)`, and the app's held rewrites keep a page's modification time by design, so a same-length rewrite (Red→Tan, Home→Work) leaves a different file under the same pair. The ruling *§Constraints · Rulings · The Index's Trust* first stated, that a row decides what a cascade passes over while its time and size match the file's, is withdrawn, and Tasks 2-1's and 2-2's narrowing is reverted, so a rename's clash check and an option edit read every holder as at the baseline. Across devices, device A sweeps a same-length option rename while device B is closed and a file-sync client downloads the pages, so B's open seed skips them by their kept time and size, and an option rename on B trusted the stale rows, passing over a page that held the word and reporting nothing, an exposure R-1's clash check shared. In a session, an own rewrite that kept its page's time and size, landing while a watched batch sat between its read and its commit or between its commit and its tree patch, passed the old in-flight check, so the index kept the outside read over the own write for good, or the tree until the next walk; that check now compares a per-path commit sequence (`commit`, `unmoved`) that no file's stat takes part in. Pommora's own Sync reaches the stale row too: `startSession` runs unawaited at the end of `openNexusSequence`, so its first pull can land arrivals before the watcher listens, and the catch-up seed at the watcher's ready skips an arrival that kept its time and size. **The Follow-Up (Recommended):** give the stat identity the file's change time (`ctimeMs`), which no program can set, so the seed's skip, and with it the index's membership, tells a kept-time rewrite apart. It costs a new `FileStat` field in all three machines, an index generation bump so every Nexus reseeds once, `land` answering a stat taken after its rename (which also fixes NTFS tunneling's answered birth), a change time that also moves on extended-attribute changes, and Windows and exFAT behavior that's unverified. Nathan approved the follow-up on 10-29-2026; it opens the Trash & Archive plan, since reach-in widens what the index's membership decides, and with it R-1's and R-2's savings can return.

