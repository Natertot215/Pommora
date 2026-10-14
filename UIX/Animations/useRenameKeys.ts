import { useRef } from 'react'

/** A value renamed in place keeps the key it had, so its row neither remounts nor arrives again; `holding` keeps a rename alive while the value is still being edited. */
export function useRenameKeys(
  values: readonly string[],
  holding?: string,
): {
  keyOf: (value: string) => string
  rename: (from: string, to: string) => void
  revert: (to: string) => void
} {
  const renamed = useRef(new Map<string, { key: string; seen: boolean }>())
  const present = new Set(values)
  for (const [value, entry] of renamed.current) {
    if (present.has(value)) entry.seen = true
    else if (entry.seen && value !== holding) renamed.current.delete(value)
  }
  const keyOf = (value: string): string => {
    const key = renamed.current.get(value)?.key
    return key !== undefined && !present.has(key) ? key : value
  }
  return {
    keyOf,
    rename: (from, to) => void renamed.current.set(to, { key: keyOf(from), seen: false }),
    revert: (to) => void renamed.current.delete(to),
  }
}
