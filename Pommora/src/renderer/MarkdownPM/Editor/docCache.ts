// CM's Text.toString() re-joins the rope on every call, and several extensions re-scanning the
// result per keystroke was the lag source — hence the per-version caching below.
import type { Text } from '@codemirror/state'
import { docLineIntents, scanDoc } from '../Decorations/intent'
import type { Token } from '../Tokens'

/** One derivation per doc version, keyed on the immutable `Text` — an old version's entry collects
 *  with the history rather than being invalidated by hand. */
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

/** One derivation per text, for a caller that holds the string rather than the version — the
 *  Subfield's counter beside the editor. Holds a few texts rather than one because more than one
 *  page can be on screen (main pane + floating preview), and a single slot would let their renders
 *  evict each other into recomputing on every call. */
const TEXT_SLOTS = 4
export function perText<T>(derive: (text: string) => T): (text: string) => T {
  const held = new Map<string, T>()
  return (text) => {
    const hit = held.get(text)
    if (hit !== undefined) return hit
    const v = derive(text)
    held.set(text, v)
    // Insertion-ordered, so the first key is the least recently added.
    if (held.size > TEXT_SLOTS) held.delete(held.keys().next().value as string)
    return v
  }
}

// Keyed on the text rather than the version, so a caller holding only the text (whose body is the
// same string the editor's own scan was taken from) meets it in one slot instead of scanning twice.
export const scanOf = perText(scanDoc)

// Split, fences, callouts, tables, block constructs, and the per-line block predicates, computed
// once per doc version — a caret move must never pay an O(doc) re-scan for line chrome.
export const docScan = perDoc((doc) => scanOf(docString(doc)))

// Caret-free per-line decoration intents + rails, one per doc version — a caret move re-derives
// only the line it sits on and reads the rest from here, so per-caret cost stops scaling with
// document length.
export const docLineIntentsOf = perDoc((doc) => docLineIntents(docScan(doc)))

// Inline tokenize over the visible spans, one per doc version + span set — the dominant cost of a
// decoration build. Two slots, most-recent first: a span set is returned to as readily as it's
// left (scrolling back up, folding within one version).
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

// Every ↔ in the document, one scan per doc version.
export const docBidirMarks = perDoc((doc) => [...docString(doc).matchAll(/↔/g)].map((m) => m.index))
