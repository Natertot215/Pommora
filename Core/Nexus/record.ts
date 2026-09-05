// The one owner of the per-entity tuple the baseline stores and the renderer's tree index
// derives from. No fs, no React.

import type { NodeKind } from './tree'

/** Every id-bearing, trashable kind. Context groups carry no node kind yet hold the richest
 *  record, so the union widens past the walk's. */
export type RecordKind = NodeKind | 'context'

export interface EntityRecord {
  id: string
  kind: RecordKind
  title: string
  path: string
}
