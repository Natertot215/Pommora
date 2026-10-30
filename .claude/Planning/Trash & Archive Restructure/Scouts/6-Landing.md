### Scout 6 — The Landing and Every Write Beside It

**HEAD:** `776f3ea94` on `active`, read-only; cleaned against *Trash & Archive Restructure — Investigation* on 10-29-2026 under Decision B-1 through 37. **Runtime Checked:** Electron 42.4.0 (Node 24.16.0, libuv 1.52.1, SQLite 3.53.0) run as Node (`ELECTRON_RUN_AS_NODE=1`), scratch scripts since deleted. **Evidence Key:** *documented* is a man page, header, Node's docs, or libuv's source; *measured* is a scratch run on this machine (APFS, internal SSD, with the development instance likely running); *inferred* is reasoned, not run. The diff sketch, the write inventory, and the measurements are this scout's own; the design they support is stated once in the Investigation's *§The Landing*, and this report maps each finding to it.

#### 1. The Group Flush's Shape (Diff Sketch)

```ts Desktop/Platform/nodeMachine.ts diff
+import { constants } from 'node:fs'
+// Node names no write-through flag on Windows, where libuv maps its own value to FILE_FLAG_WRITE_THROUGH.
+const THROUGH = constants.O_DSYNC ?? 0x04000000
+const TEMP_FLAGS = constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | THROUGH

-async function stage(...): Promise<() => Promise<FileStat>> {
+async function stage(...): Promise<{ dev: number; flush: () => Promise<void>; commit: (flushed: Promise<unknown>) => Promise<FileStat> }> {
-  const handle = await open(temp, 'wx')
+  const handle = await open(temp, TEMP_FLAGS)
   try {
     await handle.writeFile(data)
     if (mtimeMs !== undefined) await handle.utimes(...).catch(() => {})
-    await handle.sync()
+    own = await handle.stat()            // moved up from the commit: its mode and its dev
   } catch (e) { return discard(e) }
-  return async () => {
+  return { dev: own.dev, flush: () => handle.sync(), commit: async (flushed) => {
     try {
+      await flushed                      // a failed flush discards this temp
       const held = await absentToNull(stat(path))
       if (expect !== undefined && !sameFile(expect, held && fileStat(held))) throw ...
-      const own = await handle.stat()
       if (held && held.mode !== own.mode) await handle.chmod(held.mode).catch(() => {})
       await handle.close()
       await outlastHolder(path, () => rename(temp, path))
-      return fileStat(own)
+      return fileStat(await stat(path))  // Decision G-1: post-rename, carrying the change time
     } catch (e) { return discard(e) }
   } }
 }

   async land(files) {
     const staged = await Promise.allSettled(files.map(stage))
+    // One flush per drive the group's temps sit on, all before any rename: a drive's flush confirms only what was written through to it.
+    const flushes = new Map<number, Promise<void>>()
+    for (const s of staged)
+      if (s.status === 'fulfilled' && !flushes.has(s.value.dev)) flushes.set(s.value.dev, s.value.flush())
+    await Promise.allSettled(flushes.values())
     return Promise.allSettled(staged.map(async (s) => {
       if (s.status === 'rejected') throw s.reason
-      return s.value()
+      return s.value.commit(flushes.get(s.value.dev)!)
     }))
   }
```

About +6 production lines; per-file syscalls stay level, the `fstat` moving into `stage` and the post-rename `stat` replacing the answered pre-rename one. `stage` resolves symlinks to their real path (`nodeMachine.ts:56-58`), so a group can span volumes, hence one flush per device.

**Sources:** `fcntl(2)` F_FULLFSYNC "asks the drive to flush all buffered data … data that had been fsync'd on the same device before is guaranteed to be persisted" (documented); `sys/fcntl.h:148` `O_DSYNC` "synch I/O data integrity" (documented); libuv's `src/unix/fs.c` runs `uv__fs_fsync` as F_FULLFSYNC → F_BARRIERFSYNC → `fsync` on Apple, and `fdatasync` calls it (documented). Node's fs docs list the flags available on Windows, and `O_DSYNC` isn't among them, so it is `undefined` there and OR-ing it gives 0: a naive `| O_DSYNC` would land plain temps, the one `FlushFileBuffers` would cover only its own file, and Decision F-3 would break on a build target (`electron-builder.yml:28-29`). libuv's `include/uv/win.h:691` and `src/win/fs.c` (`fs__open`) map `UV_FS_O_DSYNC` (0x04000000) to `FILE_FLAG_WRITE_THROUGH`, `fsync`/`fdatasync` run `FlushFileBuffers`, and DSYNC with SYNC is `einval` (documented); Node passing 0x04000000 straight to libuv is inferred and untested.

#### 2. Every Write

`land`'s callers: `landOwn` (`atomicWrite.ts:19`), `landBytes` (`:133`), and the three machines.

