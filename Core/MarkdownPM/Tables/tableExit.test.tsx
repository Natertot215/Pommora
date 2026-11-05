// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { act } from 'react'
import { EditorView } from '@codemirror/view'
import { undo } from '@codemirror/commands'
import { type DismissalHandle, pushDismissal } from '@pommora/uix/Interactions/dismissalStack'
import {
  cleanupEditor,
  editorContainer,
  mountEditor,
  stubEditorBridge,
} from '../../Testing/editorHarness'

stubEditorBridge()
afterEach(cleanupEditor)

const TABLE = '| A |\n| --- |\n| x |'

async function pressInCell(
  row: number,
  key: string,
  shiftKey = false,
  inCell: (cell: EditorView) => void = () => {},
): Promise<void> {
  let table = editorContainer().querySelector('table.mdpm-tbl')
  for (let i = 0; !table && i < 50; i++) {
    await act(() => new Promise((r) => setTimeout(r, 20)))
    table = editorContainer().querySelector('table.mdpm-tbl')
  }
  if (!table) throw new Error('the table widget never rendered')
  const cell =
    row === 0
      ? table.querySelector('thead tr')!.children[0]
      : table.querySelector('tbody')!.children[row - 1].children[0]
  const div = cell.querySelector('.mdpm-tbl-cell-static') as HTMLElement
  const at = { bubbles: true, cancelable: true, button: 0, clientX: 4, clientY: 4 }
  await act(async () => {
    div.dispatchEvent(new MouseEvent('pointerdown', at))
    div.dispatchEvent(new MouseEvent('mousedown', at))
    div.dispatchEvent(new MouseEvent('click', { ...at, detail: 1 }))
  })
  const content = cell.querySelector('.cm-content') as HTMLElement
  await act(async () => {
    inCell(EditorView.findFromDOM(content)!)
    content.dispatchEvent(
      new KeyboardEvent('keydown', { key, shiftKey, bubbles: true, cancelable: true }),
    )
  })
}

const caret = (view: EditorView): number => view.state.selection.main.head

describe('leaving a table by keyboard lands on a real line, never the widget edge', () => {
  it('Enter on the last row seats the caret at the start of the line below', async () => {
    const view = await mountEditor({ initialBody: `${TABLE}\n\nafter` })
    await pressInCell(1, 'Enter')
    expect(caret(view)).toBe(TABLE.length + 1)
  })

  it('makes that line when the table ends the document, from Enter or Escape, outside the page’s history', async () => {
    const type = (cell: EditorView): void =>
      cell.dispatch({ changes: { from: cell.state.doc.length, insert: 'y' } })
    for (const key of ['Enter', 'Escape']) {
      const view = await mountEditor({ initialBody: TABLE })
      await pressInCell(1, key, false, type)
      expect(view.state.doc.toString()).toBe(`${TABLE.replace('x', 'xy')}\n`)
      expect(caret(view)).toBe(TABLE.length + 2)
      expect(view.hasFocus).toBe(true)
      undo(view)
      expect(view.state.doc.toString()).toBe(`${TABLE}\n`)
      await cleanupEditor()
    }
    const view = await mountEditor({ initialBody: TABLE })
    const above = vi.fn()
    let glance: DismissalHandle | undefined
    await pressInCell(1, 'Escape', false, () => {
      glance = pushDismissal({ layer: () => null, dismiss: above })
    })
    glance?.release()
    expect(above).toHaveBeenCalledTimes(1)
    expect(view.state.doc.toString()).toBe(TABLE)
  })

  it('Shift-Tab from the first cell seats the caret at the end of the line above', async () => {
    const view = await mountEditor({ initialBody: `before\n\n${TABLE}` })
    await pressInCell(0, 'Tab', true)
    expect(caret(view)).toBe('before\n'.length)
  })

  it('makes that line when the table opens the document', async () => {
    const view = await mountEditor({ initialBody: TABLE })
    await pressInCell(0, 'Tab', true)
    expect(view.state.doc.toString()).toBe(`\n${TABLE}`)
    expect(caret(view)).toBe(0)
  })
})
