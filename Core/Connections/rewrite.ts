import { expressibleInLink, targetSpan } from './connections'
import { normalizeTitle } from '../Paths/caseFold'
import { encodeLinkTarget, escapeLabel, unescapeLabel } from './links'
import { applyEdits, type TextEdit } from '../MarkdownPM/Engine/markdownCode'
import { type LinkHit, linksIn } from './scan'

export type RenameChange = { title: string } | { heading: string; to: string }

/** Code stays untouched — a page documenting `[[Old Title]]` in a fenced block is showing a sample. Only the written page name changes, so a heading, a table cell's escaped pipe, and an alias or label giving a name ride through, and a link naming its own page by leaving the name out stays as written; an alias or label that only showed the old title shows the new one, and an empty alias, or one that would repeat the new target, goes. */
export function rewriteConnections(body: string, oldTitle: string, newTitle: string): string {
  const oldKey = normalizeTitle(oldTitle)
  const edits: TextEdit[] = []
  for (const hit of linksIn(body)) {
    const { syntax, target, title, heading, shown } = hit
    if (target !== oldKey) continue
    if (syntax === 'markdown') {
      edits.push({ from: title[0], to: title[1], insert: encodeLinkTarget(newTitle) })
      if (shown && shows(body, { syntax, shown }, oldKey))
        edits.push({ from: shown[0], to: shown[1], insert: escapeLabel(newTitle) })
      continue
    }
    edits.push({ from: title[0], to: title[1], insert: newTitle })
    if (!shown) continue
    const renamed = shows(body, { syntax, shown }, oldKey)
    const next = normalizeTitle(renamed ? newTitle : body.slice(shown[0], shown[1]))
    const named = heading ? `${newTitle}#${body.slice(heading[0], heading[1])}` : newTitle
    if (!next || next === normalizeTitle(named))
      edits.push({ from: targetSpan(hit)[1], to: shown[1], insert: '' })
    else if (renamed) edits.push({ from: shown[0], to: shown[1], insert: newTitle })
  }
  return applyEdits(body, edits)
}

// Whether a link's shown text only named the target being renamed, as a picked link's default label does, so it is renamed with it.
function shows(
  body: string,
  { syntax, shown }: Pick<LinkHit, 'syntax' | 'shown'>,
  key: string,
): boolean {
  if (!shown) return false
  const text = body.slice(shown[0], shown[1])
  return normalizeTitle(syntax === 'markdown' ? unescapeLabel(text) : text) === key
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
  const wiki = expressibleInLink(newHeading)
  const edits: TextEdit[] = []
  for (const hit of linksIn(body, ownTitle, outline && [...outline, oldHeading])) {
    if (hit.target !== titleKey || hit.qualifier !== oldKey || !hit.heading) continue
    const [from, to] = hit.heading
    const markdown = hit.syntax === 'markdown'
    if (!markdown && hit.syntax !== 'section' && !wiki) continue
    edits.push({ from, to, insert: markdown ? encodeLinkTarget(newHeading) : newHeading })
    if (hit.shown && shows(body, hit, oldKey))
      edits.push({
        from: hit.shown[0],
        to: hit.shown[1],
        insert: markdown ? escapeLabel(newHeading) : newHeading,
      })
  }
  return applyEdits(body, edits)
}
