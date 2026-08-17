// The page context-menu meta block (Open · Rename · Change Icon · Delete) and the send block that
// closes it (Move To ▸ · Copy Link · Copy Path) — shared by every surface that right-clicks a page:
// the table cell's title menu and the row grip's, the card's, the sidebar row's, a tab's, and a
// NavWindow row's, so the page actions stay single-sourced. An already-open page reads "Open"
// (focus its tab) rather than "Open New Tab". Each consumer names its item set explicitly —
// the extras render only where they're requested, so no menu carries an action its router
// doesn't serve.

import type { ActionItem } from './menuModel'

/** What Copy Link puts on the clipboard: the connection syntax that reaches this page from any
 *  MarkdownPM surface, so a copied page pastes as a working link rather than as its name. */
export function pageLinkText(title: string): string {
  return `[[${title}]]`
}

/** What Copy Path puts on the clipboard: the page's location read from the nexus root, with the
 *  extension dropped — the form a person names a page by, not the form the disk stores it under. */
export function pagePathText(nexusRelativePath: string): string {
  return nexusRelativePath.replace(/\.md$/i, '')
}

export type PageMetaAction =
  | 'title:preview'
  | 'title:newtab'
  | 'title:rename'
  | 'title:icon'
  | 'title:newabove'
  | 'title:newbelow'
  | 'title:moveto'
  | 'title:copylink'
  | 'title:copypath'
  | 'title:reveal'
  | 'title:delete'

/** The Move To row is a submenu rather than an act, so `title:moveto` never resolves back to a
 *  surface — main expands it into the destination tree, and a leaf resolves as the move itself. */
export const PAGE_MOVE_ROW = 'title:moveto' as const

export type PageMoveAction = `move:${string}`

/** One destination an entity may be sent to. `children` are its sub-sets (a nested submenu).
 *  Both addresses ride along because the two consumers address differently: `path` is the move's
 *  `newParentPath`, and `id` is what a restore resolves its parent by — deriving one from the
 *  other main-side would put name-addressing back at the seam built to avoid it. */
export interface MoveTarget {
  id: string
  label: string
  path: string
  children?: MoveTarget[]
}

/** What a surface hands over so its page can be sent somewhere: the containers on offer, and the
 *  one the page already sits in — that destination is shown disabled, since moving there is a
 *  no-op rather than an absence. No targets, no Move To row. */
export interface PageMoveContext {
  moveTargets?: MoveTarget[]
  currentParentPath?: string
}

/** Whether a surface's menu carries the Move To row at all — no destination, no row. */
export function offersMove(ctx: PageMoveContext): boolean {
  return (ctx.moveTargets?.length ?? 0) > 0
}

/** The two actions a surface can offer for a page it only points at — a tab, a connection — since
 *  neither asks anything of the page but its name and where it sits. */
export type PageClipboardAction = Extract<PageMetaAction, 'title:copylink' | 'title:copypath'>

export const PAGE_CLIPBOARD_ACTIONS = [
  'title:copylink',
  'title:copypath',
] as const satisfies readonly PageClipboardAction[]

/** The send block — where a page can go, then what it can be carried away as. Every surface that
 *  reaches a page offers all three together, so the group reads the same wherever it's popped. */
export type PageSendAction = PageClipboardAction | typeof PAGE_MOVE_ROW

const PAGE_SEND_ACTIONS = [
  PAGE_MOVE_ROW,
  ...PAGE_CLIPBOARD_ACTIONS,
] as const satisfies readonly PageSendAction[]

/** The block as a surface that only points at a page should ask for it — the two copies alone
 *  where nothing was offered to send to. */
export function pageSendActions(ctx: PageMoveContext): readonly PageSendAction[] {
  return offersMove(ctx) ? PAGE_SEND_ACTIONS : PAGE_CLIPBOARD_ACTIONS
}

export function pageMetaMenuItems(
  alreadyOpen?: boolean,
  // `newPages`: 'pair' offers Above/Below (row surfaces); 'single' offers one "New Page" whose
  // action is the flow-after (Below) path — a grid has no above.
  // `clipboard` and `reveal` are separate because they cost different things: copying a page's link
  // or path needs nothing but the page, where revealing it needs the filesystem underneath.
  opts: {
    preview?: boolean
    newPages?: 'pair' | 'single'
    move?: boolean
    clipboard?: boolean
    reveal?: boolean
  } = {},
): ActionItem<PageMetaAction>[] {
  return [
    ...(opts.preview ? [{ label: 'Open Preview', action: 'title:preview' as const }] : []),
    { label: alreadyOpen ? 'Open' : 'Open New Tab', action: 'title:newtab' },
    { label: 'Rename', action: 'title:rename', separatorBefore: true },
    { label: 'Change Icon', action: 'title:icon' },
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
    ...(opts.reveal
      ? [
          {
            label: 'Reveal Location',
            action: 'title:reveal' as const,
            separatorBefore: !opts.clipboard && !opts.move,
          },
        ]
      : []),
    { label: 'Delete', action: 'title:delete', separatorBefore: true },
  ]
}

/** A narrower menu drawn from the same list — the actions stay in the order the full menu gives
 *  them, so a surface offering four of them can't come to disagree with one offering ten. A
 *  separator that would lead the result is dropped, since it separates nothing. */
export function pageMetaMenuSubset<A extends PageMetaAction>(
  actions: readonly A[],
  alreadyOpen?: boolean,
): ActionItem<A>[] {
  const kept = pageMetaMenuItems(alreadyOpen, {
    preview: true,
    newPages: 'pair',
    move: true,
    clipboard: true,
    reveal: true,
  }).filter((i): i is ActionItem<A> =>
    (actions as readonly PageMetaAction[]).includes(i.action),
  )
  return kept.map((item, i) => (i === 0 ? { ...item, separatorBefore: undefined } : item))
}
