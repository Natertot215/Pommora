// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { makeTree } from '../../Testing/testTree'
import { useSession } from '../../Session/store'
import { buildPageIndex } from '../../Connections/pageIndex'
import type { ConnectionsApi } from '../../MarkdownPM/Links/connectionsApi'
import { previewConnections } from '../../Session/pageConnections'
import { TextCell } from './TextCell'
import type { ValueContext } from '../valueContext'
import { glanceHost } from '../../Interface/Glance/glanceAction'
import { connectionMenuModel } from '../../Actions/connectionMenu'
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const ctxOf = (connections: () => ConnectionsApi | undefined): ValueContext =>
  ({
    connections,
    headingLinkStyle: 'page-heading',
    inPageHeadingResolution: 'automatic',
  }) as unknown as ValueContext

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
    index: buildPageIndex([holder]),
    headingsOf: (path) => useSession.getState().headings[path],
    open,
  }
  const headings = (text: string) => ({
    [holder.path]: { keys: [text.toLowerCase()], texts: [text], outline: [{ text, level: 2 }] },
  })
  const mount = async (
    connections = (): ConnectionsApi | undefined => conn,
  ): Promise<HTMLDivElement> => {
    useSession.setState({
      tree: makeTree(),
      headings: headings('Setup'),
    })
    host = document.createElement('div')
    document.body.appendChild(host)
    root = createRoot(host)
    await act(async () =>
      root?.render(
        createElement(TextCell, { text: '[[#Nope]] see §Setup', ctx: ctxOf(connections), holder }),
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

  it('a § run opens a menu of Open and Copy alone, and glances at the page’s heading', async () => {
    const menu = vi.fn(async () => null)
    const api = { ...conn, menu }
    const arm = vi.spyOn(glanceHost, 'arm').mockImplementation(() => {})
    useSession.setState({
      tree: makeTree(),
      headings: headings('Setup'),
    })
    host = document.createElement('div')
    document.body.appendChild(host)
    root = createRoot(host)
    await act(async () =>
      root?.render(
        createElement(TextCell, {
          text: 'see §Setup',
          ctx: ctxOf(() => api),
          holder,
        }),
      ),
    )
    const run = host.querySelector('.md-section-run') as HTMLElement
    await act(async () => {
      run.dispatchEvent(
        new MouseEvent('contextmenu', { bubbles: true, cancelable: true, button: 2 }),
      )
      run.dispatchEvent(new MouseEvent('pointerover', { bubbles: true }))
    })
    expect(menu).toHaveBeenCalledWith({
      kind: 'page',
      page: holder,
      heading: 'Setup',
      editable: false,
    })
    const labels = connectionMenuModel({
      kind: 'page',
      open: 'closed',
      windowed: false,
      editable: false,
    }).map((i) => i.label)
    expect(labels).not.toContain('Rename')
    expect(labels).not.toContain('Remove Link')
    expect(arm).toHaveBeenCalledWith(
      { kind: 'page', id: holder.id, path: holder.path, heading: 'Setup' },
      run,
    )
    arm.mockRestore()
  })

  it('a click on a link that follows nothing is left to the value', async () => {
    useSession.setState({ tree: makeTree() })
    const dup = {
      ...conn,
      index: buildPageIndex([holder, { ...holder, id: 'h2', path: 'Y/Holder.md' }]),
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
          createElement(TextCell, { text: '[[Holder]]', ctx: ctxOf(() => dup) }),
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
              ctx: ctxOf(() => ({ ...conn, menu })),
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
    const el = await mount(previewConnections)
    expect(el.querySelector('.md-section-run')).not.toBeNull()
    await act(async () => {
      useSession.setState({ headings: headings('Fresh') })
    })
    expect(el.querySelector('.md-section-run')).toBeNull()
    expect(el.querySelector('.md-connection-heading-missing')?.textContent).toBe('Nope')
  })
})

describe('a list value at rest', () => {
  const page = { id: 'p1', title: 'Target', path: 'X/Target.md' }
  const open = vi.fn()
  const conn: ConnectionsApi = {
    index: buildPageIndex([page]),
    headingsOf: () => undefined,
    open,
  }
  const draw = async (text: string): Promise<HTMLDivElement> => {
    useSession.setState({ tree: makeTree(), headings: {} })
    host = document.createElement('div')
    document.body.appendChild(host)
    root = createRoot(host)
    await act(async () => root?.render(createElement(TextCell, { text, ctx: ctxOf(() => conn) })))
    return host
  }
  const line = (el: HTMLElement): Element => el.querySelector('.cell-text') as Element

  it('draws one glyph and the first item, marking what runs on', async () => {
    const el = await draw('- milk\n- eggs')
    expect(el.querySelectorAll('.md-list-bullet')).toHaveLength(1)
    expect(line(el).textContent).toBe('•milk')
    expect(line(el).classList.contains('is-continued')).toBe(true)
  })

  it('marks a plain value running on, and no value that ends in blank lines', async () => {
    expect(line(await draw('milk\neggs')).classList.contains('is-continued')).toBe(true)
    act(() => root?.unmount())
    expect(line(await draw('milk\n\n')).classList.contains('is-continued')).toBe(false)
  })

  it('draws a number with its written text', async () => {
    const el = await draw('3. milk')
    expect(el.querySelector('.md-list-number')?.textContent).toBe('3.')
    expect(el.querySelector('.md-list-text')?.textContent).toBe('milk')
  })

  it('draws a checked item done, and a press on its box falls through to the value', async () => {
    const el = await draw('- [x] milk')
    expect(line(el).classList.contains('md-list-done')).toBe(true)
    const seen = vi.fn()
    el.addEventListener('click', seen)
    const box = el.querySelector('.md-list-checkbox-seat') as HTMLElement
    await act(async () => {
      box.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, button: 0 }))
    })
    expect(seen.mock.calls[0][0].defaultPrevented).toBe(false)
  })

  it('marks an item’s link with its span in the whole value, and a click follows it', async () => {
    const value = '- see [[Target]]\n- more'
    const el = await draw(value)
    const link = el.querySelector('[data-link]') as HTMLElement
    const at = value.indexOf('[[')
    expect(link.getAttribute('data-src')).toBe(`${at},${at + '[[Target]]'.length}`)
    await act(async () => {
      link.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, button: 0 }))
    })
    expect(open).toHaveBeenCalledWith(page, undefined, false)
  })
})
