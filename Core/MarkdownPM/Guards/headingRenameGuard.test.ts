import { describe, it, expect } from 'vitest'
import { EditorState, type Transaction } from '@codemirror/state'
import { history, undo } from '@codemirror/commands'
import { headingRenamed, headingRenameGuard } from './headingRenameGuard'
import { editorHost, syncLanding } from '../api'
import { testHost } from '../editorHarness'

const stateWith = (doc: string): EditorState =>
  EditorState.create({
    doc,
    extensions: [
      history(),
      headingRenameGuard,
      editorHost.of(testHost({ settings: { inPageHeadingResolution: 'automatic' } })),
    ],
  })

// A minimal EditorView stand-in: `undo` reads `.state` and dispatches through `.dispatch`.
class MiniView {
  state: EditorState
  constructor(doc: string) {
    this.state = stateWith(doc)
  }
  dispatch = (tr: Transaction): void => {
    this.state = tr.state
  }
}

describe('headingRenameGuard', () => {
  it('rewrites same-page links in the same transaction and stamps a headingRenamed effect', () => {
    const doc = '## Setup\n[[#Setup]] §Setup'
    const state = stateWith(doc)
    const tr = state.update({ changes: { from: 8, to: 8, insert: 'x' } })
    expect(tr.newDoc.toString()).toBe('## Setupx\n[[#Setupx]] §Setupx')
    const effects = tr.effects.filter((e) => e.is(headingRenamed))
    expect(effects).toHaveLength(1)
    expect(effects[0].value).toEqual({ old: 'Setup', next: 'Setupx', line: 1 })
  })

  it('renaming one of two identical headings moves only the links nearest it', () => {
    const v = new MiniView('## Setup\n[[#Setup]]\n## Setup\n[[#Setup]]')
    v.dispatch(v.state.update({ changes: { from: 28, to: 28, insert: 'x' } }))
    expect(v.state.doc.toString()).toBe('## Setup\n[[#Setup]]\n## Setupx\n[[#Setupx]]')
  })

  it('one undo restores the original document', () => {
    const doc = '## Setup\n[[#Setup]] §Setup'
    const view = new MiniView(doc)
    view.dispatch(view.state.update({ changes: { from: 8, to: 8, insert: 'x' } }))
    undo(view as never)
    expect(view.state.doc.toString()).toBe(doc)
  })

  it('typing a heading fresh on an empty line rewrites nothing and stamps nothing', () => {
    const state = stateWith('\ntext')
    const tr = state.update({ changes: { from: 0, to: 0, insert: '## New' } })
    expect(tr.effects.filter((e) => e.is(headingRenamed))).toHaveLength(0)
  })

  it('clearing the heading stamps a rename to empty and rewrites nothing', () => {
    const doc = '## Setup\n[[#Setup]]'
    const state = stateWith(doc)
    const tr = state.update({ changes: { from: 3, to: 8, insert: '' } })
    expect(tr.newDoc.toString()).toBe('## \n[[#Setup]]')
    const effects = tr.effects.filter((e) => e.is(headingRenamed))
    expect(effects).toHaveLength(1)
    expect(effects[0].value).toEqual({ old: 'Setup', next: '', line: 1 })
  })

  it('a syncLanding transaction stamps nothing', () => {
    const doc = '## Setup\n[[#Setup]]'
    const state = stateWith(doc)
    const tr = state.update({
      changes: { from: 8, to: 8, insert: 'x' },
      annotations: syncLanding.of(true),
    })
    expect(tr.effects.filter((e) => e.is(headingRenamed))).toHaveLength(0)
  })

  it('a multi-line paste stamps nothing', () => {
    const doc = '## Setup\n[[#Setup]]'
    const state = stateWith(doc)
    const tr = state.update({ changes: { from: 0, to: doc.length, insert: '## A\nx\n## B' } })
    expect(tr.effects.filter((e) => e.is(headingRenamed))).toHaveLength(0)
  })

  it('a composite transaction reverting both the heading and its same-page link still reads as a rename', () => {
    // Shaped like the undo CodeMirror's own history would dispatch for the forward rename above: two disjoint single-character deletes, one on the heading line, one on the link line — the guard reads only the heading-line range.
    const state = stateWith('## Setupx\n[[#Setupx]]')
    const tr = state.update({
      changes: [
        { from: 8, to: 9, insert: '' },
        { from: 18, to: 19, insert: '' },
      ],
    })
    expect(tr.newDoc.toString()).toBe('## Setup\n[[#Setup]]')
    const effects = tr.effects.filter((e) => e.is(headingRenamed))
    expect(effects).toHaveLength(1)
    expect(effects[0].value).toMatchObject({ old: 'Setupx', next: 'Setup' })
  })
})
