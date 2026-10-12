// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { MarkdownTable } from './MarkdownTable'
import { type CellPage, cellOffsetAt } from './cellStatic'
import { tableStubs, testHost } from '../../Testing/editorHarness'
import type { ConnectionsApi } from '../Links/connectionsApi'
import { buildPageIndex } from '../../Connections/pageIndex'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const conn: ConnectionsApi = {
  ...buildPageIndex([{ id: 'p1', title: 'Quarterly Plan', path: 'N/Quarterly Plan.md' }]),
  location: () => [],
  open: () => {},
  headingsOf: (path) =>
    path === 'N/Quarterly Plan.md'
      ? { keys: ['setup'], texts: ['Setup'], outline: [{ text: 'Setup', level: 2 }] }
      : undefined,
}

let container: HTMLDivElement
let root: Root
afterEach(async () => {
  await act(async () => root.unmount())
  container.remove()
})

async function restingCell(
  text: string,
  around: CellPage = tableStubs.around,
): Promise<HTMLElement> {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  await act(async () =>
    root.render(
      createElement(MarkdownTable, {
        ...tableStubs,
        host: { ...testHost(), connections: () => conn },
        model: { columns: [{ align: null, dashes: 3 }], header: ['A'], rows: [[text]] },
        around,
      }),
    ),
  )
  return container.querySelector('tbody .mdpm-tbl-cell-static') as HTMLElement
}

function textNode(cell: Element, drawn: string, nth = 0): Text {
  const walker = document.createTreeWalker(cell, NodeFilter.SHOW_TEXT)
  const hits: Text[] = []
  for (let n = walker.nextNode(); n; n = walker.nextNode())
    if (n.textContent === drawn) hits.push(n as Text)
  if (!hits[nth]) throw new Error(`no text node "${drawn}"`)
  return hits[nth]
}

