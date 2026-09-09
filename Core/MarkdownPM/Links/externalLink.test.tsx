// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ok } from '@pommora/core/Contract/result'
import { act } from 'react'
import type { EditorView } from '@codemirror/view'
import { type ConnMenuAction, connectionMenuModel } from '@pommora/core/Actions/connectionMenu'
import type { ConnectionsApi } from './connectionsApi'
import { buildPageIndex } from '@pommora/core/Connections/pageIndex'
import { showConnectionMenu } from '../../Interface/Menus/connectionMenuActions'
import { cleanupEditor, mountEditor, seedHost, stubEditorBridge } from '../editorHarness'

class ResizeObserverStub {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}
;(globalThis as { ResizeObserver?: unknown }).ResizeObserver = ResizeObserverStub

const openExternal = vi.fn()
const connMenu = vi.fn<(req: unknown) => Promise<ConnMenuAction | null>>()
const writeClipboard = vi.fn()
stubEditorBridge({
  menu: async (req: unknown) => ok(await connMenu(req)),
  'clipboard:write': writeClipboard,
})
seedHost({ openLink: openExternal })

beforeEach(() => {
  openExternal.mockReset()
  writeClipboard.mockReset()
  connMenu.mockReset()
  connMenu.mockResolvedValue(null)
})
afterEach(async () => {
  await cleanupEditor()
})

const BODY = 'a [Home](https://x.test) b'

const press = (view: EditorView, pos: number, target: HTMLElement): void => {
  vi.spyOn(view, 'posAtCoords').mockReturnValue(pos)
  target.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, button: 0 }))
  target.dispatchEvent(new MouseEvent('click', { bubbles: true, button: 0, detail: 1 }))
}

const label = (view: EditorView): HTMLElement => view.dom.querySelector('.md-link') as HTMLElement

describe('an external link opens from its label and nowhere else', () => {
  it('a click on the label opens it', async () => {
    const view = await mountEditor({ initialBody: BODY })
    await act(async () => view.focus())
    view.dispatch({ selection: { anchor: 0 } })
    press(view, 5, label(view))
    expect(openExternal).toHaveBeenCalledWith('https://x.test')
  })

  it('a click that clamps in from beside the label does not open it', async () => {
    const view = await mountEditor({ initialBody: BODY })
    await act(async () => view.focus())
    view.dispatch({ selection: { anchor: 0 } })
    press(view, 7, view.contentDOM)
    expect(openExternal).not.toHaveBeenCalled()
  })

  it('a link the caret was already inside when pressed does not open it', async () => {
    const view = await mountEditor({ initialBody: BODY })
    await act(async () => view.focus())
    view.dispatch({ selection: { anchor: 5 } })
    press(view, 5, label(view))
    expect(openExternal).not.toHaveBeenCalled()
  })
})

describe('a link whose target names nothing is text, not a link', () => {
  const BROKEN = 'a [Home](not a url) b'
  const brokenLabel = (view: EditorView): HTMLElement =>
    view.dom.querySelector('.md-link-invalid') as HTMLElement

  it('a click on its label opens nothing', async () => {
    const view = await mountEditor({ initialBody: BROKEN })
    await act(async () => view.focus())
    view.dispatch({ selection: { anchor: 0 } })
    press(view, 5, brokenLabel(view))
    expect(openExternal).not.toHaveBeenCalled()
  })

  it('a right press over it offers no link menu', async () => {
    const view = await mountEditor({ initialBody: BROKEN })
    await act(async () => view.focus())
    view.dispatch({ selection: { anchor: 0 } })
    vi.spyOn(view, 'posAtCoords').mockReturnValue(5)
    await act(async () => {
      brokenLabel(view).dispatchEvent(
        new MouseEvent('contextmenu', { bubbles: true, cancelable: true }),
      )
      await Promise.resolve()
    })
    expect(connMenu).not.toHaveBeenCalled()
  })
})

describe('a markdown link’s menu follows what its target names', () => {
  const conn: ConnectionsApi = {
    ...buildPageIndex([{ id: 'p1', title: 'Alpha', path: 'Notes/Alpha.md' }]),
    open: () => {},
    menu: showConnectionMenu,
  }

  const rightClick = async (view: EditorView, pos: number, selector: string): Promise<void> => {
    vi.spyOn(view, 'posAtCoords').mockReturnValue(pos)
    const el = view.dom.querySelector(selector) as HTMLElement
    await act(async () => {
      el.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true }))
      await Promise.resolve()
    })
  }

  it('a web address is offered its address and nothing that needs a page', async () => {
    connMenu.mockResolvedValue('title:copylink')
    const view = await mountEditor({ initialBody: BODY, connections: conn })
    await rightClick(view, 5, '.md-link')
    expect(connMenu).toHaveBeenCalledWith({
      items: connectionMenuModel({
        surface: 'editor',
        editable: true,
        hasAlias: false,
        external: true,
      }),
      anchor: undefined,
    })
    expect(writeClipboard).toHaveBeenCalledWith('https://x.test')
  })

  it('a target naming a page is offered the page menu, path included', async () => {
    connMenu.mockResolvedValue('title:copypath')
    const view = await mountEditor({ initialBody: 'a [Alpha](Alpha) b', connections: conn })
    await rightClick(view, 5, '.md-connection-resolved')
    expect(connMenu).toHaveBeenCalledWith({
      items: connectionMenuModel({
        surface: 'editor',
        editable: false,
        hasAlias: false,
        open: 'closed',
        windowed: false,
      }),
      anchor: undefined,
    })
    expect(writeClipboard).toHaveBeenCalledWith('Notes/Alpha')
  })
})
