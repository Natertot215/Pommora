// The tab set — the ordered UNPINNED tabs, the active-tab pointer, and each tab's Back/Forward
// refs. Pinned tabs are never stored here; they derive from navigation.json's pinned refs.
// Device-local: two machines with different tabs open have no correct merge, so a machine keeps
// its own row.
//
// Everything stored is a bare ref — this module strips to `{kind, id}` in both directions, and
// the renderer's restore hydrator mints paths against the live tree and recomputes the history
// pointer as dead refs prune.

import { isPlainObject } from '@shared/propertyValue'
import { toNavRef, type NavRef, type StoredTab, type StoredTabSet } from '@shared/types'
import { readValue, writeValue } from '../db/localState'

const TAB_KINDS = new Set(['homepage', 'context', 'space', 'collection', 'set', 'page'])

/** A well-formed stored ref for a tab: a drivable kind, an `id` on every kind but homepage. */
export function isTabRef(v: unknown): v is NavRef {
  if (!isPlainObject(v)) return false
  const kind = v.kind
  if (typeof kind !== 'string' || !TAB_KINDS.has(kind)) return false
  return kind === 'homepage' ? !('id' in v) : typeof v.id === 'string' && v.id.length > 0
}

function readTab(v: unknown): StoredTab | null {
  if (!isPlainObject(v) || typeof v.id !== 'string') return null
  if (isPlainObject(v.target) && v.target.kind === 'newtab')
    return { id: v.id, target: { kind: 'newtab' }, navStack: [], navIndex: -1 }
  if (!isTabRef(v.target)) return null
  const navStack = Array.isArray(v.navStack) ? v.navStack.filter(isTabRef).map(toNavRef) : []
  const navIndex = typeof v.navIndex === 'number' && Number.isInteger(v.navIndex) ? v.navIndex : -1
  return { id: v.id, target: toNavRef(v.target), navStack, navIndex }
}

/** Shape-validate and strip a tab-set payload to bare refs — the ONE boundary for the row, shared
 *  by the read below and the `tabs:save` handler. Malformed tabs drop; ids are deduped, since
 *  closeTab drops by id and two tabs sharing one would close together. Null = not a tab set. */
export function sanitizeTabSet(raw: unknown): StoredTabSet | null {
  if (!isPlainObject(raw) || !Array.isArray(raw.tabs)) return null
  const seen = new Set<string>()
  const tabs = raw.tabs.map(readTab).filter((t): t is StoredTab => {
    if (t === null || seen.has(t.id)) return false
    seen.add(t.id)
    return true
  })
  return { tabs, activeTabId: typeof raw.activeTabId === 'string' ? raw.activeTabId : '' }
}

/** The persisted tab set, or null when the nexus has none yet (the store seeds a fresh NavView). */
export function readTabsState(): StoredTabSet | null {
  return sanitizeTabSet(readValue('tabs'))
}

export function writeTabsState(set: StoredTabSet): boolean {
  return writeValue('tabs', set)
}