describe('a point in a resting cell maps to the source it draws', () => {
  it('reads plain text as itself', async () => {
    const cell = await restingCell('plain words')
    expect(cellOffsetAt(cell, textNode(cell, 'plain words'), 3)).toBe(3)
  })

  it('reads a marked run through the markers it hides', async () => {
    const cell = await restingCell('**a** bc')
    expect(cellOffsetAt(cell, textNode(cell, 'a'), 1)).toBe(3)
    expect(cellOffsetAt(cell, textNode(cell, ' bc'), 2)).toBe(7)
  })

  it('takes a mark’s hidden markers into a range that reaches its edge, while a point stays inside', async () => {
    const cell = await restingCell('**a** bc')
    expect(cellOffsetAt(cell, textNode(cell, 'a'), 0, 'start')).toBe(0)
    expect(cellOffsetAt(cell, textNode(cell, 'a'), 1, 'end')).toBe(5)
    expect(cellOffsetAt(cell, textNode(cell, 'a'), 0)).toBe(2)
  })

  it('reads text after a nested mark from where that mark ends', async () => {
    const cell = await restingCell('**a *b* c**')
    expect(cellOffsetAt(cell, textNode(cell, 'b'), 1)).toBe(6)
    expect(cellOffsetAt(cell, textNode(cell, ' c'), 1)).toBe(8)
    expect(cellOffsetAt(cell, textNode(cell, ' c'), 0, 'start')).toBe(7)
    expect(cellOffsetAt(cell, textNode(cell, ' c'), 2, 'end')).toBe(11)
    expect(cellOffsetAt(cell, textNode(cell, 'a '), 0, 'start')).toBe(0)
  })

  it('reads the plain text before any token from the cell’s start', async () => {
    const cell = await restingCell('xy **a**')
    expect(cellOffsetAt(cell, textNode(cell, 'xy '), 1)).toBe(1)
  })

  it('reads a point inside an alias as the alias, takes the link’s edges into a range that reaches its text’s, and reads past it', async () => {
    const cell = await restingCell('x [[Quarterly Plan|the plan]] y')
    const alias = textNode(cell, 'the plan')
    expect(cellOffsetAt(cell, alias, 3)).toBe(22)
    expect(cellOffsetAt(cell, alias, 3, 'start')).toBe(22)
    expect(cellOffsetAt(cell, alias, 0, 'start')).toBe(2)
    expect(cellOffsetAt(cell, alias, 8, 'end')).toBe(29)
    expect(cellOffsetAt(cell, textNode(cell, ' y'), 1)).toBe(30)
  })

  it('takes the outermost token’s edges into a range that reaches the text of a token flush inside it', async () => {
    const cell = await restingCell('a ~~[x](https://a.com)~~ b')
    const x = textNode(cell, 'x')
    expect(cellOffsetAt(cell, x, 0, 'start')).toBe(2)
    expect(cellOffsetAt(cell, x, 1, 'end')).toBe(24)
    expect(cellOffsetAt(cell, x, 0)).toBe(5)
  })

  it('clamps the § a heading link draws to the link', async () => {
    const cell = await restingCell('[[Quarterly Plan#Setup]] z')
    const glyph = textNode(cell, '§')
    expect(cellOffsetAt(cell, glyph, 1, 'start')).toBe(0)
    expect(cellOffsetAt(cell, glyph, 1, 'end')).toBe(24)
    expect(cellOffsetAt(cell, textNode(cell, ' z'), 1)).toBe(25)
  })

  it('reads a point on a § run as its end', async () => {
    const cell = await restingCell('see §Setup ok', {
      ordinalOf: () => null,
      keys: ['setup'],
      texts: ['Setup'],
    })
    const run = textNode(cell, '§Setup')
    expect(cellOffsetAt(cell, run, 2)).toBe(10)
    expect(cellOffsetAt(cell, run, 2, 'start')).toBe(4)
    expect(cellOffsetAt(cell, textNode(cell, ' ok'), 1)).toBe(11)
  })

  it('clamps a footnote’s drawn ordinal to its marker', async () => {
    const cell = await restingCell('see [^note] ok', {
      ordinalOf: (label) => (label === 'note' ? 7 : null),
      keys: [],
      texts: [],
    })
    expect(cellOffsetAt(cell, textNode(cell, '7'), 1, 'end')).toBe(11)
    expect(cellOffsetAt(cell, textNode(cell, ' ok'), 1)).toBe(12)
  })

  it('reads a list line from its own base, and a point on the glyph as where its content begins', async () => {
    const cell = await restingCell('- a\n- **b** c')
    expect(cellOffsetAt(cell, textNode(cell, 'a'), 0)).toBe(2)
    expect(cellOffsetAt(cell, textNode(cell, 'b'), 1)).toBe(9)
    expect(cellOffsetAt(cell, textNode(cell, ' c'), 1)).toBe(12)
    expect(cellOffsetAt(cell, textNode(cell, '•', 1), 1)).toBe(6)
    expect(cellOffsetAt(cell, textNode(cell, '•', 1), 1, 'start')).toBe(4)
  })

  it('reads an empty line’s filler as the line’s own start', async () => {
    const cell = await restingCell('- a\n\nb')
    expect(cellOffsetAt(cell, textNode(cell, '​'), 1)).toBe(4)
    expect(cellOffsetAt(cell, textNode(cell, 'b'), 1)).toBe(6)
  })

  it('reads an empty item’s filler as where its content would begin', async () => {
    const cell = await restingCell('- a\n- ')
    expect(cellOffsetAt(cell, textNode(cell, '​'), 0)).toBe(6)
  })

  it('reads a point between nodes from the cell’s edges', async () => {
    const cell = await restingCell('**a** bc')
    expect(cellOffsetAt(cell, cell, 0)).toBe(0)
    expect(cellOffsetAt(cell, cell, cell.childNodes.length)).toBe(8)
  })
})
