// The tab set — the ordered UNPINNED tabs, the active-tab pointer, and each tab's Back/Forward
// refs. Pinned tabs are never stored here; they derive from navigation.json's pinned refs.
// Device-local: two machines with different tabs open have no correct merge, so a machine keeps
// its own row.
//
// Everything stored is a bare ref — the renderer's restore hydrator mints paths against the live
// tree and recomputes the history pointer as dead refs prune, so this reader only shape-validates.

import { isPlainObject } from '@shared/propertyValue'
import type { NavRef, NewTabSentinel, StoredTab, StoredTabSet } from '@shared/types'
import { readValue, writeValue } from '../db/localState'

const TAB_KINDS = new Set(['homepage', 'context', 'space', 'collection', 'set', 'page'])

/** A well-formed stored ref for a tab: a drivable kind, an `id` on every kind but homepage. */
function isTabRef(v: unknown): v is NavRef {
  if (!isPlainObject(v)) return false
  const kind = v.kind
  if (typeof kind !== 'string' || !TAB_KINDS.has(kind)) return false
  return kind === 'homepage' || typeof v.id === 'string'
}

function isTargetRef(v: unknown): v is NavRef | NewTabSentinel {
  return (isPlainObject(v) && v.kind === 'newtab') || isTabRef(v)
}

function readTab(v: unknown): StoredTab | null {
  if (!isPlainObject(v) || typeof v.id !== 'string' || !isTargetRef(v.target)) return null
  if (v.target.kind === 'newtab') return { id: v.id, target: v.target, navStack: [], navIndex: -1 }
  const navStack = Array.isArray(v.navStack) ? v.navStack.filter(isTabRef) : []
  const navIndex =
    typeof v.navIndex === 'number' && Number.isInteger(v.navIndex) ? v.navIndex : -1
  return { id: v.id, target: v.target, navStack, navIndex }
}

/** The persisted tab set, or null when the nexus has none yet (the store seeds a fresh NavView).
 *  Malformed tabs drop; ids are deduped, since closeTab drops by id and two tabs sharing one would
 *  close together. */
export function readTabsState(): StoredTabSet | null {
  const raw = readValue<{ tabs?: unknown; activeTabId?: unknown }>('tabs')
  if (!raw || !Array.isArray(raw.tabs)) return null
  const seen = new Set<string>()
  const tabs = raw.tabs.map(readTab).filter((t): t is StoredTab => {
    if (t === null || seen.has(t.id)) return false
    seen.add(t.id)
    return true
  })
  return { tabs, activeTabId: typeof raw.activeTabId === 'string' ? raw.activeTabId : '' }
}

export function writeTabsState(set: StoredTabSet): boolean {
  return writeValue('tabs', set)
}
