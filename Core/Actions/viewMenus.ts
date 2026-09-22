import type { ActionItem } from './menuModel'
import type { ViewButton, ViewStyle } from '../Views/viewRow'
import { iconLabel, viewsLabel } from './toggleLabels'

type ViewStyleAction = 'style-dropdown' | 'style-toolbar'

type ViewButtonMenuAction = 'toggle-title'

type EmbedTitleMenuAction =
  | 'toggle-icon'
  | 'change-icon'
  | 'hide-title'
  | 'toggle-views'
  | `size-${number}`

type EmbedAreaMenuAction = 'show-title' | 'new-view' | 'toggle-views' | ViewStyleAction

const EMBED_TITLE_SIZES = [1, 2, 3, 4, 5, 6] as const

const VIEW_STYLE_ROWS: readonly { label: string; style: ViewStyle }[] = [
  { label: 'Dropdown', style: 'dropdown' },
  { label: 'Toolbar', style: 'toolbar' },
]

function styleRow<A extends ViewStyleAction>(current: ViewStyle): ActionItem<A> {
  return {
    label: 'Style',
    action: 'style-dropdown' as A,
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
    ...(iconShown ? [{ label: 'Edit Icon', action: 'change-icon' as const }] : []),
    { label: iconLabel(iconShown), action: 'toggle-icon' },
    {
      label: 'Title Size',
      action: 'size-1',
      submenu: EMBED_TITLE_SIZES.map((n) => ({
        label: `Heading ${n}`,
        action: `size-${n}` as EmbedTitleMenuAction,
        checked: level === n,
      })),
    },
    { label: 'Hide Title', action: 'hide-title', separatorBefore: true },
    { label: viewsLabel(viewsShown), action: 'toggle-views' },
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
    { label: viewsLabel(current.viewsShown), action: 'toggle-views' },
    styleRow(current.viewStyle),
  ]
}

export function viewButtonMenuItems(current: {
  viewButton: ViewButton
}): ActionItem<ViewButtonMenuAction>[] {
  return [
    {
      label: current.viewButton === 'labeled' ? 'Hide Title' : 'Show Title',
      action: 'toggle-title',
    },
  ]
}
