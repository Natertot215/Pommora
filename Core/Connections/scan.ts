// The rename cascade's prefilter. `[[ ]]` is the only connection syntax; anything inside code is
// a sample. `![[ ]]` embeds are NOT connections, but the cascade still sweeps them so a rename
// reaches them without giving them a link-graph edge — one predicate answers for both syntaxes.

import { normalizeTitle, pageEmbedPattern, pageLinkPattern, titleOf } from './connections'
import { markdownLinkRegex, targetTitle } from './links'
import { readLink } from './linkValue'
import { codeMask } from './markdownCode'

/** The one parse the content index seeds from and the cascade's prefilter answers through, so a
 *  title the index recorded is exactly one the prefilter would affirm. The gate in front is on
 *  SYNTAX rather than any title: a substring test would break the NFC invariant `normalizeTitle`
 *  exists for, and an NFD-composed body would be skipped silently. */
export function extractMentions(body: string): Set<string> {
  const out = new Set<string>()
  if (!body.includes('[[') && !body.includes('](')) return out
  const inCode = codeMask(body)
  for (const m of body.matchAll(pageLinkPattern())) {
    if (m.index !== undefined && inCode(m.index)) continue
    const key = normalizeTitle(titleOf(m[1]))
    if (key) out.add(key)
  }
  for (const m of body.matchAll(pageEmbedPattern())) {
    if (m.index !== undefined && inCode(m.index)) continue
    const key = normalizeTitle(m[1])
    if (key) out.add(key)
  }
  for (const m of body.matchAll(markdownLinkRegex())) {
    if (m.index !== undefined && inCode(m.index)) continue
    const named = targetTitle(m[2])
    if (named === null) continue
    const key = normalizeTitle(named)
    if (key) out.add(key)
  }
  return out
}

export function mentionsTitle(body: string, normalizedKey: string): boolean {
  return normalizedKey !== '' && extractMentions(body).has(normalizedKey)
}

/** A Link property holds a connection as its whole value, so the page it names is a reference
 *  like any in the body — a rename reaching only bodies would leave it pointing at nothing. */
export function frontmatterMentions(values: Record<string, unknown>): Set<string> {
  const out = new Set<string>()
  for (const value of Object.values(values)) {
    if (typeof value !== 'string') continue
    const target = readLink(value)
    if (target.kind === 'page') out.add(normalizeTitle(target.title))
  }
  return out
}
