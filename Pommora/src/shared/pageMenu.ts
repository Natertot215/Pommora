// The page context-menu meta block (Open · Rename · Edit Icon · Delete) and the send block that
// closes it (Move To ▸ · Copy Link · Copy Path) — shared by every surface that right-clicks a page,
// so the page actions stay single-sourced. An already-open page reads "Open" (focus its tab) rather
// than "Open New Tab". Each consumer names its item set explicitly, so no menu carries an action
// its router doesn't serve.

import type { ActionItem } from './menuModel'
import { connectionText } from './connections'
import { openLabel } from './toggleLabels'

/** What Copy Link puts on the clipboard: the connection syntax that reaches this page from any
 *  MarkdownPM surface, so a copied page pastes as a working link rather than as its name. */
export function pageLinkText(title: string): string {
  return connectionText(title)
}

/** What Copy Path puts on the clipboard: the page's location read from the nexus root, with the
 *  extension dropped — the form a person names a page by, not the form the disk stores it under. */
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

/** The Move To row is a submenu rather than an act, so `title:moveto` never resolves back to a
 *  surface — main expands it into the destination tree, and a leaf resolves as the move itself. */
export const PAGE_MOVE_ROW = 'title:moveto' as const

export type PageMoveAction = `move:${string}`

/** One destination an entity may be sent to. `children` are its sub-sets (a nested submenu). Both
 *  addresses ride along since the two consumers address differently: `path` is the move's
 *  `newParentPath`, `id` is what a restore resolves its parent by. */
export interface MoveTarget {
  id: string
  label: string
  path: string
  children?: MoveTarget[]
}

/** The containers on offer, and the one the page already sits in — that destination shows disabled,
 *  since moving there is a no-op rather than an absence. No targets, no Move To row. */
export interface PageMoveContext {
  moveTargets?: MoveTarget[]
  currentParentPath?: string
}

/** Whether a surface's menu carries the Move To row at all — no destination, no row. */
export function offersMove(ctx: PageMoveContext): boolean {
  return (ctx.moveTargets?.length ?? 0) > 0
}

/** The actions a surface can offer for a page it only points at — a tab, a row — since none asks
 *  anything of the page but its name, where it sits, and the history kept for it. */
export type PageReachAction = Extract<
  PageMetaAction,
  'title:copylink' | 'title:copypath' | 'title:history'
>

export const PAGE_REACH_ACTIONS = [
  'title:copylink',
  'title:copypath',
  'title:history',
] as const satisfies readonly PageReachAction[]

/** The send block — where a page can go, then what it can be carried away as, then its history.
 *  Every surface that reaches a page offers them together, so the group reads the same wherever
 *  it's popped. */
export type PageSendAction = PageReachAction | typeof PAGE_MOVE_ROW

const PAGE_SEND_ACTIONS = [
  PAGE_MOVE_ROW,
  ...PAGE_REACH_ACTIONS,
] as const satisfies readonly PageSendAction[]

/** The block as a surface that only points at a page should ask for it — the reach actions alone
 *  where nothing was offered to send to. */
export function pageSendActions(ctx: PageMoveContext): readonly PageSendAction[] {
  return offersMove(ctx) ? PAGE_SEND_ACTIONS : PAGE_REACH_ACTIONS
}

export function pageMetaMenuItems(
  alreadyOpen?: boolean,
  // `newPages`: 'pair' offers Above/Below (row surfaces); 'single' offers one "New Page" using the
  // Below path — a grid has no above. `clipboard`/`reveal` are separate since copying a page's link
  // or path needs nothing but the page, where revealing it needs the filesystem underneath.
  opts: {
    window?: boolean
    newPages?: 'pair' | 'single'
    move?: boolean
    clipboard?: boolean
    history?: boolean
    reveal?: boolean
  } = {},
): ActionItem<PageMetaAction>[] {
  return [
    ...(opts.window ? [{ label: 'Open Preview', action: 'title:window' as const }] : []),
    { label: openLabel(alreadyOpen), action: 'title:newtab' },
    { label: 'Rename', action: 'title:rename', separatorBefore: true },
    { label: 'Edit Icon', action: 'title:icon' },
    ...(opts.newPages === 'pair'
      ? [
          { label: 'New Page Above', action: 'title:newabove' as const, separatorBefore: true },
          { label: 'New Page Below', action: 'title:newbelow' as const },
        ]
      : []),
    ...(opts.newPages === 'single'
      ? [{ label: 'New Page', action: 'title:newbelow' as const, separatorBefore: true }]
      : []),
    ...(opts.move ? [{ label: 'Move To', action: PAGE_MOVE_ROW, separatorBefore: true }] : []),
    ...(opts.clipboard
      ? [
          { label: 'Copy Link', action: 'title:copylink' as const, separatorBefore: !opts.move },
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
            separatorBefore: !opts.history && !opts.clipboard && !opts.move,
          },
        ]
      : []),
    { label: 'Delete', action: 'title:delete', separatorBefore: true },
  ]
}

/** A narrower menu drawn from the same list — actions stay in the order the full menu gives them,
 *  so a surface offering four of them can't disagree with one offering ten. A separator that would
 *  lead the result is dropped, since it separates nothing. */
export function pageMetaMenuSubset<A extends PageMetaAction>(
  actions: readonly A[],
  alreadyOpen?: boolean,
): ActionItem<A>[] {
  const kept = pageMetaMenuItems(alreadyOpen, {
    window: true,
    newPages: 'pair',
    move: true,
    clipboard: true,
    history: true,
    reveal: true,
  }).filter((i): i is ActionItem<A> => (actions as readonly PageMetaAction[]).includes(i.action))
  return kept.map((item, i) => (i === 0 ? { ...item, separatorBefore: undefined } : item))
}
