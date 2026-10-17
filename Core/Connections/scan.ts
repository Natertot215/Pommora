// One walker answers for every link syntax; `embed` marks a link of either syntax alone on its line behind a `!`, a tile's relation that renames as a link and relates as nothing.

import { type LinkOccurrence, linkOccurrences, mayHoldLink, type PageName } from './connections'
import { normalizeTitle } from '../Paths/caseFold'
import { linkEntry, namedPage, readOccurrence } from './linkValue'
import {
  codeMask,
  type CodeMask,
  inUrlRun,
  lineEndAt,
  lineStartAt,
  type Span,
} from '../MarkdownPM/Engine/markdownCode'
import { headingParts } from '../MarkdownPM/Engine/detect'

interface SectionRun {
  from: number
  to: number
  heading: string
}

const wordChar = /[\p{L}\p{N}_]/u

const titleKey = (raw: string, own: string): string => (raw === '' ? own : normalizeTitle(raw))

// A blank title names nothing; a bare fragment names this page, whose key is '' when no title is given, and `[[#]]` names nothing at all.
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
      if (end > text.length || (end < text.length && wordChar.test(text[end]))) continue
      const heading = byLength.get(length)?.get(normalizeTitle(text.slice(i + 1, end)))
      if (heading === undefined) continue
      out.push({ from: i, to: end, heading })
      i = end - 1
      break
    }
  }
  return out
}

/** One occurrence the index and the rename rewriter share: the occurrence's spans under its names, `named` the page as the link reads it, `target` and `qualifier` as normalized keys (`qualifier` is '' when the link names no heading), `title` empty where the link names its own page by leaving it out, and `embed` for a link alone on its line behind a `!`. */
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

const embedLine = (body: string, [from, to]: Span): boolean =>
  body[from - 1] === '!' &&
  lineStartAt(body, from) === from - 1 &&
  !/\S/.test(body.slice(to, lineEndAt(body, to)))

/** The gate in front is on SYNTAX rather than any title: a substring test would break the NFC invariant `normalizeTitle` exists for, and an NFD-composed body would be skipped silently. `inCode` is resolved inside the body, never as a default parameter: a generator binds its parameters at call time, so a default would build a whole-document mask even for the calls that return at the gate. */
export function* linksIn(
  body: string,
  ownTitle = '',
  outline: readonly string[] = [],
  inCode?: CodeMask,
): Generator<LinkHit> {
  const runs = outline.length > 0 && body.includes('§')
  if (!mayHoldLink(body) && !runs) return
  const mask = inCode ?? codeMask(body)
  const own = normalizeTitle(ownTitle)
  for (const o of linkOccurrences(body, mask)) {
    const named = namedPage(readOccurrence(body, o))
    if (!named) continue
    const target = titleKey(named.title, own)
    const qualifier = normalizeTitle(named.heading ?? '')
    if (!names(target, named.title, qualifier)) continue
    yield { ...o, embed: embedLine(body, o.full), named, target, qualifier }
  }
  if (!runs) return
  for (const { from, to, heading } of sectionRunsIn(body, outline, mask))
    yield {
      syntax: 'section',
      embed: false,
      named: { title: '', heading },
      target: own,
      qualifier: normalizeTitle(heading),
      full: [from, to],
      title: [from, from],
      heading: [from + 1, to],
      shown: null,
    }
}

/** Every link inside every frontmatter value, each under the key it sits in, read as a small body is: a whole-value `[[Page]]` (an unquoted one yaml reads as a nested list included) and a sentence holding links alike. Which keys count is the reader's question, asked with the registry in hand. */
export function* valueLinks(
  values: Record<string, unknown>,
  ownTitle = '',
  outline: readonly string[] = [],
): Generator<LinkHit & { key: string }> {
  for (const [key, value] of Object.entries(values)) {
    const text = linkEntry(value, 2)
    if (text === null) continue
    for (const hit of linksIn(text, ownTitle, outline)) yield { ...hit, key }
  }
}
