// CM's Text.toString() re-joins the rope on every call, and extensions re-scanning the result per keystroke was the lag source.
import type { Text } from '@codemirror/state'
import { capSet } from '../../Utilities/capMap'
import { docLineIntents, scanDoc } from '../Decorations/intent'
import type { Token } from '../Tokens'

/** Keyed on the immutable `Text`, so an old version's entry collects with the history rather than being invalidated. */
export function perDoc<T>(derive: (doc: Text) => T): (doc: Text) => T {
  const held = new WeakMap<Text, T>()
  return (doc) => {
    let v = held.get(doc)
    if (v === undefined) {
      v = derive(doc)
      held.set(doc, v)
    }
    return v
  }
}

export const docString = perDoc((doc) => doc.toString())

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

// Keyed on the text, so a caller holding only the body meets the editor's own scan in one slot instead of scanning twice.
export const scanOf = perText(scanDoc)

// One per doc version — a caret move must never pay an O(doc) re-scan for line chrome.
export const docScan = perDoc((doc) => scanOf(docString(doc)))

// Caret-free per-line intents and rails, one per doc version, so per-caret cost stops scaling with document length.
export const docLineIntentsOf = perDoc((doc) => docLineIntents(docScan(doc)))

// Two slots, most-recent first: a span set is returned to as readily as it's left (scrolling back up, folding within one version).
type Slot = { key: string; tokens: Token[] }
const spanTokens = new WeakMap<Text, [Slot] | [Slot, Slot]>()
export function docSpanTokens(doc: Text, key: string, derive: () => Token[]): Token[] {
  const held = spanTokens.get(doc)
  const hit = held?.find((s) => s.key === key)
  if (hit) return hit.tokens
  const fresh: Slot = { key, tokens: derive() }
  spanTokens.set(doc, held ? [fresh, held[0]] : [fresh])
  return fresh.tokens
}
