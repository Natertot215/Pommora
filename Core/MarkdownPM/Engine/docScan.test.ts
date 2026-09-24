import { isDeepStrictEqual } from 'node:util'
import { describe, expect, it } from 'vitest'
import type { Root, RootContent } from 'mdast'
import { chunksOver, type DocScan, inCodeAt, rescan, scanDoc } from './docScan'
import { docLineIntents, stepLineIntents } from './intents'
import { parse } from './parser'
import { shiftToken, tokenize, type Token } from './tokens'

// ── The generator ───────────────────────────────────────────────────────

function stream(seed: number): () => number {
  let s = seed >>> 0
  return () => {
    s = (s + 0x6d2b79f5) >>> 0
    let t = s
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const LINES = [
  '',
  '',
  '',
  'plain prose with *em* and `code`',
  'a sentence citing [^1] and [^b]',
  'escaped \\[^1] stays prose',
  'inline `[^1]` is code',
  '# Heading',
  '## Sub heading',
  '---',
  '* * *',
  '- item',
  '+ item',
  '* item',
  '- [ ] task',
  '- ',
  '1. one',
  '2. two',
  '3) three',
  'A. alpha',
  '→ arrow',
  '  - nested',
  '    four-space continuation',
  '\ttab continuation',
  '> quote',
  '> [!note] Callout',
  '> body line',
  '> > nested quote',
  '>',
  '> ```',
  '> - quoted item',
  '>  ```',
  '>   ```',
  '```',
  '```js',
  '````',
  '~~~',
  '  ```',
  '$$',
  '$$ ',
  '  $$',
  'x^2 + y^2',
  '| a | b |',
  '|---|---|',
  '| 1 | 2 |',
  'a | b',
  '--- | ---',
  '![[Page]]',
  '![[Other]]  ',
  '![label](https://example.com)',
  '[^1]: first note',
  '[^b]: second note',
  '[^1]:',
  '[^my note]: not a citation',
  '<!--',
  '-->',
  '<!-- inline -->',
  '<div>',
  '</div>',
  '<pre>',
  '</pre>',
  '<?php',
  '?>',
  'crlf line\r',
  '```\r',
]
const CHARS = ['`', '$', '|', '>', '[', '^', ':', '\n', '-', '#', ' ', 'x', '<', '!', '*', '\t']

const pick = <T>(r: () => number, xs: readonly T[]): T => xs[Math.floor(r() * xs.length)]

function soup(r: () => number, count: number): string {
  const out: string[] = []
  for (let i = 0; i < count; i++) out.push(pick(r, LINES))
  return out.join('\n')
}

interface Edit {
  from: number
  to: number
  insert: string
}

function edit(r: () => number, text: string): Edit {
  const at = Math.floor(r() * (text.length + 1))
  const roll = r()
  if (roll < 0.45) return { from: at, to: at, insert: pick(r, CHARS) }
  if (roll < 0.65) return { from: at, to: at, insert: `${pick(r, LINES)}\n` }
  const to = Math.min(text.length, at + Math.floor(r() * (roll < 0.85 ? 4 : 40)))
  return { from: at, to, insert: roll < 0.85 ? '' : pick(r, LINES) }
}

const applied = (text: string, e: Edit): string =>
  text.slice(0, e.from) + e.insert + text.slice(e.to)

function twoEdits(r: () => number, text: string): { from: number; to: number; next: string } {
  const x = edit(r, text)
  const y = edit(r, text)
  const [first, second] = x.from <= y.from ? [x, y] : [y, x]
  if (first.to > second.from) return { from: first.from, to: first.to, next: applied(text, first) }
  const next = applied(applied(text, second), first)
  return { from: first.from, to: second.to, next }
}

// ── The comparison ──────────────────────────────────────────────────────

const settled = ({ fresh, ...s }: DocScan): Record<string, unknown> => s

function mismatch(a: DocScan, b: DocScan): string | null {
  const x = settled(a)
  const y = settled(b)
  for (const key of Object.keys(y)) if (!isDeepStrictEqual(x[key], y[key])) return key
  return null
}

// ── The property ────────────────────────────────────────────────────────

describe('rescan — the incremental scan is the full scan', () => {
  it('equals scanDoc after every edit of every chained sequence', () => {
    const DOCS = 1500
    const EDITS = 40
    for (let seed = 1; seed <= DOCS; seed++) {
      const r = stream(seed)
      let text = soup(r, seed % 10 === 0 ? 200 + Math.floor(r() * 300) : 5 + Math.floor(r() * 40))
      let scan = scanDoc(text)
      for (let step = 0; step < EDITS; step++) {
        const { from, to, next } =
          r() < 0.1
            ? twoEdits(r, text)
            : ((e) => ({ from: e.from, to: e.to, next: applied(text, e) }))(edit(r, text))
        const incremental = rescan(scan, from, to, next)
        const full = scanDoc(next)
        const key = mismatch(incremental, full)
        if (key !== null)
          expect.fail(
            `seed ${seed} step ${step}: '${key}' differs\n${JSON.stringify(text)}\n→ ${JSON.stringify(next)} [${from}, ${to})`,
          )
        text = next
        scan = incremental
      }
    }
  }, 600_000)

  it('resyncs on a line the edit itself turns into a table header', () => {
    const text = 'x\n\n\n|---|\n| c |'
    const next = 'x\n\n| a |\n|---|\n| c |'
    expect(mismatch(rescan(scanDoc(text), 3, 3, next), scanDoc(next))).toBeNull()
    expect(scanDoc(next).tables).toHaveLength(1)
  })

  it('never resyncs below a line a table can take as its header', () => {
    const next = '→ a | b\n-|---|'
    expect(mismatch(rescan(scanDoc('→ a | b\n|---|'), 8, 8, next), scanDoc(next))).toBeNull()
  })

  it('steps line intents to what the whole document derives', () => {
    for (let seed = 1; seed <= 1500; seed++) {
      const r = stream(seed)
      let text = soup(r, 5 + Math.floor(r() * 40))
      let scan = scanDoc(text)
      let page = docLineIntents(scan, 'page')
      let cell = docLineIntents(scan, 'cell')
      for (let step = 0; step < 30; step++) {
        const e = edit(r, text)
        const next = applied(text, e)
        const stepped = rescan(scan, e.from, e.to, next)
        const nextPage = stepLineIntents(page, scan, stepped, 'page')
        const nextCell = stepLineIntents(cell, scan, stepped, 'cell')
        for (const [got, want] of [
          [nextPage, docLineIntents(stepped, 'page')],
          [nextCell, docLineIntents(stepped, 'cell')],
        ] as const) {
          const { fresh: _a, ...g } = got
          const { fresh: _b, ...w } = want
          if (!isDeepStrictEqual(g, w))
            expect.fail(`seed ${seed} step ${step}\n${JSON.stringify([text, next, e.from, e.to])}`)
        }
        text = next
        scan = stepped
        page = nextPage
        cell = nextCell
      }
    }
  }, 600_000)
})

const DEFINITION = /^ {0,3}\[[^\]]+\]:/
const PROSE = [
  ...LINES.filter((l) => !DEFINITION.test(l)),
  '',
  '',
  '',
  '',
  '',
  '',
  '*emphasis opens',
  'and closes here*',
  '**strong opens',
  'strong closes**',
  '~~struck',
  'through~~',
  'lazy *continuation',
  '===',
  '- item *opens',
  '- item closes*',
  '+ plus item',
  '* star *opens',
  '<span>inline html</span>',
  '<https://example.com>',
]

function sameFences(text: string, scan: DocScan): boolean {
  const lines = text.split('\n')
  const parsed = new Set<number>()
  const visit = (node: RootContent | Root): void => {
    const at = node.position
    if (node.type === 'code' && at && /^[ \t>]*(?:`{3,}|~{3,})/.test(lines[at.start.line - 1]))
      for (let l = at.start.line; l <= at.end.line; l++) parsed.add(l - 1)
    if ('children' in node) for (const child of node.children) visit(child)
  }
  visit(parse(text, scan))
  return scan.lines.every((_, i) => (scan.fences[i] !== undefined) === parsed.has(i))
}

function chunked(text: string): Token[] {
  const scan = scanDoc(text)
  return chunksOver(scan, [[0, scan.lines.length - 1]]).flatMap(([a, b]) => {
    const chunk = text.slice(a, b)
    return tokenize(chunk).map((tk) => shiftToken(tk, a))
  })
}

const italics = (tokens: Token[]): [number, number][] =>
  tokens.filter((t) => t.kind === 'italic').map((t) => t.range)

describe('chunksOver — a chunk tokenizes as it does inside the whole document', () => {
  it('matches the whole-document tokens, chunk by chunk', () => {
    for (let seed = 1; seed <= 2000; seed++) {
      const r = stream(seed)
      const lines = Array.from({ length: 5 + Math.floor(r() * 40) }, () => pick(r, PROSE))
      const text = lines.join('\n')
      const scan = scanDoc(text)
      if (!sameFences(text, scan)) continue
      if (!isDeepStrictEqual(chunked(text), tokenize(text)))
        expect.fail(`seed ${seed}\n${JSON.stringify(text)}`)
    }
  }, 600_000)

  it('reads a reference its definition sits outside the chunk as text — pinned difference', () => {
    const text = '*a [b*][ref] c*\n\n[ref]: https://example.com'
    expect(italics(tokenize(text))).toEqual([[0, 15]])
    expect(italics(chunked(text))).toEqual([[0, 6]])
  })

  it('follows the scan where its fences and the parser’s disagree — pinned difference', () => {
    const text = '- a\n  ```\nb\n  ```\n\n*em*'
    expect(italics(tokenize(text))).toEqual([])
    expect(italics(chunked(text))).toEqual([[text.indexOf('*em*'), text.length]])
  })

  it('bounds a chunk where no cut line sits within reach of the lines asked for', () => {
    const prose = Array.from({ length: 1000 }, (_, i) => `line ${i}`)
    const lines = (s: DocScan, [a, b]: [number, number]): [number, number] => [
      s.lineStarts.indexOf(a),
      s.lineStarts.indexOf(b + 1),
    ]
    const flat = scanDoc(prose.join('\n'))
    expect(chunksOver(flat, [[300, 350]]).map((c) => lines(flat, c))).toEqual([[300, 351]])
    prose[250] = ''
    const cut = scanDoc(prose.join('\n'))
    expect(chunksOver(cut, [[300, 350]]).map((c) => lines(cut, c))).toEqual([[251, 351]])
    const block = (open: string, body: number): string =>
      [
        ...prose.slice(0, 100),
        open,
        ...prose.slice(0, body),
        open.slice(0, 3),
        ...prose.slice(0, 100),
      ].join('\n')
    const fenced = scanDoc(block('```js', 300))
    expect(chunksOver(fenced, [[90, 150]]).map((c) => lines(fenced, c))).toEqual([[90, 100]])
    expect(chunksOver(fenced, [[250, 420]]).map((c) => lines(fenced, c))).toEqual([[402, 421]])
    const math = scanDoc(block('$$', 80))
    expect(chunksOver(math, [[90, 150]]).map((c) => lines(math, c))).toEqual([[90, 182]])
    expect(chunksOver(math, [[160, 200]]).map((c) => lines(math, c))).toEqual([[100, 201]])
    const outline = scanDoc(
      ['- Notes', ...prose.slice(0, 200).map((l) => `\t- ${l} **b**`)].join('\n'),
    )
    const [[from]] = chunksOver(outline, [[100, 150]])
    expect(outline.lineStarts.indexOf(from)).toBe(0)
    expect(
      chunksOver(outline, [
        [0, 40],
        [40, 150],
      ]).map(([a]) => outline.lineStarts.indexOf(a)),
    ).toEqual([0])
  })
})

describe('a fence under a quoted list item', () => {
  it('opens code for the scan exactly where the parser reads code', () => {
    const text = '> [!note] Callout\n> - item\n>   ```\n>   npm i --save -[[Old]]\n>   ```\n> after'
    const scan = scanDoc(text)
    expect(sameFences(text, scan)).toBe(true)
    expect(inCodeAt(scan, text.indexOf('[[Old]]'))).toBe(true)
    expect(inCodeAt(scan, text.indexOf('after'))).toBe(false)
  })
})
