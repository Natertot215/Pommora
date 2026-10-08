// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { makeTree } from '../../Testing/testTree'
import { useSession } from '../../Session/store'
import { LinkCell } from './LinkCell'
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
if (!('ResizeObserver' in globalThis)) {
  ;(globalThis as { ResizeObserver?: unknown }).ResizeObserver = class {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
  }
}

let root: Root | null = null
afterEach(() => {
  const r = root
  root = null
  if (r) act(() => r.unmount())
})

describe('a Link cell naming a page', () => {
  it('a Link cell naming a heading opens the page at it', async () => {
    const select = vi.fn(async () => {})
    useSession.setState({ tree: makeTree(), select })
    const container = document.createElement('div')
    root = createRoot(container)
    await act(async () =>
      root?.render(createElement(LinkCell, { raw: '[[Alpha#Setup]]', def: undefined })),
    )
    const link = container.querySelector('.cell-connection') as HTMLElement
    await act(async () => {
      link.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, button: 0 }))
    })
    expect(select).toHaveBeenCalledWith(
      { kind: 'page', id: 'p1', path: 'Notes/Alpha.md' },
      { newTab: false, heading: 'Setup' },
    )
  })
  it('a bare `[[#Heading]]` names the page it sits on and opens it at the heading', async () => {
    const select = vi.fn(async () => {})
    useSession.setState({ tree: makeTree(), select })
    const holder = { id: 'p1', title: 'Page', path: 'X/Page.md' }
    const press = async (props: { holder?: typeof holder }): Promise<HTMLElement> => {
      const container = document.createElement('div')
      root = createRoot(container)
      await act(async () =>
        root?.render(createElement(LinkCell, { raw: '[[#Setup]]', def: undefined, ...props })),
      )
      const link = container.querySelector('.cell-connection') as HTMLElement
      await act(async () => {
        link.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, button: 0 }))
      })
      act(() => root?.unmount())
      root = null
      return link
    }
    const held = await press({ holder })
    expect(held.textContent).toBe('#Setup')
    expect(held.getAttribute('href')).toBe('X/Page.md')
    expect(select).toHaveBeenCalledWith(
      { kind: 'page', id: 'p1', path: 'X/Page.md' },
      { newTab: false, heading: 'Setup' },
    )
    select.mockClear()
    const bare = await press({})
    expect(bare.textContent).toBe('#Setup')
    expect(select).not.toHaveBeenCalled()
  })
})
