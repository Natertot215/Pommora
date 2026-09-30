// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { act } from 'react'
import { EditorView } from '@codemirror/view'
import type { ConnectionsApi } from '../Links/connectionsApi'
import { buildPageIndex } from '../../Connections/pageIndex'
import {
  cleanupEditor,
  editorContainer,
  mountEditor,
  seedHost,
  stubEditorBridge,
} from '../../Testing/editorHarness'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
if (!('ResizeObserver' in globalThis)) {
  ;(globalThis as { ResizeObserver?: unknown }).ResizeObserver = class {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
  }
}

stubEditorBridge()
afterEach(async () => {
  seedHost({})
  await cleanupEditor()
})

const headingConn: ConnectionsApi = {
  ...buildPageIndex([{ id: 'pNotes', title: 'Notes', path: 'Notes.md' }]),
  open: () => {},
}
const coords = { left: 10, right: 10, top: 10, bottom: 20 }
const table = (cell: string): string => `| A |\n| --- |\n| ${cell} |`

async function tableEl(): Promise<Element> {
  let el = editorContainer().querySelector('table.mdpm-tbl')
  for (let i = 0; !el && i < 50; i++) {
    await act(() => new Promise((r) => setTimeout(r, 20)))
    el = editorContainer().querySelector('table.mdpm-tbl')
  }
  if (!el) throw new Error('the table widget never rendered')
  return el
}

async function enterCell(): Promise<EditorView> {
  const div = (await tableEl()).querySelector('tbody .mdpm-tbl-cell-static') as HTMLElement
  const ev = { bubbles: true, cancelable: true, button: 0, clientX: 4, clientY: 4 }
  await act(async () => {
    div.dispatchEvent(new MouseEvent('pointerdown', ev))
    div.dispatchEvent(new MouseEvent('mousedown', ev))
    div.dispatchEvent(new MouseEvent('click', { ...ev, detail: 1 }))
  })
  const dom = editorContainer().querySelector('.mdpm-tbl-cell-editor .cm-content')
  const view = dom && EditorView.findFromDOM(dom as HTMLElement)
  if (!view) throw new Error('no cell is live')
  vi.spyOn(view, 'coordsAtPos').mockReturnValue(coords)
  return view
}

describe('the heading picker inside a cell', () => {
  it('lists the host page’s headings for a bare #', async () => {
    await mountEditor({ initialBody: `## Setup\n\n${table('[[#]]')}`, connections: headingConn })
    const cell = await enterCell()
    await act(async () => {
      cell.dispatch({ selection: { anchor: '[[#'.length } })
    })
    expect(document.querySelector('.mdpm-ac')?.textContent).toContain('Setup')
  })

  it('slides into a page’s headings on ArrowRight', async () => {
    seedHost({ bodies: { pNotes: '## Setup\n\nbody' } })
    await mountEditor({ initialBody: table('[[Not]]'), connections: headingConn })
    const cell = await enterCell()
    await act(async () => {
      cell.dispatch({ selection: { anchor: 5 } })
    })
    expect(document.querySelector('.mdpm-ac')).toBeTruthy()
    await act(async () => {
      cell.contentDOM.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }),
      )
    })
    expect(cell.state.doc.toString()).toBe('[[Notes#]]')
    expect(document.querySelector('.mdpm-ac')?.textContent).toContain('Setup')
  })
})
