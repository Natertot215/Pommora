import type { ActionItem } from './menuModel'

type ViewRowAction = 'rename' | 'icon' | 'color' | 'titles' | 'delete'

interface ViewRowMenuContext {
  /** Absent where the host draws no titles; present carries the state the label reads from. */
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
    // Shown and refused rather than absent: a container always has a view.
    { label: 'Delete', action: 'delete', separatorBefore: true, disabled: !ctx.deletable },
  ]
}
