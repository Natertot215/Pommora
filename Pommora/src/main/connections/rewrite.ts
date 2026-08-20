// Pure title rewrite: replace every reference to `oldTitle` — in any of the three body syntaxes
// that can name a page, and in the frontmatter values that name one — with `newTitle`. The
// rename-cascade primitive.

import {
  connectionText,
  normalizeTitle,
  pageEmbedPattern,
  pageEmbedText,
  pageLinkPattern,
  titleOf,
} from '@shared/connections'
import { encodeLinkTarget, markdownLinkRegex, targetNamesTitle } from '@shared/links'
import { linkNamesTitle, readLink } from '@shared/linkValue'
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
    (match, title: string, alias: string | undefined, offset: number) => {
      if (inCode(offset) || normalizeTitle(titleOf(title)) !== oldKey) return match
      // A table cell's pipe-escape is re-emitted exactly as it arrived: dropping it would write a
      // bare `|` into a cell and split the row into an extra column.
      // An empty alias segment drops rather than leaving a bare pipe, as it does in the editor.
      const pipe = alias ? `${title.endsWith('\\') ? '\\|' : '|'}${alias}` : ''
      return `[[${newTitle}${pipe}]]`
    },
  )
  // The embed pass sees POST-link-pass offsets — its mask must be built over the same string, or
  // any length-changing link rewrite above shifts every later offset off the original mask.
  const inCodeAfter = codeMask(afterLinks)
  const afterEmbeds = afterLinks.replace(
    pageEmbedPattern(),
    (match, title: string, offset: number) =>
      !inCodeAfter(offset) && normalizeTitle(title) === oldKey ? pageEmbedText(newTitle) : match,
  )
  // The markdown form last, over a mask rebuilt for the same reason. Only a target that NAMES a page
  // moves, so a URL whose last segment happens to match the renamed title is left exactly as written.
  const inCodeFinal = codeMask(afterEmbeds)
  return afterEmbeds.replace(
    markdownLinkRegex(),
    (match, label: string, target: string, offset: number) =>
      !inCodeFinal(offset) && targetNamesTitle(target, oldKey)
        ? `[${label}](${encodeLinkTarget(newTitle)})`
        : match,
  )
}

/** The frontmatter patch a rename needs: every property value naming `oldTitle` rewritten to name
 *  `newTitle`, keyed as the file holds them. Empty when the page's frontmatter names nothing — the
 *  cascade reads that as "no field write", so a page whose links are all in its body is written
 *  exactly as it was before. An alias rides through, as it does everywhere else. */
export function rewriteFrontmatterConnections(
  values: Record<string, unknown>,
  oldKey: string,
  newTitle: string,
): Record<string, string> {
  const patch: Record<string, string> = {}
  for (const [key, value] of Object.entries(values)) {
    if (typeof value === 'string' && linkNamesTitle(value, oldKey))
      patch[key] = connectionText(newTitle, readLink(value).alias)
  }
  return patch
}
