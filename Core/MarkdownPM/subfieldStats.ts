import { markdownLinkRegex } from '@pommora/core/Connections/links'
import { loneWebpageEmbed } from '@pommora/core/Web/webpageEmbed'
import { lineIndexAt, type DocScan } from './Decorations/intent'
import { perText, scanOf } from './Editor/docCache'
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
} from './Detect'

/** `lines` counts source lines the document holds; `words`/`characters` count the prose the editor draws. */
export interface PageStats {
  lines: number
  words: number
  characters: number
  citations: number
}

/** Chrome and widgets are replaced by a NEWLINE rather than a space: newlines are stripped before characters are
 *  counted, so a space placeholder was itself counted and made a long fence add a character per line. */
const GONE = '\n'

/** Read through the editor's own detectors rather than a private regex. A line that IS an embed is a tile and draws no prose. */
function stripLineChrome(line: string): string {
  if (loneEmbedTitle(line) !== null) return ''
  if (loneWebpageEmbed(line)) return ''

  // The same base the editor's own line pass takes — gated, because `>abc` with no space is prose the renderer never quotes.
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

/** An inline `![label](url)` keeps its bang: the editor has no image renderer and draws it as prose beside an ordinary link. */
function stripInline(text: string): string {
  return text
    .replace(inlineCodeRegex(), GONE)
    .replace(/!?\[\[([^\]|\r\n]*)(?:\|([^\]\r\n]*))?\]\]/g, (_m, title, alias) => alias || title)
    .replace(markdownLinkRegex(), (_m, label) => label)
    .replace(/[*_~]/g, '')
}

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

/** One answer per body string: the footer mounts two items needing the same figures on one render, and the prose pass walks the whole document. */
export const pageStats = perText(computeStats)

export function computeStats(body: string): PageStats {
  if (!body) return { lines: 0, words: 0, characters: 0, citations: 0 }
  // THE editor's own scan of this very text, rather than a second, narrower one that could answer a construct differently.
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

  const characters = prose.replace(/\n/g, '').length
  // An empty string rather than GONE, so a marker glued to its word (`sentence[^1].`) stays one word.
  const words = (prose.replace(markerRegex(), '').match(/\S+/g) ?? []).length
  // A single trailing newline is the terminator, not a phantom empty line.
  const trailing = body.endsWith('\n') ? 1 : 0
  return {
    lines: Math.min(cited.firstLine, lines.length - trailing),
    words,
    characters,
    citations: cited.entries.length,
  }
}
