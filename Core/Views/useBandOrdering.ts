import { useCallback, useEffect, useRef, useState } from 'react'
import type { SavedView } from '@pommora/core/Views/views'
import { type Band, propertyOrderAfterDrop, structuralOrderAfterDrop } from './bandDndModel'

export function groupingKeyOf(view: SavedView): string {
  const g = view.group
  return g?.kind === 'property' ? `property:${g.property_id}` : (g?.kind ?? 'structural')
}

export function bandReorderPatch(input: {
  dragged: Band
  beforeId: string | null
  view: SavedView
  structuralIds: string[]
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

/** The patch rides the caller's live view so a sibling persist can't fold the stale on-disk order back over a fresh drag, and it survives a source-identity swap — a reparent's refetch changes that identity mid-flight. */
export function useBandOrdering(
  persist: (patch: Partial<SavedView>) => void,
  groupingKey: string,
): {
  bandPatch: Partial<SavedView> | null
  commitBand: (patch: Partial<SavedView>) => void
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
  // A commit can fire after a filesystem round-trip, so the persist goes through a ref and merges the FIRE-TIME view state: a collapse or resize persist landing mid-flight must not be clobbered.
  const persistRef = useRef(persist)
  persistRef.current = persist
  const commitBand = useCallback((patch: Partial<SavedView>): void => {
    setBandPatch((prev) => ({ ...prev, ...patch }))
    persistRef.current(patch)
  }, [])
  return { bandPatch, commitBand, resetBand: useCallback(() => setBandPatch(null), []) }
}
