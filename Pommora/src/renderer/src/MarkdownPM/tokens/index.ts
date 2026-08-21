// Emphasis is located on the mdast AST so `_`/`*` mixing/nesting is correct and code spans never emit emphasis.
import type { Root, RootContent, PhrasingContent } from 'mdast'
import { parse } from '../parser'
import { codeMask } from '@shared/markdownCode'
import {
  isInlineMathContent,
  embedRegex,
  markdownLinkRegex,
  inlineCodeRegex,
  blockLatexRegex,
  inlineLatexRegex,
  markerRegex,
} from '../detect'
import { linkSpans, pageLinkPattern } from '@shared/connections'

export type TokenKind =
  | 'italic'
  | 'bold'
  | 'strikethrough'
  | 'inlineCode'
  | 'blockLatex'
  | 'inlineLatex'
  | 'embed'
  | 'wikiLink'
  | 'link'
  | 'citationRef'

export interface Token {
  kind: TokenKind
  /** Full span incl. markers, `[start, end)`. */
  range: [number, number]
  contentRange: [number, number]
  /** Where the token resolves from, when that differs from what it displays. Absent means
   *  `contentRange` is both. */
  resolveRange?: [number, number]
  markerRanges: [number, number][]
}

/** What a `link` token's `( )` holds, still encoded. Both producers close a link with `](target)`,
 *  and the three surfaces that resolve one used to re-derive this from a different span each — so a
 *  target read for coloring could drift from the one read for the click, which is the disagreement
 *  the shared resolver downstream exists to prevent. */
export function linkTarget(text: string, tk: Token): string {
  const [, close] = tk.markerRanges
  return text.slice(close[0] + 2, close[1] - 1)
}

/** Re-base a token onto absolute document offsets. Every span is listed rather than spread, so a
 *  field added to `Token` and forgotten here fails the parity test instead of rendering wrongly. */
export function shiftToken(tk: Token, by: number): Token {
  const move = ([s, e]: [number, number]): [number, number] => [s + by, e + by]
  return {
    kind: tk.kind,
    range: move(tk.range),
    contentRange: move(tk.contentRange),
    ...(tk.resolveRange ? { resolveRange: move(tk.resolveRange) } : {}),
    markerRanges: tk.markerRanges.map(move),
  }
}

type Span = [number, number]
const overlaps = (a: Span, b: Span): boolean => a[0] < b[1] && b[0] < a[1]

const notOverlapping =
  (claimed: Token[]) =>
  (tk: Token): boolean =>
    !claimed.some((c) => overlaps(c.range, tk.range))

type MdNode = Root | RootContent | PhrasingContent

function childSpan(node: MdNode): Span | null {
  const kids = 'children' in node ? node.children : undefined
  if (!kids || kids.length === 0) return null
  const start = kids[0].position?.start.offset
  const end = kids[kids.length - 1].position?.end.offset
  return start != null && end != null ? [start, end] : null
}

// Marker spans come from the tighter of (delimiter width) and (child span), robust when an inner node abuts the run.
function pushEmphasis(
  node: MdNode,
  kind: 'italic' | 'bold' | 'strikethrough',
  width: number,
  out: Token[],
): void {
  const fs = node.position?.start.offset
  const fe = node.position?.end.offset
  if (fs == null || fe == null || fe - fs < width * 2) return
  const cs = childSpan(node) ?? [fs + width, fe - width]
  const contentStart = Math.max(cs[0], fs + width)
  const contentEnd = Math.min(cs[1], fe - width)
  if (contentEnd <= contentStart) return
  out.push({
    kind,
    range: [fs, fe],
    contentRange: [contentStart, contentEnd],
    markerRanges: [
      [contentStart - width, contentStart],
      [contentEnd, contentEnd + width],
    ],
  })
}

function walkEmphasis(node: MdNode, out: Token[]): void {
  if (node.type === 'emphasis') pushEmphasis(node, 'italic', 1, out)
  else if (node.type === 'strong') pushEmphasis(node, 'bold', 2, out)
  else if (node.type === 'delete') pushEmphasis(node, 'strikethrough', 2, out)
  if ('children' in node && node.children) {
    for (const child of node.children) walkEmphasis(child as MdNode, out)
  }
}

interface RegexSpec {
  kind: TokenKind
  re: RegExp
  open: number
  close: number
  accept?: (content: string) => boolean
}

function regexTokens(text: string, spec: RegexSpec, inCode: (offset: number) => boolean): Token[] {
  const tokens: Token[] = []
  for (const m of text.matchAll(spec.re)) {
    const indices = m.indices
    const fullSpan = indices?.[0]
    if (!fullSpan) continue
    const [fs, fe] = fullSpan
    const content: Span = indices[1] ?? [fs + spec.open, fe - spec.close]
    if (spec.accept && !spec.accept(m[1] ?? '')) continue
    if (inCode(fs)) continue
    tokens.push({
      kind: spec.kind,
      range: [fs, fe],
      contentRange: [content[0], content[1]],
      markerRanges: [
        [fs, content[0]],
        [content[1], fe],
      ],
    })
  }
  return tokens
}

