// The rename cascade's prefilter. `[[ ]]` is the only connection syntax; anything inside code is
// a sample. `![[ ]]` embeds are NOT connections, but the cascade still sweeps them so a rename
// reaches them without giving them a link-graph edge — one predicate answers for both syntaxes.

import { normalizeTitle, pageEmbedPattern, pageLinkPattern, titleOf } from '@shared/connections'
import { markdownLinkRegex, targetTitle } from '@shared/links'
import { readLink } from '@shared/linkValue'
import { codeMask } from '@shared/markdownCode'

/** Every normalized title this body names in any of the three syntaxes — the one parse the
 *  content index seeds from and the cascade's prefilter answers through, so a title the index
 *  recorded is exactly one the prefilter would affirm. The gate in front is on SYNTAX rather
 *  than any title: a substring test would break the NFC invariant normalizeTitle exists for, so
 *  an NFD-composed body would stop matching the NFC title it names and a rename would skip it
 *  silently. */
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

/** Every normalized title a page's FRONTMATTER names. A Link property holds a connection as its
 *  whole value, so the page it names is a reference like any in the body — and a rename reaching
 *  only bodies would leave it pointing at a name nothing answers to. */
export function frontmatterMentions(values: Record<string, unknown>): Set<string> {
  const out = new Set<string>()
  for (const value of Object.values(values)) {
    if (typeof value !== 'string') continue
    const target = readLink(value)
    if (target.kind === 'page') out.add(normalizeTitle(target.title))
  }
  return out
}
