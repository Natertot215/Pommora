// The link right-click menu — one model behind every surface that pops one, so the actions a link
// offers can't come to depend on where it was right-clicked. Sits apart from `connections.ts` for
// the same reason `cellMenu.ts` sits apart from the cell: that module states the grammar a link is
// written in, this one states what a reader may do with it.

import type { ActionItem } from './menuModel'
import {
  PAGE_CLIPBOARD_ACTIONS,
  pageMetaMenuSubset,
  type PageClipboardAction,
  type PageMetaAction,
} from './pageMenu'
import { LINK_DISPLAYS, LINK_DISPLAY_LABELS } from './properties'

/** What the link menu needs in order to render itself. The two authoring actions are built into
 *  the menu rather than filtered after it, so a surface that can't take an edit never offers them. */
export interface ConnMenuContext {
  /** Where this menu was popped. One vocabulary serves both, and this is what decides how a menu
   *  ENDS: an editor link can stop being a link, where a property cell's value can only be emptied. */
  surface: ConnSurface
  editable: boolean
  /** Whether the link already wears an alias — the authoring item names creating or changing it. */
  hasAlias: boolean
  /** A link whose target is a web address rather than a page: it has an address to copy, and none of
   *  the actions that need a page behind them. */
  external?: boolean
  /** Where the page this link reaches is already showing. `tab` names focusing it rather than
   *  opening it; `detail` is the page in hand, and an open item that would land where the reader
   *  already stands is dropped rather than shown inert. */
  open?: 'closed' | 'tab' | 'detail'
  /** Whether the preview window is already showing this page — the same reasoning, for the other
   *  open item. The two are independent: a page can be both, and then neither item is offered. */
  previewing?: boolean
  /** Cards let any value drop its property from the view — the trailing Remove every card menu ends
   *  with, offered nowhere else. */
  hideable?: boolean
}

export type ConnSurface = 'editor' | 'cell'

/** The two that edit the link rather than open it. */
export type ConnEditAction = 'rename' | 'editLink'

/** The two that act on a property cell's VALUE rather than on the link inside it — a cell's answer
 *  to the editor's Remove Link · Delete, and offered only where a value is what the link is. */
export type ConnCellAction = 'link:clear' | 'link:hide'

/** How a cell answers the two that act on its value. It rides beside the surface's own `apply`
 *  rather than widening it, so a handler is only ever handed what its own menu could have offered. */
export type ConnCellApply = (action: ConnCellAction) => void

/** The two ways a link reaches its page — the same pair, in the same order, every other page menu
 *  opens with. */
export type ConnOpenAction = Extract<PageMetaAction, 'title:preview' | 'title:newtab'>

export const CONN_OPEN_ACTIONS = [
  'title:preview',
  'title:newtab',
] as const satisfies readonly ConnOpenAction[]

/** The two ways a link reaches its web address — the address's answer to the pair above. Preview
 *  takes the in-app browser and Browser the system one, each naming its destination outright rather
 *  than deferring to the open-in preference: a menu that offers both cannot also be ambiguous about
 *  which one it is offering. */
export type ConnSiteAction = 'link:preview' | 'link:browser'

export const CONN_SITE_ROWS: readonly ActionItem<ConnSiteAction>[] = [
  { label: 'Open Preview', action: 'link:preview' },
  { label: 'Open Browser', action: 'link:browser' },
]

/** Everything a link pointing at a web address can be told to do. The three `format:` ids rewrite the
 *  label alone — no per-link state is stored anywhere, so nothing can come to disagree with the file
 *  — and the last two are the two readings of taking a link off the words it wears: `link:remove`
 *  keeps the label as prose, `link:delete` keeps nothing.
 *
 *  A list rather than a bare union because the menu resolves the wider `ConnMenuAction`, and narrowing
 *  back to what this branch can act on is a membership test. `rename` and `editLink` are shared with
 *  `ConnEditAction`: both name the same halves of a link, whichever syntax wrote it. */
export const CONN_URL_ACTIONS = [
  'rename',
  'editLink',
  'format:link-full',
  'format:link-short',
  'format:link-title',
  'link:remove',
  'link:delete',
] as const
export type ConnUrlAction = (typeof CONN_URL_ACTIONS)[number]