// No `d` flag, so offsets are derived from the known `[[` prefix.
function wikiLinkTokens(text: string, inCode: (offset: number) => boolean): Token[] {
  const tokens: Token[] = []
  for (const m of text.matchAll(pageLinkPattern())) {
    const s = linkSpans(m)
    if (!s || inCode(s.full[0])) continue
    const [fs, fe] = s.full
    // An alias pulls the two meanings apart — the words shown and the key resolved. The leading
    // marker then swallows `[[Title|`, since all of it is syntax the reader shouldn't see. An
    // opened-but-empty one shows nothing, so it stays a plain link until something is written in it.
    const alias = s.alias && s.alias[1] > s.alias[0] ? s.alias : null
    const shown = alias ?? s.title
    tokens.push({
      kind: 'wikiLink',
      range: [fs, fe],
      contentRange: shown,
      ...(alias ? { resolveRange: s.title } : {}),
      // Everything either side of what's shown, so the markers tile the whole token — a renderer
      // drawing only the content span and skipping the rest can't then disagree with one hiding
      // markers. A pipe with nothing after it rides the closer.
      markerRanges: [
        [fs, shown[0]],
        [shown[1], fe],
      ],
    })
  }
  return tokens
}

export function tokenize(text: string): Token[] {
  const ast = parse(text)
  const tokens: Token[] = []
  walkEmphasis(ast, tokens)
  // One mask per body, queried per match — the per-offset form re-walks the text for every one.
  const inCode = codeMask(text)
  const scan = (spec: RegexSpec): Token[] => regexTokens(text, spec, inCode)

  // Code tokenizes FIRST so connections and links inside `spans` are dropped like latex already is —
  // a [[link]] in code must render (and click) as literal code, not a live connection.
  const code = scan({ kind: 'inlineCode', re: inlineCodeRegex(), open: 1, close: 1 })
  const embeds = scan({
    kind: 'embed',
    re: embedRegex(),
    open: 3,
    close: 2,
  })
  // `[[Title]](target)` stays a connection trailed by literal parens, which is what Obsidian shows
  // and therefore what a shared vault means by it. CommonMark would read it as a link labeled
  // `[Title]`; reading it that way here creates a link the rename cascade's grammar cannot match,
  // so renaming its target rots it silently.
  const wikis = wikiLinkTokens(text, inCode).filter(notOverlapping([...embeds, ...code]))
  const links = scan({
    kind: 'link',
    re: markdownLinkRegex(),
    open: 1,
    close: 1,
  }).filter(notOverlapping([...embeds, ...wikis, ...code]))
  // A footnote marker tokenizes so the resting table cell — which has no EditorView and reads the
  // tokenizer directly — draws the same construct the body does. What it draws is the ordinal, which
  // is a whole-document fact no token carries; the editor takes it from the scan instead.
  const cites = scan({ kind: 'citationRef', re: markerRegex(), open: 2, close: 1 }).filter(
    notOverlapping([...embeds, ...wikis, ...code]),
  )
  const blockTex = scan({
    kind: 'blockLatex',
    re: blockLatexRegex(),
    open: 2,
    close: 2,
  }).filter(notOverlapping(code))
  const inlineTex = scan({
    kind: 'inlineLatex',
    re: inlineLatexRegex(),
    open: 1,
    close: 1,
    accept: isInlineMathContent,
  }).filter(notOverlapping([...code, ...blockTex]))

  tokens.push(...embeds, ...wikis, ...links, ...code, ...cites, ...blockTex, ...inlineTex)
  tokens.sort((a, b) => a.range[0] - b.range[0])
  return tokens
}

/** Which tokens reveal their syntax. `restingAt` is where a link was just FINISHED, if anywhere —
 *  the one caret position that leaves a link rendered, and only because the finishing gesture put
 *  the caret there. Clicking beside a link reveals it as every other construct does. */
export function activeTokenIndices(
  tokens: Token[],
  selStart: number,
  selEnd: number,
  restingAt: number | null = null,
): Set<number> {
  const active = new Set<number>()
  tokens.forEach((tk, i) => {
    // A marker never reveals its syntax at any caret position — its label is invisible plumbing, and
    // showing `[^7]` under a glyph reading 2 is the contradiction positional display exists to
    // prevent. It opts out here rather than being suppressed per position.
    if (tk.kind === 'citationRef') return
    const [s, e] = tk.range
    if (selStart !== selEnd) {
      if (selStart < e && s < selEnd) active.add(i)
      return
    }
    const caret = selStart
    // A link just finished leaves the caret on its closer and stays rendered there. Nothing about
    // the position earns that — clicking beside a link is aiming at its syntax and still reveals it
    // — so the finishing gesture is what says so, and the next thing the user does takes it back.
    if (caret === e && caret === restingAt && (tk.kind === 'wikiLink' || tk.kind === 'link')) return
    if (caret >= s && caret <= e) active.add(i)
  })
  return active
}
