import { useEffect, type Dispatch, type SetStateAction } from 'react'
import type { PageFrontmatter } from '@shared/schemas'
import { useSession } from '../store'

type Overrides = Record<string, PageFrontmatter>

/** A property rename changes the key a value lives under, not the container — so a renderer's
 *  open-container effect never re-fires and its rows would keep reading the old key. Refetch on
 *  the epoch, and RE-KEY the optimistic overrides rather than clearing them: clearing revives the
 *  assign-vanish the container effect guards against. Every values-backed view mounts this. */
export function useValuesEpoch(
  path: string,
  setValues: Dispatch<SetStateAction<Overrides>>,
  setValueOverride: Dispatch<SetStateAction<Overrides | null>>,
): void {
  const valuesEpoch = useSession((st) => st.valuesEpoch)
  useEffect(() => {
    if (!valuesEpoch) return
    let canceled = false
    void window.nexus.loadValues(path).then((v) => {
      if (!canceled) setValues(v)
    })
    const { oldKey, newKey } = valuesEpoch
    setValueOverride((prev) => {
      if (!prev) return prev
      return Object.fromEntries(
        Object.entries(prev).map(([id, fm]) => {
          const root = fm as unknown as Record<string, unknown>
          if (!(oldKey in root)) return [id, fm]
          const { [oldKey]: moved, ...rest } = root
          return [id, { ...rest, [newKey]: moved } as PageFrontmatter]
        }),
      )
    })
    return () => {
      canceled = true
    }
  }, [valuesEpoch, path, setValues, setValueOverride])
}
