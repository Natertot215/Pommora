// The one owner of the per-entity tuple the baseline stores and the renderer's tree index
// derives from, plus the pure union-diff over two baselines. No fs, no React.

import type { NodeKind } from './types'

/** Every id-bearing, trashable kind. Context groups carry no node kind yet hold the richest
 *  record, so the union widens past the walk's. */
export type RecordKind = NodeKind | 'context'

/** Present-but-unparseable is its own answer — collapsing it to absence would report a
 *  hand-edit typo as a deletion. Absence itself is a missing key, never a state. */
export type ExistState = 'present' | 'unreadable'

export interface EntityRecord {
  id: string
  kind: RecordKind
  title: string
  path: string
  state: ExistState
}

export interface BaselineDiff {
  added: EntityRecord[]
  removed: EntityRecord[]
  changed: { before: EntityRecord; after: EntityRecord }[]
}

export function isEmptyDiff(d: BaselineDiff): boolean {
  return d.added.length === 0 && d.removed.length === 0 && d.changed.length === 0
}

const SCALAR_FIELDS = ['kind', 'title', 'path', 'state'] as const

/** Union-of-keys diff: absence on either side is first-class, and only the scalar fields
 *  participate — a wider entry shape never silently joins the comparison. */
export function diffBaselines(
  prev: Record<string, EntityRecord>,
  next: Record<string, EntityRecord>,
): BaselineDiff {
  const diff: BaselineDiff = { added: [], removed: [], changed: [] }
  for (const id of new Set([...Object.keys(prev), ...Object.keys(next)])) {
    const before = prev[id]
    const after = next[id]
    if (before === undefined) {
      if (after) diff.added.push(after)
    } else if (after === undefined) {
      diff.removed.push(before)
    } else if (SCALAR_FIELDS.some((f) => before[f] !== after[f])) {
      diff.changed.push({ before, after })
    }
  }
  return diff
}
