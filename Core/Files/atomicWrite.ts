import { isPlainObject } from '../Contract/validators'
import { stableStringify } from './stableJson'
import { fail, ok, type Result } from '../Contract/result'
import { forgetParse } from './walkCache'
import { noteOwn, recordWrite, reportRename } from './writeEcho'
import { machine } from '../Platform/machine'
import { basename, dirname, join } from '../Paths/posix'
import { foldKey } from '../Paths/caseFold'
import { newId } from '../Nexus/ids'
import { nexusConfig } from '../Paths/paths'
import { NEXUS_CONFIG_FILES } from '../Paths/nexusPaths'

async function land(filePath: string, data: string): Promise<void> {
  recordWrite(filePath, data)
  await machine().writeText(filePath, data)
}

// Both text writers report 'change' for a new file too, since the tree and the index take an add and a change alike.
export async function atomicWriteFile(
  filePath: string,
  data: string,
  bodyOnly = false,
): Promise<void> {
  await land(filePath, data)
  await noteOwn({ event: 'change', absPath: filePath, origin: 'own', text: data, bodyOnly })
}

export async function rewritePreservingTimes(filePath: string, data: string): Promise<void> {
  const before = await machine().stat(filePath)
  if (!before) throw new Error(`${basename(filePath)} vanished before its rewrite.`)
  await land(filePath, data)
  // A volume that refuses utimes leaves the page dated now; the write itself already landed.
  await machine()
    .utimes(filePath, before.mtimeMs)
    .catch(() => {})
  forgetParse(filePath)
  // After the times settle, so the index records the stat the file keeps.
  await noteOwn({ event: 'change', absPath: filePath, origin: 'own', text: data })
}

// Sync's landing records no echo and notes no event, so the watcher reports it like any outside write and the tree and index take it from that event.
export async function landBytes(
  filePath: string,
  bytes: Uint8Array,
  mtimeMs: number,
): Promise<void> {
  await machine().writeBytes(filePath, bytes)
  await machine()
    .utimes(filePath, mtimeMs)
    .catch(() => {})
  forgetParse(filePath)
}

export async function atomicWriteBinary(filePath: string, data: Uint8Array): Promise<void> {
  recordWrite(filePath, data)
  await machine().writeBytes(filePath, data)
  // 'add', since the asset arm lists a path only on an add, where a 'change' bumps the version of one already listed.
  await noteOwn({ event: 'add', absPath: filePath, origin: 'own' })
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

export async function writeJson(filePath: string, value: unknown): Promise<void> {
  await atomicWriteFile(filePath, jsonText(value))
}

type StrictRead =
  | { kind: 'ok'; value: Record<string, unknown> }
  | { kind: 'absent' }
  | { kind: 'unreadable' }
  | { kind: 'corrupt'; why: string }

export type StrictMiss = Exclude<StrictRead['kind'], 'ok'>

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

async function rmwLocked(
  absPath: string,
  mutate: (current: Record<string, unknown>) => Record<string, unknown> | null,
  seedOnAbsent?: () => Record<string, unknown>,
  repair?: (absPath: string) => Promise<Record<string, unknown>>,
): Promise<Result<Record<string, unknown>>> {
  const read = await readJsonStrictly(absPath)
  let base: Record<string, unknown>
  if (read.kind === 'ok') base = read.value
  else if (read.kind === 'absent' && seedOnAbsent) base = seedOnAbsent()
  else if (read.kind === 'corrupt' && repair) base = await repair(absPath)
  else return strictResult(read, absPath)
  // A mutate that finds nothing to change returns null, so a sweep touching a file it doesn't alter neither rewrites nor re-dates it; a repaired file lands regardless, since its damaged copy has moved aside.
  const next = mutate(base) ?? (read.kind === 'corrupt' ? base : null)
  if (next === null) return ok(base)
  await writeJson(absPath, next)
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

// The damaged bytes keep a dotted name beside the file, which neither the watcher nor sync admits.
export async function setAside(bad: string): Promise<void> {
  await machine().rename(bad, join(dirname(bad), `.${basename(bad)}.bad-${newId()}`))
}

async function rebuild(bad: string): Promise<Record<string, unknown>> {
  await setAside(bad)
  return lastRead.get(bad) ?? repairSeed(bad) ?? {}
}

/** The primitive behind Pommora's own JSON files: a missing file starts empty in a folder created under the lock; an unreadable one fails the write rather than replacing what's already on disk, and a corrupt one is set aside and rebuilt from its last read only where `repairable` allows. */
export function updateNexusFile(
  absPath: string,
  mutate: (current: Record<string, unknown>) => Record<string, unknown> | null,
  repairable: boolean,
): Promise<Result<Record<string, unknown>>> {
  return machine().lock(absPath, async () => {
    await machine().mkdir(dirname(absPath))
    const written = await rmwLocked(absPath, mutate, () => ({}), repairable ? rebuild : undefined)
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
    const read = await readJsonStrictly(absPath)
    if (read.kind !== 'ok') return read.kind
    const next = mutate(read.value)
    if (next !== null) await writeJson(absPath, next)
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
} as const satisfies Record<keyof typeof NEXUS_CONFIG_FILES, boolean>

export function updateNexusConfig(
  root: string,
  file: keyof typeof NEXUS_CONFIG_FILES,
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

export function rewritePageSerialized(
  file: string,
  rewrite: (content: string) => string | null,
): Promise<boolean> {
  return machine().lock(file, async () => {
    const content = await readTextOrNull(file)
    if (content === null) return false
    const next = rewrite(content)
    if (next === null) return false
    await rewritePreservingTimes(file, next)
    return true
  })
}

export async function readTextOrNull(absPath: string): Promise<string | null> {
  try {
    return await machine().readText(absPath)
  } catch {
    return null
  }
}

// READ PATH ONLY: null conflates absent with unreadable, so a write based on it would clobber a file it merely failed to read.
export async function readJsonObject(absPath: string): Promise<Record<string, unknown> | null> {
  const text = await readTextOrNull(absPath)
  return text === null ? null : parseJsonObject(text)
}

export async function pathExists(p: string): Promise<boolean> {
  try {
    return (await machine().stat(p)) !== null
  } catch {
    return false
  }
}

export async function heldName(abs: string): Promise<string | null> {
  const name = basename(abs)
  const key = foldKey(name)
  const names = (await machine().readDir(dirname(abs))).map((e) => e.name)
  return names.includes(name) ? name : (names.find((n) => foldKey(n) === key) ?? null)
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
