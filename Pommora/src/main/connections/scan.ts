// The rename cascade's prefilter. `[[ ]]` is the only connection syntax; `{{ }}` is excluded by
// the pattern and anything inside code is a sample. `![[ ]]` embeds are NOT connections, but the
// cascade still sweeps them so a rename reaches them without giving them a link-graph edge —
// which is why one predicate answers for both syntaxes. No I/O.

import { normalizeTitle, pageEmbedPattern, pageLinkPattern, titleOf } from '@shared/connections'
import { markdownLinkRegex, targetTitle } from '@shared/links'
import { codeMask } from '@shared/markdownCode'

/** Every normalized title this body names in any of the three syntaxes — the one parse the
 *  content index seeds from and the cascade's prefilter answers through, so a title the index
 *  recorded is exactly one the prefilter would affirm. The gate in front is on SYNTAX rather
 *  than any title: a substring test would break the NFC invariant normalizeTitle exists for, so
 *  an NFD-composed body would stop matching the NFC title it names and a rename would skip it
 *  silently. Code-interior matches stay samples for all three syntaxes. */
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

/** The cascade's prefilter: does this body name `title` in any of the three syntaxes? */
export function mentionsTitle(body: string, normalizedKey: string): boolean {
  return normalizedKey !== '' && extractMentions(body).has(normalizedKey)
}