| Site | Files per Call | Flush Today | Classification | Reason |
|---|---|---|---|---|
| `rewriteHeld` (`atomicWrite.ts:69-125`): sweeps (`governedSweep.ts:70`), `stampMissing` pages (`adopt.ts:158`), tile relink (`tilesFile.ts:312`) | ≤64 (`:51`) | 1 per file, concurrent | The target | Where the group flush lands |
| `rewritePageSerialized` (`:402-406`): `stampPage` (`adopt.ts:86`), remint (`remint.ts:79`), asset migration (`assetMigrate.ts:148`) | 1 | 1 | A group of one | Remint's loop is LD-8 |
| Single `atomicWriteFile`/`writeJson`: page save and create (`page.ts:25,63`), tiles (`tilesFile.ts:63,187,252`), identity (`identity.ts:35-55`), registry seed (`contextsRegistry.ts:24`), sidecar create (`folderEntity.ts:104`), bundle record (`Bundles/record.ts:121`), assets (`assetWrite.ts:33`), thumbnails (`Desktop/Capture/thumbnails.ts:82`), `governedRoot.ts:202` | 1 | 1 | Fine | One file per gesture |
| `rmwLocked`/`updateNexusFile`/`updateNexusConfig` (`atomicWrite.ts:229-333`): owed notes, `state.json`, settings, matrix, homepage, crops, metadata shards, `appConfig.ts:53`, `secrets.ts:33` | 1 | 1 | Fine | Write-ahead notes keep their own flush |
| `contextWrite.ts:180-181`: four blank tiles, then the tile doc | 1 ×4, +1 | 5 serial | Stays | About 25 ms per gesture; grouping needs a public grouped writer (`landOwn` is private), and a missing tile file reads `not-found` (`tilesFile.ts:231-238`) |
| `copyPageMetadata` (`pageMetadata.ts:136-155`), from remint (`remint.ts:59`) | 1 per pair, the same shard rewritten per pair | N serial | LD-7 | `dropPageMetadata` (`:119-134`) batches by shard; the copy reads by shard (`:141-148`) then writes once per pair (`:149-154`) |
| Remint pages (`remint.ts:45-56` → `:78-84`) | 1 per target, serial | N serial | LD-8, conditional | Fine at a handful; a Finder-duplicated 500-page folder about 5 s at open (inferred) |
| `reachConfig` (`configReach.ts:319-347,352-359`) through `editJsonStrict` | 1 per file, serial | 1 per changed file | LD-9, conditional | In surface and growing under Decision D-3; `editJsonStrict`'s only caller (`atomicWrite.ts:335-350`) |
| `stampMissing`'s folder stamps (`adopt.ts:143-151` → `stampFolder` `:109-123`) | 1 per folder | 1 each | Stays | First adoption only; `rmwJsonStrict` seeds an absent sidecar, which `rewriteHeld` can't |
| `stampTree`'s Agenda stamps (`adopt.ts:161-185`) | 1 per file missing an ID | 1 each | Stays | Agenda scaffolding only |
| Asset migration (`assetMigrate.ts:116-153`) | 1 per ref | 1 each | Stays | Runs when the user changes the image folder |
| Sync's `landWrite` → `landBytes` (`Core/Sync/Arrival/land.ts:84-103`; `atomicWrite.ts:128-135`) | 1 | 1 | Unchanged (Decision B-1) | Already a group of one; inherits the change with no Sync edit |
| `relocate`, `removeOwn`, `setAside`, Trash moves (`atomicWrite.ts:138-156,308-311`; `Trash/discard.ts`, `spend.ts:71`) | — | None | Fine | Metadata operations |
| `Desktop/main.ts:285` `pasteImage` (`tmpdir`); `Desktop/Store/driver.ts:82` `renameSync` | — | None | Fine | A scratch file; a damaged database set aside |
| `Sync/hub.ts:66-90` spool | stream | None | Out of scope (Decision B-1) | Hub-side |
| SQLite `nexus.db`, `versions.db` | per commit | Plain WAL `fsync` | Fine | *§4* |

**Flush Remnants:** the only production `sync()` is `nodeMachine.ts:70`, plus the test mock (`nodeMachine.test.ts:22-34,74-78`); no `fsync`, `fdatasync`, `flush: true`, or `write-file-atomic` remains in `Core`, `Desktop`, `Sync`, or `UIX`.

#### 3. What Was Sized Around Per-File Flushes

