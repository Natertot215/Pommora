// CM's Text.toString() re-joins the rope on every call, and extensions re-scanning the result per keystroke was the lag source.
import type { Text } from '@codemirror/state'
import { docLineIntents, scanOf } from './Engine/docScan'
import type { Token } from './Engine/tokens'

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

export const docScan = perDoc((doc) => scanOf(docString(doc)))

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
