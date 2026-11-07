// One walker answers for every link syntax; `embed` marks a wikilink alone on its line behind a `!`, a tile's relation that renames as a link and relates as nothing. A link names its page by the written half's key; a page's own heading (`[[#H]]`, a `§` run) keys ''.

import { type LinkOccurrence, linkOccurrences, mayHoldLink, type PageName } from './connections'
import { normalizeTitle } from '../Paths/caseFold'
import { linkTexts, namedPage, readOccurrence } from './linkValue'
import { pageKey } from './pageIndex'
import {
  inlineCodeMask,
  type CodeMask,
  inUrlRun,
  isWordChar,
  lineEndAt,
  lineStartAt,
  type Span,
} from '../MarkdownPM/Engine/markdownCode'
import { headingParts, loneEmbedTitle } from '../MarkdownPM/Engine/detect'
import { type DocScan, inCodeAt, scanDoc, spanAt } from '../MarkdownPM/Engine/docScan'
import { cellLineText } from '../MarkdownPM/Engine/Tables/regions'

interface SectionRun {
  from: number
  to: number
  heading: string
}

// A blank title names nothing; a bare fragment names this page, whose key is '', and `[[#]]` names nothing at all.
const names = (target: string, written: string, qualifier: string): boolean =>
  written === '' ? qualifier !== '' : target !== ''

// A bare `§Heading` in prose: the longest outline heading the text after `§` begins with, ending at the run's end or a non-word character, so `§Overviewing` never links `Overview`. Runs inside code, a link, a bare address, or a heading line (whose `§` is the heading's own text) are never runs.
export function sectionRunsIn(
  text: string,
  headings: readonly string[],
  inCode: CodeMask,
): SectionRun[] {
  if (!text.includes('§') || headings.length === 0) return []
  const links = linkOccurrences(text, inCode).map((o) => o.full)
  const byLength = new Map<number, Map<string, string>>()
  for (const heading of headings) {
    const keys = byLength.get(heading.length) ?? new Map<string, string>()
    byLength.set(heading.length, keys.set(normalizeTitle(heading), heading))
  }
  const lengths = [...byLength.keys()].sort((a, b) => b - a)
  const out: SectionRun[] = []
  const onHeading = (i: number): boolean =>
    headingParts(text.slice(lineStartAt(text, i), lineEndAt(text, i))) !== null
  let link = 0
  for (let i = text.indexOf('§'); i !== -1; i = text.indexOf('§', i + 1)) {
    while (link < links.length && links[link][1] <= i) link++
    const inLink = link < links.length && links[link][0] <= i
    if (inLink || inCode(i) || onHeading(i) || inUrlRun(text, i)) continue
    for (const length of lengths) {
      const end = i + 1 + length
      if (end > text.length || (end < text.length && isWordChar(text[end]))) continue
      const heading = byLength.get(length)?.get(normalizeTitle(text.slice(i + 1, end)))
      if (heading === undefined) continue
      out.push({ from: i, to: end, heading })
      i = end - 1
      break
    }
  }
  return out
}

/** One occurrence the index and the rename rewriter share: the occurrence's spans under its names, `named` the page as the link reads it, `target` (the written half through `pageKey`, '' for the page's own heading) and `qualifier` (the heading's key, '' when the link names none) as normalized keys, `title` empty where the link names its own page by leaving it out, and `embed` for a wikilink alone on its line behind a `!`. */
export interface LinkHit {
  syntax: LinkOccurrence['syntax'] | 'section'
  embed: boolean
  named: PageName
  target: string
  qualifier: string
  full: Span
  title: Span
  heading: Span | null
  shown: Span | null
}

// The editor's lines never hold a `\r`, a body's CRLF lines do, so the line goes in without it.
const embedLine = (body: string, [from, to]: Span): boolean => {
  const line = body.slice(lineStartAt(body, from), lineEndAt(body, to))
  return loneEmbedTitle(line.replace(/\r$/, '')) !== null
}

/** What a text is read as: a page body, through its scan, or a value, which reads inline code alone and draws no embed, since only a page draws one. */
export type Reading = DocScan | 'value'

/** The gate in front is on SYNTAX rather than any title: a substring test would break the NFC invariant `normalizeTitle` exists for, and an NFD-composed body would be skipped silently. A page's scan is resolved inside the body, never as a default parameter: a generator binds its parameters at call time, so a default would scan the whole document even for the calls that return at the gate. A table row's `<br>` ends a line, as its cell draws one. */
export function* linksIn(
  body: string,
  outline: readonly string[] = [],
  reading?: Reading,
): Generator<LinkHit> {
  const runs = outline.length > 0 && body.includes('§')
  if (!mayHoldLink(body) && !runs) return
  const page = reading === 'value' ? null : (reading ?? scanDoc(body))
  const tables = page?.tables ?? []
  const text = cellLineText(body, tables)
  const inRow = (p: number): boolean => spanAt(tables, p) !== undefined
  const inline = inlineCodeMask(text)
  const mask: CodeMask = page ? (p) => (inRow(p) ? inline(p) : inCodeAt(page, p)) : inline
  for (const o of linkOccurrences(text, mask)) {
    const named = namedPage(readOccurrence(body, o))
    if (!named) continue
    const target = pageKey(named.title)
    const qualifier = normalizeTitle(named.heading ?? '')
    if (!names(target, named.title, qualifier)) continue
    const embed = page !== null && !inRow(o.full[0]) && embedLine(body, o.full)
    yield { ...o, embed, named, target, qualifier }
  }
  if (!runs) return
  for (const { from, to, heading } of sectionRunsIn(text, outline, mask))
    yield {
      syntax: 'section',
      embed: false,
      named: { title: '', heading },
      target: '',
      qualifier: normalizeTitle(heading),
      full: [from, to],
      title: [from, from],
      heading: [from + 1, to],
      shown: null,
    }
}

/** Every link inside every frontmatter value, each under the key it sits in, read as a value: a whole-value `[[Page]]` (an unquoted one yaml reads as a nested list included), a sentence holding links, and each member of a list alike. Which keys count is the reader's question, asked with the registry in hand. */
export function* valueLinks(
  values: Record<string, unknown>,
  outline: readonly string[] = [],
): Generator<LinkHit & { key: string }> {
  for (const [key, value] of Object.entries(values))
    for (const text of linkTexts(value))
      for (const hit of linksIn(text, outline, 'value')) yield { ...hit, key }
}
