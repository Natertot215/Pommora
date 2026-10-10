// One walker answers for every link syntax, and `syntax` keeps them apart for a reader that cares: a connection alone on its line behind a `!` is an embed, a tile's relation rather than a body link.

import { linkOccurrences } from './connections'
import { normalizeTitle } from '../Paths/caseFold'
import { targetFragment, targetTitle } from './links'
import { readLinkText, wholeValueLink } from './linkValue'
import {
  codeMask,
  type CodeMask,
  lineEndAt,
  lineStartAt,
  trimmedRange,
} from '../MarkdownPM/Engine/markdownCode'
import { headingParts, loneEmbedTitle } from '../MarkdownPM/Engine/detect'

type Span = [number, number]

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

// A bare `§Heading` in prose: the longest outline heading the text after `§` begins with, ending at the run's end or a non-word character, so `§Overviewing` never links `Overview`. Runs inside code, a wikilink, a markdown link, or a heading line (whose `§` is the heading's own text) are never runs.
export function sectionRunsIn(
  text: string,
  headings: readonly string[],
  inCode: CodeMask,
): SectionRun[] {
  if (!text.includes('§') || headings.length === 0) return []
  const links = linkOccurrences(text, inCode)
    .map((o) => o.full)
    .sort((a, b) => a[0] - b[0])
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
    if (inCode(i) || onHeading(i) || (link < links.length && links[link][0] <= i)) continue
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

export type LinkSyntax = 'wiki' | 'embed' | 'markdown' | 'section'

/** One occurrence. `target` and `qualifier` are normalized keys; `qualifier` is '' when the link names no heading. `at` is the offset into `body`, which the indexer resolves to a line. `title` is the page name as written, empty where the link names its own page by leaving it out; `heading` and a connection's `alias` are as written. */
export interface LinkHit {
  syntax: LinkSyntax
  target: string
  qualifier: string
  at: number
  title: Span
  heading: Span | null
  alias: Span | null
}

const loneEmbed = (body: string, at: number): boolean =>
  body[at - 1] === '!' &&
  lineStartAt(body, at) === at - 1 &&
  loneEmbedTitle(body.slice(at - 1, lineEndAt(body, at))) !== null

// A markdown destination's page half and fragment, trimmed: a rename edits them in place.
function destinationHalves(body: string, [from, to]: Span): [Span, Span | null] {
  const [start, end] = trimmedRange(body, from, to)
  const hash = start + body.slice(start, end).indexOf('#')
  return hash < start
    ? [[start, end], null]
    : [
        [start, hash],
        [hash + 1, end],
      ]
}

/** The gate in front is on SYNTAX rather than any title: a substring test would break the NFC invariant `normalizeTitle` exists for, and an NFD-composed body would be skipped silently. `inCode` is resolved inside the body, never as a default parameter: a generator binds its parameters at call time, so a default would build a whole-document mask even for the calls that return at the gate. */
export function* linksIn(
  body: string,
  ownTitle = '',
  outline: readonly string[] = [],
  inCode?: CodeMask,
): Generator<LinkHit> {
  const runs = outline.length > 0 && body.includes('§')
  if (!body.includes('[[') && !body.includes('](') && !runs) return
  const mask = inCode ?? codeMask(body)
  const own = normalizeTitle(ownTitle)
  const read = (s: Span): string => body.slice(s[0], s[1])
  for (const o of linkOccurrences(body, mask)) {
    const at = o.full[0]
    if (o.syntax === 'wiki') {
      const written = read(o.title)
      const target = titleKey(written, own)
      const qualifier = o.heading ? normalizeTitle(read(o.heading)) : ''
      if (!names(target, written, qualifier)) continue
      const syntax = loneEmbed(body, at) ? 'embed' : 'wiki'
      yield { syntax, target, qualifier, at, title: o.title, heading: o.heading, alias: o.alias }
      continue
    }
    const dest = read(o.destination)
    const written = targetTitle(dest)
    if (written === null) continue
    const target = titleKey(written, own)
    const qualifier = normalizeTitle(targetFragment(dest))
    if (!names(target, written, qualifier)) continue
    const [title, heading] = destinationHalves(body, o.destination)
    yield { syntax: 'markdown', target, qualifier, at, title, heading, alias: null }
  }
  if (!runs) return
  for (const { from, to, heading } of sectionRunsIn(body, outline, mask))
    yield {
      syntax: 'section',
      target: own,
      qualifier: normalizeTitle(heading),
      at: from,
      title: [from, from],
      heading: [from + 1, to],
      alias: null,
    }
}

/** A Link property holds a connection as its whole value, so a rename reaching only bodies would leave it pointing at nothing. */
export function frontmatterMentions(
  values: Record<string, unknown>,
  ownTitle = '',
): { target: string; qualifier: string }[] {
  const out = new Map<string, { target: string; qualifier: string }>()
  for (const value of Object.values(values)) {
    const link = wholeValueLink(value)
    if (link?.kind !== 'page') continue
    const target = titleKey(link.title, normalizeTitle(ownTitle))
    const qualifier = normalizeTitle(link.heading ?? '')
    if (target) out.set(`${target}\0${qualifier}`, { target, qualifier })
  }
  return [...out.values()]
}

/** The links inside every string value that isn't one whole connection — a sentence under any key, registered or not, read as a body is; the whole-value ones are `frontmatterMentions`'. */
export function* valueLinks(
  values: Record<string, unknown>,
  ownTitle = '',
  outline: readonly string[] = [],
): Generator<LinkHit> {
  for (const value of Object.values(values)) {
    if (typeof value !== 'string' || readLinkText(value)?.kind === 'page') continue
    yield* linksIn(value, ownTitle, outline)
  }
}
