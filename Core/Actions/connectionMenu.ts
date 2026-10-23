import { type ActionItem, joinGroups, type LeafItem } from './menuModel'
import {
  COPY_LINK_ROW,
  COPY_PATH_ROW,
  type PageMetaAction,
  type PageOpenAction,
  pageOpenRows,
} from './pageMenu'
import { LINK_DISPLAYS, LINK_DISPLAY_LABELS, type ResolvedLink } from '../Connections/linkValue'

export type LinkMenuContext = { editable: boolean; value?: { hideable: boolean } } & (
  | { kind: 'page'; open: 'closed' | 'tab' | 'detail'; windowed: boolean }
  | { kind: 'url'; web: boolean }
)

export type LinkMenuTarget = Pick<LinkMenuContext, 'editable' | 'value'> &
  Extract<ResolvedLink, { kind: 'page' | 'url' }>

export function linkMenuTarget(
  target: ResolvedLink,
  editable: boolean,
  value?: LinkMenuContext['value'],
): LinkMenuTarget | null {
  if (target.kind !== 'page' && target.kind !== 'url') return null
  return { ...target, editable, ...(value ? { value } : {}) }
}

export type ConnEditAction = 'rename' | 'editLink'
const CELL_ACTIONS = ['cell:clear', 'cell:hide'] as const
export type ConnCellAction = (typeof CELL_ACTIONS)[number]
type LinkCopyAction = Extract<PageMetaAction, 'title:copylink' | 'title:copypath'>

type UrlOpenAction = 'link:window' | 'link:browser'

const URL_OPEN_ROWS: readonly LeafItem<UrlOpenAction>[] = [
  { label: 'Preview', action: 'link:window' },
  { label: 'Open In Browser', action: 'link:browser' },
]

const LINK_EDIT_ACTIONS = [
  'rename',
  'editLink',
  ...LINK_DISPLAYS.map((d) => `format:${d}` as const),
  'link:remove',
  'link:delete',
] as const
type LinkEditAction = (typeof LINK_EDIT_ACTIONS)[number]
const LINK_ACTIONS = [...LINK_EDIT_ACTIONS, ...CELL_ACTIONS] as const
export type LinkAction = (typeof LINK_ACTIONS)[number]

const UNLINK_ROWS: readonly ActionItem<LinkEditAction>[] = [
  { label: 'Remove Link', action: 'link:remove' },
  { label: 'Delete', action: 'link:delete' },
]

const FORMAT_ROW = (web: boolean): ActionItem<LinkEditAction> => ({
  label: 'Format',
  submenu: LINK_DISPLAYS.filter((d) => d !== 'link-title' || web).map((d) => ({
    label: LINK_DISPLAY_LABELS[d],
    action: `format:${d}` as const,
  })),
})

export type LinkMenuAction = PageOpenAction | UrlOpenAction | LinkCopyAction | LinkAction

export const isLinkAction = (action: LinkMenuAction): action is LinkAction =>
  (LINK_ACTIONS as readonly string[]).includes(action)

export function cellClosingRows(
  clearable: boolean,
  hideable: boolean | undefined,
  removeLabel = 'Remove',
): ActionItem<ConnCellAction>[] {
  return [
    ...(clearable ? [{ label: 'Clear', action: 'cell:clear' as const }] : []),
    ...(hideable ? [{ label: removeLabel, action: 'cell:hide' as const }] : []),
  ]
}

export function connectionMenuModel(ctx: LinkMenuContext): ActionItem<LinkMenuAction>[] {
  const opens: readonly ActionItem<LinkMenuAction>[] =
    ctx.kind === 'page'
      ? pageOpenRows({
          alreadyOpen: ctx.open === 'tab',
          window: !ctx.windowed,
          newTab: ctx.open !== 'detail',
        })
      : URL_OPEN_ROWS.filter((r) => r.action !== 'link:window' || ctx.web)
  const authoring: ActionItem<LinkMenuAction>[] = ctx.editable
    ? [
        { label: 'Rename', action: 'rename' },
        { label: ctx.kind === 'page' ? 'Edit Title' : 'Edit Link', action: 'editLink' },
      ]
    : []
  const copies: ActionItem<LinkMenuAction>[] =
    ctx.kind === 'page' ? [COPY_LINK_ROW, COPY_PATH_ROW] : [COPY_LINK_ROW]
  const format = ctx.kind === 'url' && ctx.editable && !ctx.value ? [FORMAT_ROW(ctx.web)] : []
  const closing = ctx.value
    ? cellClosingRows(true, ctx.value.hideable)
    : ctx.editable
      ? UNLINK_ROWS
      : []
  return joinGroups([opens, authoring, [...copies, ...format], closing])
}
