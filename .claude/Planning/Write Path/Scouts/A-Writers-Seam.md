### Write Path Scout A — The Writers and the Seam

**DATE:** 10-28-2026
**REPO:** `~/The Studio/Projects/Project Pommora`, branch `active`, HEAD `15fe7422a`, read-only
**SCOPE:** every writer in `Core/Files/atomicWrite.ts` and its callers, the Machine seam and its three implementations, the sweep as the landing's batching caller, the thread pool, the two inferred claims, and the tests that pin them. Recording (the own-event path, the index, the tree) belongs to Scout B; where this design leans on it, it says so.

---

#### 1. Inventory

##### The Seam

| Machine Method | Implementations | Production Callers |
|---|---|---|
| `writeText` | `nodeMachine.ts:52` (write-file-atomic in `outlastHolder`), `machines.ts:81` (memory), `machines.ts:157` (disk, temp + rename, no fsync) | `atomicWrite.ts:15` only |
| `writeBytes` | `nodeMachine.ts:53` (write-file-atomic over `asBuffer`), `machines.ts:82`, `machines.ts:158` | `atomicWrite.ts:47,56` only |
| `utimes` | `nodeMachine.ts:74`, `machines.ts:112,179` | `atomicWrite.ts:34,49` only |
| `rename` | `nodeMachine.ts:72` | `atomicWrite.ts:70,228,368`, `adopt.ts:55`, `handlers.ts:164`, `Sync/Arrival/land.ts:135`, `discard.ts:18` |
| `lock` | `serializeOnFile` (`Desktop/Platform/fileLock.ts:7-30`; the brief's `Core/Platform/fileLock.ts` doesn't exist), `chainLock` (`machines.ts:11-34`, a near-verbatim test twin) | 28 sites |

No test calls `writeText`, `writeBytes`, or `utimes` on a machine except `machineContract.ts`; every test `utimes` is `node:fs`'s.

##### What write-file-atomic Does Per Call (`node_modules/write-file-atomic/lib/index.js:80-161`, 8.0.0)

1. **Its own per-path queue** (`:50-62,92`): duplicates the app's lock for every locked writer.
2. **`fs.realpath`** (`:93`): the JS implementation, an `lstat` per segment, so a symlinked leaf is written through to its target.
3. **Temp name** `target.<uint32>` (`:29-38`): not dotted, so the watcher sees its add and unlink and Sync needed its own rule for it (`Core/Paths/exclusion.ts:8,47`, added in `fd3526733` as "what `write-file-atomic` appends to a temp beside its target").
4. **`stat`** (`:99-108`): takes the original's `mode`, and `uid`/`gid` when `process.getuid` exists.
5. **`open(tmp, 'w', mode)`**, one `fs.write` (`:111-119`), **`fsync`** (`:121-123`), `close`.
6. **`chown`** (`:128-134`): EPERM and EINVAL swallowed for a non-root process (`isChownErrOk`, `:65-78`).
7. **`chmod`** (`:136-142`), **`rename`** (`:144`), then `unlink` of the vanished temp in `finally` (`:153`), and a `signal-exit` handler that unlinks a temp on a signal (`:88`).

##### The Core Writers (`Core/Files/atomicWrite.ts`)

| Writer | Lines | What It Does Differently | Earns It? |
|---|---|---|---|
| `land` (private) | `:13-16` | `recordWrite` then `writeText` | Becomes the batched `landOwn` |
| `atomicWriteFile` | `:19-26` | Lands text, notes a `change` carrying it, `bodyOnly` | Yes: every page save, JSON write, tile, new page (`page.ts:25,60`, `governedRoot.ts:201`, `contextWrite.ts:180`, `tilesFile.ts:62,186,250`, via `writeJson`) |
| `rewritePreservingTimes` | `:28-39` | Stats **after** the read its callers did, lands, `utimes` back (failure swallowed), `forgetParse`, notes | **No**: two callers (`governedSweep.ts:94`, `rewritePageSerialized` `:328`), both of which hold the stat's job better themselves; its stat is mis-ordered (Investigation S4) |
| `landBytes` | `:42-52` | Sync's landing: no echo, no event, `writeBytes` + swallowed `utimes` + `forgetParse` | Yes, as a body of two lines; one caller (`Sync/Arrival/land.ts:96`) |
| `atomicWriteBinary` | `:54-59` | Bytes, notes an `add` | Yes: `assetWrite.ts:33`, `Desktop/Capture/thumbnails.ts:82` |
| `writeJson` | `:97-99` | `atomicWriteFile(jsonText(v))` | Yes, a format choke point (`record.ts:121`, `contextsRegistry.ts:24`, `folderEntity.ts:104`, `identity.ts:34-53`) |
| `rmwJsonStrict` / `rmwLocked` / `updateNexusFile` / `updateNexusConfig` / `editJsonStrict` | `:141-286` | Read-modify-write policies over `writeJson` (absent, corrupt, repair, drop-empty) | Yes; they differ in policy, not landing, and all land through `writeJson` |
| `rewritePageSerialized` | `:319-331` | Lock, read, rewrite, `rewritePreservingTimes` | Yes (`adopt.ts:72`, `remint.ts:79`, `tilesFile.ts:310`, `assetMigrate.ts:148`), as the sweep's lone sibling |
| `relocate` / `removeOwn` / `setAside` / `recase` | `:62-80,226,362` | Renames and removes | Untouched: no bytes land |

`sweepGovernedRoots` (`Core/Nexus/governedSweep.ts:71-100`) is the batched writer's only multi-file caller, through `guarded` (`:52-55`), one lock and one flush per file.

##### Twins, One-Use Wrappers, and Residue

