// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { act } from 'react'
import { EditorSelection, EditorState } from '@codemirror/state'
import { EditorView, runScopeHandlers } from '@codemirror/view'
import { cleanupEditor, mountEditor, stubEditorBridge } from '../Testing/editorHarness'
import { codeLanguage } from './codeHighlight'
import { markdownDecorations } from './decorations'

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

  it('lands an edit that opens a new line on the code’s side, from the code or the margin', async () => {
    const view = await mountEditor({ initialBody: doc })
    for (const [from, side, userEvent] of [
      [seat + 1, -1, 'select'],
      [seat, -1, 'select.margin'],
    ] as const) {
      put(view, from, side, userEvent)
      const end = seat + 1
      view.dispatch({
        changes: { from: end, insert: '\n+' },
        selection: { anchor: end + 2 },
        userEvent: 'input',
      })
      expect(caret(view)).toEqual({ head: end + 2, side: 1 })
      view.dispatch({ changes: { from: end, to: end + 2 } })
    }
  })

  it('draws a selection’s head at a seat on the code’s side, and a caret on the side a pointer put it', async () => {
    const view = await mountEditor({ initialBody: doc })
    const next = doc.indexOf('-b') + 1
    view.dispatch({
      selection: EditorSelection.create([EditorSelection.range(seat + 1, next)]),
      userEvent: 'select.extend',
    })
    expect(caret(view)).toEqual({ head: next, side: 1 })
    put(view, seat, -1, 'select.pointer')
    expect(caret(view)).toEqual({ head: seat, side: -1 })
    put(view, seat, 1, 'select.pointer')
    expect(caret(view)).toEqual({ head: seat, side: 1 })
  })

  it('belongs to the page alone, so a cell keeps the side it was given', () => {
    const side = (scope: 'page' | 'cell') =>
      EditorState.create({ doc, extensions: markdownDecorations(() => undefined, scope) }).update({
        selection: EditorSelection.create([EditorSelection.cursor(seat, -1)]),
        userEvent: 'select',
      }).state.selection.main.assoc
    expect(side('page')).toBe(1)
    expect(side('cell')).toBe(-1)
  })

  it('takes only a sign in the margin, and anything at the code’s start', async () => {
    const view = await mountEditor({ initialBody: doc })
    put(view, seat, -1, 'select.margin')
    type(view, 'x')
    expect(view.state.doc.toString()).toBe(doc)
    type(view, '-')
    expect(view.state.doc.toString()).toBe(doc.replace('+a', '-a'))
    expect(caret(view)).toEqual({ head: seat, side: -1 })
    const signed = view.state
    type(view, 'ab')
    type(view, '-')
    expect(view.state).toBe(signed)
    put(view, seat, 1, 'select')
    type(view, 'x')
    expect(view.state.doc.toString()).toBe(doc.replace('+a', '-xa'))
  })
})

describe('a diff fence’s Enter', () => {
  const mod = /Mac/.test(navigator.platform) ? { metaKey: true } : { ctrlKey: true }
  const enter = async (body: string, at: number, mods = {}) => {
    await codeLanguage('ts')?.load()
    const view = await mountEditor({ initialBody: body })
    view.dispatch({ selection: { anchor: at } })
    runScopeHandlers(view, new KeyboardEvent('keydown', { key: 'Enter', ...mods }), 'editor')
    const { head } = view.state.selection.main
    return { doc: view.state.doc.toString(), head }
  }

  it('carries the sign to the new line, indented as the language reads the code past it', async () => {
    const body = '```diff-ts\n+if (a) {\n-let b = 2\n```'
    const at = body.indexOf('{') + 1
    const out = await enter(body, at)
    expect(out.doc).toBe(body.replace('{\n', '{\n+  \n'))
    expect(out.head).toBe(at + 4)
    const flat = '```diff-ts\n+let a = 1\n-let b = 2\n```'
    expect((await enter(flat, flat.indexOf(' = 1') + 4)).doc).toBe(
      flat.replace('= 1\n', '= 1\n+\n'),
    )
  })

  it('signs every line a break between brackets opens, behind the fence’s quote', async () => {
    const body = '> ```diff-ts\n> +f({})\n> ```'
    const out = await enter(body, body.indexOf('{}') + 1)
    expect(out.doc).toBe('> ```diff-ts\n> +f({\n> +  \n> +})\n> ```')
  })

  it('opens the signed line below on Mod-Enter, wherever the caret stands in the line', async () => {
    const body = '```diff-ts\n+if (a) {\n```'
    const out = await enter(body, body.indexOf('(a)'), mod)
    expect(out.doc).toBe('```diff-ts\n+if (a) {\n+  \n```')
  })

  it('leaves a header’s and a plain block’s Enter to the editor', async () => {
    expect((await enter('```diff\n@@ h @@\n```', 15)).doc).toBe('```diff\n@@ h @@\n\n```')
    expect((await enter('```ts\nif (a) {\n```', 14)).doc).toBe('```ts\nif (a) {\n  \n```')
  })
})

describe('a diff fence’s margin', () => {
  it('refuses a paste, which lands at the code’s start', async () => {
    const doc = '```diff\n+a\n```'
    const seat = doc.indexOf('+a') + 1
    const view = await mountEditor({ initialBody: doc })
    const paste = () =>
      view.dispatch({ changes: { from: seat, insert: 'zz' }, userEvent: 'input.paste' })
    view.dispatch({
      selection: EditorSelection.create([EditorSelection.cursor(seat, -1)]),
      userEvent: 'select.margin',
    })
    paste()
    expect(view.state.doc.toString()).toBe(doc)
    view.dispatch({
      selection: EditorSelection.create([EditorSelection.cursor(seat, 1)]),
      userEvent: 'select',
    })
    paste()
    expect(view.state.doc.toString()).toBe(doc.replace('+a', '+zza'))
  })
})
