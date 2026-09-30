// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { pushDismissal, useWindowOrder } from '@pommora/uix/Interactions/dismissalStack'
import type { SelectTarget, Tab } from '../Navigation/navRef'
import { useSession } from '../Session/store'
import { stubDialer } from '../vitest.setup'
import { runCommand } from './commandRouter'

const ctx = (id: string): SelectTarget => ({ kind: 'context', id })
const tab = (id: string): Tab => ({ id, target: ctx(id), navStack: [ctx(id)], navIndex: 0 })
const page = (id: string) => ({ kind: 'page', id, path: `${id}.md` }) as const
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let frame: HTMLDivElement
let field: HTMLInputElement
let order: Root

function Stands(): null {
  useWindowOrder({ current: frame }, true)
  return null
}

beforeEach(() => {
  ;(window as unknown as { nexus: unknown }).nexus = stubDialer({
    'page:open': async () => ({ ok: true, value: {} }),
    'tabs:save': async () => ({ ok: true, value: null }),
    'nav:write': async () => ({ ok: true, value: null }),
  })
  useSession.getState().resetWindow()
  useSession.setState({
    tabs: [tab('t1'), tab('t2')],
    activeTabId: 't1',
    tabMru: ['t1'],
    pinned: [],
    pinnedTabs: [],
  })
  frame = document.createElement('div')
  frame.className = 'window page-window'
  frame.tabIndex = -1
  field = document.createElement('input')
  frame.appendChild(field)
  document.body.appendChild(frame)
  order = createRoot(document.createElement('div'))
  act(() => order.render(createElement(Stands)))
})
afterEach(() => {
  act(() => order.unmount())
  frame.remove()
})

describe('tab chords follow focus', () => {
  it('Ctrl+Tab cycles the main bar while focus is outside every window', () => {
    useSession.getState().openWindowTab(page('a'))
    useSession.getState().openWindowTab(page('b'))
    runCommand('next-tab')
    expect(useSession.getState().activeTabId).toBe('t2')
  })

  it('Ctrl+Tab cycles the window’s tabs while it holds focus, and stays there after the switch drops the focused body', () => {
    useSession.getState().openWindowTab(page('a'))
    useSession.getState().openWindowTab(page('b'))
    const win = useSession.getState().windowSlot!
    field.focus()
    runCommand('next-tab')
    expect(useSession.getState().windowSlot!.activeTabId).toBe(win.tabs[0].id)
    field.remove()
    runCommand('next-tab')
    expect(useSession.getState().windowSlot!.activeTabId).toBe(win.tabs[1].id)
    expect(useSession.getState().activeTabId).toBe('t1')
  })

  it('Ctrl+Tab in a one-tab window leaves the focus on the field', () => {
    useSession.getState().openWindowTab(page('a'))
    field.focus()
    runCommand('next-tab')
    expect(document.activeElement).toBe(field)
  })

  it('⌘N opens a main tab while a Page Window stands behind the main pane', () => {
    useSession.getState().openWindowTab(page('a'))
    runCommand('new-tab')
    expect(useSession.getState().windowSlot?.tabs).toHaveLength(1)
    expect(useSession.getState().tabs.at(-1)?.target.kind).toBe('newtab')
  })

  it('⌘F searches the active main tab while focus is outside every window', () => {
    const col = { kind: 'collection', id: 'c2' } as const
    useSession.setState({
      tabs: [tab('t1'), { id: 't2', target: col, navStack: [col], navIndex: 0 }],
      activeTabId: 't2',
      viewSearch: {},
    })
    expect(runCommand('search')).toBe(true)
    expect(Object.keys(useSession.getState().viewSearch)).toEqual(['t2'])
  })

  it('⌘F leaves the main view alone while a window holds focus', () => {
    field.focus()
    expect(runCommand('search')).toBe(false)
  })

  it('⌘N on the NavWindow’s map tab carries the list into a new main tab it switches to', () => {
    frame.className = 'window navwindow'
    useSession.setState({
      personalization: { tabTakeFocus: false },
      devicePrefs: { ...useSession.getState().devicePrefs, navWindowGallery: true },
    })
    useSession.getState().openNav()
    field.focus()
    runCommand('new-tab')
    const s = useSession.getState()
    expect(s.windowSlot).toBeNull()
    expect(s.tabs.at(-1)?.target.kind).toBe('newtab')
    expect(s.activeTabId).toBe(s.tabs.at(-1)?.id)
    expect(s.devicePrefs.navViewGallery).toBe(true)
  })

  it('⌘N in a focused Page Window promotes its active tab', () => {
    useSession.getState().openWindowTab(page('a'))
    field.focus()
    runCommand('new-tab')
    expect(useSession.getState().windowSlot).toBeNull()
  })

  it('a picker opened from inside the window counts as the window', () => {
    useSession.getState().openWindowTab(page('a'))
    const pane = document.createElement('div')
    const option = document.createElement('button')
    pane.appendChild(option)
    document.body.appendChild(pane)
    const picker = pushDismissal({ layer: () => pane, trigger: () => field, dismiss: () => {} })
    option.focus()
    runCommand('new-tab')
    expect(useSession.getState().windowSlot).toBeNull()
    picker.release()
    pane.remove()
  })
})
