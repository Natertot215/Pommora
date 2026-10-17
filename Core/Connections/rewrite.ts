import {
  mayNameHeading,
  namesTarget,
  type PageName,
  pageLinkText,
  repeatsTarget,
  spellsAsWiki,
  targetSpan,
} from './connections'
import { normalizeTitle } from '../Paths/caseFold'
import { titleFromPath } from '../Paths/posix'
import { encodeLinkTarget, escapeLabel, fitsSlot, unescapeLabel } from './links'
import { applyEdits, type TextEdit } from '../MarkdownPM/Engine/markdownCode'
import { escapeCell } from '../MarkdownPM/Engine/Tables/codec'
import type { TableRegion } from '../MarkdownPM/Engine/Tables/regions'
import { scanDoc, spanAt } from '../MarkdownPM/Engine/docScan'
import { type LinkHit, linksIn } from './scan'
import { pageKey } from './pageIndex'

export type RenameChange = { title: string } | { heading: string; to: string }

/** Code stays untouched: a page documenting `[[Old Title]]` in a fenced block is showing a sample. Only the written name changes; shown text that only named it follows it, and shown text that comes to repeat the new target goes, as the writer drops one. */
export function rewriteConnections(body: string, oldTitle: string, newTitle: string): string {
  const oldKey = pageKey(oldTitle)
  const rewrite = follower(body)
  const edits: TextEdit[] = []
  for (const hit of linksIn(body))
    if (hit.target === oldKey) edits.push(...rewrite(hit, 'title', newTitle))
  return applyEdits(body, edits)
}

/** Shown text naming the old target follows it to the new one, by whichever part it named; anything else is a given name and stays. */
function carry(shown: string, from: PageName, to: PageName): string {
  switch (namesTarget(shown, from)) {
    case 'title':
      return titleFromPath(to.title)
    case 'heading':
      return to.heading!
    case 'both':
      return `${titleFromPath(to.title)}#${to.heading}`
    case null:
      return shown
  }
}

/** One rewrite per hit, for either arm, the hit's name as the index reads it and `part` replaced by `value`: the renamed part is edited in place (a table cell's `\|` rides through), shown text naming the old target follows it, shown text repeating the new target drops its pipe, and a wikilink whose new target it can't spell is rewritten whole through the one writer, which falls to the markdown form. Inside a table region every inserted text is escaped as the cell codec escapes, since a rename writes the row's source; the regions are read once, on the first hit. */
function follower(body: string) {
  let tables: TableRegion[] | undefined
  return (hit: LinkHit, part: 'title' | 'heading', value: string): TextEdit[] => {
    tables ??= scanDoc(body).tables
    const esc = spanAt(tables, hit.full[0]) ? escapeCell : (s: string) => s
    const markdown = hit.syntax === 'markdown'
    const from = hit.named
    const to = { ...from, [part]: value }
    const shownRaw = hit.shown ? body.slice(...hit.shown) : undefined
    const shown = shownRaw === undefined ? undefined : markdown ? unescapeLabel(shownRaw) : shownRaw
    const carried = shown === undefined ? undefined : carry(shown, from, to)
    const next = { title: to.title, heading: to.heading, shown: carried }
    if (hit.syntax === 'wiki' && !spellsAsWiki(next))
      return [{ from: hit.full[0], to: hit.full[1], insert: esc(pageLinkText(next, 'markdown')) }]
    const span = part === 'title' ? hit.title : hit.heading!
    const edits: TextEdit[] = [
      { from: span[0], to: span[1], insert: esc(markdown ? encodeLinkTarget(value) : value) },
    ]
    if (hit.shown && carried !== undefined) {
      if (!markdown && (carried === '' || repeatsTarget(carried, to.title, to.heading)))
        edits.push({ from: targetSpan(hit)[1], to: hit.shown[1], insert: '' })
      else if (carried !== shown)
        edits.push({
          from: hit.shown[0],
          to: hit.shown[1],
          insert: esc(markdown ? escapeLabel(fitsSlot(carried) ? carried : '') : carried),
        })
    }
    return edits
  }
}

/** Rewrites every link and bare run that names `oldHeading` on the page titled `title`; a bare fragment counts only when `ownTitle` is that page, and a `§` run only when `outline` (the page's headings around the rename) is given, so a longer heading the run names keeps it. */
export function rewriteHeadingConnections(
  body: string,
  title: string,
  oldHeading: string,
  newHeading: string,
  ownTitle = '',
  outline?: readonly string[],
): string {
  if (!mayNameHeading(body)) return body
  const titleKey = pageKey(title)
  const oldKey = normalizeTitle(oldHeading)
  const rewrite = follower(body)
  const edits: TextEdit[] = []
  for (const hit of linksIn(body, ownTitle, outline && [...outline, oldHeading]))
    if (hit.target === titleKey && hit.qualifier === oldKey && hit.heading)
      edits.push(...rewrite(hit, 'heading', newHeading))
  return applyEdits(body, edits)
}
