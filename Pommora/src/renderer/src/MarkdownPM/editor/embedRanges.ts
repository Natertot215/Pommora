// THE lone-line page embeds for a doc — one derivation of the exclusion set (an `![[…]]` line inside
// a fence or table region is content there, never an embed). Every layer that must agree on what an
// embed line is reads THIS: the block resolver, the decoration pass's gates, and the tile field.
import { blockEmbedLines, type EmbedLine, fencedCodeRanges } from '../detect'
import { docMathRanges } from './mathRanges'
import { tableRegions } from '../Tables/regions'
import { normalizeTitle, type LinkStatus } from '@shared/connections'

export function docEmbedLines(doc: string): EmbedLine[] {
  return blockEmbedLines(doc, [
    ...fencedCodeRanges(doc),
    ...tableRegions(doc).map((r): [number, number] => [r.from, r.to]),
    ...docMathRanges(doc),
  ])
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
