import { type ActionItem, joinGroups } from './menuModel'

type ViewRowAction = 'rename' | 'icon' | 'color' | 'titles' | 'duplicate' | 'delete'

interface ViewRowMenuContext {
  titlesShown?: boolean
  deletable: boolean
  duplicable: boolean
}

const itemRows = (ctx: ViewRowMenuContext, glyphs = false): ActionItem<ViewRowAction>[] => [
  {
    label: 'Duplicate',
    action: 'duplicate',
    disabled: !ctx.duplicable,
    ...(glyphs && { icon: 'copy' }),
  },
  { label: 'Delete', action: 'delete', disabled: !ctx.deletable, ...(glyphs && { icon: 'trash' }) },
]

export const viewItemMenuItems = (ctx: ViewRowMenuContext): ActionItem<ViewRowAction>[] =>
  joinGroups(itemRows(ctx, true).map((row) => [row]))

export function viewRowMenuItems(ctx: ViewRowMenuContext): ActionItem<ViewRowAction>[] {
  return joinGroups<ViewRowAction>([
    [
      { label: 'Rename', action: 'rename' },
      { label: 'Edit Icon', action: 'icon' },
      { label: 'Edit Color', action: 'color' },
      ...(ctx.titlesShown === undefined
        ? []
        : [{ label: ctx.titlesShown ? 'Hide Titles' : 'Show Titles', action: 'titles' as const }]),
    ],
    itemRows(ctx),
  ])
}
