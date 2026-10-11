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
    headingsOf: (path) =>
      path === holder.path
        ? { keys: ['setup'], texts: ['Setup'], outline: [{ text: 'Setup', level: 2 }] }
        : undefined,
    location: () => [],
    open,
  }
  const mount = async (): Promise<HTMLDivElement> => {
    useSession.setState({
      tree: makeTree({ personalization: { inPageHeadingResolution: 'automatic' } }),
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
})
