import { normalizeTitle } from '../Paths/caseFold'
import {
  defaultLabel,
  encodeLinkTarget,
  fitsSlot,
  markdownLink,
  markdownLinkRegex,
  namesPage,
} from './links'
import {
  type CodeMask,
  codeTouches,
  overlaps,
  type Span,
  trimmedRange,
} from '../MarkdownPM/Engine/markdownCode'

export const OPENER = /[#§]/

// Fresh per call so callers never share `lastIndex`. `]` is content unless it closes the pair; the 255 cap is load-bearing, since an unbounded run backtracks quadratically on an unclosed `[`-run. The page half stops at the first opener; the heading takes the rest up to the pipe.
export function pageLinkPattern(): RegExp {
  return /\[\[(?<page>(?:[^\]\r\n|#§]|\](?!\])){0,255})(?:[#§](?<heading>(?:[^\]\r\n|]|\](?!\])){0,255}))?(?:\|(?<alias>[^\]\r\n]{0,255}))?\]\]/dg
}

/** Whether `text` could hold a link of either syntax, by its openers alone: the gate every reader stands behind, so a text without one costs no match. */
export const mayHoldLink = (text: string): boolean => text.includes('[[') || text.includes('](')

/** Whether `text` could name a heading: a `#` inside either syntax's destination, or a `§`. */
export const mayNameHeading = (text: string): boolean => /\[\[[^\r\n]*#|\]\([^\r\n]*#|§/.test(text)

/** Whether `text` could name the document's own heading: a bare fragment in either syntax, or a `§`. */
export const mayNameOwnHeading = (text: string): boolean => /\[\[#|\]\(\s*#|§/.test(text)

export type LinkStatus = 'resolved' | 'phantom' | 'ambiguous'

/** One link of either syntax, its slots as spans into the text, the same fields in both arms: `title` is a wikilink's page half or a markdown destination up to a page-naming opener (the whole destination otherwise, trimmed), `heading` what follows that opener, and `shown` the alias or the label, which a markdown link always has. */
export type LinkOccurrence =
  | { syntax: 'wiki'; full: Span; title: Span; heading: Span | null; shown: Span | null }
  | { syntax: 'markdown'; full: Span; title: Span; heading: Span | null; shown: Span }

/** The three slots a caret can sit in. */
export type LinkPart = 'title' | 'heading' | 'shown'

/** What closes a link of each syntax. */
export const CLOSER: Record<LinkOccurrence['syntax'], string> = { wiki: ']]', markdown: ')' }

/** The destination as written, title through heading. */
export const targetSpan = (o: Pick<LinkOccurrence, 'title' | 'heading'>): Span => [
  o.title[0],
  (o.heading ?? o.title)[1],
]

export function mapSpans(o: LinkOccurrence, f: (s: Span) => Span): LinkOccurrence {
  if (o.syntax === 'markdown')
    return {
      ...o,
      full: f(o.full),
      title: f(o.title),
      heading: o.heading && f(o.heading),
      shown: f(o.shown),
    }
  return {
    ...o,
    full: f(o.full),
    title: f(o.title),
    heading: o.heading && f(o.heading),
    shown: o.shown && f(o.shown),
  }
}

function wikiSpans(m: RegExpMatchArray): LinkOccurrence | null {
  const at = m.index
  const g = m.indices?.groups
  if (at == null || !g?.page) return null
  const page = g.page
  const heading = g.heading ?? null
  if (page[1] === page[0] && heading === null) return null
  const alias = g.alias ?? null
  const unescaped = (r: Span): Span =>
    alias !== null && m[0][r[1] - 1 - at] === '\\' ? [r[0], r[1] - 1] : r
  return {
    syntax: 'wiki',
    full: [at, at + m[0].length],
    title: heading === null ? unescaped(page) : page,
    heading: heading === null ? null : unescaped(heading),
    shown: alias,
  }
}

// The destination splits at its first raw opener only when the half before names a page, so an address keeps one undivided title; it splits before decoding, so `%23` stays inside the title.
function markdownSpans(text: string, [full, label, dest]: [Span, Span, Span]): LinkOccurrence {
  const [from, to] = trimmedRange(text, dest[0], dest[1])
  let hash = from
  while (hash < to && !OPENER.test(text[hash])) hash++
  const splits = hash < to && namesPage(text.slice(from, hash))
  return {
    syntax: 'markdown',
    full,
    title: splits ? [from, hash] : [from, to],
    heading: splits ? [hash + 1, to] : null,
    shown: label,
  }
}

/** Every connection and markdown link in `text` that code doesn't touch, in start order, with empty slots kept. A markdown link overlapping a connection yields to it, so `[[Title]](target)` stays a connection trailed by literal parens, as Obsidian reads it. */
export function linkOccurrences(text: string, inCode: CodeMask): LinkOccurrence[] {
  const out: LinkOccurrence[] = []
  for (const m of text.matchAll(pageLinkPattern())) {
    const o = wikiSpans(m)
    if (o && !codeTouches(text, inCode, o.full)) out.push(o)
  }
  for (const m of text.matchAll(markdownLinkRegex())) {
    const spans = m.indices as [Span, Span, Span]
    const [full] = spans
    if (codeTouches(text, inCode, full)) continue
    if (!out.some((o) => o.syntax === 'wiki' && overlaps(o.full, full)))
      out.push(markdownSpans(text, spans))
  }
  return out.sort((a, b) => a.full[0] - b.full[0])
}

const NO_CODE: CodeMask = () => false

export function wholeLink(text: string): LinkOccurrence | null {
  return (
    linkOccurrences(text, NO_CODE).find((o) => o.full[0] === 0 && o.full[1] === text.length) ?? null
  )
}

/** A page named by title, and by heading where the link names one: the shape every rule and writer below takes. */
export type PageName = { title: string; heading?: string }

const spells = (text: string): boolean =>
  fitsSlot(text) && !text.includes('|') && !text.includes(']]') && !text.endsWith(']')

/** What the title slot can spell: `|` or an opener would open the next slot, and `]]` or a trailing `]` would close the link. */
export const expressibleInLink = (title: string): boolean => spells(title) && !OPENER.test(title)

/** What the alias slot can spell: anything but `]`. */
export const aliasSpells = (alias: string): boolean => fitsSlot(alias) && !alias.includes(']')

/** Whether a wikilink can spell every slot of a page link; every writer falls back to the markdown form otherwise. */
export const spellsAsWiki = (t: PageName & { shown?: string }): boolean =>
  expressibleInLink(t.title) &&
  (t.heading === undefined || (spells(t.heading) && !t.heading.includes('#'))) &&
  (t.shown === undefined || aliasSpells(t.shown))

/** The opener shown text spells `title` › `heading` with, where it only repeats that target. */
export const openerOf = (shown: string, title: string, heading: string): string | undefined =>
  ['#', '§'].find((o) => normalizeTitle(shown) === normalizeTitle(title + o + heading))

/** Whether shown text only repeats a target, `title` or `title` and `heading` at either opener, so the link draws the same without it: the one drop rule. */
export const repeatsTarget = (shown: string, title: string, heading?: string): boolean =>
  heading === undefined
    ? normalizeTitle(shown) === normalizeTitle(title)
    : openerOf(shown, title, heading) !== undefined

/** A name a page can hold as an alias: one the alias slot spells, not blank, and never the page's title itself. */
export const keepsAlias = (name: string, title: string): boolean =>
  name.trim() !== '' && aliasSpells(name) && !repeatsTarget(name, title)

/** Which part of its target shown text names, the title, the heading, or both, rather than giving it a name: what a rename carries along and what memory never keeps. `H` names the heading of `A#H` without repeating `A#H`, which is `repeatsTarget`'s question. */
export function namesTarget(shown: string, t: PageName): 'title' | 'heading' | 'both' | null {
  if (repeatsTarget(shown, t.title)) return 'title'
  if (t.heading === undefined) return null
  if (repeatsTarget(shown, t.heading)) return 'heading'
  return repeatsTarget(shown, t.title, t.heading) ? 'both' : null
}

/** The one writer of a page link: a wikilink where every slot spells, the markdown form otherwise, its label emptied where the grammar's label can't spell it so the draw gives it the default, so no writer leaves a slot unwritten or writes a link the grammar can't read back. A present-but-empty heading or alias spells its slot (`[[A#]]`, `[[A|]]`): the picker opens a slot by writing it. */
export function pageLinkText(
  t: PageName & { shown?: string },
  prefer: 'wiki' | 'markdown',
): string {
  const { title, heading, shown } = t
  if (prefer !== 'wiki' || !spellsAsWiki(t)) {
    const dest =
      encodeLinkTarget(title) + (heading === undefined ? '' : `#${encodeLinkTarget(heading)}`)
    const label = shown ?? defaultLabel(title, heading)
    return markdownLink(dest, fitsSlot(label) ? label : '')
  }
  const target = heading === undefined ? title : `${title}#${heading}`
  const named = shown !== undefined && (shown === '' || !repeatsTarget(shown, title, heading))
  return named ? `[[${target}|${shown}]]` : `[[${target}]]`
}

export function pageEmbedText(title: string): string {
  return `![[${title}]]`
}

/** A File value's reference, by file name alone: `wikiTitle` reads it and refuses the markdown form, so it never falls back as a page link does. */
export const fileLinkText = (name: string): string => `[[${name}]]`
