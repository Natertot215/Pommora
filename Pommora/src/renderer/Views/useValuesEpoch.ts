import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react'
import type { PageFrontmatter } from '@shared/schemas'
import type { PageValues } from '@shared/types'
import { useSession } from '../store'

// `write` is the mutate the override waits on; null once it landed.
export type OverrideEntry = { fm: PageFrontmatter; write: Promise<unknown> | null }
export type Overrides = Record<string, OverrideEntry>
export type SetOverrides = Dispatch<SetStateAction<Overrides | null>>

/** A failed batch read keeps the values already held — a blank container reads as data loss. */
export const fetchValues = (
  path: string,
  pageIds?: string[],
): Promise<Record<string, PageValues> | null> =>
  window.nexus.loadValues(path, pageIds).then((r) => (r.ok ? r.value : null))

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

// A push naming page ids retires their overrides outright (the external write landed later and
// wins); one naming none — a batch that degraded to a walk — retires only the settled ones.
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
 *  container push re-reads only the pages it names, merging them in, and retires the overrides
 *  the push settles — only once the refetch lands, since a row retired ahead of it paints its
 *  identity-only fallback for the round trip. A push that names none (a batch that degraded to a
 *  walk) re-reads the container whole. A superseded whole refetch still retires: a settled
 *  override left standing would mask the disk until the next push. */
function useValuesEpoch(
  path: string,
  setValues: Dispatch<SetStateAction<Record<string, PageValues>>>,
  setValueOverride?: SetOverrides,
): void {
  const valuesEpoch = useSession((st) => st.valuesEpoch)
  // A scoped read superseded by a newer push on the same path still lands (its pages are not the
  // newer read's); one superseded by a container swap must not — its pages belong to the old map.
  const live = useRef(path)
  live.current = path
  useEffect(() => {
    if (!valuesEpoch) return
    let retire: ((prev: Overrides | null) => Overrides | null) | null = null
    let only: string[] | undefined
    if (valuesEpoch.kind === 'container') {
      const mine = valuesEpoch.changes.filter((c) => c.rel === path || c.rel.startsWith(`${path}/`))
      if (!mine.length) return
      const ids = mine.flatMap((c) => c.pageIds)
      retire = (prev) => retireSettled(prev, ids)
      if (mine.every((c) => c.pageIds.length > 0)) only = ids
    } else {
      const { oldKey, newKey } = valuesEpoch
      setValueOverride?.((prev) => rekeyOverrides(prev, oldKey, newKey))
    }
    let canceled = false
    void fetchValues(path, only).then((v) => {
      if (!v) return
      if (only) {
        if (live.current === path) setValues((prev) => ({ ...prev, ...v }))
        // Only a page the read resolved is settled; one it could not still holds its override.
        const landed = Object.keys(v)
        retire = landed.length ? (prev) => retireSettled(prev, landed) : null
      } else if (!canceled) setValues(v)
      if (retire) setValueOverride?.(retire)
    })
    return () => {
      canceled = true
    }
  }, [valuesEpoch, path, setValues, setValueOverride])
}

/** The canonical values for the opened container supersede any optimistic patches still
 *  standing, and `canceled` keeps a fast container swap from landing the old path's read. */
export function useContainerValues(
  path: string,
  setValueOverride?: SetOverrides,
): Record<string, PageValues> {
  const [values, setValues] = useState<Record<string, PageValues>>({})
  useEffect(() => {
    let canceled = false
    setValueOverride?.(null)
    void fetchValues(path).then((v) => {
      if (v && !canceled) setValues(v)
    })
    return () => {
      canceled = true
    }
  }, [path, setValueOverride])
  useValuesEpoch(path, setValues, setValueOverride)
  return values
}
