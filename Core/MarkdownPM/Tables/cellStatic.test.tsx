// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest'
import { createElement, act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { MarkdownTable } from './MarkdownTable'
import { testHost } from '../editorHarness'
import type { TableModel } from '../Engine/Tables/model'

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
let cited: string[] = []

async function mount(cites: string): Promise<void> {
  cited = []
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  await act(async () =>
    root.render(
      createElement(MarkdownTable, {
        host: testHost(),
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
        onCite: (label: string) => cited.push(label),
      }),
    ),
  )
}

afterEach(async () => {
  await act(async () => root.unmount())
  container.remove()
})

const glyphs = (): (string | null)[] =>
  [...container.querySelectorAll('.md-citation-reference')].map((el) => el.textContent)

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
        createElement(MarkdownTable, {
          host: testHost(),
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

describe('an entered cell draws what the resting cell drew', () => {
  it('replaces the marker in the cell editor too, so the glyph does not change on entry', async () => {
    await mount('NOTE=2')
    const cell = [...container.querySelectorAll('.mdpm-tbl-cell-static')].find((el) =>
      el.textContent?.includes('see'),
    ) as HTMLElement
    await act(async () => {
      cell.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, button: 0 }))
      cell.dispatchEvent(new MouseEvent('click', { bubbles: true, button: 0, detail: 1 }))
    })
    const editor = container.querySelector('.cm-editor')
    expect(editor).not.toBeNull()
    expect(
      [...editor!.querySelectorAll('.md-citation-reference')].map((el) => el.textContent),
    ).toEqual(['2'])
  })

  it('a right-click enters the cell too, so the menu has a target', async () => {
    await mount('NOTE=2')
    const cell = [...container.querySelectorAll('.mdpm-tbl-cell-static')].find((el) =>
      el.textContent?.includes('see'),
    ) as HTMLElement
    await act(async () => {
      cell.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, button: 2 }))
      cell.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, button: 2 }))
    })
    expect(container.querySelector('.cm-editor')).not.toBeNull()
  })
})

describe('a marker in a resting cell leads to its citation', () => {
  const pressGlyph = async (): Promise<void> => {
    const glyph = container.querySelector('.md-citation-reference') as HTMLElement
    await act(async () => {
      glyph.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, button: 0 }))
      glyph.dispatchEvent(new MouseEvent('click', { bubbles: true, button: 0, detail: 1 }))
    })
  }

  it('travels by the label the marker carries, not the number it draws', async () => {
    await mount('NOTE=2')
    await pressGlyph()
    expect(cited).toEqual(['note'])
  })

  it('and the press never enters the cell', async () => {
    await mount('NOTE=2')
    await pressGlyph()
    expect(container.querySelector('.cm-editor')).toBeNull()
  })

  it('while a press beside it enters the cell as always', async () => {
    await mount('NOTE=2')
    const cell = [...container.querySelectorAll('.mdpm-tbl-cell-static')].find((el) =>
      el.textContent?.includes('see'),
    ) as HTMLElement
    await act(async () => {
      cell.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, button: 0 }))
      cell.dispatchEvent(new MouseEvent('click', { bubbles: true, button: 0, detail: 1 }))
    })
    expect(cited).toEqual([])
    expect(container.querySelector('.cm-editor')).not.toBeNull()
  })
})

describe('an entered cell follows the numbering too', () => {
  it('redraws when the numbering moves while the cell is open', async () => {
    await mount('NOTE=2')
    const cell = [...container.querySelectorAll('.mdpm-tbl-cell-static')].find((el) =>
      el.textContent?.includes('see'),
    ) as HTMLElement
    await act(async () => {
      cell.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, button: 0 }))
      cell.dispatchEvent(new MouseEvent('click', { bubbles: true, button: 0, detail: 1 }))
    })
    const inEditor = (): (string | null)[] =>
      [...container.querySelectorAll('.cm-editor .md-citation-reference')].map(
        (el) => el.textContent,
      )
    expect(inEditor()).toEqual(['2'])
    await act(async () =>
      root.render(
        createElement(MarkdownTable, {
          host: testHost(),
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
          onCite: (label: string) => cited.push(label),
        }),
      ),
    )
    expect(inEditor()).toEqual(['3'])
  })
})
