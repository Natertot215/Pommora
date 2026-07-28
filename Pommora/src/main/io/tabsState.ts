// The tab set — the ordered UNPINNED tabs, the active-tab pointer, and each tab's Back/Forward
// targets. Pinned tabs are never stored here; they derive from `.nexus/pins/`. Device-local: two
// machines with different tabs open have no correct merge, so a machine keeps its own.
//
// The renderer owns the in-memory set; main persists it as one row, so a save is a single upsert
// with nothing to coalesce and nothing owed at quit.
//
// Reads still normalize. The renderer's `reconcileTabs` repairs entity REFERENCES — a target whose
// page was deleted, a path that moved — and returns a tab whose targets all resolve completely
// untouched, so the navStack/navIndex lockstep that `openTab`'s history splice depends on has to
// be re-established here or nowhere.

import { isPlainObject } from '@shared/propertyValue'
import type { SelectTarget, Tab, TabSet, TabTarget } from '@shared/types'
import { readValue, writeValue } from '../db/localState'

const SELECT_KINDS = new Set(['homepage', 'context', 'collection', 'set', 'page'])

/** A well-formed drivable target: known kind, an `id` on every kind but homepage, and a `path` on
 *  the path-carrying kinds (set/page). */
function isSelectTarget(v: unknown): v is SelectTarget {
  if (!isPlainObject(v)) return false
  const kind = v.kind
  if (typeof kind !== 'string' || !SELECT_KINDS.has(kind)) return false
  if (kind === 'homepage') return true
  if (typeof v.id !== 'string') return false
  if (kind === 'set' || kind === 'page') return typeof v.path === 'string'
  return true
}

function isTabTarget(v: unknown): v is TabTarget {
  return (isPlainObject(v) && v.kind === 'newtab') || isSelectTarget(v)
}

/** Identity of a drivable target — kind+id, or the bare kind for the id-less homepage (navKey's
 *  shape; duplicated here because the renderer's helper can't cross into main). */
const targetKey = (t: SelectTarget): string => ('id' in t ? `${t.kind}:${t.id}` : t.kind)

/** One persisted tab, with the invariants the store assumes: a target, and a history whose index
 *  points AT that target. A newtab tab always reads with an empty history; a desynced one is
 *  re-pointed where possible, else degraded to a single-entry stack (the tab survives;
 *  Back/Forward starts fresh). */
function readTab(v: unknown): Tab | null {
  if (!isPlainObject(v) || typeof v.id !== 'string' || !isTabTarget(v.target)) return null
  if (v.target.kind === 'newtab') return { id: v.id, target: v.target, navStack: [], navIndex: -1 }
  const stack = Array.isArray(v.navStack) ? v.navStack.filter(isSelectTarget) : []
  const index = typeof v.navIndex === 'number' && Number.isInteger(v.navIndex) ? v.navIndex : -1
  const sane =
    stack.length > 0 &&
    index >= 0 &&
    index < stack.length &&
    targetKey(stack[index]) === targetKey(v.target)
  if (sane) return { id: v.id, target: v.target, navStack: stack, navIndex: index }
  const at = stack.findIndex((s) => targetKey(s) === targetKey(v.target as SelectTarget))
  if (at !== -1) return { id: v.id, target: v.target, navStack: stack, navIndex: at }
  return { id: v.id, target: v.target, navStack: [v.target], navIndex: 0 }
}

/** The persisted tab set, or null when the nexus has none yet (the store seeds a fresh NavView).
 *  Malformed tabs drop; ids are deduped, since closeTab drops by id and two tabs sharing one would
 *  close together. */
export function readTabsState(): TabSet | null {
  const raw = readValue<{ tabs?: unknown; activeTabId?: unknown }>('tabs')
  if (!raw || !Array.isArray(raw.tabs)) return null
  const seen = new Set<string>()
  const tabs = raw.tabs.map(readTab).filter((t): t is Tab => {
    if (t === null || seen.has(t.id)) return false
    seen.add(t.id)
    return true
  })
  return { tabs, activeTabId: typeof raw.activeTabId === 'string' ? raw.activeTabId : '' }
}

export function writeTabsState(set: TabSet): boolean {
  return writeValue('tabs', set)
}
