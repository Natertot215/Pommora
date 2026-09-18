// `![[ ]]` embeds are NOT connections, but the cascade still sweeps them so a rename reaches them — one walker answers for every syntax, and `syntax` keeps them apart for a reader that cares.

import { normalizeTitle, pageEmbedPattern, pageLinkPattern, titleOf } from './connections'
import { markdownLinkRegex, targetFragment, targetTitle } from './links'
import { readLink } from './linkValue'
import { codeMask, type CodeMask } from '../MarkdownPM/Engine/markdownCode'
import { headingParts } from '../MarkdownPM/Engine/detect'

export interface SectionRun {
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
  sorted = false,
): SectionRun[] {
  if (!text.includes('§') || headings.length === 0) return []
  const links = [...text.matchAll(pageLinkPattern()), ...text.matchAll(markdownLinkRegex())].map(
    (m) => [m.index ?? 0, (m.index ?? 0) + m[0].length],
  )
  const byLength = sorted ? headings : [...headings].sort((a, b) => b.length - a.length)
  const out: SectionRun[] = []
  const onHeading = (i: number): boolean => {
    const from = text.lastIndexOf('\n', i) + 1
    const to = text.indexOf('\n', i)
    return headingParts(text.slice(from, to === -1 ? text.length : to)) !== null
  }
  for (let i = text.indexOf('§'); i !== -1; i = text.indexOf('§', i + 1)) {
    if (inCode(i) || onHeading(i) || links.some(([a, b]) => i >= a && i < b)) continue
    for (const heading of byLength) {
      const end = i + 1 + heading.length
      if (end > text.length) continue
      if (normalizeTitle(text.slice(i + 1, end)) !== normalizeTitle(heading)) continue
      if (end < text.length && wordChar.test(text[end])) continue
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
    if (target) yield { syntax: 'embed', target, qualifier: '', at }
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

export function mentionsTitle(body: string, normalizedKey: string): boolean {
  if (normalizedKey === '') return false
  for (const hit of linksIn(body)) if (hit.target === normalizedKey) return true
  return false
}

/** A Link property holds a connection as its whole value, so a rename reaching only bodies would leave it pointing at nothing. */
export function frontmatterMentions(values: Record<string, unknown>): Set<string> {
  const out = new Set<string>()
  for (const value of Object.values(values)) {
    if (typeof value !== 'string') continue
    const target = readLink(value)
    const key = target.kind === 'page' ? normalizeTitle(target.title) : ''
    if (key) out.add(key)
  }
  return out
}
