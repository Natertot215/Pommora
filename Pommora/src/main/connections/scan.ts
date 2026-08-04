// Pure body scanner: extract `[[Title]]` page connections from Markdown, aggregating
// repeats to the same normalized title into `multiplicity`. `[[ ]]` is the only connection
// syntax; `{{ }}` is excluded by the pattern and anything inside code is a sample. `![[ ]]`
// embeds are NOT connections — the cascade sweeps them through mentionsTitle so a rename
// still reaches them, without ever giving them a link-graph edge. No I/O.

import {
  normalizeTitle,
  pageEmbedPattern,
  pageLinkPattern,
  type ScannedConnection,
} from '@shared/connections'
import { codeMask } from '@shared/markdownCode'

/** Scan a Markdown body for page connections, aggregating repeats by normalized title. */
export function scanConnections(body: string): ScannedConnection[] {
  const counts = new Map<string, number>()
  const inCode = codeMask(body)
  for (const m of body.matchAll(pageLinkPattern())) {
    if (m.index !== undefined && inCode(m.index)) continue
    const key = normalizeTitle(m[1])
    if (!key) continue
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  return [...counts].map(([normalizedTitle, multiplicity]) => ({ normalizedTitle, multiplicity }))
}

/** The cascade's prefilter: does this body mention `title` as a connection OR an embed?
 *  Code-interior matches stay samples for both syntaxes. */
export function mentionsTitle(body: string, normalizedKey: string): boolean {
  if (scanConnections(body).some((c) => c.normalizedTitle === normalizedKey)) return true
  const inCode = codeMask(body)
  for (const m of body.matchAll(pageEmbedPattern())) {
    if (m.index !== undefined && inCode(m.index)) continue
    if (normalizeTitle(m[1]) === normalizedKey) return true
  }
  return false
}
