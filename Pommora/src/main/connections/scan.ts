// The rename cascade's prefilter. `[[ ]]` is the only connection syntax; `{{ }}` is excluded by
// the pattern and anything inside code is a sample. `![[ ]]` embeds are NOT connections, but the
// cascade still sweeps them so a rename reaches them without giving them a link-graph edge —
// which is why one predicate answers for both syntaxes. No I/O.

import { normalizeTitle, pageEmbedPattern, pageLinkPattern } from '@shared/connections'
import { markdownLinkRegex, targetNamesTitle } from '@shared/links'
import { codeMask } from '@shared/markdownCode'

/** The cascade's prefilter: does this body name `title` in any of the three syntaxes?
 *  Code-interior matches stay samples for all of them. */
export function mentionsTitle(body: string, normalizedKey: string): boolean {
  // The cascade reads every markdown file in the nexus, and this is a full parse with no cheap gate
  // in front of it. A body holding none of the three openers can't hold a reference. The gate is on
  // SYNTAX rather than the title itself: a substring test against the key would pass every test here
  // while breaking the NFC invariant normalizeTitle exists for, so an NFD-composed body would stop
  // matching the NFC title it names and a rename would skip it silently.
  if (!body.includes('[[') && !body.includes('](')) return false
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
  for (const m of body.matchAll(markdownLinkRegex())) {
    if (m.index !== undefined && inCode(m.index)) continue
    if (targetNamesTitle(m[2], normalizedKey)) return true
  }
  return false
}
