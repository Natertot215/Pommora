// The lone-line webpage-embed grammar. Every shipped link grammar refuses empty halves — a
// `[](…)` label or a `(…)` with nothing in it tokenizes as prose — so the surfaces that must
// recognize a link mid-authoring read the empty-tolerant variant instead of the tokenizer.
// No fs, no React; both processes may import it.

import {
  emptyTolerantLinkRegex,
  escapeAlias,
  hasWebScheme,
  isValidLink,
  unescapeAlias,
} from './links'
import { linkDisplayText } from './linkValue'
import type { LinkDisplay } from './properties'

/** The lone-line webpage embed: `![label](url)` alone on its line, trailing whitespace tolerated,
 *  never indented (an indented line is list continuation, mirroring the page embed's anchor).
 *  The label may be empty; the URL must carry an explicit http(s) scheme and be an address the
 *  link system would open — a mid-typed prefix like `https://example.c` passes here, which is
 *  why claims are formation-gated on the selection rather than on the grammar. */
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

/** The ONLY assembly path any webpage-embed writer uses — `serializeLink` emits no bang and
 *  collapses an empty alias to the bare URL, so composing through it would write a line the
 *  detector refuses. */
export function composeWebpageEmbedLine(label: string, url: string): string {
  return `![${escapeAlias(label)}](${url})`
}

/** The title a tile displays, resolved at render — nothing is ever written into the document. A
 *  hand-written on-disk label wins verbatim; an empty one derives per the nexus's default link
 *  format, Page Title reading the same fetched-title cache every property cell reads. */
export function webpageTileTitle(
  label: string,
  url: string,
  display: LinkDisplay,
  title?: string,
): string {
  return label !== '' ? label : linkDisplayText(url, display, title)
}

/** Whether `col` sits inside the `()` destination of a markdown link on the line — the span a
 *  character typed at `col` would land in. Two shapes count: a complete link, empty halves
 *  included (the caret ⌘K seats sits inside `[]()` before anything is typed), and a destination
 *  still open before the caret (`](` with no `)` yet) — the same reading the smart-dash guard
 *  gives an address mid-typing. */
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
