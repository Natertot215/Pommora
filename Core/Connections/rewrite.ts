import {
  carriesTitleAlias,
  mayNameHeading,
  namesTarget,
  type PageName,
  pageLinkText,
  repeatsTarget,
  spellsAsWiki,
  targetSpan,
} from './connections'
import { normalizeTitle } from '../Paths/caseFold'
import { stripMarkdownExt, titleFromPath } from '../Paths/posix'
import { encodeLinkTarget, escapeLabel, fitsSlot, unescapeLabel } from './links'
import { applyEdits, type TextEdit } from '../MarkdownPM/Engine/markdownCode'
import { escapeCell } from '../MarkdownPM/Engine/Tables/codec'
import type { TableRegion } from '../MarkdownPM/Engine/Tables/regions'
import { scanDoc, spanAt } from '../MarkdownPM/Engine/docScan'
import { type LinkHit, linksIn } from './scan'
import { type ConnPage, type PageIndex, pathKeys } from './pageIndex'

/** The one re-spell's map: every key that named a moved page in the index before, and every key that named one other page alone before which a tail of an arriving page's path now spells (a collision), mapped to how it spells that page in the index after; a key the page still answers at an unchanged tail is left out. */
export function respellings(
  before: PageIndex,
  after: PageIndex,
  moved: readonly string[],
  arriving: readonly string[],
): Map<string, string> {
  const examined = new Map<string, ConnPage>()
  for (const id of moved) {
    const p = before.byId.get(id)
    if (p) examined.set(id, p)
  }
  for (const id of arriving)
    for (const k of pathKeys(after.byId.get(id)?.path ?? '')) {
      const y = before.resolve(k).page
      if (y && y.id !== id) examined.set(y.id, y)
    }
  const names = new Map<string, string>()
  for (const p of examined.values()) {
    const q = after.byId.get(p.id)
    if (!q) continue
    for (const k of before.namesOf(p.path)) {
      const next = after.respell(k, q, p.path)
      if (next !== null) names.set(k, next)
    }
  }
  return names
}

/** Code stays untouched: a page documenting `[[Old Title]]` in a fenced block is showing a sample. Only the written name changes, to what `names` maps its key to, and one differing from that by its `.md` alone is left as written, since the extension is read and never written; shown text that only named it follows it, and shown text that comes to repeat the new target goes, as the writer drops one. */
export function rewriteConnections(body: string, names: ReadonlyMap<string, string>): string {
  const rewrite = follower(body)
  const edits: TextEdit[] = []
  for (const hit of linksIn(body)) {
    const next = names.get(hit.target)
    if (next !== undefined && next !== stripMarkdownExt(hit.named.title))
      edits.push(...rewrite(hit, 'title', next))
  }
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

/** One rewrite per hit, for either arm, the hit's name as the index reads it and `part` replaced by `value`: the renamed part is edited in place (a table cell's `\|` rides through), shown text naming the old target follows it, shown text repeating the new target drops its pipe, and a wikilink whose new target it can't spell, or which gains a path and with it the title alias the writer gives one, is rewritten whole through the one writer, which falls to the markdown form where it must. Inside a table region every inserted text is escaped as the cell codec escapes, since a rename writes the row's source; the regions are read once, on the first hit. */
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
    if (
      hit.syntax === 'wiki' &&
      (!spellsAsWiki(next) || carriesTitleAlias({ ...next, embed: hit.embed }))
    )
      return [{ from: hit.full[0], to: hit.full[1], insert: esc(pageLinkText(next, 'wiki')) }]
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

/** Rewrites every link and bare run that names `oldHeading` on the page `keys` name; a bare fragment counts only in that page's own body (`own`), and a `§` run only when `outline` (the page's headings around the rename) is given, so a longer heading the run names keeps it. */
export function rewriteHeadingConnections(
  body: string,
  keys: ReadonlySet<string>,
  oldHeading: string,
  newHeading: string,
  own: boolean,
  outline?: readonly string[],
): string {
  if (!mayNameHeading(body)) return body
  const oldKey = normalizeTitle(oldHeading)
  const rewrite = follower(body)
  const edits: TextEdit[] = []
  for (const hit of linksIn(body, outline && [...outline, oldHeading]))
    if ((hit.target === '' ? own : keys.has(hit.target)) && hit.qualifier === oldKey && hit.heading)
      edits.push(...rewrite(hit, 'heading', newHeading))
  return applyEdits(body, edits)
}
