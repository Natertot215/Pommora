// `tabs` is the UNPINNED set (the persisted row) — pinned tabs are derived live from the pinned refs and passed in separately wherever a decision must see them.

import { clamp } from '@pommora/uix/Utilities/clamp'
import type {
  NavRef,
  NewTabSentinel,
  SelectTarget,
  Tab,
  TabTarget,
} from '@pommora/core/Navigation/navRef'
import type { StoredTab } from '@pommora/core/Interface/Windows/windowRecord'
import type { MutableKind } from '@pommora/core/Pages/mutateRequest'
import { moveItem } from '@pommora/uix/Utilities/moveItem'
import { navKey } from './navRecents'
import { reconcileWith, type ReconcileIndex } from '../Session/selection'

export const NEWTAB: TabTarget = { kind: 'newtab' }

/** The newtab sentinel collapses to a single 'newtab' key so dedup keeps at most one NavView tab. */
export function tabKey(target: TabTarget | NavRef | NewTabSentinel): string {
  return target.kind === 'newtab' ? 'newtab' : navKey(target)
}

export function pinTabId(target: SelectTarget): string {
  return `pin:${navKey(target)}`
}

export function liveTarget(index: ReconcileIndex, ref: NavRef): SelectTarget | null {
  if (ref.kind === 'task' || ref.kind === 'event') return null
  const probe: SelectTarget =
    ref.kind === 'set' || ref.kind === 'page'
      ? { kind: ref.kind, id: ref.id, path: '' }
      : ref.kind === 'homepage'
        ? { kind: 'homepage' }
        : { kind: ref.kind, id: ref.id }
  const r = reconcileWith(index, probe)
  return r.kind === 'none' ? null : r
}

/** The history pointer is carried through the pruning — re-pointed by key if it lands wrong, degraded to a single-entry stack if its target vanished. */
export function hydrateTabs(stored: StoredTab[], index: ReconcileIndex | null): Tab[] {
  if (!index) return []
  const tabs: Tab[] = []
  for (const t of stored) {
    if (t.target.kind === 'newtab') {
      tabs.push({ id: t.id, target: t.target, navStack: [], navIndex: -1 })
      continue
    }
    const target = liveTarget(index, t.target)
    if (!target) continue
    const navStack: SelectTarget[] = []
    let navIndex = -1
    t.navStack.forEach((ref, i) => {
      const live = liveTarget(index, ref)
      if (!live) return
      if (i === t.navIndex) navIndex = navStack.length
      navStack.push(live)
    })
    if (navIndex === -1 || navKey(navStack[navIndex]) !== navKey(target))
      navIndex = navStack.findIndex((s) => navKey(s) === navKey(target))
    if (navIndex === -1) {
      navStack.splice(0, navStack.length, target)
      navIndex = 0
    }
    tabs.push({ id: t.id, target, navStack, navIndex })
  }
  return tabs
}

/** Callers pass the push's own reconcile index and hold the result, so no read or push ever walks the tree twice. */
export function derivePinnedTabs(pinned: NavRef[], index: ReconcileIndex | null): Tab[] {
  if (!index) return []
  return pinned
    .map((ref) => liveTarget(index, ref))
    .filter((t): t is SelectTarget => t !== null)
    .map((target) => tabFor(pinTabId(target), target))
}

/** Lets a derive writer keep the previous array when nothing changed, so an echo push invalidates no memo. */
export function sameTabs(a: Tab[], b: Tab[]): boolean {
  return (
    a.length === b.length &&
    a.every((t, i) => {
      const o = b[i]
      if (t.id !== o.id || t.target.kind !== o.target.kind) return false
      if (t.target.kind === 'newtab' || o.target.kind === 'newtab') return true
      if (navKey(t.target) !== navKey(o.target)) return false
      const pathOf = (x: typeof t.target): string => ('path' in x ? x.path : '')
      return pathOf(t.target) === pathOf(o.target)
    })
  )
}

export function isOpenInTabs(tabs: Tab[], pinned: NavRef[], target: SelectTarget): boolean {
  const key = navKey(target)
  return (
    tabs.some((t) => t.target.kind !== 'newtab' && navKey(t.target) === key) ||
    pinned.some((p) => navKey(p) === key)
  )
}

export function contextTargetToSelect(t: {
  kind: MutableKind
  id: string
  path: string
}): SelectTarget {
  switch (t.kind) {
    case 'page':
      return { kind: 'page', id: t.id, path: t.path }
    case 'set':
      return { kind: 'set', id: t.id, path: t.path }
    case 'collection':
      return { kind: 'collection', id: t.id }
    case 'space':
      return { kind: 'space', id: t.id }
    default:
      return { kind: 'context', id: t.id }
  }
}

export function activeUnpinnedTab(tabs: Tab[], activeTabId: string): Tab | undefined {
  return tabs.find((t) => t.id === activeTabId)
}

export function isPinned(target: TabTarget | NavRef | NewTabSentinel, pinned: NavRef[]): boolean {
  if (target.kind === 'newtab') return false
  const key = navKey(target)
  return pinned.some((p) => navKey(p) === key)
}

function tabFor(id: string, target: SelectTarget): Tab {
  return { id, target, navStack: [target], navIndex: 0 }
}

export function newTabTab(id: string): Tab {
  return { id, target: NEWTAB, navStack: [], navIndex: -1 }
}

export interface OpenResult {
  tabs: Tab[]
  activeTabId: string
}

