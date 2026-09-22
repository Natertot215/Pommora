import type { WindowTabTarget, WindowTarget } from '@pommora/core/Navigation/navRef'
import { clamp } from '@pommora/uix/Utilities/clamp'
import { moveItem } from '@pommora/uix/Utilities/moveItem'
import type { WindowKind } from './windowRecord'

// Bespoke close/spawn (NOT tabsModel's) — the last tab closing kills the window, there are no pins, and a Matrix window holds no tabs.

export interface WindowTab {
  id: string
  target: WindowTabTarget
}

export interface WindowState {
  kind: WindowKind
  tabs: WindowTab[]
  activeTabId: string
}

export function openTabIn(
  win: WindowState,
  makeId: () => string,
  target: WindowTarget,
  at?: number,
): WindowState {
  const first = win.tabs.findIndex((t) => t.target.kind !== 'navwindow')
  const base = first === -1 ? win.tabs.length : first
  const slot = at === undefined ? undefined : clamp(at + base, base, win.tabs.length)
  const from = win.tabs.findIndex((t) => t.target.kind !== 'navwindow' && t.target.id === target.id)
  if (from !== -1) {
    if (slot === undefined) {
      const existing = win.tabs[from]
      return existing.id === win.activeTabId ? win : { ...win, activeTabId: existing.id }
    }
    const to = clamp(slot > from ? slot - 1 : slot, base, win.tabs.length - 1)
    return to === from ? win : { ...win, tabs: moveItem(win.tabs, from, to) }
  }
  const tab: WindowTab = { id: makeId(), target }
  if (slot !== undefined)
    return { ...win, tabs: [...win.tabs.slice(0, slot), tab, ...win.tabs.slice(slot)] }
  return { ...win, tabs: [...win.tabs, tab], activeTabId: tab.id }
}

export function reorderTabIn(win: WindowState, activeId: string, overId: string): WindowState {
  const from = win.tabs.findIndex((t) => t.id === activeId)
  const to = win.tabs.findIndex((t) => t.id === overId)
  if (from === -1 || to === -1 || from === to) return win
  if (win.tabs[from].target.kind === 'navwindow' || win.tabs[to].target.kind === 'navwindow')
    return win
  return { ...win, tabs: moveItem(win.tabs, from, to) }
}

export function closeTabIn(win: WindowState, id: string): WindowState | null {
  const idx = win.tabs.findIndex((t) => t.id === id)
  if (idx === -1) return win
  if (win.tabs[idx].target.kind === 'navwindow') return win
  const tabs = win.tabs.filter((t) => t.id !== id)
  if (tabs.length === 0) return null
  const activeTabId = win.activeTabId === id ? tabs[Math.max(0, idx - 1)].id : win.activeTabId
  return { ...win, tabs, activeTabId }
}
