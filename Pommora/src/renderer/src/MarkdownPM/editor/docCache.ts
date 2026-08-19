// One string materialization + one whole-doc scan per doc VERSION, shared by every extension that runs per
// keystroke / caret move. CM's Text.toString() re-joins the rope on every call and each scan re-splits the
// result — with several extensions each doing both per transaction, this was the lag source. Keyed on the
// immutable Text via WeakMap, so old versions collect with the history.
import type { Text } from '@codemirror/state'
import {
  docLineIntents,
  scanDoc,
  type CachedLineIntents,
  type DocScan,
} from '../decorations/intent'
import type { Token } from '../tokens'

const strings = new WeakMap<Text, string>()
export function docString(doc: Text): string {
  let s = strings.get(doc)
  if (s === undefined) {
    s = doc.toString()
    strings.set(doc, s)
  }
  return s
}

// The decoration pass's whole-doc scans (split + fences + callouts + fence ranges), one per doc
// VERSION — a caret move must never pay an O(doc) re-scan for line chrome that only the text defines.
const scans = new WeakMap<Text, DocScan>()
export function docScan(doc: Text): DocScan {
  let s = scans.get(doc)
  if (!s) {
    s = scanDoc(docString(doc))
    scans.set(doc, s)
  }
  return s
}

// The caret-free per-line decoration intents + rails, one per doc VERSION — a caret move re-derives
// only its own affected lines (the caret's line + its fence's edge lines) and reads the rest from here,
// so the per-caret cost stops scaling with document length.
const lineIntents = new WeakMap<Text, CachedLineIntents>()
export function docLineIntentsOf(doc: Text): CachedLineIntents {
  let v = lineIntents.get(doc)
  if (!v) {
    v = docLineIntents(docScan(doc))
    lineIntents.set(doc, v)
  }
  return v
}

// The inline tokenize over the visible spans, one per doc VERSION + span set. It is the dominant cost
// of a decoration build and answers to nothing but the text under those spans, so a caret move, a focus
// flip, and a resolution nudge read it back rather than re-parsing. One slot per version is enough: a
// scroll moves the span set forward and never returns to the one it left.
const spanTokens = new WeakMap<Text, { key: string; tokens: Token[] }>()
export function docSpanTokens(doc: Text, key: string, derive: () => Token[]): Token[] {
  let v = spanTokens.get(doc)
  if (v?.key !== key) {
    v = { key, tokens: derive() }
    spanTokens.set(doc, v)
  }
  return v.tokens
}

// Every ↔ in the document, one scan per doc VERSION. Only the text says where they are, so a caret
// move, a focus flip, and a scroll read the positions back rather than re-scanning for them.
const bidirMarks = new WeakMap<Text, number[]>()
export function docBidirMarks(doc: Text): number[] {
  let v = bidirMarks.get(doc)
  if (!v) {
    v = [...docString(doc).matchAll(/↔/g)].map((m) => m.index)
    bidirMarks.set(doc, v)
  }
  return v
}
