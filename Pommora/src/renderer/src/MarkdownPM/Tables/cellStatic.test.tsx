// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest'
import { createElement, act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { TableView } from './TableView'
import type { TableModel } from './model'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
if (!('ResizeObserver' in globalThis)) {
  ;(globalThis as { ResizeObserver?: unknown }).ResizeObserver = class {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
  }
}

const noop = (): void => {}
const model: TableModel = {
  columns: [{ align: null, dashes: 3 }],
  header: ['A'],
  rows: [['see [^note] and [^9]']],
}

let container: HTMLDivElement
let root: Root

async function mount(cites: string): Promise<void> {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  await act(async () =>
    root.render(
      createElement(TableView, {
        model,
        cites,
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
}

afterEach(async () => {
  await act(async () => root.unmount())
  container.remove()
})

const glyphs = (): (string | null)[] =>
  [...container.querySelectorAll('.md-cite-ref')].map((el) => el.textContent)

describe('a resting cell draws a marker as the number the document gives it', () => {
  it('draws the ordinal, not the label', async () => {
    await mount('NOTE=2')
    expect(glyphs()).toEqual(['2'])
  })

  it('leaves an unmatched marker literal', async () => {
    await mount('NOTE=2')
    expect(container.textContent).toContain('[^9]')
  })

  it('redraws when the numbering moves under it, though its text has not changed', async () => {
    await mount('NOTE=2')
    expect(glyphs()).toEqual(['2'])
    await act(async () =>
      root.render(
        createElement(TableView, {
          model,
          cites: 'NOTE=3',
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
    expect(glyphs()).toEqual(['3'])
  })

  it('draws nothing when the document has no citations at all', async () => {
    await mount('')
    expect(glyphs()).toEqual([])
    expect(container.textContent).toContain('[^note]')
  })
})
