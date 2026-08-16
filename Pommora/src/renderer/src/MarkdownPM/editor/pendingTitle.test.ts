import { describe, it, expect } from 'vitest'
import { EditorState } from '@codemirror/state'
import { awaitTitle, pendingTitles, type PendingTitle } from './PendingTitle'

const URL = 'https://www.example.com/a/b'
const LINK = `[example.com](${URL})`

/** A document holding `LINK` at `at`, with that link already announced as awaiting its title. */
function armed(doc: string, at: number): EditorState {
  const state = EditorState.create({ doc, extensions: [pendingTitles] })
  return state.update({
    effects: awaitTitle.of({ from: at, to: at + LINK.length, url: URL, text: LINK }),
  }).state
}

const anchors = (s: EditorState): readonly PendingTitle[] => s.field(pendingTitles)

describe('the pending-title anchor', () => {
  it('survives the transaction that announced it', () => {
    expect(anchors(armed(LINK, 0))).toHaveLength(1)
  })

  it('maps forward through an edit above it', () => {
    const s = armed(`\n${LINK}`, 1)
    const after = s.update({ changes: { from: 0, insert: 'a heading\n' } }).state
    const [a] = anchors(after)
    expect(a).toBeDefined()
    expect(after.sliceDoc(a.from, a.to)).toBe(LINK)
  })

  it('maps forward through an edit below it', () => {
    const s = armed(`${LINK}\n`, 0)
    const after = s.update({ changes: { from: s.doc.length, insert: 'more prose' } }).state
    const [a] = anchors(after)
    expect(after.sliceDoc(a.from, a.to)).toBe(LINK)
  })

  it('is pruned when its link is deleted', () => {
    const s = armed(LINK, 0)
    const after = s.update({ changes: { from: 0, to: LINK.length, insert: '' } }).state
    expect(anchors(after)).toHaveLength(0)
  })

  // The gate C-4 turns on: the label is only replaced if it is still exactly what was written, so a
  // user who retitles the link first keeps their words when the fetch lands.
  it('is pruned once the label no longer reads as written', () => {
    const s = armed(LINK, 0)
    const after = s.update({ changes: { from: 1, to: 12, insert: 'My Words' } }).state
    expect(anchors(after)).toHaveLength(0)
  })

  it('survives an edit that leaves the link untouched', () => {
    const s = armed(`${LINK} tail`, 0)
    const after = s.update({ changes: { from: s.doc.length, insert: '!' } }).state
    expect(anchors(after)).toHaveLength(1)
  })

  // Text alone cannot anchor this: the same address pasted twice reads identically in both places,
  // so a match-by-text rewrite would fire on whichever it found first, twice.
  it('keeps two anchors for the same address distinct', () => {
    const doc = `${LINK}\n${LINK}`
    let s = EditorState.create({ doc, extensions: [pendingTitles] })
    s = s.update({
      effects: [
        awaitTitle.of({ from: 0, to: LINK.length, url: URL, text: LINK }),
        awaitTitle.of({
          from: LINK.length + 1,
          to: LINK.length + 1 + LINK.length,
          url: URL,
          text: LINK,
        }),
      ],
    }).state
    const [first, second] = anchors(s)
    expect(anchors(s)).toHaveLength(2)
    expect(first.from).not.toBe(second.from)
    expect(s.sliceDoc(first.from, first.to)).toBe(LINK)
    expect(s.sliceDoc(second.from, second.to)).toBe(LINK)
  })

  it('drops only the edited one when two are armed', () => {
    const doc = `${LINK}\n${LINK}`
    let s = EditorState.create({ doc, extensions: [pendingTitles] })
    s = s.update({
      effects: [
        awaitTitle.of({ from: 0, to: LINK.length, url: URL, text: LINK }),
        awaitTitle.of({
          from: LINK.length + 1,
          to: LINK.length + 1 + LINK.length,
          url: URL,
          text: LINK,
        }),
      ],
    }).state
    const after = s.update({ changes: { from: 1, to: 12, insert: 'Mine' } }).state
    expect(anchors(after)).toHaveLength(1)
    expect(after.sliceDoc(anchors(after)[0].from, anchors(after)[0].to)).toBe(LINK)
  })
})
