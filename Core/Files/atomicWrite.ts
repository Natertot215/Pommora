import { isPlainObject } from '../Contract/validators'
import { stableStringify } from './stableJson'
import { fail, ok, type Result } from '../Contract/result'
import { forgetParse } from './walkCache'
import { type FileEvent, noteOwn, recordLanding, recordWrite, reportRename } from './writeEcho'
import { type FileStat, type Landing, machine, statOrNull } from '../Platform/machine'
import { basename, dirname, isMarkdownFile, join } from '../Paths/posix'
import { foldKey } from '../Paths/caseFold'
import { newId } from '../Nexus/ids'
import { nexusConfig } from '../Paths/paths'
import { NEXUS_CONFIG_FILES, type NexusConfigFile } from '../Paths/nexusPaths'

/** Lands the app's own writes as one group: each echo is recorded before its name points at the new bytes and takes the stat its landing answered, a file kept at its time drops the walk cache's parse, which its identity (`sameFile`) would still vouch for, and the files that landed are noted as one batch carrying the stat each now holds. Text reports 'change' for a new file too, since the tree and the index take an add and a change alike; bytes are an asset's and report 'add', since the asset arm lists a path only on an add, where a 'change' bumps the version of one already listed. */
async function landOwn(
  files: readonly Landing[],
  bodyOnly?: boolean,
): Promise<PromiseSettledResult<FileStat>[]> {
  for (const { path } of files) recordWrite(path, true)
  const landed = await machine().land(files)
  const events: FileEvent[] = []
  files.forEach(({ path, data, mtimeMs }, i) => {
    const at = landed[i]
    if (at.status === 'rejected') return
    recordLanding(path, at.value)
    if (mtimeMs !== undefined) forgetParse(path)
    const text = typeof data === 'string' ? data : undefined
    const event = text === undefined ? 'add' : 'change'
    events.push({ event, absPath: path, origin: 'own', text, bodyOnly, stat: at.value })
  })
  await noteOwn(...events)
  return landed
}

/** A lone file's landing, its failure thrown. */
function sole([landed]: PromiseSettledResult<FileStat>[]): void {
  if (landed.status === 'rejected') throw landed.reason
}

/** Lands one file as the app's own write, its failure thrown. A write that follows a read passes as `expect` the stat that read saw, a create whose read found no file passes null, and a write no read preceded passes none, so a file another writer changed or created since its read is left as that writer left it. */
export async function atomicWriteFile(
  filePath: string,
  data: string | Uint8Array,
  { bodyOnly, expect }: { bodyOnly?: boolean } & Pick<Landing, 'expect'> = {},
): Promise<void> {
  sole(await landOwn([{ path: filePath, data, expect }], bodyOnly))
}

/** The files a held rewrite holds, reads, and lands together, so their reads overlap and one flush of the drive makes them all durable: 64 lands a file in about 170 µs against about 415 at 16, and 256 would save about 70 µs more a file for four times as long a hold of the chunk's locks. */
const CHUNK = 64

/** Runs `fn` holding each file's lock, taken in sorted order, so two held rewrites sharing files never each hold a lock the other waits on; nothing a chunk runs takes another lock, and no other writer holds two of the files a chunk can hold. A lock rejects only when re-taken inside its own hold, so a rejection fails the whole rewrite. */
const holding = (files: readonly string[], fn: () => Promise<void>): Promise<void> =>
  [...files]
    .sort()
    .reduceRight<() => Promise<void>>((inner, file) => () => machine().lock(file, inner), fn)()

/** What a held rewrite did with a file it reached: couldn't read it, was refused by its rewrite, failed in its rewrite or its landing, or rewrote it, as a dry run would have. A file its rewrite left alone is absent. */
type Rewritten =
  | { status: 'unread' | 'refused' }
  | { status: 'failed'; reason: unknown }
  | { status: 'rewritten'; before: string; after: string }

