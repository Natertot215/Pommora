// The view-family native menus' action vocabulary — one home for the unions both processes
// speak (main pops the menu, preload types the reply), completing the shared-menu convention
// the per-menu files (cellMenu, tabMenu, …) established. No fs, no React.

import type { ActionItem } from './menuModel'
import type { ViewButton, ViewStyle } from './types'
import { iconLabel } from './toggleLabels'

/** Which surface a container's views are picked from — offered by both menus that can set it. */
export type ViewStyleAction = 'style-dropdown' | 'style-toolbar'

export type ViewButtonMenuAction = 'toggle-title' | ViewStyleAction

export type EmbedTitleMenuAction = 'toggle-icon' | 'change-icon' | 'hide-title' | `size-${number}`

export type EmbedAreaMenuAction = 'show-title' | 'new-view' | ViewStyleAction

/** The heading levels an embed's title can be set to — the full six, unlike the block grip's
 *  picker, since an embed title is chrome rather than document structure. */
const EMBED_TITLE_SIZES = [1, 2, 3, 4, 5, 6] as const

/** Which surface a container's views are picked from, and what each reads as. Checkboxes rather
 *  than radios: the pair reads as two states of one setting. */
const VIEW_STYLE_ROWS: readonly { label: string; style: ViewStyle }[] = [
  { label: 'Dropdown', style: 'dropdown' },
  { label: 'Toolbar', style: 'toolbar' },
]

/** The Style branch, identical wherever it is offered — the embed's area menu and the view button's
 *  own menu set the same container config from it. A branch row never resolves its own action, so it
 *  carries the leading leaf's: the leaf a person lands on is what comes back. */
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

/** The embed title row's chrome menu. Edit Icon appears only while an icon is shown, since it
 *  has nothing to change otherwise. */
export function embedTitleMenuItems(
  iconShown: boolean,
  level: number,
): ActionItem<EmbedTitleMenuAction>[] {
  return [
    ...(iconShown ? [{ label: 'Edit Icon', action: 'change-icon' as const }] : []),
    { label: iconLabel(iconShown), action: 'toggle-icon' },
    {
      label: 'Title Size',
      // A branch takes no action of its own; it carries the leading leaf's, so a host that ever
      // resolves one lands on the row a person would have reached through it.
      action: 'size-1',
      submenu: EMBED_TITLE_SIZES.map((n) => ({
        label: `Heading ${n}`,
        action: `size-${n}` as EmbedTitleMenuAction,
        checked: level === n,
      })),
    },
    { label: 'Hide Title', action: 'hide-title', separatorBefore: true },
  ]
}

/** The switcher area's presentation menu. Show Title surfaces here only while the title row is
 *  hidden — with the row gone, its own right-click target is gone too. The pill-titles toggle
 *  lives on this menu alone: beside the title row's Show/Hide Title, the two near-identical
 *  labels would read as one control. */
export function embedAreaMenuItems(current: {
  viewStyle: ViewStyle
  titleShown: boolean
}): ActionItem<EmbedAreaMenuAction>[] {
  return [
    ...(current.titleShown ? [] : [{ label: 'Show Title', action: 'show-title' as const }]),
    { label: 'New View', action: 'new-view' },
    styleRow(current.viewStyle),
  ]
}

/** The view button's own right-click menu — whether the button carries its view's title, over the
 *  same Style choice the embed offers. */
export function viewButtonMenuItems(current: {
  viewButton: ViewButton
  viewStyle: ViewStyle
}): ActionItem<ViewButtonMenuAction>[] {
  return [
    {
      label: current.viewButton === 'labeled' ? 'Hide Title' : 'Show Title',
      action: 'toggle-title',
    },
    styleRow(current.viewStyle),
  ]
}
