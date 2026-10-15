import { useRef } from 'react'

/** A value renamed in place keeps the key it had, so its row neither remounts nor arrives again; `holding` keeps a rename alive while the value is still being edited. A name another row already holds stays that row's, and `mint` gives a draft a key no value holds, which its value takes when it lands. */
export function useRenameKeys(
  values: readonly string[],
  holding?: string,
): {
  keyOf: (value: string) => string
  rename: (from: string, to: string) => void
  revert: (to: string) => void
  mint: () => string
} {
  const renamed = useRef(new Map<string, { key: string; seen: boolean }>())
  const minted = useRef(0)
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
    rename: (from, to) => {
      if (!present.has(to)) renamed.current.set(to, { key: keyOf(from), seen: false })
    },
    revert: (to) => {
      if (!renamed.current.get(to)?.seen) renamed.current.delete(to)
    },
    mint: () => `\u0000${++minted.current}`,
  }
}
