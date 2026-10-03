// @vitest-environment jsdom
import { detail } from '../Testing/fixtures'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { ok } from '../Contract/result'
import type { PageTarget, SelectTarget } from '../Navigation/navRef'
import { NO_PREFS } from '../Testing/editorHarness'
import { PageView } from '../Pages/PageView'
import { stubDialer } from '../vitest.setup'
import { clearCache } from './pageDetailCache'
import { useSession } from './store'
import { makeTree } from '../Testing/testTree'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const A: PageTarget = { kind: 'page', id: 'a', path: 'Notes/A.md' }
const HOME: SelectTarget = { kind: 'homepage' }

let container: HTMLDivElement
let root: Root

beforeEach(() => {
  ;(globalThis as { ResizeObserver?: unknown }).ResizeObserver ??= class {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
  }
  clearCache()
  ;(window as unknown as { nexus: unknown }).nexus = stubDialer({
    'page:open': vi.fn(async () => ok(detail({ id: 'a', path: A.path, body: '## Setup\ntext' }))),
    'nav:write': vi.fn(async () => ok(null)),
    'tabs:save': vi.fn(async () => ok(null)),
    'editorPrefs:get': vi.fn(async () => ok(NO_PREFS)),
    'editorPrefs:set': vi.fn(async () => ok(null)),
    'menu:action': vi.fn(() => () => undefined),
  })
  useSession.setState({
    tabs: [{ id: 't1', target: HOME, navStack: [HOME], navIndex: 0 }],
    activeTabId: 't1',
    tabMru: ['t1'],
    pinnedTabs: [],
    recents: [],
    pendingTravel: null,
    windowSlot: null,
    pages: {
      a: {
        status: 'ready',
        target: A,
        detail: detail({ id: 'a', title: 'A', path: A.path, body: '## Setup\ntext' }),
        body: '## Setup\ntext',
      },
    },
  })
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})

afterEach(async () => {
  await act(async () => root.unmount())
  container.remove()
})

describe('a heading travel waits for the tab it was opened in', () => {
  it('a background tab parks its travel under its own id, and another tab later showing the page leaves it', async () => {
    useSession.setState({ tree: makeTree({ personalization: { tabTakeFocus: false } }) })
    await useSession.getState().select(A, { newTab: true, heading: 'Setup' })
    const { tabs, activeTabId, pendingTravel } = useSession.getState()
    expect(activeTabId).toBe('t1')
    expect(pendingTravel).toMatchObject({ route: 'tab', tabId: tabs[tabs.length - 1].id })
    expect(tabs[tabs.length - 1].id).not.toBe('t1')

    await act(async () => {
      root.render(createElement(PageView, { tabId: 't1', pageId: 'a' }))
      await new Promise((r) => setTimeout(r, 20))
    })
    expect(useSession.getState().pendingTravel).toMatchObject({ heading: 'Setup' })
  })

  it('openWindowTab parks its travel even when the page is already the window’s active tab', () => {
    useSession.setState({
      windowSlot: { kind: 'page', tabs: [{ id: 'w1', target: A }], activeTabId: 'w1' },
    })
    useSession.getState().openWindowTab(A, { heading: 'Setup' })
    expect(useSession.getState().pendingTravel).toEqual({
      route: 'window',
      path: A.path,
      heading: 'Setup',
    })
  })
})
