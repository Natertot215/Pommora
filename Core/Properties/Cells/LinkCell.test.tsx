// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { makeTree } from '../../Testing/testTree'
import { useSession } from '../../Session/store'
import { buildPageIndex } from '../../Connections/pageIndex'
import type { ConnectionsApi } from '../../MarkdownPM/Links/connectionsApi'
import { glanceHost } from '../../Interface/Glance/glanceAction'
import { solidColorCss } from '@pommora/uix/Theme/ramp'
import { openWebLink } from '../../Web/openWebLink'
import { LinkCell } from './LinkCell'

vi.mock('../../Web/openWebLink', () => ({ openWebLink: vi.fn() }))
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let root: Root | null = null
let host: HTMLDivElement | null = null
afterEach(() => {
  const r = root
  root = null
  if (r) act(() => r.unmount())
  host?.remove()
  vi.restoreAllMocks()
})

const alpha = { id: 'a', title: 'Alpha', path: 'Notes/Alpha.md' }
const holder = { id: 'h', title: 'Holder', path: 'X/Holder.md' }
const open = vi.fn()
const conn: ConnectionsApi = {
  index: buildPageIndex([
    alpha,
    holder,
    { id: 'd1', title: 'Dup', path: 'A/Dup.md' },
    { id: 'd2', title: 'Dup', path: 'B/Dup.md' },
  ]),
  headingsOf: () => undefined,
  open,
}

const def = { id: 'prop_l', name: 'Site', type: 'link', link_color: 'blue' } as const
const bubbled = vi.fn()

const mount = async (raw: string, withHolder = false): Promise<HTMLDivElement> => {
  useSession.setState({ tree: makeTree() })
  const el = document.createElement('div')
  host = el
  document.body.appendChild(el)
  root = createRoot(el)
  await act(async () =>
    root?.render(
      createElement(
        'div',
        { onClick: bubbled },
        createElement(LinkCell, {
          raw,
          def,
          connections: () => conn,
          ...(withHolder ? { holder } : {}),
        }),
      ),
    ),
  )
  return el
}

const click = async (el: Element, init: MouseEventInit = {}): Promise<void> =>
  act(async () => {
    el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, ...init }))
  })

describe('a Link value naming a page draws and follows as every link does', () => {
  it('a heading link draws its page and heading joined by § in the resolved tone', async () => {
    const el = await mount('[[Alpha#Setup]]')
    const link = el.querySelector('.md-connection-resolved')
    expect(link?.textContent).toBe('Alpha§Setup')
    expect(link?.hasAttribute('data-link')).toBe(true)
  })

  it('a missing page draws phantom and a shared title ambiguous', async () => {
    expect((await mount('[[Nope]]')).querySelector('.md-connection-phantom')).not.toBeNull()
    act(() => root?.unmount())
    root = null
    expect((await mount('[[Dup]]')).querySelector('.md-connection-ambiguous')).not.toBeNull()
  })

  it('a hand-written markdown link to a page, and a bare heading on its holder, resolve', async () => {
    expect((await mount('[x](Alpha)')).querySelector('.md-connection-resolved')).not.toBeNull()
    act(() => root?.unmount())
    root = null
    expect(
      (await mount('[[#Setup]]', true)).querySelector('.md-connection-resolved'),
    ).not.toBeNull()
  })

  it('a click on the text opens through the connections, ⌘ in a new tab', async () => {
    open.mockClear()
    const el = await mount('[[Alpha#Setup]]')
    const link = el.querySelector('[data-link]') as HTMLElement
    await click(link)
    expect(open).toHaveBeenLastCalledWith(alpha, 'Setup', false)
    await click(link, { metaKey: true })
    expect(open).toHaveBeenLastCalledWith(alpha, 'Setup', true)
  })
})

describe('a Link value holding an address or plain text keeps the property’s own look', () => {
  it('an address draws in the property color, arms the glance on pointer over, and a click closes a glance it is not inside', async () => {
    const arm = vi.spyOn(glanceHost, 'arm').mockImplementation(() => {})
    const close = vi.spyOn(glanceHost, 'close').mockImplementation(() => {})
    const el = await mount('https://a.com')
    const link = el.querySelector('a.cell-link') as HTMLAnchorElement
    expect(link.textContent).toBe('https://a.com')
    expect(link.style.color).toBe(solidColorCss('blue'))
    act(() => {
      link.dispatchEvent(new MouseEvent('pointerover', { bubbles: true }))
    })
    expect(arm).toHaveBeenCalledWith({ kind: 'url', url: 'https://a.com' }, link)
    await click(link)
    expect(close).toHaveBeenCalledOnce()
    expect(openWebLink).toHaveBeenCalledWith('https://a.com')
  })

  it('text that names nothing draws as the address half and lets a click bubble', async () => {
    bubbled.mockClear()
    const el = await mount('foo')
    const link = el.querySelector('a.cell-link') as HTMLAnchorElement
    expect(link.textContent).toBe('foo')
    await click(link)
    expect(bubbled).toHaveBeenCalledOnce()
  })
})
