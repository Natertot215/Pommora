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
  return body
    .replace(
      pageLinkPattern(),
      (match, title: string, alias: string | undefined, offset: number) =>
        !inCode(offset) && normalizeTitle(title) === oldKey
          ? `[[${newTitle}${alias ? `|${alias}` : ''}]]`
          : match,
    )
    .replace(pageEmbedPattern(), (match, title: string, offset: number) =>
      !inCode(offset) && normalizeTitle(title) === oldKey ? `![[${newTitle}]]` : match,
    )
}
