import type { NodeKind } from './tree'

/** Context groups carry no node kind yet hold the richest record, so the union widens past the walk's. */
export type RecordKind = NodeKind | 'context'

export interface EntityRecord {
  id: string
  kind: RecordKind
  title: string
  path: string
}
