import type { IconName } from '@pommora/uix/Symbols'
import type { NexusTree } from '../Nexus/tree'
import { recordsByIdOf } from '../Nexus/treeIndex'

export const MATRIX_TITLE = 'Matrix'
export const MATRIX_ICON: IconName = 'atom'
export const MATRIX_REF = { kind: 'matrix' } as const

export interface MatrixRecord {
  kind: 'page' | 'collection' | 'set' | 'space'
  id: string
  path: string
  title: string
}

export function recordOf(tree: NexusTree | null, id: string | null): MatrixRecord | null {
  if (id === null || !tree) return null
  const r = recordsByIdOf(tree).get(id)
  return r && r.kind !== 'homepage' && r.kind !== 'matrix'
    ? { kind: r.kind, id: r.id, path: r.path, title: r.title }
    : null
}