/** A held rewrite's answer for one file: its next text from the text and the stat its read saw, null to leave it, or undefined to refuse it. */
export type HeldRewrite = (before: string, file: string, was: FileStat) => string | null | undefined

/** Rewrites `files` a chunk at a time, each chunk held from its read through its record, so no write of the app's lands between, and landed as one group: a page keeps its modification time, and a file changed since its read is left as its writer left it and answered failed; a dry run stops short of the landing. */
export async function rewriteHeld(
  files: readonly string[],
  rewrite: HeldRewrite,
  dry = false,
): Promise<Map<string, Rewritten>> {
  const out = new Map<string, Rewritten>()
  // A path listed twice would take its own lock twice within one chunk.
  const unique = [...new Set(files)]
  for (let at = 0; at < unique.length; at += CHUNK) {
    const chunk = unique.slice(at, at + CHUNK)
    await holding(chunk, async () => {
      const due: { file: string; was: FileStat; before: string; after: string }[] = []
      const reads = await Promise.all(
        chunk.map(async (file) => {
          // The stat ahead of the text, so the stat the landing checks never postdates the text it works from.
          const was = await statOrNull(file)
          return { file, was, before: was && (await readTextOrNull(file)) }
        }),
      )
      for (const { file, was, before } of reads) {
        if (!was || before === null) {
          out.set(file, { status: 'unread' })
          continue
        }
        try {
          const after = rewrite(before, file, was)
          if (after === undefined) out.set(file, { status: 'refused' })
          else if (after !== null) due.push({ file, was, before, after })
        } catch (reason) {
          // A file whose rewrite throws costs only itself, so the rest of its chunk still lands.
          out.set(file, { status: 'failed', reason })
        }
      }
      const landed =
        dry || !due.length
          ? []
          : await landOwn(
              due.map(({ file, was, after }) => ({
                path: file,
                data: after,
                expect: was,
                mtimeMs: isMarkdownFile(file) ? was.mtimeMs : undefined,
              })),
            )
      due.forEach(({ file, before, after }, i) => {
        const settled = landed[i]
        out.set(
          file,
          dry || settled.status === 'fulfilled'
            ? { status: 'rewritten', before, after }
            : { status: 'failed', reason: settled.reason },
        )
      })
    })
  }
  return out
}

// Sync's landing records no echo, notes no event, and checks no stat its read saw: an arrival replaces what the file holds by Sync's own rules, which capture what it would lose, so the watcher reports it like any outside write and the tree and index take it from that event. Its kept time drops the walk cache's parse, as an own kept-time landing does.
export async function landBytes(
  filePath: string,
  bytes: Uint8Array,
  mtimeMs: number,
): Promise<void> {
  sole(await machine().land([{ path: filePath, data: bytes, mtimeMs }]))
  forgetParse(filePath)
}

/** Under the SOURCE path's lock, the same key every other write to it takes: a write queued behind the move fails not-found rather than recreating the vacated file as a ghost. `landed` runs before sync hears of the rename, so it pushes under what the landing settled. */
export async function relocate(
  from: string,
  to: string,
  landed?: () => Promise<void>,
): Promise<void> {
  await machine().lock(from, async () => {
    recordWrite(from)
    recordWrite(to)
    await machine().rename(from, to)
  })
  await noteOwn({ event: 'move', absPath: to, from })
  await landed?.()
  reportRename(from, to)
}

export async function removeOwn(abs: string): Promise<void> {
  recordWrite(abs)
  await machine().remove(abs)
}

// A leading BOM is encoding, not corruption.
export const parseJsonText = (text: string): unknown =>
  JSON.parse(text.charCodeAt(0) === 0xfeff ? text.slice(1) : text)

export function parseJsonObject(text: string): Record<string, unknown> | null {
  try {
    const v = parseJsonText(text)
    return isPlainObject(v) ? v : null
  } catch {
    return null
  }
}

