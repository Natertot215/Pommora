// `tabs` is the UNPINNED set (the persisted row) — pinned tabs are derived live from the
// pinned refs against the tree and passed in separately wherever a decision must see them.

import type { NavRef, NewTabSentinel, SelectTarget, StoredTab, Tab, TabTarget } from '@shared/types'
import type { MutableKind } from '@shared/mutate'
import { moveItem } from '@renderer/DesignSystem/Util/moveItem'
import { navKey } from '../Navigation/navRecents'
import { reconcileWith, type ReconcileIndex } from '../selection'

/** The new-tab sentinel value (maps to NavView / the `'none'` detail branch). */
export const NEWTAB: TabTarget = { kind: 'newtab' }

/** Identity key for a tab target — reuses navKey; the newtab sentinel collapses to a single 'newtab'
 *  key so dedup keeps at most one NavView tab. */
export function tabKey(target: TabTarget | NavRef | NewTabSentinel): string {
  return target.kind === 'newtab' ? 'newtab' : navKey(target)
}

/** A pinned tab's stable id — derived from its pin identity so it's consistent across renders and can
 *  never collide with a generated unpinned-tab id. */
export function pinTabId(target: SelectTarget): string {
  return `pin:${navKey(target)}`
}

/** A stored ref made live against the tree: agenda kinds have no click destination, a ref that no
 *  longer resolves drops, and a resolving set/page gets its path minted — nothing stored carries
 *  one. */
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

/** Stored tabs made live at restore — prune refs that no longer resolve, mint paths for those
 *  that do, and carry the history pointer through the pruning (re-pointed by key if it lands
 *  wrong, degraded to a single-entry stack if its target vanished) — restored lockstep is
 *  established here or nowhere. */
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

/** The pinned tabs, hydrated in pin order — array position IS the order. Callers pass the push's
 *  own reconcile index and hold the result (the store keeps it as derived state), so no read or
 *  push ever walks the tree twice. */
export function derivePinnedTabs(pinned: NavRef[], index: ReconcileIndex | null): Tab[] {
  if (!index) return []
  return pinned
    .map((ref) => liveTarget(index, ref))
    .filter((t): t is SelectTarget => t !== null)
    .map((target) => tabFor(pinTabId(target), target))
}

/** Element-wise tab equality (id + target identity + path) — lets a derive writer keep the
 *  previous array when nothing changed, so an echo push invalidates no memo. */
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

/** Drives the stateful "Open" vs "Open New Tab" menu labels. */
export function isOpenInTabs(tabs: Tab[], pinned: NavRef[], target: SelectTarget): boolean {
  const key = navKey(target)
  return (
    tabs.some((t) => t.target.kind !== 'newtab' && navKey(t.target) === key) ||
    pinned.some((p) => navKey(p) === key)
  )
}

/** Map a context-menu target to its drivable selection (area/topic/project collapse to `context`). */
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

/** A pinned or newtab active tab carries no history — consumers here read undefined and disable
 *  Back/Forward. */
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

/** `pinned` is the derived pinned set — read-only context; pinning/unpinning is a separate op. */
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
  // activeIsPinned tabs are protected from being overwritten; reuse also covers replacing a
  // NavView scratch tab.
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

/** The `+` / ⌘N entry point — pressing ⌘N while already in a new tab is a no-op. */
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

/** Falls back to the spatial neighbor when the MRU is empty (a cold relaunch). Closing the very
 *  last tab reseeds a lone NavView. A pinned id is a no-op — pinned tabs aren't closable here. */
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

/** Pinned reorder is the pins slice's reorderPin, handled at the store layer — this only covers
 *  the unpinned strip. */
export function reorderWithinZone(tabs: Tab[], fromId: string, toIndex: number): Tab[] {
  const from = tabs.findIndex((t) => t.id === fromId)
  if (from === -1) return tabs
  const to = Math.max(0, Math.min(toIndex, tabs.length - 1))
  if (from === to) return tabs
  return moveItem(tabs, from, to)
}

/** Enters at the front, or just behind the active tab when the active tab is itself the front
 *  one — so it keeps its spot. */
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

/** Reference-preserving — untouched tabs keep their identity, and `changed: false` means the
 *  caller can skip the state write. `reconcile` returns the live target (possibly re-pathed) or
 *  null when the entity is gone. */
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
