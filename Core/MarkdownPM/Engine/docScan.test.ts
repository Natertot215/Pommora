import { isDeepStrictEqual } from 'node:util'
import { describe, expect, it } from 'vitest'
import { type DocScan, rescan, scanDoc } from './docScan'
import { docLineIntents, stepLineIntents } from './intents'

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

const dense = ({ fresh, ...s }: DocScan): Record<string, unknown> => ({
  ...s,
  fences: Array.from(s.fences),
  callouts: Array.from(s.callouts),
})

function mismatch(a: DocScan, b: DocScan): string | null {
  const x = dense(a)
  const y = dense(b)
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
