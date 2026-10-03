import type { IconName } from '@pommora/uix/Symbols'
import type { NodeKind } from '../Nexus/entities'

export const MATRIX_TITLE = 'Matrix'
export const MATRIX_ICON: IconName = 'atom'
export const MATRIX_REF = { kind: 'matrix' } as const

export interface MatrixRecord {
  kind: NodeKind
  id: string
  path: string
  title: string
}