export const jsonText = (value: unknown): string => `${stableStringify(value)}\n`

export async function writeJson(
  filePath: string,
  value: unknown,
  options: Pick<Landing, 'expect'> = {},
): Promise<void> {
  await atomicWriteFile(filePath, jsonText(value), options)
}

type StrictRead =
  | { kind: 'ok'; value: Record<string, unknown> }
  | { kind: 'absent' }
  | { kind: 'unreadable' }
  | { kind: 'corrupt'; why: string }

type StrictMiss = Exclude<StrictRead['kind'], 'ok'>

export async function readJsonStrictly(absPath: string): Promise<StrictRead> {
  let raw: string | null
  try {
    raw = await machine().readText(absPath)
  } catch {
    return { kind: 'unreadable' }
  }
  if (raw === null) return { kind: 'absent' }
  try {
    const v = parseJsonText(raw)
    return isPlainObject(v)
      ? { kind: 'ok', value: v }
      : { kind: 'corrupt', why: 'Not a JSON object' }
  } catch {
    return { kind: 'corrupt', why: 'Corrupt JSON' }
  }
}

function strictResult(read: StrictRead, absPath: string): Result<Record<string, unknown>> {
  if (read.kind === 'ok') return ok(read.value)
  const why = read.kind === 'corrupt' ? read.why : 'Unreadable file'
  return fail(
    read.kind === 'absent' ? 'not-found' : 'operation-failed',
    `${why}: ${basename(absPath)}`,
  )
}

export async function readJsonStrict(absPath: string): Promise<Result<Record<string, unknown>>> {
  return strictResult(await readJsonStrictly(absPath), absPath)
}

// Absent is a fact the seed may replace; unreadable (an evicted cloud placeholder, a corrupt file) is ignorance, so it fails with NO write — never a fallback-to-empty clobber.
export function rmwJsonStrict(
  absPath: string,
  mutate: (current: Record<string, unknown>) => Record<string, unknown> | null,
  seedOnAbsent?: () => Record<string, unknown>,
): Promise<Result<Record<string, unknown>>> {
  return machine().lock(absPath, () => rmwLocked(absPath, mutate, seedOnAbsent))
}

export async function rmwLocked(
  absPath: string,
  mutate: (current: Record<string, unknown>) => Record<string, unknown> | null,
  seedOnAbsent?: () => Record<string, unknown>,
  repair?: (absPath: string) => Promise<Record<string, unknown>>,
): Promise<Result<Record<string, unknown>>> {
  const was = await statOrNull(absPath)
  const read = await readJsonStrictly(absPath)
  let base: Record<string, unknown>
  if (read.kind === 'ok') base = read.value
  else if (read.kind === 'absent' && seedOnAbsent) base = seedOnAbsent()
  else if (read.kind === 'corrupt' && repair) base = await repair(absPath)
  else return strictResult(read, absPath)
  // A mutate that finds nothing to change returns null, so a sweep touching a file it doesn't alter neither rewrites nor re-dates it; a repaired file lands regardless, since its damaged copy has moved aside.
  const next = mutate(base) ?? (read.kind === 'corrupt' ? base : null)
  if (next === null) return ok(base)
  // A rebuilt file's damaged copy has moved aside, so its landing expects no file there, as a seeded one's does.
  await writeJson(absPath, next, { expect: read.kind === 'corrupt' ? null : was })
  return ok(next)
}

// The last copy of each file this session read or wrote, or null when a read found it absent, so a damaged one reads as it.
const lastRead = new Map<string, Record<string, unknown> | null>()

export const forgetLastReads = (): void => lastRead.clear()

// Sync installs the last synced copy as the rebuild for a file damaged before this session read it.
let repairSeed: (absPath: string) => Record<string, unknown> | null = () => null

export function setRepairSeed(
  seed: ((absPath: string) => Record<string, unknown> | null) | null,
): void {
  repairSeed = seed ?? (() => null)
}

