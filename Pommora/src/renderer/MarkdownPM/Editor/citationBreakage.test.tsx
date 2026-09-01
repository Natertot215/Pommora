// @vitest-environment jsdom
// The section is the document's tail: any line left standing after it literalizes every citation at
// once. This suite tries to produce that state from the keyboard, at every seat in and around the
// section, and asserts it never happened — a `[^x]:` line the scan doesn't read as part of a live
// section is the corrupted state.
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { act } from 'react'
import { EditorView } from '@codemirror/view'
import { undo } from '@codemirror/commands'
import { useSession } from '@renderer/store'
import { stubEditorBridge, mountEditor, cleanupEditor } from '@renderer/Testing/editorHarness'
import { citationScan, splitWithOffsets } from '../Detect'
import { citationSeatAt } from './citationActions'

class ResizeObserverStub {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}
;(globalThis as { ResizeObserver?: unknown }).ResizeObserver = ResizeObserverStub

beforeEach(() => {
  stubEditorBridge({ readClipboard: async () => '' })
  useSession.setState({ personalization: { jumpToCitation: false } })
})
afterEach(async () => {
  await cleanupEditor()
})

const BODY = '# Notes\n\nprose[^1] and more[^two] here\n\n| a | b |\n| --- | --- |\n| c[^1] | d |\n'
const DOC = `${BODY}\n[^1]: the first citation\n[^two]: the second\n[^orphan]: nothing points here`

/** Every `[^label]:` line the document holds that the scan doesn't read as a live citation — the
 *  one state no keystroke may produce. */
function stranded(doc: string): string[] {
  const d = splitWithOffsets(doc)
  const owned = new Set(citationScan(d, []).entries.map((e) => e.line))
  return d.lines.filter((l, i) => /^ {0,3}\[\^[^\]\s]+\]:/.test(l) && !owned.has(i))
}

/** A head inside a fence is code and is nobody's citation, so any stranded head this reports is real. */
const intact = (view: EditorView): string[] => stranded(view.state.doc.toString())

const keys = ['Enter', 'Backspace', 'Delete', 'Tab'] as const

async function press(view: EditorView, key: string, mods: Partial<KeyboardEventInit> = {}) {
  await act(async () => {
    view.contentDOM.dispatchEvent(
      new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...mods }),
    )
  })
}

async function type(view: EditorView, ch: string): Promise<void> {
  await act(async () => {
    const { from, to } = view.state.selection.main
    const claimed = view.state
      .facet(EditorView.inputHandler)
      .some((h) => h(view, from, to, ch, () => null as never))
    if (!claimed)
      view.dispatch({ changes: { from, to, insert: ch }, selection: { anchor: from + ch.length } })
  })
}

async function seat(view: EditorView, at: number, to = at): Promise<void> {
  await act(async () => {
    view.dispatch({ selection: { anchor: at, head: to } })
  })
}

describe('no keystroke, at any seat, strands a citation', () => {
  // Every offset from the line above the section to the document's very end.
  const from = DOC.indexOf('\n[^1]: the first')
  const seats = Array.from({ length: DOC.length - from + 1 }, (_, i) => from + i)

  for (const key of keys) {
    it(`${key} at every seat in and around the section`, async () => {
      for (const at of seats) {
        const view = await mountEditor({ initialBody: DOC, citationsShown: true })
        await seat(view, at)
        await press(view, key)
        expect(intact(view), `${key} at ${at}`).toEqual([])
        await cleanupEditor()
      }
    })
  }

  for (const ch of ['-', '>', '#', '*', '1', '|', '`', '~', '+', ' ', '\t', 'x']) {
    it(`typing ${JSON.stringify(ch)} at every seat in and around the section`, async () => {
      for (const at of seats) {
        const view = await mountEditor({ initialBody: DOC, citationsShown: true })
        await seat(view, at)
        await type(view, ch)
        expect(intact(view), `${JSON.stringify(ch)} at ${at}`).toEqual([])
        await cleanupEditor()
      }
    })
  }
})

describe('no selection sweep strands a citation', () => {
  const cuts: [string, number, number][] = [
    ['the whole document', 0, DOC.length],
    ['the whole section', DOC.indexOf('[^1]: the'), DOC.length],
    ['half a citation into the body', DOC.indexOf('prose'), DOC.indexOf('the second')],
    ['the section’s last half-row', DOC.length - 8, DOC.length],
    ['across two citations', DOC.indexOf('[^1]: the'), DOC.indexOf('[^orphan]')],
    ['the anchor blank and the first row', DOC.indexOf('\n[^1]:'), DOC.indexOf('[^two]')],
  ]
  for (const [name, a, b] of cuts) {
    it(`deleting ${name}`, async () => {
      const view = await mountEditor({ initialBody: DOC, citationsShown: true })
      await seat(view, a, b)
      await press(view, 'Backspace')
      expect(intact(view)).toEqual([])
    })
    it(`typing over ${name}`, async () => {
      const view = await mountEditor({ initialBody: DOC, citationsShown: true })
      await seat(view, a, b)
      await type(view, '-')
      expect(intact(view)).toEqual([])
    })
  }
})

