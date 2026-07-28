// One-time lift of the operational sidecars that predate nexus.db. Each file is read into
// local_state and then removed, so a nexus runs this once and keeps nothing to fall back to.
// Retire the module once every nexus in use has been opened by a build carrying it.

import { readFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { nexusDir } from '../paths'
import { writeKey, type Scope } from './localState'

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

/** Lift every legacy sidecar into the database, then delete it. Entries are written key by key so
 *  an already-populated scope is added to rather than replaced. */
export function importLegacySidecars(root: string): void {
  for (const { file, scope, keep } of LEGACY) {
    const path = join(nexusDir(root), file)
    let parsed: unknown
    try {
      parsed = JSON.parse(readFileSync(path, 'utf8'))
    } catch {
      continue // absent or unreadable — nothing to lift, and nothing to remove
    }
    if (parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed)) {
      for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
        if (keep(value)) writeKey(scope, key, value)
      }
    }
    try {
      rmSync(path, { force: true })
    } catch {
      /* best-effort — a re-run just re-writes the same rows */
    }
  }
}
