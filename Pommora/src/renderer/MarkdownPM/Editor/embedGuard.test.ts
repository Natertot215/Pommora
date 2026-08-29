import { describe, expect, it } from 'vitest'
import { EditorState, type TransactionSpec } from '@codemirror/state'
import { embedExclusions, embedField, embedTiles } from './embedWidget'
import { buildPageIndex, type ConnectionsApi } from '../Connections'

const conn: ConnectionsApi = {
  ...buildPageIndex([{ id: '1', title: 'Alpha', path: 'Notes/Alpha.md' }]),
  open: () => {},
}

const mk = (doc: string): EditorState =>
  EditorState.create({
    doc,
    extensions: [embedTiles({ getConn: () => conn, ancestors: ['Host.md'] })],
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
    extensions: [embedTiles({ getConn: () => conn2, ancestors: ['Host.md'] })],
  })

const apply = (state: EditorState, spec: TransactionSpec): string =>
  state.update(spec).state.doc.toString()

// The lone-line guard: a live tile can be removed whole but never eroded in place; boundary-seat
// insertions repair onto their own line. Each refusal test dispatches the real change shape and
// must go red with the guard deleted — without it the change lands and the doc differs.
describe('embed lone-line guard', () => {
  it('refuses a join that would drag prose onto the tile line', () => {
    const doc = 'alpha\n![[Alpha]]\nbeta'
    // Deleting the newline between the embed line and beta (a backspace-join shape).
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
    // The unresolved line is plain text — joining into it is ordinary editing.
    const doc2 = 'a\n![[Nowhere]]'
    expect(apply(mk(doc2), { changes: { from: 1, to: 2, insert: '' } })).toBe('a![[Nowhere]]')
  })
})

describe('the fencing blank', () => {
  it('refuses deleting the lone blank below a tile', () => {
    const doc = 'alpha\n\n![[Alpha]]\n\nbeta'
    // Backspace-at-beta-start shape: deletes the newline joining beta up onto the blank.
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

describe('the rebuild gate reads the scanner', () => {
  it('a fence typed above a tile dissolves it; deleting the fence restores it', () => {
    // The field must track the scan's exclusion set, not just the tile's own lines.
    let state = mk('x\n\n![[Alpha]]')
    const tiles = (): number =>
      state.field(embedField as never, false) === undefined
        ? -1
        : (state.field(embedField as never) as { ranges: unknown[] }).ranges.length
    expect(tiles()).toBe(1)
    state = state.update({ changes: { from: 0, to: 0, insert: '```\n' } }).state
    expect(tiles()).toBe(0)
    state = state.update({ changes: { from: 0, to: 4, insert: '' } }).state
    expect(tiles()).toBe(1)
  })
})

const URL = 'https://www.example.com/a'
const W = `![](${URL})`
const ranges = (state: EditorState): { kind: string; from: number; to: number }[] =>
  (state.field(embedField as never) as { ranges: { kind: string; from: number; to: number }[] })
    .ranges

describe('the webpage formation gate', () => {
  it('forms at mount, selection seat regardless', () => {
    const state = mk(W)
    expect(ranges(state)).toEqual([{ kind: 'webpage', from: 0, to: W.length, url: URL, label: '' }])
  })

  it('stays raw under the selection, and forms on departure', () => {
    let state = mk('x\n')
    state = state.update({
      changes: { from: 2, to: 2, insert: W },
      selection: { anchor: 2 + W.length },
    }).state
    expect(ranges(state)).toHaveLength(0)
    state = state.update({ selection: { anchor: 0 } }).state
    expect(ranges(state)).toHaveLength(1)
  })

  it('forms on a doc change that lands a valid line away from the caret', () => {
    let state = mk('x\n\ny')
    state = state.update({ changes: { from: 2, to: 2, insert: `${W}\n` } }).state
    expect(ranges(state)).toHaveLength(1)
  })

  it('leaving the line by Enter forms the tile', () => {
    let state = mk('')
    state = state.update({
      changes: { from: 0, to: 0, insert: W },
      selection: { anchor: W.length },
    }).state
    expect(ranges(state)).toHaveLength(0)
    state = state.update({
      changes: { from: W.length, to: W.length, insert: '\n' },
      selection: { anchor: W.length + 1 },
    }).state
    expect(ranges(state)).toHaveLength(1)
  })

  it('claims duplicates — two tiles, same URL', () => {
    const state = mk(`${W}\n\n${W}`)
    expect(ranges(state)).toHaveLength(2)
  })

  it('reforms on undo even though the restoring selection sits on the line', () => {
    let state = mk(`alpha\n${W}`)
    expect(ranges(state)).toHaveLength(1)
    state = state.update({ changes: { from: 5, to: 6 + W.length, insert: '' } }).state
    expect(ranges(state)).toHaveLength(0)
    state = state.update({
      changes: { from: 5, to: 5, insert: `\n${W}` },
      selection: { anchor: 6 + W.length },
      userEvent: 'undo',
    }).state
    expect(ranges(state)).toHaveLength(1)
  })

  it('a formed tile survives the selection returning to its line', () => {
    let state = mk(`x\n${W}`)
    expect(ranges(state)).toHaveLength(1)
    state = state.update({ selection: { anchor: 4 } }).state
    expect(ranges(state)).toHaveLength(1)
  })
})

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

describe('webpage labels never enter the page exclusions', () => {
  it('a tile labeled like an existing Page leaves that Page pickable', () => {
    const state = mk(`![Alpha](${URL})`)
    expect(ranges(state)).toHaveLength(1)
    expect(embedExclusions(state).has('alpha')).toBe(false)
  })
})

describe('a page is excluded from embedding itself', () => {
  const self = (doc: string, title?: string): EditorState =>
    EditorState.create({
      doc,
      extensions: [embedTiles({ getConn: () => conn, ancestors: [], self: () => title })],
    })

  it('the host title is excluded with no chain above it', () => {
    expect(embedExclusions(self('text', 'Alpha')).has('alpha')).toBe(true)
  })

  it('a surface naming no page excludes nothing of its own', () => {
    expect(embedExclusions(self('text')).size).toBe(0)
  })
})

describe('per-tile fence accounting', () => {
  it('removing one tile whole cannot legalize gluing another', () => {
    // Hand-glued first tile + fenced second; spanning-delete of the first must not be paid for
    // by the second losing its blank.
    const doc = 'text\n![[Alpha]]\n\n![[Beta]]'
    const out = apply(mk2(doc), { changes: { from: 5, to: 17, insert: '' } })
    expect(out).toBe(doc) // Beta would become glued to text — refused
  })

  it('removing one tile with its own seams intact stays legal', () => {
    const doc = 'text\n![[Alpha]]\n\n![[Beta]]'
    expect(apply(mk2(doc), { changes: { from: 4, to: 15, insert: '' } })).toBe('text\n\n![[Beta]]')
  })
})
