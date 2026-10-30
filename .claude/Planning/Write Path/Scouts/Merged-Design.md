### Write Path — Merged Design

**DATE:** 10-28-2026
**REPO:** `~/The Studio/Projects/Project Pommora`, branch `active`, HEAD `15fe7422a`, read-only.
**INPUTS:** *Write Path — Brief*, *Write Path — Investigation*, Scout A (*A-Writers-Seam.md*), Scout B (*B-Sweep-Recording-Reads.md*), and the code at HEAD.
**METHOD:** every AFTER below was applied to scratch copies of the HEAD files, formatted with the repo's Biome settings (base copies came back byte-identical, so the settings match), and counted by diff. Production counts exclude blank lines, comment-only lines, `*.test.ts`, and `Core/Testing/`. Nothing was typechecked or run; the code is Biome-clean and written against the types at HEAD. The scratch trees are at `scratchpad/write-path/merged/{base,core,cuts,off}/`, and every diff below is also in `scratchpad/write-path/diffs/`.
**DIRECTION APPLIED:** Nathan takes the Core and every Read Cut. A confirmation's count stays its operation's own dry run. Offsets are recommended where they hold.

---

#### 1. Decisions

##### The Totals

| Configuration | Removed | Added | Net (Production) |
|---|---|---|---|
| **The Core** | 160 | 227 | **+67** |
| **The Core + the Read Cuts** | 182 | 288 | **+106** |
| **The Core + the Read Cuts + the Recommended Offsets** | 195 | 293 | **+98** |

Test code (`Core/Testing/`) nets +52 on top (−54 / +106), almost all of it new invariant cases in the shared machine contract. `Desktop/package.json` loses 2 dependency lines, and the lockfile loses `write-file-atomic`, `@types/write-file-atomic`, and `signal-exit@4.1.0` (`package-lock.json:3095,8270,9760`; nothing else depends on `signal-exit@4`).

##### D-1 · The Sweep: One Hold per Chunk, A's Shared Read, B's Single Body

Both scouts are right that the Investigation's two-hold lock is wrong: a second sweep or an in-app write landing between the holds keeps the mtime (a preserved-time rewrite) and can keep the size, so the `(mtime, size)` recheck passes and an older chunk overwrites it (B, *§3*), and the host's recheck-then-rename has to be under the lock anyway (B). Each chunk's locks are taken once, in sorted order, and held from the read through the record.

