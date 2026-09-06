// Emphasis is located on the mdast AST so `_`/`*` mixing/nesting is correct and code spans never emit emphasis.
import type { Root, RootContent, PhrasingContent } from 'mdast'
import { parse } from './parser'
import { codeMask, inlineSpans } from '@pommora/core/Connections/markdownCode'
import { markdownLinkRegex } from '@pommora/core/Connections/links'
import { isInlineMathContent, highlightRegex, inlineLatexRegex, markerRegex } from './detect'
import { linkSpans, pageEmbedPattern, pageLinkPattern } from '@pommora/core/Connections/connections'

export type TokenKind =
  | 'italic'
  | 'bold'
  | 'strikethrough'
  | 'inlineCode'
  | 'highlight'
  | 'blockLatex'
  | 'inlineLatex'
  | 'embed'
  | 'wikiLink'
  | 'link'
  | 'citationRef'

export interface Token {
  kind: TokenKind
  range: [number, number]
  contentRange: [number, number]
  resolveRange?: [number, number]
  markerRanges: [number, number][]
}

export function linkTarget(text: string, tk: Token): string {
  const [, close] = tk.markerRanges
  return text.slice(close[0] + 2, close[1] - 1)
}

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

// Marker spans come from the tighter of delimiter width and child span, robust when an inner node abuts the run.
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

/** The run-length pairing the code mask reads, so a ``code`` span is styled exactly where it is masked. */
function inlineCodeTokens(text: string, inCode: (offset: number) => boolean): Token[] {
  const tokens: Token[] = []
  let lineStart = 0
  for (const line of text.split('\n')) {
    for (const [a, b] of inlineSpans(line)) {
      if (b > line.length) break
      let run = 0
      while (line[a - 1 - run] === '`') run++
      const open = a - run
      if (inCode(lineStart + open)) continue
      tokens.push({
        kind: 'inlineCode',
        range: [lineStart + open, lineStart + b + run],
        contentRange: [lineStart + a, lineStart + b],
        markerRanges: [
          [lineStart + open, lineStart + a],
          [lineStart + b, lineStart + b + run],
        ],
      })
    }
    lineStart += line.length + 1
  }
  return tokens
}

/** Display math is the block model's pairing projected onto tokens: the `$$` lines bound it, nothing else does. */
function blockLatexTokens(text: string, maths: readonly [number, number][]): Token[] {
  return maths.map(([f, t]) => {
    const open = text.indexOf('$$', f) + 2
    const close = text.lastIndexOf('$$', t)
    return {
      kind: 'blockLatex',
      range: [f, t],
      contentRange: [open, close],
      markerRanges: [
        [f, open],
        [close, t],
      ],
    }
  })
}

// No `d` flag, so offsets are derived from the known `[[` prefix.
function wikiLinkTokens(text: string, inCode: (offset: number) => boolean): Token[] {
  const tokens: Token[] = []
  for (const m of text.matchAll(pageLinkPattern())) {
    const s = linkSpans(m)
    if (!s || inCode(s.full[0])) continue
    const [fs, fe] = s.full
    // The leading marker swallows `[[Title|`. An opened-but-empty alias shows nothing, so it stays a plain link.
    const alias = s.alias && s.alias[1] > s.alias[0] ? s.alias : null
    const shown = alias ?? s.title
    tokens.push({
      kind: 'wikiLink',
      range: [fs, fe],
      contentRange: shown,
      ...(alias ? { resolveRange: s.title } : {}),
      // The markers tile the whole token, so a renderer drawing only the content span can't disagree with one hiding markers.
      markerRanges: [
        [fs, shown[0]],
        [shown[1], fe],
      ],
    })
  }
  return tokens
}

export function tokenize(text: string, maths: readonly [number, number][] = []): Token[] {
  const ast = parse(text)
  const tokens: Token[] = []
  walkEmphasis(ast, tokens)
  const inCode = codeMask(text)
  const scan = (spec: RegexSpec): Token[] => regexTokens(text, spec, inCode)

  // Code tokenizes FIRST so a [[link]] in code renders and clicks as literal code, not a live connection.
  const code = inlineCodeTokens(text, inCode)
  const embeds = scan({
    kind: 'embed',
    re: pageEmbedPattern(),
    open: 3,
    close: 2,
  })
  // `[[Title]](target)` stays a connection trailed by literal parens, matching Obsidian. CommonMark would read
  // it as a link labeled `[Title]`, which the rename cascade's grammar can't match, so its target would rot silently.
  const wikis = wikiLinkTokens(text, inCode).filter(notOverlapping([...embeds, ...code]))
  const links = scan({
    kind: 'link',
    re: markdownLinkRegex(),
    open: 1,
    close: 1,
  }).filter(notOverlapping([...embeds, ...wikis, ...code]))
  const cites = scan({ kind: 'citationRef', re: markerRegex(), open: 2, close: 1 }).filter(
    notOverlapping([...embeds, ...wikis, ...code]),
  )
  const highlights = scan({
    kind: 'highlight',
    re: highlightRegex(),
    open: 2,
    close: 2,
  }).filter(notOverlapping([...code, ...embeds, ...wikis, ...links]))
  const blockTex = blockLatexTokens(text, maths).filter(notOverlapping(code))
  const inlineTex = scan({
    kind: 'inlineLatex',
    re: inlineLatexRegex(),
    open: 1,
    close: 1,
    accept: isInlineMathContent,
  }).filter(notOverlapping([...code, ...blockTex]))

  tokens.push(
    ...embeds,
    ...wikis,
    ...links,
    ...code,
    ...cites,
    ...highlights,
    ...blockTex,
    ...inlineTex,
  )
  tokens.sort((a, b) => a.range[0] - b.range[0])
  return tokens
}

/** `restingAt` is where a link was just FINISHED — the one caret position that leaves a link rendered. */
export function activeTokenIndices(
  tokens: Token[],
  selStart: number,
  selEnd: number,
  restingAt: number | null = null,
): Set<number> {
  const active = new Set<number>()
  tokens.forEach((tk, i) => {
    // A marker never reveals its syntax: showing `[^7]` under a glyph reading 2 is the contradiction this opt-out prevents.
    if (tk.kind === 'citationRef') return
    const [s, e] = tk.range
    if (selStart !== selEnd) {
      if (selStart < e && s < selEnd) active.add(i)
      return
    }
    const caret = selStart
    if (caret === e && caret === restingAt && (tk.kind === 'wikiLink' || tk.kind === 'link')) return
    if (caret >= s && caret <= e) active.add(i)
  })
  return active
}
