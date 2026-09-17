// `![[ ]]` embeds are NOT connections, but the cascade still sweeps them so a rename reaches them without giving them a link-graph edge — one predicate answers for both syntaxes.

import { normalizeTitle, pageEmbedPattern, pageLinkPattern, titleOf } from './connections'
import { markdownLinkRegex, targetFragment, targetTitle } from './links'
import { readLink } from './linkValue'
import { codeMask, type CodeMask } from '../MarkdownPM/Engine/markdownCode'

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

// A bare `§Heading` in prose: the longest outline heading the text after `§` begins with, ending at the run's end or a non-word character, so `§Overviewing` never links `Overview`. Runs inside code or inside a wikilink are never runs.
export function sectionRunsIn(
  text: string,
  headings: readonly string[],
  inCode: CodeMask,
  sorted = false,
): SectionRun[] {
  if (!text.includes('§') || headings.length === 0) return []
  const links = [...text.matchAll(pageLinkPattern())].map((m) => [
    m.index ?? 0,
    (m.index ?? 0) + m[0].length,
  ])
  const byLength = sorted ? headings : [...headings].sort((a, b) => b.length - a.length)
  const out: SectionRun[] = []
  for (let i = text.indexOf('§'); i !== -1; i = text.indexOf('§', i + 1)) {
    if (inCode(i) || links.some(([a, b]) => i >= a && i < b)) continue
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

/** The gate in front is on SYNTAX rather than any title: a substring test would break the NFC invariant `normalizeTitle` exists for, and an NFD-composed body would be skipped silently. */
export function extractMentions(body: string, ownTitle = ''): Set<string> {
  const out = new Set<string>()
  if (!body.includes('[[') && !body.includes('](')) return out
  const inCode = codeMask(body)
  const own = normalizeTitle(ownTitle)
  const add = (raw: string | null): void => {
    const key = titleKey(raw, own)
    if (key) out.add(key)
  }
  for (const m of body.matchAll(pageLinkPattern())) {
    const g = m.groups
    if (!g || (m.index !== undefined && inCode(m.index))) continue
    // `[[]]` matches with an empty page and no heading; it names nothing, and never the page itself.
    if (g.page === '' && !g.heading) continue
    add(g.heading === undefined ? titleOf(g.page) : g.page)
  }
  for (const m of body.matchAll(pageEmbedPattern())) {
    if (m.index !== undefined && inCode(m.index)) continue
    add(m.groups?.page ?? null)
  }
  for (const m of body.matchAll(markdownLinkRegex())) {
    if (m.index !== undefined && inCode(m.index)) continue
    add(targetTitle(m[2]))
  }
  return out
}

export function mentionsTitle(body: string, normalizedKey: string): boolean {
  return normalizedKey !== '' && extractMentions(body).has(normalizedKey)
}

export interface HeadingMention {
  title: string
  heading: string
}

/** Every link that names a heading, keyed the way the index stores it; a bare fragment or a bare `§` run names the containing page. */
export function extractHeadingMentions(
  body: string,
  ownTitle: string,
  outline: readonly string[] = [],
): HeadingMention[] {
  const own = normalizeTitle(ownTitle)
  const seen = new Set<string>()
  const out: HeadingMention[] = []
  const add = (rawTitle: string | null, rawHeading: string): void => {
    const title = titleKey(rawTitle, own)
    const heading = normalizeTitle(rawHeading)
    if (!title || !heading || seen.has(`${title}#${heading}`)) return
    seen.add(`${title}#${heading}`)
    out.push({ title, heading })
  }
  const inCode = codeMask(body)
  for (const m of body.matchAll(pageLinkPattern())) {
    const g = m.groups
    if (!g || g.heading === undefined || (m.index !== undefined && inCode(m.index))) continue
    add(g.page, titleOf(g.heading))
  }
  for (const m of body.matchAll(markdownLinkRegex())) {
    if (m.index !== undefined && inCode(m.index)) continue
    add(targetTitle(m[2]), targetFragment(m[2]))
  }
  for (const run of sectionRunsIn(body, outline, inCode)) add('', run.heading)
  return out
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
