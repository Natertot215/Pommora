import type { Dispatch, SetStateAction } from 'react'
import type { PageFrontmatter } from '@pommora/core/Nexus/schemas'

// `write` is the save while it's pending and the settle count it took once it lands, so a read retires only what settled before it was issued.
type OverrideEntry = { fm: PageFrontmatter; write: Promise<boolean> | number }
export type Overrides = Record<string, OverrideEntry>
export type SetOverrides = Dispatch<SetStateAction<Overrides | null>>

let settles = 0
export const settle = (): number => ++settles
export const settled = (): number => settles

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
      if (landed) return { ...prev, [pageId]: { fm: entry.fm, write: settle() } }
      const { [pageId]: _, ...rest } = prev as Overrides
      return Object.keys(rest).length ? rest : null
    }),
  )
}

// Only a write that landed by `issued` retires, since a later or pending one holds an edit the read may lack; `pageIds` narrows which pages may retire, and null takes every page.
export const retireSettled = (
  o: Overrides | null,
  pageIds: readonly string[] | null,
  issued = settles,
): Overrides | null => {
  if (!o) return o
  const kept = Object.entries(o).filter(
    ([id, e]) =>
      typeof e.write !== 'number' ||
      e.write > issued ||
      (pageIds !== null && !pageIds.includes(id)),
  )
  return kept.length ? Object.fromEntries(kept) : null
}