- **Twins:** `rewritePreservingTimes` and `landBytes` both land then `utimes` with the failure swallowed then `forgetParse`; `writeText` and `writeBytes` are one operation over two data types; `nodeMachine.stat` and `diskMachine.stat` share a mapping each spells inline (`nodeMachine.ts:54-64`, `machines.ts:159-169`).
- **One-Use:** `asBuffer` (`nodeMachine.ts:46-47`) exists only to hand write-file-atomic a `Buffer`; `guarded` (`governedSweep.ts:52-55`).
- **Dead Weight:** write-file-atomic's queue, realpath, and chown (see *§6*); `signal-exit@4.1.0` is in the lockfile only for it (`package-lock.json:8270,9766`).
- **Residue Waiting on This Plan:** `TEMP_SUFFIX` (`exclusion.ts:8,47`), the `siblings` argument of `manifestAdmits` (`exclusion.ts:37-47`), its two Sync lambdas (`Core/Sync/Client/push.ts:165`, `reconcile.ts:75`), and the test at `exclusion.test.ts:151-154` plus the `_record.json.123` line at `:158`. `exclusionScan.ts:43-44` still reads `siblings` for its own reason, so `listPathsUnder` keeps the parameter.

---

#### 2. What Leaves

**Packages:** `write-file-atomic` and `@types/write-file-atomic` (`Desktop/package.json:16,23`), and with them `signal-exit@4.1.0` from the lockfile.

**Machine:** `writeText`, `writeBytes`, and `utimes` (three methods become one, `land`), and their implementations in `nodeMachine`, `memoryMachine` (with its `put`), and `diskMachine` (with its `atomicWrite`).

**Desktop:** `asBuffer`, the `writeFileAtomic` import, `utimes` from the `node:fs/promises` import, and `stat`'s inline mapping.

**Core Writers:** the private `land`, `rewritePreservingTimes` and both its comments, `guarded` and its comment, and `landBytes`' two-call body.

**Sync's Manifest:** `TEMP_SUFFIX` and the `siblings` parameter of `manifestAdmits`, since no writer makes a `target.<digits>` temp any more. This touches two lines of Sync client code (*§5*).

**Tests:** the `writers` map and `refuseWrites` in `Core/Testing/hostFs.ts:39-52`, the `vi.mock` of `rewritePreservingTimes` in `restoreScrub.test.ts:27-36` and `notesWiring.test.ts:30-37,82-85`, and the atomic-write-temp test in `exclusion.test.ts`.

---

#### 3. The Landing

##### The Design Choice: The Lock Spans the Chunk

The Investigation's §3 takes each file's lock twice, once to read and stage a temp and once to recheck and rename, with the lock released across the flush. That's wrong for in-app writers. Between the two holds, `setPropertyOp` (`setProperty.ts:22`), `updatePageBody` (`page.ts:54`), or Sync's `landWrite` (`land.ts:92`) can take the lock and land, and the second hold then either refuses it, turning an ordinary concurrent edit into a skip and a Try Again, or, in the instant between its stat and its rename, overwrites it. Today neither happens, because the sweep holds a file's lock from its read through its record (`writeEcho.ts:39` relies on this).

So the sweep takes a chunk's locks, reads and rewrites each file, lands the chunk in one Machine call, records it, and only then releases. In-app writers wait at most one chunk, as `cascadeRace.test.ts:62-90` pins. The `expect` stat then guards only against outside writers, and the Investigation's step-6 rule (skip an event whose path took a newer own write) is unnecessary, since nothing can write a held path before its record lands.

**Deadlock:** a chunk's keys are taken nested, in sorted order, so two sweeps whose chunks share files always acquire in the same order. No other code holds two page locks at once: every lock site (`git grep "\.lock("`, 28 sites) holds one file key, or a folder key (`nexusDir`, `contextsDir`) taken before any page lock, and no sweep runs inside a file lock (*inferred* from those sites plus `discard.ts:36-47`). A page-lock holder that waits on a folder lock a sweep holds would deadlock today too.

**Re-entrancy:** `guarded` caught a lock that rejected because its caller already held the key. No sweep runs under a file lock (above), so that catch guards nothing reachable, and the new holder omits it.

##### The Contract (`Core/Platform/machine.ts`)

```ts
/** One file a landing writes: its bytes; the modification time it keeps in place of now, where given; and the stat it must still hold, where given, so a file another writer changed since its read is left as that writer left it. */
export interface Landing {
  path: string
  data: string | Uint8Array
  mtimeMs?: number
  expect?: FileStat
}

/** A file's landing: the stat its new bytes hold, or the reason it didn't land, which costs only that file. */
export type Landed = PromiseSettledResult<FileStat>

/** Whether `now` is still the file `was` read: the same time and size, and the same birth, which a file replaced whole doesn't keep. */
export const sameFile = (was: FileStat, now: FileStat | null): boolean =>
  now !== null &&
  now.mtimeMs === was.mtimeMs &&
  now.size === was.size &&
  now.birthtimeMs === was.birthtimeMs
```

In `interface Machine`, `writeText`, `writeBytes`, and `utimes` (`:18-21,28`) are replaced by:

```ts
  /** Writes each file whole: a reader sees its old or its new bytes, never a mix, and the new bytes reach the drive before its name points at them. The group is flushed together, each file holding an open handle until the group lands, so a caller passes a bounded group. */
  land(files: readonly Landing[]): Promise<Landed[]>
```

- **Answer:** one `Landed` per input, in order. Results are per file, so one failure (EACCES, a missing folder, a refusal) costs only that file, as `guarded` did. The standard `PromiseSettledResult` union means no new result type.
- **Refusal:** an `expect` that no longer matches the file, an absent file included, rejects that file with `"<name> changed while its write waited."`. Callers don't distinguish a refusal from a failure: the sweep counts both `skipped`, which keeps the owed note and its Try Again (`owed.ts:266-268`).
- **The Stat:** the temp's own `fstat` after its time is set. The rename keeps mtime, size, and birth, so it's the stat the file holds, and it describes the landed bytes rather than whatever a later writer leaves. Restating the path afterward would capture an outside writer's stat for bytes the index never read.
- **`expect`'s Witness:** `birthtimeMs` costs nothing (it's already in `FileStat`) and catches a whole-file replace that kept the old mtime and size, such as `cp -p` or an editor's safe-save. On a coarse-mtime volume (exFAT, SMB), an in-place write in the same tick at the same size is invisible, as it is to the index and the walk cache (`walkCache.ts:3`).

