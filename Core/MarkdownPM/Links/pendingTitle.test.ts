// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from 'vitest'
import { act } from 'react'
import { EditorState } from '@codemirror/state'
import { EditorView } from '@codemirror/view'
import {
  cleanupEditor,
  editorContainer,
  mountEditor,
  settleTitle,
  stubEditorBridge,
} from '../../Testing/editorHarness'
import { awaitTitle, pendingTitles, writeLinkAt, type PendingTitle } from './pendingTitle'

const URL = 'https://www.example.com/a/b'
const LINK = `[example.com](${URL})`

function armed(doc: string, at: number): EditorState {
  const state = EditorState.create({ doc, extensions: [pendingTitles] })
  return state.update({
    effects: awaitTitle.of({ from: at, to: at + LINK.length, url: URL, text: LINK }),
  }).state
}

function armedTwice(): EditorState {
  const state = EditorState.create({ doc: `${LINK}\n${LINK}`, extensions: [pendingTitles] })
  return state.update({
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
}

const anchors = (s: EditorState): readonly PendingTitle[] => s.field(pendingTitles)

describe('the pending-title anchor', () => {
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

  it('is pruned once the label no longer reads as written', () => {
    const s = armed(LINK, 0)
    const after = s.update({ changes: { from: 1, to: 12, insert: 'My Words' } }).state
    expect(anchors(after)).toHaveLength(0)
  })

  it('keeps two anchors for the same address distinct', () => {
    const s = armedTwice()
    const [first, second] = anchors(s)
    expect(anchors(s)).toHaveLength(2)
    expect(first.from).not.toBe(second.from)
    expect(s.sliceDoc(first.from, first.to)).toBe(LINK)
    expect(s.sliceDoc(second.from, second.to)).toBe(LINK)
  })

  it('refuses an announced entry whose range does not read as its text', () => {
    const state = EditorState.create({ doc: `pad ${LINK}`, extensions: [pendingTitles] })
    const moved = state.update({
      effects: awaitTitle.of({ from: 0, to: LINK.length, url: URL, text: LINK }),
    }).state
    expect(anchors(moved)).toHaveLength(0)
    expect(anchors(armed(`pad ${LINK}`, 4))).toHaveLength(1)
  })

  it('drops only the edited one when two are armed', () => {
    const after = armedTwice().update({ changes: { from: 1, to: 12, insert: 'Mine' } }).state
    expect(anchors(after)).toHaveLength(1)
    expect(after.sliceDoc(anchors(after)[0].from, anchors(after)[0].to)).toBe(LINK)
  })
})

stubEditorBridge()
afterEach(cleanupEditor)

const TITLED = `[Example Domain](${URL})`
const waiting = { text: LINK, awaits: URL }

describe('writeLinkAt', () => {
  it('announces the link and swaps the title in once when it lands', async () => {
    const onChange = vi.fn()
    const view = await mountEditor({ initialBody: '', onChange })
    act(() => writeLinkAt(view, 0, 0, waiting, 'input.paste'))
    expect(view.state.doc.toString()).toBe(LINK)
    expect(view.state.field(pendingTitles)).toHaveLength(1)
    onChange.mockClear()
    await settleTitle(URL, 'Example Domain')
    expect(view.state.doc.toString()).toBe(TITLED)
    expect(view.state.field(pendingTitles)).toHaveLength(0)
    expect(onChange).toHaveBeenCalledOnce()
  })

  it('swaps both when the same address is written twice', async () => {
    const view = await mountEditor({ initialBody: '\n' })
    act(() => writeLinkAt(view, 0, 0, waiting, 'input.paste'))
    const second = view.state.doc.length
    act(() => writeLinkAt(view, second, second, waiting, 'input.paste'))
    await settleTitle(URL, 'Example Domain')
    expect(view.state.doc.toString()).toBe(`${TITLED}\n${TITLED}`)
    expect(view.state.field(pendingTitles)).toHaveLength(0)
  })

  it('stops waiting on a failed fetch and leaves the short form', async () => {
    const view = await mountEditor({ initialBody: '' })
    act(() => writeLinkAt(view, 0, 0, waiting, 'input.paste'))
    await settleTitle(URL, null)
    expect(view.state.doc.toString()).toBe(LINK)
    expect(view.state.field(pendingTitles)).toHaveLength(0)
  })

  async function closeCellPending(): Promise<EditorView> {
    const view = await mountEditor({ initialBody: '| A |\n| --- |\n| x |' })
    let table = editorContainer().querySelector('table.mdpm-tbl')
    for (let i = 0; !table && i < 50; i++) {
      await act(() => new Promise((r) => setTimeout(r, 20)))
      table = editorContainer().querySelector('table.mdpm-tbl')
    }
    const cell = table!.querySelector('tbody .mdpm-tbl-cell-static') as HTMLElement
    const at = { bubbles: true, cancelable: true, button: 0, clientX: 4, clientY: 4 }
    await act(async () => {
      cell.dispatchEvent(new MouseEvent('pointerdown', at))
      cell.dispatchEvent(new MouseEvent('mousedown', at))
      cell.dispatchEvent(new MouseEvent('click', { ...at, detail: 1 }))
    })
    const content = table!.querySelector('tbody .cm-content') as HTMLElement
    const cellView = EditorView.findFromDOM(content)!
    act(() => writeLinkAt(cellView, 0, cellView.state.doc.length, waiting, 'input.paste'))
    expect(view.state.doc.toString()).toBe(`| A |\n| --- |\n| ${LINK} |`)
    await act(async () => {
      document.body.dispatchEvent(new MouseEvent('pointerdown', at))
    })
    expect(editorContainer().querySelectorAll('tbody .cm-editor')).toHaveLength(0)
    return view
  }

  it('a table cell closing with a title pending hands it to the resting cell', async () => {
    const view = await closeCellPending()
    await settleTitle(URL, 'Example Domain')
    expect(view.state.doc.toString()).toBe(`| A |\n| --- |\n| ${TITLED} |`)
  })

  it('a closed cell whose table is gone writes its title nowhere', async () => {
    const view = await closeCellPending()
    const replaced = `| B |\n| --- |\n| ${LINK} |\n\n| A |\n| --- |\n| ${LINK} |`
    for (const body of ['gone', replaced])
      await act(async () => {
        view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: body } })
      })
    await settleTitle(URL, 'Example Domain')
    expect(view.state.doc.toString()).toBe(replaced)
  })
})
