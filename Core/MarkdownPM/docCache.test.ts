// @vitest-environment jsdom
import { isDeepStrictEqual } from 'node:util'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { undo } from '@codemirror/commands'
import type { EditorView } from '@codemirror/view'
import { EditorState, type RangeSet, type RangeValue } from '@codemirror/state'
import { cleanupEditor, mountEditor, stubEditorBridge } from './editorHarness'
import { docLineIntentsOf, docScan } from './docCache'
import { docAtomics, markdownDecorations } from './decorations'
import { docLineIntents } from './Engine/intents'
import { scanDoc } from './Engine/docScan'

vi.mock('./Engine/docScan', async (original) => {
  const m = await original<typeof import('./Engine/docScan')>()
  return { ...m, scanDoc: vi.fn(m.scanDoc) }
})

class ResizeObserverStub {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}
;(globalThis as { ResizeObserver?: unknown }).ResizeObserver = ResizeObserverStub
stubEditorBridge()

afterEach(async () => {
  await cleanupEditor()
})

const BODY = [
  '# Title',
  '',
  'Intro with a note[^1] and `code`.',
  '',
  '- one',
  '- [ ] two',
  '  - nested',
  '',
  '> [!note] Callout',
  '> body',
  '',
  '| a | b |',
  '| --- | --- |',
  '| 1 | 2 |',
  '',
  '```js',
  'const x = 1',
  '```',
  '',
  '$$',
  'x^2',
  '$$',
  '',
  'Closing prose.',
  '',
  '[^1]: The note.',
].join('\n')

const EDITS: ((doc: string) => { from: number; to?: number; insert: string })[] = [
  (d) => ({ from: d.indexOf('Intro'), insert: 'x' }),
  (d) => ({ from: d.indexOf('- one') + 5, insert: '\n- inserted' }),
  (d) => ({ from: d.indexOf('const'), to: d.indexOf('const') + 5, insert: 'let' }),
  (d) => ({ from: d.indexOf('Closing'), insert: 'See[^2] ' }),
  (d) => ({ from: d.length, insert: '\n[^2]: Second.' }),
  (d) => ({ from: d.indexOf('| 1 |') + 2, insert: '9' }),
  (d) => ({ from: d.indexOf('x^2'), insert: '$$\n' }),
  (d) => ({ from: d.indexOf('> body') + 6, insert: '\n> more' }),
  (d) => ({ from: d.indexOf('\n\n'), to: d.indexOf('\n\n') + 1, insert: '' }),
  (d) => ({ from: d.indexOf('Intro'), insert: 'A new note[^0] first. ' }),
]

const ranges = <T extends RangeValue>(set: RangeSet<T>): [number, number][] => {
  const out: [number, number][] = []
  for (let c = set.iter(); c.value; c.next()) out.push([c.from, c.to])
  return out
}

const fullScans = (): number => vi.mocked(scanDoc).mock.calls.length

function type(view: EditorView, e: { from: number; to?: number; insert: string }): void {
  view.dispatch({
    changes: { from: e.from, to: e.to ?? e.from, insert: e.insert },
    userEvent: 'input.type',
  })
}

describe('docCache — every version steps from the last', () => {
  it('scans the document whole once, however it is then typed, undone, or rewritten', async () => {
    const view = await mountEditor({ initialBody: BODY })
    expect(fullScans()).toBeGreaterThan(0)
    vi.mocked(scanDoc).mockClear()
    const versions = new Set<string>()
    for (const edit of EDITS) {
      type(view, edit(view.state.doc.toString()))
      versions.add(view.state.doc.toString())
    }
    for (let k = 0; k < 4; k++) undo(view)
    const whole = vi
      .mocked(scanDoc)
      .mock.calls.filter(([text]) => versions.has(text) || text === BODY)
    expect(whole).toEqual([])
  })

  it('steps the scan, the intents, and the atomics to what a fresh derivation reads', async () => {
    const view = await mountEditor({ initialBody: BODY })
    const dense = ({ fresh, ...s }: ReturnType<typeof scanDoc>): Record<string, unknown> => ({
      ...s,
      fences: Array.from(s.fences),
      callouts: Array.from(s.callouts),
    })
    const agrees = (): void => {
      const doc = view.state.doc
      const whole = scanDoc(doc.toString())
      const stepped = dense(docScan(doc))
      const derived = dense(whole)
      expect(
        Object.keys(derived).filter((k) => !isDeepStrictEqual(stepped[k], derived[k])),
      ).toEqual([])
      const { fresh: _a, ...intents } = docLineIntentsOf(doc)
      const { fresh: _b, ...wholeIntents } = docLineIntents(whole)
      expect(isDeepStrictEqual(intents, wholeIntents)).toBe(true)
      const atomics = wholeIntents.perLine.flatMap((line) =>
        line.flatMap((it): [number, number][] =>
          it.kind === 'atomic' && it.to > it.from ? [[it.from, it.to]] : [],
        ),
      )
      expect(ranges(docAtomics(doc))).toEqual(atomics.sort((x, y) => x[0] - y[0] || x[1] - y[1]))
    }
    for (const edit of EDITS) {
      type(view, edit(view.state.doc.toString()))
      agrees()
    }
    for (let k = 0; k < EDITS.length; k++) {
      undo(view)
      agrees()
    }
  })

  it('steps the atomics through random edits to the set a fresh derivation builds', () => {
    const PIECES = [
      '- ',
      '- [ ] ',
      '  - ',
      '1. ',
      '→ ',
      '> [!note] ',
      '> ',
      '[^1]',
      '[^2]',
      '\n[^1]: n',
      '\n',
      'x',
      '$$\n',
      '```\n',
    ]
    for (const scope of ['page', 'cell'] as const) {
      let seed = 7
      const next = (k: number): number => {
        seed = (seed * 1103515245 + 12345) % 2147483648
        return seed % k
      }
      let state = EditorState.create({
        doc: BODY,
        extensions: markdownDecorations(() => undefined, scope),
      })
      docAtomics(state.doc, scope)
      for (let step = 0; step < 600; step++) {
        const len = state.doc.length
        const from = next(len + 1)
        const to = next(3) === 0 ? Math.min(len, from + next(6)) : from
        state = state.update({
          changes: {
            from,
            to,
            insert: to > from && next(2) === 0 ? '' : PIECES[next(PIECES.length)],
          },
        }).state
        const whole = docLineIntents(scanDoc(state.doc.toString()), scope).perLine.flatMap((line) =>
          line.flatMap((it): [number, number][] =>
            it.kind === 'atomic' && it.to > it.from ? [[it.from, it.to]] : [],
          ),
        )
        expect(ranges(docAtomics(state.doc, scope)), `${scope} step ${step}`).toEqual(
          whole.sort((x, y) => x[0] - y[0] || x[1] - y[1]),
        )
      }
    }
  })
})
