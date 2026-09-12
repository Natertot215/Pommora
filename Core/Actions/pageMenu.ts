import type { ActionItem } from './menuModel'
import { type PropertyAction, type PropertyMenuRow, propertiesRow } from './propertyRows'
import { connectionText } from '../Connections/connections'
import { openLabel } from './toggleLabels'

export function pageLinkText(title: string): string {
  return connectionText(title)
}

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
  | 'title:moveto'
  | 'title:copylink'
  | 'title:copypath'
  | 'title:history'
  | 'title:reveal'
  | 'title:delete'

const PAGE_MOVE_ROW = 'title:moveto' as const

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
  properties?: PropertyMenuRow[]
}

function offersMove(ctx: PageMenuContext): boolean {
  return (ctx.moveTargets?.length ?? 0) > 0
}

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
    const [first, ...rest] = t.children.map(node)
    return {
      label: t.label,
      action: self.action,
      submenu: [self, { ...first, separatorBefore: true }, ...rest],
    }
  }
  return targets.map(node)
}

function moveRow(ctx: PageMenuContext): ActionItem<PageMetaAction | PageMoveAction> {
  return {
    label: 'Move To',
    action: PAGE_MOVE_ROW,
    separatorBefore: true,
    submenu: destinationRows(
      ctx.moveTargets ?? [],
      (t) => `move:${t.path}` as const,
      (t) => t.path === ctx.currentParentPath,
    ),
  }
}

type PageReachAction = Extract<
  PageMetaAction,
  'title:copylink' | 'title:copypath' | 'title:history'
>

const PAGE_REACH_ACTIONS = [
  'title:copylink',
  'title:copypath',
  'title:history',
] as const satisfies readonly PageReachAction[]

export type PageSendAction = PageReachAction | typeof PAGE_MOVE_ROW

const PAGE_SEND_ACTIONS = [
  PAGE_MOVE_ROW,
  ...PAGE_REACH_ACTIONS,
] as const satisfies readonly PageSendAction[]

export function pageSendActions(ctx: PageMenuContext): readonly PageSendAction[] {
  return offersMove(ctx) ? PAGE_SEND_ACTIONS : PAGE_REACH_ACTIONS
}

export function pageMetaMenuItems(
  alreadyOpen?: boolean,
  // `newPages`: 'single' takes the Below path, since a grid has no above.
  opts: {
    window?: boolean
    newPages?: 'pair' | 'single'
    move?: PageMenuContext
    properties?: PropertyMenuRow[]
    clipboard?: boolean
    history?: boolean
    reveal?: boolean
  } = {},
): ActionItem<PageMetaAction | PageMoveAction | PropertyAction>[] {
  const move = opts.move !== undefined && offersMove(opts.move)
  return [
    ...(opts.window ? [{ label: 'Open Preview', action: 'title:window' as const }] : []),
    { label: openLabel(alreadyOpen), action: 'title:newtab' },
    { label: 'Rename', action: 'title:rename', separatorBefore: true },
    { label: 'Edit Icon', action: 'title:icon' },
    ...(opts.properties?.length ? [propertiesRow(opts.properties)] : []),
    ...(opts.newPages === 'pair'
      ? [
          { label: 'New Page Above', action: 'title:newabove' as const, separatorBefore: true },
          { label: 'New Page Below', action: 'title:newbelow' as const },
        ]
      : []),
    ...(opts.newPages === 'single'
      ? [{ label: 'New Page', action: 'title:newbelow' as const, separatorBefore: true }]
      : []),
    ...(move && opts.move ? [moveRow(opts.move)] : []),
    ...(opts.clipboard
      ? [
          { label: 'Copy Link', action: 'title:copylink' as const, separatorBefore: !move },
          { label: 'Copy Path', action: 'title:copypath' as const },
        ]
      : []),
    ...(opts.history
      ? [{ label: 'View History', action: 'title:history' as const, separatorBefore: true }]
      : []),
    ...(opts.reveal
      ? [
          {
            label: 'Reveal Location',
            action: 'title:reveal' as const,
            separatorBefore: !opts.history && !opts.clipboard && !move,
          },
        ]
      : []),
    { label: 'Delete', action: 'title:delete', separatorBefore: true },
  ]
}

export function pageMetaMenuSubset<A extends PageMetaAction>(
  actions: readonly A[],
  alreadyOpen?: boolean,
): ActionItem<A>[]
export function pageMetaMenuSubset<A extends PageMetaAction>(
  actions: readonly A[],
  alreadyOpen: boolean | undefined,
  move: PageMenuContext,
): ActionItem<A | PageMoveAction>[]
export function pageMetaMenuSubset<A extends PageMetaAction>(
  actions: readonly A[],
  alreadyOpen?: boolean,
  move?: PageMenuContext,
): ActionItem<A | PageMoveAction>[] {
  const kept = pageMetaMenuItems(alreadyOpen, {
    window: true,
    newPages: 'pair',
    move,
    clipboard: true,
    history: true,
    reveal: true,
  }).filter((i): i is ActionItem<A | PageMoveAction> =>
    (actions as readonly PageMetaAction[]).includes(i.action as PageMetaAction),
  )
  return kept.map((item, i) => (i === 0 ? { ...item, separatorBefore: undefined } : item))
}
