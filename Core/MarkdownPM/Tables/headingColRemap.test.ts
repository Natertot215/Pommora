// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest'
import { EditorState } from '@codemirror/state'
import { EditorView } from '@codemirror/view'
import { applySavedHeadingCols, buildWidgetDecorations, tableWidgetExtension } from './widget'
import { structuralEditChange } from './sync'
import { insertColumn } from '../Engine/Tables/operations'
import { docScan } from '../docCache'
import { editorHost } from '../api'
import { testHost } from '../editorHarness'

// The widget lazy-imports MarkdownTable and renders it; a host and a ResizeObserver keep a synchronous render (if the import has resolved from a prior test) from throwing.
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
if (!('ResizeObserver' in globalThis)) {
  ;(globalThis as { ResizeObserver?: unknown }).ResizeObserver = class {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
  }
}

const A = '| a | b |\n| --- | --- |\n| 1 | 2 |'
const B = '| x | y |\n| --- | --- |\n| 9 | 8 |'
const C = '| p | q |\n| --- | --- |\n| 5 | 6 |'

interface WidgetShape {
  tableIndex: number
  headingColumn: boolean
  text: string
}

function widgets(state: EditorState): WidgetShape[] {
  const out: WidgetShape[] = []
  const set = buildWidgetDecorations(state)
  for (const it = set.iter(); it.value; it.next()) {
    const w = it.value.spec.widget as unknown as WidgetShape
    out.push({ tableIndex: w.tableIndex, headingColumn: w.headingColumn, text: w.text })
  }
  return out
}

let view: EditorView | null = null
function openTwoTables(onChange: (indices: number[]) => void): EditorView {
  view = new EditorView({
    state: EditorState.create({
      doc: `${A}\n\n${B}`,
      extensions: [editorHost.of(testHost()), tableWidgetExtension(undefined, onChange)],
    }),
  })
  return view
}

afterEach(() => {
  view?.destroy()
  view = null
})

describe('heading-column toggle survives tables shifting around it', () => {
  it('follows the table when one is inserted above it, and persists the corrected ordinal', () => {
    const persisted: number[][] = []
    const v = openTwoTables((indices) => persisted.push(indices))

    // Seeding the saved state must not itself write back.
    applySavedHeadingCols(v, [1])
    expect(persisted).toEqual([])

    v.dispatch({ changes: { from: 0, insert: `${C}\n\n` } })

    const cols = widgets(v.state)
    expect(cols.map((w) => w.headingColumn)).toEqual([false, false, true])
    expect(cols[2].text).toContain('x')
    expect(persisted).toEqual([[2]])
  })

  it('leaves the toggle put through an in-place structural edit, writing nothing back', () => {
    const persisted: number[][] = []
    const v = openTwoTables((indices) => persisted.push(indices))
    applySavedHeadingCols(v, [1])

    // A column insert rewrites the header row without the cell-commit self-edit annotation, so the remap runs; the table count is unchanged, so the toggle holds.
    const change = structuralEditChange(docScan(v.state.doc), 1, (m) => insertColumn(m, 0, 'left'))
    expect(change).not.toBeNull()
    v.dispatch({ changes: change ?? undefined })

    const cols = widgets(v.state)
    expect(cols.find((w) => w.tableIndex === 1)?.headingColumn).toBe(true)
    expect(cols.find((w) => w.tableIndex === 0)?.headingColumn).toBe(false)
    expect(persisted).toEqual([])
  })
})
