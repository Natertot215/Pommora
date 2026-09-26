// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act } from 'react'
import type { EditorView } from '@codemirror/view'
import type { TableMenuAction, TableMenuContext } from './tableMenu'
import {
  cleanupEditor,
  editorContainer,
  mountEditor,
  seedHost,
  stubEditorBridge,
} from '../editorHarness'
import { docScan } from '../docCache'
import { modelFromRegion } from '../Engine/Tables/regions'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
if (!('ResizeObserver' in globalThis)) {
  ;(globalThis as { ResizeObserver?: unknown }).ResizeObserver = class {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
  }
}

stubEditorBridge()
const table = vi.fn<(ctx: TableMenuContext) => Promise<TableMenuAction | null>>()
const write = vi.fn(async (_text: string) => {})
beforeEach(() => {
  table.mockReset()
  write.mockClear()
  seedHost({ menus: { table }, clipboard: { write } })
})
afterEach(async () => {
  seedHost({})
  await cleanupEditor()
})

const TABLE = '| A | B |\n| --- | --- |\n| c1 | c2 |\n| d1 | d2 |'

async function rightClickGrip(axis: 'row' | 'col', i: number): Promise<void> {
  let grip: Element | undefined
  for (let n = 0; !grip && n < 50; n++) {
    grip = editorContainer().querySelectorAll(`.mdpm-tbl-grip-${axis}`)[i]
    if (!grip) await act(() => new Promise((r) => setTimeout(r, 20)))
  }
  if (!grip) throw new Error(`no ${axis} grip ${i}`)
  await act(async () => {
    grip.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true }))
    await new Promise((r) => setTimeout(r, 0))
  })
}

const modelOf = (view: EditorView) => modelFromRegion(docScan(view.state.doc).tables[0])

async function pick(action: TableMenuAction, axis: 'row' | 'col', i: number, body = TABLE) {
  table.mockResolvedValue(action)
  const view = await mountEditor({ initialBody: body })
  await rightClickGrip(axis, i)
  return view
}

describe('the table grip menu', () => {
  it('deletes the body row its grip sits on', async () => {
    const view = await pick('row:delete', 'row', 1)
    expect(table).toHaveBeenCalledWith({ kind: 'row', index: 1 })
    expect(modelOf(view).rows).toEqual([['d1', 'd2']])
  })

  it('inserts a row above its grip', async () => {
    const view = await pick('row:insert-above', 'row', 2)
    expect(modelOf(view).rows).toEqual([
      ['c1', 'c2'],
      ['', ''],
      ['d1', 'd2'],
    ])
  })

  it('inserts a row below its grip', async () => {
    const view = await pick('row:insert-below', 'row', 1)
    expect(modelOf(view).rows).toEqual([
      ['c1', 'c2'],
      ['', ''],
      ['d1', 'd2'],
    ])
  })

  it('clears a row', async () => {
    const view = await pick('row:clear', 'row', 2)
    expect(modelOf(view).rows).toEqual([
      ['c1', 'c2'],
      ['', ''],
    ])
  })

  it('deletes a column', async () => {
    const view = await pick('col:delete', 'col', 0)
    expect(modelOf(view).header).toEqual(['B'])
    expect(modelOf(view).rows).toEqual([['c2'], ['d2']])
  })

  it('removes the whole table when its last column goes', async () => {
    const view = await pick('col:delete', 'col', 0, 'before\n\n| A |\n| --- |\n| x |\n\nafter')
    expect(docScan(view.state.doc).tables).toHaveLength(0)
    expect(view.state.doc.toString()).not.toContain('|')
  })

  it('copies a row without touching the document', async () => {
    const view = await pick('row:copy', 'row', 2)
    expect(write).toHaveBeenCalledWith('| d1 | d2 |')
    expect(view.state.doc.toString()).toBe(TABLE)
  })

  it('stands down when the table changed while the menu was open', async () => {
    let answer: (a: TableMenuAction) => void = () => {}
    table.mockImplementation(() => new Promise((r) => (answer = r)))
    const view = await mountEditor({ initialBody: TABLE })
    await rightClickGrip('row', 1)
    await act(async () => {
      view.dispatch({ changes: { from: 0, insert: '| Z |\n| --- |\n| z |\n\n' } })
    })
    const before = view.state.doc.toString()
    await act(async () => {
      answer('row:delete')
      await new Promise((r) => setTimeout(r, 0))
    })
    expect(view.state.doc.toString()).toBe(before)
  })
})
