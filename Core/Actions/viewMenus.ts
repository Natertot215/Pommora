import { type ActionItem, joinGroups } from './menuModel'
import type { ViewButton, ViewStyle } from '../Nexus/schemas'
import { shownLabel } from './toggleLabels'

type ViewStyleAction = 'style-dropdown' | 'style-toolbar'

type ViewButtonMenuAction = 'toggle-title'

type EmbedTitleMenuAction =
  | 'toggle-icon'
  | 'change-icon'
  | 'hide-title'
  | 'toggle-views'
  | `size-${number}`

type EmbedAreaMenuAction = 'show-title' | 'new-view' | 'toggle-views' | ViewStyleAction

type ViewRowAction = 'rename' | 'icon' | 'color' | 'titles' | 'duplicate' | 'delete'

interface ViewRowMenuContext {
  titlesShown?: boolean
  deletable: boolean
  duplicable: boolean
}

const EMBED_TITLE_SIZES = [1, 2, 3, 4, 5, 6] as const

const VIEW_STYLE_ROWS: readonly { label: string; style: ViewStyle }[] = [
  { label: 'Dropdown', style: 'dropdown' },
  { label: 'Toolbar', style: 'toolbar' },
]

function styleRow<A extends ViewStyleAction>(current: ViewStyle): ActionItem<A> {
  return {
    label: 'Style',
    separatorBefore: true,
    submenu: VIEW_STYLE_ROWS.map(({ label, style }) => ({
      label,
      action: `style-${style}` as A,
      checked: current === style,
    })),
  }
}

export function embedTitleMenuItems(
  iconShown: boolean,
  level: number,
  viewsShown: boolean,
): ActionItem<EmbedTitleMenuAction>[] {
  return [
    { label: 'Edit Icon', action: 'change-icon' },
    { label: shownLabel(iconShown, 'Icon'), action: 'toggle-icon' },
    {
      label: 'Title Size',
      submenu: EMBED_TITLE_SIZES.map((n) => ({
        label: `Heading ${n}`,
        action: `size-${n}` as EmbedTitleMenuAction,
        checked: level === n,
      })),
    },
    { label: 'Hide Title', action: 'hide-title', separatorBefore: true },
    { label: shownLabel(viewsShown, 'Views'), action: 'toggle-views' },
  ]
}

export function embedAreaMenuItems(current: {
  viewStyle: ViewStyle
  titleShown: boolean
  viewsShown: boolean
}): ActionItem<EmbedAreaMenuAction>[] {
  return [
    ...(current.titleShown ? [] : [{ label: 'Show Title', action: 'show-title' as const }]),
    { label: 'New View', action: 'new-view' },
    { label: shownLabel(current.viewsShown, 'Views'), action: 'toggle-views' },
    styleRow(current.viewStyle),
  ]
}

export function viewButtonMenuItems(current: {
  viewButton: ViewButton
}): ActionItem<ViewButtonMenuAction>[] {
  return [{ label: shownLabel(current.viewButton === 'labeled', 'Title'), action: 'toggle-title' }]
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
        : [{ label: shownLabel(ctx.titlesShown, 'Titles'), action: 'titles' as const }]),
    ],
    itemRows(ctx),
  ])
}
