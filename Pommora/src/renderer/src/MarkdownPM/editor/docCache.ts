// One string materialization + one whole-doc scan per doc VERSION, shared by every extension that runs per
// keystroke / caret move. CM's Text.toString() re-joins the rope on every call and each scan re-splits the
// result — with several extensions each doing both per transaction, this was the lag source. Keyed on the
// immutable Text via WeakMap, so old versions collect with the history.
import type { Text } from '@codemirror/state'
import { docLineIntents, scanDoc } from '../decorations/intent'
import type { Token } from '../tokens'

/** One derivation per doc VERSION, keyed on the immutable `Text` — so an old version's entry
 *  collects with the history rather than being invalidated by hand. Exported so a derivation that
 *  belongs with its own rule can live beside that rule and still be cached once. */
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

// The one whole-document derivation — split, fences, callouts, tables, block constructs, and the
// per-line block predicates — computed once per doc VERSION. A caret move must never pay an O(doc)
// re-scan for line chrome that only the text defines.
export const docScan = perDoc((doc) => scanDoc(docString(doc)))

// The caret-free per-line decoration intents + rails, one per doc VERSION — a caret move re-derives
// only the one line the caret sits on and reads the rest from here, so the per-caret cost stops
// scaling with document length. Every caret-sensitive output is line-local by construction: a
// derivation that reached across lines would be dropped here without a trace.
export const docLineIntentsOf = perDoc((doc) => docLineIntents(docScan(doc)))

// The inline tokenize over the visible spans, one per doc VERSION + span set. It is the dominant cost
// of a decoration build and answers to nothing but the text under those spans, so a caret move, a focus
// flip, and a resolution nudge read it back rather than re-parsing. Two slots, most-recent first: a
// span set is returned to as readily as it is left — scrolling back up, and folding, which moves the
// set within one version.
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

// Every ↔ in the document, one scan per doc VERSION. Only the text says where they are, so a caret
// move, a focus flip, and a scroll read the positions back rather than re-scanning for them.
export const docBidirMarks = perDoc((doc) => [...docString(doc).matchAll(/↔/g)].map((m) => m.index))
