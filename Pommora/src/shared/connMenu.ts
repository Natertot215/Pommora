// The link right-click menu — one model behind every surface that pops one, so the actions a link
// offers can't depend on where it was right-clicked. Sits apart from `connections.ts` the way
// `cellMenu.ts` sits apart from the cell: that module states the grammar, this one the actions.

import type { ActionItem } from './menuModel'
import { pageMetaMenuSubset, type PageMetaAction, type PageReachAction } from './pageMenu'
import { LINK_DISPLAYS, LINK_DISPLAY_LABELS } from './properties'

/** What the link menu needs in order to render itself. The two authoring actions are built into
 *  the menu rather than filtered after it, so a surface that can't take an edit never offers them. */
export interface ConnMenuContext {
  /** Decides how the menu ends: an editor link can stop being a link, a cell's value can only be
   *  emptied. */
  surface: ConnSurface
  editable: boolean
  hasAlias: boolean
  /** A web-address target: has an address to copy, none of the actions that need a page behind it. */
  external?: boolean
  /** `tab` names focusing an already-open page rather than opening it; `detail` is the page in
   *  hand — an open item landing where the reader already stands is dropped, not shown inert. */
  open?: 'closed' | 'tab' | 'detail'
  /** Same reasoning as `open`, for the preview item. Independent of it: a page can be both, and
   *  then neither item is offered. */
  previewing?: boolean
  /** Cards can drop any value's property from the view — the trailing Remove, offered nowhere else. */
  hideable?: boolean
}

export type ConnSurface = 'editor' | 'cell'

export type ConnEditAction = 'rename' | 'editLink'

/** Acts on a property cell's VALUE rather than the link inside it — a cell's answer to the
 *  editor's Remove Link · Delete. */
export type ConnCellAction = 'link:clear' | 'link:hide'

/** Rides beside the surface's own `apply` rather than widening it, so a handler is only ever
 *  handed what its own menu could have offered. */
export type ConnCellApply = (action: ConnCellAction) => void

/** The same pair, in the same order, every other page menu opens with. */
export type ConnOpenAction = Extract<PageMetaAction, 'title:preview' | 'title:newtab'>

export const CONN_OPEN_ACTIONS = [
  'title:preview',
  'title:newtab',
] as const satisfies readonly ConnOpenAction[]

/** The address's answer to the pair above. Preview takes the in-app browser, Browser the system
 *  one — each names its destination outright rather than deferring to the open-in preference,
 *  since a menu offering both can't also be ambiguous about which is which. */
export type ConnSiteAction = 'link:preview' | 'link:browser'

export const CONN_SITE_ROWS: readonly ActionItem<ConnSiteAction>[] = [
  { label: 'Open Preview', action: 'link:preview' },
  { label: 'Open Browser', action: 'link:browser' },
]

/** Everything a link to a web address can be told to do. The three `format:` ids rewrite the label
 *  alone — no per-link state is stored, so nothing can disagree with the file — and the last two
 *  are the two readings of stripping a link: `link:remove` keeps the label as prose, `link:delete`
 *  keeps nothing.
 *
 *  A list, not a bare union, because the menu resolves the wider `ConnMenuAction` and narrows back
 *  via membership test. */
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

/** Ends the menu below a separator; acts on the link's existence rather than how it reads. */
export const CONN_UNLINK_ROWS: readonly ActionItem<ConnUrlAction>[] = [
  { label: 'Remove Link', action: 'link:remove', separatorBefore: true },
  { label: 'Delete', action: 'link:delete' },
]

export type ConnMenuAction =
  | ConnOpenAction
  | ConnSiteAction
  | ConnEditAction
  | ConnCellAction
  | Extract<PageReachAction, 'title:copylink' | 'title:copypath'>
  | ConnUrlAction

export const isConnUrlAction = (action: ConnMenuAction): action is ConnUrlAction =>
  (CONN_URL_ACTIONS as readonly string[]).includes(action)

/** Routes the menu's result to the cell's own handler rather than the surface's `apply`, which a
 *  link in prose shares. */
export const isConnCellAction = (action: ConnMenuAction): action is ConnCellAction =>
  action === 'link:clear' || action === 'link:hide'

function closingRows(ctx: ConnMenuContext): ActionItem<ConnMenuAction>[] {
  if (ctx.surface === 'editor') return ctx.external && ctx.editable ? [...CONN_UNLINK_ROWS] : []
  return [
    { label: 'Clear', action: 'link:clear', separatorBefore: true },
    ...(ctx.hideable ? [{ label: 'Remove', action: 'link:hide' as const }] : []),
  ]
}

/** The link right-click menu, as rows. A web address reaches no page, so nothing needing one is
 *  offered — instead it gets the items that edit the link itself. Format carries no radio state
 *  because there's none to carry: a link written in one form is indistinguishable from the same
 *  words typed by hand. */
export function connMenuModel(ctx: ConnMenuContext): ActionItem<ConnMenuAction>[] {
  const authoring: ActionItem<ConnMenuAction>[] = ctx.editable
    ? [
        {
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
    // The cell puts the address on the clipboard beside the two opens — all three act on the
    // address as-is. The editor keeps it among the items that rewrite the link instead.
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

  // A page already in hand isn't somewhere to be opened: each open item answers to its own
  // surface, so a page showing in both offers neither.
  const opens = pageMetaMenuSubset(CONN_OPEN_ACTIONS, ctx.open === 'tab').filter(
    (r) =>
      !(r.action === 'title:newtab' && ctx.open === 'detail') &&
      !(r.action === 'title:preview' && ctx.previewing),
  )
  return [
    ...opens,
    ...authoring,
    ...pageMetaMenuSubset(['title:copylink', 'title:copypath']).map((r, i) => ({
      ...r,
      separatorBefore: i === 0,
    })),
    ...closingRows(ctx),
  ]
}
