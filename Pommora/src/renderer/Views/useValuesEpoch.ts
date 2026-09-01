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
  const kept = Object.entries(o).filter(([id, e]) => (pageIds ? !pageIds.includes(id) : e.pending))
  return kept.length ? Object.fromEntries(kept) : null
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
    if (
      valuesEpoch.kind === 'container' &&
      valuesEpoch.rel !== path &&
      !valuesEpoch.rel.startsWith(`${path}/`)
    )
      return
    let canceled = false
    void window.nexus.loadValues(path).then((v) => {
      if (!canceled) setValues(v)
    })
    if (valuesEpoch.kind === 'container') {
      const ids = valuesEpoch.pageIds
      setValueOverride((prev) => retireSettled(prev, ids.length ? ids : null))
    } else {
      const { oldKey, newKey } = valuesEpoch
      setValueOverride((prev) => {
        if (!prev) return prev
        return Object.fromEntries(
          Object.entries(prev).map(([id, entry]) => {
            const root = entry.fm as unknown as Record<string, unknown>
            if (!(oldKey in root)) return [id, entry]
            const { [oldKey]: moved, ...rest } = root
            return [id, { ...entry, fm: { ...rest, [newKey]: moved } as PageFrontmatter }]
          }),
        )
      })
    }
    return () => {
      canceled = true
    }
  }, [valuesEpoch, path, setValues, setValueOverride])
}
