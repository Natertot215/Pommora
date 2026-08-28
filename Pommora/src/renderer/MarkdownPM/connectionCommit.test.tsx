// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { act } from 'react'
import { buildPageIndex, type ConnectionsApi } from '@renderer/MarkdownPM/connections'
import { useSession } from '@renderer/store'
import { cleanupEditor, mountEditor, stubEditorBridge } from '@renderer/testing/editorHarness'

class ResizeObserverStub {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}
;(globalThis as { ResizeObserver?: unknown }).ResizeObserver = ResizeObserverStub

stubEditorBridge()
afterEach(async () => {
  await cleanupEditor()
})

const conn: ConnectionsApi = {
  ...buildPageIndex([{ id: 'p1', title: 'Alpha', path: 'Notes/Alpha.md' }]),
  open: () => {},
}
const coords = { left: 10, right: 10, top: 10, bottom: 20 }

async function pickFirst(body: string, caret: number): Promise<{ doc: string; head: number }> {
  const view = await mountEditor({ initialBody: body, connections: conn })
  vi.spyOn(view, 'coordsAtPos').mockReturnValue(coords)
  await act(async () => {
    view.focus()
    view.dispatch({ selection: { anchor: caret } })
  })
  expect(document.querySelector('.mdpm-ac')).toBeTruthy()
  await act(async () => {
    view.contentDOM.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }),
    )
  })
  return { doc: view.state.doc.toString(), head: view.state.selection.main.head }
}

describe('committing a connection leaves it reading as finished', () => {
  // A caret on the closer keeps the token active, which would show the link just picked as raw
  // syntax. The space is what the caret steps over.
  // The closer is the one caret position that leaves a connection rendered, so nothing is written
  // to move the caret off it — accepting a suggestion adds the link and not a character more.
  it('writes the link alone and rests the caret on its closer', async () => {
    const { doc, head } = await pickFirst('[[Alp]]', 4)
    expect(doc).toBe('[[Alpha]]')
    expect(head).toBe(9)
  })

  it('leaves the text that follows exactly as it was', async () => {
    const { doc, head } = await pickFirst('[[Alp]] rest', 4)
    expect(doc).toBe('[[Alpha]] rest')
    expect(head).toBe(9)
  })
})

describe('the picker stands down when it has nothing to add', () => {
  it('a sole suggestion identical to what is written opens no panel', async () => {
    const view = await mountEditor({ initialBody: '[[Alpha]]', connections: conn })
    vi.spyOn(view, 'coordsAtPos').mockReturnValue(coords)
    await act(async () => {
      view.focus()
      view.dispatch({ selection: { anchor: 4 } })
    })
    expect(document.querySelector('.mdpm-ac')).toBeNull()
  })

  it('but a partial query still opens it', async () => {
    const view = await mountEditor({ initialBody: '[[Alp]]', connections: conn })
    vi.spyOn(view, 'coordsAtPos').mockReturnValue(coords)
    await act(async () => {
      view.focus()
      view.dispatch({ selection: { anchor: 4 } })
    })
    expect(document.querySelector('.mdpm-ac')).toBeTruthy()
  })
})

// Retargeting replaces the whole token, so the alias is destroyed here unless deliberately carried.
describe('retargeting an aliased connection obeys the strip setting', () => {
  it('drops the alias by default — the old words describe the old page', async () => {
    useSession.setState({ personalization: {} })
    const { doc } = await pickFirst('[[Alp|the one]]', 4)
    expect(doc).toBe('[[Alpha]]')
  })

  it('carries the alias across when the setting is off', async () => {
    useSession.setState({ personalization: { removeTitleOnLinkChange: false } })
    const { doc } = await pickFirst('[[Alp|the one]]', 4)
    expect(doc).toBe('[[Alpha|the one]]')
  })
})
