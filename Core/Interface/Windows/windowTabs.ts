import type { WindowTabTarget } from '@pommora/core/Navigation/navRef'
import { moveItem } from '@pommora/uix/Utilities/moveItem'

// Bespoke close/spawn (NOT tabsModel's) — the last tab closing kills the window, and there are no pins.

export interface WindowTab {
  id: string
  target: WindowTabTarget
}

export interface WindowState {
  kind: 'page' | 'nav'
  originId: string
  tabs: WindowTab[]
  activeTabId: string
}

const targetPageId = (t: WindowTabTarget): string | null => (t.kind === 'page' ? t.id : null)

export function openTabIn(
  win: WindowState,
  makeId: () => string,
  target: { id: string; path: string },
): WindowState {
  const existing = win.tabs.find((t) => targetPageId(t.target) === target.id)
  if (existing) {
    return existing.id === win.activeTabId ? win : { ...win, activeTabId: existing.id }
  }
  const tab: WindowTab = { id: makeId(), target: { kind: 'page', ...target } }
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
  const firstPage = tabs.find((t) => targetPageId(t.target) !== null)
  const closedOrigin = targetPageId(win.tabs[idx].target) === win.originId
  const originId =
    closedOrigin && firstPage ? (targetPageId(firstPage.target) as string) : win.originId
  if (!firstPage && win.kind === 'page') return null
  return { ...win, tabs, activeTabId, originId }
}

export function deriveTarget(
  p: WindowState | null,
): Extract<WindowTabTarget, { kind: 'page' }> | null {
  if (!p) return null
  const active = p.tabs.find((t) => t.id === p.activeTabId)
  return active?.target.kind === 'page' ? active.target : null
}
