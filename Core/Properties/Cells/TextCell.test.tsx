// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { makeTree } from '../../Testing/testTree'
import { useSession } from '../../Session/store'
import { buildPageIndex } from '../../Connections/pageIndex'
import type { ConnectionsApi } from '../../MarkdownPM/Links/connectionsApi'
import { TextCell } from './TextCell'
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let root: Root | null = null
let host: HTMLDivElement | null = null
afterEach(() => {
  const r = root
  root = null
  if (r) act(() => r.unmount())
  host?.remove()
})

describe('a Text value draws against the page that holds it', () => {
  const holder = { id: 'h1', title: 'Holder', path: 'X/Holder.md' }
  const open = vi.fn()
  const conn: ConnectionsApi = {
    ...buildPageIndex([holder]),
    headingsOf: () => undefined,
    location: () => [],
    open,
  }
  const headings = (text: string) => ({
    [holder.path]: { keys: [text.toLowerCase()], texts: [text], outline: [{ text, level: 2 }] },
  })
  const mount = async (): Promise<HTMLDivElement> => {
    useSession.setState({
      tree: makeTree({ personalization: { inPageHeadingResolution: 'automatic' } }),
      headings: headings('Setup'),
    })
    host = document.createElement('div')
    document.body.appendChild(host)
    root = createRoot(host)
    await act(async () =>
      root?.render(
        createElement(TextCell, { text: '[[#Nope]] see §Setup', connections: () => conn, holder }),
      ),
    )
    return host
  }

  it('marks a heading its page lacks as missing', async () => {
    const el = await mount()
    expect(el.querySelector('.md-connection-heading-missing')?.textContent).toBe('Nope')
  })

  it('draws a § run over the page’s heading, and a click opens the page there', async () => {
    const el = await mount()
    const run = el.querySelector('.md-section-run') as HTMLElement
    expect(run.textContent).toBe('§Setup')
    await act(async () => {
      run.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, button: 0 }))
    })
    expect(open).toHaveBeenCalledWith(holder, 'Setup', false)
  })

  it('a click on a link that follows nothing is left to the value', async () => {
    useSession.setState({ tree: makeTree() })
    const dup = {
      ...conn,
      ...buildPageIndex([holder, { ...holder, id: 'h2', path: 'Y/Holder.md' }]),
    }
    const bubbled = vi.fn()
    host = document.createElement('div')
    document.body.appendChild(host)
    root = createRoot(host)
    await act(async () =>
      root?.render(
        createElement(
          'div',
          { onClick: bubbled },
          createElement(TextCell, { text: '[[Holder]]', connections: () => dup }),
        ),
      ),
    )
    const link = host.querySelector('.md-connection-ambiguous') as HTMLElement
    await act(async () => {
      link.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, button: 0 }))
    })
    expect(bubbled).toHaveBeenCalledOnce()
  })

  it('declines the link menu when told to, leaving the right-click to the value', async () => {
    const menu = vi.fn(async () => null)
    const parent = vi.fn()
    const mountWith = async (props: { menu?: boolean }): Promise<HTMLElement> => {
      host = document.createElement('div')
      document.body.appendChild(host)
      root = createRoot(host)
      await act(async () =>
        root?.render(
          createElement(
            'div',
            { onContextMenu: parent },
            createElement(TextCell, {
              text: '[[Holder]]',
              connections: () => ({ ...conn, menu }),
              ...props,
            }),
          ),
        ),
      )
      return host.querySelector('[data-link]') as HTMLElement
    }
    const rightClick = (el: HTMLElement) =>
      act(async () => {
        el.dispatchEvent(
          new MouseEvent('contextmenu', { bubbles: true, cancelable: true, button: 2 }),
        )
      })
    await rightClick(await mountWith({ menu: false }))
    expect(menu).not.toHaveBeenCalled()
    expect(parent).toHaveBeenCalledOnce()
    act(() => root?.unmount())
    root = null
    await rightClick(await mountWith({}))
    expect(menu).toHaveBeenCalledOnce()
    expect(parent).toHaveBeenCalledOnce()
  })

  it('redraws when its holder’s headings change in the session', async () => {
    const el = await mount()
    expect(el.querySelector('.md-section-run')).not.toBeNull()
    await act(async () => {
      useSession.setState({ headings: headings('Fresh') })
    })
    expect(el.querySelector('.md-section-run')).toBeNull()
    expect(el.querySelector('.md-connection-heading-missing')?.textContent).toBe('Nope')
  })
})
