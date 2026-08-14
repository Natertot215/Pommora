// Where a band drop's ORDER goes, for every view that renders bands. The drop itself arrives
// classified by BandDnd; this turns a reorder into the view patch that expresses it, and holds
// that patch optimistically until the write comes back.

import { useCallback, useEffect, useRef, useState } from 'react'
import type { SavedView } from '@shared/views'
import { type Band, propertyOrderAfterDrop, structuralOrderAfterDrop } from './bandDndModel'

/** Which bands a view is showing — its grouping kind, and the property a property grouping keys on.
 *  Deliberately blind to the ORDER within that grouping, since a reorder must not retire its own
 *  optimistic patch. */
export function groupingKeyOf(view: SavedView): string {
  const g = view.group
  return g?.kind === 'property' ? `property:${g.property_id}` : (g?.kind ?? 'structural')
}

/** The patch a reorder drop writes, for the two band kinds every view renders. Null when the drop
 *  asks for something the current grouping can't express. A structural reorder under Location order
 *  is the one case with no patch to make — the filesystem IS the order there, so the caller writes
 *  it instead. */
export function bandReorderPatch(input: {
  dragged: Band
  beforeId: string | null
  view: SavedView
  /** Every structural set id in tree order, collapsed subtrees included — the universe the order
   *  merges against, so a filtered-out or folded sibling never loses its rank. */
  structuralIds: string[]
  /** The property band keys present, in display order. */
  propertyKeys: string[]
}): Partial<SavedView> | null {
  const { dragged, beforeId, view, structuralIds, propertyKeys } = input
  if (dragged.kind === 'property') {
    if (view.group?.kind !== 'property') return null
    return {
      group: {
        ...view.group,
        order_mode: 'manual',
        order: propertyOrderAfterDrop(propertyKeys, dragged.id, beforeId),
      },
    }
  }
  return {
    group_order: structuralOrderAfterDrop(
      view.group_order ?? [],
      structuralIds,
      dragged.id,
      beforeId,
    ),
  }
}

/** The optimistic band-order layer: a drop shows at once and persists behind it. The patch rides
 *  the caller's live view so a sibling persist can't fold the stale on-disk order back over a fresh
 *  drag, and it deliberately survives a source-identity swap — a reparent's refetch changes that
 *  identity mid-flight, where a real container switch remounts the view outright. */
export function useBandOrdering(
  persist: (patch: Partial<SavedView>) => void,
  /** What the current bands ARE — the grouping's kind and the property it keys on. The patch says
   *  how one grouping's bands are ordered, so it cannot outlive that grouping: the Grouping pane is
   *  an independent writer, and a patch held past its change would mask the new grouping with the
   *  old one until the next view switch. */
  groupingKey: string,
): {
  bandPatch: Partial<SavedView> | null
  commitBand: (patch: Partial<SavedView>) => void
  /** Reseed on a view switch — the new view carries its own stored order. */
  resetBand: () => void
} {
  const [bandPatch, setBandPatch] = useState<Partial<SavedView> | null>(null)
  const firstKey = useRef(groupingKey)
  useEffect(() => {
    // Skip the mount pass — only a CHANGE retires the patch, or a drop's own re-render would.
    if (firstKey.current === groupingKey) return
    firstKey.current = groupingKey
    setBandPatch(null)
  }, [groupingKey])
  // A commit can fire after a filesystem round-trip, so the persist goes through a ref and merges
  // the FIRE-TIME view state: a collapse or resize persist landing mid-flight must not be clobbered
  // by the drop-render's stale closure.
  const persistRef = useRef(persist)
  persistRef.current = persist
  const commitBand = useCallback((patch: Partial<SavedView>): void => {
    setBandPatch((prev) => ({ ...prev, ...patch }))
    persistRef.current(patch)
  }, [])
  return { bandPatch, commitBand, resetBand: useCallback(() => setBandPatch(null), []) }
}
