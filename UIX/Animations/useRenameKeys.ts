import { useRef } from 'react'

/** A value renamed in place keeps the key it had, so its row neither remounts nor arrives again; `holding` keeps a rename alive while the value is still being edited. `land` gives `to` the key of `from` for the length of `write`, keeping it once the write lands and dropping it on a refusal; a name another row already holds stays that row's, and `mint` gives a draft a key no value holds, which its value takes when it lands. */
export function useRenameKeys(
  values: readonly string[],
  holding?: string,
): {
  rowKeyOf: (value: string) => string
  land: (from: string, to: string, write: () => Promise<boolean>) => Promise<boolean>
  mint: () => string
} {
  const renamed = useRef(new Map<string, { key: string; seen: boolean }>())
  const minted = useRef(0)
  const present = new Set(values)
  for (const [value, entry] of renamed.current) {
    if (present.has(value)) entry.seen = true
    else if (entry.seen && value !== holding) renamed.current.delete(value)
  }
  const rowKeyOf = (value: string): string => {
    const key = renamed.current.get(value)?.key
    return key !== undefined && !present.has(key) ? key : value
  }
  return {
    rowKeyOf,
    land: (from, to, write) => {
      if (!present.has(to)) renamed.current.set(to, { key: rowKeyOf(from), seen: false })
      const landed = write()
      void landed.then((ok) => {
        if (!ok && !renamed.current.get(to)?.seen) renamed.current.delete(to)
      })
      return landed
    },
    mint: () => `\u0000${++minted.current}`,
  }
}
