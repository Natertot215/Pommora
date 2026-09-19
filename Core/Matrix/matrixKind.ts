import type { IconName } from '@pommora/uix/Symbols'

export const MATRIX_TITLE = 'Matrix'
export const MATRIX_ICON: IconName = 'atom'
export const MATRIX_REF = { kind: 'matrix' } as const

export interface MatrixRecord {
  kind: 'page' | 'collection' | 'set' | 'space'
  id: string
  path: string
  title: string
}
