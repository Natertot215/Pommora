// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { EditorSelection } from '@codemirror/state'
import type { EditorView } from '@codemirror/view'
import { cursorCharLeft, cursorCharRight, cursorDocEnd, cursorDocStart } from '@codemirror/commands'
import { buildPageIndex, type ConnectionsApi } from '@renderer/MarkdownPM/connections'
import { embedTileRanges } from '@renderer/MarkdownPM/editor/embedWidget'
import { cleanupEditor, mountEditor, stubEditorBridge } from '@renderer/testing/editorHarness'

stubEditorBridge()
afterEach(cleanupEditor)

const conn: ConnectionsApi = {
  ...buildPageIndex([{ id: '1', title: 'Alpha', path: 'Notes/Alpha.md' }]),
  open: () => {},
}

/** Mount a doc holding one claimed tile and report the real absorb geometry the extension built —
 *  the tile's own line span, and the atomic range that swallows its boundary newlines. */
async function tileView(body: string): Promise<{
  view: EditorView
  lineFrom: number
  lineTo: number
  absorbFrom: number
  absorbTo: number
}> {
  const view = await mountEditor({ initialBody: body, connections: conn })
  const [tile] = embedTileRanges(view.state)
  if (!tile) throw new Error('no claimed tile')
  const len = view.state.doc.length
  return {
    view,
    lineFrom: tile.from,
    lineTo: tile.to,
    absorbFrom: Math.max(0, tile.from - 1),
    absorbTo: Math.min(len, tile.to + 1),
  }
}

/** Run every layout-free motion command from every legal seat; return the heads that landed on the
 *  embed line. Vertical motion (cursorLineUp/Down) needs real layout jsdom lacks — the headless-Chrome
 *  pass ran the same walks WITH the vertical pair and produced identical seat sets per case. */
function seatsOnEmbedLine(t: Awaited<ReturnType<typeof tileView>>): number[] {
  const seats = new Set<number>()
  const commands = [cursorCharLeft, cursorCharRight, cursorDocStart, cursorDocEnd]
  for (let start = 0; start <= t.view.state.doc.length; start++) {
    // Seed only user-reachable positions: strictly-interior seats can't be reached by motion, and a
    // programmatic dispatch bypasses atomic ranges by design (the calloutAtomic header's caveat).
    if (start > t.absorbFrom && start < t.absorbTo) continue
    for (const cmd of commands) {
      t.view.dispatch({ selection: EditorSelection.cursor(start) })
      cmd(t.view)
      const head = t.view.state.selection.main.head
      if (head >= t.lineFrom && head <= t.lineTo) seats.add(head)
    }
  }
  return [...seats].sort((a, b) => a - b)
}

// The skip-over absorb: each tile's atomic range swallows its boundary newlines (clamped at doc
// edges), so no motion command can seat the caret on the embed line. These walk the REAL extension's
// ranges through CM's own cursor motion, per plan case (a)–(e).
describe('skip-over absorb: [prevLine.to, nextLine.from]', () => {
  it('(a) mid-document: no motion seats the caret on the embed line', async () => {
    expect(seatsOnEmbedLine(await tileView('alpha\n![[Alpha]]\nbeta'))).toEqual([])
  })

  it('(e) directly below a fence: no motion seats the caret on the embed line', async () => {
    expect(seatsOnEmbedLine(await tileView('```\ncode\n```\n![[Alpha]]\nafter'))).toEqual([])
  })

  // Document edges: the clamp re-admits exactly the boundary seat (real-layout verified, headless
  // Chrome, vertical motion included — same seat sets there). The caret at an edge seat is VISIBLE
  // (it renders beside the tile), and the lone-line guard repairs any insertion made from one onto a
  // fresh adjacent line, so the seat is harmless. These pins hold the seat sets to exactly that.
  it('(b) embed on line 1 seats only its own start', async () => {
    const t = await tileView('![[Alpha]]\nbeta')
    expect(seatsOnEmbedLine(t)).toEqual([t.lineFrom])
  })

  it('(c) embed on the last line seats only its own end', async () => {
    const t = await tileView('alpha\n![[Alpha]]')
    expect(seatsOnEmbedLine(t)).toEqual([t.lineTo])
  })

  it('(d) single-line document seats both edges, nothing interior', async () => {
    const t = await tileView('![[Alpha]]')
    expect(seatsOnEmbedLine(t)).toEqual([t.lineFrom, t.lineTo])
  })
})
