// Pure title rewrite over a body: replace every reference to `oldTitle` — in any of the three
// syntaxes that can name a page — with `newTitle`. The rename-cascade primitive.

import { normalizeTitle, pageEmbedPattern, pageLinkPattern } from '@shared/connections'
import { encodeLinkTarget, markdownLinkRegex, targetTitle } from '@shared/links'
import { codeMask } from '@shared/markdownCode'

/** Rewrite every connection, embed AND markdown link naming `oldTitle` (normalized) to `newTitle` —
 *  one sweep, three patterns, so a rename can't break a tile or a `[]()`. Non-matching links and
 *  anything inside code stay untouched — a page documenting `[[Old Title]]` in a fenced block is
 *  showing a sample.
 *
 *  An alias rides through, and so does a markdown link's label: a rename changes which page a link
 *  points at, never the words the author chose to show for it. Pure (string → string). */
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
  const afterEmbeds = afterLinks.replace(
    pageEmbedPattern(),
    (match, title: string, offset: number) =>
      !inCodeAfter(offset) && normalizeTitle(title) === oldKey ? `![[${newTitle}]]` : match,
  )
  // The markdown form last, over a mask rebuilt for the same reason. Only a target that NAMES a page
  // moves: `targetTitle` refuses anything with a scheme or a separator, so a URL whose last segment
  // happens to match the renamed title is left exactly as written.
  const inCodeFinal = codeMask(afterEmbeds)
  return afterEmbeds.replace(
    markdownLinkRegex(),
    (match, label: string, target: string, offset: number) => {
      const named = targetTitle(target)
      return !inCodeFinal(offset) && named !== null && normalizeTitle(named) === oldKey
        ? `[${label}](${encodeLinkTarget(newTitle)})`
        : match
    },
  )
}
