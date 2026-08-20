import { isValidLink, markdownLinkRegex } from '@shared/links'
import { fencedLineMask } from '@shared/markdownCode'
import { loneWebpageEmbed } from '@shared/webpageEmbed'
import {
  blockquotePrefixRe,
  headingParts,
  inlineCodeRegex,
  isThematicBreakLine,
  loneEmbedTitle,
  parseListMarker,
} from '@renderer/MarkdownPM/detect'

/** Page document stats for the Subfield. `lines` counts raw source lines; `words`/`characters`
 *  count the prose the editor actually draws (so `## **Bold**` is one word, "Bold"). */
export interface PageStats {
  lines: number
  words: number
  characters: number
}

/** Everything the editor draws as chrome or as a widget is replaced by a NEWLINE rather than a
 *  space. Newlines are already stripped before characters are counted and already separate words,
 *  so a mask can only ever remove source characters — a space placeholder was itself being counted,
 *  which is what made a long fence add a character per line. */
const GONE = '\n'

/** Line-level chrome, read through the editor's own detectors rather than a private regex — the
 *  list-marker parser in particular is the single source every layer reads. A line that IS an
 *  embed is a tile: it draws no prose at all. Resolution isn't checked here, so an unresolved lone
 *  embed is counted as the tile it is trying to be. */
function stripLineChrome(line: string): string {
  if (loneEmbedTitle(line) !== null) return ''
  const web = loneWebpageEmbed(line)
  if (web && isValidLink(web.url)) return ''
  if (isThematicBreakLine(line)) return ''

  // The whole quote run, not one level: `>> text` is prose at depth two, never a `>` and a word.
  const unquoted = line.replace(blockquotePrefixRe, '')
  const heading = headingParts(unquoted)
  if (heading) return heading.content
  const marker = parseListMarker(unquoted)
  return marker ? unquoted.slice(marker.contentStart) : unquoted
}

/** Inline syntax → what the reader sees. An inline `![[Title]]` is the editor's inert embed token,
 *  whose title stays visible; an inline `![label](url)` keeps its bang, because the editor has no
 *  image renderer and draws it as prose beside an ordinary link. */
function stripInline(text: string): string {
  return text
    .replace(inlineCodeRegex(), GONE)
    .replace(/!?\[\[([^\]|\r\n]*)(?:\|([^\]\r\n]*))?\]\]/g, (_m, title, alias) => alias || title)
    .replace(markdownLinkRegex(), (_m, label) => label)
    .replace(/[*_~]/g, '')
}

export function computeStats(body: string): PageStats {
  if (!body) return { lines: 0, words: 0, characters: 0 }
  // Raw source lines: a single trailing newline is the terminator, not a phantom empty line.
  const trimmed = body.endsWith('\n') ? body.slice(0, -1) : body
  const lines = trimmed.split('\n')

  const fenced = fencedLineMask(lines)
  const prose = stripInline(
    lines.map((line, i) => (fenced[i] ? GONE : stripLineChrome(line))).join('\n'),
  )

  // Strictly-visible characters: the structural newlines and every mask go, the rest stays.
  const characters = prose.replace(/\n/g, '').length
  const words = (prose.match(/\S+/g) ?? []).length
  return { lines: lines.length, words, characters }
}
