// The lone-line webpage-embed grammar. Every shipped link grammar refuses empty halves — a
// `[](…)` label or a `(…)` with nothing in it tokenizes as prose — so the surfaces that must
// recognize a link mid-authoring (the paste guard at an empty destination, later the embed line
// itself) read this module instead of the tokenizer. No fs, no React; both processes may import it.

/** Every markdown-link shape on a line, bang-optional and empty-tolerant on both halves. The label
 *  reads escapes as `MD_LINK` does; the destination admits balanced parens as the tokenizer's
 *  grammar does. Both caps carried over — the label's is ReDoS-load-bearing, not cosmetic. */
const anyLink = (): RegExp =>
  /!?\[((?:[^\]\\\r\n]|\\.){0,255})\]\(((?:[^()\r\n]|\((?:[^()\r\n]|\([^()\r\n]*\))*\)){0,2048})\)/dg

/** Whether `col` sits inside the `()` destination of any markdown link on the line — the span a
 *  character typed at `col` would land in. Empty labels and empty destinations included: the caret
 *  seated by ⌘K or Embed ▸ Webpage sits inside `[]()` before anything is typed. */
export function linkDestinationAt(lineText: string, col: number): boolean {
  for (const m of lineText.matchAll(anyLink())) {
    const span = m.indices?.[2]
    if (span && col >= span[0] && col <= span[1]) return true
  }
  return false
}
