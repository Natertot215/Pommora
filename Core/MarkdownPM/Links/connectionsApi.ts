import type { LinkStatus } from '../../Connections/connections'
import { normalizeTitle } from '../../Paths/caseFold'
import { aliasedToken, headingOf, type LinkKind, type TokenOf } from '../Engine/tokens'
import type { LinkAction, LinkMenuContext } from '../../Actions/connectionMenu'
import { targetFragment, targetNamesFile, targetTitle } from '../../Connections/links'
import { isValidLink } from '../../Paths/urlPath'
import type { ConnPage, PageHeadings, PageIndex } from '../../Connections/pageIndex'
import type { TrailSegment } from '@pommora/uix/Elements/NavTrail'
import { cx } from '@pommora/uix/Utilities/cx'
import type { HeadingLinkStyle } from '../../Settings/personalization'

export interface ConnectionsApi extends PageIndex {
  open: (page: ConnPage, heading?: string, newTab?: boolean) => void
  menu?: (target: LinkMenuTarget) => Promise<LinkAction | null>
  headingsOf: (path: string) => PageHeadings | undefined
  location: (pageId: string) => TrailSegment[]
}

export type MdTarget =
  | { kind: 'page'; page: ConnPage; heading?: string }
  | { kind: 'self'; heading: string }
  | { kind: 'url'; url: string }
  | { kind: 'invalid'; ambiguous?: true }

export type LinkMenuTarget = Pick<LinkMenuContext, 'editable' | 'value'> &
  Extract<MdTarget, { kind: 'page' | 'url' }>

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
export function resolveMdTarget(
  index: PageIndex | undefined,
  titleHalf: string,
  headingHalf: string | null,
): MdTarget {
  const target = titleTarget(
    index,
    targetTitle(titleHalf, headingHalf !== null) ?? '',
    headingHalf === null ? '' : targetFragment(headingHalf),
  )
  const raw = headingHalf === null ? titleHalf : `${titleHalf}#${headingHalf}`
  if (
    target.kind !== 'invalid' ||
    target.ambiguous ||
    targetNamesFile(titleHalf) ||
    !isValidLink(raw)
  )
    return target
  return { kind: 'url', url: raw }
}

export function tokenTarget(
  index: PageIndex | undefined,
  text: string,
  tk: TokenOf<LinkKind>,
): MdTarget {
  const { title, heading } = tk.link
  if (tk.kind === 'link')
    return resolveMdTarget(index, text.slice(...title), heading && text.slice(...heading))
  return titleTarget(index, text.slice(...title), headingOf(text, tk))
}

export function linkMenuTarget(
  target: MdTarget,
  editable: boolean,
  value?: LinkMenuContext['value'],
): LinkMenuTarget | null {
  if (target.kind !== 'page' && target.kind !== 'url') return null
  return { ...target, editable, ...(value ? { value } : {}) }
}

// A fragment is missing only when the named page's heading keys are known and lack it; a page absent from the map reads as present. A bare fragment reads the document's own keys, which a surface without page identity leaves undefined.
function headingMissing(
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

interface LinkLook {
  target: MdTarget
  status: LinkStatus
  missing: boolean
  bare: boolean
  join: { showPage: boolean; heading: [number, number]; className: string } | null
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
  const missing = headingMissing(conn, target, ownKeys)
  const join =
    tk.kind === 'wikiLink' && headingOf(text, tk) && status === 'resolved' && !aliasedToken(tk)
      ? {
          showPage: headingLinkStyle !== 'heading-only' && !bare,
          heading: tk.link.heading!,
          className: cx('md-connection-heading', missing && 'md-connection-heading-missing'),
        }
      : null
  return { target, status, missing, bare, join }
}

export function linkClass(look: LinkLook): string {
  if (look.status !== 'resolved') return `md-connection-${look.status}`
  if (look.target.kind === 'url') return 'md-link'
  return cx('md-connection-resolved', look.missing && !look.join && 'md-connection-heading-missing')
}
