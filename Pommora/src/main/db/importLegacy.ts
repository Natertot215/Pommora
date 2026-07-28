// One-time lift of the operational sidecars that predate nexus.db. Each file is read into
// local_state and then removed, so a nexus runs this once and keeps nothing to fall back to.
// Retire the module once every nexus in use has been opened by a build carrying it.

import { readFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { nexusDir } from '../paths'
import { writeKey, writeValue, type Scope } from './localState'

const isStringArray = (v: unknown): boolean =>
  Array.isArray(v) && v.every((x) => typeof x === 'string')

const LEGACY: { file: string; scope: Scope; keep: (v: unknown) => boolean }[] = [
  { file: 'folds.json', scope: 'folds', keep: isStringArray },
  { file: 'viewOrders.json', scope: 'viewOrder', keep: isStringArray },
  { file: 'activeViews.json', scope: 'activeView', keep: (v) => typeof v === 'string' },
  { file: 'linkTitles.json', scope: 'linkTitle', keep: (v) => typeof v === 'string' },
  {
    file: 'tableHeadingColumns.json',
    scope: 'headingCols',
    keep: (v) => Array.isArray(v) && v.every((x) => Number.isInteger(x) && x >= 0),
  },
]

/** The whole-value sidecars — each was always read and written entire, so each lifts to one row. */
const LEGACY_VALUES: { file: string; scope: Scope; keep: (v: unknown) => boolean }[] = [
  { file: 'tabs.json', scope: 'tabs', keep: (v) => isObject(v) && Array.isArray(v.tabs) },
  { file: 'page-previews.json', scope: 'previews', keep: isObject },
  { file: 'navRecents.json', scope: 'recents', keep: Array.isArray },
]

function isObject(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === 'object' && !Array.isArray(v)
}

/** Parse a sidecar, or undefined when it is absent or unreadable — in which case it is left on
 *  disk rather than deleted, so nothing is destroyed that could not be read. */
function parseLegacy(root: string, file: string): unknown | undefined {
  try {
    return JSON.parse(readFileSync(join(nexusDir(root), file), 'utf8'))
  } catch {
    return undefined
  }
}

const discard = (root: string, file: string): void => {
  try {
    rmSync(join(nexusDir(root), file), { force: true })
  } catch {
    /* best-effort — a re-run just re-writes the same rows */
  }
}

/** Lift every legacy sidecar into the database, then delete it. Keyed entries are written one at a
 *  time so an already-populated scope is added to rather than replaced. */
export function importLegacySidecars(root: string): void {
  for (const { file, scope, keep } of LEGACY) {
    const parsed = parseLegacy(root, file)
    if (parsed === undefined) continue
    if (isObject(parsed)) {
      for (const [key, value] of Object.entries(parsed)) {
        if (keep(value)) writeKey(scope, key, value)
      }
    }
    discard(root, file)
  }
  for (const { file, scope, keep } of LEGACY_VALUES) {
    const parsed = parseLegacy(root, file)
    if (parsed === undefined) continue
    if (keep(parsed)) writeValue(scope, parsed)
    discard(root, file)
  }
}
