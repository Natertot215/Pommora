// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { act } from 'react'
import { undo } from '@codemirror/commands'
import type { EditorView } from '@codemirror/view'
import { itemSelected } from '@pommora/uix/Menus/menu-base.css'
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

const highlighted = (): Element[] => [...rows()].filter((r) => r.classList.contains(itemSelected))

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

const marks = (): string[] =>
  [...document.querySelectorAll('.mdpm-block-menu .mdpm-autocomplete-match')].map(
    (m) => m.textContent ?? '',
  )

async function click(row: Element | undefined): Promise<void> {
  await act(async () => {
    row?.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }))
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
  it('shows the five sections and every row', async () => {
    const view = await open('')
    await type(view, '/')
    expect(pane()).toBeTruthy()
    const text = pane()?.textContent ?? ''
    for (const title of ['Headings', 'Lists', 'Link', 'Insert', 'Embed'])
      expect(text).toContain(title)
    expect(text).toContain('Footnote')
    expect(rows()).toHaveLength(19)
  })

  it('leaves the headings alone under a heading query', async () => {
    const view = await open('')
    await type(view, '/hea')
    const text = pane()?.textContent ?? ''
    expect(text).toContain('Headings')
    for (const title of ['Lists', 'Link', 'Insert', 'Embed']) expect(text).not.toContain(title)
    expect(rows()).toHaveLength(5)
  })

  it('keeps every row of a section whose title answers the query', async () => {
    const view = await open('')
    await type(view, '/embed')
    const text = pane()?.textContent ?? ''
    expect(text).toContain('Embed')
    for (const title of ['Headings', 'Lists', 'Link', 'Insert']) expect(text).not.toContain(title)
    expect(rows()).toHaveLength(2)
  })

  it('keeps all three link rows where only the title carries the query', async () => {
    const view = await open('')
    await type(view, '/link')
    expect(pane()?.textContent ?? '').toContain('Link')
    expect(rows()).toHaveLength(3)
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

  it('writes an empty connection and seats the caret between its brackets', async () => {
    const view = await open('')
    await type(view, '/conn')
    expect(rows()).toHaveLength(1)
    await press(view, 'Enter')
    expect(view.state.doc.toString()).toBe('[[]]')
    expect(view.state.selection.main.head).toBe(2)
    await act(async () => {
      undo(view)
    })
    expect(view.state.doc.toString()).toBe('')
  })

  it('seats an external link at its url', async () => {
    const view = await open('')
    await type(view, '/ext')
    expect(rows()).toHaveLength(1)
    await press(view, 'Enter')
    expect(view.state.doc.toString()).toBe('[]()')
    expect(view.state.selection.main.head).toBe(3)
  })

  it('seats a Markdown link at its text', async () => {
    const view = await open('')
    await type(view, '/mark')
    expect(rows()).toHaveLength(1)
    await press(view, 'Enter')
    expect(view.state.doc.toString()).toBe('[]()')
    expect(view.state.selection.main.head).toBe(1)
  })

  it('writes a table from its own query', async () => {
    const view = await open('')
    await type(view, '/tab')
    await press(view, 'Enter')
    const doc = view.state.doc.toString()
    expect(doc).toBe(serialize(emptyTable(3, 3)))
    expect(doc).not.toContain('/')
  })

  it('writes the table from a click on its row', async () => {
    const view = await open('')
    await type(view, '/tab')
    expect(rows()).toHaveLength(1)
    await click(rows()[0])
    const doc = view.state.doc.toString()
    expect(doc).toBe(serialize(emptyTable(3, 3)))
    expect(doc).not.toContain('/')
    await act(async () => {
      undo(view)
    })
    expect(view.state.doc.toString()).toBe('')
  })
})

describe('a row held through the closing animation picks nothing', () => {
  it('refuses the click that lands after Escape', async () => {
    const view = await open('')
    await type(view, '/')
    await press(view, 'Escape')
    expect(rows().length).toBeGreaterThan(0)
    await click(rows()[0])
    expect(view.state.doc.toString()).toBe('/')
  })

  it('refuses the click that lands after the query matched nothing', async () => {
    const view = await open('')
    await type(view, '/quo')
    expect(rows().length).toBeGreaterThan(0)
    await click(rows()[0])
    expect(view.state.doc.toString()).toBe('/quo')
  })
})

describe('the query is emphasized wherever it matched', () => {
  it('marks the matched word, not the start of the label', async () => {
    const view = await open('')
    await type(view, '/bl')
    expect(marks()).toEqual(['Bl', 'Bl'])
    expect(rows()[1]?.textContent).toBe('Code Block')
  })

  it('marks the heading as well as each row when the title matched', async () => {
    const view = await open('')
    await type(view, '/hea')
    expect(marks()).toEqual(['Hea', 'Hea', 'Hea', 'Hea', 'Hea', 'Hea'])
  })

  it('marks only the heading when the rows matched through their section', async () => {
    const view = await open('')
    await type(view, '/embed')
    expect(marks()).toEqual(['Embed'])
  })
})

describe('the typed query reads as unresolved syntax', () => {
  const spans = (view: EditorView, cls: string): string[] =>
    [...view.contentDOM.querySelectorAll(`.${cls}`)].map((s) => s.textContent ?? '')

  it('tones the slash as syntax and the query as a phantom', async () => {
    const view = await open('')
    await type(view, '/hea')
    expect(spans(view, 'md-phantom-syntax')).toEqual(['/'])
    expect(spans(view, 'md-connection-phantom')).toEqual(['hea'])
  })

  it('leaves a line that never held a slash alone', async () => {
    const view = await open('')
    await type(view, 'hea')
    expect(spans(view, 'md-phantom-syntax')).toEqual([])
    expect(spans(view, 'md-connection-phantom')).toEqual([])
  })
})

describe('the block menu opens with no row highlighted', () => {
  it('draws nothing as selected until an arrow moves the cursor', async () => {
    const view = await open('')
    await type(view, '/')
    expect(rows()).toHaveLength(19)
    expect(highlighted()).toHaveLength(0)
  })

  it('picks the first row on Return although nothing is highlighted', async () => {
    const view = await open('')
    await type(view, '/')
    await press(view, 'Enter')
    expect(view.state.doc.toString()).toBe('# ')
  })

  it('highlights the first row on the first ArrowDown', async () => {
    const view = await open('')
    await type(view, '/')
    await press(view, 'ArrowDown')
    expect(highlighted().map((r) => r.textContent)).toEqual(['Heading 1'])
  })

  it('holds the first row when ArrowUp answers that ArrowDown', async () => {
    const view = await open('')
    await type(view, '/')
    await press(view, 'ArrowDown')
    await press(view, 'ArrowUp')
    expect(highlighted().map((r) => r.textContent)).toEqual(['Heading 1'])
  })

  it('reaches the last row on an ArrowUp from the fresh open', async () => {
    const view = await open('')
    await type(view, '/')
    await press(view, 'ArrowUp')
    expect(highlighted().map((r) => r.textContent)).toEqual(['Webpage'])
  })
})
