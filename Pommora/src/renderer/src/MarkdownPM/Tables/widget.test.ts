import { describe, it, expect } from 'vitest'
import { EditorState } from '@codemirror/state'
import { type DecorationSet, EditorView } from '@codemirror/view'
import { buildWidgetDecorations, refreshTableEffect, tableWidgetExtension } from './widget'
import { scanDoc } from '../decorations/intent'
import { cellCommitChange as cellCommitIn, tableSelfEdit } from './sync'

const cellCommitChange = (
  doc: string,
  ...rest: [number, number, number, string]
): ReturnType<typeof cellCommitIn> => cellCommitIn(scanDoc(doc), ...rest)
import type { TableModel } from './model'

const make = (doc: string): number => buildWidgetDecorations(EditorState.create({ doc })).size

// Reach the widget field's live decoration set (via the decorations facet) and return the first table
// widget's stored text + model — what TableView renders its static cells from.
function firstTableWidget(state: EditorState): { text: string; model: TableModel } {
  for (const provider of state.facet(EditorView.decorations)) {
    if (typeof provider === 'function') continue
    for (const it = (provider as DecorationSet).iter(); it.value; it.next()) {
      const w = it.value.spec.widget as unknown as { text: string; model: TableModel } | null
      if (w && 'model' in w) return w
    }
  }
  throw new Error('no table widget in decoration set')
}

/** The span the first table's block decoration covers, in the live decoration set. */
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
    const set = buildWidgetDecorations(EditorState.create({ doc }))
    let from = -1
    let to = -1
    set.between(0, doc.length, (f, t) => {
      from = f
      to = t
    })
    expect(doc.slice(from, to)).toBe('| a | b |\n| --- | --- |\n| 1 | 2 |')
  })

  // A cell self-edit maps the widget forward and rebuilds nothing. The cell being typed in is a live
  // editor holding its own text; replacing the block decoration here would make CodeMirror re-measure
  // the block on every keystroke, against React content that hasn't rendered yet — the page jumps.
  it('leaves the widget alone on a cell self-edit', () => {
    const doc = '| a | b |\n| --- | --- |\n| 1 | 2 |'
    const start = EditorState.create({ doc, extensions: [tableWidgetExtension()] })
    expect(firstTableWidget(start).model.rows[0][0]).toBe('1')

    const change = cellCommitChange(doc, 0, 1, 0, 'hello')
    expect(change).not.toBeNull()
    const next = start.update({
      changes: change ?? undefined,
      annotations: tableSelfEdit.of(true),
    }).state

    expect(firstTableWidget(next).model.rows[0][0]).toBe('1')
  })

  // …and catches up when the cell demotes, which is the first moment a static cell has to draw it.
  it('rebuilds it when the cell settles', () => {
    const doc = '| a | b |\n| --- | --- |\n| 1 | 2 |'
    const start = EditorState.create({ doc, extensions: [tableWidgetExtension()] })
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

  // Mapping has to carry the block over the edit: a widget left spanning the old range would clip the
  // table it replaces.
  it('and the widget still spans the table after an edit that lengthened it', () => {
    const doc = '| a | b |\n| --- | --- |\n| 1 | 2 |'
    const start = EditorState.create({ doc, extensions: [tableWidgetExtension()] })
    const change = cellCommitChange(doc, 0, 1, 0, 'a much longer cell')
    const edited = start.update({
      changes: change ?? undefined,
      annotations: tableSelfEdit.of(true),
    }).state
    expect(edited.doc.sliceString(...widgetSpan(edited))).toBe(edited.doc.toString())
  })
})
