import { isPlainObject } from '../Contract/validators'
import { stableStringify } from './stableJson'
import { fail, ok, type Result } from '../Contract/result'
import { forgetParse } from './walkCache'
import { recordWrite } from './writeEcho'
import { machine } from '../Platform/machine'
import { basename, dirname, join } from '../Paths/posix'
import { foldKey } from '../Paths/caseFold'
import { newId } from '../Nexus/ids'
import { nexusConfig } from '../Paths/paths'
import { NEXUS_CONFIG_FILES } from '../Paths/nexusPaths'

export async function atomicWriteFile(filePath: string, data: string): Promise<void> {
  recordWrite(filePath, data)
  await machine().writeText(filePath, data)
}

export async function rewritePreservingTimes(filePath: string, data: string): Promise<void> {
  const before = await machine().stat(filePath)
  if (!before) throw new Error(`${basename(filePath)} vanished before its rewrite.`)
  await atomicWriteFile(filePath, data)
  // A volume that refuses utimes leaves the page dated now; the write itself already landed.
  await machine()
    .utimes(filePath, before.mtimeMs)
    .catch(() => {})
  forgetParse(filePath)
}

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

export async function writeJson(filePath: string, value: unknown): Promise<void> {
  await atomicWriteFile(filePath, `${stableStringify(value)}\n`)
}

type StrictRead =
  | { kind: 'ok'; value: Record<string, unknown> }
  | { kind: 'absent' }
  | { kind: 'unreadable' }
  | { kind: 'corrupt'; why: string }

async function readJsonStrictly(absPath: string): Promise<StrictRead> {
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

// The last copy of each app-written file that parsed, so a damaged one reads as it and the next write rebuilds from it rather than from nothing.
const lastRead = new Map<string, Record<string, unknown>>()

export const forgetLastReads = (): void => lastRead.clear()

// Sync installs the last synced copy as the rebuild for a file damaged before this session read it.
let repairSeed: (absPath: string) => Record<string, unknown> | null = () => null

export function setRepairSeed(
  seed: ((absPath: string) => Record<string, unknown> | null) | null,
): void {
  repairSeed = seed ?? (() => null)
}

/** An app-written file: absent reads null, and a damaged or unreadable one reads as the last copy that parsed. */
export function readAppFile(absPath: string): Promise<Record<string, unknown> | null> {
  return machine().lock(absPath, async () => {
    const read = await readJsonStrictly(absPath)
    switch (read.kind) {
      case 'ok':
        lastRead.set(absPath, read.value)
        return read.value
      case 'absent':
        lastRead.delete(absPath)
        return null
      default: {
        const kept = lastRead.get(absPath) ?? null
        const why = read.kind === 'corrupt' ? read.why : 'Unreadable file'
        console.error(`${why}: ${absPath}; ${kept ? 'kept as last read' : 'read as empty'}`)
        return kept
      }
    }
  })
}

// The damaged bytes keep a dotted name beside the file, which neither the watcher nor sync admits.
async function setAside(bad: string): Promise<Record<string, unknown>> {
  await machine().rename(bad, join(dirname(bad), `.${basename(bad)}.bad-${newId()}`))
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
    const written = await rmwLocked(absPath, mutate, () => ({}), repairable ? setAside : undefined)
    if (repairable && written.ok) lastRead.set(absPath, written.value)
    return written
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
