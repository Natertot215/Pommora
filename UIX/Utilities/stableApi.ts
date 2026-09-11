import { useMemo, useRef } from 'react'

type Handlers = Record<string, (...args: never[]) => unknown>

/** One identity for the component's lifetime over handlers rebuilt every render, so memoized rows take the api without re-rendering; the key set is fixed at mount. */
export function useStableApi<T extends Handlers>(handlers: T): T {
  const ref = useRef(handlers)
  ref.current = handlers
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