/** The pair that ends the menu, below a separator: they act on the link's existence rather than on
 *  how it reads, which is what sets them apart from the three above. */
export const CONN_UNLINK_ROWS: readonly ActionItem<ConnUrlAction>[] = [
  { label: 'Remove Link', action: 'link:remove', separatorBefore: true },
  { label: 'Delete', action: 'link:delete' },
]

/** The link native context menu's actions (conn-menu IPC). */
export type ConnMenuAction =
  | ConnOpenAction
  | ConnSiteAction
  | ConnEditAction
  | ConnCellAction
  | PageClipboardAction
  | ConnUrlAction

export const isConnUrlAction = (action: ConnMenuAction): action is ConnUrlAction =>
  (CONN_URL_ACTIONS as readonly string[]).includes(action)

/** The two a property cell answers with — how the menu's result is routed to the cell's own handler
 *  rather than to the surface's `apply`, which a link in prose shares. */
export const isConnCellAction = (action: ConnMenuAction): action is ConnCellAction =>
  action === 'link:clear' || action === 'link:hide'

/** How a link menu ends. An editor's link can stop being a link at all; a cell's can only be
 *  emptied, and on a card dropped from the view besides. */
function closingRows(ctx: ConnMenuContext): ActionItem<ConnMenuAction>[] {
  if (ctx.surface === 'editor') return ctx.external && ctx.editable ? [...CONN_UNLINK_ROWS] : []
  return [
    { label: 'Clear', action: 'link:clear', separatorBefore: true },
    ...(ctx.hideable ? [{ label: 'Remove', action: 'link:hide' as const }] : []),
  ]
}

/** The link right-click menu, as rows. One model behind every surface that pops one, so the actions
 *  a link offers can't come to depend on which surface the reader right-clicked it from.
 *
 *  A web address reaches no page, so nothing needing one is offered; what it gets instead is the
 *  items that edit the link itself. Format carries no radio state because there is none to carry:
 *  the label is ordinary text, and a link written in one form is indistinguishable from the same
 *  words typed by hand. */
export function connMenuModel(ctx: ConnMenuContext): ActionItem<ConnMenuAction>[] {
  const authoring: ActionItem<ConnMenuAction>[] = ctx.editable
    ? [
        {
          // Naming the act rather than the item: on a bare link there is no title yet to edit.
          label: ctx.external ? 'Rename' : ctx.hasAlias ? 'Edit Title' : 'Add Title',
          action: 'rename',
          separatorBefore: true,
        },
        { label: 'Edit Link', action: 'editLink' },
      ]
    : []
  const copyLink = pageMetaMenuSubset(['title:copylink'])

  if (ctx.external) {
    const opens = CONN_SITE_ROWS.filter((r) => !(r.action === 'link:preview' && ctx.previewing))
    // The cell puts the address on the clipboard alongside the two opens — all three act on the
    // address as it stands. The editor keeps it among the items that rewrite the link instead.
    if (ctx.surface === 'cell') return [...opens, ...copyLink, ...authoring, ...closingRows(ctx)]
    return [
      ...opens,
      ...authoring,
      ...copyLink.map((r) => ({ ...r, separatorBefore: false })),
      ...(ctx.editable
        ? [
            {
              label: 'Format',
              action: 'format:link-full' as const,
              submenu: LINK_DISPLAYS.map((d) => ({
                label: LINK_DISPLAY_LABELS[d],
                action: `format:${d}` as ConnMenuAction,
              })),
            },
          ]
        : []),
      ...closingRows(ctx),
    ]
  }

  // A page already in hand is not somewhere to be opened: each open item answers to its own
  // surface, so a page showing in both offers neither.
  const opens = pageMetaMenuSubset(CONN_OPEN_ACTIONS, ctx.open === 'tab').filter(
    (r) =>
      !(r.action === 'title:newtab' && ctx.open === 'detail') &&
      !(r.action === 'title:preview' && ctx.previewing),
  )
  return [
    ...opens,
    ...authoring,
    ...pageMetaMenuSubset(PAGE_CLIPBOARD_ACTIONS).map((r, i) => ({
      ...r,
      separatorBefore: i === 0,
    })),
    ...closingRows(ctx),
  ]
}
