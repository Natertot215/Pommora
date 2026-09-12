import type { Dispatch, SetStateAction } from 'react'
import type { PageFrontmatter } from '@pommora/core/Nexus/schemas'

type OverrideEntry = { fm: PageFrontmatter; write: Promise<unknown> | null }
export type Overrides = Record<string, OverrideEntry>
export type SetOverrides = Dispatch<SetStateAction<Overrides | null>>

export const patchOverride = (
  set: SetOverrides,
  pageId: string,
  fm: PageFrontmatter,
  write: Promise<unknown>,
): void => {
  set((prev) => ({ ...prev, [pageId]: { fm, write } }))
  void write.finally(() =>
    set((prev) => {
      const entry = prev?.[pageId]
      return entry?.write === write ? { ...prev, [pageId]: { fm: entry.fm, write: null } } : prev
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
