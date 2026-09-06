import { isPlainObject } from '../Properties/propertyValue'
import { stableStringify } from './stableJson'
import { fail, ok, type Result } from '../Contract/result'
import { forgetParse } from './walkCache'
import { recordWrite } from './writeEcho'
import { machine } from '../Platform/machine'
import { basename } from '../Locations/posix'

export async function atomicWriteFile(filePath: string, data: string): Promise<void> {
  recordWrite(filePath)
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

export async function atomicWriteBinary(filePath: string, data: Uint8Array): Promise<void> {
  recordWrite(filePath)
  await machine().writeBytes(filePath, data)
}

// A leading BOM is encoding, not corruption.
export const parseJsonText = (text: string): unknown =>
  JSON.parse(text.charCodeAt(0) === 0xfeff ? text.slice(1) : text)

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

// Absent is a fact the seed may replace; unreadable (an evicted cloud placeholder, a corrupt file)
// is ignorance, so it fails with NO write — never a fallback-to-empty clobber.
export function rmwJsonStrict(
  absPath: string,
  mutate: (current: Record<string, unknown>) => Record<string, unknown>,
  seedOnAbsent?: () => Record<string, unknown>,
  onCorrupt?: (absPath: string) => Promise<void>,
): Promise<Result<Record<string, unknown>>> {
  return machine().lock(absPath, async () => {
    const read = await readJsonStrictly(absPath)
    let base: Record<string, unknown>
    if (read.kind === 'ok') base = read.value
    else if (read.kind === 'absent' && seedOnAbsent) base = seedOnAbsent()
    else if (read.kind === 'corrupt' && onCorrupt && seedOnAbsent) {
      await onCorrupt(absPath)
      base = seedOnAbsent()
    } else return strictResult(read, absPath)
    const next = mutate(base)
    await writeJson(absPath, next)
    return ok(next)
  })
}

/** A JSON field written when the value is truthy and removed when it is not — the shape every
 *  sidecar and config RMW wants. */
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

// READ PATH ONLY: null conflates absent with unreadable, so a write based on it would clobber a
// file it merely failed to read.
export async function readJsonObject(absPath: string): Promise<Record<string, unknown> | null> {
  try {
    const text = await machine().readText(absPath)
    if (text === null) return null
    const v = parseJsonText(text)
    return isPlainObject(v) ? v : null
  } catch {
    return null
  }
}

export async function pathExists(p: string): Promise<boolean> {
  try {
    return (await machine().stat(p)) !== null
  } catch {
    return false
  }
}
