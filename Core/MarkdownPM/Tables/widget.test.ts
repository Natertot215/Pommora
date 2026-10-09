import { describe, it, expect } from 'vitest'
import { EditorState } from '@codemirror/state'
import { type DecorationSet, EditorView } from '@codemirror/view'
import { buildWidgetDecorations, refreshTableEffect, tableWidgetExtension } from './widget'
import { scanDoc } from '../Engine/docScan'
import { cellCommitChange as cellCommitIn, tableSelfEdit } from './sync'
import { editorHost } from '../api'
import { testHost } from '../../Testing/editorHarness'
import type { CellPage } from './cellStatic'

const cellCommitChange = (
  doc: string,
  ...rest: [number, number, number, string]
): ReturnType<typeof cellCommitIn> => cellCommitIn(scanDoc(doc), ...rest)
import type { TableModel } from '../Engine/Tables/model'

const tables = [editorHost.of(testHost()), tableWidgetExtension(() => undefined)]

const make = (doc: string): number =>
  buildWidgetDecorations(EditorState.create({ doc, extensions: tables })).size

function firstTableWidget(state: EditorState): {
  text: string
  model: TableModel
  around: CellPage
} {
  for (const provider of state.facet(EditorView.decorations)) {
    if (typeof provider === 'function') continue
    for (const it = (provider as DecorationSet).iter(); it.value; it.next()) {
      const w = it.value.spec.widget as unknown as {
        text: string
        model: TableModel
        around: CellPage
      } | null
      if (w && 'model' in w) return w
    }
  }
  throw new Error('no table widget in decoration set')
}

const tableWidgets = (state: EditorState): unknown[] => {
  const out: unknown[] = []
  for (const provider of state.facet(EditorView.decorations)) {
    if (typeof provider === 'function') continue
    for (const it = (provider as DecorationSet).iter(); it.value; it.next())
      out.push(it.value.spec.widget)
  }
  return out
}

function widgetSpan(state: EditorState): [number, number] {
  for (const provider of state.facet(EditorView.decorations)) {
    if (typeof provider === 'function') continue
    let span: [number, number] | null = null
    ;(provider as DecorationSet).between(0, state.doc.length, (f, t) => {
      span ??= [f, t]
    })
    if (span) return span
  }
  throw new Error('no table widget in decoration set')
}

describe('table widget decorations', () => {
  it('emits one block-replace per valid table', () => {
    expect(make('| a | b |\n| --- | --- |\n| 1 | 2 |')).toBe(1)
  })

  it('emits none for a non-table document', () => {
    expect(make('just a paragraph\nand another line')).toBe(0)
  })

  it('emits one per table when several are present', () => {
    const two = '| a |\n| --- |\n| 1 |\n\ntext\n\n| x | y |\n| --- | --- |\n| 9 | 8 |'
    expect(make(two)).toBe(2)
  })

  it('covers the full table region (block range spans header through last row)', () => {
    const doc = 'lead\n\n| a | b |\n| --- | --- |\n| 1 | 2 |'
    const set = buildWidgetDecorations(EditorState.create({ doc, extensions: tables }))
    let from = -1
    let to = -1
    set.between(0, doc.length, (f, t) => {
      from = f
      to = t
    })
    expect(doc.slice(from, to)).toBe('| a | b |\n| --- | --- |\n| 1 | 2 |')
  })

  it('leaves the widget alone on a cell self-edit', () => {
    const doc = '| a | b |\n| --- | --- |\n| 1 | 2 |'
    const start = EditorState.create({ doc, extensions: tables })
    expect(firstTableWidget(start).model.rows[0][0]).toBe('1')

    const change = cellCommitChange(doc, 0, 1, 0, 'hello')
    expect(change).not.toBeNull()
    const next = start.update({
      changes: change ?? undefined,
      annotations: tableSelfEdit.of(true),
    }).state

    expect(firstTableWidget(next).model.rows[0][0]).toBe('1')
  })

  it('rebuilds it when the cell settles', () => {
    const doc = '| a | b |\n| --- | --- |\n| 1 | 2 |'
    const start = EditorState.create({ doc, extensions: tables })
    const change = cellCommitChange(doc, 0, 1, 0, 'hello')
    const edited = start.update({
      changes: change ?? undefined,
      annotations: tableSelfEdit.of(true),
    }).state

    const settled = edited.update({ effects: refreshTableEffect.of(0) }).state
    const w = firstTableWidget(settled)
    expect(w.model.rows[0][0]).toBe('hello')
    expect(w.text).toContain('hello')
  })

  it('and the widget still spans the table after an edit that lengthened it', () => {
    const doc = '| a | b |\n| --- | --- |\n| 1 | 2 |'
    const start = EditorState.create({ doc, extensions: tables })
    const change = cellCommitChange(doc, 0, 1, 0, 'a much longer cell')
    const edited = start.update({
      changes: change ?? undefined,
      annotations: tableSelfEdit.of(true),
    }).state
    expect(edited.doc.sliceString(...widgetSpan(edited))).toBe(edited.doc.toString())
  })
})

describe("a table follows the document's footnote numbering", () => {
  const numbering = ({ around }: { around: CellPage }): (number | null)[] =>
    ['a', 'b', 'new'].map(around.ordinalOf)
  const doc = 'first [^a]\n\nmiddle line\n\n| h |\n| - |\n| [^b] |\n\n[^a]: one\n[^b]: two'

  it('carries the numbering the document gives it', () => {
    const start = EditorState.create({ doc, extensions: tables })
    expect(numbering(firstTableWidget(start))).toEqual([1, 2, null])
    expect(firstTableWidget(start).around.ownKeys).toEqual([])
  })

  it('re-reads it after an edit far from the table renumbers a marker inside it', () => {
    const start = EditorState.create({ doc, extensions: tables })
    const at = doc.indexOf('middle line')
    const next = start.update({
      changes: [
        { from: at, insert: '[^new] ' },
        { from: doc.length, insert: '\n[^new]: three' },
      ],
    }).state
    expect(next.doc.toString()).toContain('[^new] middle line')
    expect(numbering(firstTableWidget(next))).toEqual([1, 3, 2])
  })

  it('a table holding a same-page heading link carries the page’s heading keys after the numbering, and re-reads them when a heading far from it changes', () => {
    const linked = `## Setup\n\n${doc.replace('| [^b] |', '| [^b] [[#Setup]] |')}`
    const start = EditorState.create({ doc: linked, extensions: tables })
    expect(numbering(firstTableWidget(start))).toEqual([1, 2, null])
    expect(firstTableWidget(start).around.ownKeys).toEqual(['setup'])
    const next = start.update({ changes: { from: 8, insert: 'x' } }).state
    expect(firstTableWidget(next).around.ownKeys).toEqual(['setupx'])
  })

  it('a keystroke in a heading rebuilds only the table holding a same-page link', () => {
    const plain = '| h |\n| - |\n| x |'
    const start = EditorState.create({
      doc: `## Setup\n\n${plain}\n\n| h |\n| - |\n| [[#Setup]] |`,
      extensions: tables,
    })
    const next = start.update({ changes: { from: 8, insert: 'x' } }).state
    const [a0, b0] = tableWidgets(start)
    const [a1, b1] = tableWidgets(next)
    expect(a1).toBe(a0)
    expect(b1).not.toBe(b0)
  })

  it('leaves the table alone when the edit moves no number', () => {
    const start = EditorState.create({ doc, extensions: tables })
    const before = firstTableWidget(start)
    const next = start.update({ changes: { from: doc.indexOf('middle'), insert: 'plain ' } }).state
    expect(firstTableWidget(next)).toBe(before)
  })
})
