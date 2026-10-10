import { expressibleHeading } from './connections'
import { normalizeTitle } from '../Paths/caseFold'
import { encodeLinkTarget } from './links'
import { applyEdits, type TextEdit } from '../MarkdownPM/Engine/markdownCode'
import { linksIn } from './scan'

export type RenameChange = { title: string } | { heading: string; to: string }

/** Code stays untouched — a page documenting `[[Old Title]]` in a fenced block is showing a sample. Only the written page name changes, so a heading, an alias, a label, and a table cell's escaped pipe ride through, and a link naming its own page by leaving the name out stays as written; an empty alias, or one that would repeat the new target, goes, as `connectionText` drops one. */
export function rewriteConnections(body: string, oldTitle: string, newTitle: string): string {
  const oldKey = normalizeTitle(oldTitle)
  const edits: TextEdit[] = []
  for (const { syntax, target, title, heading, alias } of linksIn(body)) {
    if (target !== oldKey) continue
    const insert = syntax === 'markdown' ? encodeLinkTarget(newTitle) : newTitle
    edits.push({ from: title[0], to: title[1], insert })
    const named = heading ? `${newTitle}#${body.slice(heading[0], heading[1])}` : newTitle
    const shown = alias && normalizeTitle(body.slice(alias[0], alias[1]))
    if (alias && (!shown || shown === normalizeTitle(named)))
      edits.push({ from: (heading ?? title)[1], to: alias[1], insert: '' })
  }
  return applyEdits(body, edits)
}

const HEADING_REFERENCE = /\[\[[^\r\n]*#|\]\([^\r\n]*#|§/

/** Rewrites every link and bare run that names `oldHeading` on the page titled `title`; a bare fragment counts only when `ownTitle` is that page, and a `§` run only when `outline` (the page's headings around the rename) is given, so a longer heading the run names keeps it. A heading the wikilink grammar can't write is never written into one. */
export function rewriteHeadingConnections(
  body: string,
  title: string,
  oldHeading: string,
  newHeading: string,
  ownTitle = '',
  outline?: readonly string[],
): string {
  if (!HEADING_REFERENCE.test(body)) return body
  const titleKey = normalizeTitle(title)
  const oldKey = normalizeTitle(oldHeading)
  const wiki = expressibleHeading(newHeading)
  const edits: TextEdit[] = []
  for (const hit of linksIn(body, ownTitle, outline && [...outline, oldHeading])) {
    if (hit.target !== titleKey || hit.qualifier !== oldKey || !hit.heading) continue
    const [from, to] = hit.heading
    if (hit.syntax === 'markdown') edits.push({ from, to, insert: encodeLinkTarget(newHeading) })
    else if (hit.syntax === 'section' || wiki) edits.push({ from, to, insert: newHeading })
  }
  return applyEdits(body, edits)
}
