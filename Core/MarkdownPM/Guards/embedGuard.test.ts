import { describe, expect, it } from 'vitest'
import { EditorState, type TransactionSpec } from '@codemirror/state'
import { embedTiles } from '../Embeds/embedWidget'
import type { ConnectionsApi } from '../Links/connectionsApi'
import { buildPageIndex } from '../../Connections/pageIndex'
import { editorHost } from '../api'
import { embedGuard } from './embedGuard'
import { testHost } from '../../Testing/editorHarness'

const conn: ConnectionsApi = {
  ...buildPageIndex([{ id: '1', title: 'Alpha', path: 'Notes/Alpha.md' }]),
  open: () => {},
}

const mk = (doc: string): EditorState =>
  EditorState.create({
    doc,
    extensions: [
      editorHost.of(testHost()),
      embedTiles({ getConn: () => conn, ancestors: ['Host.md'] }),
      embedGuard,
    ],
  })

const conn2: ConnectionsApi = {
  ...buildPageIndex([
    { id: '1', title: 'Alpha', path: 'Notes/Alpha.md' },
    { id: '2', title: 'Beta', path: 'Notes/Beta.md' },
  ]),
  open: () => {},
}
const mk2 = (doc: string): EditorState =>
  EditorState.create({
    doc,
    extensions: [embedTiles({ getConn: () => conn2, ancestors: ['Host.md'] }), embedGuard],
  })

const apply = (state: EditorState, spec: TransactionSpec): string =>
  state.update(spec).state.doc.toString()

describe('embed lone-line guard', () => {
  it('refuses a join that would drag prose onto the tile line', () => {
    const doc = 'alpha\n![[Alpha]]\nbeta'
    expect(apply(mk(doc), { changes: { from: 16, to: 17, insert: '' } })).toBe(doc)
  })

  it('repairs an insertion at the tile-start boundary onto its own line, mid-document too', () => {
    const doc = 'alpha\n![[Alpha]]\nbeta'
    expect(apply(mk(doc), { changes: { from: 6, to: 6, insert: 'x ' } })).toBe(
      'alpha\nx \n![[Alpha]]\nbeta',
    )
  })

  it('allows a spanning delete that removes the tile whole', () => {
    const doc = 'alpha\n![[Alpha]]\nbeta'
    expect(apply(mk(doc), { changes: { from: 6, to: 17, insert: '' } })).toBe('alpha\nbeta')
  })

  it('repairs a doc-start boundary-seat insertion onto its own line above', () => {
    const doc = '![[Alpha]]\nbeta'
    const out = apply(mk(doc), { changes: { from: 0, to: 0, insert: 'x' } })
    expect(out).toBe('x\n![[Alpha]]\nbeta')
  })

  it('repairs a doc-end boundary-seat insertion onto its own line below', () => {
    const doc = 'alpha\n![[Alpha]]'
    const out = apply(mk(doc), { changes: { from: 16, to: 16, insert: 'x' } })
    expect(out).toBe('alpha\n![[Alpha]]\nx')
  })

  it('leaves edits elsewhere untouched, and unclaimed lines free', () => {
    const doc = 'alpha\n![[Alpha]]\n![[Nowhere]]'
    expect(apply(mk(doc), { changes: { from: 0, to: 5, insert: 'gamma' } })).toBe(
      'gamma\n![[Alpha]]\n![[Nowhere]]',
    )
    const doc2 = 'a\n![[Nowhere]]'
    expect(apply(mk(doc2), { changes: { from: 1, to: 2, insert: '' } })).toBe('a![[Nowhere]]')
  })
})

describe('the fencing blank', () => {
  it('refuses deleting the lone blank below a tile', () => {
    const doc = 'alpha\n\n![[Alpha]]\n\nbeta'
    expect(apply(mk(doc), { changes: { from: 18, to: 19, insert: '' } })).toBe(doc)
  })

  it('refuses deleting the lone blank above a tile', () => {
    const doc = 'alpha\n\n![[Alpha]]\n\nbeta'
    expect(apply(mk(doc), { changes: { from: 5, to: 6, insert: '' } })).toBe(doc)
  })

  it('typing on the fence blank stays legal — hand-gluing is authoring, not erosion', () => {
    const doc = 'alpha\n\n![[Alpha]]\n\nbeta'
    expect(apply(mk(doc), { changes: { from: 18, to: 18, insert: 'x' } })).toBe(
      'alpha\n\n![[Alpha]]\nx\nbeta',
    )
  })

  it('deleting the tile with its blanks stays legal', () => {
    const doc = 'alpha\n\n![[Alpha]]\n\nbeta'
    expect(apply(mk(doc), { changes: { from: 7, to: 19, insert: '' } })).toBe('alpha\n\nbeta')
  })
})

const URL = 'https://www.example.com/a'
const W = `![](${URL})`

describe('the webpage tile under the guard', () => {
  it('refuses a join that would drag prose onto the tile line', () => {
    const doc = `alpha\n${W}\nbeta`
    expect(apply(mk(doc), { changes: { from: 6 + W.length, to: 7 + W.length, insert: '' } })).toBe(
      doc,
    )
  })

  it('repairs a boundary-seat insertion onto its own line', () => {
    const doc = `alpha\n${W}\nbeta`
    expect(apply(mk(doc), { changes: { from: 6, to: 6, insert: 'x ' } })).toBe(
      `alpha\nx \n${W}\nbeta`,
    )
  })

  it('allows a spanning delete that removes the tile whole', () => {
    const doc = `alpha\n${W}\nbeta`
    expect(apply(mk(doc), { changes: { from: 5, to: 6 + W.length, insert: '' } })).toBe(
      'alpha\nbeta',
    )
  })

  it('refuses deleting the lone fencing blank beside the tile', () => {
    const doc = `alpha\n\n${W}\n\nbeta`
    expect(apply(mk(doc), { changes: { from: 5, to: 6, insert: '' } })).toBe(doc)
  })
})

describe('per-tile fence accounting', () => {
  it('removing one tile whole cannot legalize gluing another', () => {
    const doc = 'text\n![[Alpha]]\n\n![[Beta]]'
    const out = apply(mk2(doc), { changes: { from: 5, to: 17, insert: '' } })
    expect(out).toBe(doc)
  })

  it('removing one tile with its own seams intact stays legal', () => {
    const doc = 'text\n![[Alpha]]\n\n![[Beta]]'
    expect(apply(mk2(doc), { changes: { from: 4, to: 15, insert: '' } })).toBe('text\n\n![[Beta]]')
  })
})
