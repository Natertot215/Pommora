// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { SelectTarget, Tab } from '@pommora/core/Navigation/navRef'
import { useSession } from '../Session/store'
import { stubDialer } from '../vitest.setup'
import { runCommand } from './commandRouter'

const ctx = (id: string): SelectTarget => ({ kind: 'context', id })
const tab = (id: string): Tab => ({ id, target: ctx(id), navStack: [ctx(id)], navIndex: 0 })
const page = (id: string) => ({ kind: 'page', id, path: `${id}.md` }) as const

let frame: HTMLDivElement
let field: HTMLInputElement

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
})
afterEach(() => frame.remove())

describe('tab chords follow focus', () => {
  it('Ctrl+Tab cycles the main bar while focus is outside every window', () => {
    useSession.getState().openWindowTab(page('a'))
    useSession.getState().openWindowTab(page('b'))
    runCommand('next-tab')
    expect(useSession.getState().activeTabId).toBe('t2')
  })

  it('Ctrl+Tab cycles the window’s tabs while it holds focus, leaving the main bar', () => {
    useSession.getState().openWindowTab(page('a'))
    useSession.getState().openWindowTab(page('b'))
    const win = useSession.getState().windowSlot!
    field.focus()
    runCommand('next-tab')
    expect(useSession.getState().windowSlot!.activeTabId).toBe(win.tabs[0].id)
    expect(useSession.getState().activeTabId).toBe('t1')
  })

  it('a second Ctrl+Tab stays in the window after the first switch drops the focused body', () => {
    useSession.getState().openWindowTab(page('a'))
    useSession.getState().openWindowTab(page('b'))
    const win = useSession.getState().windowSlot!
    field.focus()
    runCommand('next-tab')
    field.remove()
    runCommand('next-tab')
    expect(useSession.getState().windowSlot!.activeTabId).toBe(win.tabs[1].id)
    expect(useSession.getState().activeTabId).toBe('t1')
  })

  it('⌘N opens a main tab while a Page Window stands behind the main pane', () => {
    useSession.getState().openWindowTab(page('a'))
    runCommand('new-tab')
    expect(useSession.getState().windowSlot?.tabs).toHaveLength(1)
    expect(useSession.getState().tabs.at(-1)?.target.kind).toBe('newtab')
  })

  it('⌘F leaves the main view alone while a window holds focus', () => {
    field.focus()
    expect(runCommand('search')).toBe(false)
  })

  it('⌘N on the NavWindow’s map tab carries the list into a new main tab', () => {
    frame.className = 'window navwindow'
    useSession.getState().openNav()
    field.focus()
    runCommand('new-tab')
    expect(useSession.getState().windowSlot).toBeNull()
    expect(useSession.getState().tabs.at(-1)?.target.kind).toBe('newtab')
  })

  it('⌘N in a focused Page Window promotes its active tab', () => {
    useSession.getState().openWindowTab(page('a'))
    field.focus()
    runCommand('new-tab')
    expect(useSession.getState().windowSlot).toBeNull()
  })
})
