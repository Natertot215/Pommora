// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { act } from 'react'
import { undo } from '@codemirror/commands'
import type { EditorView } from '@codemirror/view'
import { emptyTable } from '../Engine/Tables/model'
import { serialize } from '../Engine/Tables/codec'
import { cleanupEditor, mountEditor, stubEditorBridge } from '../editorHarness'

stubEditorBridge()
afterEach(async () => {
  await cleanupEditor()
})

const coords = { left: 10, right: 10, top: 10, bottom: 20 }

const pane = (): Element | null => document.querySelector('.mdpm-block-menu')
const rows = (): NodeListOf<Element> =>
  document.querySelectorAll('.mdpm-block-menu .mdpm-block-row')

async function open(initialBody: string, caret = initialBody.length): Promise<EditorView> {
  const view = await mountEditor({ initialBody })
  vi.spyOn(view, 'coordsAtPos').mockReturnValue(coords)
  await act(async () => {
    view.focus()
    view.dispatch({ selection: { anchor: caret } })
  })
  return view
}

async function type(view: EditorView, text: string): Promise<void> {
  for (const ch of text) {
    const head = view.state.selection.main.head
    await act(async () => {
      view.dispatch({
        changes: { from: head, insert: ch },
        selection: { anchor: head + 1 },
        userEvent: 'input',
      })
    })
  }
}

async function press(view: EditorView, key: string): Promise<void> {
  await act(async () => {
    view.contentDOM.dispatchEvent(
      new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }),
    )
  })
}

async function gone(): Promise<void> {
  const deadline = Date.now() + 2000
  while (pane() !== null && Date.now() < deadline)
    await act(async () => {
      await new Promise((r) => setTimeout(r, 20))
    })
}

describe('the block menu opens on the slash and narrows as it is typed', () => {
  it('shows the four sections and every row', async () => {
    const view = await open('')
    await type(view, '/')
    expect(pane()).toBeTruthy()
    const text = pane()?.textContent ?? ''
    for (const title of ['Headings', 'Lists', 'Insert', 'Embed']) expect(text).toContain(title)
    expect(text).toContain('Footnote')
    expect(rows()).toHaveLength(16)
  })

  it('leaves the headings alone under a heading query', async () => {
    const view = await open('')
    await type(view, '/hea')
    const text = pane()?.textContent ?? ''
    expect(text).toContain('Headings')
    for (const title of ['Lists', 'Insert', 'Embed']) expect(text).not.toContain(title)
    expect(rows()).toHaveLength(5)
  })

  it('closes on a space, which no query may hold', async () => {
    const view = await open('')
    await type(view, '/ ')
    await gone()
    expect(pane()).toBeNull()
  })

  it('closes on Escape and comes back with the next character', async () => {
    const view = await open('')
    await type(view, '/')
    await press(view, 'Escape')
    await gone()
    expect(pane()).toBeNull()
    await type(view, 'h')
    expect(pane()).toBeTruthy()
  })

  it('never opens inside a code fence', async () => {
    const view = await open('```\n')
    await type(view, '/')
    expect(pane()).toBeNull()
  })
})

describe('picking a row writes the block and leaves one undo step', () => {
  it('writes the highlighted heading and takes the query with it', async () => {
    const view = await open('')
    await type(view, '/')
    await press(view, 'ArrowDown')
    await press(view, 'Enter')
    expect(view.state.doc.toString()).toBe('## ')
    await gone()
    expect(pane()).toBeNull()
    await act(async () => {
      undo(view)
    })
    expect(view.state.doc.toString()).toBe('')
  })

  it('writes a table from its own query', async () => {
    const view = await open('')
    await type(view, '/tab')
    await press(view, 'Enter')
    const doc = view.state.doc.toString()
    expect(doc).toBe(serialize(emptyTable(3, 3)))
    expect(doc).not.toContain('/')
  })
})
