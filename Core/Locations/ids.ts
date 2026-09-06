import { decodeTime, monotonicFactory, ulid } from 'ulidx'
import { type ContentKind, isUlidShaped, markId } from '../Nexus/identityMark'
import { machine } from '../Platform/machine'

const nextUlid = monotonicFactory()

export function newId(): string {
  return nextUlid()
}

/** A ULID whose time part is `atMs` — for an entity whose birth predates the mint. Not monotonic:
 *  the factory clamps a past seed to its last mint, which would erase the age. The seed is floored
 *  and clamped at zero because `stat` reports sub-millisecond floats on APFS (and a negative for a
 *  pre-epoch file) and the encoder throws on both — a throw here is swallowed per file by adopt's
 *  `.catch(() => false)`, so adoption would silently stamp nothing. */
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
  if (isAdoptedId(id)) return null
  try {
    return decodeTime(id)
  } catch {
    return null
  }
}

/** True for a syntactically valid ULID. Shape lives in the identity seam so the walk's admission
 *  check and this one can never disagree — and it is case-SENSITIVE where the ulid library is not:
 *  an id becomes a folder name, and a case-insensitive filesystem would collide two ids the
 *  library calls equal. Minting only ever produces the canonical uppercase form. */
export function isUlid(value: string): boolean {
  return isUlidShaped(value)
}

export function mintPropertyId(): string {
  return `prop_${newId()}`
}

const ADOPTED_PREFIX = 'adopted-'

export function adoptedId(relPath: string): string {
  return `${ADOPTED_PREFIX}${machine().sha256Hex(relPath).slice(0, 16)}`
}

export function isAdoptedId(id: string): boolean {
  return id.startsWith(ADOPTED_PREFIX)
}
