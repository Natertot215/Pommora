import { useEffect, useMemo, useState } from 'react'
import { type Overrides, retireSettled, type SetOverrides } from '../../Properties/valueOverride'
import type { PageFrontmatter } from '@pommora/core/Nexus/schemas'
import type { PageValues } from '@pommora/core/Views/viewRow'
import { fetchPageValues } from '../../Properties/pageRow'
import { useSession } from '../../Session/store'
import { useLatest } from '@pommora/uix/Utilities/stableApi'

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

/** `canceled` keeps a fast container swap from landing the old path's read. The overrides lay each optimistic write over the loaded values, which never re-read on a write. */
export function useContainerValues(path: string): {
  values: Record<string, PageValues>
  effectiveValues: Record<string, PageValues>
  setValueOverride: SetOverrides
} {
  const [values, setValues] = useState<Record<string, PageValues>>({})
  const [valueOverride, setValueOverride] = useState<Overrides | null>(null)
  useEffect(() => {
    let canceled = false
    setValueOverride(null)
    void fetchPageValues(path).then((v) => {
      if (v && !canceled) setValues(v)
    })
    return () => {
      canceled = true
    }
  }, [path])
  const valuesEpoch = useSession((st) => st.valuesEpoch)
  // A scoped read superseded by a newer push on the same path still lands (its pages are not the newer read's); one superseded by a container swap must not.
  const live = useLatest(path)
  // A rename refetches and RE-KEYS the overrides (clearing them revives the assign-vanish); overrides retire only once the refetch lands, since a row retired ahead of it paints its identity-only fallback for the round trip.
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
      setValueOverride((prev) => rekeyOverrides(prev, oldKey, newKey))
    }
    let canceled = false
    void fetchPageValues(path, only).then((v) => {
      if (!v) return
      if (only) {
        if (live.current === path) setValues((prev) => ({ ...prev, ...v }))
        // Only a page the read resolved is settled; one it could not still holds its override.
        const landed = Object.keys(v)
        retire = landed.length ? (prev) => retireSettled(prev, landed) : null
      } else if (!canceled) setValues(v)
      if (retire) setValueOverride(retire)
    })
    return () => {
      canceled = true
    }
  }, [valuesEpoch, path])
  const effectiveValues = useMemo(() => {
    if (!valueOverride) return values
    const out = { ...values }
    for (const [id, e] of Object.entries(valueOverride)) {
      const prior: PageValues | undefined = values[id]
      out[id] = {
        createdAt: prior?.createdAt ?? null,
        modifiedAt: prior?.modifiedAt ?? null,
        frontmatter: e.fm,
      }
    }
    return out
  }, [values, valueOverride])
  return { values, effectiveValues, setValueOverride }
}
