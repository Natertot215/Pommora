// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { EditorSelection, EditorState } from '@codemirror/state'
import { Decoration, EditorView } from '@codemirror/view'
import { cursorCharLeft, cursorCharRight, cursorDocEnd, cursorDocStart } from '@codemirror/commands'

// Phase 0 spike: the skip-over absorb geometry. The atomic range widens to [prevLine.to, nextLine.from]
// (clamped at doc edges) around a lone `![[X]]` line; these tests observe where CM's own cursor motion
// can actually seat the caret, per plan case (a)–(e).

let views: EditorView[] = []
afterEach(() => {
  for (const v of views) v.destroy()
  views = []
})

function embedView(
  doc: string,
  embedLineNo: number,
): { view: EditorView; lineFrom: number; lineTo: number; absorbFrom: number; absorbTo: number } {
  const probe = EditorState.create({ doc })
  const line = probe.doc.line(embedLineNo)
  const from = line.from > 0 ? line.from - 1 : 0
  const to = line.to < probe.doc.length ? line.to + 1 : probe.doc.length
  const ranges = Decoration.set([Decoration.mark({}).range(from, to)])
  const view = new EditorView({
    state: EditorState.create({ doc, extensions: [EditorView.atomicRanges.of(() => ranges)] }),
    parent: document.body,
  })
  views.push(view)
  return { view, lineFrom: line.from, lineTo: line.to, absorbFrom: from, absorbTo: to }
}

const onEmbedLine = (head: number, lineFrom: number, lineTo: number): boolean =>
  head >= lineFrom && head <= lineTo

/** Run every layout-free motion command from every legal seat; return the heads that landed on the
 *  embed line. Vertical motion (cursorLineUp/Down) needs real layout jsdom lacks — the headless-Chrome
 *  spike ran the same walks WITH the vertical pair and produced identical seat sets per case. */
function seatsOnEmbedLine(
  view: EditorView,
  lineFrom: number,
  lineTo: number,
  absorbFrom: number,
  absorbTo: number,
): number[] {
  const seats = new Set<number>()
  const commands = [cursorCharLeft, cursorCharRight, cursorDocStart, cursorDocEnd]
  const docLen = view.state.doc.length
  for (let start = 0; start <= docLen; start++) {
    // Seed only user-reachable positions: strictly-interior seats can't be reached by motion, and a
    // programmatic dispatch bypasses atomic ranges by design (the calloutAtomic header's caveat).
    if (start > absorbFrom && start < absorbTo) continue
    for (const cmd of commands) {
      view.dispatch({ selection: EditorSelection.cursor(start) })
      cmd(view)
      const head = view.state.selection.main.head
      if (onEmbedLine(head, lineFrom, lineTo)) seats.add(head)
    }
  }
  return [...seats].sort((a, b) => a - b)
}

describe('skip-over absorb: [prevLine.to, nextLine.from]', () => {
  it('(a) mid-document: no motion seats the caret on the embed line', () => {
    const { view, lineFrom, lineTo, absorbFrom, absorbTo } = embedView('alpha\n![[X]]\nbeta', 2)
    expect(seatsOnEmbedLine(view, lineFrom, lineTo, absorbFrom, absorbTo)).toEqual([])
  })

  it('(e) directly below a fence: no motion seats the caret on the embed line', () => {
    const { view, lineFrom, lineTo, absorbFrom, absorbTo } = embedView('```\ncode\n```\n![[X]]\nafter', 4)
    expect(seatsOnEmbedLine(view, lineFrom, lineTo, absorbFrom, absorbTo)).toEqual([])
  })

  // Document edges: the clamp re-admits exactly the boundary seat (real-layout verified, headless
  // Chrome, vertical motion included — same seat sets there). The caret at an edge seat is VISIBLE
  // (it renders beside the tile), and the lone-line guard repairs any insertion made from one onto a
  // fresh adjacent line, so the seat is harmless. These pins hold the seat sets to exactly that.
  it('(b) embed on line 1 seats only its own start', () => {
    const { view, lineFrom, lineTo, absorbFrom, absorbTo } = embedView('![[X]]\nbeta', 1)
    expect(seatsOnEmbedLine(view, lineFrom, lineTo, absorbFrom, absorbTo)).toEqual([0])
  })

  it('(c) embed on the last line seats only its own end', () => {
    const { view, lineFrom, lineTo, absorbFrom, absorbTo } = embedView('alpha\n![[X]]', 2)
    expect(seatsOnEmbedLine(view, lineFrom, lineTo, absorbFrom, absorbTo)).toEqual([lineTo])
  })

  it('(d) single-line document seats both edges, nothing interior', () => {
    const { view, lineFrom, lineTo, absorbFrom, absorbTo } = embedView('![[X]]', 1)
    expect(seatsOnEmbedLine(view, lineFrom, lineTo, absorbFrom, absorbTo)).toEqual([lineFrom, lineTo])
  })
})
