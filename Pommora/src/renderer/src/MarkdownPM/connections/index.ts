import { normalizeTitle, type ConnEditAction, type LinkStatus } from '@shared/connections'
import { isValidLink, targetTitle } from '@shared/links'

/** What was right-clicked, and how to act on it. The menu is popped asynchronously by a free
 *  function, so acting on the result needs a way back into the editor instance that was clicked —
 *  `apply` is that way, and its absence is what marks a display-only surface. It closes over the
 *  span it was built for, so no caller can aim an action at a link the menu wasn't popped on.
 *
 *  A link reaching a page and a link reaching a web address are different menus, not one menu with
 *  absences: the address has no page to preview, to name, or to give a location. */
export type ConnMenuTarget =
  | {
      kind: 'page'
      page: ConnPage
      editable: boolean
      hasAlias: boolean
      apply?: (action: ConnEditAction) => void
    }
  | { kind: 'url'; url: string }

export interface ConnPage {
  id: string
  title: string
  path: string
  icon?: string
}

export interface ConnResolution {
  status: LinkStatus
  page?: ConnPage
}

export interface PageIndex {
  resolve: (rawTitle: string) => ConnResolution
  candidates: (query: string, limit?: number) => ConnPage[]
}

export interface ConnectionsApi extends PageIndex {
  open: (page: ConnPage) => void
  /** Optional right-click hook — the host pops the native context menu for the link. */
  menu?: (target: ConnMenuTarget) => void
  /** ⌘-click takes the OTHER route from `open` (preview ⇄ new tab); absent = ⌘ ignored. */
  bypass?: (page: ConnPage) => void
  /** Fired after the hover-intent delay on a resolved connection, with the link's live element —
   *  the consumer measures it (and detects detachment) itself. */
  hover?: (page: ConnPage, el: Element) => void
}

/** What a markdown link's target turns out to name. One resolver behind the click path and both
 *  renderers, so a link can never be coloured as one thing and act as another. */
export type MdTarget =
  | { kind: 'page'; page: ConnPage }
  | { kind: 'external' }
  | { kind: 'invalid' }

/** Resolve a markdown link's `( )`. Page resolution is tried FIRST and deliberately: `isValidLink`
 *  accepts any dotted host, so `Notes.md` and `Node.js` would otherwise be read as websites and the
 *  pages they name would be unreachable through this syntax entirely. */
export function resolveMdTarget(index: PageIndex | undefined, rawTarget: string): MdTarget {
  const title = targetTitle(rawTarget)
  if (index && title) {
    const res = index.resolve(title)
    if (res.status === 'resolved' && res.page) return { kind: 'page', page: res.page }
  }
  return isValidLink(rawTarget) ? { kind: 'external' } : { kind: 'invalid' }
}

export function buildPageIndex(pages: ConnPage[]): PageIndex {
  // Titles normalize ONCE at build — candidates() runs per autocomplete keystroke.
  const entries = pages.map((p) => ({ p, norm: normalizeTitle(p.title) }))
  const byTitle = new Map<string, ConnPage[]>()
  for (const { p, norm } of entries) {
    if (!norm) continue
    const holders = byTitle.get(norm)
    if (holders) holders.push(p)
    else byTitle.set(norm, [p])
  }
  return {
    resolve(rawTitle) {
      const holders = byTitle.get(normalizeTitle(rawTitle))
      if (!holders || holders.length === 0) return { status: 'phantom' }
      if (holders.length > 1) return { status: 'ambiguous' }
      return { status: 'resolved', page: holders[0] }
    },
    candidates(query, limit = 20) {
      const q = normalizeTitle(query)
      // An empty query browses the whole index alphabetically — the just-inserted embed opener's
      // state; whether an empty query shows anything at all is the autocomplete hook's call.
      if (!q)
        return entries
          .map((x) => x.p)
          .sort((a, b) => a.title.localeCompare(b.title))
          .slice(0, limit)
      return entries
        .filter((x) => x.norm.startsWith(q))
        .sort((a, b) => {
          const exact = (a.norm === q ? 0 : 1) - (b.norm === q ? 0 : 1)
          if (exact !== 0) return exact
          if (a.p.title.length !== b.p.title.length) return a.p.title.length - b.p.title.length
          return a.p.title.localeCompare(b.p.title)
        })
        .slice(0, limit)
        .map((x) => x.p)
    },
  }
}
