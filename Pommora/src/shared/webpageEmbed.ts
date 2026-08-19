// The lone-line webpage-embed grammar. Every shipped link grammar refuses empty halves — a
// `[](…)` label or a `(…)` with nothing in it tokenizes as prose — so the surfaces that must
// recognize a link mid-authoring read the empty-tolerant variant instead of the tokenizer.
// No fs, no React; both processes may import it.

import { emptyTolerantLinkRegex } from './links'

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
