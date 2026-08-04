// Pure title rewrite over a body: replace every `[[oldTitle]]` (case-insensitive
// normalized match) with `[[newTitle]]`. The rename-cascade primitive.

import { normalizeTitle, pageEmbedPattern, pageLinkPattern } from '@shared/connections'
import { codeMask } from '@shared/markdownCode'

/** Rewrite every connection AND embed naming `oldTitle` (normalized) to `newTitle` — one sweep,
 *  two patterns, so a rename can't break a tile. Non-matching links and anything inside code stay
 *  untouched — a page documenting `[[Old Title]]` in a fenced block is showing a sample.
 *
 *  An alias rides through: a rename changes which page a connection points at, never the words the
 *  author chose to show for it. Pure (string → string). */
export function rewriteConnections(body: string, oldTitle: string, newTitle: string): string {
  const oldKey = normalizeTitle(oldTitle)
  const inCode = codeMask(body)
  const afterLinks = body.replace(
    pageLinkPattern(),
    (match, title: string, alias: string | undefined, offset: number) =>
      !inCode(offset) && normalizeTitle(title) === oldKey
        ? `[[${newTitle}${alias ? `|${alias}` : ''}]]`
        : match,
  )
  // The embed pass sees POST-link-pass offsets — its mask must be built over the same string, or
  // any length-changing link rewrite above shifts every later offset off the original mask.
  const inCodeAfter = codeMask(afterLinks)
  return afterLinks.replace(pageEmbedPattern(), (match, title: string, offset: number) =>
    !inCodeAfter(offset) && normalizeTitle(title) === oldKey ? `![[${newTitle}]]` : match,
  )
}
