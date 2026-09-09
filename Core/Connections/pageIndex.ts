import { normalizeTitle, type LinkStatus } from './connections'
import { compareTitles } from '../Paths/caseFold'

export interface ConnPage {
  id: string
  title: string
  path: string
  icon?: string
}

interface ConnResolution {
  status: LinkStatus
  page?: ConnPage
}

export interface PageIndex {
  resolve: (rawTitle: string) => ConnResolution
  candidates: (query: string, limit?: number) => ConnPage[]
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
      // An empty query browses the whole index alphabetically — the just-inserted embed opener's state.
      if (!q)
        return entries
          .map((x) => x.p)
          .sort((a, b) => compareTitles(a.title, b.title))
          .slice(0, limit)
      return entries
        .filter((x) => x.norm.startsWith(q))
        .sort((a, b) => {
          const exact = (a.norm === q ? 0 : 1) - (b.norm === q ? 0 : 1)
          if (exact !== 0) return exact
          if (a.p.title.length !== b.p.title.length) return a.p.title.length - b.p.title.length
          return compareTitles(a.p.title, b.p.title)
        })
        .slice(0, limit)
        .map((x) => x.p)
    },
  }
}
