import { markdownLinkRegex } from '@shared/links'
import { fencedLineMask } from '@shared/markdownCode'
import { loneWebpageEmbed } from '@shared/webpageEmbed'
import {
  blockquotePrefixRe,
  calloutHeadPrefixLen,
  headingParts,
  isBlockquoteLine,
  inlineCodeRegex,
  isThematicBreakLine,
  loneEmbedTitle,
  parseListMarker,
} from '@renderer/MarkdownPM/detect'

/** Page document stats for the Subfield. `lines` counts raw source lines; `words`/`characters`
 *  count the prose the editor actually draws (so `## **Bold**` is one word, "Bold").
 *
 *  One construct is still counted as its source: a Markdown table, whose pipes and delimiter row
 *  the editor replaces with a widget. Reading a table's regions needs a parse per candidate, and
 *  this runs on every edit — so it waits for the day the Subfield can read the editor's own cached
 *  document scan rather than paying for its own. */
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
  if (loneWebpageEmbed(line)) return ''

  // The same base the editor's own line pass takes: a callout head's prefix INCLUDING its `[!type]`
  // tag, else the quote run — gated, because `>abc` with no space is prose the renderer never
  // quotes. Every construct below reads the line from that base, exactly as the renderer does.
  const base =
    calloutHeadPrefixLen(line) ??
    (isBlockquoteLine(line) ? (blockquotePrefixRe.exec(line)?.[0].length ?? 0) : 0)
  const inner = line.slice(base)

  if (isThematicBreakLine(inner)) return ''
  const heading = headingParts(inner)
  if (heading) return heading.content
  const marker = parseListMarker(inner)
  return marker ? inner.slice(marker.contentStart) : inner
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
