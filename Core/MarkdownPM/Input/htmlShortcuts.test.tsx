// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { forceParsing } from '@codemirror/language'
import { EditorView, runScopeHandlers } from '@codemirror/view'
import {
  cleanupEditor,
  harnessState,
  mountEditor,
  rerenderEditor,
  stubEditorBridge,
} from '../../Testing/editorHarness'

stubEditorBridge()

afterEach(async () => {
  await cleanupEditor()
})

const props = { initialBody: 'hello world\n<div' }

function typeClose(view: EditorView): void {
  const at = view.state.doc.length
  view.dispatch({ selection: { anchor: at } })
  forceParsing(view, at, 1000)
  const insert = () =>
    view.state.update({ changes: { from: at, insert: '>' }, selection: { anchor: at + 1 } })
  const handled = view.state
    .facet(EditorView.inputHandler)
    .some((h) => h(view, at, at, '>', insert))
  if (!handled) view.dispatch(insert())
}

function pressComment(view: EditorView): void {
  view.dispatch({ selection: { anchor: 1 } })
  const mod = /Mac/.test(navigator.platform) ? { metaKey: true } : { ctrlKey: true }
  runScopeHandlers(view, new KeyboardEvent('keydown', { key: '/', ...mod }), 'editor')
}

async function withShortcuts(on: boolean): Promise<EditorView> {
  const view = await mountEditor(props)
  harnessState().settings = { ...harnessState().settings, htmlShortcuts: on }
  await rerenderEditor(props)
  return view
}

describe('HTML Shortcuts', () => {
  it('off, a typed tag stays as written and the comment chord does nothing', async () => {
    const view = await withShortcuts(false)
    typeClose(view)
    pressComment(view)
    expect(view.state.doc.toString()).toBe('hello world\n<div>')
  })

  it('on, a typed tag closes and the comment chord comments the line', async () => {
    const view = await withShortcuts(true)
    typeClose(view)
    pressComment(view)
    expect(view.state.doc.toString()).toBe('<!-- hello world -->\n<div></div>')
  })

  it('turned back off, both stop', async () => {
    const view = await withShortcuts(true)
    harnessState().settings = { ...harnessState().settings, htmlShortcuts: false }
    await rerenderEditor(props)
    typeClose(view)
    pressComment(view)
    expect(view.state.doc.toString()).toBe('hello world\n<div>')
  })
})