// An undefined value is a file this session never saw parse; `unreadable` says its bytes couldn't be read at all.
function readLast(
  absPath: string,
): Promise<{ value: Record<string, unknown> | null | undefined; unreadable: boolean }> {
  return machine().lock(absPath, async () => {
    const read = await readJsonStrictly(absPath)
    if (read.kind === 'ok' || read.kind === 'absent') {
      const value = read.kind === 'ok' ? read.value : null
      lastRead.set(absPath, value)
      return { value, unreadable: false }
    }
    const why = read.kind === 'corrupt' ? read.why : 'Unreadable file'
    const kept = lastRead.get(absPath)
    console.error(`${why}: ${absPath}; ${kept === undefined ? 'never read' : 'kept as last read'}`)
    return { value: kept, unreadable: read.kind === 'unreadable' }
  })
}

/** A damaged or unreadable file reads as the last copy this session saw, and absent reads null; one never seen fails by name. */
export async function readKept(absPath: string): Promise<Record<string, unknown> | null> {
  const { value } = await readLast(absPath)
  if (value === undefined) throw new Error(`Couldn’t read “${basename(absPath)}”.`)
  return value
}

/** An app-written file: one this session never saw parse reads as empty. */
export const readAppFile = async (absPath: string): Promise<Record<string, unknown> | null> =>
  (await readLast(absPath)).value ?? null

/** As `readAppFile`, except a file this session could never read answers undefined, since reading it as empty would show nothing where something is. */
export async function readAppFileKnown(
  absPath: string,
): Promise<Record<string, unknown> | null | undefined> {
  const { value, unreadable } = await readLast(absPath)
  return value === undefined && unreadable ? undefined : (value ?? null)
}

/** Whether `absPath` holds bytes that won't parse and this session never saw parse, so a repairable write sets it aside with nothing to rebuild from. */
export const neverParsed = async (absPath: string): Promise<boolean> => {
  const { value, unreadable } = await readLast(absPath)
  return value === undefined && !unreadable
}

// The damaged bytes go to the system Trash, so the Nexus keeps no copy and nothing is lost; a host without one keeps them under a dotted name beside the file, which neither the watcher nor sync admits.
export async function setAside(bad: string): Promise<void> {
  await (machine().trashToSystem?.(bad) ??
    machine().rename(bad, join(dirname(bad), `.${basename(bad)}.bad-${newId()}`)))
}

async function rebuild(bad: string): Promise<Record<string, unknown>> {
  await setAside(bad)
  return lastRead.get(bad) ?? repairSeed(bad) ?? {}
}

/** The primitive behind Pommora's own JSON files: a missing file starts empty in a folder created under the lock; an unreadable one fails the write rather than replacing what's already on disk, a corrupt one is set aside and rebuilt from its last read only where `repairable` allows, and one left empty is removed where `dropEmpty` asks. */
export function updateNexusFile(
  absPath: string,
  mutate: (current: Record<string, unknown>) => Record<string, unknown> | null,
  repairable: boolean,
  dropEmpty = false,
): Promise<Result<Record<string, unknown>>> {
  return machine().lock(absPath, async () => {
    await machine().mkdir(dirname(absPath))
    const written = await rmwLocked(absPath, mutate, () => ({}), repairable ? rebuild : undefined)
    if (written.ok && dropEmpty && !Object.keys(written.value).length)
      await machine().remove(absPath)
    if (written.ok) lastRead.set(absPath, written.value)
    return written
  })
}

export type StrictEdit = StrictMiss | 'unchanged' | 'written'

export function editJsonStrict(
  absPath: string,
  mutate: (current: Record<string, unknown>) => Record<string, unknown> | null,
): Promise<StrictEdit> {
  return machine().lock(absPath, async () => {
    const was = await statOrNull(absPath)
    const read = await readJsonStrictly(absPath)
    if (read.kind !== 'ok') return read.kind
    const next = mutate(read.value)
    if (next !== null) await writeJson(absPath, next, { expect: was })
    lastRead.set(absPath, next ?? read.value)
    return next === null ? 'unchanged' : 'written'
  })
}

