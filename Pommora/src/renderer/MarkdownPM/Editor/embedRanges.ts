// One derivation of the exclusion set (a `$$`, `![[…]]`, or webpage-embed line inside a fence or
// table region is content there, never a construct). Every layer that must agree on what these
// lines are — the block resolver, the decoration pass's gates, the drag models, the tile field —
// reads this one.
import {
  blockEmbedLines,
  blockMathRanges,
  blockWebpageLines,
  citationScan,
  type CitationScan,
  type DocLines,
  type EmbedLine,
  type WebpageLine,
} from '../Detect'
import type { TableRegion } from '../Tables/regions'
import { embeddableTitle, normalizeTitle, type LinkStatus } from '@shared/connections'
import type { CodeMask } from '@shared/markdownCode'

/** The construct kinds this pass answers for. `DocScan` extends it rather than restating the
 *  members, so a fifth kind is one edit instead of two that can disagree. */
export interface DocLineScan {
  maths: [number, number][]
  embeds: EmbedLine[]
  webpages: WebpageLine[]
  citations: CitationScan
}

/** The exclusion set every construct scan reads: the fences and tables the caller already holds,
 *  plus the block math those in turn exclude. Assembled here alone, so two layers never disagree
 *  about what a `$$` or a `[^1]:` inside a table is. */
export function constructExclusions(
  d: DocLines,
  fences: [number, number][],
  tables: readonly TableRegion[],
): { maths: [number, number][]; excluded: [number, number][] } {
  const base: [number, number][] = [
    ...fences,
    ...tables.map((r): [number, number] => [r.from, r.to]),
  ]
  const maths = blockMathRanges(d, base)
  return { maths, excluded: [...base, ...maths] }
}

/** Every construct kind from the fence/table base the caller already holds — the exclusion set
 *  is assembled once here, so a caller needing several kinds never re-scans the doc per kind. */
export function docLineScan(
  d: DocLines,
  fences: [number, number][],
  tables: readonly TableRegion[],
  inCode?: CodeMask,
): DocLineScan {
  const { maths, excluded } = constructExclusions(d, fences, tables)
  return {
    maths,
    embeds: blockEmbedLines(d, excluded),
    webpages: blockWebpageLines(d, excluded),
    citations: citationScan(d, excluded, inCode),
  }
}

/** Whether a page title can be embedded here: a title the syntax can spell, and one not already
 *  held by a tile in this document or a host above it, which would land the inert duplicate token
 *  or a cycle. The grip menu's pick tree and the `![[` autocomplete pool both read this one rule. */
export function embeddable(title: string, exclude: ReadonlySet<string>): boolean {
  return embeddableTitle(title) && !exclude.has(normalizeTitle(title))
}

/** The tile-ownership claim: an embed line is claimed when its title resolves to exactly one page
 *  and it's the first line naming that page — a later duplicate stays the inert token, so two
 *  tiles can never edit one page from one document. */
export function claimedEmbeds(
  embeds: readonly EmbedLine[],
  statusOf: (title: string) => LinkStatus,
): EmbedLine[] {
  const seen = new Set<string>()
  const out: EmbedLine[] = []
  for (const e of embeds) {
    if (statusOf(e.title) !== 'resolved') continue
    const key = normalizeTitle(e.title)
    if (seen.has(key)) continue
    seen.add(key)
    out.push(e)
  }
  return out
}
