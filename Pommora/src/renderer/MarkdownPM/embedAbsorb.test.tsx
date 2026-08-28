// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { EditorSelection } from '@codemirror/state'
import type { EditorView } from '@codemirror/view'
import * as commands from '@codemirror/commands'
import { defaultKeymap, historyKeymap } from '@codemirror/commands'
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

// EVERY command the installed keymaps bind (run + shift alike), deduped — a hand-picked list is
// how the syntax-motion escape shipped green. Layout-dependent ones throw in jsdom and are skipped;
// the headless-Chrome pass covers the vertical pair with identical results.
type Cmd = (view: EditorView) => boolean
const boundCommands: Cmd[] = [
  ...new Set([...defaultKeymap, ...historyKeymap].flatMap((b) => [b.run, b.shift]).filter(Boolean)),
] as Cmd[]
void commands

/** From every legal seat, run every bound command; return the heads that landed on the embed line. */
function seatsOnEmbedLine(t: Awaited<ReturnType<typeof tileView>>): number[] {
  const seats = new Set<number>()
  for (let start = 0; start <= t.view.state.doc.length; start++) {
    // Seed only user-reachable positions: strictly-interior seats can't be reached by motion, and a
    // programmatic dispatch bypasses atomic ranges by design (the calloutAtomic header's caveat).
    if (start > t.absorbFrom && start < t.absorbTo) continue
    for (const cmd of boundCommands) {
      const doc = t.view.state.doc.toString()
      t.view.dispatch({ selection: EditorSelection.cursor(start) })
      try {
        cmd(t.view)
      } catch {
        continue // layout-dependent in jsdom
      }
      // Motion only — revert any command that edited, so later seats walk the same doc.
      if (t.view.state.doc.toString() !== doc) {
        t.view.dispatch({
          changes: { from: 0, to: t.view.state.doc.length, insert: doc },
        })
        continue
      }
      const head = t.view.state.selection.main.head
      if (head >= t.lineFrom && head <= t.lineTo) seats.add(head)
    }
  }
  return [...seats].sort((a, b) => a - b)
}

/** The load-bearing invariant: from EVERY reachable seat, no destructive keystroke may damage the
 *  tile — refused outright, or repaired outside the token. */
function everySeatIsGuarded(t: Awaited<ReturnType<typeof tileView>>): void {
  const original = t.view.state.doc.toString()
  const keys = ['Backspace', 'Delete', 'Enter', 'x']
  for (const seat of seatsOnEmbedLine(t)) {
    for (const k of keys) {
      t.view.dispatch({
        changes: { from: 0, to: t.view.state.doc.length, insert: original },
        selection: EditorSelection.cursor(seat),
      })
      if (k === 'x') t.view.contentDOM.dispatchEvent(new InputEvent('beforeinput', { data: 'x' }))
      t.view.contentDOM.dispatchEvent(
        new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true }),
      )
      const after = t.view.state.doc.toString()
      expect(after.includes('![[Alpha]]'), `seat ${seat} key ${k} destroyed the token`).toBe(true)
    }
  }
}

// The skip-over absorb: each tile's atomic range swallows its boundary newlines (clamped at doc
// edges). Char/vertical motion never seats on the line; doc edges and syntax-aware word motion CAN
// seat — so beyond the seat-set pins, every reachable seat proves every destructive key harmless.
describe('skip-over absorb: [prevLine.to, nextLine.from]', () => {
  it('(a) mid-document: every reachable seat is guarded', async () => {
    everySeatIsGuarded(await tileView('alpha\n![[Alpha]]\nbeta'))
  })

  it('(e) directly below a fence: every reachable seat is guarded', async () => {
    everySeatIsGuarded(await tileView('```\ncode\n```\n![[Alpha]]\nafter'))
  })

  // Document edges: the clamp re-admits exactly the boundary seat (real-layout verified, headless
  // Chrome, vertical motion included — same seat sets there). The caret at an edge seat is VISIBLE
  // (it renders beside the tile), and the lone-line guard repairs any insertion made from one onto a
  // fresh adjacent line, so the seat is harmless. These pins hold the seat sets to exactly that.
  it('(b) embed on line 1: every reachable seat is guarded', async () => {
    everySeatIsGuarded(await tileView('![[Alpha]]\nbeta'))
  })

  it('(c) embed on the last line: every reachable seat is guarded', async () => {
    everySeatIsGuarded(await tileView('alpha\n![[Alpha]]'))
  })

  it('(d) single-line document: every reachable seat is guarded', async () => {
    everySeatIsGuarded(await tileView('![[Alpha]]'))
  })
})
