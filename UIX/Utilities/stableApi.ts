import { useMemo, useRef } from 'react'

type Handlers = Record<string, (...args: never[]) => unknown>

/** One identity for the component's lifetime over handlers rebuilt every render, so memoized rows take the api without re-rendering; the key set is fixed at mount. */
export function useStableApi<T extends Handlers>(handlers: T): T {
  const ref = useLatest(handlers)
  return useMemo(
    () =>
      Object.fromEntries(
        Object.keys(handlers).map((key) => [
          key,
          (...args: unknown[]) => (ref.current[key] as (...a: unknown[]) => unknown)(...args),
        ]),
      ) as unknown as T,
    [],
  )
}

/** A ref holding this render's value, for a stable callback that must read the latest props. */
export function useLatest<T>(value: T): { readonly current: T } {
  const ref = useRef(value)
  ref.current = value
  return ref
}
