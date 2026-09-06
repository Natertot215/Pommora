// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { EditorSelection } from '@codemirror/state'
import type { EditorView } from '@codemirror/view'
import * as commands from '@codemirror/commands'
import { defaultKeymap, historyKeymap } from '@codemirror/commands'
import { buildPageIndex, type ConnectionsApi } from '../Links/connectionsApi'
import { embedTileRanges } from './embedWidget'
import { cleanupEditor, mountEditor, stubEditorBridge } from '../editorHarness'

stubEditorBridge()
afterEach(cleanupEditor)

const conn: ConnectionsApi = {
  ...buildPageIndex([{ id: '1', title: 'Alpha', path: 'Notes/Alpha.md' }]),
  open: () => {},
}

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

// EVERY command the installed keymaps bind (run + shift alike), deduped — a hand-picked list is how the syntax-motion escape shipped green; the layout-dependent ones throw in jsdom and are skipped.
type Cmd = (view: EditorView) => boolean
const boundCommands: Cmd[] = [
  ...new Set([...defaultKeymap, ...historyKeymap].flatMap((b) => [b.run, b.shift]).filter(Boolean)),
] as Cmd[]
void commands

function seatsOnEmbedLine(t: Awaited<ReturnType<typeof tileView>>): number[] {
  const seats = new Set<number>()
  for (let start = 0; start <= t.view.state.doc.length; start++) {
    if (start > t.absorbFrom && start < t.absorbTo) continue
    for (const cmd of boundCommands) {
      const doc = t.view.state.doc.toString()
      t.view.dispatch({ selection: EditorSelection.cursor(start) })
      try {
        cmd(t.view)
      } catch {
        continue
      }
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

describe('skip-over absorb: [prevLine.to, nextLine.from]', () => {
  it('(a) mid-document: every reachable seat is guarded', async () => {
    everySeatIsGuarded(await tileView('alpha\n![[Alpha]]\nbeta'))
  })

  it('(e) directly below a fence: every reachable seat is guarded', async () => {
    everySeatIsGuarded(await tileView('```\ncode\n```\n![[Alpha]]\nafter'))
  })

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
