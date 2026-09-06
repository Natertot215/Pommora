import {
  connectionText,
  normalizeTitle,
  pageEmbedPattern,
  pageEmbedText,
  pageLinkPattern,
  titleOf,
} from './connections'
import { encodeLinkTarget, markdownLinkRegex, targetNamesTitle } from './links'
import { linkNamesTitle, readLink } from './linkValue'
import { codeMask } from '../MarkdownPM/Engine/markdownCode'

/** Code stays untouched — a page documenting `[[Old Title]]` in a fenced block is showing a sample. An alias and a markdown link's label ride through. */
export function rewriteConnections(body: string, oldTitle: string, newTitle: string): string {
  const oldKey = normalizeTitle(oldTitle)
  const inCode = codeMask(body)
  const afterLinks = body.replace(
    pageLinkPattern(),
    (match, title: string, alias: string | undefined, offset: number) => {
      if (inCode(offset) || normalizeTitle(titleOf(title)) !== oldKey) return match
      // A table cell's pipe-escape is re-emitted exactly as it arrived: dropping it would write a bare `|` into a cell and split the row into an extra column.
      const pipe = alias ? `${title.endsWith('\\') ? '\\|' : '|'}${alias}` : ''
      return `[[${newTitle}${pipe}]]`
    },
  )
  // The embed pass sees POST-link-pass offsets — its mask must be built over the same string, or any length-changing link rewrite above shifts every later offset off the original mask.
  const inCodeAfter = codeMask(afterLinks)
  const afterEmbeds = afterLinks.replace(
    pageEmbedPattern(),
    (match, title: string, offset: number) =>
      !inCodeAfter(offset) && normalizeTitle(title) === oldKey ? pageEmbedText(newTitle) : match,
  )
  // Rebuilt for the same reason. Only a target that NAMES a page moves, so a URL whose last segment happens to match the renamed title is left as written.
  const inCodeFinal = codeMask(afterEmbeds)
  return afterEmbeds.replace(
    markdownLinkRegex(),
    (match, label: string, target: string, offset: number) =>
      !inCodeFinal(offset) && targetNamesTitle(target, oldKey)
        ? `[${label}](${encodeLinkTarget(newTitle)})`
        : match,
  )
}

/** Empty when the frontmatter names nothing — the cascade reads that as "no field write". */
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
