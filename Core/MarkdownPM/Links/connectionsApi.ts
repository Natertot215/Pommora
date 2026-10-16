import type { LinkStatus } from '../../Connections/connections'
import { defaultLabel } from '../../Connections/links'
import { normalizeTitle } from '../../Paths/caseFold'
import { aliasedToken, type LinkKind, type TokenOf } from '../Engine/tokens'
import type { Span } from '../Engine/markdownCode'
import type { LinkAction, LinkMenuTarget } from '../../Actions/connectionMenu'
import { readOccurrence, type ResolvedLink, resolveLink } from '../../Connections/linkValue'
import type { ConnPage, PageHeadings, PageIndex } from '../../Connections/pageIndex'
import { cx } from '@pommora/uix/Utilities/cx'
import type { HeadingLinkStyle } from '../../Settings/personalization'

/** What an editor needs of the page tree: the one title index, how to open a page, the connection menu where the surface has one, and a page's headings. */
export interface ConnectionsApi {
  index: PageIndex
  open: (page: ConnPage, heading?: string, newTab?: boolean) => void
  menu?: (target: LinkMenuTarget) => Promise<LinkAction | null>
  headingsOf: (path: string) => PageHeadings | undefined
}

// A fragment is missing only when the named page's heading keys are known and lack it; a page absent from the map reads as present. A bare fragment reads the document's own keys, which a surface without page identity leaves undefined.
function headingMissing(
  conn: ConnectionsApi | undefined,
  target: ResolvedLink,
  ownKeys: readonly string[] | undefined,
): boolean {
  if ((target.kind !== 'page' && target.kind !== 'self') || !target.heading) return false
  const known = target.kind === 'self' ? ownKeys : conn?.headingsOf(target.page.path)?.keys
  return known !== undefined && !known.includes(normalizeTitle(target.heading))
}

interface LinkLook {
  /** What an empty label shows: the target's default label, or the address. */
  label: string
  target: ResolvedLink
  status: LinkStatus
  missing: boolean
  bare: boolean
  join: { showPage: boolean; heading: Span; className: string } | null
}

export function linkLook(
  conn: ConnectionsApi | undefined,
  text: string,
  tk: TokenOf<LinkKind>,
  ownKeys: readonly string[] | undefined,
  headingLinkStyle: HeadingLinkStyle,
): LinkLook {
  const written = readOccurrence(text, tk.link)
  const target = resolveLink(written, conn?.index)
  const status = target.kind === 'unresolved' ? target.status : 'resolved'
  const bare = target.kind === 'self'
  const missing = headingMissing(conn, target, ownKeys)
  const h = tk.link.heading
  const join =
    tk.kind === 'wikiLink' && h && h[1] > h[0] && status === 'resolved' && !aliasedToken(tk)
      ? {
          showPage: headingLinkStyle !== 'heading-only' && !bare,
          heading: h,
          className: cx('md-connection-heading', missing && 'md-connection-heading-missing'),
        }
      : null
  const label =
    written?.kind === 'page' ? defaultLabel(written.title, written.heading) : (written?.url ?? '')
  return { label, target, status, missing, bare, join }
}

export function linkClass(look: LinkLook): string {
  if (look.status !== 'resolved') return `md-connection-${look.status}`
  if (look.target.kind === 'url') return 'md-link'
  return cx('md-connection-resolved', look.missing && !look.join && 'md-connection-heading-missing')
}
