// `tabs` is the UNPINNED set (the persisted row) — pinned tabs are derived live from the pinned refs and passed in separately wherever a decision must see them.

import { clamp } from '@pommora/uix/Utilities/clamp'
import {
  isSingleton,
  navKey,
  type NavRef,
  type NewTabSentinel,
  type SelectTarget,
  type StoredTab,
  type Tab,
  type TabTarget,
} from './navRef'
import { placeAt } from '@pommora/uix/Utilities/moveItem'
import { reconcileWith, type ReconcileIndex } from '../Session/reconcileSelection'

const NEWTAB: TabTarget = { kind: 'newtab' }

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
      : isSingleton(ref)
        ? { kind: ref.kind }
        : { kind: ref.kind, id: ref.id }
  const r = reconcileWith(index, probe)
  return r.kind === 'none' ? null : r
}

/** The history pointer is carried through the pruning — re-pointed by key if it lands wrong, degraded to a single-entry stack if its target vanished. */
function pruneHistory<R>(
  target: SelectTarget,
  navStack: R[],
  navIndex: number,
  live: (ref: R) => SelectTarget | null,
): { navStack: SelectTarget[]; navIndex: number; changed: boolean } {
  const stack: SelectTarget[] = []
  let at = -1
  let changed = false
  navStack.forEach((ref, i) => {
    const kept = live(ref)
    if (kept !== ref) changed = true
    if (!kept) return
    if (i === navIndex) at = stack.length
    stack.push(kept)
  })
  if (at === -1 || navKey(stack[at]) !== navKey(target))
    at = stack.findIndex((s) => navKey(s) === navKey(target))
  if (at === -1) return { navStack: [target], navIndex: 0, changed: true }
  return { navStack: stack, navIndex: at, changed: changed || at !== navIndex }
}

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
    const { navStack, navIndex } = pruneHistory(target, t.navStack, t.navIndex, (ref) =>
      liveTarget(index, ref),
    )
    tabs.push({ id: t.id, target, navStack, navIndex })
  }
  return tabs
}

/** Returns the same tab when nothing about it changed, and null once its target is gone. */
export function reconcileTab(
  t: Tab,
  reconcile: (target: SelectTarget) => SelectTarget | null,
): Tab | null {
  if (t.target.kind === 'newtab') return t
  const target = reconcile(t.target)
  if (target === null) return null
  const history = pruneHistory(target, t.navStack, t.navIndex, reconcile)
  if (target === t.target && !history.changed) return t
  return { ...t, target, navStack: history.navStack, navIndex: history.navIndex }
}

export function derivePinnedTabs(
  pinned: NavRef[],
  index: ReconcileIndex | null,
  prev: Tab[],
): Tab[] {
  if (!index) return []
  return pinned.flatMap((ref) => {
    const target = liveTarget(index, ref)
    if (target) return tabFor(pinTabId(target), target)
    return (
      prev.find(
        (t) =>
          tabKey(t.target) === tabKey(ref) && 'path' in t.target && index.withheld(t.target.path),
      ) ?? []
    )
  })
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

const showing =
  (target: SelectTarget | NavRef) =>
  (t: Tab): boolean =>
    t.target.kind !== 'newtab' && navKey(t.target) === navKey(target)

export function isOpenInTabs(tabs: Tab[], pinned: NavRef[], target: SelectTarget): boolean {
  return tabs.some(showing(target)) || pinned.some((p) => navKey(p) === navKey(target))
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

interface OpenResult {
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
  const all = [...pinned, ...tabs]
  const existing = all.find(showing(target))
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

export function openTabAt(
  tabs: Tab[],
  pinned: Tab[],
  target: SelectTarget,
  index: number,
  newId: string,
): Tab[] {
  if (pinned.some(showing(target))) return tabs
  return placeAt(tabs, tabs.findIndex(showing(target)), clamp(index, 0, tabs.length), () =>
    tabFor(newId, target),
  )
}

export function pushMru(mru: string[], id: string): string[] {
  return [id, ...mru.filter((m) => m !== id)]
}

export interface TabFocus {
  tabs: Tab[]
  activeTabId: string
  mru: string[]
}

/** A live active tab stays; otherwise the neighbor, the most recent live tab, the first tab, then the last pinned, and a lone new tab when nothing is left. */
export function settleFocus(
  { tabs, activeTabId, mru }: TabFocus,
  pinnedIds: string[],
  newId: string,
  neighbor?: string,
): TabFocus {
  const live = new Set([...pinnedIds, ...tabs.map((t) => t.id)])
  const recent = mru.filter((id) => live.has(id))
  const focus = live.has(activeTabId)
    ? activeTabId
    : (neighbor ?? recent[0] ?? tabs[0]?.id ?? pinnedIds.at(-1))
  if (focus === undefined) return { tabs: [newTabTab(newId)], activeTabId: newId, mru: [newId] }
  return { tabs, activeTabId: focus, mru: pushMru(recent, focus) }
}

/** Closing the active tab falls to its left neighbor, as the window strip's does. */
export function closeTab(
  tabs: Tab[],
  activeTabId: string,
  mru: string[],
  pinnedIds: string[],
  id: string,
  newId: string,
): TabFocus {
  const idx = tabs.findIndex((t) => t.id === id)
  if (idx === -1) return { tabs, activeTabId, mru }
  const rest = tabs.filter((t) => t.id !== id)
  const left = idx > 0 ? rest[idx - 1].id : (pinnedIds.at(-1) ?? rest[0]?.id)
  return settleFocus(
    { tabs: rest, activeTabId, mru: mru.filter((m) => m !== id) },
    pinnedIds,
    newId,
    left,
  )
}

export function insertUnpinned(tabs: Tab[], activeTabId: string, tab: Tab): Tab[] {
  const at = tabs[0] && tabs[0].id === activeTabId ? 1 : 0
  return [...tabs.slice(0, at), tab, ...tabs.slice(at)]
}

export function cycle(orderedIds: string[], activeTabId: string, dir: 1 | -1): string {
  if (orderedIds.length === 0) return activeTabId
  const i = orderedIds.indexOf(activeTabId)
  if (i === -1) return orderedIds[0]
  return orderedIds[(i + dir + orderedIds.length) % orderedIds.length]
}

export const makeTabId = (): string => crypto.randomUUID()