- **Kept from A:** `readHeld` (stat ahead of the read) and `landRewrites` (a page keeps its time, every rewrite carries `expect`) live in `atomicWrite.ts`, because `rewritePageSerialized` needs the same two rules and One Way rules out stating them twice.
- **Kept from B:** one body that reads, lands, and files results inline, with no separate `readPass` function.
- **Dropped from B:** both `.catch` guards (`.catch(() => out.skipped.push(...chunk))` and `.catch(() => read.map(() => false))`). The lock rejects only on re-entrancy, and no sweep runs under a file lock: every one of the 28 production `lock(` sites at HEAD (32 with `machineContract.ts`'s four) (`git grep "\.lock("`) holds one file key or takes a folder key (`.nexus`, `contextsDir`) before any file key. `finishOwed.ts:266` and `delete.ts:133,135` lock a deleted folder around `discardFile` only; `setBanner.ts:25`, `contextWrite.ts:53,93`, `governedRoot.ts:251,263`, and Sync's `land.ts:92,112,130` and `base.ts:29` each hold one key and take no second page lock (`captureLoser`/`captureIfDue` take none). `readHeld` never throws, plans can't throw on input `sweepParse` admitted (`pageFile.ts:202-206`), and the host answers each file separately. Those catches guard ghosts and would turn a real bug into 64 silent skips. The sweep now rejects loudly instead, and the owed note keeps the work for Try Again.
- **Kept from both:** `unique` (a repeated path inside one chunk would re-take its own lock; `sweepRootsById` can list one path for two ids).
- **Result:** `governedSweep.ts` nets **−7** (A counted +1 with its separate `readPass`; B counted +25 with its own landing mapping and catches).

##### D-2 · One Landing, One Recorder

- **The Seam (`Core/Platform/machine.ts`):** A's contract. `land(files: readonly Landing[]): Promise<Landed[]>`, with `Landed = PromiseSettledResult<FileStat>` (no new result type) and `sameFile` shared by the three machines. `writeText`, `writeBytes`, and `utimes` leave, so three methods become one.
- **The Host (`Desktop/Platform/nodeMachine.ts`):** A's behavior in a smaller shape. `stage` writes, dates, and flushes the temp and answers the file's own commit, so the `Staged` type, the `FileHandle` import, and the separate `commit` function are gone (A's form counted +45, and this one counts +38). Every temp in the group is flushed before any rename.
- **The Recorder (`Core/Files/atomicWrite.ts` · `landOwn`):** B's shape (record the echoes, land, note the landed files as one batch with `{ event, bodyOnly }`) answering A's `Landed[]`, with A's rule for `forgetParse`: it runs only for a file kept at its time, exactly as `rewritePreservingTimes` and `landBytes` do today. B's broader rule would bump `forgets` on every editor save, which stops any walk in flight from caching (`walkCache.ts:55`) and serves no purpose. `sole` turns a chunk of one into a throw for the three single writers.
- **`noteOwn`:** B's rest parameter, so `relocate`, `discard.ts:46`, and `spend.ts:74` stay byte-identical and no Trash file changes for it.
- **Test Machines:** A's `memoryMachine.land` and `diskMachine`'s `landOnDisk` (no flush and no mode, since Core's suites install it). `hostFs.refuseWrites` becomes A's `refuseLandings`, a spy on `machine().land`. That sees every caller, where B's `landOwn` entry would miss calls made inside `atomicWrite.ts` itself.

##### D-3 · The Newer-Own-Write Skip Isn't Built

Every in-app writer takes the path's lock, and the chunk holds its files' locks through `landOwn`'s `noteOwn`, so no own write to a chunk file can land between the chunk's landing and its record. Outside writes are refused by `expect` before the rename. The rule would guard nothing. **The test that pins it** is *T-N7 · A Queued Own Write Isn't Overwritten by an Older Chunk* (B's test 2, in `governedSweep.test.ts`), and *T-N6 · An In-App Writer Waits for the Chunk* pins the wait it relies on.

##### D-4 · The Sync Lines

- **Changed:** `Core/Sync/Client/push.ts:165` and `Core/Sync/Client/reconcile.ts:75`, each passing `admits` directly in place of a lambda that forwarded `siblings`. That's two lines, and nothing else in `Core/Sync/` or `Sync/` changes. A grep of both trees for `writeText`, `writeBytes`, `utimes`, `noteOwn`, `setOwnTap`, `indexWrittenPage`, `TEMP_SUFFIX`, `siblings`, `atomicWriteFile`, `RewriteText`, and `sweepGovernedRoots` finds only those two lines. `tap.ts:17,42,51,65-66` and `reconcile.ts:79,102,114-115` already call `admits(rel)` with one argument.
- **Sync's Landing:** `landBytes` (`atomicWrite.ts:42-52`) is Core code. Its body becomes `sole(machine().land([{ path, data: bytes, mtimeMs }]))` then `forgetParse`, and its behavior is unchanged except that the time is set on the temp before the rename, so the file never shows under its name dated now. `Core/Sync/Arrival/land.ts:96` doesn't change.
- **Why the two lines change:** `TEMP_SUFFIX` (`exclusion.ts:8,47`) matches only write-file-atomic's `target.<uint32>` temp (`fd3526733`). With that library gone it matches nothing the app makes, so the rule and `manifestAdmits`' `siblings` parameter leave. `listPathsUnder` keeps its parameter, since `exclusionScan.ts:43` reads it. *§7 · OP-1* holds the one consequence for Nathan.

##### D-5 · `UV_THREADPOOL_SIZE`: Measure or Drop

The line is `process.env.UV_THREADPOOL_SIZE ??= '16'` in `Desktop/main.ts`, after its imports. It ships only if the harness shows a Medium property rename's per-file cost near the 16-thread figure (about 1.6 ms) rather than the 4-thread one (about 2.6 ms). libuv reads the variable once, when its pool first starts, and bundled imports or Electron's own startup may start the pool first (A, *§5*). If the number doesn't move, the line doesn't ship. It isn't counted in the ledger, and it costs +1 if kept.

##### D-6 · Grouping

- **The Core:** the landing (seam, host, test machines), the recorder, the chunked sweep, per-chunk recording (`noteOwn` batch, `applyOwn`, `indexEvents`, `indexWrittenPages`), the settle reading the index, the walk race moved into the settle's turn, and the write-file-atomic residue (`TEMP_SUFFIX`, the two Sync lines).
- **The Read Cuts:** R-1 the clash check's intersection, R-2 the option sweep's narrowing, R-3 text plans over the held parse, and R-4 the walk cache seeded by the app's own writes. R-4 is new here: without it, a Context rename's owed walk reads and parses every page the rename just wrote a second time (B, *§7*).
- **Where the scouts disagreed and the code decided:**
  - **`RewriteText`:** A's `(content, file, page)` over B's `(page, file)`. A's leaves `restoreScrub.ts:195` (a Trash file the Brief says stays put), its test, and `cascade.ts`'s use of `content` untouched, and it needs no `content` or `body` field on `SweptPage`. The cost is two `_content, _file` placeholders.
  - **The clash check:** B's `every` over a smaller gate I first drafted, which read every holder whenever any file already held the new key. Nathan's "one read per file in every cascade" rules the gate out.
  - **`fileRewrites.text`:** B's form, keeping `mergeFrontmatter(content, …)`, with no new `merge` body parameter. It parses only when a Link value changes (`pageFile.ts:216`).

---

#### 2. The Core, as Code

Each diff runs from HEAD to the Core, already Biome-formatted. Per-file counts are production code lines (removed / added / net).

##### `Core/Platform/machine.ts` (−3 / +13 / +10)

```diff
--- a/Core/Platform/machine.ts
+++ b/Core/Platform/machine.ts
@@ -11,21 +11,36 @@
   kind: 'file' | 'dir' | 'other'
 }
 
+/** One file a landing writes: its bytes; the modification time it keeps in place of now, where given; and the stat it must still hold, where given, so a file another writer changed since its read is left as that writer left it. */
+export interface Landing {
+  path: string
+  data: string | Uint8Array
+  mtimeMs?: number
+  expect?: FileStat
+}
+
+/** A file's landing: the stat its new bytes hold, or why they didn't land, which costs only that file. */
+export type Landed = PromiseSettledResult<FileStat>
+
+/** Whether `now` is still the file `was` describes: the same time, size, and birth, which a file replaced whole doesn't keep. */
+export const sameFile = (was: FileStat, now: FileStat | null): boolean =>
+  now !== null &&
+  now.mtimeMs === was.mtimeMs &&
+  now.size === was.size &&
+  now.birthtimeMs === was.birthtimeMs
+
 export interface Machine {
   /** Absent → null; any other failure throws. */
   readText(p: string): Promise<string | null>
   readBytes(p: string): Promise<Uint8Array | null>
-  /** Atomic: all-or-nothing. A failed write leaves no partial file, and a concurrent reader sees the old or the new bytes, never a torn mix. */
-  writeText(p: string, text: string): Promise<void>
-  /** Atomic: all-or-nothing. A failed write leaves no partial file, and a concurrent reader sees the old or the new bytes, never a torn mix. */
-  writeBytes(p: string, bytes: Uint8Array): Promise<void>
+  /** Writes each file whole and answers each one in order: a failed file leaves no partial file and costs only itself, a concurrent reader sees the old or the new bytes, never a torn mix, and the new bytes reach the drive before the name points at them. A group is flushed together, each file holding an open handle until it lands, so a caller passes a bounded group. */
+  land(files: readonly Landing[]): Promise<Landed[]>
   stat(p: string): Promise<FileStat | null>
   /** Absent → []. */
   readDir(p: string): Promise<DirEntry[]>
   mkdir(p: string): Promise<'created' | 'exists'>
   rename(from: string, to: string): Promise<void>
   remove(p: string): Promise<void>
-  utimes(p: string, mtimeMs: number): Promise<void>
   /** Hosts without one return `p`. */
   realpath(p: string): Promise<string>
   /** Re-taking a key already held inside `fn` rejects rather than deadlocks. */
```

##### `Desktop/Platform/nodeMachine.ts` (−19 / +57 / +38)

```diff
--- a/Desktop/Platform/nodeMachine.ts
+++ b/Desktop/Platform/nodeMachine.ts
@@ -1,12 +1,17 @@
-import { createHash } from 'node:crypto'
-import { realpathSync } from 'node:fs'
-import { mkdir, readdir, readFile, realpath, rename, rm, stat, utimes } from 'node:fs/promises'
+import { createHash, randomBytes } from 'node:crypto'
+import { realpathSync, type Stats } from 'node:fs'
+import { mkdir, open, readdir, readFile, realpath, rename, rm, stat } from 'node:fs/promises'
 import { homedir } from 'node:os'
-import writeFileAtomic from 'write-file-atomic'
-import type { DirEntry, Machine } from '@pommora/core/Platform/machine'
+import {
+  type DirEntry,
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
@@ -43,24 +48,63 @@
 const entryKind = (e: { isFile(): boolean; isDirectory(): boolean }): DirEntry['kind'] =>
   e.isDirectory() ? 'dir' : e.isFile() ? 'file' : 'other'
 
-const asBuffer = (bytes: Uint8Array): Buffer =>
-  Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength)
+const fileStat = (s: Stats): FileStat => ({
+  size: s.size,
+  mtimeMs: s.mtimeMs,
+  birthtimeMs: s.birthtimeMs,
+  isDirectory: s.isDirectory(),
+})
 
+// Beside its file, so the rename stays on one volume; dotted, so the walk, the watcher, and sync never admit it; and fixed-length, so a file named to the length limit still has room for it. Answers the file's commit, which lands it once its group has flushed.
+async function stage({ path, data, mtimeMs, expect }: Landing): Promise<() => Promise<FileStat>> {
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
+      if (expect && !sameFile(expect, held && fileStat(held)))
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
-  writeText: (p, text) => outlastHolder(p, () => writeFileAtomic(p, text, { encoding: 'utf8' })),
-  writeBytes: (p, bytes) => outlastHolder(p, () => writeFileAtomic(p, asBuffer(bytes))),
+  // Every temp is written and flushed before any rename, so a group waits on the drive once rather than once a file.
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
@@ -71,7 +115,6 @@
   },
   rename: (from, to) => outlastHolder(from, () => rename(from, to)),
   remove: (p) => outlastHolder(p, () => rm(p, { recursive: true, force: true })),
-  utimes: (p, mtimeMs) => utimes(p, mtimeMs / 1000, mtimeMs / 1000),
   realpath: async (p) => posixPath(await realpath(p)),
   lock: serializeOnFile,
   sha256Hex: (input) => createHash('sha256').update(input).digest('hex'),
```

- **Temp:** `.landing-<12 hex>` beside the file, opened `wx`. The leading dot puts it under `neverWatched`'s leaf rule (`exclusion.ts:20-29`), so the watcher, Sync's manifest, and the walk never admit it, and its fixed length means a page named near the 255-byte limit still lands.
- **Mode:** the temp is created through the umask, so `chmod` runs only when the original's mode differs (A, *§6*). Owner is the app's user today and after, since write-file-atomic's `chown` already failed silently for a non-root process (`lib/index.js:65-78,128-134`).
- **Windows:** `outlastHolder` retries the rename alone, which is the step another app's open handle blocks, and the handle closes before it.
- **Open Handles:** a group holds one descriptor per file until it lands, so a chunk of 64 holds 64.

##### `Core/Files/atomicWrite.ts` (−32 / +50 / +18)

```diff
--- a/Core/Files/atomicWrite.ts
+++ b/Core/Files/atomicWrite.ts
@@ -2,41 +2,68 @@
 import { stableStringify } from './stableJson'
 import { fail, ok, type Result } from '../Contract/result'
 import { forgetParse } from './walkCache'
-import { noteOwn, recordWrite, reportRename } from './writeEcho'
-import { machine } from '../Platform/machine'
-import { basename, dirname, join } from '../Paths/posix'
+import { type FileEvent, noteOwn, recordWrite, reportRename } from './writeEcho'
+import { type FileStat, type Landed, type Landing, machine } from '../Platform/machine'
+import { basename, dirname, isMarkdownFile, join } from '../Paths/posix'
 import { foldKey } from '../Paths/caseFold'
 import { newId } from '../Nexus/ids'
 import { nexusConfig } from '../Paths/paths'
 import { NEXUS_CONFIG_FILES, type NexusConfigFile } from '../Paths/nexusPaths'
 
-async function land(filePath: string, data: string): Promise<void> {
-  recordWrite(filePath, data)
-  await machine().writeText(filePath, data)
+/** Lands the app's own writes as one group under the locks their callers hold: each echo is recorded before its name points at the new bytes, a file kept at its time drops the walk cache's parse that time would otherwise vouch for, and the files that landed are noted as one batch carrying the stat each now holds. Text reports 'change' for a new file too, since the tree and the index take an add and a change alike. */
+export async function landOwn(
+  files: readonly Landing[],
+  { event = 'change', bodyOnly }: { event?: 'add' | 'change'; bodyOnly?: boolean } = {},
+): Promise<Landed[]> {
+  for (const { path, data } of files) recordWrite(path, data)
+  const landed = await machine().land(files)
+  const events: FileEvent[] = []
+  files.forEach(({ path, data, mtimeMs }, i) => {
+    const at = landed[i]
+    if (at.status === 'rejected') return
+    if (mtimeMs !== undefined) forgetParse(path)
+    const text = typeof data === 'string' ? data : undefined
+    events.push({ event, absPath: path, origin: 'own', text, bodyOnly, stat: at.value })
+  })
+  await noteOwn(...events)
+  return landed
 }
 
-// Both text writers report 'change' for a new file too, since the tree and the index take an add and a change alike.
+/** A lone file's landing, its failure thrown. */
+async function sole(landing: Promise<Landed[]>): Promise<void> {
+  const [landed] = await landing
+  if (landed.status === 'rejected') throw landed.reason
+}
+
 export async function atomicWriteFile(
   filePath: string,
   data: string,
   bodyOnly = false,
 ): Promise<void> {
-  await land(filePath, data)
-  await noteOwn({ event: 'change', absPath: filePath, origin: 'own', text: data, bodyOnly })
+  await sole(landOwn([{ path: filePath, data }], { bodyOnly }))
 }
 
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
+/** A file's stat, then its text, so the stat a rewrite is checked against never postdates the text it works from; null when either is missing. */
+export async function readHeld(file: string): Promise<{ was: FileStat; before: string } | null> {
+  const was = await machine()
+    .stat(file)
+    .catch(() => null)
+  const before = was && (await readTextOrNull(file))
+  return was && before !== null ? { was, before } : null
 }
+
+/** Lands rewrites of files `readHeld` read, under the locks their reads still hold: a page keeps its modification time, and a file that changed since its read is refused, left as its writer left it. */
+export const landRewrites = (
+  rewrites: readonly { file: string; was: FileStat; after: string }[],
+): Promise<Landed[]> =>
+  landOwn(
+    rewrites.map(({ file, was, after }) => ({
+      path: file,
+      data: after,
+      expect: was,
+      mtimeMs: isMarkdownFile(file) ? was.mtimeMs : undefined,
+    })),
+  )
 
 // Sync's landing records no echo and notes no event, so the watcher reports it like any outside write and the tree and index take it from that event.
 export async function landBytes(
@@ -44,18 +71,13 @@
   bytes: Uint8Array,
   mtimeMs: number,
 ): Promise<void> {
-  await machine().writeBytes(filePath, bytes)
-  await machine()
-    .utimes(filePath, mtimeMs)
-    .catch(() => {})
+  await sole(machine().land([{ path: filePath, data: bytes, mtimeMs }]))
   forgetParse(filePath)
 }
 
 export async function atomicWriteBinary(filePath: string, data: Uint8Array): Promise<void> {
-  recordWrite(filePath, data)
-  await machine().writeBytes(filePath, data)
   // 'add', since the asset arm lists a path only on an add, where a 'change' bumps the version of one already listed.
-  await noteOwn({ event: 'add', absPath: filePath, origin: 'own' })
+  await sole(landOwn([{ path: filePath, data }], { event: 'add' }))
 }
 
 /** Under the SOURCE path's lock, the same key every other write to it takes: a write queued behind the move fails not-found rather than recreating the vacated file as a ghost. `landed` runs before sync hears of the rename, so it pushes under what the landing settled. */
@@ -321,11 +343,10 @@
   rewrite: (content: string) => string | null,
 ): Promise<boolean> {
   return machine().lock(file, async () => {
-    const content = await readTextOrNull(file)
-    if (content === null) return false
-    const next = rewrite(content)
-    if (next === null) return false
-    await rewritePreservingTimes(file, next)
+    const read = await readHeld(file)
+    const after = read && rewrite(read.before)
+    if (read === null || after === null) return false
+    await sole(landRewrites([{ file, was: read.was, after }]))
     return true
   })
 }
```

- **Race-Only Change, Disclosed (A's In-Flight Decision):** `rewritePageSerialized` now passes `expect`, so an outside write landing during its one flush makes it reject with "changed while its write waited" rather than overwrite. Its callers already treat a rejection as a failed stamp, remint, tile rewrite, or link write (`tilesFile.ts:313`, `remint.ts:72-74`).
- **Vanish Semantics:** a page that vanished before its rewrite now answers `false` where `rewritePreservingTimes` threw "vanished before its rewrite". The stat moved ahead of the read, so this is the same "nothing to rewrite" the read already answered.

##### `Core/Files/writeEcho.ts` (−6 / +6 / 0)

```diff
--- a/Core/Files/writeEcho.ts
+++ b/Core/Files/writeEcho.ts
@@ -1,6 +1,6 @@
 // The app's writes and the watcher's events pass through here: the echo window tells the app's writes from outside ones, the own tap lands each write as an event (`Core/Nexus/settle.ts` installs it when imported, so a process that writes without importing the settle reaches neither the tree nor the index), and the write and watch taps feed sync.
 
-import { machine } from '../Platform/machine'
+import { type FileStat, machine } from '../Platform/machine'
 
 // A write recorded with its bytes is an echo while the file still holds them, however late its event arrives, until an event finds other bytes there, so an outside write reaches the watcher even when it restores the app's bytes; a move or rename, recorded without bytes, is an echo for the whole window.
 type Echo = { at: number; hash?: string }
@@ -36,10 +36,10 @@
 
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
@@ -50,13 +50,13 @@
 
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

##### `Core/Nexus/governedSweep.ts` (−30 / +23 / −7)

```diff
--- a/Core/Nexus/governedSweep.ts
+++ b/Core/Nexus/governedSweep.ts
@@ -1,11 +1,5 @@
-import {
-  atomicWriteFile,
-  jsonText,
-  parseJsonObject,
-  readTextOrNull,
-  rewritePreservingTimes,
-} from '../Files/atomicWrite'
-import { machine } from '../Platform/machine'
+import { jsonText, landRewrites, parseJsonObject, readHeld } from '../Files/atomicWrite'
+import { type FileStat, machine } from '../Platform/machine'
 import { damagedFolders } from './treePatch'
 import type { NexusTree } from './tree'
 import { isMarkdownFile, join, relative } from '../Paths/posix'
@@ -25,7 +19,7 @@
 export interface SweepResult {
   /** Each file the sweep wrote, or a dry run would write, with the text it held before and the text the write leaves. */
   touched: Map<string, { before: string; after: string }>
-  /** Each file left as it was that the sweep should have reached: one it couldn't read, and one whose root can't round-trip. */
+  /** Each file left as it was that the sweep should have reached: one it couldn't read, one whose root can't round-trip, and one that changed outside the app while its chunk waited or whose landing failed. */
   skipped: string[]
   /** The files among `skipped` whose root can't round-trip, which only a fix by hand lets a sweep reach, so they're named once and let go (B-5). */
   refused: string[]
@@ -48,11 +42,15 @@
     ...damagedFolders(tree.unreadable).filter((u) => u.kind === 'collection'),
   ].map((c) => join(root, c.path))
 
-// A file whose lock or write throws costs only itself, so the files after it are still reached.
-const guarded = (file: string, missed: string[], body: () => Promise<void>): Promise<void> =>
-  machine()
-    .lock(file, body)
-    .catch(() => void missed.push(file))
+/** The files a sweep holds and lands together, so their bytes reach the drive in one flush. */
+const CHUNK = 64
+
+/** Runs `fn` holding each file's lock, taken in sorted order, so two sweeps sharing files never each hold a lock the other waits on; no other writer holds two file locks at once. */
+const holding = (files: readonly string[], fn: () => Promise<void>): Promise<void> =>
+  [...files]
+    .sort()
+    .reduceRight<() => Promise<void>>((inner, file) => () => machine().lock(file, inner), fn)()
+
 /** A file's text after `plan`, by its kind: null when nothing changes, undefined when its root can't round-trip (an Unknown page, a sidecar nobody can parse), which won't read any better on a retry, so it's left byte-identical. */
 function rewritten(plan: SweepPlan, file: string, content: string): string | null | undefined {
   if (!isMarkdownFile(file)) {
@@ -67,33 +65,31 @@
   return rewriteRoot((root) => plan.raw(root, file), plan.above?.(page.raw, file))(page)
 }
 
-/** Files are absolute, pages and Space sidecars alike. */
+/** Files are absolute, pages and Space sidecars alike. A chunk's files are held from their read through their record, so no write of the app's lands between, and land in one group; a dry run stops at the read. */
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
+  // A path listed twice would take its own lock twice within one chunk.
+  const unique = [...new Set(files)]
+  for (let at = 0; at < unique.length; at += CHUNK) {
+    const chunk = unique.slice(at, at + CHUNK)
+    await holding(chunk, async () => {
+      const due: { file: string; was: FileStat; before: string; after: string }[] = []
+      for (const file of chunk) {
+        const read = await readHeld(file)
+        const after = read && rewritten(plan, file, read.before)
+        if (read === null || after === undefined) out.skipped.push(file)
+        if (after === undefined) out.refused.push(file)
+        if (read && typeof after === 'string') due.push({ file, ...read, after })
       }
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
+      const landed = dry ? [] : await landRewrites(due)
+      due.forEach(({ file, before, after }, i) => {
+        if (dry || landed[i].status === 'fulfilled') out.touched.set(file, { before, after })
+        else out.skipped.push(file)
+      })
     })
   }
   return out
```

- **Order:** files are read and filed into `touched` in input order, and only lock acquisition is sorted. `skipped` lists read-pass skips before a chunk's landing refusals, which matters only to a test comparing a mixed array.
- **Dry Runs:** `sweepCount` reads under the chunk's locks and lands nothing, as `guarded` held the lock today.

##### `Core/Nexus/settle.ts` (−6 / +7 / +1)

```diff
--- a/Core/Nexus/settle.ts
+++ b/Core/Nexus/settle.ts
@@ -14,7 +14,7 @@
 import { stampMissing } from './adopt'
 import {
   applyEvents,
-  indexEvent,
+  indexEvents,
   nothingOwed,
   oweAgain,
   oweCascade,
@@ -50,18 +50,19 @@
 
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

The epoch moves once per landing, after every rename in it and before its record (`landOwn` calls `noteOwn` only after `machine().land` returns), so a walk that read earlier discards (`liveTree.ts:118-119`). An empty landing moves nothing.

##### `Core/Nexus/fileEvents.ts` (−18 / +12 / −6)

```diff
--- a/Core/Nexus/fileEvents.ts
+++ b/Core/Nexus/fileEvents.ts
@@ -1,4 +1,4 @@
-// Every change to a Nexus file is one event through here, whoever made it: the watcher's batch for an outside edit, the app's own write as it lands. An event maintains the index, then patches the held tree from the one file that changed; one no arm can place owes a walk, and the rest of its batch still applies.
+// Every change to a Nexus file is one event through here, whoever made it: the watcher's batch for an outside edit, the app's own writes as they land. A batch maintains the index in one commit, then each event patches the held tree from the one file that changed; one no arm can place owes a walk, and the rest of its batch still applies.
 
 import { basename, isMarkdownFile, join, relDirname, relative } from '../Paths/posix'
 import { escapes } from '../Paths/pathSafety'
@@ -29,7 +29,7 @@
   deindexPath,
   type HeadingRenameSeen,
   type IndexSeen,
-  indexWrittenPage,
+  indexWrittenPages,
   moveIndexPaths,
 } from '../Index/indexSeed'
 import type { ConnPage } from '../Connections/pageIndex'
@@ -270,27 +270,22 @@
 
 // ── The index's half ──
 
-export async function indexEvent(root: string, ev: FileEvent): Promise<void> {
+// Removals and moves first, in order, then every written page in one commit, each from the text its writer handed over or from its file as it now stands, so it reads right whichever event came first. What the app's own writes show is theirs to have spoken for, so only what an outside one shows is owed.
+export async function indexEvents(root: string, events: readonly FileEvent[]): Promise<void> {
   try {
-    switch (ev.event) {
-      case 'move':
-        await moveIndexPaths(root, ev.from, ev.absPath)
-        return
-      case 'unlink':
-      case 'unlinkDir': {
+    const written: Changed[] = []
+    for (const ev of events) {
+      if (ev.event === 'add' || ev.event === 'change') written.push(ev)
+      else if (ev.event === 'move') await moveIndexPaths(root, ev.from, ev.absPath)
+      else if (ev.event !== 'addDir') {
         const seen = await deindexPath(root, ev.absPath)
-        if (ev.origin === 'watched') oweSeen(root, seen)
-        return
-      }
-      case 'addDir':
-        return
-      case 'add':
-      case 'change': {
-        const seen = await indexWrittenPage(root, ev.absPath, ev.text)
         if (ev.origin === 'watched') oweSeen(root, seen)
-        return
       }
     }
+    const outside = written.filter((ev) => ev.origin === 'watched')
+    const own = written.filter((ev) => ev.origin === 'own')
+    oweSeen(root, await indexWrittenPages(root, outside))
+    await indexWrittenPages(root, own)
   } catch (e) {
     console.error('events: the index missed an event and reseeds:', errText(e))
     owedFor(root).corpus = true
@@ -651,8 +646,8 @@
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

- **Why the index can move ahead of the loop:** no `applyOne` arm reads the index. `fileEvents.ts` imports `contentIndexStore` only for `oweSeen` (`:36,302`). A watched event carries no text, so its row reads the disk as it stands whatever order its batch came in. An own batch is homogeneous, and the partition keeps a mixed one right.
- **Why the record is safe under 64 held locks:** the JSON arms reach locking readers (`readKept`, `readAppFile`, through `readLast`, `atomicWrite.ts:186`) only through `jsonOf`, which skips the read when `ev.text` is set (`fileEvents.ts:326-331`), and every own text landing sets it. The one unconditional `readAppFile` (`:630`) reads a `_tiles.json`, which is never a chunk key. Page events read folders through `readFolder` and container sidecars through `readJsonObject`, neither of which locks. **This is a precondition:** a change-event arm that ever takes a page lock would be refused re-entrantly for a chunk file.

##### `Core/Index/indexSeed.ts` (−22 / +32 / +10)

```diff
--- a/Core/Index/indexSeed.ts
+++ b/Core/Index/indexSeed.ts
@@ -27,7 +27,7 @@
   type Relation,
   type PageIndexEntry,
 } from '../Platform/stores'
-import { machine } from '../Platform/machine'
+import { type FileStat, machine } from '../Platform/machine'
 import { readTextOrNull } from '../Files/atomicWrite'
 import { corpusFiles, corpusFilesUnder } from '../Files/walk'
 import { outsideContent } from '../Paths/exclusion'
@@ -105,29 +105,38 @@
   return pageOf(rel, stat)
 }
 
-// Re-indexes a written page, from `text` when its writer hands it over, and reports what it saw.
-export async function indexWrittenPage(
+// Re-indexes written pages in one commit, each from the text and stat its writer hands over or else from its file, a page listed twice as it last stood, and reports what it saw.
+export async function indexWrittenPages(
   root: string,
-  abs: string,
-  text?: string,
+  written: readonly { absPath: string; text?: string; stat?: FileStat }[],
 ): Promise<IndexSeen> {
-  if (!isMarkdownFile(abs)) return NOTHING_SEEN
-  const rel = await relCorpusPath(root, abs)
-  if (!rel) return NOTHING_SEEN
-  const st = await machine()
-    .stat(abs)
-    .catch(() => null)
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
+  const rows: PageIndexRow[] = []
+  for (const { absPath, text, stat } of new Map(written.map((w) => [w.absPath, w])).values()) {
+    const rel = isMarkdownFile(absPath) && (await relCorpusPath(root, absPath))
+    if (!rel) continue
+    const st =
+      stat ??
+      (await machine()
+        .stat(absPath)
+        .catch(() => null))
+    if (!st) {
+      seen.vanished.push(...unindexed(rel))
+      continue
+    }
+    // An unreadable page keeps its rows, so a sweep the index seeds still reaches the file and counts it.
+    const content = text ?? (await readTextOrNull(absPath))
+    if (content === null) continue
+    const prior = readIndexedStat(rel)
+    const entry = extractPageIndex(content)
+    rows.push({ path: rel, entry, stat: { mtimeMs: st.mtimeMs, size: st.size } })
+    const [now] = idOf(entry)
+    if (prior?.id === now) continue
+    seen.vanished.push(...pageOf(rel, prior))
+    if (now !== undefined) seen.landed.push(now)
+  }
+  if (rows.length) seen.renames = reindex(rows)
+  return seen
 }
 
 // Writes each page's rows and reports the heading renames they show against the rows they replace: one heading gone and one fresh heading at its ordinal, the outline otherwise unchanged. Anything murkier is left to the muted heading.
@@ -171,12 +180,13 @@
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
```

One `readHeadings` and one `upsertPageIndexes` transaction per chunk, and no `stat` for an own row, since the landing's stat rides the event. The per-row `readIndexedStat` stays (about 10 µs).

##### `Core/Properties/optionOps.ts` — the Settle Reads the Index (−9 / +11 / +2)

```diff
--- a/Core/Properties/optionOps.ts
+++ b/Core/Properties/optionOps.ts
@@ -119,7 +119,7 @@
   })
 }
 
-/** Registers each Multi-Select member the files at `rels` hold beyond their definition — a page, a container's pages, or a Space — or every file's when `rels` is omitted, in one write. It reads under the schema lock, so a cascade is read whole: an open's pages from the index its seed just filled, and a settle's from the files it was handed, which a rescope's reseed has yet to index. */
+/** Registers each Multi-Select member the files at `rels` hold beyond their definition — a page, a container's pages, or a Space — or every file's when `rels` is omitted, in one write. It reads under the schema lock, so a cascade is read whole: each page from its index row, which every event writes ahead of its settle, and from its file where the index holds none, as for a page a rescope just brought into reach. */
 export async function registerHeldOptions(root: string, rels?: readonly string[]): Promise<void> {
   const r = await serializeSchemaOp(root, async (): Promise<Result<null>> => {
     const tree = heldTreeOf(root)
@@ -135,22 +135,24 @@
       ...tree.collections.map((c) => c.path),
       ...tree.contexts.flatMap((g) => g.spaces.map((s) => s.path)),
     ]
+    const pages = new Map<string, PropertyDefinition[]>()
     for (const rel of rels ?? everywhere) {
-      const pages = isMarkdownFile(rel) ? [rel] : null
-      const space = pages ? null : spaceAt(tree, rel)
+      const page = isMarkdownFile(rel)
+      const space = page ? null : spaceAt(tree, rel)
       const defs = holderSchema(tree, space ?? rel).filter(
         (d) => PROPERTY_TYPES[d.type].registersMembers,
       )
       if (!defs.length) continue
-      const files = pages ?? pagePathsIn(containerAt(tree, rel))
-      const indexed = rels || space ? null : readPageRelations(files)
       if (space) collect(space.values ?? {}, defs)
-      else if (indexed) for (const { values } of Object.values(indexed.pages)) collect(values, defs)
       else
-        for (const page of files) {
-          const read = await readPageRecord(join(root, page), page).catch(() => null)
-          if (read?.kind === 'read') collect(read.fm, defs)
-        }
+        for (const file of page ? [rel] : pagePathsIn(containerAt(tree, rel))) pages.set(file, defs)
+    }
+    const indexed = readPageRelations([...pages.keys()])?.pages
+    for (const [file, defs] of pages) {
+      const row = indexed?.[file]
+      const read = row ? null : await readPageRecord(join(root, file), file).catch(() => null)
+      const values = row?.values ?? (read?.kind === 'read' ? read.fm : null)
+      if (values) collect(values, defs)
     }
     if (!held.size) return ok(null)
     const notes = await readNotes(root)
```

One query in place of one `stat`, read, and parse per changed page (Investigation T1). A page with no row (one a rescope just brought into reach, or any page with no index installed) is still read. `page_values` holds `JSON.stringify` of `valuesOf`, which carries every value an option word can be (B, *§5*). A row left stale by an index failure reads stale until that page's next event, and that failure already owes a reseed (`fileEvents.ts:296`).

##### `Core/Nexus/mutate.ts` and `Core/Nexus/finishOwed.ts` — the Walk Race (−6 / +12 / +6)

```diff
--- a/Core/Nexus/mutate.ts
+++ b/Core/Nexus/mutate.ts
@@ -250,10 +250,14 @@
       return done(await underContexts(root, () => setSpaceColor(root, req.spaceId, req.color)))
 
     case 'renameContext':
-      return underContexts(root, () => renameContextOp(root, req.contextId, req.newName))
+      return underContexts(root, () =>
+        inSettleTurn(root, () => renameContextOp(root, req.contextId, req.newName)),
+      )
 
     case 'renameSpace':
-      return underContexts(root, () => renameSpaceOp(root, req.spaceId, req.newName))
+      return underContexts(root, () =>
+        inSettleTurn(root, () => renameSpaceOp(root, req.spaceId, req.newName)),
+      )
 
     case 'reorderContexts':
       return reorderContextsOp(ctx, req)
```

```diff
--- a/Core/Nexus/finishOwed.ts
+++ b/Core/Nexus/finishOwed.ts
@@ -83,10 +83,12 @@
       }
     }
   }
