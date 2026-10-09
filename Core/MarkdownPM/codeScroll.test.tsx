// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { act } from 'react'
import { EditorState } from '@codemirror/state'
import type { EditorView } from '@codemirror/view'
import { cleanupEditor, mountEditor, stubEditorBridge, testHost } from '../Testing/editorHarness'
import { editorHost } from './api'
import { codeLanguage } from './codeHighlight'
import { codeScroll, codeScrolls } from './codeScroll'

// jsdom has no canvas; a block's overflow is read through a 2d context's text measure.
HTMLCanvasElement.prototype.getContext = (() => ({
  font: '',
  measureText: (s: string) => ({ width: s.length * 8 }),
})) as unknown as typeof HTMLCanvasElement.prototype.getContext
stubEditorBridge()
afterEach(async () => {
  await cleanupEditor()
})

const scrolling = { host: { settings: { codeblockScroll: true } } }
const runs = (view: EditorView) => [
  ...view.contentDOM.querySelectorAll<HTMLElement>('.codeblock-run'),
]
const lineOf = (view: EditorView, code: string) =>
  runs(view)
    .find((r) => r.textContent === code)!
    .closest<HTMLElement>('.cm-line')!

describe('a code line’s run', () => {
  it('holds the line’s code under the label face, and keeps the syntax spans once its language loads', async () => {
    const view = await mountEditor({ initialBody: '```ts\nconst a = 1\n```', ...scrolling })
    const [run, ...rest] = runs(view)
    expect(rest).toEqual([])
    expect(run.matches('.codeblock-run.scroll-fade-x.over-scroll-ellipsis')).toBe(true)
    expect(run.textContent).toBe('const a = 1')
    expect(run.firstElementChild?.matches('.codeblock-ink')).toBe(true)
    await act(async () => {
      await codeLanguage('ts')?.load()
    })
    expect(runs(view)[0].querySelector('span')).not.toBeNull()
  })

  it('sits on content lines alone, and nowhere with the setting off', async () => {
    const view = await mountEditor({ initialBody: '```ts\nx\n```', ...scrolling })
    expect(runs(view).map((r) => view.posAtDOM(r))).toEqual([view.state.doc.line(2).from])
    await cleanupEditor()
    expect(runs(await mountEditor({ initialBody: '```ts\nx\n```' }))).toEqual([])
  })

  it('starts past a diff line’s sign', async () => {
    const view = await mountEditor({ initialBody: '```diff\n+x\n```', ...scrolling })
    expect(runs(view).map((r) => r.textContent)).toEqual(['x'])
  })

  it('reveals the block the focused caret stands in, and no other', async () => {
    const body = '```ts\na\n```\n\n```ts\nb\n```'
    const view = await mountEditor({ initialBody: body, ...scrolling })
    await act(async () => {
      view.focus()
      view.dispatch({ selection: { anchor: body.indexOf('a') } })
    })
    expect(lineOf(view, 'a').matches('.codeblock-revealed')).toBe(true)
    expect(lineOf(view, 'b').matches('.codeblock-revealed')).toBe(false)
  })
})

describe('a block’s offset', () => {
  const body = '```ts\na\n```\n\n```ts\nb\n```'
  const second = body.lastIndexOf('```ts')
  const state = (doc: string, json: [number, number][]) =>
    EditorState.fromJSON(
      { doc, selection: { ranges: [{ anchor: 0, head: 0 }], main: 0 }, codeScroll: json },
      {
        extensions: [editorHost.of(testHost({ settings: { codeblockScroll: true } })), codeScroll],
      },
      { codeScroll: codeScrolls },
    )
  const pairs = (s: EditorState) => s.toJSON({ codeScroll: codeScrolls }).codeScroll

  it('restores from its warm pair', () => {
    expect(pairs(state(body, [[second, 40]]))).toEqual([[second, 40]])
  })

  it('moves with a line inserted above and with an Enter at its opening line’s start', () => {
    const s = state(body, [[second, 40]])
    expect(pairs(s.update({ changes: { from: 0, insert: 'x\n' } }).state)).toEqual([
      [second + 2, 40],
    ])
    expect(pairs(s.update({ changes: { from: second, insert: '\n' } }).state)).toEqual([
      [second + 1, 40],
    ])
  })

  it('drops once no fence opens at its key', () => {
    const s = state(body, [[second, 40]])
    expect(pairs(s.update({ changes: { from: second, to: second + 3 } }).state)).toEqual([])
  })

  it('rides the warm capture back onto the block’s lines', async () => {
    const view = await mountEditor({
      initialBody: body,
      ...scrolling,
      warm: {
        restore: () => ({
          editorState: state(body, [[second, 30]]).toJSON({ codeScroll: codeScrolls }),
          scrollTop: 0,
        }),
        capture: vi.fn(),
      },
    })
    expect(lineOf(view, 'b').style.getPropertyValue('--code-scroll')).toBe('30px')
  })
})
