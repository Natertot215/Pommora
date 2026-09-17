// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { act } from 'react'
import type { ConnectionsApi } from './connectionsApi'
import { buildPageIndex } from '@pommora/core/Connections/pageIndex'
import { cleanupEditor, mountEditor, stubEditorBridge } from '../editorHarness'

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
  headingsOf: () => ['setup'],
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
    const revealed = [...view.dom.querySelectorAll('.md-bracket')].map((e) => e.textContent)
    expect(revealed).toEqual(['[[Alpha|', ']]'])
  })

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

describe('a heading link reads per the two heading settings', () => {
  it('[[Alpha#Setup]] renders the page, a spaced §, and the heading at rest', async () => {
    const view = await mountEditor({ initialBody: '[[Alpha#Setup]]', connections: conn })
    expect(view.dom.textContent).toContain('Alpha')
    const sym = view.dom.querySelector('.md-heading-symbol')
    expect(sym?.textContent).toBe('§')
    expect(sym?.classList.contains('md-heading-symbol-spaced')).toBe(true)
    const heading = view.dom.querySelector('.md-connection-heading') as HTMLElement
    expect(heading?.textContent).toBe('Setup')
  })

  it('heading-only style drops the page text and the spacing', async () => {
    const view = await mountEditor({
      initialBody: '[[Alpha#Setup]]',
      connections: conn,
      host: { settings: { headingLinkStyle: 'heading-only' } },
    })
    expect(view.dom.textContent).not.toContain('Alpha')
    expect(view.dom.querySelector('.md-heading-symbol-spaced')).toBeNull()
  })

  it('[[#Setup]] on the same page renders the heading alone, § flush', async () => {
    const view = await mountEditor({
      initialBody: '## Setup\n\n[[#Setup]]',
      connections: conn,
    })
    expect(view.dom.querySelector('.md-heading-symbol-spaced')).toBeNull()
    const heading = view.dom.querySelector('.md-connection-heading') as HTMLElement
    expect(heading?.textContent).toBe('Setup')
  })

  it('a heading that no longer exists carries md-connection-heading-missing', async () => {
    const view = await mountEditor({ initialBody: '[[Alpha#Gone]]', connections: conn })
    const heading = view.dom.querySelector('.md-connection-heading-missing')
    expect(heading?.textContent).toBe('Gone')
  })
})