-  await underContexts(root, async () => {
-    await each('context')
-    await each('space')
-  })
+  await underContexts(root, () =>
+    inSettleTurn(root, async () => {
+      await each('context')
+      await each('space')
+    }),
+  )
   await serializeSchemaOp(root, () => each('property'))
   await inSettleTurn(root, async () => {
     await each('container')
```

The Context and Space renames now run in the settle's turn inside `underContexts`, as delete and restore already do (`mutate.ts:134,153`), which makes `mutate.ts:88`'s own rule true for them. A settle the watcher queues mid-sweep waits for the turn, and the owed walk is paid once after the sweep. `inSettleTurn` forbids awaiting a turn inside it (`settle.ts:259`): nothing on these paths does (B, *§7*), and `finishOwed.ts:91` already runs a turn at the same level, so `finishOwed` is never itself called inside one.

##### `Core/Paths/exclusion.ts`, `Core/Sync/Client/push.ts`, `Core/Sync/Client/reconcile.ts` (−9 / +4 / −5)

```diff
--- a/Core/Paths/exclusion.ts
+++ b/Core/Paths/exclusion.ts
@@ -5,8 +5,6 @@
 /** None is content, and a journal's churn must never cost a walk. */
 const STORE_FILE = /\.db(-wal|-shm)?$/
 
-const TEMP_SUFFIX = /\.\d+$/
-
 export function hiddenName(name: string): boolean {
   return name.startsWith('.') || name.startsWith('_')
 }
@@ -34,17 +32,13 @@
   segs[1] === ASSETS_DIRNAME &&
   segs[3] === THUMBNAILS_SEGMENT
 
-export function manifestAdmits(
-  scope: WatchScope,
-): (rel: string, siblings?: ReadonlySet<string>) => boolean {
+export function manifestAdmits(scope: WatchScope): (rel: string) => boolean {
   const isExcluded = excludedMatcher(scope.excluded)
   const isAsset = assetMatcher(scope.assetDir)
   const assetDepth = rootSegs(scope.assetDir).length
-  return (rel, siblings) => {
+  return (rel) => {
     if (!rel || rel === '..' || rel.startsWith('../') || rel.startsWith('/')) return false
     const segs = rel.split('/')
-    const name = segs[segs.length - 1]
-    if (TEMP_SUFFIX.test(name) && siblings?.has(name.replace(TEMP_SUFFIX, ''))) return false
     if (segs[0] === TRASH_DIR) return !neverWatched(segs.slice(1)) && !isExcluded(segs.slice(1))
     if (thumbnailSegs(segs)) return false
     if (isAsset(segs)) return !neverWatched(segs.slice(assetDepth))
```

```diff
--- a/Core/Sync/Client/push.ts
+++ b/Core/Sync/Client/push.ts
@@ -162,7 +162,7 @@
     if (stat?.isDirectory === true) {
       const under = new Set([
         ...readBasesUnder(rel).map((row) => row.path),
-        ...(await listPathsUnder(root, abs, (child, _kind, siblings) => admits(child, siblings))),
+        ...(await listPathsUnder(root, abs, admits)),
       ])
       for (const child of under) await collect(child)
       return
```

```diff
--- a/Core/Sync/Client/reconcile.ts
+++ b/Core/Sync/Client/reconcile.ts
@@ -72,7 +72,7 @@
 
 export function admittedPaths(session: Session): Promise<string[]> {
   const admits = manifestAdmits(session.scope)
-  return listPathsUnder(session.root, session.root, (rel, _kind, siblings) => admits(rel, siblings))
+  return listPathsUnder(session.root, session.root, admits)
 }
 
 export async function reconcile(session: Session): Promise<void> {
```

##### `Desktop/package.json`

`"write-file-atomic": "^8.0.0"` (`:16`) and `"@types/write-file-atomic": "^4.0.3"` (`:23`) leave, then `npm install` prunes the lockfile.

##### Test Machines (Not Counted in Production)

```diff
--- a/Core/Testing/machines.ts
+++ b/Core/Testing/machines.ts
@@ -1,9 +1,17 @@
 import { AsyncLocalStorage } from 'node:async_hooks'
 import { createHash } from 'node:crypto'
+import type { Stats } from 'node:fs'
 import { mkdir, readdir, readFile, rename, rm, stat, utimes, writeFile } from 'node:fs/promises'
-import { dirname } from '../Paths/posix'
+import { dirname, join } from '../Paths/posix'
 import { realpathPosix, windows } from './hostFs'
-import { type DirEntry, type FileStat, type Machine, machine } from '../Platform/machine'
+import {
+  type DirEntry,
+  type FileStat,
+  type Landing,
+  type Machine,
+  machine,
+  sameFile,
+} from '../Platform/machine'
 
 const sha256Hex = (input: string | Uint8Array): string =>
   createHash('sha256').update(input).digest('hex')
@@ -69,21 +77,33 @@
   let clock = 1000
   const encoder = new TextEncoder()
   const decoder = new TextDecoder()
-  const put = (p: string, text: string): void => {
-    files.set(p, { text, mtimeMs: ++clock })
-  }
+  const entryStat = (e: { text: string; mtimeMs: number }): FileStat => ({
+    size: e.text.length,
+    mtimeMs: e.mtimeMs,
+    birthtimeMs: null,
+    isDirectory: false,
+  })
   const machine: Machine = {
     readText: async (p) => files.get(p)?.text ?? null,
     readBytes: async (p) => {
       const e = files.get(p)
       return e ? encoder.encode(e.text) : null
     },
-    writeText: async (p, text) => put(p, text),
-    writeBytes: async (p, bytes) => put(p, decoder.decode(bytes)),
+    land: (list) =>
+      Promise.allSettled(
+        list.map(async ({ path, data, mtimeMs, expect }) => {
+          if (dirs.has(path)) throw new Error(`EISDIR ${path}`)
+          if (expect && !sameFile(expect, await machine.stat(path)))
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
@@ -109,10 +129,6 @@
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
@@ -139,33 +155,37 @@
 const entryKind = (e: { isFile(): boolean; isDirectory(): boolean }): DirEntry['kind'] =>
   e.isDirectory() ? 'dir' : e.isFile() ? 'file' : 'other'
 
-async function atomicWrite(p: string, data: string | Uint8Array): Promise<void> {
-  const tmp = `${p}.${process.pid}.${Math.random().toString(36).slice(2)}.tmp`
+const toStat = (s: Stats): FileStat => ({
+  size: s.size,
+  mtimeMs: s.mtimeMs,
+  birthtimeMs: s.birthtimeMs,
+  isDirectory: s.isDirectory(),
+})
+
+// The fast double Core's suites install: the host's temp and rename without its flush or its mode, which `nodeMachine.test.ts` carries.
+async function landOnDisk({ path, data, mtimeMs, expect }: Landing): Promise<FileStat> {
+  const was = await absentToNull(stat(path))
+  if (expect && !sameFile(expect, was && toStat(was))) throw new Error(`${path} changed`)
+  const tmp = join(dirname(path), `.landing-${process.pid}-${Math.random().toString(36).slice(2)}`)
   try {
-    await writeFile(tmp, data)
-    await rename(tmp, p)
+    await writeFile(tmp, data, { flag: 'wx' })
+    if (mtimeMs !== undefined) await utimes(tmp, mtimeMs / 1000, mtimeMs / 1000)
+    await rename(tmp, path)
   } catch (e) {
     await rm(tmp, { force: true })
     throw e
   }
+  return toStat(await stat(path))
 }
 
 export function diskMachine(): Machine {
   return {
     readText: (p) => absentToNull(readFile(p, 'utf8')),
     readBytes: (p) => absentToNull(readFile(p)),
-    writeText: (p, text) => atomicWrite(p, text),
-    writeBytes: (p, bytes) => atomicWrite(p, bytes),
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
+      return s && toStat(s)
     },
     async readDir(p) {
       const entries = await absentToNull(readdir(p, { withFileTypes: true }))
@@ -176,7 +196,6 @@
     },
     rename,
     remove: (p) => rm(p, { recursive: true, force: true }),
-    utimes: (p, mtimeMs) => utimes(p, mtimeMs / 1000, mtimeMs / 1000),
     realpath: realpathPosix,
     lock: chainLock(),
     sha256Hex,
```

```diff
--- a/Core/Testing/machineContract.ts
+++ b/Core/Testing/machineContract.ts
@@ -14,6 +14,10 @@
     let machine: Machine
     let root: string
     const at = (rel: string): string => `${root}/${rel}`
+    const write = async (rel: string, data: string | Uint8Array): Promise<void> => {
+      const [landed] = await machine.land([{ path: at(rel), data }])
+      if (landed.status === 'rejected') throw landed.reason
+    }
 
     beforeEach(async () => {
       ;({ machine, root } = await make())
@@ -27,26 +31,27 @@
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
@@ -58,7 +63,7 @@
 
     it('lists a directory by kind and an absent one as []', async () => {
       await machine.mkdir(at('sub'))
-      await machine.writeText(at('a.txt'), 'x')
+      await write('a.txt', 'x')
       const entries = (await machine.readDir(root)).sort((a, b) => a.name.localeCompare(b.name))
       expect(entries).toEqual([
         { name: 'a.txt', kind: 'file' },
@@ -73,24 +78,58 @@
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
+    it('a landing keeps the time it is given and answers the stat the file then holds', async () => {
+      const [landed] = await machine.land([
+        { path: at('t.txt'), data: 'v', mtimeMs: 2_000_000_000_000 },
+      ])
+      expect(landed).toEqual({ status: 'fulfilled', value: await machine.stat(at('t.txt')) })
       expect((await machine.stat(at('t.txt')))?.mtimeMs).toBe(2_000_000_000_000)
     })
 
+    it('refuses a file changed since its expected stat and lands the rest of its group', async () => {
+      await write('a.md', 'read')
+      const was = await machine.stat(at('a.md'))
+      await write('a.md', 'outside, longer')
+      const [a, b] = await machine.land([
+        { path: at('a.md'), data: 'mine', expect: was ?? undefined },
+        { path: at('b.md'), data: 'other' },
+      ])
+      expect(a.status).toBe('rejected')
+      expect(b.status).toBe('fulfilled')
+      expect(await machine.readText(at('a.md'))).toBe('outside, longer')
+      expect(await machine.readText(at('b.md'))).toBe('other')
+    })
+
+    it('refuses a file removed since its expected stat and creates nothing', async () => {
+      await write('gone.md', 'read')
+      const was = await machine.stat(at('gone.md'))
+      await machine.remove(at('gone.md'))
+      const [landed] = await machine.land([
+        { path: at('gone.md'), data: 'mine', expect: was ?? undefined },
+      ])
+      expect(landed.status).toBe('rejected')
+      expect(await machine.stat(at('gone.md'))).toBeNull()
+    })
+
+    it('a file that fails to land leaves no temp beside it', async () => {
+      await machine.mkdir(at('dir'))
+      const [landed] = await machine.land([{ path: at('dir'), data: 'x' }])
+      expect(landed.status).toBe('rejected')
+      expect((await machine.readDir(root)).map((e) => e.name)).toEqual(['dir'])
+    })
+
     it('realpath answers the root it was given', async () => {
       expect(await machine.realpath(root)).toBe(root)
     })
```

```diff
--- a/Core/Testing/hostFs.ts
+++ b/Core/Testing/hostFs.ts
@@ -2,8 +2,8 @@
 import { mkdir, readFile, realpath, writeFile } from 'node:fs/promises'
 import { tmpdir } from 'node:os'
 import { vi } from 'vitest'
-import * as atomicWrite from '../Files/atomicWrite'
 import { listFilesRecursive } from '../Files/walk'
+import { type Landed, machine } from '../Platform/machine'
 import { contextsDir, nexusConfig, sidecarPath } from '../Paths/paths'
 import { CONTEXTS_REGISTRY_REL, NEXUS_CONFIG_FILES, SPACE_SIDECAR } from '../Paths/nexusPaths'
 import { basename, dirname, join } from '../Paths/posix'
@@ -36,21 +36,19 @@
     ),
   )
 
-const writers = {
-  atomicWriteFile: atomicWrite.atomicWriteFile,
-  rewritePreservingTimes: atomicWrite.rewritePreservingTimes,
-  editJsonStrict: atomicWrite.editJsonStrict,
+/** Fails each landing `refuses` picks, as a disk refusing the write, and lands every other file. */
+export const refuseLandings = (refuses: (file: string) => boolean) => {
+  const m = machine()
+  const real = m.land.bind(m)
+  return vi.spyOn(m, 'land').mockImplementation(async (files) => {
+    const landed = await real(files.filter((f) => !refuses(f.path)))
+    return files.map(
+      (f): Landed =>
+        refuses(f.path) ? { status: 'rejected', reason: new Error('refused') } : landed.shift()!,
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
-}
-
 /** A Space the tree holds: its sidecar, and its Context in the Context list when the list doesn't name it. */
 export const seedSpaceSidecar = async (
   root: string,
```

---

#### 3. The Read Cuts

All four go in, per Nathan. Times use the Investigation's per-operation figures on Medium: a read is about 49 µs, a parse about 65 µs, a stat about 10 µs. `sweepParse` also re-serializes for its round-trip check, so read-plus-parse is a floor of 114 µs. After the Core, a Medium property rename should run about 20-25 s, so each cut is a few percent of one rename.

| Cut | Production Delta | Saves per Rename (Medium) |
|---|---|---|
| **R-1 · The Clash Check's Intersection** | **+15** (−5 / +20) | Property rename: 6,961 holder reads and parses before its note, **≈ 0.79 s**. Its confirmation dialog's own `rekeyPlan` saves the same again, as a separate request. |
| **R-2 · The Option Sweep's Narrowing** | **+9** (−2 / +11) | Option rename: 6,984 → 1,397 reads, 5,587 fewer read-plus-parses, **≈ 0.64 s**. The option dialogs' dry-run counts (`optionOps.ts:364,391`) narrow by the same amount. |
| **R-3 · Text Plans Over the Held Parse** | **+7** (−14 / +21) | Property rename: 6,961 parses, **≈ 0.45 s**. Context rename: 4,895, **≈ 0.32 s**. Page-rename relink: 1,535 sweep files, **≈ 0.10 s**. Link strip: 983, **≈ 0.06 s**. Each dry-run count saves the same. |
| **R-4 · The Owed Walk Reuses the Write's Parse** | **+8** (−1 / +9) | Context rename's owed walk: 4,895 reads and parses, **≈ 0.56 s** (its stats stay). Any later walk reaching pages a sweep kept at their time also hits. |
| **All Four** | **+39** (−22 / +61) | |

##### R-1 · The Clash Check Reads Only Files Holding Both Keys

`findHolders` gains `every`. The index's key lists are intersected rather than joined, and a Space must hold both keys. An index that isn't ready still falls back to the corpus, and unreadable Spaces are still listed and read (`keyHolders.ts:98-100`). The check trusts the index exactly as the sweep's own file list already does (`keyHolders.ts:82-88`).

```diff
--- a/Core/Index/keyHolders.ts
+++ b/Core/Index/keyHolders.ts
@@ -27,6 +27,8 @@
   title?: string
   id?: string
   moved?: FolderMove
+  /** Only the files holding every key rather than any, as a rename's clash check asks. */
+  every?: true
 }
 
 /** A holder a finder read: the id `byId` addresses it by, the query keys it holds, their values as written, or null when it couldn't be read, and, for a page read from its own file, the key each one's line stood above, in the page's own key order. */
@@ -74,6 +76,15 @@
 ): string[] =>
   tree.contexts.flatMap((g) => g.spaces.filter(holds).map((s) => sidecarAt(root, s.path, moved)))
 
+// The paths listed under any of `lists`, or under all of them with `every`.
+const heldBy = (lists: string[][], every?: true): string[] =>
+  every
+    ? lists.reduce((all, list) => {
+        const listed = new Set(list)
+        return all.filter((p) => listed.has(p))
+      })
+    : [...new Set(lists.flat())]
+
 // The pages and Spaces holding any of `keys`: pages from the content index (the corpus before it's ready), Spaces from the tree. A property's key means something only where a schema governs it, so `governed` reaches the pages of Collections and the Archive, and `{ collection }` one Collection's and its Archive's; a Context tag means something on any page, so `anywhere` reaches every one. Both of those reach every Space holding the key, every Space whose row order lists `id`, and every Space the tree couldn't read, which may hold anything. `title` narrows a Context key's pages to those naming that Space, and `moved` points a Space under a folder the op moved ahead of the tree.
 // With `read`, each file is read once: `held` lists each one holding a key or that couldn't be read, with the keys the index last read it holding, and `files` leaves out a holder no id addresses, which a strip passes over since no restore could put its value back.
 export async function findHolders(root: string, q: HolderQuery, read?: 'values'): Promise<Holders> {
@@ -83,13 +94,20 @@
   const pages = await pagesInReach(
     root,
     tree,
-    rels.includes(null) ? null : [...new Set(rels.flatMap((r) => r ?? []))],
+    rels.includes(null)
+      ? null
+      : heldBy(
+          rels.map((r) => r ?? []),
+          q.every,
+        ),
     q.reach,
   )
+  const holdsKey =
+    (s: SpaceNode) =>
+    (key: string): boolean =>
+      Object.hasOwn(s[parseContextKey(key) === null ? 'values' : 'contextKeys'] ?? {}, key)
   const holds = (s: SpaceNode): boolean =>
-    q.keys.some((key) =>
-      Object.hasOwn(s[parseContextKey(key) === null ? 'values' : 'contextKeys'] ?? {}, key),
-    ) ||
+    (q.every ? q.keys.every(holdsKey(s)) : q.keys.some(holdsKey(s))) ||
     (q.id !== undefined && !!s.rowOrder?.includes(q.id))
   const spaces =
     typeof q.reach === 'string'
```

```diff
--- a/Core/Properties/registryProperty.ts
+++ b/Core/Properties/registryProperty.ts
@@ -178,7 +178,7 @@
   if (moved.key !== prior.key) {
     const { held } = await findHolders(
       root,
-      { keys: [prior.key, moved.key], reach: 'governed' },
+      { keys: [prior.key, moved.key], reach: 'governed', every: true },
       'values',
     )
     const clashes = held.filter((h) => h.keys.length === 2 && outsideArchive(root, h.file))
```

##### R-2 · An Option Edit Sweeps Only Pages Whose Indexed Value It Changes

The filter runs the sweep's own rewrite (`valueEditRewrite`) over each page's indexed value, so the match is exactly the edit the sweep would make. A file with no row (every Space sidecar, and any page the index can't vouch for) stays in the list. No new query is needed, since `readPageRelations(paths, key)` already exists (`contentIndex.ts:85`, `Desktop/Store/stores.ts:133-156`).

```diff
--- a/Core/Properties/optionOps.ts
+++ b/Core/Properties/optionOps.ts
@@ -46,7 +46,7 @@
 import { readPageRecord } from '../Nexus/readNexus'
 import { containerAt, holderSchema, pagePathsIn, spaceAt } from '../Nexus/treePatch'
 import type { Json } from '../Files/stableJson'
-import { isMarkdownFile, join } from '../Paths/posix'
+import { isMarkdownFile, join, relative } from '../Paths/posix'
 import { findOption, NO_OPTION } from './propertyValue'
 
 const NO_GROUP = fail('not-found', 'That group no longer exists.')
@@ -221,8 +221,18 @@
   def: PropertyDefinition,
   keys: ValueEdit,
 ): Promise<{ files: string[]; plan: SweepPlan }> {
+  const raw = valueEditRewrite(def, keys)
   const { files } = await findHolders(root, { keys: [def.key], reach: 'governed' })
-  return { files, plan: { raw: valueEditRewrite(def, keys) } }
+  // The index's last read of each page's value names the pages the edit changes, at the trust it already has for which pages hold the key; a file it holds no row for is read.
+  const rows = readPageRelations(
+    files.map((file) => relative(root, file)),
+    def.key,
+  )?.pages
+  const reaches = (file: string): boolean => {
+    const row = rows?.[relative(root, file)]
+    return !row || raw(row.values, file) !== null
+  }
+  return { files: files.filter(reaches), plan: { raw } }
 }
 
 async function stashSweep(root: string, def: PropertyDefinition, keys: ValueEdit): Promise<number> {
```

##### R-3 · A Text Plan Rewrites the Parse the Sweep Admitted

`renameFrontmatterKey`'s body after its parse becomes `rekeyed(doc, body, …)`. `renameFrontmatterKey` stays, as parse plus `rekeyed`, for its one remaining caller (`restoreScrub.ts:105`, a Trash file). `SweptPage` gains `rekey`, which runs `rekeyed` on the held document. The sweep uses each `SweptPage` once, so mutating its document is safe (A, *§6*). `pageFile.ts:280`'s "one parse serves a sweep's admission, its read of the values, and its merge" becomes true for text plans too.

```diff
--- a/Core/Files/pageFile.ts
+++ b/Core/Files/pageFile.ts
@@ -217,17 +217,27 @@
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
@@ -268,6 +278,8 @@
 
 export interface SweptPage {
   raw: Record<string, unknown>
+  /** The page with `from` renamed to `to` as `renameFrontmatterKey` renames it, from this parse. */
+  rekey: (from: string, to: string, collision: KeyCollision) => string | null
   merge: (modeled: Record<string, unknown>, modeledKeys: readonly string[], above?: Place) => string
   /** `key`'s pair as the block was parsed, its quoting, style, comment, and alias kept; undefined when the block holds no `key`. */
   pair: (key: string) => string | undefined
@@ -292,6 +304,7 @@
   }
   return {
     raw,
+    rekey: (from, to, collision) => rekeyed(doc, body, from, to, collision),
     merge: (modeled, keys, above) => envelope(fenced, mergeInto(doc, modeled, keys, above), body),
     pair,
     above: (key) => {
```

```diff
--- a/Core/Nexus/governedSweep.ts
+++ b/Core/Nexus/governedSweep.ts
@@ -9,10 +9,9 @@
 import { asString } from './coerce'
 import { addressable } from './heldPages'
 import type { EntityRecord } from './record'
-import { sweepParse } from '../Files/pageFile'
+import { type Place, type SweptPage, sweepParse } from '../Files/pageFile'
 import type { Json } from '../Files/stableJson'
 import { type Frozen, gonePageEntry, liveLanding, reencode, rewriteRoot } from './governedRoot'
-import type { Place } from '../Files/pageFile'
 import { type PropertyDefinition, PROPERTY_TYPES } from '../Properties/properties'
 import { isBlankRaw, landValue } from '../Files/rootValues'
 
@@ -27,9 +26,9 @@
 
 export type Rewrite = (root: Json, file: string) => Json | null
 
-export type RewriteText = (content: string, file: string) => string | null
+export type RewriteText = (content: string, file: string, page: SweptPage) => string | null
 
-/** `raw` rewrites a page's front matter or a Space sidecar's object; `text`, when given, rewrites a page's whole text in its place; `above`, when given, places each key a page's rewrite adds. */
+/** `raw` rewrites a page's front matter or a Space sidecar's object; `text`, when given, rewrites a page's whole text in its place, handed the parse the sweep admitted it by; `above`, when given, places each key a page's rewrite adds. */
 export type SweepPlan = {
   raw: Rewrite
   text?: RewriteText
@@ -61,7 +60,7 @@
   }
   const page = sweepParse(content)
   if (!page) return undefined
-  if (plan.text) return plan.text(content, file)
+  if (plan.text) return plan.text(content, file, page)
   return rewriteRoot((root) => plan.raw(root, file), plan.above?.(page.raw, file))(page)
 }
 
```

```diff
--- a/Core/Properties/registryProperty.ts
+++ b/Core/Properties/registryProperty.ts
@@ -21,10 +21,10 @@
   withOptionGroups,
 } from './properties'
 import { ok, fail, type Result } from '../Contract/result'
-import { renameFrontmatterKey } from '../Files/pageFile'
 import { findHolders } from '../Index/keyHolders'
 import {
   outsideArchive,
+  type RewriteText,
   sweepCount,
   sweepGovernedRoots,
   type SweepPlan,
@@ -142,8 +142,7 @@
 ): Promise<{ files: string[]; plan: SweepPlan }> {
   // Queried by the OLD key: a page holding only the new one needs no rewrite, and one holding both holds the old one too.
   const { files } = await findHolders(root, { keys: [from], reach: 'governed' })
-  const text = (content: string): string | null =>
-    renameFrontmatterKey(content, from, to, NEW_KEY_IS_FRESHER)
+  const text: RewriteText = (_content, _file, page) => page.rekey(from, to, NEW_KEY_IS_FRESHER)
   return {
     files,
     plan: { text, raw: (raw) => rekeyHeld(raw, from, to, NEW_KEY_IS_FRESHER) },
```

```diff
--- a/Core/Contexts/contextCascade.ts
+++ b/Core/Contexts/contextCascade.ts
@@ -4,7 +4,6 @@
 import { ok, fail, fault } from '../Contract/result'
 import { mutateRegistryFile, readRegistryStrict } from './contextsRegistry'
 import { pathExists, relocate, targetTaken } from '../Files/atomicWrite'
-import { renameFrontmatterKey } from '../Files/pageFile'
 import type { Json } from '../Files/stableJson'
 import { contextDirRel } from '../Paths/nexusPaths'
 import type { MutateReply } from '../Nexus/mutateRequest'
@@ -46,7 +45,7 @@
 function pageLeg(from: string, to: string): RewriteText {
   const oldKey = contextKey(from)
   const newKey = contextKey(to)
-  return (content) => renameFrontmatterKey(content, oldKey, newKey, NEITHER_KEY_IS_FRESHER)
+  return (_content, _file, page) => page.rekey(oldKey, newKey, NEITHER_KEY_IS_FRESHER)
 }
 
 /** The files holding the key a title change rewrites, found before the rename's list or folder step, so no settle between them can drop a moved Space from the tree; `moved` points a Space the tree still lists under the folder it left at the one it went to. The key comes from the old title, never the registry title, which may already read old or new. */
```

```diff
--- a/Core/Nexus/cascade.ts
+++ b/Core/Nexus/cascade.ts
@@ -3,7 +3,7 @@
 import { isBlankRaw, landValue, stripKeys } from '../Files/rootValues'
 import { type Json, same } from '../Files/stableJson'
 import { errText, ok } from '../Contract/result'
-import { splitEnvelope, mergeFrontmatter, splitFrontmatter, sweepParse } from '../Files/pageFile'
+import { splitEnvelope, mergeFrontmatter, sweepParse } from '../Files/pageFile'
 import {
   type Rewrite,
   type RewriteText,
@@ -197,10 +197,10 @@
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
```

##### R-4 · A Page the App Just Wrote Isn't Read Again by the Walk It Owes

`landOwn` already forgets a kept-time page's cached parse, because the kept time would otherwise vouch for the old bytes. The tree patch then builds that page's record from the landed text anyway (`fileEvents.ts:381`), so it hands the record to the walk cache under the landed stat. The `forgetParse` stays: its `forgets` bump is what stops a walk in flight from caching the old bytes over this entry (`walkCache.ts:55`). The record now carries the landed mtime instead of `null`, because `loadValues.ts:29` serves a cached record's `mtimeMs` as the page's modified time, and a cached `null` would blank it. A freshly dated page still misses, under the cache's racy window (`walkCache.ts:3,48`).

```diff
--- a/Core/Files/walkCache.ts
+++ b/Core/Files/walkCache.ts
@@ -31,6 +31,11 @@
   forgets++
 }
 
+/** Holds `value` as the parse of the file `stat` describes, as a write that knows its own bytes' parse leaves it for the next walk. */
+export function rememberParse(absPath: string, { mtimeMs, size }: FileStat, value: unknown): void {
+  entries.set(absPath, { mtimeMs, size, verifiedAt: Date.now(), gen, value })
+}
+
 export async function cachedParse<T>(
   absPath: string,
   parse: (stat: FileStat | null) => Promise<T>,
```

```diff
--- a/Core/Nexus/fileEvents.ts
+++ b/Core/Nexus/fileEvents.ts
@@ -50,6 +50,7 @@
   readOrder,
   readPageRecord,
 } from './readNexus'
+import { rememberParse } from '../Files/walkCache'
 import { readSettingsLeaves, scopeOf } from '../Settings/codec'
 import { errText } from '../Contract/result'
 import { containerNodeFrom } from './containerFields'
@@ -373,11 +374,16 @@
   const abs = join(root, rel)
   let read: PageRecord
   try {
-    read = ev.text === undefined ? await readPageRecord(abs, rel) : pageRecordOf(ev.text, rel, null)
+    read =
+      ev.text === undefined
+        ? await readPageRecord(abs, rel)
+        : pageRecordOf(ev.text, rel, ev.stat?.mtimeMs ?? null)
   } catch {
     if (await pathExists(abs)) return 'walk'
     return applyPatch(root, (t) => removeNodeInTree(t, rel))
   }
+  // The app's own write leaves the record its bytes give for the next walk, which would otherwise read the page again.
+  if (ev.stat) rememberParse(abs, ev.stat, read)
   oweValue(owed, rel, !!ev.bodyOnly)
   if (ev.origin === 'watched') owed.pages.add(rel)
   if (read.kind === 'unread' && read.reason === 'missing')
```

##### Not Taken, With Reasons

- **The Confirmation Counts:** they stay their operation's own dry run (Nathan's direction).
- **The Written Text's Second Parse:** the index (`extractPageIndex`) and the tree (`pageRecordOf`) each parse the landed text, about 65 µs per file (≈ 0.45 s per Medium property rename). Sharing one parse has no clean owner. `landOwn` can't parse without `atomicWrite.ts` importing `pageFile.ts`, which already imports it, so that closes a cycle. A memo keyed by text is a hidden cache over shared mutable values. Threading a parse map through `indexEvents` → `indexWrittenPages` → `extractPageIndex` and `applyOne` → `applyPage` → `pageRecordOf` is about +10 lines across four signatures. With this, each rewritten page is read once and parsed once from disk, and its new bytes are parsed twice. *§7 · OP-3* puts it to Nathan.
- **The Watcher's Echo Read:** `dropOwnEchoes` reads each own write back and hashes it (`writeEcho.ts:98-108`). Comparing the landed stat instead would skip that read, but it would weaken a deliberate rule: an outside write that keeps the time and size (`cp -p`, `rsync -t`) would read as the app's echo. The harness will still show one `readBytes` per written file.
- **The Property Delete's Values Read:** write-ahead requires the Trash record before the strip (Investigation).
- **`deleteCascade`'s Post-Sweep Parse** (`cascade.ts:142`) and **`restoreScrub`'s Text-Plan Parses** (`restoreScrub.ts:104-107,195-197`): both are Trash-plan record code (*§7 · OP-4*).

---

#### 4. Offsets

The hunt covered every file the Core and the Read Cuts touch, all of `Core/Files/atomicWrite.ts` (its JSON read/modify/write family `rmwJsonStrict`, `rmwLocked`, `editJsonStrict`, `updateNexusFile`, `updateNexusConfig`, and `readLast` with its four readers), and every caller of the writers. Two offsets hold. The rest are listed with why they don't.

##### Recommended

| Offset | Delta | Risk |
|---|---|---|
| **O-1 · One Own Writer for Text and Bytes** | **−5** (`atomicWrite.ts` −11 / +6; `assetWrite.ts`, `thumbnails.ts` rename only) | **Low.** The event kind moves from the caller to the data: text reports `'change'`, and bytes report `'add'`. That's exactly today's split, since every byte writer is an asset or a thumbnail (`assetWrite.ts:33`, `thumbnails.ts:82`). `'add'` and `'change'` differ only in the asset arm (`fileEvents.ts:602-604`); every other arm classifies by path. |
| **O-2 · A Rewrite Is Handed the Stat Its Read Was Checked Against** | **−3** (`adopt.ts` −5 / +2; `atomicWrite.ts` signature only) | **Very low, and a small correctness gain.** `stampPage` stats the page outside its lock to mint the ID's time (`adopt.ts:66-69`), then `rewritePageSerialized` stats it again under the lock. The ID now takes the held stat, so the ID's time and the rewritten bytes come from the same moment. An absent page still answers `null` (`readHeld` → `false`). Other callers ignore the second argument. |

```diff
--- a/Core/Files/atomicWrite.ts
+++ b/Core/Files/atomicWrite.ts
@@ -10,11 +10,8 @@
 import { nexusConfig } from '../Paths/paths'
 import { NEXUS_CONFIG_FILES, type NexusConfigFile } from '../Paths/nexusPaths'
 
-/** Lands the app's own writes as one group under the locks their callers hold: each echo is recorded before its name points at the new bytes, a file kept at its time drops the walk cache's parse that time would otherwise vouch for, and the files that landed are noted as one batch carrying the stat each now holds. Text reports 'change' for a new file too, since the tree and the index take an add and a change alike. */
-export async function landOwn(
-  files: readonly Landing[],
-  { event = 'change', bodyOnly }: { event?: 'add' | 'change'; bodyOnly?: boolean } = {},
-): Promise<Landed[]> {
+/** Lands the app's own writes as one group under the locks their callers hold: each echo is recorded before its name points at the new bytes, a file kept at its time drops the walk cache's parse that time would otherwise vouch for, and the files that landed are noted as one batch carrying the stat each now holds. Text reports 'change' for a new file too, since the tree and the index take an add and a change alike; bytes are an asset's and report 'add', since the asset arm lists a path only on an add, where a 'change' bumps the version of one already listed. */
+export async function landOwn(files: readonly Landing[], bodyOnly?: boolean): Promise<Landed[]> {
   for (const { path, data } of files) recordWrite(path, data)
   const landed = await machine().land(files)
   const events: FileEvent[] = []
@@ -23,6 +20,7 @@
     if (at.status === 'rejected') return
     if (mtimeMs !== undefined) forgetParse(path)
     const text = typeof data === 'string' ? data : undefined
+    const event = text === undefined ? 'add' : 'change'
     events.push({ event, absPath: path, origin: 'own', text, bodyOnly, stat: at.value })
   })
   await noteOwn(...events)
@@ -37,10 +35,10 @@
 
 export async function atomicWriteFile(
   filePath: string,
-  data: string,
+  data: string | Uint8Array,
   bodyOnly = false,
 ): Promise<void> {
-  await sole(landOwn([{ path: filePath, data }], { bodyOnly }))
+  await sole(landOwn([{ path: filePath, data }], bodyOnly))
 }
 
 /** A file's stat, then its text, so the stat a rewrite is checked against never postdates the text it works from; null when either is missing. */
@@ -73,11 +71,6 @@
 ): Promise<void> {
   await sole(machine().land([{ path: filePath, data: bytes, mtimeMs }]))
   forgetParse(filePath)
-}
-
-export async function atomicWriteBinary(filePath: string, data: Uint8Array): Promise<void> {
-  // 'add', since the asset arm lists a path only on an add, where a 'change' bumps the version of one already listed.
-  await sole(landOwn([{ path: filePath, data }], { event: 'add' }))
 }
 
 /** Under the SOURCE path's lock, the same key every other write to it takes: a write queued behind the move fails not-found rather than recreating the vacated file as a ghost. `landed` runs before sync hears of the rename, so it pushes under what the landing settled. */
@@ -340,11 +333,11 @@
 
 export function rewritePageSerialized(
   file: string,
-  rewrite: (content: string) => string | null,
+  rewrite: (content: string, was: FileStat) => string | null,
 ): Promise<boolean> {
   return machine().lock(file, async () => {
     const read = await readHeld(file)
-    const after = read && rewrite(read.before)
+    const after = read && rewrite(read.before, read.was)
     if (read === null || after === null) return false
     await sole(landRewrites([{ file, was: read.was, after }]))
     return true
```

```diff
--- a/Core/Nexus/adopt.ts
+++ b/Core/Nexus/adopt.ts
@@ -64,12 +64,9 @@
   overForeign = false,
   held?: string,
 ): Promise<string | null> {
-  const st = await machine().stat(absFile)
-  if (!st) return null
-  // A filesystem with no birthtime reports 0 or null, and mtime is then the honest floor.
-  const { birthtimeMs, mtimeMs } = st
   let id: string | null = null
-  const landed = await rewritePageSerialized(absFile, (content) => {
+  // A filesystem with no birthtime reports 0 or null, and mtime is then the honest floor.
+  const landed = await rewritePageSerialized(absFile, (content, { birthtimeMs, mtimeMs }) => {
     const { admission } = parsePage(content, kind)
     // The long-term approach is remembering an old ID to re-stamp in such an event; this *must* be done before any official release.
     const foreign = admission.state === 'unknown' && admission.reason === 'malformed'
```

```diff
--- a/Core/Assets/assetWrite.ts
+++ b/Core/Assets/assetWrite.ts
@@ -2,7 +2,7 @@
 import { machine } from '../Platform/machine'
 import { expressibleInLink, fileLinkText } from '../Connections/connections'
 import { ok, fail, type Result } from '../Contract/result'
-import { atomicWriteBinary, pathExists } from '../Files/atomicWrite'
+import { atomicWriteFile, pathExists } from '../Files/atomicWrite'
 import { liveAssetMap, resolveAssetName } from './assetMap'
 import { createDisambiguated, reservedAssetLeaf } from '../Paths/names'
 import { assetsDir } from '../Paths/paths'
@@ -30,7 +30,7 @@
       const file = `${stem}${ext}`
       if (await taken(stem)) return fail('exists', `${file} already exists.`)
       const abs = join(dir, file)
-      await atomicWriteBinary(abs, bytes)
+      await atomicWriteFile(abs, bytes)
       return ok(fileLinkText(file))
     },
     taken,
```

```diff
--- a/Desktop/Capture/thumbnails.ts
+++ b/Desktop/Capture/thumbnails.ts
@@ -6,7 +6,7 @@
 import type { BrowserWindow, NativeImage } from 'electron'
 import { WINDOW_BG } from '@pommora/uix/Theme/colors'
 import type { ThumbRect } from '@pommora/core/Interface/chrome'
-import { atomicWriteBinary } from '@pommora/core/Files/atomicWrite'
+import { atomicWriteFile } from '@pommora/core/Files/atomicWrite'
 import { thumbKey, thumbRel, thumbsRel } from '@pommora/core/Paths/nexusPaths'
 import { assetUrl } from '@pommora/core/Platform/assetScheme'
 
@@ -79,7 +79,7 @@
   const key = thumbKey(navKey)
   const rel = thumbRel(nexusId, key)
   await mkdir(dirname(join(root, rel)), { recursive: true })
-  await atomicWriteBinary(join(root, rel), buf)
+  await atomicWriteFile(join(root, rel), buf)
   return assetUrl(rel)
 }
 
```

##### Assessed and Not Taken

| Candidate | Delta | Why Not |
|---|---|---|
| **`editJsonStrict` as `rmwLocked`** | ≈ −8 | `reachConfig` (its one caller, `configReach.ts:321`) counts `'unreadable'` as a skip and `'corrupt'` and `'absent'` as nothing owed (`:318`). `rmwLocked` answers both of the first two as `operation-failed`, and it can't tell `'written'` from `'unchanged'` (`ok(next)` or `ok(base)`). Collapsing would mean widening `Result` or parsing error messages. It also records `lastRead` for tile docs (`configReach.ts:353`), which `readAppFileKnown` (`tileDoc.ts:21`) relies on. |
| **`rmwJsonStrict` callers onto `updateNexusFile`** | ≈ −4 | `updateNexusFile` runs `mkdir`, seeds `{}` on absent, repairs, drops empties, and records `lastRead`. `rmwJsonStrict`'s 12 callers (`record.ts:141`, `contextsRegistry.ts:37`, `adopt.ts:105`, `appConfig.ts:53`, `secrets.ts:33`, `assetMigrate.ts:130`) depend on an absent file failing as `not-found` and on no folder being made. |
| **Tile docs edited through `updateNexusFile`** (`configReach.ts:353` writes them through `editJsonStrict`, while `tileDoc.ts:30` writes them through `updateNexusFile`) | ≈ 0 | `updateNexusFile` would set a damaged tile doc aside during a configuration pass, where `reachConfig` deliberately leaves a corrupt file as it is (`:318`). Different policies, the same landing. |
| **`readLast`'s four readers as one exported `readLast`** | ≈ −8 | The four (`readKept`, `readAppFile`, `readAppFileKnown`, `neverParsed`) differ in policy, not in landing, and the two single-caller ones (`tileDoc.ts:21`, `owed.ts:138`) would each spell their policy inline. The lines move to call sites and the names stop saying what each read promises. |
| **`absentToNull`, `isAbsent`, `entryKind`, and `fileStat` shared between `nodeMachine.ts` and `Core/Testing/machines.ts`** | 0 production, ≈ −20 test | Their only Core home is `Core/Platform/machine.ts`, the contract file, which would then encode Node's `ENOENT`/`ENOTDIR` codes and `Stats` shape. The Hard Rule puts the machine's specifics in the host. |
| **An unchanged rewrite writes nothing, inside `rewritePageSerialized`** (`tilesFile.ts:310-312` checks by hand) | −2 | `rewritePageSerialized` would then differ from the sweep, which lands a plan's identical text, and `restoreScrub`'s `seen` bookkeeping depends on the sweep doing that (A, *§6*). |
| **`seedContentIndex`'s re-read through `indexWrittenPages`** | ≈ −10 | The seed has its own snapshot, a database-switch bail at every await, and a keep-the-fresher-row rule (`indexSeed.ts:195-207`), which `indexWrittenPages` doesn't share. |
| **`updateNexusFile`'s `dropEmpty`** (lands `{}` then removes it, `atomicWrite.ts:245-247`) | ≈ 0 | One wasted flush per owed note's settle (`owed.ts:139`). Skipping the landing needs a second mutate wrapper. Its cost is one flush per operation, not per file. |

---

#### 5. Line Ledger

Production code lines, cumulative from HEAD: removed / added / net. A modified line counts once in each column.

| File | The Core | + Read Cuts | + Recommended Offsets |
|---|---|---|---|
| `Desktop/Platform/nodeMachine.ts` | −19 / +57 / **+38** | −19 / +57 / **+38** | −19 / +57 / **+38** |
| `Core/Files/atomicWrite.ts` | −32 / +50 / **+18** | −32 / +50 / **+18** | −36 / +49 / **+13** |
| `Core/Platform/machine.ts` | −3 / +13 / **+10** | −3 / +13 / **+10** | −3 / +13 / **+10** |
| `Core/Index/indexSeed.ts` | −22 / +32 / **+10** | −22 / +32 / **+10** | −22 / +32 / **+10** |
| `Core/Nexus/mutate.ts` | −2 / +6 / **+4** | −2 / +6 / **+4** | −2 / +6 / **+4** |
| `Core/Nexus/finishOwed.ts` | −4 / +6 / **+2** | −4 / +6 / **+2** | −4 / +6 / **+2** |
| `Core/Properties/optionOps.ts` | −9 / +11 / **+2** | −11 / +22 / **+11** | −11 / +22 / **+11** |
| `Core/Nexus/settle.ts` | −6 / +7 / **+1** | −6 / +7 / **+1** | −6 / +7 / **+1** |
| `Core/Files/writeEcho.ts` | −6 / +6 / **0** | −6 / +6 / **0** | −6 / +6 / **0** |
| `Core/Sync/Client/push.ts` | −1 / +1 / **0** | −1 / +1 / **0** | −1 / +1 / **0** |
| `Core/Sync/Client/reconcile.ts` | −1 / +1 / **0** | −1 / +1 / **0** | −1 / +1 / **0** |
| `Core/Paths/exclusion.ts` | −7 / +2 / **−5** | −7 / +2 / **−5** | −7 / +2 / **−5** |
| `Core/Nexus/fileEvents.ts` | −18 / +12 / **−6** | −19 / +18 / **−1** | −19 / +18 / **−1** |
| `Core/Nexus/governedSweep.ts` | −30 / +23 / **−7** | −34 / +26 / **−8** | −34 / +26 / **−8** |
| `Core/Index/keyHolders.ts` | — | −4 / +19 / **+15** | −4 / +19 / **+15** |
| `Core/Files/pageFile.ts` | — | −2 / +12 / **+10** | −2 / +12 / **+10** |
| `Core/Files/walkCache.ts` | — | 0 / +3 / **+3** | 0 / +3 / **+3** |
| `Core/Nexus/cascade.ts` | — | −3 / +3 / **0** | −3 / +3 / **0** |
| `Core/Contexts/contextCascade.ts` | — | −2 / +1 / **−1** | −2 / +1 / **−1** |
| `Core/Properties/registryProperty.ts` | — | −4 / +3 / **−1** | −4 / +3 / **−1** |
| `Core/Nexus/adopt.ts` | — | — | −5 / +2 / **−3** |
| `Core/Assets/assetWrite.ts` | — | — | −2 / +2 / **0** |
| `Desktop/Capture/thumbnails.ts` | — | — | −2 / +2 / **0** |
| **Total** | **−160 / +227 / +67** | **−182 / +288 / +106** | **−195 / +293 / +98** |

Outside the count: `Desktop/package.json` −2 lines; `Desktop/main.ts` +1 only if *D-5* measures; test code −54 / +106 / +52 (`machineContract.ts` +36, `machines.ts` +17, `hostFs.ts` −1), before the suite edits in *§6*.

##### What the Net Buys, Against the Mandate

- **Removed Outright:** the `write-file-atomic` dependency, its types, and its transitive `signal-exit`. Also three Machine methods (`writeText`, `writeBytes`, `utimes`) folded into one; the library's duplicate per-path queue; and its per-file `realpath`, `stat`, `chown`, and `chmod`. Also gone: `rewritePreservingTimes` with its mis-ordered stat, the private `land`, `guarded`, `asBuffer`, `indexEvent`'s per-event switch, `indexWrittenPage`'s per-page transaction and stat, the settle's forced file branch, `TEMP_SUFFIX`, and `manifestAdmits`' `siblings`. With the offsets, `atomicWriteBinary` and `stampPage`'s pre-lock stat go too.
- **Per File, Removed From Every Cascade:** the flush taken alone (now one per chunk of 64), the index transaction (now one per chunk), two of three stats, the clash read, the option sweep's non-carrying reads, the settle's re-read, the text plan's second parse, and the owed walk's re-read. The Context rename's zero to four extra walks go too.
- **Correctness Gained:** an outside write landing mid-sweep or mid-rewrite is refused and owed rather than overwritten (Sync's landing is unchanged). The lock now covers read through record. A page named near the length limit saves. The Context and Space renames honor `mutate.ts:88`.
- **Where the Lines Go:** about half is the host doing in 57 lines what about 160 lines of library code did, flushing as a group. Next come the recorder and the shared read-and-land rules (+18) and the contract (+10). The Read Cuts add 39 lines for about 2.9 s, summed over the Medium renames each one reaches.
- **Against the Investigation's +60:** the Core alone lands at +67. The Investigation counted the host at +35, without mode preservation, cleanup at both stages, or the contract's 13 lines, and it didn't count the walk race, which is net +6.

---

#### 6. Tests

##### Break on Purpose

| Where | Why | Becomes |
|---|---|---|
| `Core/Testing/machineContract.ts:30-46,49,61,76,83,88-92` (runs on all three machines: `contracts.test.ts`, `Desktop/Platform/nodeMachine.test.ts`) | `writeText`, `writeBytes`, and `utimes` are gone | The cases rewritten in *§2 · Test Machines* |
| `Core/Platform/machine.test.ts:10,52-58` | `rewritePreservingTimes` is gone | `rewritePageSerialized` keeps the time; `atomicWriteFile` moves it |
| `Core/Files/atomicWrite.test.ts:8,22,27,383-419,426,447` | the tap takes an array; own events carry `stat`; `rewritePreservingTimes` is gone | `setOwnTap(async (evs) => …)`; `stat: expect.any(Object)`; the preserved-time case through `rewritePageSerialized`. Under O-1, `atomicWriteBinary` → `atomicWriteFile` (`:8,417`) |
| `Core/Pages/fileHistory.test.ts:33,156,163` | the tap takes an array | `setOwnTap((evs) => …)` |
| `Core/Nexus/settle.test.ts:482`, `Desktop/FileWatch/watcher.test.ts:137` | spies on `indexWrittenPage` | spy `indexWrittenPages` |
| `Core/Index/indexSeed.test.ts:17,129,221-341`, `keyHolders.test.ts:7,49,118,138,153,190,315`, `heldPages.test.ts:11,96`, `finishOwed.test.ts:13,553,562` | `indexWrittenPage(root, f)` | `indexWrittenPages(root, [{ absPath: f }])`, with the same result shape |
| `archive.test.ts:905,1113`, `settle.test.ts:1304-1305`, `spend.test.ts:1790,1822`, `trashRecovery.test.ts:912,993,1017` | `refuseWrites` is gone | `refuseLandings((f) => …)`. A refused sidecar landing makes `editJsonStrict` reject into the same `configReach.ts:321` catch |
| `restoreScrub.test.ts:27-36`, `notesWiring.test.ts:10,30-37,82-85,108` | module mocks of `rewritePreservingTimes` | `refuseLandings((f) => trashWrites.fail && f.includes('/.trash/'))`; observe `machine().land` |
| `spend.test.ts:515`, `trashRecovery.test.ts:689` | assert zero sweep reads through `vi.spyOn(atomicWrite, 'readTextOrNull')`, which `readHeld` calls inside its own module, where the spy can't see it, so the assertions would go vacuous | spy `machine().readText` |
| `Core/Paths/exclusion.test.ts:151-154,158` | `TEMP_SUFFIX` is gone | removed (`:158`'s `_record.json.123` line with it) |
| `Core/Nexus/mutate.test.ts:1909` | a comment naming `atomicWriteBinary` (O-1 only) | names `atomicWriteFile` |

Unchanged and still holding: `governedSweep.test.ts:34-157`, with its plan's `text: (c) => …` still fitting A's `RewriteText`; `cascadeRace.test.ts:62-90` (a cascade queues behind an in-flight write); `fileLock.test.ts:58-77`; `writePathRace.test.ts:76-99`; `writeEcho.test.ts:72-152`; `fileEvents.test.ts:117` (tree parity through the reordered index); `settle.test.ts:110` (duplicate changes in one batch, the `Map` dedupe); `indexMaintenance.test.ts:253-266`; and the `finishOwed.test.ts` crash-window suite.

##### New Invariant Tests, Each Failing Without Its Change

| # | Test | Where | Fails Without |
|---|---|---|---|
| T-N1 | A group of two whose first `expect` is stale: the first rejects and keeps the other writer's bytes, and the second lands | `machineContract.ts` (written in *§2*) | `sameFile` in `land` |
| T-N2 | `expect` on a path removed since: it rejects and creates nothing | `machineContract.ts` (written) | `sameFile`'s `null` arm |
| T-N3 | A landing onto a folder rejects alone and leaves no `.landing-*` | `machineContract.ts` (written) | `discard` in the commit |
| T-N4 | A landing keeps its given time (a whole second), and its answer equals a later `stat` | `machineContract.ts` (written) | `utimes` on the temp, or answering a stat taken before it |
| T-N5 | The sweep refuses an outside write mid-chunk: spy `land` to `writeFile` page B (different length) before delegating. B keeps the outside bytes and is `skipped`, A is rewritten, the note stays owed, and `finishOwed` then rewrites B and clears it | `governedSweep.test.ts`, `registryProperty.test.ts` | `expect: was` in `landRewrites` |
| T-N6 | An in-app writer waits for the chunk and isn't refused: pause `land`, issue `updatePageBody` on a chunk page (`lockContention` shows it waits), release. Both edits land and nothing is skipped | `governedSweep.test.ts` | the chunk holding its locks through the landing |
| T-N7 | **A queued own write isn't overwritten by an older chunk (pins *D-3*):** register `writer = gate.then(() => rewritePageSerialized(A, (c) => c + 'Z'))` before the sweep, and have a `readText` hook on A resolve `gate`. The hook only resolves, because a `lock(A)` started inside it inherits the chunk's held keys and rejects as re-entrant. After the sweep and `await writer`, A reads `swept + 'Z'`, and `readPageRelations([relA])` and `pageAt(tree, relA)` agree with the file | `governedSweep.test.ts` | the record running inside the chunk's locks |
| T-N8 | Crossing sweeps over `[a, b]` and `[b, a]` with `land` delayed both finish within a timeout | `governedSweep.test.ts` | the sort in `holding` |
| T-N9 | 65 files make two `land` calls, of 64 and 1 | `governedSweep.test.ts` | `CHUNK` |
| T-N10 | A 70-file sweep makes two `upsertPageIndexes` calls, and one `atomicWriteFile` makes one | `indexMaintenance.test.ts` | `indexEvents` batching |
| T-N11 | After a sweep, `readIndexedStat(rel)` equals `fs.stat`'s `(mtimeMs, size)` for every rewritten page, and a following `seedContentIndex` re-reads none of them | `indexSeed.test.ts` | the landing's stat riding the event |
| T-N12 | With a warm index, an own write adding an unregistered Multi-Select word registers it without a `readText` of that page, and a page with no row is still read | `optionOps.test.ts` | the settle reading the index |
| T-N13 | A Context with 70 tagged pages renamed through the dispatch makes exactly one `readNexus` call, with a mid-sweep `settleNow` fired from a pre-registered gate | `contextCascade.test.ts` | `inSettleTurn` around the renames |
| T-N14 | One `readText` per holder across a property rename with a warm index (the dialog's dry run is a separate request) | `registryProperty.test.ts` | the settle read (Core), or R-1 |
| T-N15 | With no file holding the new key, `rekeyPlan` reads nothing; a page holding both still refuses | `registryProperty.test.ts` | R-1's `every` |
| T-N16 | An option rename reads only pages whose indexed value carries the word, plus Spaces, and a page with no row is still read and rewritten | `optionOps.test.ts` | R-2's filter (first half); its no-row fallback (second half) |
| T-N17 | A property rename's plan parses each page once: count `parseDocument` through `vi.mock('yaml', …)` (a module spy can't see an external package's calls) over a one-page sweep, and expect one call before the landing | `governedSweep.test.ts` | R-3's `rekey` |
| T-N18 | After a Context rename, its owed walk makes no `readText` of the pages the rename rewrote, and `loadValues` still serves each page's kept modified time | `contextCascade.test.ts`, `loadValues.test.ts` | R-4's `rememberParse` (first half); the landed mtime on the record (second half) |
| T-N19 | Host only: `vi.mock('node:fs/promises')` logs each handle's `sync` and each `rename`. Landing three files logs `sync ×3`, then `rename ×3` | `Desktop/Platform/nodeMachine.test.ts` | staging the group before any commit |
| T-N20 | Host only: a 0o664 file rewritten keeps 0o664 (skipped under `noModeBits`) | `nodeMachine.test.ts` | the `chmod` |
| T-N21 | Host only: the temp a landing renames is ignored by `syncIgnoredUnder` and refused by `manifestAdmits` | `nodeMachine.test.ts` | the leading dot |
| T-N22 | O-2: `stampPage` stats its page once (spy `machine().stat`), and the ID it mints matches that stat's time | `adopt.test.ts` | O-2 |

---

#### 7. Open Points

- **OP-1 · For Nathan, Sync (Decision B-1):** removing `TEMP_SUFFIX` changes two Sync client lines. A `Page.md.<digits>` leftover from a past write-file-atomic crash, already on a user's disk, would then sync as an ordinary file. Keeping the rule changes zero Sync lines, but it matches a temp nothing makes any more (+5 lines kept).
- **OP-2 · For Nathan, Race-Only Behavior:** each of these changes only under a race or an edge case. A sweep or a lone rewrite now refuses a file an outside writer changed mid-flight, where today it overwrites it. Sync's landing carries no `expect` and keeps its behavior. A refused file keeps the echo record `landOwn` made for bytes it never held, until the outside writer's event finds other bytes and drops it (`writeEcho.ts:101-104`); meanwhile Sync's tap hears a `wrote` it would hear from the watcher anyway, which is harmless because it pushes what's on disk. An outside write that keeps the time, size, and birth (an in-place `cp -p`) still goes unseen, as it already does for the index and the walk cache. A symlinked leaf is replaced by a regular file rather than written through. A file whose group differs from its folder's takes the folder's group. A page named near the length limit, which today fails to save, now saves. An in-app write to a page inside the active chunk waits up to one chunk (about 100-200 ms) where today it waits about 7 ms.
- **OP-3 · For Nathan, the Written Text's Second Parse:** "one parse per file" holds for every file a cascade reads. The landed bytes are then parsed by the index and by the tree, about 65 µs each, ≈ 0.45 s per Medium property rename. The only clean form threads one parse through four signatures (about +10 lines). *§3 · Not Taken* has the alternatives and why each fails.
- **OP-4 · The Trash Plan's:** `deleteCascade`'s post-sweep parse (`cascade.ts:142`, ≈ 0.03 s per Medium delete strip) could take each stripped root from the plan's own `raw` callback, with `above` read from that root's key order. `restoreScrub`'s text plan re-parses with `splitFrontmatter` and `renameFrontmatterKey` (`restoreScrub.ts:104-107,195-197`) and lands unchanged files. Both are record-minting code that M-1, M-2, and the restore folds rework.
- **OP-5 · The JSON Read/Modify/Write Family Lands Without `expect`:** sweeps and `rewritePageSerialized` now refuse a file an outside writer changed since their read, while `rmwLocked`, `editJsonStrict`, and `updateNexusFile` still overwrite it. Their window is a single file's flush (about 6 ms) rather than a chunk's. Carrying `expect` would take a stat per read and about 4 lines in `rmwLocked`. The plan should either take it so the rule reads the same everywhere, or state the exception where `rmwLocked` stands.
- **OP-6 · Verify During Execution:** `git grep` every `lock(` body again at the plan's HEAD, since deadlock freedom rests on no holder of a file lock taking a second one. Also confirm that nothing under `renameContextOp`, `renameSpaceOp`, `finishContext`, or `finishSpace` awaits `inTurn`, `payOwedWalk`, or `settleNow`; a nested turn would hang, and T-N13 catches it.
- **OP-7 · The Harness's Expected Counts After the Plan:** property rename, one `readText` and one `stat` per holder plus one `readBytes` (the echo). Option rename, the same per carrying page. Context rename, one `readText` per rewritten page (R-4) and one walk's `stat` and `readDir`. Parses aren't counted by the harness (`bench/instrument.mjs:23`), so T-N17 carries that claim.
- **OP-8 · Not Typechecked:** the AFTER code is Biome-formatted and written against HEAD's types, but nothing was compiled or run. The first executor's `npm run typecheck` is the check.
