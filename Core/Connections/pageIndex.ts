import type { LinkStatus } from './connections'
import {
  compareTitles,
  type MatchKey,
  matchKey,
  matchQuery,
  normalizeTitle,
  rankMatches,
} from '../Paths/caseFold'
import { isMarkdownFile, relDirname, stripMarkdownExt } from '../Paths/posix'
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

/** A written page half, or a page's path, as the one key both compare by: folded, every trailing `.md` dropped. A heading never passes through it. */
export const pageKey = (raw: string): string => {
  const key = normalizeTitle(raw)
  return isMarkdownFile(key) ? pageKey(stripMarkdownExt(key)) : key
}

/** The last `depth` segments of a page's path, `.md` dropped: what a link written at that depth spells. */
const tailOf = (path: string, depth: number): string =>
  stripMarkdownExt(path).split('/').slice(-depth).join('/')

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
  /** How `key`, which named `page` before, spells it now: null to leave the link as written, when the key still names the page and the page's path at the key's depth is unchanged from `oldPath` byte for byte (a case-only rename changes it); else the written name at the key's depth. */
  respell: (key: string, page: ConnPage, oldPath?: string) => string | null
  /** The page each id names, first listed where two files claim one. */
  readonly byId: ReadonlyMap<string, ConnPage>
  candidates: (query: string, limit?: number) => ConnPage[]
}

export function buildPageIndex(pages: readonly ConnPage[]): PageIndex {
  const byTitle = new Map<string, ConnPage[]>()
  for (const p of pages) {
    const norm = pageKey(p.title)
    if (!norm) continue
    const holders = byTitle.get(norm)
    if (holders) holders.push(p)
    else byTitle.set(norm, [p])
  }
  // Sorted and keyed on the first autocomplete, not at build: the index rebuilds whenever the pages change, and most builds (the host's always) never reach a picker.
  let alphabetical: { p: ConnPage; key: MatchKey }[] | null = null
  let byId: Map<string, ConnPage> | undefined
  const pathKeyMemo = new Map<ConnPage, string>()
  const pathKeyOf = (p: ConnPage): string => {
    const held = pathKeyMemo.get(p)
    if (held !== undefined) return held
    const k = pageKey(p.path)
    pathKeyMemo.set(p, k)
    return k
  }
  // A key holding `/` names a page by a tail of its path: the full path first, otherwise the title's holders whose path ends with it; several, or two paths folding to one, read Ambiguous.
  const holdersOf = (raw: string): readonly ConnPage[] => {
    const key = pageKey(raw)
    const cut = key.lastIndexOf('/')
    const titled = byTitle.get(key.slice(cut + 1)) ?? []
    if (cut < 0) return titled
    const exact = titled.filter((p) => pathKeyOf(p) === key)
    return exact.length ? exact : titled.filter((p) => pathKeyOf(p).endsWith(`/${key}`))
  }
  const resolve = (raw: string): ConnResolution => {
    const holders = holdersOf(raw)
    if (holders.length === 0) return { status: 'phantom' }
    if (holders.length > 1) return { status: 'ambiguous' }
    return { status: 'resolved', page: holders[0] }
  }
  const writtenName = (path: string, like = ''): string => {
    const tail = tailOf(path, like.split('/').length)
    return resolve(tail).page?.path === path ? tail : stripMarkdownExt(path)
  }
  return {
    holders: holdersOf,
    resolve,
    writtenName,
    namesOf: (path) => pathKeys(path).filter((k) => resolve(k).page?.path === path),
    respell(key, page, oldPath = page.path) {
      const depth = key.split('/').length
      const keeps =
        resolve(key).page?.id === page.id && tailOf(oldPath, depth) === tailOf(page.path, depth)
      return keeps ? null : writtenName(page.path, key)
    },
    get byId() {
      if (!byId) {
        byId = new Map()
        for (const p of pages) if (!byId.has(p.id)) byId.set(p.id, p)
      }
      return byId
    },
    candidates(query, limit = 20) {
      alphabetical ??= pages
        .map((p) => ({ p, key: matchKey(p.title, relDirname(p.path)) }))
        .sort((a, b) => compareTitles(a.p.title, b.p.title))
      const q = matchQuery(query)
      // An empty query browses the whole index alphabetically, as an empty `[[` or `[label](` lists.
      if (!q) return alphabetical.slice(0, limit).map((x) => x.p)
      return rankMatches(alphabetical, q, (x) => x.key, limit).map((x) => x.p)
    },
  }
}
