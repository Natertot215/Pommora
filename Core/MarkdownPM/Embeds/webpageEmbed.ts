// The lone-line webpage-embed grammar. Every shipped link grammar refuses empty halves, so the
// surfaces that must recognize a link mid-authoring read the empty-tolerant variant instead.

import {
  emptyTolerantLinkRegex,
  escapeAlias,
  hasWebScheme,
  isValidLink,
  unescapeAlias,
} from '../../Connections/links'
import { linkDisplayText } from '../../Connections/linkValue'
import type { LinkDisplay } from '../../Properties/properties'

/** Never indented: an indented line is list continuation, mirroring the page embed's anchor. A mid-typed prefix like `https://example.c` passes, which is why claims are formation-gated on the selection rather than on the grammar. */
export function loneWebpageEmbed(lineText: string): { label: string; url: string } | null {
  if (!lineText.startsWith('![')) return null
  const line = lineText.replace(/\s+$/, '')
  const m = emptyTolerantLinkRegex().exec(line)
  if (!m) return null
  if (m.index !== 1 || m.index + m[0].length !== line.length) return null
  const url = m[2]
  if (!url || !hasWebScheme(url) || !isValidLink(url)) return null
  return { label: unescapeAlias(m[1]), url }
}

/** The ONLY assembly path: `serializeLink` emits no bang and collapses an empty alias to the bare URL, so composing through it would write a line the detector refuses. */
export function composeWebpageEmbedLine(label: string, url: string): string {
  return `![${escapeAlias(label)}](${url})`
}

/** Resolved at render; nothing is written into the document. A hand-written label wins verbatim, an empty one derives per the nexus's default link format. */
export function webpageTileTitle(
  label: string,
  url: string,
  display: LinkDisplay,
  title?: string,
): string {
  return label !== '' ? label : linkDisplayText(url, display, title)
}

/** What Edit Link selects, so a tile's address is retyped the way every other link's is. */
export function webpageEmbedUrlSpan(lineText: string): [number, number] | null {
  if (!loneWebpageEmbed(lineText)) return null
  const span = emptyTolerantLinkRegex().exec(lineText.replace(/\s+$/, ''))?.indices?.[2]
  return span ? [span[0], span[1]] : null
}

/** Two shapes count: a complete link, empty halves included (⌘K seats the caret inside `[]()`), and a destination still open before the caret. */
export function linkDestinationAt(lineText: string, col: number): boolean {
  for (const m of lineText.matchAll(emptyTolerantLinkRegex())) {
    const span = m.indices?.[2]
    if (!span || span[0] > col) break
    if (col >= span[0] && col <= span[1]) return true
  }
  const head = lineText.slice(0, col)
  const open = head.lastIndexOf('](')
  return open !== -1 && !head.slice(open + 2).includes(')')
}