##### The Desktop Implementation (`Desktop/Platform/nodeMachine.ts`)

The imports become:

```ts
import { createHash, randomBytes } from 'node:crypto'
import { realpathSync, type Stats } from 'node:fs'
import type { FileHandle } from 'node:fs/promises'
import { mkdir, open, readdir, readFile, realpath, rename, rm, stat } from 'node:fs/promises'
import { homedir } from 'node:os'
import {
  type DirEntry,
  type FileStat,
  type Landed,
  type Landing,
  type Machine,
  sameFile,
} from '@pommora/core/Platform/machine'
import { serializeOnFile } from './fileLock'
import { isWindows, posixPath } from './hostPath'
import { basename, dirname, join } from '@pommora/core/Paths/posix'
```

`asBuffer` (`:46-47`) leaves. In its place:

```ts
const fileStat = (s: Stats): FileStat => ({
  size: s.size,
  mtimeMs: s.mtimeMs,
  birthtimeMs: s.birthtimeMs,
  isDirectory: s.isDirectory(),
})

type Staged = { temp: string; handle: FileHandle }

async function discard({ temp, handle }: Staged): Promise<void> {
  await handle.close()
  await rm(temp, { force: true })
}

// Beside its file, so the rename stays on one volume; dotted, so the walk, the watcher, and sync never admit it; and short, so a file named to the length limit still has room for it.
async function stage({ path, data, mtimeMs }: Landing): Promise<Staged> {
  const temp = join(dirname(path), `.landing-${randomBytes(6).toString('hex')}`)
  const handle = await open(temp, 'wx')
  try {
    await handle.writeFile(data)
    // A volume that refuses the time leaves the file dated now; its bytes still land.
    if (mtimeMs !== undefined)
      await handle.utimes(mtimeMs / 1000, mtimeMs / 1000).catch(() => {})
    await handle.sync()
    return { temp, handle }
  } catch (e) {
    await discard({ temp, handle })
    throw e
  }
}

async function commit({ path, expect }: Landing, staged: Staged): Promise<FileStat> {
  try {
    const held = await absentToNull(stat(path))
    if (expect && !sameFile(expect, held && fileStat(held)))
      throw new Error(`${basename(path)} changed while its write waited.`)
    const own = await staged.handle.stat()
    // The temp was created through the umask; the file keeps the permissions it had.
    if (held && held.mode !== own.mode) await staged.handle.chmod(held.mode)
    await staged.handle.close()
    await outlastHolder(path, () => rename(staged.temp, path))
    return fileStat(own)
  } catch (e) {
    await discard(staged)
    throw e
  }
}

// Every temp is written and flushed before any rename, so a group waits on the drive once rather than once a file.
async function land(files: readonly Landing[]): Promise<Landed[]> {
  const staged = await Promise.allSettled(files.map(stage))
  return Promise.allSettled(
    files.map(async (file, i) => {
      const s = staged[i]
      if (s.status === 'rejected') throw s.reason
      return commit(file, s.value)
    }),
  )
}
```

The machine object loses `writeText`, `writeBytes`, and `utimes` (`:52-53,74`), gains `land,`, and its `stat` becomes:

```ts
  async stat(p) {
    const s = await absentToNull(stat(p))
    return s && fileStat(s)
  },
```

