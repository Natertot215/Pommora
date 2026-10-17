import type { LinkStatus } from './connections'
import { compareTitles, normalizeTitle } from '../Paths/caseFold'
import { stripMarkdownExt } from '../Paths/posix'
import type { PageHeading } from '../Platform/stores'

export interface ConnPage {
  id: string
  title: string
  path: string
}

export interface ConnResolution {
  status: LinkStatus
  page?: ConnPage
}

export interface PageHeadings {
  keys: string[]
  texts: string[]
  outline: PageHeading[]
}

export const headingKeys = (headings: readonly PageHeading[]): string[] => [
  ...new Set(headings.map((h) => normalizeTitle(h.text))),
]

/** A written page half, or a page's path, as the one key both compare by: folded, its `.md` dropped. A heading never passes through it. */
export const pageKey = (raw: string): string => stripMarkdownExt(normalizeTitle(raw))

/** The last `depth` segments of a page's path, `.md` dropped: what a link written at that depth spells. */
const tailOf = (path: string, depth: number): string =>
  stripMarkdownExt(path).split('/').slice(-depth).join('/')

/** A page's path as a key: its title's key under its folders, so a page keys the same by path and by title. */
const pathKey = (path: string): string => pageKey(stripMarkdownExt(path))

/** Every tail of a page's path as a key, shortest first: the keys a link may name the page by. */
export const pathKeys = (path: string): string[] =>
  path.split('/').map((_, i) => pageKey(tailOf(path, i + 1)))

export interface PageIndex {
  holders: (raw: string) => readonly ConnPage[]
  resolve: (raw: string) => ConnResolution
  /** How a new link spells the page at `path`: at the depth `like` was written (one when none), the tail of its path where that names the page alone, else its full path from the Nexus root. */
  writtenName: (path: string, like?: string) => string
  /** The keys that name the page at `path` and resolve to it: the tails of its path, shortest first. */
  namesOf: (path: string) => string[]
  candidates: (query: string, limit?: number) => ConnPage[]
}

export function buildPageIndex(pages: readonly ConnPage[]): PageIndex {
  // Titles key ONCE at build — candidates() runs per autocomplete keystroke.
  const entries = pages.map((p) => ({ p, norm: pageKey(p.title) }))
  const byTitle = new Map<string, ConnPage[]>()
  for (const { p, norm } of entries) {
    if (!norm) continue
    const holders = byTitle.get(norm)
    if (holders) holders.push(p)
    else byTitle.set(norm, [p])
  }
  // Sorted on the first autocomplete, not at build: the index rebuilds whenever the pages change, and most builds (the host's always) never reach a picker.
  let alphabetical: typeof entries | null = null
  // A key holding `/` names a page by a tail of its path: the full path first, otherwise the title's holders whose path ends with it; several, or two paths folding to one, read Ambiguous.
  const holdersOf = (raw: string): readonly ConnPage[] => {
    const key = pageKey(raw)
    const cut = key.lastIndexOf('/')
    const titled = byTitle.get(key.slice(cut + 1)) ?? []
    if (cut < 0) return titled
    const exact = titled.filter((p) => pathKey(p.path) === key)
    return exact.length ? exact : titled.filter((p) => pathKey(p.path).endsWith(`/${key}`))
  }
  const resolve = (raw: string): ConnResolution => {
    const holders = holdersOf(raw)
    if (holders.length === 0) return { status: 'phantom' }
    if (holders.length > 1) return { status: 'ambiguous' }
    return { status: 'resolved', page: holders[0] }
  }
  return {
    holders: holdersOf,
    resolve,
    writtenName(path, like = '') {
      const tail = tailOf(path, like.split('/').length)
      return resolve(tail).page?.path === path ? tail : stripMarkdownExt(path)
    },
    namesOf: (path) => pathKeys(path).filter((k) => resolve(k).page?.path === path),
    candidates(query, limit = 20) {
      alphabetical ??= [...entries].sort((a, b) => compareTitles(a.p.title, b.p.title))
      const q = normalizeTitle(query)
      // An empty query browses the whole index alphabetically, as an empty `[[` or `[label](` lists.
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
