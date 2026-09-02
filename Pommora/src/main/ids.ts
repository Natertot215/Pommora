// The single owner of identity minting + recognition for the data layer.
// ULIDs for real entities (monotonic so rapid same-millisecond creates keep their
// order); `adopted-<sha256>` for entities read from a raw/un-adopted folder before
// a real id exists. Both the read engine and the write path import from here.

import { createHash } from 'node:crypto'
import { decodeTime, monotonicFactory, ulid } from 'ulidx'
import { type ContentKind, isUlidShaped, markId } from '@shared/identity'

const nextUlid = monotonicFactory()

/** Mint a fresh ULID. Monotonic within the process so same-ms creates stay ordered. */
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

/** The instant a ULID encodes; null for an adopted (path-derived) id or one the decoder refuses —
 *  `isUlidShaped` admits a first character 8–Z that ulidx rejects, and a throw here would reject a
 *  whole batch for one hand-edited id. */
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

/** Mint a fresh user-defined property id (`prop_<ulid>`). Built-in property ids are the
 *  reserved `_`-prefixed constants in shared/properties.ts; this mints the user form. */
export function mintPropertyId(): string {
  return `prop_${newId()}`
}

const ADOPTED_PREFIX = 'adopted-'

/** Stable synthetic id for an entity read from a raw/un-adopted folder with no persisted id.
 *  Derived from the nexus-relative POSIX path, so the same file always reads as the same id
 *  until adoption mints a real ULID for it. */
export function adoptedId(relPath: string): string {
  return `${ADOPTED_PREFIX}${createHash('sha256').update(relPath).digest('hex').slice(0, 16)}`
}

/** True for a synthetic adopted id — an address derived from a path, never an identity. */
export function isAdoptedId(id: string): boolean {
  return id.startsWith(ADOPTED_PREFIX)
}
