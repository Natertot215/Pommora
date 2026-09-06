import type { ActionItem } from './menuModel'

type ViewRowAction = 'rename' | 'icon' | 'color' | 'titles' | 'delete'

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
    { label: 'Delete', action: 'delete', separatorBefore: true, disabled: !ctx.deletable },
  ]
}
