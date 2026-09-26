import type { Size } from '@pommora/uix/Interactions/useResizable'
import { type ReconcileIndex, reconcileHeld, reconcileWith } from './reconcileSelection'
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
  size: Size
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
  reconcileGlance: (index) => {
    const cur = get().pinnedGlances
    const { next } = reconcileHeld(cur, (p) => {
      const r = reconcileWith(index, p.target)
      return r.kind !== 'page' ? null : r === p.target ? p : { ...p, target: r }
    })
    if (next !== cur) set({ pinnedGlances: next })
  },
  resetGlance: () => set({ ...PER_NEXUS }),
})
