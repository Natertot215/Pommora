import { type ActionItem, joinGroups, type LeafItem } from './menuModel'
import {
  COPY_LINK_ROW,
  COPY_PATH_ROW,
  type PageMetaAction,
  type PageOpenAction,
  pageOpenRows,
} from './pageMenu'
import { LINK_DISPLAYS, LINK_DISPLAY_LABELS } from '../Properties/properties'

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
export type ConnCellAction = 'cell:clear' | 'cell:hide'
export type ConnCellApply = (action: ConnCellAction) => void
type ConnCopyAction = Extract<PageMetaAction, 'title:copylink' | 'title:copypath'>

type ConnSiteAction = 'link:window' | 'link:browser'

const CONN_SITE_ROWS: readonly LeafItem<ConnSiteAction>[] = [
  { label: 'Preview', action: 'link:window' },
  { label: 'Open In Browser', action: 'link:browser' },
]

const CONN_URL_ACTIONS = [
  'rename',
  'editLink',
  'format:link-full',
  'format:link-short',
  'format:link-title',
  'link:remove',
  'link:delete',
] as const
export type ConnUrlAction = (typeof CONN_URL_ACTIONS)[number]

const CONN_UNLINK_ROWS: readonly ActionItem<ConnUrlAction>[] = [
  { label: 'Remove Link', action: 'link:remove' },
  { label: 'Delete', action: 'link:delete' },
]

export type ConnMenuAction =
  | PageOpenAction
  | ConnSiteAction
  | ConnEditAction
  | ConnCellAction
  | ConnCopyAction
  | ConnUrlAction

export const isConnUrlAction = (action: ConnMenuAction): action is ConnUrlAction =>
  (CONN_URL_ACTIONS as readonly string[]).includes(action)

export const isConnCellAction = (action: ConnMenuAction): action is ConnCellAction =>
  action === 'cell:clear' || action === 'cell:hide'

function closingRows(ctx: ConnMenuContext): readonly ActionItem<ConnMenuAction>[] {
  if (ctx.surface === 'editor') return ctx.external && ctx.editable ? CONN_UNLINK_ROWS : []
  return [
    { label: 'Clear', action: 'cell:clear' },
    ...(ctx.hideable ? [{ label: 'Remove', action: 'cell:hide' as const }] : []),
  ]
}

export function connectionMenuModel(ctx: ConnMenuContext): ActionItem<ConnMenuAction>[] {
  const authoring: ActionItem<ConnMenuAction>[] = ctx.editable
    ? [
        {
          label: ctx.external ? 'Rename' : ctx.hasAlias ? 'Edit Title' : 'Add Title',
          action: 'rename',
        },
        { label: 'Edit Link', action: 'editLink' },
      ]
    : []

  if (ctx.external) {
    const opens = CONN_SITE_ROWS.filter((r) => !(r.action === 'link:window' && ctx.windowed))
    if (ctx.surface === 'cell' || !ctx.editable)
      return joinGroups([[...opens, COPY_LINK_ROW], authoring, closingRows(ctx)])
    return joinGroups<ConnMenuAction>([
      opens,
      [
        ...authoring,
        COPY_LINK_ROW,
        {
          label: 'Format',
          submenu: LINK_DISPLAYS.map((d) => ({
            label: LINK_DISPLAY_LABELS[d],
            action: `format:${d}` as const,
          })),
        },
      ],
      closingRows(ctx),
    ])
  }

  return joinGroups<ConnMenuAction>([
    pageOpenRows({
      alreadyOpen: ctx.open === 'tab',
      window: !ctx.windowed,
      newTab: ctx.open !== 'detail',
    }),
    authoring,
    [COPY_LINK_ROW, COPY_PATH_ROW],
    closingRows(ctx),
  ])
}
