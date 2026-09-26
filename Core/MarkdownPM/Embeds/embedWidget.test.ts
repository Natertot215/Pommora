import { describe, expect, it } from 'vitest'
import { EditorState } from '@codemirror/state'
import { embedExclusions, embedTileRanges, embedTiles } from './embedWidget'
import type { ConnectionsApi } from '../Links/connectionsApi'
import { buildPageIndex } from '@pommora/core/Connections/pageIndex'
import { editorHost } from '../api'
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
    ],
  })

const URL = 'https://www.example.com/a'
const W = `![](${URL})`
describe('the rebuild gate reads the scanner', () => {
  it('a fence closed around a tile dissolves it; a lone fence above leaves it', () => {
    let state = mk('x\n\n![[Alpha]]')
    const tiles = (): number => embedTileRanges(state).length
    expect(tiles()).toBe(1)
    state = state.update({ changes: { from: 0, to: 0, insert: '```\n' } }).state
    expect(tiles()).toBe(1)
    state = state.update({ changes: { from: state.doc.length, insert: '\n```' } }).state
    expect(tiles()).toBe(0)
    state = state.update({ changes: { from: 0, to: 4, insert: '' } }).state
    expect(tiles()).toBe(1)
  })
})

describe('the webpage formation gate', () => {
  it('forms at mount, selection seat regardless', () => {
    const state = mk(W)
    expect(embedTileRanges(state)).toEqual([
      { kind: 'webpage', from: 0, to: W.length, url: URL, label: '' },
    ])
  })

  it('stays raw under the selection, and forms on departure', () => {
    let state = mk('x\n')
    state = state.update({
      changes: { from: 2, to: 2, insert: W },
      selection: { anchor: 2 + W.length },
    }).state
    expect(embedTileRanges(state)).toHaveLength(0)
    state = state.update({ selection: { anchor: 0 } }).state
    expect(embedTileRanges(state)).toHaveLength(1)
  })

  it('forms on a doc change that lands a valid line away from the caret', () => {
    let state = mk('x\n\ny')
    state = state.update({ changes: { from: 2, to: 2, insert: `${W}\n` } }).state
    expect(embedTileRanges(state)).toHaveLength(1)
  })

  it('leaving the line by Enter forms the tile', () => {
    let state = mk('')
    state = state.update({
      changes: { from: 0, to: 0, insert: W },
      selection: { anchor: W.length },
    }).state
    expect(embedTileRanges(state)).toHaveLength(0)
    state = state.update({
      changes: { from: W.length, to: W.length, insert: '\n' },
      selection: { anchor: W.length + 1 },
    }).state
    expect(embedTileRanges(state)).toHaveLength(1)
  })

  it('claims duplicates — two tiles, same URL', () => {
    const state = mk(`${W}\n\n${W}`)
    expect(embedTileRanges(state)).toHaveLength(2)
  })

  it('reforms on undo even though the restoring selection sits on the line', () => {
    let state = mk(`alpha\n${W}`)
    expect(embedTileRanges(state)).toHaveLength(1)
    state = state.update({ changes: { from: 5, to: 6 + W.length, insert: '' } }).state
    expect(embedTileRanges(state)).toHaveLength(0)
    state = state.update({
      changes: { from: 5, to: 5, insert: `\n${W}` },
      selection: { anchor: 6 + W.length },
      userEvent: 'undo',
    }).state
    expect(embedTileRanges(state)).toHaveLength(1)
  })

  it('a formed tile survives the selection returning to its line', () => {
    let state = mk(`x\n${W}`)
    expect(embedTileRanges(state)).toHaveLength(1)
    state = state.update({ selection: { anchor: 4 } }).state
    expect(embedTileRanges(state)).toHaveLength(1)
  })
})

describe('webpage labels never enter the page exclusions', () => {
  it('a tile labeled like an existing Page leaves that Page pickable', () => {
    const state = mk(`![Alpha](${URL})`)
    expect(embedTileRanges(state)).toHaveLength(1)
    expect(embedExclusions(state).has('alpha')).toBe(false)
  })
})

describe('a page is excluded from embedding itself', () => {
  const self = (doc: string, title?: string): EditorState =>
    EditorState.create({
      doc,
      extensions: [embedTiles({ getConn: () => conn, ancestors: title ? [`${title}.md`] : [] })],
    })

  it('the host title is excluded with no chain above it', () => {
    expect(embedExclusions(self('text', 'Alpha')).has('alpha')).toBe(true)
  })

  it('a surface naming no page excludes nothing of its own', () => {
    expect(embedExclusions(self('text')).size).toBe(0)
  })
})
