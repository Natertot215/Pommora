import type { WindowTabTarget, WindowTarget } from '../../Navigation/navRef'
import { clamp } from '@pommora/uix/Utilities/clamp'
import { moveBefore, placeAt } from '@pommora/uix/Utilities/moveItem'
import type { WindowKind } from './windowRecord'

// Bespoke close/spawn (NOT tabsModel's): the last tab closing kills the window, the map tab never closes, and a Matrix window holds no tabs.

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
  const first = win.tabs.findIndex((t) => t.target.kind !== 'map')
  const base = first === -1 ? win.tabs.length : first
  const from = win.tabs.findIndex((t) => t.target.kind !== 'map' && t.target.id === target.id)
  if (at !== undefined) {
    const slot = clamp(at + base, base, win.tabs.length)
    const tabs = placeAt(win.tabs, from, slot, () => ({ id: makeId(), target }))
    return tabs === win.tabs ? win : { ...win, tabs }
  }
  if (from !== -1) {
    const existing = win.tabs[from]
    return existing.id === win.activeTabId ? win : { ...win, activeTabId: existing.id }
  }
  const tab: WindowTab = { id: makeId(), target }
  return { ...win, tabs: [...win.tabs, tab], activeTabId: tab.id }
}

export function reorderTabIn(win: WindowState, id: string, beforeId: string | null): WindowState {
  const isMap = (key: string | null): boolean =>
    win.tabs.some((t) => t.id === key && t.target.kind === 'map')
  if (isMap(id) || isMap(beforeId)) return win
  const tabs = moveBefore(win.tabs, (t) => t.id, id, beforeId)
  return tabs ? { ...win, tabs } : win
}

export function closeTabIn(win: WindowState, id: string): WindowState | null {
  const idx = win.tabs.findIndex((t) => t.id === id)
  if (idx === -1) return win
  if (win.tabs[idx].target.kind === 'map') return win
  const tabs = win.tabs.filter((t) => t.id !== id)
  if (tabs.length === 0) return null
  const activeTabId = win.activeTabId === id ? tabs[Math.max(0, idx - 1)].id : win.activeTabId
  return { ...win, tabs, activeTabId }
}
