import type { HeldKind } from './entities'

export interface EntityRecord {
  id: string
  kind: HeldKind
  title: string
  path: string
}