- **Chunking and the Flush:** the host flushes whatever group it's handed, all at once: `Promise.allSettled(files.map(stage))` puts every `open → writeFile → futimes → fsync` in flight together, and libuv's pool bounds how many flush at a time. Chunk size is the caller's, because the caller holds the chunk's locks (*§4*, `CHUNK = 64`). That matches the Investigation's measured "chunks of 64: temps, fsync together, renames" shape (2.6 ms per file, 1.6 ms with a 16-thread pool).
- **The Temp:** `.landing-<12 hex>` beside the file, opened `wx` (O_EXCL), so two unlocked writers to one path can never share a temp. The dot puts it outside `neverWatched`'s leaf rule (`exclusion.ts:20-29`), which covers the watcher (`watcher.ts:55-67`), Sync's manifest (`exclusion.ts:37-53`, including `.trash` and the asset root), and the walk (not `.md`; `fileEvents.ts:268`). It's fixed-length, so a page named near the 255-byte limit still lands. Today write-file-atomic appends up to 11 characters, and such a page fails with ENAMETOOLONG (*inferred* from `getTmpname` and APFS's 255-byte names).
- **Cleanup:** a file that fails at any step after its temp exists closes the handle and removes the temp (`discard`). `FileHandle.close()` on an already-closed handle resolves (*inferred* from Node's `lib/internal/fs/promises.js`), so `commit`'s catch is safe after its own close. A process killed mid-group leaves a dotted temp that nothing in the app or Sync admits. write-file-atomic's signal handler covered only catchable signals; quitting already drains every held lock first (`main.ts:453`, `drainFileLocks`).
- **Windows:** `outlastHolder` now retries only the rename, which is the step another app's open handle blocks. Today it retried the whole write, temp and flush included. libuv opens with all three share modes, but the handle closes before the rename anyway.

##### A Single Write

A single write is a group of one. Every single writer goes through one of two Core helpers (*§4*): `sole(landOwn([...]))` for an own write, and `sole(machine().land([...]))` for Sync's.

##### The Test Machines (`Core/Testing/machines.ts`)

`memoryMachine` drops `put`, `writeText`, `writeBytes`, and `utimes`, and gains:

```ts
  const entryStat = (e: { text: string; mtimeMs: number }): FileStat => ({
    size: e.text.length,
    mtimeMs: e.mtimeMs,
    birthtimeMs: null,
    isDirectory: false,
  })
  // ...
    land: (list) =>
      Promise.allSettled(
        list.map(async ({ path, data, mtimeMs, expect }) => {
          if (dirs.has(path)) throw new Error(`EISDIR ${path}`)
          if (expect && !sameFile(expect, await machine.stat(path))) throw new Error(`${path} changed`)
          const e = { text: typeof data === 'string' ? data : decoder.decode(data), mtimeMs: mtimeMs ?? ++clock }
          files.set(path, e)
          return entryStat(e)
        }),
      ),
```

Its `stat` reuses `entryStat`. `diskMachine` replaces `atomicWrite` (`:142-151`) with the same shape minus the flush and the mode, since it's the fast Core double. Core tests install it (`Core/vitest.setup.ts:7`), and a real flush per test write would cost seconds:

```ts
async function landOnDisk({ path, data, mtimeMs, expect }: Landing): Promise<FileStat> {
  const was = await absentToNull(stat(path))
  if (expect && !sameFile(expect, was && toStat(was))) throw new Error(`${path} changed`)
  const tmp = join(dirname(path), `.landing-${process.pid}-${Math.random().toString(36).slice(2)}`)
  try {
    await writeFile(tmp, data, { flag: 'wx' })
    if (mtimeMs !== undefined) await utimes(tmp, mtimeMs / 1000, mtimeMs / 1000)
    await rename(tmp, path)
  } catch (e) {
    await rm(tmp, { force: true })
    throw e
  }
  return toStat(await stat(path))
}
// diskMachine: land: (list) => Promise.allSettled(list.map(landOnDisk)), and stat maps through toStat.
```

---

#### 4. Every Writer Afterward

##### `Core/Files/atomicWrite.ts`

The imports gain `type FileStat, type Landed, type Landing` from `../Platform/machine`, `isMarkdownFile` from `../Paths/posix`, and `type FileEvent` from `./writeEcho`. `land` (`:13-16`) and `rewritePreservingTimes` (`:28-39`) leave. Then:

```ts
/** Lands own writes through the machine's one landing, each echo recorded before its name points at the bytes; a file landed under a kept time drops the walk cache's parse, which that time would otherwise vouch for. */
async function landOwn(files: readonly Landing[]): Promise<Landed[]> {
  for (const f of files) recordWrite(f.path, f.data)
  const landed = await machine().land(files)
  for (const f of files) if (f.mtimeMs !== undefined) forgetParse(f.path)
  return landed
}

/** A lone file's landing: its stat, or the reason it didn't land, thrown. */
async function sole(landing: Promise<Landed[]>): Promise<FileStat> {
  const [landed] = await landing
  if (landed.status === 'rejected') throw landed.reason
  return landed.value
}

// Both text writers report 'change' for a new file too, since the tree and the index take an add and a change alike.
export async function atomicWriteFile(
  filePath: string,
  data: string,
  bodyOnly = false,
): Promise<void> {
  const stat = await sole(landOwn([{ path: filePath, data }]))
  await noteOwn([{ event: 'change', absPath: filePath, origin: 'own', text: data, bodyOnly, stat }])
}

/** A file read for a rewrite under its lock: its stat ahead of its text, so the stat never postdates the text the rewrite works from. */
export type HeldRead = { file: string; was: FileStat; before: string }

export type HeldRewrite = HeldRead & { after: string }

export async function readHeld(file: string): Promise<HeldRead | null> {
  const was = await machine().stat(file).catch(() => null)
  const before = was && (await readTextOrNull(file))
  return was && before !== null ? { file, was, before } : null
}

/** Lands rewrites `readHeld` read as one group, under the locks their reads still hold: a page keeps its time, a file that changed since its read is left as its writer left it, and the ones that landed are noted together. */
export async function landRewrites(rewrites: readonly HeldRewrite[]): Promise<Landed[]> {
  if (!rewrites.length) return []
  const landed = await landOwn(
    rewrites.map(({ file, was, after }) => ({
      path: file,
      data: after,
      mtimeMs: isMarkdownFile(file) ? was.mtimeMs : undefined,
      expect: was,
    })),
  )
  const events: FileEvent[] = []
  rewrites.forEach(({ file, after }, i) => {
    const r = landed[i]
    if (r.status === 'fulfilled')
      events.push({ event: 'change', absPath: file, origin: 'own', text: after, stat: r.value })
  })
  await noteOwn(events)
  return landed
}

// Sync's landing records no echo and notes no event, so the watcher reports it like any outside write and the tree and index take it from that event.
export async function landBytes(
  filePath: string,
  bytes: Uint8Array,
  mtimeMs: number,
): Promise<void> {
  await sole(machine().land([{ path: filePath, data: bytes, mtimeMs }]))
  forgetParse(filePath)
}

export async function atomicWriteBinary(filePath: string, data: Uint8Array): Promise<void> {
  const stat = await sole(landOwn([{ path: filePath, data }]))
  // 'add', since the asset arm lists a path only on an add, where a 'change' bumps the version of one already listed.
  await noteOwn([{ event: 'add', absPath: filePath, origin: 'own', stat }])
}

export function rewritePageSerialized(
  file: string,
  rewrite: (content: string) => string | null,
): Promise<boolean> {
  return machine().lock(file, async () => {
    const read = await readHeld(file)
    const after = read && rewrite(read.before)
    if (read === null || after === null) return false
    await sole(landRewrites([{ ...read, after }]))
    return true
  })
}
```

**Scout B Dependency:** these bodies assume `noteOwn` takes `FileEvent[]` and that an own `Changed` carries `stat?: FileStat`, which `indexWrittenPage` records instead of stating (S9a). Scout B owns both shapes. `relocate` (`:72`) and `discardFile` (`discard.ts:46`) wrap their one event in an array.

**One In-Flight Decision:** `rewritePageSerialized` now passes `expect` too, because it lands through the same `landRewrites` as the sweep. If an outside write lands during its one flush (about 6 ms), it now rejects with "changed while its write waited" where today it silently overwrites that edit. Its callers already treat a rejection as a failed adoption or remint. I took the consistent, correct path, but it changes race-only behavior, so it should be named to Nathan as the brief's *Outside Edits* gain applied to the lone rewrite as well. The alternative is a second landing path that omits `expect` for this one caller, which the Mandate's One Way rules out without a stronger reason.

##### `Core/Nexus/governedSweep.ts`

The import (`:1-7`) collapses to one line: `import { type HeldRewrite, jsonText, landRewrites, parseJsonObject, readHeld } from '../Files/atomicWrite'`. `guarded` (`:51-55`) leaves. `SweepResult.skipped`'s doc gains "one that changed while its chunk waited, and one whose landing failed". `rewritten` passes the parsed page to a text plan (*§6*). Then:

```ts
/** The files a sweep holds and lands together, so their bytes reach the drive in one flush. */
const CHUNK = 64

/** Runs `fn` holding each key's lock, taken in sorted order, so two sweeps sharing files never each hold a lock the other waits on. */
const holdingEach = (keys: readonly string[], fn: () => Promise<void>): Promise<void> =>
  [...keys]
    .sort()
    .reduceRight<() => Promise<void>>((inner, key) => () => machine().lock(key, inner), fn)()

/** `file` read and rewritten under its lock; null where nothing lands, the file counted where it belongs. */
async function readPass(
  plan: SweepPlan,
  file: string,
  out: SweepResult,
): Promise<HeldRewrite | null> {
  const read = await readHeld(file)
  const after = read && rewritten(plan, file, read.before)
  if (read === null || after === undefined) out.skipped.push(file)
  if (after === undefined) out.refused.push(file)
  return read && typeof after === 'string' ? { ...read, after } : null
}

/** Files are absolute, pages and Space sidecars alike. */
export async function sweepGovernedRoots(
  files: string[],
  plan: SweepPlan,
  dry = false,
): Promise<SweepResult> {
  const out: SweepResult = { touched: new Map(), skipped: [], refused: [] }
  const unique = [...new Set(files)]
  for (let at = 0; at < unique.length; at += CHUNK) {
    const chunk = unique.slice(at, at + CHUNK)
    await holdingEach(chunk, async () => {
      const due: HeldRewrite[] = []
      for (const file of chunk) {
        const rewrite = await readPass(plan, file, out)
        if (rewrite) due.push(rewrite)
      }
      const landed = dry ? [] : await landRewrites(due)
      due.forEach(({ file, before, after }, i) => {
        if (dry || landed[i].status === 'fulfilled') out.touched.set(file, { before, after })
        else out.skipped.push(file)
      })
    })
  }
  return out
}
```

- **Why `unique`:** the old one-lock-per-file loop tolerated a repeated path, because its second pass found nothing to change. A repeated path in one chunk would now be rewritten twice from the same read, with the second landing refused. No caller passes repeats today (*inferred*: `cascade.ts:262` dedupes, and the others concatenate disjoint kinds), so this is a single line that closes a hazard the chunking itself creates.
- **Order:** files are processed and `touched` is filled in input order; only lock acquisition is sorted.
- **Empty Chunks:** a chunk with nothing due (most of an option rename's 6,984 reads for 1,397 writes) returns from `landRewrites` before any landing or note. **Scout B Constraint:** an empty or skipped note must not move the tree's epoch, or each one restarts a walk in flight, which is the re-walk W-2 removes.
- **Per-File Failures:** `readHeld` never throws, and a landing failure is per file. `guarded` also caught a throwing plan. No plan throws on input `sweepParse` admitted (`rewriteRoot` → `mergedBlock` throws only on what `writable` refused, `pageFile.ts:107-126,202-206`), and a plan that did throw would now fail its sweep loudly rather than skip one file (*inferred*; plans weren't each read).
- **Dry Runs:** `sweepCount` reads under the chunk's locks and lands nothing.
- **Callers:** none of the 17 call sites listed in the Investigation's §5 changes.

##### `Core/Paths/exclusion.ts` and Two Sync Lines

`TEMP_SUFFIX` (`:8`) and `:47` leave. `manifestAdmits` returns `(rel: string) => boolean`. `push.ts:165` and `reconcile.ts:75` become `listPathsUnder(root, abs, admits)` and `listPathsUnder(session.root, session.root, admits)`.

##### `Desktop/main.ts`

```ts
// Read when libuv's pool first starts: a landing's flushes otherwise share four threads with every other file call.
process.env.UV_THREADPOOL_SIZE ??= '16'
```

This goes after the imports, before `installMachine` (`:72`). See *§5* on whether it takes effect.

---

#### 5. Sync and the Thread Pool

##### Sync

- **`utimes` Folds In:** its only callers were the two Core writers. `landBytes` becomes two lines, `sole(machine().land([{ path, data: bytes, mtimeMs }]))` then `forgetParse`.
- **Sync's Behavior Afterward:** the same temp, flush, and rename (today write-file-atomic's, now the host's), still no echo and no event, a volume that refuses the time still lands the bytes dated now, and `forgetParse` still runs. One thing improves: the time is set on the temp before the rename, so the file never appears under its name dated now. Today a watcher `stat` landing between the rename and the `utimes` could see "now" (*inferred*). `Core/Sync/Arrival/land.ts:96` and its `recordBase` mtime are untouched.
- **The One Sync-Code Touch:** the two `manifestAdmits` lambdas above, which behave the same. The only difference is that a `Page.md.<digits>` leftover from a past write-file-atomic crash, already on a user's disk, would now sync as an ordinary file. That's for Nathan under Decision 1. Keeping `TEMP_SUFFIX` instead leaves a rule matching a temp nothing produces.

##### The Thread Pool

- **Where:** `Desktop/main.ts`, the Electron main entry and the only `rollupOptions.input` for main (`electron.vite.config.ts:8`). There's no separate Desktop entry, since `Desktop/vitest.setup.ts` only installs `nodeMachine` for tests, which don't need it.
- **Whether It Takes Effect:** libuv reads `UV_THREADPOOL_SIZE` once, when its pool first starts, and bundled imports run before `main.ts`'s own statements. The line works only if no imported module's top level and nothing in Electron's own startup queued pooled work first (*inferred*: Electron's browser init reads synchronously, and no top-level async fs call was found, though not exhaustively). The plan should confirm it with the harness before keeping the line. With the pool at 16, a Medium property rename's per-file cost should read near 1.6 ms rather than 2.6 ms. If it doesn't, the line goes.
- **Whether It's Safe:** yes. The threads are idle when unused, their stacks are reserved rather than committed, and libuv caps the pool at 1024. The pool also serves chokidar's stat polling, DNS, and crypto, which all gain.
- **Whether It Earns a Line:** yes, on two counts. First, about 38% off the flush-bound cost (2.6 to 1.6 ms per file, measured). Second, head-of-line blocking: a chunk queues 64 `fsync`s ahead of every other pooled call in main, including a page open's `readFile`. With 4 threads, a read issued mid-chunk waits about 16 flush rounds (about 100 ms); with 16, about 4. Today's sweep holds one flush in the pool at a time, so this wait is new with chunking, and the pool size is what bounds it (*inferred* from libuv's FIFO queue).

---

#### 6. The Two Inferred Claims, Settled

##### The App Writes as Each File's Owner: Settled From Code, With One Caveat

- **Owner:** write-file-atomic's `chown` can't preserve an owner for a non-root process. `chown` to another uid fails with EPERM, which `isChownErrOk` swallows when `process.getuid() !== 0` (`lib/index.js:65-78,128-134`), so the landed file is owned by the app's user, today and after. Pommora ships for macOS and Windows only (`Desktop/electron-builder.yml:23,28`) and doesn't run as root. On Windows, `process.getuid` is undefined, so chown never runs (`:105`). Dropping it leaves the owner unchanged.
- **Group (the Caveat):** on macOS a new file takes its folder's group (BSD semantics), and a rename keeps the inode's group. `chown` could restore the original's group only where the user belongs to it and it differs from the folder's, such as a file moved in from a folder with another group. That case is negligible in a personal Nexus, and the plan should name it rather than carry a chown for it.
- **Mode:** write-file-atomic's `chmod` isn't redundant. `open(tmp, 'w', mode)` filters through the umask, so a 0o664 or 0o600 original wouldn't keep its mode without it. That's why `commit` runs `handle.chmod(held.mode)` when the temp's mode differs, which is a single call that's normally skipped.
- **Realpath:** dropping it changes one case. A symlinked leaf file is now replaced by a regular file, where today it's written through to its target. The tree never holds one (`walk.ts:11` admits `kind === 'file'` only, and a symlink lists as `'other'`), but `listPathsUnder` (`walk.ts:70-72`) lists a non-directory entry as a file, so a corpus-wide relink with no index (`cascade.ts:241`) could reach a symlinked `.md`, as could a JSON config a user symlinked. *Inferred* rare. The plan should name it.

##### A Text Plan Can Rewrite the Held Parsed Document: Settled, Feasible

`renameFrontmatterKey` (`pageFile.ts:221-246`) does `splitEnvelope` → `parseDocument(frontmatter)` → refuses on errors or a non-map → mutates `items` → `serialized(doc)` → `assembleEnvelope(out, body)`. `sweepParse` (`:281-284`) holds exactly that `doc` from the same `splitEnvelope`, admitted only when `mergeable` (no errors, null or a map) and `writable`. The sweep calls a text plan only after `sweepParse` admits (`governedSweep.ts:64-66`) and uses each `SweptPage` once, so mutating its `doc` is safe. The shape:

- **`pageFile.ts`:** the body of `renameFrontmatterKey` after its parse moves into `rekeyDoc(doc, from, to, collision): boolean`. `renameFrontmatterKey(content, …)` stays as parse plus `rekeyDoc` plus serialize, because `restoreScrub.ts:105` chains it over text, and that's the Trash plan's to change. `SweptPage` gains `rekey(from, to, collision): string | null` (the same over the held `doc`, through `envelope(fenced, …)`) and `body: string`. `merge` gains an optional body and, with no keys, keeps the frontmatter's own bytes, as `mergeFrontmatter`'s body-only path does (`:215`). No `merge` caller passes zero keys today (`governedRoot.ts:182`), so only the new use reaches that branch.
- **`RewriteText`:** this becomes `(content: string, file: string, page: SweptPage) => string | null`. `restoreScrub.ts:195-199`'s plan works on the text, so `content` is a real input rather than compatibility.
- **`pageLeg` and `renamePlan`:** `pageLeg` (`contextCascade.ts:46-50`) and `renamePlan`'s `text` (`registryProperty.ts:145-146`) become `(_content, _file, page) => page.rekey(…)`, and both drop their `renameFrontmatterKey` import.
- **`fileRewrites.text`** (`cascade.ts:200-208`) reads `page.raw` in place of `splitFrontmatter(content)`, which is the same `valuesOf(parseDocument(fm))`, and `page.body` in place of `splitEnvelope(content).body`. It lands through `page.merge(patch, keys, undefined, next)`. The zero-key verbatim branch is required here, or a body-only relink would re-spell untouched frontmatter.
- **Cost:** about +10 production lines in `pageFile.ts`, minus 2 in `cascade.ts` and 2 imports, for one fewer parse and serialize per text-plan file. It also makes `pageFile.ts:280`'s "one parse serves a sweep's admission, its read of the values, and its merge" true, which today it isn't for text plans. This sits with W-2's parses; it's separable from the landing.

**For the Trash Plan:** `restoreScrub`'s `text` never answers null (`restoreScrub.ts:104-107` returns `content` when nothing moves), so its sweep rewrites, and now flushes, every artifact file even when unchanged. Its `seen` bookkeeping depends on that, so it's left as is here.

---

#### 7. Tests

##### Break on Purpose and Get Rewritten

- **`Core/Testing/machineContract.ts`:** the write cases at `:30-35` ("writes then reads", now via `land`), `:37-46` (the concurrent-reader atomicity case, now with `land` of one file), the setup writes at `:49,61,76,83`, and `:88-92` ("utimes moves the modification time", which becomes "a landing keeps the time it's given and answers the stat the file then holds"). It runs on all three machines (`contracts.test.ts:13-21`, `nodeMachine.test.ts:5-8`).
- **`Core/Platform/machine.test.ts:52-58`:** this used `rewritePreservingTimes` and moves to `rewritePageSerialized`, which keeps the time.
- **`Core/Files/atomicWrite.test.ts`:** `:403-413` (a preserved-time rewrite's note) moves to `rewritePageSerialized`. The own-tap expectations at `:391-401,415-419` take the array form and `stat: expect.any(Object)` (Scout B's shape).
- **`Core/Testing/hostFs.ts:39-52`:** `refuseWrites` becomes one seam over the landing:

  ```ts
  /** Fails each landing `refuses` picks, as a disk refusing the write, and lands every other file. */
  export const refuseLandings = (refuses: (file: string) => boolean) => {
    const m = machine()
    const real = m.land
    return vi.spyOn(m, 'land').mockImplementation(async (files) => {
      const landed = await real(files.filter((f) => !refuses(f.path)))
      return files.map((f) =>
        refuses(f.path) ? { status: 'rejected', reason: new Error('refused') } : landed.shift()!,
      )
    })
  }
  ```

  Its users migrate: `archive.test.ts:905,1113`, `settle.test.ts:1304-1305` (two calls become one), `spend.test.ts:1790,1822`, and `trashRecovery.test.ts:912,993,1017`. For the four `editJsonStrict` refusals, refusing the sidecar's landing makes `editJsonStrict` reject into the same `configReach.ts:321` catch (*inferred* equivalent; each targets a sidecar edit that writes).
- **Module Mocks:** `restoreScrub.test.ts:27-36`'s module mock becomes `refuseLandings((f) => trashWrites.fail && f.includes('/.trash/'))`, and `notesWiring.test.ts:30-37,82-85` observes `machine().land` instead of `rewritePreservingTimes`.
- **Read Spies That Would Go Vacuous:** `spend.test.ts:515` and `trashRecovery.test.ts:689` assert *zero* sweep reads through `vi.spyOn(atomicWrite, 'readTextOrNull')`. `readHeld` calls it inside its own module, where the spy can't see it, so those assertions would pass whatever happens. They must spy `machine().readText` instead.
- **`exclusion.test.ts:151-154,158`** leaves with `TEMP_SUFFIX`.

##### New Invariant Tests, Each Failing Without Its Change

| Invariant | Test | Where | Fails Without |
|---|---|---|---|
| Refusing a changed file | A group of two whose first `expect` is stale: the first rejects and keeps the other writer's bytes, and the second lands | `machineContract.ts` (all three machines) | the `sameFile` check |
| Refusing an absent file | `expect` on a path removed since: rejects and creates nothing | `machineContract.ts` | the `null` arm of `sameFile` |
| The flush before the rename, as a group | `vi.mock('node:fs/promises')` wraps `open` (logging each handle's `sync`) and `rename`: landing three files logs `sync ×3` then `rename ×3` | `Desktop/Platform/nodeMachine.test.ts` | the `sync`, or flushing inside each file's own landing |
| Temp cleanup on failure | Landing onto an existing folder rejects alone, and `readDir` shows no `.landing-*` | `machineContract.ts` (memory throws `EISDIR`; disk and node fail at `rename`) | `discard` in `commit` |
| Temp cleanup in staging | A landing whose data can't be written (`42 as never`) rejects, leaving no temp | `nodeMachine.test.ts` | `discard` in `stage` |
| The temp stays invisible | Capture the temp a landing renames; `syncIgnoredUnder(root, scope)(temp)` is true and `manifestAdmits(scope)(rel)` is false | `nodeMachine.test.ts` | the leading dot |
| Mode kept | A 0o664 file rewritten keeps 0o664 (skipped under `noModeBits`, `hostFs.ts:21`) | `nodeMachine.test.ts` | the `chmod` |
| Kept time and the answer's stat | `mtimeMs` given as a whole second (as `machineContract.ts:90` does, since a fractional ms needn't round-trip through libuv's float timespec): the answer equals a later `stat(path)`, and its mtime is the given time | `machineContract.ts` | `utimes` on the temp, or answering a pre-`utimes` stat |
| The sweep refuses an outside write mid-chunk | Spy `land` to `writeFile` one target before delegating: that file is `skipped` with the outside bytes, the other is rewritten, and Try Again stays owed | `governedSweep.test.ts` | `expect: was` in `landRewrites` |
| An in-app writer waits for the chunk, not refused | Pause `land` (spy), issue `updatePageBody` on a chunk file (`lockContention` shows it waits), release: both edits land and nothing is skipped | `governedSweep.test.ts` | the lock spanning read to record |
| No deadlock between overlapping sweeps | `Promise.all([sweep([a, b]), sweep([b, a])])` with `land` delayed: both finish | `governedSweep.test.ts` | the sort in `holdingEach` (it times out) |
| Chunk boundaries | 65 files make two `land` calls of 64 and 1 | `governedSweep.test.ts` | `CHUNK` |

`cascadeRace.test.ts:62-90` (a cascade queues behind an in-flight cell write) and `fileLock.test.ts:58-77` (a queued rewrite reads fresh) still hold unchanged. They pin the lock behavior the chunk keeps.

---

#### 8. Line Delta

Production code lines, counted from the code above, excluding comments and blank lines:

| File | Added | Removed | Net |
|---|---|---|---|
| `Desktop/Platform/nodeMachine.ts` | 58 (helpers 51, `FileHandle` import 1, Machine import wrap 6) | 13 (import 1, `asBuffer` 2, three methods 3, `stat` body 7) | **+45** |
| `Core/Platform/machine.ts` | 13 (`Landing` 6, `Landed` 1, `sameFile` 5, `land` 1) | 3 | **+10** |
| `Core/Files/atomicWrite.ts` | 37 (`landOwn` 6, `sole` 5, two types 2, `readHeld` 5, `landRewrites` 19) | 19 (`land` 4, `rewritePreservingTimes` 10, `landBytes` 3, `atomicWriteBinary` 1, `rewritePageSerialized` 1) | **+18** |
| `Core/Nexus/governedSweep.ts` | 34 (`CHUNK` 1, `holdingEach` 4, `readPass` 11, body 18) | 33 (import 6, `guarded` 4, old body 23) | **+1** |
| `Core/Paths/exclusion.ts` | 0 | 2 | **−2** |
| `Core/Sync/Client/push.ts`, `reconcile.ts` | 0 | 0 | **0** |
| `Desktop/main.ts` | 1 | 0 | **+1** |
| **The Landing (W-1, This Domain)** | **143** | **70** | **+73** |
| *Text Plans Over the Held Document (W-2, Separable)* | *about 12* | *about 4* | *about +8* |

Beside that: `Desktop/package.json` loses 2 dependency lines, and the lockfile loses `write-file-atomic`, `@types/write-file-atomic`, and `signal-exit@4.1.0`. Test code (not counted) nets down: `memoryMachine` loses `put` plus three methods for one `land`, and `hostFs` loses its `writers` map.

**Against the Investigation's Estimate:** it put the Desktop writer at about +35. This one counts +45, where the extra ten are the Machine import's wrap (6), mode preservation, which it assumed came free from a stat, and cleanup at both stages. The sweep's passes come in at +1 rather than its +20, because the old body, `guarded`, and a seven-line import pay for them.

**What the +73 Buys:** a dependency and its transitive `signal-exit`, three Machine methods folded into one, a duplicate per-path queue, `rewritePreservingTimes` and the private `land`, `guarded`, `asBuffer`, the manifest's temp rule and its `siblings` plumbing, a mis-ordered stat, and per-file `realpath`/`chown`/`chmod`/`utimes` calls. Every page write gets one landing primitive, every flush is shared by up to 64 files, and outside edits made mid-sweep stop being silently overwritten. Most of the added lines are the host doing in about 50 lines what about 160 lines of library code did.

---

#### 9. Risks and Insights

- **Where the Investigation Is Wrong:**
  - Its two-hold lock design (*§3 · Per File, Under Its Lock Again*) refuses or overwrites concurrent in-app writes, so the lock has to span the chunk.
  - Its step-6 newer-write skip falls away as a consequence.
  - "Owner is kept" is settled rather than inferred, and the real caveat is group and symlinks.
  - `fileLock.ts` lives in `Desktop/Platform`, not `Core/Platform` as the brief gives it.
  - The write-file-atomic temp's add and unlink weren't only "classified as ignored": Sync carried a dedicated rule for them, which is now residue.
- **The Dropped Re-Entrancy Catch Checks Itself:** a sweep that ever runs under a lock on one of its own files now rejects the whole sweep rather than skipping that file, so the existing suite surfaces any such caller on the first `npm run test`.
- **Deadlock Precondition:** freedom from deadlock rests on no code holding two file locks except a sweep's sorted chunk. The overlapping-sweeps test pins the sweep side. A future nested page lock elsewhere would break the precondition silently, so `holdingEach`'s doc states it where a reader meets it.
- **Lock Hold Time:** an in-app write to a file in the active chunk waits up to one chunk: reads, a group flush of about 100-170 ms, and the record. That's acceptable, and it's the price of keeping today's no-refusal behavior for in-app edits.
- **Head-of-Line Blocking:** a chunk's 64 flushes queue ahead of other pooled calls in main (*§5*). The 16-thread pool bounds the wait, and if the harness shows the pool line doesn't take effect, main's other file calls inherit the wait during cascades.
- **Record Under Locks:** `noteOwn` for a chunk runs while 64 locks are held. It works today under one. If `applyOne` for a `change` ever took a page lock, it would now be refused re-entrantly for any chunk file (caught by `fileEvents.ts:660` as a walk). Scout B should confirm that no change-event path locks a page.
- **Windows Birthtime:** NTFS creation-time tunneling can give a file renamed into a just-vacated name the old creation time (*inferred*). The answer's `birthtimeMs` may then differ from a later `stat` on Windows. The index records only mtime and size, so nothing depends on it, but `sameFile`'s birth term adds no strength on Windows.
- **Stale Echo Records:** `landRewrites` records every chunk file's hash before landing, so a refused file leaves a record for bytes it never held. The outside writer's event finds other bytes and clears it (`writeEcho.ts:104`), and Sync's tap hears a `wrote` it would hear from the watcher anyway. A failed write leaves one today too (`atomicWrite.ts:14-15`).
- **Race-Only Behavior Changes, for Nathan:** a sweep or a lone rewrite now refuses a file an outside writer changed mid-flight, where today it overwrites it; a symlinked leaf is replaced; a file whose group differs from its folder's takes the folder's group; and a page named near the length limit, which today fails to save, now saves.
- **Unlocked Writers:** `writeJson` at `identity.ts:34-53`, `folderEntity.ts:104`, `record.ts:121`, and `atomicWriteFile` at `contextWrite.ts:180` and `tilesFile.ts:62` take no lock. Each is awaited in sequence within its own flow, so write-file-atomic's queue never reordered anything there. Unique `wx` temps mean concurrent unlocked writers can't corrupt a file even if one appears (*inferred*: no concurrent same-path flow found).
- **The `diskMachine` Double Stays Unflushed:** Core's suites never exercise the real flush or mode; `nodeMachine.test.ts` must carry those, as the table assigns.
