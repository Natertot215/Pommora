// The link right-click menu — one model behind every surface that pops one, so the actions a link
// offers can't depend on where it was right-clicked. Sits apart from `connections.ts` the way
// `cellMenu.ts` sits apart from the cell: that module states the grammar, this one the actions.

import type { ActionItem } from './menuModel'
import { pageMetaMenuSubset, type PageMetaAction } from './pageMenu'
import { LINK_DISPLAYS, LINK_DISPLAY_LABELS } from './properties'

export interface ConnMenuContext {
  surface: ConnSurface
  editable: boolean
  hasAlias: boolean
  external?: boolean
  open?: 'closed' | 'tab' | 'detail'
  windowed?: boolean
  hideable?: boolean
}

export type ConnSurface = 'editor' | 'cell'
export type ConnEditAction = 'rename' | 'editLink'
export type ConnCellAction = 'link:clear' | 'link:hide'
export type ConnCellApply = (action: ConnCellAction) => void
export type ConnOpenAction = Extract<PageMetaAction, 'title:window' | 'title:newtab'>

export const CONN_OPEN_ACTIONS = [
  'title:window',
  'title:newtab',
] as const satisfies readonly ConnOpenAction[]

export type ConnCopyAction = Extract<PageMetaAction, 'title:copylink' | 'title:copypath'>

const CONN_COPY_ACTIONS = [
  'title:copylink',
  'title:copypath',
] as const satisfies readonly ConnCopyAction[]

export type ConnSiteAction = 'link:window' | 'link:browser'

export const CONN_SITE_ROWS: readonly ActionItem<ConnSiteAction>[] = [
  { label: 'Open Preview', action: 'link:window' },
  { label: 'Open Browser', action: 'link:browser' },
]

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
  | ConnCopyAction
  | ConnUrlAction

export const isConnUrlAction = (action: ConnMenuAction): action is ConnUrlAction =>
  (CONN_URL_ACTIONS as readonly string[]).includes(action)

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
 *  offered — instead it gets the items that edit the link itself. */
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
    const opens = CONN_SITE_ROWS.filter((r) => !(r.action === 'link:window' && ctx.windowed))
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
      !(r.action === 'title:window' && ctx.windowed),
  )
  return [
    ...opens,
    ...authoring,
    ...pageMetaMenuSubset(CONN_COPY_ACTIONS).map((r, i) => ({
      ...r,
      separatorBefore: i === 0,
    })),
    ...closingRows(ctx),
  ]
}
