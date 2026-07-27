// Pure title rewrite over a body: replace every `[[oldTitle]]` (case-insensitive
// normalized match) with `[[newTitle]]`. The rename-cascade primitive. Mirrors Swift's
// ConnectionRewriter (shares the pattern).

import { normalizeTitle, pageLinkPattern } from '@shared/connections'
import { codeMask } from '@shared/markdownCode'

/** Rewrite every connection to `oldTitle` (normalized) as a connection to `newTitle`. Non-matching
 *  links, `![[ ]]` embeds, and anything inside code are left untouched — a page documenting
 *  `[[Old Title]]` in a fenced block is showing a sample, not naming a page. Pure (string → string). */
export function rewriteConnections(body: string, oldTitle: string, newTitle: string): string {
  const oldKey = normalizeTitle(oldTitle)
  const inCode = codeMask(body)
  return body.replace(pageLinkPattern(), (match, title: string, offset: number) =>
    !inCode(offset) && normalizeTitle(title) === oldKey ? `[[${newTitle}]]` : match,
  )
}
