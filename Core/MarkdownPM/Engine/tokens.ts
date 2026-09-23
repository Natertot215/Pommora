// Emphasis is located on the mdast AST so `_`/`*` mixing/nesting is correct and code spans never emit emphasis.
import type { Root, RootContent, PhrasingContent } from 'mdast'
import { parse } from './parser'
import { inlineSpans, type CodeMask } from './markdownCode'
import { type DocScan, inCodeAt, scanDoc } from './docScan'
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
  fragment?: [number, number]
  markerRanges: [number, number][]
}

// The page half alone resolves; a heading token carries `resolveRange` too and is not aliased by that alone.
export const aliasedToken = (tk: Token): boolean =>
  tk.resolveRange !== undefined && tk.contentRange[0] !== tk.resolveRange[0]

export function linkTarget(text: string, tk: Token): string {
  const [, close] = tk.markerRanges
  return text.slice(close[0] + 2, close[1] - 1)
}

export const headingOf = (text: string, tk: Token): string | undefined =>
  tk.fragment && text.slice(tk.fragment[0], tk.fragment[1])

export function shiftToken(tk: Token, by: number): Token {
  const move = ([s, e]: [number, number]): [number, number] => [s + by, e + by]
  return {
    kind: tk.kind,
    range: move(tk.range),
    contentRange: move(tk.contentRange),
    ...(tk.resolveRange ? { resolveRange: move(tk.resolveRange) } : {}),
    ...(tk.fragment ? { fragment: move(tk.fragment) } : {}),
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
    const fragment = s.heading && s.heading[1] > s.heading[0] ? s.heading : null
    const target: [number, number] = [s.title[0], fragment ? fragment[1] : s.title[1]]
    const shown = alias ?? target
    tokens.push({
      kind: 'wikiLink',
      range: [fs, fe],
      contentRange: shown,
      ...(alias || s.heading ? { resolveRange: s.title } : {}),
      ...(fragment ? { fragment } : {}),
      // The markers tile the whole token, so a renderer drawing only the content span can't disagree with one hiding markers.
      markerRanges: [
        [fs, shown[0]],
        [shown[1], fe],
      ],
    })
  }
  return tokens
}

export function tokenize(text: string, scan: DocScan = scanDoc(text)): Token[] {
  const ast = parse(text, scan)
  const tokens: Token[] = []
  walkEmphasis(ast, tokens)
  const inCode: CodeMask = (p) => inCodeAt(scan, p)
  const matches = (spec: RegexSpec): Token[] => regexTokens(text, spec, inCode)

  // Code tokenizes FIRST so a [[link]] in code renders and clicks as literal code, not a live connection.
  const code = inlineCodeTokens(text, inCode)
  const embeds = matches({
    kind: 'embed',
    re: pageEmbedPattern(),
    open: 3,
    close: 2,
  })
  // `[[Title]](target)` stays a connection trailed by literal parens, matching Obsidian. CommonMark would read it as a link labeled `[Title]`, which the rename cascade's grammar can't match, so its target would rot silently.
  const wikis = wikiLinkTokens(text, inCode).filter(notOverlapping([...embeds, ...code]))
  const links = matches({
    kind: 'link',
    re: markdownLinkRegex(),
    open: 1,
    close: 1,
  }).filter(notOverlapping([...embeds, ...wikis, ...code]))
  const cites = matches({ kind: 'citationRef', re: markerRegex(), open: 2, close: 1 }).filter(
    notOverlapping([...embeds, ...wikis, ...code]),
  )
  const highlights = matches({
    kind: 'highlight',
    re: highlightRegex(),
    open: 2,
    close: 2,
  }).filter(notOverlapping([...code, ...embeds, ...wikis, ...links]))
  const blockTex = blockLatexTokens(text, scan.maths).filter(notOverlapping(code))
  const inlineTex = matches({
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

/** The link or wikiLink token an offset sits in, markers included — the one read every click, hover, and resting cell shares. At a boundary two abutting tokens both contain the offset; the later-starting one wins, so a span captured at a token's own start resolves to that token and not its neighbor. */
export function linkTokenAt(
  text: string,
  offset: number,
  kind?: 'link' | 'wikiLink',
): Token | undefined {
  return tokenize(text)
    .filter(
      (t) =>
        (kind ? t.kind === kind : t.kind === 'link' || t.kind === 'wikiLink') &&
        offset >= t.range[0] &&
        offset <= t.range[1],
    )
    .at(-1)
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
    const resting = selStart === selEnd && selStart === e && selStart === restingAt
    if (resting && (tk.kind === 'wikiLink' || tk.kind === 'link')) return
    // Inclusive at both edges, for a range as for a caret: a drag's head touching the token keeps its revealed syntax, so the reveal can't push the text out from under the pointer.
    if (selStart <= e && s <= selEnd) active.add(i)
  })
  return active
}
