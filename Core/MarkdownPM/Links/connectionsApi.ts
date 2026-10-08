import type { LinkStatus } from '../../Connections/connections'
import { normalizeTitle } from '../../Paths/caseFold'
import { headingOf, linkTarget, type Token } from '../Engine/tokens'
import type {
  ConnCellApply,
  ConnEditAction,
  ConnSurface,
  ConnUrlAction,
} from '../../Actions/connectionMenu'
import { targetFragment, targetTitle } from '../../Connections/links'
import { isValidLink } from '../../Paths/urlPath'
import type { ConnPage, PageIndex } from '../../Connections/pageIndex'
import type { TrailSegment } from '@pommora/uix/Elements/NavTrail'

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
  open: (page: ConnPage, heading?: string) => void
  menu?: (target: ConnMenuTarget) => void
  bypass?: (page: ConnPage, heading?: string) => void
  headingsOf?: (path: string) => string[] | undefined
  location?: (pageId: string) => TrailSegment[]
}

export type MdTarget =
  | { kind: 'page'; page: ConnPage; heading?: string }
  | { kind: 'self'; heading: string }
  | { kind: 'external'; url: string }
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
  if (target.kind !== 'invalid' || !isValidLink(rawTarget)) return target
  return { kind: 'external', url: rawTarget }
}

export function tokenTarget(index: PageIndex | undefined, text: string, tk: Token): MdTarget {
  if (tk.kind === 'link') return resolveMdTarget(index, linkTarget(text, tk))
  const [rs, re] = tk.resolveRange ?? tk.contentRange
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
    case 'external':
      return { kind: 'url', url: target.url, apply }
    default:
      return null
  }
}

interface WikiLinkView {
  status: LinkStatus
  bare: boolean
  missing: boolean
}

// A fragment is missing only when the named page's heading keys are known and lack it; a page absent from the map reads as present. A bare fragment reads the document's own keys, which a surface without page identity leaves undefined.
export function headingMissing(
  conn: ConnectionsApi | undefined,
  target: MdTarget,
  ownKeys: readonly string[] | undefined,
): boolean {
  if ((target.kind !== 'page' && target.kind !== 'self') || !target.heading) return false
  const known = target.kind === 'self' ? ownKeys : conn?.headingsOf?.(target.page.path)
  return known !== undefined && !known.includes(normalizeTitle(target.heading))
}

function linkStatus(target: MdTarget): LinkStatus {
  if (target.kind !== 'invalid') return 'resolved'
  return target.ambiguous ? 'ambiguous' : 'phantom'
}

export function wikiLinkView(
  conn: ConnectionsApi,
  text: string,
  tk: Token,
  ownKeys: readonly string[] | undefined,
): WikiLinkView {
  const target = tokenTarget(conn, text, tk)
  return {
    status: linkStatus(target),
    bare: target.kind === 'self',
    missing: headingMissing(conn, target, ownKeys),
  }
}

export function openPage(
  api: ConnectionsApi,
  page: ConnPage,
  bypass: boolean,
  heading?: string,
): void {
  if (bypass && api.bypass) api.bypass(page, heading)
  else api.open(page, heading)
}
