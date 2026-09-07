import type { GlanceSize } from '@pommora/core/Interface/Windows/windowRecord'
import { type ReconcileIndex, reconcileWith } from './reconcileSelection'
import { makeTabId } from '../Navigation/tabsModel'
import type { Slice } from './sessionState'

// Placement freezes the trigger's ANCHOR POINT, not the pane corner — PickerMenu re-adds the gap/origin and re-derives direction from it on each open. Pins are explicit artifacts: never LRU-evicted, keyed by a minted pinId and tagged with their tab so multiple per tab and the same page across tabs both stand.
export type PinnedGlance = {
  pinId: string
  tabId: string
  target: { kind: 'page'; id: string; path: string }
  anchorX: number
  anchorY: number
  anchorHeight: number
  size: GlanceSize
  locked: boolean
}

export interface GlanceSlice {
  pinnedGlances: PinnedGlance[]
  pinGlance: (p: Omit<PinnedGlance, 'pinId' | 'locked'>) => void
  setPinLocked: (pinId: string, locked: boolean) => void
  unpinGlance: (pinId: string) => void
  scrubTabPins: (tabId: string) => void
  retagTabPins: (oldId: string, newId: string) => void
  reconcileGlance: (index: ReconcileIndex) => void
  resetGlance: () => void
}

const PER_NEXUS = { pinnedGlances: [] } satisfies Partial<GlanceSlice>

export const createGlanceSlice: Slice<GlanceSlice> = (set, get) => ({
  ...PER_NEXUS,
  // A lock is the only way a pin is born, so it lands locked; unlock flips it in place rather than removing it.
  pinGlance: (p) =>
    set((s) => ({
      pinnedGlances: [...s.pinnedGlances, { ...p, pinId: makeTabId(), locked: true }],
    })),
  setPinLocked: (pinId, locked) =>
    set((s) => ({
      pinnedGlances: s.pinnedGlances.map((p) => (p.pinId === pinId ? { ...p, locked } : p)),
    })),
  unpinGlance: (pinId) =>
    set((s) => ({ pinnedGlances: s.pinnedGlances.filter((p) => p.pinId !== pinId) })),
  scrubTabPins: (tabId) =>
    set((s) => ({ pinnedGlances: s.pinnedGlances.filter((p) => p.tabId !== tabId) })),
  retagTabPins: (oldId, newId) =>
    set((s) => ({
      pinnedGlances: s.pinnedGlances.map((p) => (p.tabId === oldId ? { ...p, tabId: newId } : p)),
    })),
  // Reference-preserving so a tree push with no moved/deleted pin skips the state write, exactly as tabs and windows reconcile.
  reconcileGlance: (index) => {
    const cur = get().pinnedGlances
    let changed = false
    const next: PinnedGlance[] = []
    for (const p of cur) {
      const r = reconcileWith(index, p.target)
      if (r.kind === 'none') {
        changed = true
        continue
      }
      if (r.kind === 'page' && r.path !== p.target.path) {
        changed = true
        next.push({ ...p, target: { ...p.target, path: r.path } })
      } else next.push(p)
    }
    if (changed) set({ pinnedGlances: next })
  },
  resetGlance: () => set({ ...PER_NEXUS }),
})
