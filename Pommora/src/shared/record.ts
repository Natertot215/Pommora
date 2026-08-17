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
