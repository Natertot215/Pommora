// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { act } from 'react'
import { EditorSelection } from '@codemirror/state'
import { EditorView } from '@codemirror/view'
import { cleanupEditor, mountEditor, stubEditorBridge } from '../Testing/editorHarness'

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

describe('a diff fence’s tally', () => {
  const doc = '```diff\n+a\n+b\n-c\n```'
  const pill = (view: { contentDOM: HTMLElement }) =>
    view.contentDOM.querySelector('.codeblock-tally-counts')?.textContent

  it('reads its net change, then added over removed', async () => {
    expect(pill(await mountEditor({ initialBody: doc }))).toBe('+1+2 / −1')
  })

  it('recounts when a line changes sign', async () => {
    const view = await mountEditor({ initialBody: doc })
    const at = view.state.doc.toString().indexOf('-c')
    await act(async () => view.dispatch({ changes: { from: at, to: at + 1, insert: '+' } }))
    expect(pill(view)).toBe('+3+3 / −0')
  })
})

describe('a diff fence’s caret', () => {
  const doc = '```diff\n+a\n-b\n```'
  const seat = doc.indexOf('+a') + 1
  const put = (view: EditorView, pos: number, assoc: number, userEvent: string) =>
    view.dispatch({
      selection: EditorSelection.create([EditorSelection.cursor(pos, assoc)]),
      userEvent,
    })
  const caret = (view: EditorView) => {
    const { head, assoc } = view.state.selection.main
    return { head, side: assoc }
  }
  const type = (view: EditorView, text: string) => {
    const { from } = view.state.selection.main
    const insert = () =>
      view.state.update({
        changes: { from, insert: text },
        selection: { anchor: from + 1 },
        userEvent: 'input.type',
      })
    if (!view.state.facet(EditorView.inputHandler).some((h) => h(view, from, from, text, insert)))
      view.dispatch(insert())
  }

  it('seats at the code’s start, never before a sign', async () => {
    const view = await mountEditor({ initialBody: doc })
    put(view, seat - 1, 0, 'select')
    expect(caret(view)).toEqual({ head: seat, side: 1 })
    put(view, seat, -1, 'select')
    expect(caret(view)).toEqual({ head: seat, side: 1 })
  })

  it('stands in the margin only when brought there, and keeps it through an edit made from it', async () => {
    const view = await mountEditor({ initialBody: doc })
    put(view, seat, -1, 'select.margin')
    expect(caret(view)).toEqual({ head: seat, side: -1 })
    view.dispatch({ changes: { from: seat - 1, to: seat }, userEvent: 'delete.backward' })
    expect(caret(view)).toEqual({ head: seat - 1, side: -1 })
  })

  it('lands an edit made from the code on the code’s side of a new line', async () => {
    const view = await mountEditor({ initialBody: doc })
    put(view, seat + 1, -1, 'select')
    view.dispatch({
      changes: { from: seat + 1, insert: '\n+' },
      selection: { anchor: seat + 3 },
      userEvent: 'input',
    })
    expect(caret(view)).toEqual({ head: seat + 3, side: 1 })
  })

  it('takes only a sign in the margin, and anything at the code’s start', async () => {
    const view = await mountEditor({ initialBody: doc })
    put(view, seat, -1, 'select.margin')
    type(view, 'x')
    expect(view.state.doc.toString()).toBe(doc)
    type(view, '-')
    expect(view.state.doc.toString()).toBe(doc.replace('+a', '-a'))
    expect(caret(view)).toEqual({ head: seat, side: -1 })
    put(view, seat, 1, 'select')
    type(view, 'x')
    expect(view.state.doc.toString()).toBe(doc.replace('+a', '-xa'))
  })
})
