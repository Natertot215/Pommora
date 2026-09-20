import type { ActionItem } from './menuModel'

type ViewRowAction = 'rename' | 'icon' | 'color' | 'titles' | 'duplicate' | 'delete'

interface ViewRowMenuContext {
  titlesShown?: boolean
  deletable: boolean
}

export function viewRowMenuItems(ctx: ViewRowMenuContext): ActionItem<ViewRowAction>[] {
  return [
    { label: 'Rename', action: 'rename' },
    { label: 'Edit Icon', action: 'icon' },
    { label: 'Edit Color', action: 'color' },
    ...(ctx.titlesShown === undefined
      ? []
      : [{ label: ctx.titlesShown ? 'Hide Titles' : 'Show Titles', action: 'titles' as const }]),
    { label: 'Duplicate', action: 'duplicate', separatorBefore: true },
    { label: 'Delete', action: 'delete', disabled: !ctx.deletable },
  ]
}
