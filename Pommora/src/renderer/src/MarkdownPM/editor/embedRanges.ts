// THE block-construct lines for a doc — one derivation of the exclusion set (a `$$`, `![[…]]`, or
// webpage-embed line inside a fence or table region is content there, never a construct). Every
// layer that must agree on what these lines are reads THIS: the block resolver, the decoration
// pass's gates, the drag models, and the tile field.
import {
  blockEmbedLines,
  blockMathRanges,
  blockWebpageLines,
  type EmbedLine,
  type WebpageLine,
  fencedCodeRanges,
} from '../detect'
import { tableRegions } from '../Tables/regions'
import { normalizeTitle, type LinkStatus } from '@shared/connections'

export interface DocLineScan {
  maths: [number, number][]
  embeds: EmbedLine[]
  webpages: WebpageLine[]
}

/** All three construct kinds from one fence/table base — the base and the math ranges each compute
 *  once per call, so a caller needing several kinds never re-scans the doc per kind. */
export function docLineScan(doc: string): DocLineScan {
  const base: [number, number][] = [
    ...fencedCodeRanges(doc),
    ...tableRegions(doc).map((r): [number, number] => [r.from, r.to]),
  ]
  const maths = blockMathRanges(doc, base)
  const excluded = [...base, ...maths]
  return {
    maths,
    embeds: blockEmbedLines(doc, excluded),
    webpages: blockWebpageLines(doc, excluded),
  }
}

export function docEmbedLines(doc: string): EmbedLine[] {
  return docLineScan(doc).embeds
}

/** Whether a page title can be embedded here: the `![[…]]` syntax cannot express a `]`, and a title
 *  already held by a tile in this document — or by a host above it — would only ever land the inert
 *  duplicate token or the cycle. The grip menu's pick tree and the `![[` autocomplete pool both read
 *  this one rule, so they can never offer different pages. */
export function embeddable(title: string, exclude: ReadonlySet<string>): boolean {
  return !title.includes(']') && !exclude.has(normalizeTitle(title))
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
