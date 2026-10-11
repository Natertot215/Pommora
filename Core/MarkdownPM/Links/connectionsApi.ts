import type { LinkStatus } from '../../Connections/connections'
import { normalizeTitle } from '../../Paths/caseFold'
import {
  aliasedToken,
  headingOf,
  type LinkKind,
  linkTarget,
  type Token,
  type TokenOf,
} from '../Engine/tokens'
import type {
  ConnCellApply,
  ConnEditAction,
  ConnSurface,
  ConnUrlAction,
} from '../../Actions/connectionMenu'
import { targetFragment, targetNamesFile, targetTitle } from '../../Connections/links'
import { isValidLink } from '../../Paths/urlPath'
import type { ConnPage, PageHeadings, PageIndex } from '../../Connections/pageIndex'
import type { TrailSegment } from '@pommora/uix/Elements/NavTrail'
import { cx } from '@pommora/uix/Utilities/cx'
import type { HeadingLinkStyle } from '../../Settings/personalization'

/** `apply` closes over the span it was built for, so no caller can aim an action at a link the menu wasn't popped on; its absence marks a display-only surface. */
export type ConnMenuTarget = {
  surface?: ConnSurface
  hideable?: boolean
  onCell?: ConnCellApply
} & (
  | {
      kind: 'page'
      page: ConnPage
      heading?: string
      editable: boolean
      hasAlias: boolean
      apply?: (action: ConnEditAction) => void
    }
  | {
      kind: 'url'
      url: string
      editable?: boolean
      hasAlias?: boolean
      apply?: (action: ConnUrlAction) => void
    }
)

export interface ConnectionsApi extends PageIndex {
  open: (page: ConnPage, heading?: string, newTab?: boolean) => void
  menu?: (target: ConnMenuTarget) => void
  headingsOf: (path: string) => PageHeadings | undefined
  location: (pageId: string) => TrailSegment[]
}

export type MdTarget =
  | { kind: 'page'; page: ConnPage; heading?: string }
  | { kind: 'self'; heading: string }
  | { kind: 'url'; url: string }
  | { kind: 'invalid'; ambiguous?: true }

export function titleTarget(
  index: PageIndex | undefined,
  title: string,
  heading?: string,
): MdTarget {
  if (title === '') return heading ? { kind: 'self', heading } : { kind: 'invalid' }
  const res = index?.resolve(title)
  if (res?.page) return { kind: 'page', page: res.page, heading: heading || undefined }
  return res?.status === 'ambiguous' ? { kind: 'invalid', ambiguous: true } : { kind: 'invalid' }
}

/** Page resolution is tried FIRST and deliberately: `isValidLink` accepts any dotted host, so `Notes.md` would read as a website and the page it names would be unreachable through this syntax. */
export function resolveMdTarget(index: PageIndex | undefined, rawTarget: string): MdTarget {
  const target = titleTarget(index, targetTitle(rawTarget) ?? '', targetFragment(rawTarget))
  if (
    target.kind !== 'invalid' ||
    target.ambiguous ||
    targetNamesFile(rawTarget) ||
    !isValidLink(rawTarget)
  )
    return target
  return { kind: 'url', url: rawTarget }
}

export function tokenTarget(
  index: PageIndex | undefined,
  text: string,
  tk: TokenOf<LinkKind>,
): MdTarget {
  if (tk.kind === 'link') return resolveMdTarget(index, linkTarget(text, tk))
  const [rs, re] = tk.resolveRange
  return titleTarget(index, text.slice(rs, re), headingOf(text, tk))
}

export function linkMenuTarget(
  target: MdTarget,
  apply?: (action: ConnUrlAction) => void,
): ConnMenuTarget | null {
  switch (target.kind) {
    case 'page':
      return {
        kind: 'page',
        page: target.page,
        heading: target.heading,
        editable: false,
        hasAlias: false,
      }
    case 'url':
      return { kind: 'url', url: target.url, apply }
    default:
      return null
  }
}

/** A connection naming a page is authored in place, and every other link is a page or an address. */
export function tokenMenuTarget(
  tk: Token | undefined,
  target: MdTarget,
  edit?: { wiki: (action: ConnEditAction) => void; url: (action: ConnUrlAction) => void },
): ConnMenuTarget | null {
  if (tk?.kind === 'wikiLink' && target.kind === 'page')
    return {
      kind: 'page',
      page: target.page,
      heading: target.heading,
      editable: edit !== undefined,
      hasAlias: aliasedToken(tk),
      apply: edit?.wiki,
    }
  return linkMenuTarget(target, edit?.url)
}

// A fragment is missing only when the named page's heading keys are known and lack it; a page absent from the map reads as present. A bare fragment reads the document's own keys, which a surface without page identity leaves undefined.
export function headingMissing(
  conn: ConnectionsApi | undefined,
  target: MdTarget,
  ownKeys: readonly string[] | undefined,
): boolean {
  if ((target.kind !== 'page' && target.kind !== 'self') || !target.heading) return false
  const known = target.kind === 'self' ? ownKeys : conn?.headingsOf(target.page.path)?.keys
  return known !== undefined && !known.includes(normalizeTitle(target.heading))
}

export function linkStatus(target: MdTarget): LinkStatus {
  if (target.kind !== 'invalid') return 'resolved'
  return target.ambiguous ? 'ambiguous' : 'phantom'
}

export interface LinkLook {
  target: MdTarget
  status: LinkStatus
  missing: boolean
  bare: boolean
  join: { showPage: boolean; heading: [number, number] } | null
}

export function linkLook(
  conn: ConnectionsApi | undefined,
  text: string,
  tk: TokenOf<LinkKind>,
  ownKeys: readonly string[] | undefined,
  headingLinkStyle: HeadingLinkStyle,
): LinkLook {
  const target = tokenTarget(conn, text, tk)
  const status = linkStatus(target)
  const bare = target.kind === 'self'
  const join =
    tk.kind === 'wikiLink' && tk.heading && status === 'resolved' && !aliasedToken(tk)
      ? { showPage: headingLinkStyle !== 'heading-only' && !bare, heading: tk.heading }
      : null
  return { target, status, missing: headingMissing(conn, target, ownKeys), bare, join }
}

export function linkClass(look: LinkLook): string {
  if (look.status !== 'resolved') return `md-connection-${look.status}`
  if (look.target.kind === 'url') return 'md-link'
  return cx('md-connection-resolved', look.missing && !look.join && 'md-connection-heading-missing')
}
