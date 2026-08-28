import type { PreviewTabTarget } from '@shared/types'
import { moveItem } from '@renderer/DesignSystem/Util/moveItem'

// Bespoke close/spawn (NOT tabsModel's) — the last tab closing kills the window, and there are no pins.

export interface PreviewTab {
  id: string
  target: PreviewTabTarget
}

export interface PreviewState {
  /** 'page' = summoned from a page open; 'nav' = the NavWindow flavor (map-tab sentinel first). */
  flavor: 'page' | 'nav'
  /** The durable set's key; re-parents to the left-most survivor on origin close. */
  originId: string
  tabs: PreviewTab[]
  activeTabId: string
}

const targetPageId = (t: PreviewTabTarget): string | null => (t.kind === 'page' ? t.id : null)

export function openTabIn(
  p: PreviewState,
  makeId: () => string,
  target: { id: string; path: string },
): PreviewState {
  const existing = p.tabs.find((t) => targetPageId(t.target) === target.id)
  if (existing) {
    return existing.id === p.activeTabId ? p : { ...p, activeTabId: existing.id }
  }
  const tab: PreviewTab = { id: makeId(), target: { kind: 'page', ...target } }
  return { ...p, tabs: [...p.tabs, tab], activeTabId: tab.id }
}

/** The map sentinel is immovable AND un-landable — it holds slot 1. */
export function reorderTabIn(p: PreviewState, activeId: string, overId: string): PreviewState {
  const from = p.tabs.findIndex((t) => t.id === activeId)
  const to = p.tabs.findIndex((t) => t.id === overId)
  if (from === -1 || to === -1 || from === to) return p
  if (p.tabs[from].target.kind === 'navwindow' || p.tabs[to].target.kind === 'navwindow') return p
  return { ...p, tabs: moveItem(p.tabs, from, to) }
}

export function closeTabIn(p: PreviewState, id: string): PreviewState | null {
  const idx = p.tabs.findIndex((t) => t.id === id)
  if (idx === -1) return p
  if (p.tabs[idx].target.kind === 'navwindow') return p // the map tab is perma-pinned
  const tabs = p.tabs.filter((t) => t.id !== id)
  if (tabs.length === 0) return null
  const activeTabId = p.activeTabId === id ? tabs[Math.max(0, idx - 1)].id : p.activeTabId
  const firstPage = tabs.find((t) => targetPageId(t.target) !== null)
  const closedOrigin = targetPageId(p.tabs[idx].target) === p.originId
  const originId =
    closedOrigin && firstPage ? (targetPageId(firstPage.target) as string) : p.originId
  if (!firstPage && p.flavor === 'page') return null
  return { ...p, tabs, activeTabId, originId }
}

/** The page the window is showing — the active tab's own target, so a subscriber sees one
 *  reference per state; the nav flavor's map tab is no page. */
export function deriveTarget(
  p: PreviewState | null,
): Extract<PreviewTabTarget, { kind: 'page' }> | null {
  if (!p) return null
  const active = p.tabs.find((t) => t.id === p.activeTabId)
  return active?.target.kind === 'page' ? active.target : null
}
