import { type ActionItem, joinGroups, openOrder } from './menuModel'
import { type PropertyAction, type PropertyMenuRow, propertyBranchRows } from './propertyRows'
import { openLabel } from './toggleLabels'

export function pagePathText(nexusRelativePath: string): string {
  return nexusRelativePath.replace(/\.md$/i, '')
}

export type PageMetaAction =
  | 'title:window'
  | 'title:newtab'
  | 'title:rename'
  | 'title:icon'
  | 'title:newabove'
  | 'title:newbelow'
  | 'title:copylink'
  | 'title:copypath'
  | 'title:history'
  | 'title:reveal'
  | 'title:delete'

export type PageMoveAction = `move:${string}`

/** `path` is the move's `newParentPath`; `id` is what a restore resolves its parent by. */
export interface MoveTarget {
  id: string
  label: string
  path: string
  children?: MoveTarget[]
}

export interface PageMenuContext {
  moveTargets?: MoveTarget[]
  currentParentPath?: string
  spaces?: PropertyMenuRow[]
  properties?: PropertyMenuRow[]
}

export const RENAME_ROW = { label: 'Rename', action: 'title:rename' } as const
export const COPY_LINK_ROW = { label: 'Copy Link', action: 'title:copylink' } as const
export const COPY_PATH_ROW = { label: 'Copy Path', action: 'title:copypath' } as const
export const HISTORY_ROW = { label: 'View History', action: 'title:history' } as const
export const REVEAL_ROW = { label: 'Reveal Location', action: 'title:reveal' } as const
export const DELETE_ROW = { label: 'Delete', action: 'title:delete' } as const

export function destinationRows<A>(
  targets: readonly MoveTarget[],
  action: (target: MoveTarget) => A,
  disabled?: (target: MoveTarget) => boolean,
): ActionItem<A>[] {
  const node = (t: MoveTarget): ActionItem<A> => {
    const self: ActionItem<A> = {
      label: t.label,
      action: action(t),
      ...(disabled?.(t) ? { disabled: true } : {}),
    }
    if (!t.children?.length) return self
    return { label: t.label, submenu: joinGroups([[self], t.children.map(node)]) }
  }
  return targets.map(node)
}

export type PageOpenAction = Extract<PageMetaAction, 'title:window' | 'title:newtab'>

export function pageOpenRows({
  alreadyOpen,
  window,
  newTab = true,
}: {
  alreadyOpen?: boolean
  window?: boolean
  newTab?: boolean
}): ActionItem<PageOpenAction>[] {
  return openOrder<PageOpenAction>(
    alreadyOpen,
    newTab ? [{ label: openLabel(alreadyOpen), action: 'title:newtab' }] : [],
    window ? [{ label: 'Preview', action: 'title:window' }] : [],
  )
}

export type PageSendAction = 'title:copylink' | 'title:copypath' | 'title:history' | 'title:reveal'

export function pageSendGroups(
  ctx: PageMenuContext,
  reveal = false,
): ActionItem<PageSendAction | PageMoveAction>[][] {
  const move: ActionItem<PageMoveAction>[] = ctx.moveTargets?.length
    ? [
        {
          label: 'Move To',
          submenu: destinationRows(
            ctx.moveTargets,
            (t) => `move:${t.path}` as const,
            (t) => t.path === ctx.currentParentPath,
          ),
        },
      ]
    : []
  return [
    [...move, COPY_LINK_ROW, COPY_PATH_ROW],
    [HISTORY_ROW, ...(reveal ? [REVEAL_ROW] : [])],
  ]
}

// 'single' takes the Below path, since a grid has no above.
const NEW_PAGE_ROWS: Record<'pair' | 'single', readonly ActionItem<PageMetaAction>[]> = {
  pair: [
    { label: 'New Page Above', action: 'title:newabove' },
    { label: 'New Page Below', action: 'title:newbelow' },
  ],
  single: [{ label: 'New Page', action: 'title:newbelow' }],
}

export function pageMetaMenuItems(
  alreadyOpen?: boolean,
  opts: {
    window?: boolean
    newPages?: keyof typeof NEW_PAGE_ROWS
    move?: PageMenuContext
    spaces?: PropertyMenuRow[]
    properties?: PropertyMenuRow[]
    reveal?: boolean
  } = {},
): ActionItem<PageMetaAction | PageMoveAction | PropertyAction>[] {
  return joinGroups<PageMetaAction | PageMoveAction | PropertyAction>([
    pageOpenRows({ alreadyOpen, window: opts.window }),
    [RENAME_ROW, { label: 'Edit Icon', action: 'title:icon' }, ...propertyBranchRows(opts)],
    opts.newPages ? NEW_PAGE_ROWS[opts.newPages] : [],
    ...pageSendGroups(opts.move ?? {}, opts.reveal),
    [DELETE_ROW],
  ])
}
