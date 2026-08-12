// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act } from 'react'
import type { EditorView } from '@codemirror/view'
import type { ConnMenuAction } from '@shared/connections'
import { buildPageIndex, type ConnectionsApi } from '@renderer/MarkdownPM/connections'
import { showConnectionMenu } from '@renderer/Embeds/connectionMenu'
import { cleanupEditor, mountEditor, stubEditorBridge } from '@renderer/testing/editorHarness'

class ResizeObserverStub {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}
;(globalThis as { ResizeObserver?: unknown }).ResizeObserver = ResizeObserverStub

const connMenu = vi.fn<(ctx: { editable: boolean }) => Promise<ConnMenuAction | null>>()
stubEditorBridge({ connMenu })

beforeEach(() => {
  connMenu.mockReset()
  connMenu.mockResolvedValue(null)
})
afterEach(async () => {
  await cleanupEditor()
})

const conn: ConnectionsApi = {
  ...buildPageIndex([{ id: 'p1', title: 'Alpha', path: 'Notes/Alpha.md' }]),
  open: () => {},
  menu: showConnectionMenu,
}

/** Right-click the rendered link and let the menu's promise settle. */
async function rightClick(view: EditorView, pos: number): Promise<void> {
  vi.spyOn(view, 'posAtCoords').mockReturnValue(pos)
  const span = view.dom.querySelector('.md-connection-resolved') as HTMLElement
  await act(async () => {
    span.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true }))
    await Promise.resolve()
  })
}

describe('the connection menu knows its span and its surface', () => {
  it('offers the authoring pair on an editable surface', async () => {
    const view = await mountEditor({ initialBody: 'a [[Alpha]] b', connections: conn })
    await rightClick(view, 6)
    expect(connMenu).toHaveBeenCalledWith({ editable: true })
  })

  // PreviewWindow starts read-only and silently drops doc changes, so Rename there would seat a
  // caret and swallow every keystroke.
  it('withholds it from a read-only surface', async () => {
    const view = await mountEditor({
      initialBody: 'a [[Alpha]] b',
      connections: conn,
      readOnly: true,
    })
    await rightClick(view, 6)
    expect(connMenu).toHaveBeenCalledWith({ editable: false })
  })
})

describe('Rename and Edit Link land the caret where their names imply', () => {
  it('Rename opens an alias on a link that has none', async () => {
    connMenu.mockResolvedValue('rename')
    const view = await mountEditor({ initialBody: 'a [[Alpha]] b', connections: conn })
    await rightClick(view, 6)
    expect(view.state.doc.toString()).toBe('a [[Alpha|]] b')
    expect(view.state.selection.main.head).toBe(10)
  })

  it('Rename selects an existing alias so typing replaces it', async () => {
    connMenu.mockResolvedValue('rename')
    const view = await mountEditor({ initialBody: 'a [[Alpha|the one]] b', connections: conn })
    await rightClick(view, 12)
    const sel = view.state.selection.main
    expect(view.state.doc.sliceString(sel.from, sel.to)).toBe('the one')
  })

  it('Edit Link lands at the title’s end, ahead of the alias', async () => {
    connMenu.mockResolvedValue('editLink')
    const view = await mountEditor({ initialBody: 'a [[Alpha|the one]] b', connections: conn })
    await rightClick(view, 12)
    expect(view.state.selection.main.head).toBe(9)
    expect(view.state.doc.toString()).toBe('a [[Alpha|the one]] b')
  })
})
