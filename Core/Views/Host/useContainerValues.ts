import { useEffect, useMemo, useRef, useState } from 'react'
import {
  type Overrides,
  retireSettled,
  type SetOverrides,
  settled,
} from '../../Properties/valueOverride'
import type { PageFrontmatter } from '../../Nexus/schemas'
import type { PageValues, RowValues } from '../viewRow'
import { fetchPageValues } from '../../Properties/pageRow'
import { isAtOrUnder } from '../../Paths/posix'
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

/** A rename refetches and RE-KEYS the overrides (clearing them revives the assign-vanish); a push retires overrides only once its read lands, since a row retired ahead of it paints its identity-only fallback for the round trip. */
export function useValuesEpoch(
  path: string | null,
  land: (values: Record<string, PageValues>, scoped: boolean) => void,
  setValueOverride: SetOverrides,
  pageId?: string,
): void {
  const valuesEpoch = useSession((st) => st.valuesEpoch)
  const live = useLatest({ path, land })
  const fullReads = useRef(0)
  const handled = useRef(valuesEpoch)
  useEffect(() => {
    if (!valuesEpoch || path === null || valuesEpoch === handled.current) return
    let named: string[] | undefined
    if (valuesEpoch.kind === 'container') {
      const mine = valuesEpoch.changes.filter((c) => isAtOrUnder(c.rel, path))
      if (!mine.length) return
      if (mine.every((c) => c.pageIds.length > 0)) named = mine.flatMap((c) => c.pageIds)
      if (pageId && named && !named.includes(pageId)) return
    } else {
      const { oldKey, newKey } = valuesEpoch
      setValueOverride((prev) => rekeyOverrides(prev, oldKey, newKey))
    }
    handled.current = valuesEpoch
    const only = pageId ? [pageId] : named
    const issued = settled()
    const read = only ? 0 : ++fullReads.current
    void fetchPageValues(path, only).then((v) => {
      // A container swap drops any read, and a newer full read drops an older one; a scoped read superseded on the same path still lands, since its pages are not the newer read's.
      if (!v || live.current.path !== path || (read && read !== fullReads.current)) return
      live.current.land(v, only !== undefined)
      // Only a page the read resolved is settled; one it could not still holds its override.
      if (valuesEpoch.kind === 'container')
        setValueOverride((prev) => retireSettled(prev, only ? Object.keys(v) : null, issued))
    })
  }, [valuesEpoch, path, pageId, setValueOverride, live])
}

/** `canceled` keeps a fast container swap from landing the old path's read. The overrides lay each optimistic write over the loaded values, which never re-read on a write. */
export function useContainerValues(path: string): {
  values: Record<string, PageValues>
  effectiveValues: Record<string, RowValues>
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
  useValuesEpoch(
    path,
    (v, scoped) => setValues((prev) => (scoped ? { ...prev, ...v } : v)),
    setValueOverride,
  )
  const effectiveValues = useMemo(() => {
    if (!valueOverride) return values
    const out: Record<string, RowValues> = { ...values }
    for (const [id, e] of Object.entries(valueOverride)) {
      const prior: PageValues | undefined = values[id]
      out[id] = {
        createdAt: prior?.createdAt ?? null,
        modifiedAt: prior?.modifiedAt ?? null,
        frontmatter: e.fm,
        contextValues: e.contexts,
      }
    }
    return out
  }, [values, valueOverride])
  return { values, effectiveValues, setValueOverride }
}
