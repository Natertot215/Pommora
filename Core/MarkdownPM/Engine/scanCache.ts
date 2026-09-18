import { capSet } from '@pommora/uix/Utilities/capMap'
import { scanDoc } from './docScan'

/** A few texts rather than one, because more than one page can be on screen and a single slot would let their renders evict each other. */
const TEXT_SLOTS = 4

export function perText<T>(derive: (text: string) => T): (text: string) => T {
  const held = new Map<string, T>()
  return (text) => {
    const hit = held.get(text)
    if (hit !== undefined) return hit
    const v = derive(text)
    capSet(held, text, v, TEXT_SLOTS)
    return v
  }
}

export const scanOf = perText(scanDoc)
