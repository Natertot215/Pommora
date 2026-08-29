import { markdownLinkRegex } from '@shared/links'
import { loneWebpageEmbed } from '@shared/webpageEmbed'
import { lineIndexAt, type DocScan } from '@renderer/MarkdownPM/Decorations/intent'
import { perText, scanOf } from '@renderer/MarkdownPM/Editor/docCache'
import {
  blockquotePrefixRe,
  calloutHeadPrefixLen,
  headingParts,
  isBlockquoteLine,
  inlineCodeRegex,
  isThematicBreakLine,
  loneEmbedTitle,
  markerRegex,
  parseListMarker,
} from '@renderer/MarkdownPM/Detect'

/** Page document stats for the Subfield. `lines` counts source lines the document actually holds;
 *  `words`/`characters` count the prose the editor actually draws (so `## **Bold**` is one word,
 *  "Bold").
 *
 *  The footnotes section is outside all three counts, through the one boundary its scan derives —
 *  the same scan the line count stops at and the prose pass blanks, so the three numbers keep
 *  describing one document. A body marker is where the two prose pipelines legitimately diverge:
 *  the character pass sees its source, the word pass has it removed, so `sentence[^1].` reads as
 *  the one word the reader sees while the file's own characters are still reported.
 *
 *  A table counts as the prose its widget draws — the cell text the scan already parsed, never the
 *  pipes or the delimiter row. Indented code and math are still counted as their source. */
export interface PageStats {
  lines: number
  words: number
  characters: number
  /** Citations in the trailing section — what decides whether the Subfield offers its control. */
  citations: number
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

/** The widget shows cell text, so the pipes and the padding go, and the delimiter row — which is
 *  not among a region's rows — blanks with the rest of the span. */
function tableProse(scan: DocScan): Map<number, string> {
  const drawn = new Map<number, string>()
  for (const region of scan.tables) {
    const last = lineIndexAt(scan, region.to)
    for (let i = lineIndexAt(scan, region.from); i <= last; i++) drawn.set(i, '')
    for (const row of region.rows) {
      drawn.set(lineIndexAt(scan, row.from), row.cells.map((c) => c.text).join(GONE))
    }
  }
  return drawn
}

/** One answer per body string. A footer mounts two items on a page — the counts and the footnotes
 *  control — and both need the same figures on the same render; the prose pass below walks the whole
 *  document, and running it twice for one body is the cost this exists to remove. */
export const pageStats = perText(computeStats)

export function computeStats(body: string): PageStats {
  if (!body) return { lines: 0, words: 0, characters: 0, citations: 0 }
  // THE editor's own scan of this very text — one derivation shared with the editor drawing it,
  // rather than a second, narrower one that could answer a construct differently.
  const scan = scanOf(body)
  const { lines, fences, citations: cited } = scan
  const drawn = tableProse(scan)
  const prose = stripInline(
    lines
      .map((line, i) =>
        fences[i] || cited.mask[i] ? GONE : (drawn.get(i) ?? stripLineChrome(line)),
      )
      .join('\n'),
  )

  // Strictly-visible characters: the structural newlines and every mask go, the rest stays.
  const characters = prose.replace(/\n/g, '').length
  // The one line the character count never sees — and an empty string rather than GONE, so a marker
  // glued to its word (`sentence[^1].`) stays one word instead of splitting into two.
  const words = (prose.replace(markerRegex(), '').match(/\S+/g) ?? []).length
  // A single trailing newline is the terminator, not a phantom empty line — dropped from the count
  // rather than from the text, so the scan stays keyed on the body the editor itself holds.
  const trailing = body.endsWith('\n') ? 1 : 0
  return {
    lines: Math.min(cited.firstLine, lines.length - trailing),
    words,
    characters,
    citations: cited.entries.length,
  }
}
