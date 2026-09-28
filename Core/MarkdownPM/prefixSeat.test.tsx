// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { act } from 'react'
import { EditorView, runScopeHandlers } from '@codemirror/view'
import { cleanupEditor, mountEditor, stubEditorBridge } from '../Testing/editorHarness'

stubEditorBridge()
afterEach(async () => {
  await cleanupEditor()
})

async function press(view: EditorView, key: string, mods: KeyboardEventInit = {}): Promise<void> {
  await act(async () => {
    runScopeHandlers(view, new KeyboardEvent('keydown', { key, ...mods }), 'editor')
  })
}

async function type(view: EditorView, text: string): Promise<void> {
  for (const ch of text)
    await act(async () => {
      const at = view.state.selection.main.head
      const insert = () =>
        view.state.update({
          changes: { from: at, insert: ch },
          selection: { anchor: at + 1 },
          userEvent: 'input.type',
        })
      if (!view.state.facet(EditorView.inputHandler).some((h) => h(view, at, at, ch, insert)))
        view.dispatch(insert())
    })
}

async function open(doc: string, caret: number): Promise<EditorView> {
  const view = await mountEditor({ initialBody: doc })
  await act(async () => {
    view.focus()
    view.dispatch({ selection: { anchor: caret } })
  })
  return view
}

const CASES = [
  ['a quote', 'intro\n\n> hello\n> world', 'world'],
  ['a nested quote', 'intro\n\n> > deep\n> > line', 'line'],
  ['a callout body', 'intro\n\n> [!note] Head\n> body', 'body'],
  ['a quoted fence', 'intro\n\n> ```\n> code\n> ```', 'code'],
  ['a list-indented fence', '- item\n  ```\n  code\n  ```', 'code'],
] as const

describe('the caret never rests in a hidden line prefix', () => {
  for (const [name, doc, word] of CASES) {
    const visible = doc.indexOf(word)
    const lineStart = doc.lastIndexOf('\n', visible) + 1

    it(`one step left from ${name}'s visible start is the line above`, async () => {
      const view = await open(doc, visible)
      await press(view, 'ArrowLeft')
      expect(view.state.selection.main.head).toBe(lineStart - 1)
      await press(view, 'ArrowRight')
      expect(view.state.selection.main.head).toBe(visible)
    })

    it(`a caret landing inside ${name}'s prefix takes its visible start, and typing lands there`, async () => {
      const view = await open(doc, lineStart)
      expect(view.state.selection.main.head).toBe(visible)
      await act(async () => {
        view.dispatch({ selection: { anchor: lineStart + 1 } })
      })
      await type(view, 'X')
      expect(view.state.doc.toString()).toBe(`${doc.slice(0, visible)}X${doc.slice(visible)}`)
    })

    it(`Home on ${name} goes to its visible start`, async () => {
      const view = await open(doc, visible + 2)
      await press(view, 'Home')
      expect(view.state.selection.main.head).toBe(visible)
    })
  }
})

describe('a quote continued with Enter', () => {
  it('writes the next line inside the quote with nothing hidden or doubled', async () => {
    const view = await open('', 0)
    await type(view, '> hello')
    await press(view, 'Enter')
    await type(view, 'world')
    expect(view.state.doc.toString()).toBe('> hello\n> world')
    expect(view.state.selection.main.head).toBe(view.state.doc.length)
  })
})

describe('the rule holds where a widget draws over the prefix, and for every way left', () => {
  it('Home on a quoted or callout bullet seats at its marker, keeping the line in its box', async () => {
    for (const doc of ['intro\n> - item', 'intro\n> [!note] Head\n> - item']) {
      const view = await open(doc, doc.length)
      await press(view, 'Home')
      await type(view, 'Z')
      expect(view.state.doc.toString()).toBe(doc.replace(/> - item$/, '> Z- item'))
      await cleanupEditor()
    }
  })

  it('Home on a quoted rule seats past its prefix', async () => {
    const view = await open('intro\n> ---', 'intro\n> ---'.length)
    await press(view, 'Home')
    expect(view.state.selection.main.head).toBe('intro\n> '.length)
  })

  it('an edit that leaves the caret inside a prefix seats it at the visible start', async () => {
    const view = await open('a[^1]\n\n[^1] one', 'a[^1]\n\n[^1]'.length)
    await type(view, ':')
    expect(view.state.doc.toString()).toBe('a[^1]\n\n[^1]: one')
    expect(view.state.selection.main.head).toBe('a[^1]\n\n[^1]: '.length)
  })

  it('a word step left from the visible start leaves the line', async () => {
    const doc = 'intro\n> hello\n> world'
    const view = await open(doc, doc.indexOf('world'))
    await press(view, 'ArrowLeft', { ctrlKey: true })
    expect(view.state.selection.main.head).toBe(doc.indexOf('\n> world'))
  })

  it('Shift+ArrowLeft and Shift+Home never select the hidden prefix alone', async () => {
    const doc = 'intro\n> hello\n> world'
    const view = await open(doc, doc.indexOf('world'))
    await press(view, 'ArrowLeft', { shiftKey: true })
    expect(view.state.selection.main).toMatchObject({
      anchor: doc.indexOf('world'),
      head: doc.indexOf('\n> world'),
    })
    await act(async () => {
      view.dispatch({ selection: { anchor: doc.indexOf('world') + 3 } })
    })
    await press(view, 'Home', { shiftKey: true })
    expect(view.state.selection.main.head).toBe(doc.indexOf('world'))
  })
})
