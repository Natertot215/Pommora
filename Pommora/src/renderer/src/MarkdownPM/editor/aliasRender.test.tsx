// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { act } from 'react'
import { buildPageIndex, type ConnectionsApi } from '@renderer/MarkdownPM/connections'
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

describe('an aliased connection reads as its alias', () => {
  it('shows the alias and hides the whole [[Title| lead at rest', async () => {
    const view = await mountEditor({ initialBody: '[[Alpha|the alpha]]', connections: conn })
    const span = view.dom.querySelector('.md-connection-resolved') as HTMLElement
    expect(span?.textContent).toBe('the alpha')
    expect(view.dom.textContent).toBe('the alpha')
  })

  it('the caret inside reveals the whole lead as syntax, not just the brackets', async () => {
    const view = await mountEditor({ initialBody: '[[Alpha|the alpha]]', connections: conn })
    await act(async () => {
      view.focus()
      view.dispatch({ selection: { anchor: 12 } })
    })
    // The link glyph rides inside the revealed lead carrying a no-break space — that space is what
    // lets a selection paint across the glyph instead of stepping around it — so the syntax is read
    // without it. CodeMirror builds a copy from the document, so it never reaches the clipboard.
    const revealed = [...view.dom.querySelectorAll('.md-bracket')].map((e) =>
      (e.textContent ?? '').replace(/\u00a0/g, ''),
    )
    expect(revealed).toEqual(['[[Alpha|', ']]'])
  })

  // The direction that proves resolution follows the title: the alias here names a real page and
  // the title names nothing. Resolving by what's displayed would light this up as a live link.
  it('resolves by title, not by the alias it displays', async () => {
    const view = await mountEditor({ initialBody: '[[Nowhere|Alpha]]', connections: conn })
    expect(view.dom.querySelector('.md-connection-resolved')).toBeNull()
    expect(view.dom.textContent).toBe('[[Nowhere|Alpha]]')
  })

  it('a bare connection is untouched by any of it', async () => {
    const view = await mountEditor({ initialBody: '[[Alpha]]', connections: conn })
    const span = view.dom.querySelector('.md-connection-resolved') as HTMLElement
    expect(span?.textContent).toBe('Alpha')
    expect(view.dom.textContent).toBe('Alpha')
  })
})
