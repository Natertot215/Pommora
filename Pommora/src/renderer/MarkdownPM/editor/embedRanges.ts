// THE block-construct lines for a doc — one derivation of the exclusion set (a `$$`, `![[…]]`, or
// webpage-embed line inside a fence or table region is content there, never a construct). Every
// layer that must agree on what these lines are reads THIS: the block resolver, the decoration
// pass's gates, the drag models, and the tile field.
import {
  blockEmbedLines,
  blockMathRanges,
  blockWebpageLines,
  citationScan,
  type CitationScan,
  type DocLines,
  type EmbedLine,
  type WebpageLine,
} from '../detect'
import type { TableRegion } from '../Tables/regions'
import { embeddableTitle, normalizeTitle, type LinkStatus } from '@shared/connections'
import type { CodeMask } from '@shared/markdownCode'

/** The construct kinds this pass answers for, as one contract — `DocScan` extends it rather than
 *  restating the members, so a fifth kind is one edit instead of two that can disagree. */
export interface DocLineScan {
  maths: [number, number][]
  embeds: EmbedLine[]
  webpages: WebpageLine[]
  citations: CitationScan
}

/** THE exclusion set every construct scan reads: the fences and tables the caller already holds,
 *  plus the block math those in turn exclude. Assembled here alone — a caller spelling the order
 *  out beside its own scan is how two layers come to disagree about what a `$$` or a `[^1]:` inside
 *  a table is. */
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

/** Whether a page title can be embedded here: a title the syntax can spell, and one not already held
 *  by a tile in this document — or by a host above it — which would only ever land the inert
 *  duplicate token or the cycle. The grip menu's pick tree and the `![[` autocomplete pool both read
 *  this one rule, so they can never offer different pages. */
export function embeddable(title: string, exclude: ReadonlySet<string>): boolean {
  return embeddableTitle(title) && !exclude.has(normalizeTitle(title))
}

/** The tile-ownership claim: an embed line is claimed when its title resolves to exactly one page AND
 *  it is the first line naming that page — a later duplicate stays the inert token, so two tiles can
 *  never edit one page from one document. The token suppression and the tile field both read this one
 *  predicate; splitting it is how they'd disagree. */
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
