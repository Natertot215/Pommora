// `![[ ]]` embeds are NOT connections, but the cascade still sweeps them so a rename reaches them — one walker answers for every syntax, and `syntax` keeps them apart for a reader that cares.

import { pageEmbedPattern, pageLinkPattern, titleOf } from './connections'
import { normalizeTitle } from '../Paths/caseFold'
import { markdownLinkRegex, targetFragment, targetTitle } from './links'
import { linkEntry, readLink } from './linkValue'
import { codeMask, type CodeMask, lineEndAt, lineStartAt } from '../MarkdownPM/Engine/markdownCode'
import { headingParts } from '../MarkdownPM/Engine/detect'

interface SectionRun {
  from: number
  to: number
  heading: string
}

const wordChar = /[\p{L}\p{N}_]/u

function titleKey(raw: string | null, own: string): string {
  if (raw === null) return ''
  return raw === '' ? own : normalizeTitle(raw)
}

// A bare `§Heading` in prose: the longest outline heading the text after `§` begins with, ending at the run's end or a non-word character, so `§Overviewing` never links `Overview`. Runs inside code, a wikilink, a markdown link, or a heading line (whose `§` is the heading's own text) are never runs.
export function sectionRunsIn(
  text: string,
  headings: readonly string[],
  inCode: CodeMask,
): SectionRun[] {
  if (!text.includes('§') || headings.length === 0) return []
  const links = [...text.matchAll(pageLinkPattern()), ...text.matchAll(markdownLinkRegex())]
    .map((m) => [m.index ?? 0, (m.index ?? 0) + m[0].length])
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

/** One occurrence. `target` and `qualifier` are normalized keys; `qualifier` is '' when the link names no heading. `at` is the offset into `body`, which the indexer resolves to a line. */
export interface LinkHit {
  syntax: LinkSyntax
  target: string
  qualifier: string
  at: number
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
  for (const m of body.matchAll(pageLinkPattern())) {
    const g = m.groups
    const at = m.index
    if (!g || mask(at)) continue
    // `[[]]` matches with an empty page and no heading; it names nothing, and never the page itself.
    if (g.page === '' && !g.heading) continue
    // `titleOf` only where the page half ends the link: with a heading present a trailing backslash is the title's own, not a table cell's escaped pipe.
    const target = titleKey(g.heading === undefined ? titleOf(g.page) : g.page, own)
    if (!target) continue
    const qualifier = g.heading === undefined ? '' : normalizeTitle(titleOf(g.heading))
    yield { syntax: 'wiki', target, qualifier, at }
  }
  for (const m of body.matchAll(pageEmbedPattern())) {
    const at = m.index
    if (mask(at)) continue
    const target = titleKey(m.groups?.page ?? null, own)
    if (target)
      yield { syntax: 'embed', target, qualifier: normalizeTitle(m.groups?.heading ?? ''), at }
  }
  for (const m of body.matchAll(markdownLinkRegex())) {
    const at = m.index
    if (mask(at)) continue
    const target = titleKey(targetTitle(m[2]), own)
    if (!target) continue
    yield { syntax: 'markdown', target, qualifier: normalizeTitle(targetFragment(m[2])), at }
  }
  if (!runs || own === '') return
  for (const run of sectionRunsIn(body, outline, mask))
    yield { syntax: 'section', target: own, qualifier: normalizeTitle(run.heading), at: run.from }
}

/** A Link property holds a connection as its whole value, so a rename reaching only bodies would leave it pointing at nothing. */
export function frontmatterMentions(
  values: Record<string, unknown>,
  ownTitle = '',
): { target: string; qualifier: string }[] {
  const out = new Map<string, { target: string; qualifier: string }>()
  for (const value of Object.values(values)) {
    const entry = linkEntry(value, 2)
    const link = entry === null ? null : readLink(entry)
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
    if (typeof value !== 'string' || readLink(value).kind === 'page') continue
    yield* linksIn(value, ownTitle, outline)
  }
}
