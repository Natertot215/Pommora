import type { LinkStatus } from './connections'
import { compareTitles, normalizeTitle } from '../Paths/caseFold'

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
  // Sorted on the first autocomplete, not at build: the index rebuilds on every tree change, and most never reach a picker.
  let alphabetical: typeof entries | null = null
  return {
    resolve(rawTitle) {
      const holders = byTitle.get(normalizeTitle(rawTitle))
      if (!holders || holders.length === 0) return { status: 'phantom' }
      if (holders.length > 1) return { status: 'ambiguous' }
      return { status: 'resolved', page: holders[0] }
    },
    candidates(query, limit = 20) {
      alphabetical ??= [...entries].sort((a, b) => compareTitles(a.p.title, b.p.title))
      const q = normalizeTitle(query)
      // An empty query browses the whole index alphabetically — the just-inserted embed opener's state.
      if (!q) return alphabetical.slice(0, limit).map((x) => x.p)
      return alphabetical
        .filter((x) => x.norm.startsWith(q))
        .sort(
          (a, b) =>
            (a.norm === q ? 0 : 1) - (b.norm === q ? 0 : 1) || a.p.title.length - b.p.title.length,
        )
        .slice(0, limit)
        .map((x) => x.p)
    },
  }
}
