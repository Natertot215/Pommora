// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from 'vitest'
import { createElement, act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { MarkdownTable } from './MarkdownTable'
import { type CellPage, renderCellContent } from './cellStatic'
import { tableStubs, testHost } from '../../Testing/editorHarness'
import type { TableModel } from '../Engine/Tables/model'
import { followCitation } from '../Citations/citationPointer'
import { buildPageIndex } from '../../Connections/pageIndex'

vi.mock('../Citations/citationPointer', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../Citations/citationPointer')>()),
  followCitation: vi.fn(),
}))

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
if (!('ResizeObserver' in globalThis)) {
  ;(globalThis as { ResizeObserver?: unknown }).ResizeObserver = class {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
  }
}

const model: TableModel = {
  columns: [{ align: null, dashes: 3 }],
  header: ['A'],
  rows: [['see [^note] and [^9]']],
}

// The page's numbering gives `[^note]` its ordinal and leaves `[^9]` unbound.
const numbering = (n: number): CellPage => ({
  ordinalOf: (label) => (label === 'note' ? n : null),
  keys: [],
  texts: [],
})

let container: HTMLDivElement
let root: Root
const cited = (): string[] => vi.mocked(followCitation).mock.calls.map(([label]) => label)

async function mount(around = tableStubs.around): Promise<void> {
  vi.mocked(followCitation).mockClear()
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  await act(async () =>
    root.render(
      createElement(MarkdownTable, {
        ...tableStubs,
        host: testHost(),
        model,
        around,
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
    await mount(numbering(2))
    expect(glyphs()).toEqual(['2'])
  })

  it('leaves an unmatched marker literal', async () => {
    await mount(numbering(2))
    expect(container.textContent).toContain('[^9]')
  })

  it('redraws when the numbering moves under it, though its text has not changed', async () => {
    await mount(numbering(2))
    expect(glyphs()).toEqual(['2'])
    await act(async () =>
      root.render(
        createElement(MarkdownTable, {
          ...tableStubs,
          host: testHost(),
          model,
          around: numbering(3),
        }),
      ),
    )
    expect(glyphs()).toEqual(['3'])
  })

  it('draws nothing when the document has no citations at all', async () => {
    await mount()
    expect(glyphs()).toEqual([])
    expect(container.textContent).toContain('[^note]')
  })
})

describe('an entered cell draws what the resting cell drew', () => {
  it('replaces the marker in the cell editor too, so the glyph does not change on entry', async () => {
    await mount(numbering(2))
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

  it('a right-click leaves the cell resting', async () => {
    await mount(numbering(2))
    const cell = [...container.querySelectorAll('.mdpm-tbl-cell-static')].find((el) =>
      el.textContent?.includes('see'),
    ) as HTMLElement
    await act(async () => {
      cell.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, button: 2 }))
      cell.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, button: 2 }))
    })
    expect(container.querySelector('.cm-editor')).toBeNull()
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
    await mount(numbering(2))
    await pressGlyph()
    expect(cited()).toEqual(['note'])
  })

  it('and the press never enters the cell', async () => {
    await mount(numbering(2))
    await pressGlyph()
    expect(container.querySelector('.cm-editor')).toBeNull()
  })

  it('while a press beside it enters the cell as always', async () => {
    await mount(numbering(2))
    const cell = [...container.querySelectorAll('.mdpm-tbl-cell-static')].find((el) =>
      el.textContent?.includes('see'),
    ) as HTMLElement
    await act(async () => {
      cell.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, button: 0 }))
      cell.dispatchEvent(new MouseEvent('click', { bubbles: true, button: 0, detail: 1 }))
    })
    expect(cited()).toEqual([])
    expect(container.querySelector('.cm-editor')).not.toBeNull()
  })
})

describe('an entered cell follows the numbering too', () => {
  it('redraws when the numbering moves while the cell is open', async () => {
    await mount(numbering(2))
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
          ...tableStubs,
          host: testHost(),
          model,
          around: numbering(3),
        }),
      ),
    )
    expect(inEditor()).toEqual(['3'])
  })
})

describe('a resting cell draws a tag whole', () => {
  it('colors the name between brackets it keeps, beside a mark it hides', async () => {
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
    await act(async () => root.render(renderCellContent('**y** <b>x</b>')))
    expect(container.textContent).toBe('y <b>x</b>')
    const tags = [...container.querySelectorAll('.md-html-tag')].map((el) => el.textContent)
    expect(tags).toEqual(['b', 'b'])
  })
})

describe('a resting cell draws an unresolved link as an unresolved connection, which the plain-syntax setting reaches', () => {
  it('dims `[` and `](Missing)` as phantom syntax around a phantom label', async () => {
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
    const conn = {
      ...buildPageIndex([]),
      headingsOf: () => undefined,
      location: () => [],
      open: () => {},
    }
    await act(async () => root.render(renderCellContent('a [x](Missing) b', () => conn)))
    const parts = [...container.querySelectorAll('span')].map((el) => [
      el.className,
      el.textContent,
    ])
    expect(parts).toEqual([
      ['md-phantom-syntax', '['],
      ['md-connection-phantom', 'x'],
      ['md-phantom-syntax', '](Missing)'],
    ])
  })
})

describe('a resting cell draws every token as a span, through the tokens inside it', () => {
  const conn = {
    ...buildPageIndex([{ id: 'p', title: 'P', path: 'P.md' }]),
    headingsOf: () => undefined,
    location: () => [],
    open: () => {},
  }
  const draw = async (text: string, around?: CellPage): Promise<void> => {
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
    await act(async () => root.render(renderCellContent(text, () => conn, { around })))
  }

  it('a connection inside bold draws inside the bold span, and both name their source', async () => {
    await draw('**a [[P]] b**')
    const bold = container.querySelector('.md-bold') as HTMLElement
    expect(bold.dataset.src).toBe('0,13')
    const link = bold.querySelector('.md-connection-resolved') as HTMLElement
    expect(link.textContent).toBe('P')
    expect(link.hasAttribute('data-link')).toBe(true)
    expect(link.dataset.src).toBe('4,9')
  })

  it('bold inside a link label draws inside the link span', async () => {
    await draw('[x **b**](https://a.com)')
    const link = container.querySelector('.md-link') as HTMLElement
    expect(link.hasAttribute('data-link')).toBe(true)
    expect(link.querySelector('.md-bold')?.textContent).toBe('b')
  })

  it('a § run over a heading of the page draws as a link', async () => {
    await draw('see §Setup', { ordinalOf: () => null, keys: [], texts: ['Setup'] })
    const run = container.querySelector('.md-section-run') as HTMLElement
    expect(run.textContent).toBe('§Setup')
    expect(run.hasAttribute('data-link')).toBe(true)
    expect(run.dataset.src).toBe('4,10')
  })

  it('every token kind draws a span naming its source', async () => {
    await draw('*a*')
    const italic = container.querySelector('.md-italic') as HTMLElement
    expect(italic.dataset.src).toBe('0,3')
    expect(italic.hasAttribute('data-link')).toBe(false)
  })

  it('text holding no token is the bare string', () => {
    expect(renderCellContent('plain text', () => conn)).toBe('plain text')
  })
})