- **The Thread-Pool Line** (`Desktop/main.ts:3,68-69`): its comment rests on "each flush holds a pool thread". The pool measurement (*Investigation · §The Landing · §The Group Flush*) shows sixteen threads slower than four once one flush serves a group, so the line, its comment and import, the Write Path's Deviation D-4 (plan `:4015`), and the open item on its placement (plan `:4010`) stop earning their place, settled by Task 1-8's procedure (plan `:3049-3123`) once the group flush lands, below its 0.5 ms bar.
- **`CHUNK`** (`atomicWrite.ts:50-51`): its value stays 64, its reason becoming files per flush against lock hold (16 → about 415 µs a file, 64 → about 170, 256 → about 103, no flush → 75, so one flush ≈ 5 ms, measured); its docstring ("each flush holds one of the host's I/O threads … tens of milliseconds") becomes false.
- **Also False After:** `nodeMachine.ts:94` (flushes overlapping), `CorePM.md:105` ("every temp is flushed before any is renamed"), and `nodeMachine.test.ts:74-78`'s three `synced`, which become one per device.

#### 4. The Index's Durability

Only `journal_mode = WAL` is set (`driver.ts:36`), for `nexus.db` (`open.ts:20-35`) and `versions.db` (`versionsDb.ts:25-29`). Defaults under Electron 42.4: `synchronous=2` (FULL), `fullfsync=0`, `checkpoint_fullfsync=0`, `wal_autocheckpoint=1000` (measured). Each COMMIT (`driver.ts:19-29`) runs a plain WAL `fsync()` on the main thread, which per Apple's `fsync(2)` reaches the drive without draining its cache (documented). 110 commits of 64 rows (measured): FULL 0.18-0.20 ms per commit, NORMAL 0.10-0.12, FULL with `fullfsync` 4.3. A 7,027-page rename makes about 36 commits, about 7 ms. `local_state` and `sync_base` (`ddl.ts:12-17,46-55`) share the file with the regenerative index tables, and damaged stores are set aside (`driver.ts:78-92`).

#### 5. Own-Write Echoes

chokidar emits only after `awaitWriteFinish`, polling every 50 ms for at least 200 ms (`watcher.ts:106`; chokidar `index.js:608-651`). Per Medium property rename: 6,959 `readBytes` and hashes in `dropOwnEchoes`, plus at least four chokidar polling stats per file. `PREFIX_WINDOW_MS` (`writeEcho.ts:10`) governs only bytes-less folder-move records and is untouched. With `land` answering a post-rename stat, the change time moved on `futimes`, `fchmod`, and the rename itself (370 → 391 → 412 ms, measured) while the modification time was kept and birth pulled back to it, so only a stat after the rename tells a kept-time, same-length landing apart. chokidar passes a fresh `fs.Stats` as its second argument (`index.js:504-520`), which `watcher.ts:110` ignores; a stat at the drain works with either watcher.

#### 6. The Change-Time Identity, Machine Side

- **`FileStat`** (`machine.ts:2-7`): gains `ctimeMs`; `birthtimeMs` stays for `adopt.ts:79` and `remintLedger.ts:77`.
- **`fileStat`** (`:31-42`): maps `ctimeMs`. libuv's `win/fs.c` fills `st_ctim` from NTFS `ChangeTime` and renames through `MoveFileExW(…, MOVEFILE_REPLACE_EXISTING)` (documented); `ChangeTime` moving on a rename-over is inferred, and exFAT unverified.
- **`sameFile`** (`:22-29`): compares `ctimeMs` in place of `birthtimeMs`, which already catches a file replaced whole (measured); its APFS-birth caveat and T-N40's skip-off-macOS go.
- **The Host's `land`** (`nodeMachine.ts:79,84`): answers `fileStat(await stat(path))` after the rename, which also fixes NTFS tunneling's answered birth (D-2).
- **The Disk Double** (`machines.ts:148-165`) already answers post-rename (`:164`); **the Memory Machine** (`machines.ts:74-100,121-126`) has no change time, so a same-length kept-time `land` passes `sameFile` there until it gains a counter set on every `land` and `rename`.

#### 7. Findings, as the Investigation Holds Them

- **The Group Flush, Its Edges, and Windows:** LD-3, *§The Landing · §The Group Flush*, Decision G-4.
- **The Post-Rename Stat and the Change Time:** LD-1, LD-2.
- **The Thread-Pool Line and `CHUNK`:** LD-6.
- **The Echo by Stat:** LD-5.
- **`copyPageMetadata` by Shard, Remint's Writes, the Configuration Pass:** LD-7, LD-8, LD-9 with *§Approaches Worth Weighing*, 2.
- **A New Space's Five Landings:** stay (*§Removal & Consolidation Ledger · §The Landing's Items*).
- **The Index's Durability:** stays (*§The Landing · §The Index's Durability*).
- **The Watcher:** I-081, its own plan (*§The Landing · §The Watcher*).
- **Doc and Test Reconciliation:** `CorePM.md:105` (and `:100` becomes literally true); `nodeMachine.ts:49,94`; `atomicWrite.ts:50`; `main.ts:68`; `machine.ts:22`; T-N19's count (`nodeMachine.test.ts:74-78`) and T-N40 (*§What Becomes False*).