export function openTab(
  tabs: Tab[],
  activeTabId: string,
  pinned: Tab[],
  target: SelectTarget,
  opts: { newTab?: boolean },
  newId: string,
): OpenResult {
  const key = navKey(target)
  const all = [...pinned, ...tabs]
  const existing = all.find((t) => t.target.kind !== 'newtab' && navKey(t.target) === key)
  if (existing) return { tabs, activeTabId: existing.id }

  const active = all.find((t) => t.id === activeTabId)
  const activeIsPinned = active ? pinned.some((p) => p.id === active.id) : false
  // activeIsPinned tabs are protected from being overwritten; reuse also covers replacing a NavView scratch tab.
  if (opts.newTab || activeIsPinned || !active) {
    return { tabs: [...tabs, tabFor(newId, target)], activeTabId: newId }
  }
  const nextTabs = tabs.map((t) =>
    t.id === active.id
      ? {
          ...t,
          target,
          navStack: [...t.navStack.slice(0, t.navIndex + 1), target],
          navIndex: t.navIndex + 1,
        }
      : t,
  )
  return { tabs: nextTabs, activeTabId: active.id }
}

export function openNewTab(tabs: Tab[], newId: string): OpenResult {
  const existing = tabs.find((t) => t.target.kind === 'newtab')
  if (existing) return { tabs, activeTabId: existing.id }
  return { tabs: [...tabs, newTabTab(newId)], activeTabId: newId }
}

export function pushMru(mru: string[], id: string): string[] {
  return [id, ...mru.filter((m) => m !== id)]
}

export interface CloseResult {
  tabs: Tab[]
  activeTabId: string
  mru: string[]
}

/** Falls back to the spatial neighbor when the MRU is empty (a cold relaunch); closing the very last tab reseeds a lone NavView. */
export function closeTab(
  tabs: Tab[],
  activeTabId: string,
  mru: string[],
  pinnedIds: string[],
  id: string,
  newId: string,
): CloseResult {
  const idx = tabs.findIndex((t) => t.id === id)
  if (idx === -1) return { tabs, activeTabId, mru }
  const nextTabs = tabs.filter((t) => t.id !== id)
  const nextMru = mru.filter((m) => m !== id)

  if (nextTabs.length === 0 && pinnedIds.length === 0) {
    return { tabs: [newTabTab(newId)], activeTabId: newId, mru: [newId] }
  }
  if (id !== activeTabId) return { tabs: nextTabs, activeTabId, mru: nextMru }

  const live = new Set([...pinnedIds, ...nextTabs.map((t) => t.id)])
  const mruTop = nextMru.find((m) => live.has(m))
  const spatial =
    nextTabs[Math.min(idx, nextTabs.length - 1)]?.id ?? pinnedIds[pinnedIds.length - 1]
  return { tabs: nextTabs, activeTabId: mruTop ?? spatial, mru: nextMru }
}

export function reorderWithinZone(tabs: Tab[], fromId: string, toIndex: number): Tab[] {
  const from = tabs.findIndex((t) => t.id === fromId)
  if (from === -1) return tabs
  const to = clamp(toIndex, 0, tabs.length - 1)
  if (from === to) return tabs
  return moveItem(tabs, from, to)
}

export function insertUnpinned(tabs: Tab[], activeTabId: string, tab: Tab): Tab[] {
  const at = tabs[0] && tabs[0].id === activeTabId ? 1 : 0
  return [...tabs.slice(0, at), tab, ...tabs.slice(at)]
}

export interface ReconcileTabsResult {
  tabs: Tab[]
  activeTabId: string
  mru: string[]
  changed: boolean
}

/** Reference-preserving — untouched tabs keep their identity, and `changed: false` means the caller can skip the state write. */
export function reconcileTabs(
  tabs: Tab[],
  activeTabId: string,
  mru: string[],
  pinnedIds: string[],
  reconcile: (t: SelectTarget) => SelectTarget | null,
  newId: string,
): ReconcileTabsResult {
  let changed = false
  const nextTabs: Tab[] = []
  for (const t of tabs) {
    if (t.target.kind === 'newtab') {
      nextTabs.push(t)
      continue
    }
    const target = reconcile(t.target)
    if (target === null) {
      changed = true
      continue
    }
    const stack: SelectTarget[] = []
    let navIndex = -1
    let stackChanged = false
    for (let i = 0; i < t.navStack.length; i++) {
      const r = reconcile(t.navStack[i])
      if (r === null) {
        stackChanged = true
        continue
      }
      if (r !== t.navStack[i]) stackChanged = true
      stack.push(r)
      if (i === t.navIndex) navIndex = stack.length - 1
    }
    if (navIndex === -1) navIndex = stack.length - 1
    if (target === t.target && !stackChanged) {
      nextTabs.push(t)
      continue
    }
    changed = true
    nextTabs.push({ ...t, target, navStack: stack, navIndex })
  }
  if (!changed) return { tabs, activeTabId, mru, changed: false }

  const live = new Set([...pinnedIds, ...nextTabs.map((t) => t.id)])
  const nextMru = mru.filter((id) => live.has(id))
  if (live.has(activeTabId)) return { tabs: nextTabs, activeTabId, mru: nextMru, changed: true }
  const focus = nextMru[0] ?? nextTabs[0]?.id ?? pinnedIds[pinnedIds.length - 1]
  if (focus !== undefined)
    return { tabs: nextTabs, activeTabId: focus, mru: nextMru, changed: true }
  const seeded = newTabTab(newId)
  return { tabs: [seeded], activeTabId: seeded.id, mru: [seeded.id], changed: true }
}

export function cycle(orderedIds: string[], activeTabId: string, dir: 1 | -1): string {
  if (orderedIds.length === 0) return activeTabId
  const i = orderedIds.indexOf(activeTabId)
  if (i === -1) return orderedIds[0]
  return orderedIds[(i + dir + orderedIds.length) % orderedIds.length]
}

export const makeTabId = (): string => crypto.randomUUID()
