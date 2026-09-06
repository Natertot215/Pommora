// One derivation of the exclusion set: a math, page-embed or webpage-embed line inside a fence or table region is content there, never a construct. Every layer that must agree on what these lines are reads this one.
import {
  blockEmbedLines,
  blockMathRanges,
  blockWebpageLines,
  citationScan,
  type CitationScan,
  type DocLines,
  type EmbedLine,
  type WebpageLine,
} from './detect'
import type { TableRegion } from './Tables/regions'
import {
  embeddableTitle,
  normalizeTitle,
  type LinkStatus,
} from '@pommora/core/Connections/connections'
import type { CodeMask } from './markdownCode'

export interface DocLineScan {
  maths: [number, number][]
  embeds: EmbedLine[]
  webpages: WebpageLine[]
  citations: CitationScan
}

function constructExclusions(
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

/** A title not already held by a tile in this document or a host above it, which would land the inert duplicate or a cycle. */
export function embeddable(title: string, exclude: ReadonlySet<string>): boolean {
  return embeddableTitle(title) && !exclude.has(normalizeTitle(title))
}

/** Claimed when its title resolves to exactly one page and it is the first line naming it — a later duplicate stays the inert token, so two tiles can never edit one page from one document. */
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