// A hand-authored or irreplaceable file refuses a write over its corrupt copy; a file only the app writes is rebuilt from its last read.
const REPAIRABLE = {
  identity: false,
  settings: false,
  properties: false,
  state: true,
  matrix: true,
  homepage: true,
  crops: true,
} as const satisfies Record<NexusConfigFile, boolean>

export function updateNexusConfig(
  root: string,
  file: NexusConfigFile,
  mutate: (current: Record<string, unknown>) => Record<string, unknown> | null,
): Promise<Result<Record<string, unknown>>> {
  return updateNexusFile(nexusConfig(root, NEXUS_CONFIG_FILES[file]), mutate, REPAIRABLE[file])
}

export function setOrDrop(
  cur: Record<string, unknown>,
  key: string,
  value: unknown,
): Record<string, unknown> {
  const next = { ...cur }
  if (value) next[key] = value
  else delete next[key]
  return next
}

export const withIds = (
  cur: Record<string, unknown>,
  key: string,
  ids: string[],
): Record<string, unknown> => setOrDrop(cur, key, ids.length > 0 && ids)

export function withoutId(
  cur: Record<string, unknown>,
  key: string,
  id: string,
): Record<string, unknown> | null {
  const ids = cur[key]
  if (!Array.isArray(ids) || !ids.includes(id)) return null
  return withIds(
    cur,
    key,
    ids.filter((x) => x !== id),
  )
}

export async function rewritePageSerialized(file: string, rewrite: HeldRewrite): Promise<boolean> {
  const done = (await rewriteHeld([file], rewrite)).get(file)
  if (done?.status === 'failed') throw done.reason
  return done?.status === 'rewritten'
}

/** `absPath`'s text, or null when it's missing or can't be read. */
export const readTextOrNull = (absPath: string): Promise<string | null> =>
  machine()
    .readText(absPath)
    .catch(() => null)

// READ PATH ONLY: null conflates absent with unreadable, so a write based on it would clobber a file it merely failed to read.
export async function readJsonObject(absPath: string): Promise<Record<string, unknown> | null> {
  const text = await readTextOrNull(absPath)
  return text === null ? null : parseJsonObject(text)
}

export const pathExists = async (p: string): Promise<boolean> => (await statOrNull(p)) !== null

export async function heldName(abs: string): Promise<string | null> {
  const names = (await machine().readDir(dirname(abs))).map((e) => e.name)
  const name = basename(abs)
  const fold = foldKey(name)
  return names.includes(name) ? name : (names.find((n) => foldKey(n) === fold) ?? null)
}

export async function recase(root: string, rel: string): Promise<void> {
  let dir = root
  for (const segment of rel.split('/')) {
    const abs = join(dir, segment)
    const held = await heldName(abs)
    if (held === null) return
    if (held !== segment) await machine().rename(join(dir, held), abs)
    dir = abs
  }
}

async function heldExactly(path: string, from: number): Promise<boolean> {
  const segments = path.split('/')
  for (let i = from; i < segments.length; i++)
    if ((await heldName(segments.slice(0, i + 1).join('/'))) !== segments[i]) return false
  return true
}

// A spelling of the source's own name is taken only by a second entry: a disk that folds case holds one of the two, however far a folder recase has got.
export async function targetTaken(source: string, target: string): Promise<boolean> {
  if (foldKey(source) !== foldKey(target)) return pathExists(target)
  const from = source.split('/')
  const differs = target.split('/').findIndex((segment, i) => segment !== from[i])
  const start = differs < 0 ? from.length - 1 : differs
  return (await heldExactly(target, start)) && (await heldExactly(source, start))
}
