import { useEffect, type Dispatch, type SetStateAction } from 'react'
import type { PageFrontmatter } from '@shared/schemas'
import { useSession } from '../store'

export type OverrideEntry = { fm: PageFrontmatter; pending: boolean }
export type Overrides = Record<string, OverrideEntry>
export type SetOverrides = Dispatch<SetStateAction<Overrides | null>>

export const patchOverride = (
  set: SetOverrides,
  pageId: string,
  fm: PageFrontmatter,
  settled: Promise<unknown>,
): void => {
  set((prev) => ({ ...prev, [pageId]: { fm, pending: true } }))
  void settled.finally(() =>
    set((prev) => {
      const entry = prev?.[pageId]
      return entry ? { ...prev, [pageId]: { ...entry, pending: false } } : prev
    }),
  )
}

// A push naming page ids retires their overrides outright (the external write landed later and
// wins); one naming none — a batch that degraded to a walk — retires only the settled ones.
export const retireSettled = (
  o: Overrides | null,
  pageIds: readonly string[] | null,
): Overrides | null => {
  if (!o) return o
  const kept = Object.entries(o).filter(([id, e]) =>
    pageIds?.length ? !pageIds.includes(id) : e.pending,
  )
  return kept.length ? Object.fromEntries(kept) : null
}

const rekeyOverrides = (o: Overrides | null, oldKey: string, newKey: string): Overrides | null => {
  if (!o) return o
  return Object.fromEntries(
    Object.entries(o).map(([id, entry]) => {
      const root = entry.fm as unknown as Record<string, unknown>
      if (!(oldKey in root)) return [id, entry]
      const { [oldKey]: moved, ...rest } = root
      return [id, { ...entry, fm: { ...rest, [newKey]: moved } as PageFrontmatter }]
    }),
  )
}

/** A rename refetches and RE-KEYS the overrides (clearing them revives the assign-vanish); a
 *  container push refetches the named container and retires the overrides the push settles. */
export function useValuesEpoch(
  path: string,
  setValues: Dispatch<SetStateAction<Record<string, PageFrontmatter>>>,
  setValueOverride: SetOverrides,
): void {
  const valuesEpoch = useSession((st) => st.valuesEpoch)
  useEffect(() => {
    if (!valuesEpoch) return
    let apply: (prev: Overrides | null) => Overrides | null
    if (valuesEpoch.kind === 'container') {
      const mine = valuesEpoch.changes.filter((c) => c.rel === path || c.rel.startsWith(`${path}/`))
      if (!mine.length) return
      const ids = mine.flatMap((c) => c.pageIds)
      apply = (prev) => retireSettled(prev, ids)
    } else {
      const { oldKey, newKey } = valuesEpoch
      apply = (prev) => rekeyOverrides(prev, oldKey, newKey)
    }
    let canceled = false
    void window.nexus.loadValues(path).then((v) => {
      if (!canceled) setValues(v)
    })
    setValueOverride(apply)
    return () => {
      canceled = true
    }
  }, [valuesEpoch, path, setValues, setValueOverride])
}
