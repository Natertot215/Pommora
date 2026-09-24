import { join } from '../../Paths/posix'
import { machine } from '../../Platform/machine'
import { type BaseRecord, syncStore } from '../../Platform/stores'
import { isMergedJson } from '../Arrival/jsonMerge'

export interface Snapshot {
  mtimeMs: number
  size: number
  hash: string
  bytes: Uint8Array
  version: number | null
}

export const readBase = (rel: string): BaseRecord | null => syncStore()?.readBase(rel) ?? null

export const readAllBases = (): BaseRecord[] => syncStore()?.readAllBases() ?? []

export const readBasesUnder = (prefix: string): BaseRecord[] =>
  syncStore()?.readBasesUnder(prefix) ?? []

export const deleteBase = (rel: string): void => syncStore()?.deleteBase(rel)

export const renameBase = (from: string, to: string): void => syncStore()?.renameBase(from, to)

export const upsertBase = (record: BaseRecord): void => syncStore()?.upsertBase(record)

export async function readSnapshot(root: string, rel: string): Promise<Snapshot | null> {
  const abs = join(root, rel)
  return machine().lock(abs, async () => {
    const stat = await machine().stat(abs)
    if (stat === null) return null
    const bytes = await machine().readBytes(abs)
    if (bytes === null) return null
    return {
      mtimeMs: Math.floor(stat.mtimeMs),
      size: stat.size,
      hash: machine().sha256Hex(bytes),
      bytes,
      version: readBase(rel)?.version ?? null,
    }
  })
}

export function recordBase(
  rel: string,
  snapshot: Pick<Snapshot, 'mtimeMs' | 'size' | 'hash' | 'bytes'>,
  version: number,
  blobSha: string,
): void {
  upsertBase({
    path: rel,
    mtimeMs: snapshot.mtimeMs,
    size: snapshot.size,
    hash: snapshot.hash,
    blobSha,
    version,
    baseBytes: isMergedJson(rel) ? snapshot.bytes : null,
  })
}

async function hashFile(abs: string): Promise<string | null> {
  const bytes = await machine().readBytes(abs)
  return bytes === null ? null : machine().sha256Hex(bytes)
}

export async function isDirty(root: string, rel: string): Promise<boolean> {
  const base = readBase(rel)
  if (base === null) return true
  return (await hashFile(join(root, rel))) !== base.hash
}
