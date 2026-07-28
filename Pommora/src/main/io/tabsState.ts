// The tab set — the ordered UNPINNED tabs, the active-tab pointer, and each tab's Back/Forward
// targets. Pinned tabs are never stored here; they derive from `.nexus/pins/`. Device-local: two
// machines with different tabs open have no correct merge, so a machine keeps its own.
//
// The renderer owns the in-memory set and every invariant on it (the navStack/navIndex lockstep,
// id uniqueness); main persists it as one row. A save is a single upsert, so there is nothing to
// coalesce and nothing owed at quit. Restore re-reconciles against the live tree either way —
// a page deleted on disk dangles regardless of where the tab set was stored.

import type { TabSet } from '@shared/types'
import { readValue, writeValue } from '../db/localState'

/** The persisted tab set, or null when the nexus has none yet (the store seeds a fresh NavView). */
export function readTabsState(): TabSet | null {
  return readValue<TabSet>('tabs')
}

export function writeTabsState(set: TabSet): void {
  writeValue('tabs', set)
}
