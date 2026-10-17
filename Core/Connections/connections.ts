import { normalizeTitle } from '../Paths/caseFold'
import { titleFromPath } from '../Paths/posix'
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

// Fresh per call so callers never share `lastIndex`. `]` is content unless it closes the pair; the 255 cap is load-bearing, since an unbounded run backtracks quadratically on an unclosed `[`-run. The page half stops at the first `#`; the heading takes the rest up to the pipe.
export function pageLinkPattern(): RegExp {
  return /\[\[(?<page>(?:[^\]\r\n|#]|\](?!\])){0,255})(?:#(?<heading>(?:[^\]\r\n|]|\](?!\])){0,255}))?(?:\|(?<alias>[^\]\r\n]{0,255}))?\]\]/dg
}

/** Whether `text` could hold a link of either syntax, by its openers alone: the gate every reader stands behind, so a text without one costs no match. */
export const mayHoldLink = (text: string): boolean => text.includes('[[') || text.includes('](')

/** Whether `text` could name a heading: a `#` inside either syntax's destination, or a `§` run. */
export const mayNameHeading = (text: string): boolean => /\[\[[^\r\n]*#|\]\([^\r\n]*#|§/.test(text)

/** Whether `text` could name the document's own heading: a bare fragment in either syntax, or a `§` run. */
export const mayNameOwnHeading = (text: string): boolean => /\[\[#|\]\(\s*#|§/.test(text)

export type LinkStatus = 'resolved' | 'phantom' | 'ambiguous'

/** One link of either syntax, its slots as spans into the text, the same fields in both arms: `title` is a wikilink's page half or a markdown destination up to a page-naming `#` (the whole destination otherwise, trimmed), `heading` what follows that `#`, and `shown` the alias or the label, which a markdown link always has. */
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

// The destination splits at its first raw `#` only when the half before names a page, so an address keeps one undivided destination; it splits before decoding, so `%23` stays inside the title.
function markdownSpans(text: string, [full, label, dest]: [Span, Span, Span]): LinkOccurrence {
  const [from, to] = trimmedRange(text, dest[0], dest[1])
  let hash = from
  while (hash < to && text[hash] !== '#') hash++
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

/** A page named by its written page half (a title, or a path from the Nexus root or any tail of one ending in the title), and by heading where the link names one: the shape every rule and writer below takes. */
export type PageName = { title: string; heading?: string }

/** What the title or heading slot can spell: `|` and `#` would open the next slot, and `]]` or a trailing `]` would close the link. */
export const expressibleInLink = (text: string): boolean =>
  fitsSlot(text) && !/[|#]/.test(text) && !text.includes(']]') && !text.endsWith(']')

/** What the alias slot can spell: anything but `]`. */
export const aliasSpells = (alias: string): boolean => fitsSlot(alias) && !alias.includes(']')

/** Whether a wikilink can spell every slot of a page link; every writer falls back to the markdown form otherwise. */
export const spellsAsWiki = (t: PageName & { shown?: string }): boolean =>
  expressibleInLink(t.title) &&
  (t.heading === undefined || expressibleInLink(t.heading)) &&
  (t.shown === undefined || aliasSpells(t.shown))

/** Whether shown text only repeats a target, `title` or `title#heading`, so the link draws the same without it: the one drop rule. The whole written half is compared, so a path link's title alias (`[[A/Notes|Notes]]`, which Obsidian writes, since it shows the path otherwise) is kept rather than dropped. */
export const repeatsTarget = (shown: string, title: string, heading?: string): boolean =>
  normalizeTitle(shown) === normalizeTitle(heading === undefined ? title : `${title}#${heading}`)

/** A name a page can hold as an alias: one the alias slot spells, not blank, and never the page's title itself. */
export const keepsAlias = (name: string, title: string): boolean =>
  name.trim() !== '' && aliasSpells(name) && !repeatsTarget(name, title)

/** Which part of its target shown text names, the title (its basename, whatever path spells it), the heading, or both, rather than giving it a name: what a rename carries along and what memory never keeps. `H` names the heading of `A#H` without repeating `A#H`, which is `repeatsTarget`'s question. */
export function namesTarget(shown: string, t: PageName): 'title' | 'heading' | 'both' | null {
  const names = (heading?: string): boolean =>
    repeatsTarget(shown, titleFromPath(t.title), heading) || repeatsTarget(shown, t.title, heading)
  if (names()) return 'title'
  if (t.heading === undefined) return null
  if (normalizeTitle(shown) === normalizeTitle(t.heading)) return 'heading'
  return names(t.heading) ? 'both' : null
}

/** The one writer of a page link: a wikilink where every slot spells, the markdown form otherwise, its label emptied where the grammar's label can't spell it so the draw gives it the default, so no writer leaves a slot unwritten or writes a link the grammar can't read back. A present-but-empty heading or alias spells its slot (`[[A#]]`, `[[A|]]`): the picker opens a slot by writing it. A wikilink spelling a path with no heading and no shown text of its own carries its title as its alias, as Obsidian's writer does, so the link shows the title in every reader. */
export function pageLinkText(
  t: PageName & { shown?: string; embed?: boolean },
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
  const given =
    shown !== undefined && (shown === '' || !repeatsTarget(shown, title, heading))
      ? shown
      : undefined
  const alias =
    given ?? (carriesTitleAlias({ ...t, shown: given }) ? titleFromPath(title) : undefined)
  return alias === undefined ? `[[${target}]]` : `[[${target}|${alias}]]`
}

/** Whether a wikilink to `t` carries the page's title as its alias: a path with no heading and no shown text, so a reader that doesn't understand paths still reads the title, as Obsidian's writer does since 1.3. The one statement of the rule; the writer asks it, and an embed never does. */
export const carriesTitleAlias = (t: PageName & { shown?: string; embed?: boolean }): boolean =>
  !t.embed && t.shown === undefined && t.heading === undefined && t.title.includes('/')

export function pageEmbedText(title: string): string {
  return `![[${title}]]`
}

/** A File value's reference, by file name alone: `wikiTitle` reads it and refuses the markdown form, so it never falls back as a page link does. */
export const fileLinkText = (name: string): string => `[[${name}]]`
