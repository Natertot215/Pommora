import { describe, it, expect } from 'vitest'
import { EditorState } from '@codemirror/state'
import { scanDoc } from '../Decorations/intent'
import { citationGuard } from '../Editor/citationGuard'
import { fusedTableCount as fusedIn, tableMergeGuard, tablePasteGuard } from './guard'

const fusedTableCount = (doc: string): number => fusedIn(scanDoc(doc))

const t1 = '| A | B |\n| --- | --- |\n| 1 | 2 |'
const t2 = '| C | D |\n| --- | --- |\n| 3 | 4 |'

describe('fusedTableCount', () => {
  it('is 0 for a single well-formed table', () => {
    expect(fusedTableCount(t1)).toBe(0)
  })
  it('is 0 for two tables fenced by a blank line', () => {
    expect(fusedTableCount(`${t1}\n\n${t2}`)).toBe(0)
  })
  it('is 1 when two tables fuse with no blank line between them (second delimiter reads as body)', () => {
    expect(fusedTableCount(`${t1}\n${t2}`)).toBe(1)
  })
})

describe('tableMergeGuard — the transaction filter that refuses a fusing deletion', () => {
  const sep = `${t1}\n\n${t2}` // two tables fenced by a blank line
  const guarded = (doc: string): EditorState =>
    EditorState.create({ doc, extensions: [tableMergeGuard] })

  it('cancels deleting the blank line between two tables — the doc is left unchanged', () => {
    // remove one of the two separator newlines, which would fuse the tables
    const next = guarded(sep).update({ changes: { from: t1.length, to: t1.length + 1 } }).state
    expect(next.doc.toString()).toBe(sep)
  })

  it('allows a deletion that does not fuse tables', () => {
    const next = guarded(sep).update({ changes: { from: 2, to: 3 } }).state
    expect(next.doc.toString()).not.toBe(sep)
  })
})

describe('tablePasteGuard — a table-shaped paste refuses lists and the citations section', () => {
  const paste = (doc: string, at: number, text: string): string =>
    EditorState.create({ doc, extensions: [tablePasteGuard, citationGuard] })
      .update({
        changes: { from: at, to: at, insert: text },
        userEvent: 'input.paste',
      })
      .state.doc.toString()

  const listDoc = '- one\n- two'
  const citeDoc = 'body\n\n[^a]: first'

  it('refuses a whole table pasted onto a list line', () => {
    expect(paste(listDoc, listDoc.length, `\n${t1}`)).toBe(listDoc)
    expect(paste(listDoc, 2, `${t1}\n`)).toBe(listDoc)
  })

  it('refuses a whole table pasted into the citations section — no relocation rescue', () => {
    expect(paste(citeDoc, citeDoc.length, `\n${t1}`)).toBe(citeDoc)
  })

  it('lets a table paste land in plain prose, and plain text land in a list', () => {
    const prose = 'above\n\nbelow'
    expect(paste(prose, 6, `${t1}\n`)).toContain('| A | B |')
    expect(paste(listDoc, 5, ' more')).toBe('- one more\n- two')
  })

  it('only a paste is judged — a typed or programmatic multi-line insert passes', () => {
    const next = EditorState.create({
      doc: listDoc,
      extensions: [tablePasteGuard],
    }).update({ changes: { from: 2, to: 2, insert: `${t1}\n` } }).state
    expect(next.doc.toString()).not.toBe(listDoc)
  })
})
