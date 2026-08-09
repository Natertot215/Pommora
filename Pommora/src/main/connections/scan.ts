// The rename cascade's prefilter. `[[ ]]` is the only connection syntax; `{{ }}` is excluded by
// the pattern and anything inside code is a sample. `![[ ]]` embeds are NOT connections, but the
// cascade still sweeps them so a rename reaches them without giving them a link-graph edge —
// which is why one predicate answers for both syntaxes. No I/O.

import { normalizeTitle, pageEmbedPattern, pageLinkPattern } from '@shared/connections'
import { codeMask } from '@shared/markdownCode'

/** The cascade's prefilter: does this body mention `title` as a connection OR an embed?
 *  Code-interior matches stay samples for both syntaxes. */
export function mentionsTitle(body: string, normalizedKey: string): boolean {
  const inCode = codeMask(body)
  for (const m of body.matchAll(pageLinkPattern())) {
    if (m.index !== undefined && inCode(m.index)) continue
    const key = normalizeTitle(m[1])
    if (key && key === normalizedKey) return true
  }
  for (const m of body.matchAll(pageEmbedPattern())) {
    if (m.index !== undefined && inCode(m.index)) continue
    if (normalizeTitle(m[1]) === normalizedKey) return true
  }
  return false
}
