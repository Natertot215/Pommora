import type { ActionItem } from './menuModel'

export type AliasRowAction = 'rename' | 'delete'

export const ALIAS_ROW_MENU: ActionItem<AliasRowAction>[] = [
  { label: 'Rename', action: 'rename' },
  { label: 'Delete', action: 'delete', separatorBefore: true },
]
