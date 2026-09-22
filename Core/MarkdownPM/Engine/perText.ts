import { capSet } from '@pommora/uix/Utilities/capMap'

/** A derivation remembered by its source text, so an unchanged line, cell, or document is derived once rather than on every keystroke or remount. */
export function perText<T>(derive: (text: string) => T, cap: number): (text: string) => T {
  const held = new Map<string, T>()
  return (text) => {
    const hit = held.get(text)
    if (hit !== undefined) return hit
    const v = derive(text)
    // A line or slice can be a V8 view into the whole document, so a stored key is copied or it would hold every version of the document alive.
    capSet(held, ` ${text}`.slice(1), v, cap)
    return v
  }
}
