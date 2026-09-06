// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { EditorView } from '@codemirror/view'
import { MarkdownTable } from './MarkdownTable'
import { testHost } from '../editorHarness'
import { buildPageIndex, type ConnectionsApi } from '../Links/connectionsApi'
import type { TableModel } from '../Engine/Tables/model'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
if (!('ResizeObserver' in globalThis)) {
  ;(globalThis as { ResizeObserver?: unknown }).ResizeObserver = class {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
  }
}

const conn: ConnectionsApi = {
  ...buildPageIndex([{ id: 'p1', title: 'Quarterly Plan', path: 'N/Quarterly Plan.md' }]),
  open: () => {},
}
const CELL = '[[Quarterly Plan|the plan]]'
const model: TableModel = { columns: [{ align: null, dashes: 3 }], header: ['A'], rows: [[CELL]] }
const noop = (): void => {}

let container: HTMLDivElement
let root: Root
afterEach(async () => {
  await act(async () => root.unmount())
  container.remove()
})

/** Activates the body cell and hands back its live editor. */
async function cellEditor(): Promise<EditorView> {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  await act(async () =>
    root.render(
      createElement(MarkdownTable, {
        host: testHost(),
        model,
        connections: () => conn,
        onCellCommit: noop,
        onExit: noop,
        onReorder: () => false,
        onResize: () => false,
        onMenu: noop,
        onTableDrag: noop,
        onUndo: noop,
        onRedo: noop,
        onAppend: noop,
      }),
    ),
  )
  const cell = container.querySelector('tbody .mdpm-tbl-cell-static') as HTMLElement
  await act(async () => {
    cell.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, button: 0 }))
  })
  const dom = container.querySelector('.mdpm-tbl-cell-editor .cm-editor')
  const view = dom && EditorView.findFromDOM(dom as HTMLElement)
  if (!view) throw new Error('no cell editor')
  return view
}

/** What CodeMirror does with a typed character: the first input handler to claim it wins. */
const typed = (view: EditorView, at: number, text: string): boolean =>
  view.state
    .facet(EditorView.inputHandler)
    .some((h) => h(view, at, at, text, () => view.state.update()))

describe('a `]` typed inside a cell alias is refused, as the page body refuses it', () => {
  it('claims the keystroke and leaves the link whole', async () => {
    const view = await cellEditor()
    const at = CELL.indexOf('the plan') + 3
    await act(async () => {
      view.dispatch({ selection: { anchor: at } })
    })
    expect(typed(view, at, ']')).toBe(true)
    expect(view.state.doc.toString()).toBe(CELL)
  })

  it('and any other character still lands', async () => {
    const view = await cellEditor()
    const at = CELL.indexOf('the plan') + 3
    await act(async () => {
      view.dispatch({ selection: { anchor: at } })
    })
    expect(typed(view, at, 'x')).toBe(false)
  })
})
