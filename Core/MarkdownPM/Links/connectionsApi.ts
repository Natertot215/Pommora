import type { LinkStatus } from '@pommora/core/Connections/connections'
import { headingOf, type Token } from '../Engine/tokens'
import type {
  ConnCellApply,
  ConnEditAction,
  ConnSurface,
  ConnUrlAction,
} from '@pommora/core/Actions/connectionMenu'
import { normalizeTitle } from '@pommora/core/Connections/connections'
import { isValidLink, targetFragment, targetTitle } from '@pommora/core/Connections/links'
import type { ConnPage, PageIndex } from '@pommora/core/Connections/pageIndex'

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
}

export type MdTarget =
  | { kind: 'page'; page: ConnPage; heading?: string }
  | { kind: 'self'; heading: string }
  | { kind: 'external' }
  | { kind: 'invalid' }

/** Page resolution is tried FIRST and deliberately: `isValidLink` accepts any dotted host, so `Notes.md` would read as a website and the page it names would be unreachable through this syntax. */
export function resolveMdTarget(index: PageIndex | undefined, rawTarget: string): MdTarget {
  const title = targetTitle(rawTarget)
  const heading = targetFragment(rawTarget)
  if (title === '' && heading) return { kind: 'self', heading }
  if (index && title) {
    const res = index.resolve(title)
    if (res.status === 'resolved' && res.page)
      return heading ? { kind: 'page', page: res.page, heading } : { kind: 'page', page: res.page }
  }
  return isValidLink(rawTarget) ? { kind: 'external' } : { kind: 'invalid' }
}

interface WikiLinkView {
  status: LinkStatus
  page: ConnPage | null
  bare: boolean
  missing: boolean
}

// How a wikilink token reads: the page half resolves, and a fragment is missing only when the page's heading keys are known and lack it. A page absent from the map reads as present. A bare fragment resolves against the document's own keys, which a surface without page identity leaves undefined.
export function wikiLinkView(
  conn: ConnectionsApi,
  text: string,
  tk: Token,
  ownKeys: readonly string[] | undefined,
): WikiLinkView {
  const [rs, re] = tk.resolveRange ?? tk.contentRange
  const bare = rs === re
  const res = bare ? null : conn.resolve(text.slice(rs, re))
  const page = res?.page ?? null
  const known = bare ? ownKeys : page ? conn.headingsOf?.(page.path) : undefined
  const heading = headingOf(text, tk)
  const missing =
    heading !== undefined && known !== undefined && !known.includes(normalizeTitle(heading))
  return { status: res ? res.status : heading ? 'resolved' : 'phantom', page, bare, missing }
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
