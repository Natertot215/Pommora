import { popMenu } from './menuActions'
import type { ActionItem } from './menuModel'

export type AliasRowAction = 'rename' | 'delete'

const ALIAS_ROW_MENU: ActionItem<AliasRowAction>[] = [
  { label: 'Rename', action: 'rename' },
  { label: 'Delete', action: 'delete', separatorBefore: true },
]

export const popAliasRowMenu = (): Promise<AliasRowAction | null> => popMenu(ALIAS_ROW_MENU)
