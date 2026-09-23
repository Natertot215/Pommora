import type { EmbedLine } from './detect'
import {
  embeddableTitle,
  normalizeTitle,
  type LinkStatus,
} from '@pommora/core/Connections/connections'

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
