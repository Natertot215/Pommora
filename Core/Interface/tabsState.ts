import { isPlainObject } from '../Properties/propertyValue'
import { toNavRef, type NavRef } from '../Navigation/navRef'
import type { StoredTab, StoredTabSet } from './Windows/windowRecord'
import { readValue, writeValue } from '../Platform/localState'

const TAB_KINDS = new Set(['homepage', 'context', 'space', 'collection', 'set', 'page'])

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

// Ids are deduped: closeTab drops by id, and two tabs sharing one would close together.
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

export function readTabsState(): StoredTabSet | null {
  return sanitizeTabSet(readValue('tabs'))
}

export function writeTabsState(set: StoredTabSet): boolean {
  return writeValue('tabs', set)
}
