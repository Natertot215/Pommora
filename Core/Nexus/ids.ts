import { decodeTime, monotonicFactory, ulid } from 'ulidx'
import { markId } from './identityMark'
import type { ContentKind } from './entities'

const nextUlid = monotonicFactory()

export function newId(): string {
  return nextUlid()
}

/** Not monotonic: the factory clamps a past seed to its last mint, which would erase the age. The seed is floored and clamped at zero because `stat` reports sub-millisecond floats on APFS (and a negative for a pre-epoch file) and the encoder throws on both — a throw here is swallowed per file by adopt's `.catch(() => null)`, so adoption would silently stamp nothing. */
export function idAt(atMs: number): string {
  return ulid(Math.max(0, Math.floor(atMs)))
}

export function newContentId(kind: ContentKind): string {
  return markId(newId(), kind)
}

export function contentIdAt(atMs: number, kind: ContentKind): string {
  return markId(idAt(atMs), kind)
}

export function idTime(id: string): number | null {
  try {
    return decodeTime(id)
  } catch {
    return null
  }
}

export function shardOf(id: string): string | null {
  const t = idTime(id)
  if (t === null) return null
  const d = new Date(t)
  const year = d.getUTCFullYear()
  return year > 9999 ? null : `${String(d.getUTCMonth() + 1).padStart(2, '0')}-${year}`
}

export function mintPropertyId(): string {
  return `prop_${newId()}`
}
