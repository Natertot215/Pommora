import type { Dispatch, SetStateAction } from 'react'
import type { PageFrontmatter } from '@pommora/core/Nexus/schemas'

type OverrideEntry = { fm: PageFrontmatter; write: Promise<boolean> | null }
export type Overrides = Record<string, OverrideEntry>
export type SetOverrides = Dispatch<SetStateAction<Overrides | null>>

export const patchOverride = (
  set: SetOverrides,
  pageId: string,
  fm: PageFrontmatter,
  write: Promise<boolean>,
): void => {
  set((prev) => ({ ...prev, [pageId]: { fm, write } }))
  // A refused write never pushes the values that would retire its override, so the override leaves with the refusal.
  void write.then((landed) =>
    set((prev) => {
      const entry = prev?.[pageId]
      if (entry?.write !== write) return prev
      if (landed) return { ...prev, [pageId]: { fm: entry.fm, write: null } }
      const { [pageId]: _, ...rest } = prev as Overrides
      return Object.keys(rest).length ? rest : null
    }),
  )
}

// A push naming page ids retires their overrides outright (the external write landed later and wins); one naming none retires only the settled ones.
export const retireSettled = (
  o: Overrides | null,
  pageIds: readonly string[] | null,
): Overrides | null => {
  if (!o) return o
  const kept = Object.entries(o).filter(([id, e]) =>
    pageIds?.length ? !pageIds.includes(id) : e.write !== null,
  )
  return kept.length ? Object.fromEntries(kept) : null
}
