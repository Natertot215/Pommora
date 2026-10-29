### Write Path Scout B — The Sweep, Recording, and the Reads

**HEAD:** `15fe7422a` on `active`. Read-only; nothing was run. Every claim cites `path:line` at that head; *inferred* marks what no run confirmed.
**Profile:** neither `scratchpad/bench/reach-in-measurement.md` nor `.claude/Planning/Trash & Archive Restructure/Trash & Archive Restructure — Reach-In Measurement.md` existed at the end of this pass (the matrix's Large runs were still finishing, `bench/large.log`). `bench/profile.mjs:1-3` will record "what starts each walk"; *§The Walk Race* names what that output has to confirm.
**Seam Assumption:** scout A owns the Machine seam. This report assumes a single `machine().land(landings)` taking `{ path, data, mtimeMs?, expect? }[]` and answering, per file, `{ ok: true, stat: FileStat }` or a refusal/failure, with **per-file** failures (a file whose temp can't be created fails alone, as `governedSweep.test.ts:37-61` requires), and **no lock taken inside** (callers hold it; `serializeOnFile` refuses re-entry, `Desktop/Platform/fileLock.ts:9-16`).

---

#### 1. Inventory

##### The Sweep

- **`sweepGovernedRoots`** (`Core/Nexus/governedSweep.ts:71-100`): per file, `guarded` takes the lock (`:52-55`), `readTextOrNull` (`:80`), `rewritten` (`:57-68`: `sweepParse` then `plan.text(content)` or `rewriteRoot`), then `rewritePreservingTimes` for a page or `atomicWriteFile` for a sidecar (`:92-95`). A throw anywhere in the body (lock, read, plan, write) lands the file in `skipped` (`:55`).
- **`sweepCount`** (`:110-113`): the same pass with `dry`, Archive paths left out, answering `touched.size`. Callers: `registryProperty.ts:201`, `optionOps.ts:364,391`, `deleteProperty.ts:82`.
- **`sweepRootsById`** (`:119-144`) and **`refillValues`** (`:159-168`): a raw plan with `above`; `skipped` files drop out of `taken` (`:142`). Callers: `restoreProperty.ts:84`, `spend.ts:280,313`, `assignment.ts:73`.
- **Every `sweepGovernedRoots` caller:** `registryProperty.ts:155`, `optionOps.ts:246`, `deleteProperty.ts:137`, `unassignProperty.ts:88`, `contextCascade.ts:78,115`, `cascade.ts:131,265,306,316`, `restoreScrub.ts:194`, `trashedCopies.ts:100`, `exclusionScan.ts:83`, `repairSweep.ts:25`, plus `sweepRootsById` (`governedSweep.ts:132`).
- **Text plans** (`RewriteText = (content, file)`, `governedSweep.ts:36`): `renamePlan`'s `renameFrontmatterKey` (`registryProperty.ts:145-146`), `pageLeg` (`contextCascade.ts:46-50`), `fileRewrites.text` (`cascade.ts:200-209`: `splitEnvelope`, `splitFrontmatter`, then `mergeFrontmatter`), and `restoreScrub`'s (`restoreScrub.ts:194-198`, a Trash-plan file). `renameFrontmatterKey` (`Core/Files/pageFile.ts:221-250`) parses again; it has a second, non-sweep caller in `restoreScrub.ts:105`.
- **Parses per rewritten page today:** `sweepParse` (parse + the round-trip serialize in `writable`, `pageFile.ts:126`), the text plan (one, or two for a Link-value patch), `extractPageIndex` (`indexSeed.ts:41`), `pageRecordOf` (`readNexus.ts:115-116`), and the settle's `readPageRecord` (`optionOps.ts:150`). That's five or six, as the Investigation counts.

##### Recording

- **`noteOwn`** (`Core/Files/writeEcho.ts:59`): one event through `ownTap`, installed as `applyOwn` (`Core/Nexus/settle.ts:68`). Six single-event callers: `atomicWrite.ts:25,38,58,72`, `spend.ts:74`, `discard.ts:46`.
- **`applyOwn`** (`settle.ts:53-65`): root check, `diskMoved()` per non-body-only write (`:57`), then `applyEvents(root, [ev])` with a held tree or `indexEvent` without one.
- **`applyEvents`** (`Core/Nexus/fileEvents.ts:647-666`): per event, `indexEvent` (`:655`) then `applyOne` (`:657`). No `applyOne` arm reads the index: `fileEvents.ts` imports `contentIndexStore` only for `oweSeen` (`:302`), and `noteExternalEdit` reads the tree (`Core/Pages/fileHistory.ts:136-139`).
- **`indexEvent`** (`fileEvents.ts:273-298`): per event, `moveIndexPaths`, `deindexPath`, or `indexWrittenPage`; owes what it saw only for watched events (`:282,290`).
- **`indexWrittenPage`** (`Core/Index/indexSeed.ts:108-131`): a `stat` (`:117`), the text, a `readIndexedStat` SELECT, `extractPageIndex`, and `reindex` of one row (`:127`), which is `readHeadings` + `upsertPageIndexes` (`:134-136`), one transaction per page (`Desktop/Store/stores.ts:58-85`, `driver.ts:19-29`). The store already takes many rows; nothing in the store changes.
- **Tree patch:** `applyPage` (`fileEvents.ts:361-403`) → `patchLiveTree` (`Core/Nexus/liveTree.ts:38-44`, bumps the epoch on any change) → `updateNodeInTree`.

##### The Reads Around a Sweep

- **Clash check** (`registryProperty.ts:178-187`): `findHolders(..., [prior.key, moved.key], 'values')` reads and parses every holder of *either* key (`keyHolders.ts:109-111`), the union built at `keyHolders.ts:86`.
- **Pre-confirmation count:** `rekeyHolders` (`registryProperty.ts:192-202`) runs `rekeyPlan` (the clash read) and then `sweepCount` (a second read and parse of every holder). The dialog reads each holder twice before the rename reads it again.
- **Option sweep** (`optionOps.ts:217-224`): every holder of the property's key, though most don't carry the edited word.
- **The settle's re-read** (`optionOps.ts:122-181`, called at `settle.ts:169-172`): with `rels` given, `indexed` is forced null (`:146`), so every changed page and every page of a Collection in `options` is read through `readPageRecord` (`:149-152`), a cache miss after the sweep's `forgetParse`.

##### The Walk

- `walkWhileOwed` (`settle.ts:115-139`), reached from `settle` (`:154,158`), `payOwedWalk` (`:247`, from `underContexts`' `finally`, `:250-257`), `inSettleTurn` (`:260-264`), and `settledIndex` (`:267-271`). `refreshTree` (`liveTree.ts:60-67`) has no other caller with a held tree; `liveTreeOf` walks only with none (`:74-75`). So every walk of a held tree runs from a settle turn, except `finishContext`'s direct `refreshTree` (`Core/Nexus/finishOwed.ts:301`).
- `runWalk` re-walks while the epoch moved during its read (`liveTree.ts:103-124`).

---

#### 2. What Leaves

| Leaves | Where | Why It Can |
|---|---|---|
| `guarded` | `governedSweep.ts:51-55` | The chunk takes its files' locks once; a read failure is a per-file `null` |
| The per-file write branch | `governedSweep.ts:92-95` | One `landOwn` per chunk, a page's mtime carried in the landing |
| `rewritePreservingTimes` | `atomicWrite.ts:28-39` | Its stat moves ahead of the read in the sweep; `utimes` and its swallowed `.catch` (`:33-35`) fold into the landing's `mtimeMs`; `forgetParse` moves into `landOwn` |
| `land` | `atomicWrite.ts:13-16` | Folds into `landOwn` (scout A's writer) |
| `indexEvent` | `fileEvents.ts:273-298` | One `indexEvents` per batch |
| `indexWrittenPage` and its stat | `indexSeed.ts:108-131` | `indexWrittenPages`; an own event carries its landing's stat |
| The settle's forced file branch | `optionOps.ts:146` (`rels \|\| space ? null :`) | The index answers every page it holds; the file loop stays only for a page with no row |
| The comment's rescope rationale | `optionOps.ts:122` | It names a case the uniform rule already covers |
| `renameFrontmatterKey`'s own parse, for a sweep | `pageFile.ts:228-230` | Its body becomes `rekeyDoc`, which a sweep runs on the parse it holds |
| `fileRewrites.text`'s `splitEnvelope` and `splitFrontmatter` | `cascade.ts:201-203` | `page.body` and `page.raw` |
| The clash read of every holder | `keyHolders.ts:86` union | Intersection under `every` |
| The option sweep's reads of pages that don't carry the word | `optionOps.ts:222` | Narrowed by `readPageRelations(paths, key)` |
| Mid-sweep walks | `mutate.ts:253,256`; `finishOwed.ts:86-89` | The rename runs in the settle's turn |

**Misdescribing Comments to Rewrite:** `governedSweep.ts:51` (per-file throws); `settle.ts:56` ("every own write marks the disk moved" → every landing); `fileEvents.ts:1` ("An event maintains the index, then patches" → a batch commits its index once, then patches event by event); `indexSeed.ts:107`; `optionOps.ts:122`. `mutate.ts:88` says "a write that … sweeps … a page runs in the settle's turn", which the Context and Space renames break today and keep after the fix.

**Not Taken:** `classifyEvent`'s test-only export (`fileEvents.ts:215`, used by `fileEvents.test.ts:782`). It's labeled, and rewriting those classifier tests through `applyEvents` costs more than the keyword. `deleteCascade`'s post-sweep `sweepParse(before)` (`cascade.ts:142`) re-parses each stripped page to file its record. It's a second parse, but it sits in the delete's record-minting that the Trash plan's M-1/M-2 rework. Leave it to that plan.

---

#### 3. The Sweep's Passes

##### The Lock Decision (Where the Investigation Is Wrong)

The Investigation takes each file's lock twice, once to read and once to land (*§Invariants · Locks*), with a stat recheck covering the gap. Two problems come out of that:

1. **An in-app writer in the gap can pass the recheck.** A second mtime-preserving sweep (two cascades meeting on one page: a property rename under the schema lock and a Link strip in the settle's turn) can land between this sweep's read and its landing with the same mtime (preserved) and the same size (a same-length rekey). The `(mtimeMs, size)` recheck passes, and the older chunk overwrites it with text computed from stale bytes. `FileStat` carries no inode (`Core/Platform/machine.ts:2-7`) to tell them apart.
2. **The recheck and rename must be under the lock anyway.** `land` is one host call for the chunk, so Core must hold every chunk file's lock across it, or an in-app writer can rename between the host's recheck and its rename. The second take is therefore a chunk-wide hold already.

**Design:** hold each chunk's locks once, from the read through the record, taken in sorted order. In-app writers are excluded for the whole span, the `expect` recheck only has to catch outside writers (who take no lock), and the record runs under the lock. That makes the Investigation's "skip an event whose path has taken a newer own write" unreachable, so it isn't built (*§4*).

**Deadlock Freedom:** sorted acquisition can't cycle as long as no holder of one file lock waits on a second while holding it. Every `lock(` body read here takes one key: `setProperty.ts:22`, `governedRoot.ts:251,263`, `delete.ts:133,135`, `atomicWrite.ts:67,146,186,243,259,323`, `contextWrite.ts:53,93`, `sidecar.ts:44`, `page.ts:23,54`, `tilesFile.ts:152,185,247`, `finishOwed.ts:266`. The directory keys (`serializeSchemaOp`'s `.nexus`, `propertiesRegistry.ts:132-133`; `contextsDir`, `settle.ts:251`) are always taken before any file key. *Inferred:* `Core/Sync/Client/base.ts:29` and `Core/Sync/Arrival/land.ts:92,112` weren't opened. The executor greps every `lock(` body, and a crossing-sweeps test pins it (*§8*).

**Cost:** an editor save on a page inside a chunk waits up to one chunk, roughly 100-170 ms of flush (Investigation *§2*) plus the reads and the record, where today it waits up to about 7 ms. *Inferred* invisible, since body saves are debounced.

##### `Core/Nexus/governedSweep.ts` (AFTER)

```ts
import { jsonText, landOwn, parseJsonObject, readTextOrNull } from '../Files/atomicWrite'
import { type FileStat, machine } from '../Platform/machine'
// … the other imports as they stand, with `sweepParse` joined by its type:
import { type SweptPage, sweepParse } from '../Files/pageFile'

export type RewriteText = (page: SweptPage, file: string) => string | null

/** `raw` rewrites a page's front matter or a Space sidecar's object; `text`, when given, rewrites a page's whole text from its one parse; `above`, when given, places each key a page's rewrite adds. */
export type SweepPlan = {
  raw: Rewrite
  text?: RewriteText
  above?: (root: Json, file: string) => Place
}

// A flush waits on the drive once for the files it holds, so a chunk lands this many together.
const CHUNK = 64

// Taken in one order, so two sweeps meeting on the same files never each hold what the other waits on.
const holding = (files: readonly string[], fn: () => Promise<void>): Promise<void> =>
  [...files]
    .sort()
    .reduceRight<() => Promise<void>>((inner, file) => () => machine().lock(file, inner), fn)()

function rewritten(plan: SweepPlan, file: string, content: string): string | null | undefined {
  if (!isMarkdownFile(file)) {
    const raw = parseJsonObject(content)
    if (!raw) return undefined
    const next = plan.raw(raw, file)
    return next === null ? null : jsonText(next)
  }
  const page = sweepParse(content)
  if (!page) return undefined
  if (plan.text) return plan.text(page, file)
  return rewriteRoot((root) => plan.raw(root, file), plan.above?.(page.raw, file))(page)
}

/** One chunk under its files' locks: each file's stat, then its one read, which its landing is checked against; what `plan` makes of them lands together, a page keeping its modification time, and a landing refused or failed is skipped. A dry run stops at the read. */
async function sweepChunk(
  chunk: readonly string[],
  plan: SweepPlan,
  dry: boolean,
  out: SweepResult,
): Promise<void> {
  const read: { file: string; before: string; after: string; stat: FileStat }[] = []
  for (const file of chunk) {
    const stat = await machine().stat(file).catch(() => null)
    const before = stat && (await readTextOrNull(file))
    if (!stat || before === null) {
      out.skipped.push(file)
      continue
    }
    const after = rewritten(plan, file, before)
    if (after === undefined) {
      out.skipped.push(file)
      out.refused.push(file)
    } else if (after !== null) read.push({ file, before, after, stat })
  }
  const took = dry
    ? read.map(() => true)
    : await landOwn(
        read.map(({ file, after, stat }) => ({
          path: file,
          data: after,
          expect: stat,
          mtimeMs: isMarkdownFile(file) ? stat.mtimeMs : undefined,
        })),
      ).catch(() => read.map(() => false))
  read.forEach(({ file, before, after }, i) => {
    if (took[i]) out.touched.set(file, { before, after })
    else out.skipped.push(file)
  })
}

/** Files are absolute, pages and Space sidecars alike. A chunk's files are held from their read through their record, so no write of the app's lands between; one something outside the app changed since its read is refused and skipped, so its note stays owed for Try Again. A chunk whose locks can't be taken is skipped whole. */
export async function sweepGovernedRoots(
  files: string[],
  plan: SweepPlan,
  dry = false,
): Promise<SweepResult> {
  const out: SweepResult = { touched: new Map(), skipped: [], refused: [] }
  const unique = [...new Set(files)]
  for (let at = 0; at < unique.length; at += CHUNK) {
    const chunk = unique.slice(at, at + CHUNK)
    await holding(chunk, () => sweepChunk(chunk, plan, dry, out)).catch(
      () => void out.skipped.push(...chunk),
    )
  }
  return out
}
```

**What Each Pass Holds per File:** the read pass holds `{ file, before, after, stat }` for a file it will write; an unreadable file goes to `skipped`, an un-round-trippable one to `skipped` and `refused`, and an unchanged one to neither, as `:81-91` does today. The land pass hands `{ path, data: after, expect: stat, mtimeMs }` to `landOwn`. The record pass is `landOwn`'s `noteOwn` (*§4*), under the same locks.

**A Refusal Keeps Try Again:** a refused landing answers `false`, so the file goes to `skipped` once (it never reached `touched`), `sweptReach` counts it (`configReach.ts:212-216`), `retries` is positive (`:219-220`), `runNoted` keeps the entry (`owed.ts:266`), and `owedReport` marks it owed (`owed.ts:214-219`). `sweepRootsById` drops it from `taken` (`governedSweep.ts:142`). `finishOwed` re-runs idempotently, because an already-rewritten file answers `null` (`:91` today, `after === null` here).

**Dry Run:** `dry` stops before `landOwn`, so nothing is recorded, landed, or echoed. The locks are still taken, as `guarded` takes them today. `sweepCount` is unchanged.

**The Stat:** `stat` precedes the read, so it's never newer than the text. It serves both the recheck (`expect`) and the preserved mtime (Investigation S4's mis-ordering, fixed). A sidecar lands with `expect` too, which is new: an outside or Sync write to a Space sidecar mid-sweep is refused rather than overwritten.

**Dedupe:** `unique` keeps today's tolerance of a repeated path. With chunk locks, a duplicate in one chunk would re-take its own key, and the whole chunk would be skipped. No caller is known to pass one (`cascade.ts:262`, `keyHolders.ts:86` dedupe), but the cost of one is 64 skipped files, so the line earns its place.

**Changed Semantics, Disclosed:** a plan that throws now rejects the chunk, and its 64 files are skipped and owed. Today it skips one. *Inferred* a ghost: plans are pure, and `sweepParse` admits only mergeable blocks, so `mergedBlock` can’t throw (`pageFile.ts:202-206`).

##### One Parse Serves Admission, Values, Merge, and Text Plans

`Core/Files/pageFile.ts` (AFTER, the changed parts):

```ts
/** Renames `from` to `to` in `doc` in its place; false when the block holds no `from`. A held `to` is the rival: under `'prefer-new'` it keeps its value and `from` goes; under `'merge'` the two combine through `joinValues` in `from`'s place. The value lands through `setAbove`, so a blank one leaves. */
function rekeyDoc(doc: Document, from: string, to: string, collision: KeyCollision): boolean {
  if (from === to || !isMap(doc.contents)) return false
  const items = doc.contents.items
  const held = (key: string) => items.find((i) => String(i.key) === key)
  const pair = held(from)
  if (!pair) return false
  const rival = held(to)
  if (rival && collision === 'prefer-new') {
    items.splice(items.indexOf(pair), 1)
    setAbove(doc, to, rival.value)
  } else {
    const values = valuesOf(doc)
    const node = rival
      ? nodeSpelledAs(doc, joinValues(values[to], values[from]), [pair.value, rival.value])
      : pair.value
    if (rival) items.splice(items.indexOf(rival), 1)
    setAbove(doc, from, node)
    ;(pair.key as { value: string }).value = to
  }
  return true
}

/** `content` with `from` renamed as `rekeyDoc` renames it; null when nothing moves. */
export function renameFrontmatterKey(
  content: string,
  from: string,
  to: string,
  collision: KeyCollision,
): string | null {
  const { frontmatter, body } = splitEnvelope(content)
  const doc = parseDocument(frontmatter)
  const out = doc.errors.length === 0 && rekeyDoc(doc, from, to, collision) ? serialized(doc) : null
  return out === null ? null : assembleEnvelope(out, body)
}

export interface SweptPage {
  /** The text the page was parsed from, and its body. */
  content: string
  body: string
  raw: Record<string, unknown>
  merge: (modeled: Record<string, unknown>, modeledKeys: readonly string[], above?: Place) => string
  /** The page with `from` renamed to `to` in its place, as `renameFrontmatterKey` renames it. */
  rekey: (from: string, to: string, collision: KeyCollision) => string | null
  // … pair, above, withPair as they stand
}

// in sweepParse's returned object, beside `raw`:
    content,
    body,
    rekey: (from, to, collision) => {
      const out = rekeyDoc(doc, from, to, collision) ? serialized(doc) : null
      return out === null ? null : assembleEnvelope(out, body)
    },
```

The callers change to:

- **`registryProperty.ts:145-146`:** `const text = (page: SweptPage): string | null => page.rekey(from, to, NEW_KEY_IS_FRESHER)`
- **`contextCascade.ts:49`:** `return (page) => page.rekey(oldKey, newKey, NEITHER_KEY_IS_FRESHER)`. The `renameFrontmatterKey` import leaves (`:7`).
- **`cascade.ts:200-209`:**

  ```ts
      text: (page, file) => {
        const own = relative(root, file) === ownRel
        const patch = patchOf(page.raw, isLinkKey, own, page.body)
        const keys = Object.keys(patch)
        const next = own && settled ? page.body : rewrite(page.body, own)
        return next === page.body && keys.length === 0
          ? null
          : mergeFrontmatter(page.content, patch, keys, next)
      },
  ```

  `mergeFrontmatter` keeps its parse only when a Link *value* changes; a body-only re-spell, the common case, doesn’t parse at all (`pageFile.ts:216`). Giving `merge` a body argument would save that rare parse for about six interface lines, so it isn't taken.
- **`restoreScrub.ts:194-198` (a Trash-plan file; a signature touch, no behavior change):** `text: (page, file) => { const next = text(page.content, file); if (next !== null) seen.set(file, [page.raw, splitFrontmatter(next)]); return next }`. `page.raw` is `splitFrontmatter(held)` exactly: both are `valuesOf(parseDocument(frontmatter))`.
- **`governedSweep.test.ts:34`:** `text: (p) => \`${p.content}x\``

**Parses per Rewritten Page After:** one of the read text, which serves admission, the plan, and the serialize, plus one each in `extractPageIndex` and `pageRecordOf` of the written text. That's three, against five or six. The Brief's "parses it once" holds for the read text. Sharing the written text's parse between the index and the tree means threading a parsed record through `indexEvents` and `applyPage`, for about 65 µs per file (around 2% after W-1). Not recommended. The harness doesn't count parses anyway (`bench/instrument.mjs:23` counts Machine calls only), so this is a design claim and not a measured gate.

---

#### 4. Recording per Chunk

**Shape:** `landOwn` (the one Core writer, shared with scout A) records each landing's events in one `noteOwn`. `applyOwn` bumps the epoch once, after the renames and before the record. `applyEvents` commits the batch's index in one transaction, then patches the tree event by event. A single write is a chunk of one through the same path.

##### `Core/Files/atomicWrite.ts` (the Recording Half of `landOwn`)

```ts
/** Lands each file whole under the lock its caller holds: the app's bytes recorded ahead of their landing, so no echo outruns its record, then every file that took recorded in the index and the tree as one batch; answers, per file, whether it took. */
export async function landOwn(
  landings: readonly Landing[],
  { event = 'change', bodyOnly }: { event?: 'add' | 'change'; bodyOnly?: boolean } = {},
): Promise<boolean[]> {
  for (const { path, data } of landings) recordWrite(path, data)
  const landed = await machine().land(landings)
  const events: FileEvent[] = landings.flatMap(({ path, data }, i) => {
    const at = landed[i]
    if (!at.ok) return []
    forgetParse(path)
    const text = typeof data === 'string' ? data : undefined
    return [{ event, absPath: path, origin: 'own', text, bodyOnly, stat: at.stat }]
  })
  await noteOwn(...events)
  return landed.map((at) => at.ok)
}
```

`rewritePreservingTimes` (`:28-39`) and `land` (`:13-16`) leave. `atomicWriteFile`, `atomicWriteBinary` (`event: 'add'`, as `:57-58` needs), and `rewritePageSerialized` become chunks of one through it; their failure semantics belong to scout A. A refused landing has had its hash recorded. Its outside writer's watcher event then carries that hash as `written`, `dropOwnEchoes` finds other bytes and keeps the event, and it drops the record (`writeEcho.ts:101-104`). Sync's write tap hears a path it didn't write, and *inferred* harmless, since it pushes what's on disk.

##### `Core/Files/writeEcho.ts`

```ts
import { type FileStat, machine } from '../Platform/machine'

// The app's own event carries the text it wrote and the stat its landing answered, since its writer still holds the file's lock.
export type Changed = { event: ChangeEvent; absPath: string } & (
  | { origin: 'watched'; written?: string; text?: never; bodyOnly?: never; stat?: never }
  | { origin: 'own'; text?: string; bodyOnly?: boolean; stat?: FileStat; written?: never }
)

let ownTap: ((evs: FileEvent[]) => Promise<void>) | null = null

export function setOwnTap(fn: ((evs: FileEvent[]) => Promise<void>) | null): void {
  ownTap = fn
}

export const noteOwn = (...evs: FileEvent[]): Promise<void> => ownTap?.(evs) ?? Promise.resolve()
```

The rest parameter keeps the four single-event callers byte-identical (`atomicWrite.ts:72`, `spend.ts:74`, `discard.ts:46`, and `relocate`), so no Trash file changes for it.

##### `Core/Nexus/settle.ts` — `applyOwn`

```ts
async function applyOwn(evs: FileEvent[]): Promise<void> {
  const root = sessionRoot()
  if (root === null) return
  const mine = evs.filter((ev) => !escapes(relative(root, ev.absPath)))
  // Each landing marks the disk moved once, after its renames and before its record, since one that leaves the tree as it already stood (a rename's later writes) would otherwise let a walk in flight install what it read before it; the editor's body save is the exception, since it leaves the frontmatter a walk reads as it was.
  if (mine.some((ev) => ev.event === 'move' || !ev.bodyOnly)) diskMoved()
  if (heldTreeOf(root)) {
    // Under a folder awaiting its stamp, that folder's read holds the page if it carries its ID, and otherwise leaves it for its own event or a walk.
    await applyEvents(root, mine)
    return
  }
  // No tree to patch: an open stamps before it holds a tree, and the tree it seeds is read after its stamps.
  if (!adopting()) await indexEvents(root, mine)
}
```

**The Epoch's Place:** `landOwn` calls `noteOwn` only after `machine().land` returns, so `diskMoved()` follows every rename in the chunk and precedes every patch. A walk that started earlier sees the epoch moved and discards (`liveTree.ts:118-119`). `patchLiveTree`'s own bumps (`:40`) still follow.

##### `Core/Nexus/fileEvents.ts` — the Index's Half

```ts
// Removals and moves first, in order; then every written page in one commit, each from the text its own writer hands over or from the disk as it now stands, so it reads right whichever event came first. What the app's own writes show is theirs to have spoken for, so only an outside one is owed.
export async function indexEvents(root: string, events: readonly FileEvent[]): Promise<void> {
  try {
    const written: Changed[] = []
    for (const ev of events) {
      if (ev.event === 'add' || ev.event === 'change') written.push(ev)
      else if (ev.event === 'move') await moveIndexPaths(root, ev.from, ev.absPath)
      else if (ev.event !== 'addDir') {
        const seen = await deindexPath(root, ev.absPath)
        if (ev.origin === 'watched') oweSeen(root, seen)
      }
    }
    const outside = written.filter((ev) => ev.origin === 'watched')
    oweSeen(root, await indexWrittenPages(root, outside))
    await indexWrittenPages(root, written.filter((ev) => ev.origin === 'own'))
  } catch (e) {
    console.error('events: the index missed an event and reseeds:', errText(e))
    owedFor(root).corpus = true
  }
}

// in applyEvents (:647-666), the index moves ahead of the loop:
  if (!replay) await indexEvents(root, events)
  for (const ev of events) {
    try {
      const applied = await applyOne(root, ev, owed)
      // … as it stands
```

**Why Reordering Is Safe:** a watched event carries no text, so its row is read from the disk as it stands at index time, whatever order its batch's events came in. `[add A, unlink A]` and `[unlink A, add A]` both end with the disk's state. An own batch is homogeneous: `landOwn` produces only `add`/`change`, `relocate` a lone `move`. A batch mixing origins doesn't occur in production (`applyEvents`' callers: `settle.ts:60,236,237,239`), and the partition keeps it right if a test sends one. One `try` now covers the batch, where one per event did; a failure owes a reseed either way (`:296-297`).

##### `Core/Index/indexSeed.ts` — `indexWrittenPages`

```ts
// Re-indexes written pages in one commit, each from the text and stat its writer hands over or else from its file, a page listed twice as it last stood, and reports what it saw.
export async function indexWrittenPages(
  root: string,
  written: readonly { absPath: string; text?: string; stat?: FileStat }[],
): Promise<IndexSeen> {
  const seen: IndexSeen = { renames: [], vanished: [], landed: [] }
  const rows: PageIndexRow[] = []
  for (const { absPath, text, stat } of new Map(written.map((w) => [w.absPath, w])).values()) {
    const rel = isMarkdownFile(absPath) ? await relCorpusPath(root, absPath) : null
    if (!rel) continue
    const st = stat ?? (await machine().stat(absPath).catch(() => null))
    if (!st) {
      seen.vanished.push(...unindexed(rel))
      continue
    }
    // An unreadable page keeps its rows, so a sweep the index seeds still reaches the file and counts it.
    const content = text ?? (await readTextOrNull(absPath))
    if (content === null) continue
    const prior = readIndexedStat(rel)
    const entry = extractPageIndex(content)
    rows.push({ path: rel, entry, stat: { mtimeMs: st.mtimeMs, size: st.size } })
    const [now] = idOf(entry)
    if (prior?.id === now) continue
    seen.vanished.push(...pageOf(rel, prior))
    if (now !== undefined) seen.landed.push(now)
  }
  if (rows.length) seen.renames = reindex(rows)
  return seen
}

// moveIndexPaths (:165-180):
    await indexWrittenPages(root, landed.map((rel) => ({ absPath: join(root, rel) })))
  // and
  await indexWrittenPages(root, [{ absPath: newAbs }])
```

**One Call per Chunk:** one `readHeadings` and one `upsertPageIndexes` transaction. The own path makes no `stat`; the stat comes from the landing. The `Map` keeps one row per path: a watched batch can hold `[change A, change A]` (`settle.test.ts:110`), and two rows compared against the same pre-batch headings would report one heading rename twice and owe it twice. The per-row `readIndexedStat` stays (about 10 µs). For own rows its result goes unused, but skipping it would take a parameter.

**The Index's Stat Matches the File's:** only if the landing answers the stat the file keeps after its rename, its `mtimeMs` already set to the preserved time. That's scout A's to guarantee, and *§8* pins it.

##### "Skip an Event Whose Path Has Taken a Newer Own Write"

**Not built.** The record runs inside the chunk's locks, so no write of the app's to a chunk file can land between the chunk's landing and its record. An outside write's event follows its own write by at least the 200 ms `awaitWriteFinish` (`watcher.ts:106`) and reads the disk as it stands. The guard would protect against nothing, and *§8*'s concurrent-writer test pins the lock-held record that makes it so. If the plan keeps the Investigation's two-lock shape instead, this guard becomes necessary (`writtenHash(absPath) !== recorded hash` at record time, `writeEcho.ts:95`).

##### Tree Patches

These stay per event inside `applyEvents`' loop: `applyPage` → `patchLiveTree` → `updateNodeInTree`, an O(pages) string scan of about 10,000 compares per event on Medium (Investigation S9c). Batching them would mean rewriting `applyPage`'s folder, stamp, and unreadable arms for a cheap step, so it isn't taken.

---

#### 5. The Settle's Re-Read

**When It Reads the Index:** for every page with an index row. The settle runs after `applyEvents`, which indexes every own and watched event before its tree patch (`fileEvents.ts:655`), so the index holds what the settle needs. **When It Reads the File:** for a page with no row, which is a page a rescope just brought into reach (`whole`, `settle.ts:170`), one under a folder an outside move brought in, or any page when no index is installed (`readPageRelations` answers null, `contentIndex.ts:85-87`).

**Where the Investigation Is Wrong:** it proposes "reads files only for paths a rescope brought into reach". The settle merges `options`, `changed`, and `whole` into one `holders` list (`settle.ts:170`), so there's no rescope set to branch on. The uniform rule needs no such set.

`Core/Properties/optionOps.ts:122,137-153` (AFTER):

```ts
/** Registers each Multi-Select member the files at `rels` hold beyond their definition — a page, a container's pages, or a Space — or every file's when `rels` is omitted, in one write. It reads under the schema lock, so a cascade is read whole: each page from its index row, which every event writes ahead of its settle, and from its file where the index holds none, as for a page a rescope just brought into reach. */
// … inside the schema op, replacing the loop at :137-153:
    const pages = new Map<string, PropertyDefinition[]>()
    for (const rel of rels ?? everywhere) {
      const page = isMarkdownFile(rel)
      const space = page ? null : spaceAt(tree, rel)
      const defs = holderSchema(tree, space ?? rel).filter(
        (d) => PROPERTY_TYPES[d.type].registersMembers,
      )
      if (!defs.length) continue
      if (space) collect(space.values ?? {}, defs)
      else
        for (const file of page ? [rel] : pagePathsIn(containerAt(tree, rel)))
          pages.set(file, defs)
    }
    const indexed = readPageRelations([...pages.keys()])?.pages
    for (const [file, defs] of pages) {
      const row = indexed?.[file]
      const read = row ? null : await readPageRecord(join(root, file), file).catch(() => null)
      const values = row?.values ?? (read?.kind === 'read' ? read.fm : null)
      if (values) collect(values, defs)
    }
```

**Effect:** one query in place of one `stat`, read, and parse per changed page (Medium property rename: 6,961 → 0 file reads, Investigation T1). A Collection gaining a Multi-Select (`fileEvents.ts:433-434`) stops reading every page it holds. **Fidelity:** `page_values` holds `JSON.stringify` of `valuesOf` (`Desktop/Store/stores.ts:81`), which carries strings, numbers, booleans, null, and nested lists exactly. It loses only NaN and ±Infinity (YAML `.nan`/`.inf`), which can't be option words, so `keyHolders.ts:113`'s caveat doesn't bite `unregisteredMembers`. **Staleness:** a row an index failure left stale reads stale values until that page's next event. An index failure already owes a reseed (`fileEvents.ts:297`), but `reseed` doesn't owe values (`settle.ts:199`), so that page's new option word waits for its next change. *Inferred* rare, disclosed.

---

#### 6. The Pre-Reads

The Investigation measured about 0.05 ms per read plus about 0.065 ms per parse. On Medium a holder pass costs about 0.8-1 s, against a W-1 rename of about 20-25 s.

##### The Clash Check — **Take**

The check needs only the files holding both keys. The index's key lists already decide which files the sweep reaches (`keyHolders.ts:82-88`), so intersecting them gives the clash check the same trust. Index-null still falls back to the corpus, so one code path covers both (`:86`). `Core/Index/keyHolders.ts`:

```ts
export type HolderQuery = {
  keys: readonly string[]
  reach: Reach
  title?: string
  id?: string
  moved?: FolderMove
  /** Only the files holding every key rather than any, as a rename's clash check asks. */
  every?: true
}

// The paths listed under any of `lists`, or under all of them with `every`.
const heldBy = (lists: string[][], every?: true): string[] =>
  every
    ? lists.reduce((all, list) => {
        const listed = new Set(list)
        return all.filter((p) => listed.has(p))
      })
    : [...new Set(lists.flat())]

// in findHolders, :86 becomes:
    rels.includes(null) ? null : heldBy(rels.map((r) => r ?? []), q.every),
// and :89-93, the key test hoisted so the two arms read alike:
  const holdsKey = (s: SpaceNode) => (key: string): boolean =>
    Object.hasOwn(s[parseContextKey(key) === null ? 'values' : 'contextKeys'] ?? {}, key)
  const holds = (s: SpaceNode): boolean =>
    (q.every ? q.keys.every(holdsKey(s)) : q.keys.some(holdsKey(s))) ||
    (q.id !== undefined && !!s.rowOrder?.includes(q.id))
```

`rekeyPlan` (`registryProperty.ts:179-183`) adds `every: true`. Unreadable Spaces are still listed (`keyHolders.ts:98-100`) and read, and they answer no keys, as today. **Effect:** a Medium property rename stops reading and parsing 6,961 holders before its note, and so does its confirmation dialog (`rekeyHolders` → `rekeyPlan`). About +9 lines.

##### The Pre-Confirmation Count — **Drop**

An index count differs from the dry run wherever a holder is unreadable, refused (a page whose frontmatter won't round-trip but whose values still indexed), or stale. The confirmation's number would then promise pages the sweep won't write, which changes what the user sees (Brief *§Checkpoints · Feature-Level Surprise*). The dry run also gets W-1's one-parse read for free. If Nathan accepts an approximate number for speed, the change is one line: `ok(files.filter((f) => outsideArchive(root, f)).length)` in `rekeyHolders`.

##### The Option Sweep's Narrowing — **Take, With No New Query**

**Where the Investigation Is Wrong:** it sizes a new value query at about +15 lines across `Desktop/Store/stores.ts`, `contentIndex.ts`, and `Core/Platform/stores.ts`. `readPageRelations(paths, key)` already answers one key's value per page (`Desktop/Store/stores.ts:133-156`, `contentIndex.ts:85`). The filter also runs the sweep's own rewrite on the indexed value, so the match is the same `editList`/`memberKey` the sweep applies (`rootValues.ts:73-77`), with no SQL `LIKE` and no case-folding superset to reason about.

`Core/Properties/optionOps.ts:217-224` (AFTER):

```ts
async function valueEditPlan(
  root: string,
  def: PropertyDefinition,
  keys: ValueEdit,
): Promise<{ files: string[]; plan: SweepPlan }> {
  const raw = valueEditRewrite(def, keys)
  const { files } = await findHolders(root, { keys: [def.key], reach: 'governed' })
  // The index's last read of each page's value names the pages the edit reaches, at the trust it already has for which pages hold the key; a file it holds no row for is read.
  const rows = readPageRelations(files.map((file) => relative(root, file)), def.key)?.pages
  const reaches = (file: string): boolean => {
    const row = rows?.[relative(root, file)]
    return !row || raw(row.values, file) !== null
  }
  return { files: files.filter(reaches), plan: { raw } }
}
```

Space sidecars have no row and stay in the list. **Effect:** a Medium option rename reads 1,397 pages instead of 6,984, and the two option counts (`optionHolders`, `valueFormatHolders`, `optionOps.ts:364,391`) narrow with it, giving the same number on a current index. **Trust:** a page whose outside edit added the word but hasn't been indexed is missed. That's the same staleness under which `findHolders` misses a page that newly gained the key.

---

#### 7. The Walk Race

##### What the Counts Say (Where the Investigation Is Wrong)

The Investigation reads one run, 1,221 `readDir` and 68,473 `stat`, as "about five full walks" costing "about 4.4 s extra". Across all ten Medium-0 Context renames (`bench/results/Medium-0.jsonl`), `readDir` is 1,221, 245, 489, 489, 977, 1,221, 489, 489, 733, and 733. Those are exact multiples of about 244 listings, so one to five walks per run. Wall time doesn't follow the count: 40.66 s at one walk, 36.48 s and 40.51 s at three, 38.91 s and 40.08 s at five. On Small-0 it's one walk (55 listings) in 9 of 10 runs.

So the minimum is one walk, which is the legitimate owed one. The extra zero to four are a timing race, and they cost CPU and I/O but no measurable wall time today, because they overlap the per-file flush waits. The Context rename's higher per-file cost (about 8.1 ms against the property rename's 7.3 ms) is therefore **not** the walks. Its cause is unknown without the profile. After W-1 removes most of the idle flush time, the main-thread CPU of the re-walks will show (*inferred*).

##### What Starts a Walk Mid-Sweep (*Inferred*; the Profile's `stacks` Mode Should Confirm)

1. `commitTitle` writes the registry (`contextCascade.ts:151`). `applyContexts` → `regroup` returns null when a title moved (`fileEvents.ts:469,481`) → `'walk'` → `owed.walk = true` (`:663`).
2. `moveTitled` → `relocate` → `applyMove` on a `.nexus/contexts/` path → `'walk'` (`fileEvents.ts:584`).
3. Neither pays it. `renameContextOp` runs under `underContexts` (`mutate.ts:253`) but **not** in the settle's turn, unlike a Context delete (`mutate.ts:134`) and a restore (`:153`).
4. Mid-sweep, the watcher's debounce fires after any 200 ms gap in its events (`watcher.ts:119-124`) → `drainBatch` → `settleBatch` → `settleNow` → `inTurn(settle)` → `walkWhileOwed` (`settle.ts:154`) → `refreshTree`. The turn is free, since nothing holds it.
5. Every landing then bumps the epoch (`settle.ts:57`), so `runWalk` discards and re-walks until the sweep stops writing (`liveTree.ts:119`). The walk count is set by when the first gap came, which explains the one-to-five spread.

`renameSpaceOp` (`mutate.ts:256`) has the same exposure, and so does `finishOwed`'s Context and Space pass (`finishOwed.ts:86-89`), whose `finishContext` also calls `refreshTree` directly (`:301`).

##### The Fix — No New Code

Run them in the settle's turn, nested inside `underContexts` as delete and restore already are. A settle queued mid-sweep then waits for the turn to end, and one walk is paid after the sweep: by that queued settle, or by `underContexts`' `finally` (`settle.ts:255`) when none queued. `Core/Nexus/mutate.ts:252-256`:

```ts
    case 'renameContext':
      return underContexts(root, () =>
        inSettleTurn(root, () => renameContextOp(root, req.contextId, req.newName)),
      )

    case 'renameSpace':
      return underContexts(root, () =>
        inSettleTurn(root, () => renameSpaceOp(root, req.spaceId, req.newName)),
      )
```

`Core/Nexus/finishOwed.ts:86-89`:

```ts
  await underContexts(root, () =>
    inSettleTurn(root, async () => {
      await each('context')
      await each('space')
    }),
  )
```

**Safety:** `inSettleTurn` forbids awaiting another turn inside it (`settle.ts:259`). Nothing on these paths does: `titleHolders`/`findHolders` (no turn), `runNoted` → `editNote`/`updateNexusFile`, `mutateRegistryFile`, `relocate` → `noteOwn` → `applyOwn` (no turn), `followRelinks`, the sweep, and `owedReport`. `finishContext`/`finishSpace` already run inside a turn on the delete path (`mutate.ts:134` → `delete.ts:160` → `finishEntry`). `inSettleTurn`'s leading `walkWhileOwed` pays a walk owed *before* the rename, so the rename reads a settled tree, a small gain. Every settle waits during the rename, which already happens today, since the mid-sweep settle loops in its walk until the sweep ends (*inferred*).

**After the fix, one count to expect:** the one owed walk re-reads every page the rename rewrote, because `landOwn` forgets each one's walk-cache parse (`walkCache.ts:29-32`) and `cachedParse` then misses (`:39-53`). A Context rename will show about two `readText` per rewritten file in the harness: one from the sweep, one from the walk. The Brief's "one `readText` per file" check should exclude the owed walk. Seeding the walk cache from `landOwn` would avoid the second read, but it couples the writer to the walk cache, and it's one O(Nexus) pass per Context rename. Not recommended.

---

#### 8. Tests

##### Pins That Hold (Unchanged Behavior)

- `fileEvents.test.ts:117` ("applyEvents — must agree with the walk"): tree parity through the reordered index.
- `settle.test.ts:110`: duplicate `change` events in one batch, the `Map` dedupe.
- `governedSweep.test.ts:37-61`: a file whose folder refuses writes is skipped while the others land. This needs per-file land failures from scout A's seam.
- `governedSweep.test.ts:63-75,77-98,100-110,112-129,131-157`: refusal, dry run, mtime by kind, dry-run unreadable, and `sweepCount`.
- `writePathRace.test.ts:76-99`: a value write racing a body write.
- `writeEcho.test.ts:72-152`: hashed-echo semantics, record before land.
- `finishOwed.test.ts` crash-window suite (`:126-220`, and the option arms at `:347`): it kills the process, not the OS, so it pins ordering and idempotence, not the flush.
- `indexMaintenance.test.ts:253-266`: watched events through `applyEvents`.

##### Break on Purpose (Mechanical)

- `governedSweep.test.ts:34`: the plan's `text` takes a page.
- `atomicWrite.test.ts` (`rewritePreservingTimes` at about `:408`; `setOwnTap` at `:383,426`) and `fileHistory.test.ts:156` (`setOwnTap`): the tap takes an array.
- `machine.test.ts:10,54`: `rewritePreservingTimes` is gone.
- `settle.test.ts:482` and `Desktop/FileWatch/watcher.test.ts:137`: spies move from `indexWrittenPage` to `indexWrittenPages`.
- `indexSeed.test.ts:129,221-341`, `keyHolders.test.ts:49,118,138,153,190,315`, `heldPages.test.ts:96`, `finishOwed.test.ts:553,562`: `indexWrittenPage(root, f)` → `indexWrittenPages(root, [{ absPath: f }])`, same result shape.
- `refuseWrites('rewritePreservingTimes', …)` in `archive.test.ts:1113`, `trashRecovery.test.ts:993`, `spend.test.ts:1822`, and `settle.test.ts:1305`, plus the direct mocks in `restoreScrub.test.ts:31-34` and `notesWiring.test.ts:33-108`. `Core/Testing/hostFs.ts:39-52` gains a `landOwn` entry that refuses per path (`real(landings.filter(keep))`, then `false` spliced back at the refused indices). Callers name `'landOwn'`. A machine-level refusal in scout A's test machines is the alternative.

##### New (Each Fails Without Its Change)

1. **Land Refusal Kept Owed** (`registryProperty` or `governedSweep` test): wrap the installed machine's `readText` so that, after it reads page B, it writes B from outside with different-length bytes. Rename the property. Expect B to hold the outside bytes, `readNotes` to keep the entry, the report to be `owed: true`, and `finishOwed` to then rewrite B and clear the entry. **Fails without** the `expect` recheck: B is overwritten and the note settles.
2. **A Newer Own Write Isn't Overwritten by an Older Chunk:** before the sweep, create `const writer = gate.then(() => rewritePageSerialized(A, (c) => \`${c}Z\`))`, and have a `readText` hook on page A only resolve `gate`. The writer must not be *started* inside the hook: the hook runs under the chunk's lock chain, `serializeOnFile` tracks held keys through `AsyncLocalStorage` (`fileLock.ts:5-9`), and a `lock(A)` taken there rejects as re-entrant instead of queuing (timers inherit the store too). A `.then` reaction runs in the context where it was registered, so it queues. The same trap applies to any test that fires a locked writer from inside a sweep hook. After the sweep and `await writer`, expect A to read `swept + 'Z'` and the index row (`readPageRelations([relA])`) and `pageAt(tree, relA)` to agree with the file. **Fails if** the record moves outside the chunk's locks, because the queued write lands and records between, and the older chunk's record then overwrites its row.
3. **The Index's Stat Matches the File:** after a sweep, `readIndexedStat(rel)` equals `fs.stat`'s `(mtimeMs, size)` for every rewritten page, and a following `seedContentIndex` re-reads none of them (`reread.rels` empty). **Fails if** the landing answers a stat taken before the mtime is set.
4. **The Walk Paid Once:** a Context with 70 tagged pages (two chunks), renamed through the mutate dispatch (`Core/Testing/settledMutate.ts`). Spy `landOwn`: on its first call resolve a gate whose pre-registered `.then` runs `settleNow(QUIET, root)` (registered before the rename, as in test 2, so the settle's walk carries no held keys if it reads a locked file), and resolve `secondLanded` after its second call. Spy `readNexus` so it awaits `secondLanded` before reading. Expect exactly one `readNexus` call. **Fails without** the `inSettleTurn` nesting: the mid-sweep walk spans chunk 2's landing, the epoch moves, and it re-walks (two or more).
5. **One Commit per Chunk:** spy `upsertPageIndexes` (`contentIndex.ts:23`) across a 70-file sweep and expect two calls; a single `atomicWriteFile` makes one. **Fails with** per-event recording (70 calls).
6. **One Read per Rewritten File:** with a warm index, spy the machine's `readText` across a property rename and expect calls equal to the holders. **Fails today** at three per holder: the clash read, the sweep, and the settle.
7. **The Clash Check Reads Only Common Holders:** with no file holding the new key, `rekeyHolders` reads nothing before its dry run; a page holding both keys still refuses (the existing refusal test stays). **Fails without** `every`.
8. **Option Narrowing:** an option rename reads only the pages whose indexed value carries the word, plus Spaces; a page the index holds no row for is still read and rewritten. **Fails without** the filter on the first, and the second pins the no-row fallback.
9. **Crossing Sweeps Don't Deadlock:** two concurrent sweeps over `[a, b]` and `[b, a]` both finish (with a timeout). **Fails without** the sort.
10. **The Settle Reads the Index:** with a warm index, an own write adding an unregistered Multi-Select word registers it without a `readText` of that page; a page with no row is read. **Fails without** the uniform rule (`:146` forces the read).
11. **Dry Run Lands Nothing:** `sweepCount` makes no `landOwn` call. Pins dry-is-read-only on the new path.

**Crash Window:** a kill between a chunk's temps and its renames leaves up to 64 temps. Their names must fail `isContentName` and stay hidden from the walk, watcher, and Sync (write-file-atomic's `Page.md.<n>` relies on that today). Scout A owns the naming; the crash suite should gain "a stray temp is ignored and the finish lands the same disk".

---

#### 9. Line Delta

Production lines, counted from the code above at Biome's 100-column width. Approximate within about ±3 per file.

| File | Removed | Added | Net |
|---|---|---|---|
| `Core/Nexus/governedSweep.ts` (`guarded`, `sweepGovernedRoots` → `CHUNK`, `holding`, `sweepChunk`, `sweepGovernedRoots`) | 36 | 61 | +25 |
| `Core/Files/atomicWrite.ts` (`rewritePreservingTimes`) | 12 | 0 | −12 |
| `Core/Files/writeEcho.ts` (`Changed.stat`, array tap, rest `noteOwn`) | 0 | 1 | +1 |
| `Core/Nexus/settle.ts` (`applyOwn`) | 13 | 14 | +1 |
| `Core/Nexus/fileEvents.ts` (`indexEvent` → `indexEvents`) | 26 | 19 | −7 |
| `Core/Index/indexSeed.ts` (`indexWrittenPage` → `indexWrittenPages`) | 24 | 30 | +6 |
| `Core/Properties/optionOps.ts` (settle read +3, narrowing +6) | 25 | 34 | +9 |
| `Core/Index/keyHolders.ts` (`every`, `heldBy`, `holdsKey`) | 7 | 16 | +9 |
| `Core/Files/pageFile.ts` (`rekeyDoc`, `content`, `body`, `rekey`) | 30 | 44 | +14 |
| `Core/Contexts/contextCascade.ts` (import) | 1 | 0 | −1 |
| `Core/Nexus/cascade.ts` (`fileRewrites.text`) | 10 | 9 | −1 |
| `Core/Nexus/mutate.ts`, `finishOwed.ts` (the turn) | 6 | 12 | +6 |
| **This Domain** | **190** | **240** | **+50** |
| `landOwn`, less `land` (shared with scout A; count it once) | 4 | 20 | +16 |

**What +50 Buys, Against the Mandate:**

- **Removed:** a per-file database transaction (one per chunk); two of three reads and two of three stats per rewritten page; two or three parses per page (five or six → three); the clash read and the option sweep's non-carrying reads (about 7,000 and 5,600 read-plus-parses on Medium); zero to four redundant O(Nexus) walks per Context rename; `rewritePreservingTimes`, `guarded`, and the per-event index path.
- **Correctness Gained:** an outside write between read and landing is now refused and owed instead of overwritten (Brief *§Insights · Outside Edits*), for sidecars too. The "a sweep's write takes the page's lock for its whole span" rule now covers read through record. The Context and Space renames now honor `mutate.ts:88`'s own rule.
- **Largest Single Add:** `governedSweep.ts` (+25), which is chunking itself, the shape that lets the flush be shared.
- **Not Bought:** no new query, store method, or file. `readPageRelations(paths, key)` and `upsertPageIndexes(rows)` already existed.

---

#### 10. Risks and Insights

- **Lock Span:** one chunk's files are held through their read, landing, and record, about 100-200 ms (*inferred*). Deadlock freedom rests on sorted acquisition plus "no holder of one file lock takes a second", which was checked for every `lock(` body except Sync's (`base.ts:29`, `land.ts:92,112`, not opened). Test 9 pins the crossing case.
- **The Settle's One Query Reads Wide:** `readPageRelations` selects every relation row for the paths it's given, whatever `key` is (`Desktop/Store/stores.ts:133-140`). On a Medium property rename that's 6,961 pages' relations (*inferred* tens of thousands of rows) plus all their values (*inferred* about 70,000-140,000 rows at 10-20 keys per page), JSON-parsed on the main thread. *Inferred* about 100-200 ms per settle, against about 0.9 s of reads and parses today. A values-only read would be a new store method, so it isn't proposed unless the profile shows this query.
- **A Plan Throw Costs Its Chunk:** 64 files skipped and owed, against one today. *Inferred* a ghost; disclosed rather than guarded.
- **Seam Requirements for Scout A:** `land` must take no lock, answer per file, fail per file, and answer the stat the file keeps after its rename (mtime already set). Temps must be invisible to the walk, watcher, and Sync. A whole-call throw is treated as every file in that chunk refused.
- **Where the Investigation Is Wrong:**
  - (a) Walk count and cost (*§7*): one to five walks by timing, not wall-clock-relevant today.
  - (b) The value query (*§6*): not needed.
  - (c) The lock taken twice (*§3*): leaves an in-app gap the stat recheck can't see.
  - (d) The newer-write skip (*§4*): unreachable under the chunk's locks.
  - (e) The settle's rescope branching (*§5*): there's no rescope set to branch on.
  - (f) The pre-confirmation count by index (*§6*): changes the dialog's number.
- **The Context Rename's Own Per-File Overhead:** about 0.8 ms per file above the property rename, and not the walks (*§7*). The profile has to name it. Candidates: the folder move's watcher fallout, or `contextLinker` on pages whose Context title the stale tree doesn't know yet (*inferred*, unverified).
- **Harness Expectations After W-1:** property rename about one `readText` and one `stat` per holder, plus the dialog's dry run (a separate request outside the window). Context rename about two `readText` per rewritten page (the owed walk) and one walk's stats. Option rename about one `readText` per carrying page.
- **Trash-Plan Files Touched:** `restoreScrub.ts:194-198` (the plan signature), and the tests that use `refuseWrites` in `archive`, `trashRecovery`, and `spend`. Both are mechanical. No Trash caller's behavior changes.
- **Optional, Not Recommended:** hoisting `clearPath`'s four `prepare`s per row in `upsertPageIndexes` (`Desktop/Store/stores.ts:54-56`), about 20 µs per file; sharing the written text's parse between the index and the tree, about 65 µs per file; giving `merge` a body argument, which saves a parse only on Link-value re-spells.