describe('a section survives being written at while it is hidden', () => {
  it('every construct character typed at the document’s end', async () => {
    for (const ch of ['-', '>', '#', '1', '|', '`']) {
      const view = await mountEditor({ initialBody: DOC })
      await seat(view, DOC.length)
      await type(view, ch)
      expect(intact(view), ch).toEqual([])
      await cleanupEditor()
    }
  })

  it('Enter then a list marker at the document’s end', async () => {
    const view = await mountEditor({ initialBody: DOC })
    await seat(view, DOC.length)
    await press(view, 'Enter')
    await type(view, '-')
    await type(view, ' ')
    await type(view, 'x')
    expect(intact(view)).toEqual([])
    expect(citationScan(splitWithOffsets(view.state.doc.toString()), []).entries).toHaveLength(3)
  })
})

describe('every cascade reverts on one undo', () => {
  const sites: [string, number][] = [
    ['backspace at a citation’s content start', DOC.indexOf('the first citation')],
    ['backspace against a marker’s trailing edge', DOC.indexOf('prose[^1]') + 9],
  ]
  for (const [name, at] of sites) {
    it(name, async () => {
      const view = await mountEditor({ initialBody: DOC, citationsShown: true })
      await seat(view, at)
      await press(view, 'Backspace')
      expect(view.state.doc.toString()).not.toBe(DOC)
      await act(async () => {
        undo(view)
      })
      expect(view.state.doc.toString()).toBe(DOC)
    })
  }
})

describe('the section refuses to seat a marker inside itself, in every shape', () => {
  it('every offset from the first citation to the document’s end', async () => {
    const view = await mountEditor({ initialBody: DOC, citationsShown: true })
    for (let at = DOC.indexOf('[^1]: the'); at <= DOC.length; at++) {
      await seat(view, at)
      expect(citationSeatAt(view.state), `at ${at}`).toBe(false)
    }
  })
})

// The rule is keyed to the range, so the two deletion keys must give the same answer over it.
describe('Backspace and forward-Delete agree over the same range', () => {
  const rowFrom = DOC.indexOf('[^two]: the second')
  const rowTo = rowFrom + '[^two]: the second'.length
  const markerFrom = DOC.indexOf('[^two]')
  const markerTo = markerFrom + '[^two]'.length

  const removed = async (key: string, a: number, b: number): Promise<string> => {
    const view = await mountEditor({ initialBody: DOC, citationsShown: true })
    await seat(view, a, b)
    await press(view, key)
    const out = view.state.doc.toString()
    await cleanupEditor()
    return out
  }

  it('sweeping exactly one citation row cascades either way', async () => {
    const back = await removed('Backspace', rowFrom, rowTo)
    const fwd = await removed('Delete', rowFrom, rowTo)
    expect(fwd).toBe(back)
    expect(fwd).not.toContain('[^two]')
  })

  it('sweeping exactly one marker cascades either way', async () => {
    const back = await removed('Backspace', markerFrom, markerTo)
    const fwd = await removed('Delete', markerFrom, markerTo)
    expect(fwd).toBe(back)
    expect(fwd).not.toContain('the second')
  })

  it('forward-Delete against a marker’s leading edge takes the whole marker', async () => {
    const out = await removed('Delete', markerFrom, markerFrom)
    expect(out).not.toContain('[^two]')
    expect(out).not.toContain('the second')
  })

  it('and a wider sweep still cascades neither way', async () => {
    const a = DOC.indexOf('prose')
    const b = DOC.indexOf('here') + 4
    const back = await removed('Backspace', a, b)
    const fwd = await removed('Delete', a, b)
    expect(fwd).toBe(back)
    expect(fwd).toContain('the first citation')
  })
})

describe('the degenerate documents', () => {
  const docs: [string, string][] = [
    ['nothing but citations', '[^1]: one\n[^2]: two'],
    ['one citation and one line', 'body\n\n[^1]: one'],
    ['an empty citation at the end', 'body[^1]\n\n[^1]:'],
    ['a trailing newline', 'body[^1]\n\n[^1]: one\n'],
    ['several trailing newlines', 'body[^1]\n\n[^1]: one\n\n\n'],
    ['labels differing only in case', 'a[^A] b[^a]\n\n[^a]: one'],
    ['a citation-shaped line inside a fence', 'body\n\n```\n[^1]: code\n```\n\n[^2]: real'],
  ]
  for (const [name, body] of docs) {
    it(`${name} survives a keystroke at its end`, async () => {
      for (const ch of ['-', 'x', '#']) {
        const view = await mountEditor({ initialBody: body, citationsShown: true })
        await seat(view, body.length)
        await type(view, ch)
        expect(intact(view), `${name} / ${ch}`).toEqual(stranded(body))
        await cleanupEditor()
      }
    })
  }
})
