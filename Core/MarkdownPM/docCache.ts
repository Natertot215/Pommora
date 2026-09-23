// CM's Text.toString() re-joins the rope on every call, and extensions re-scanning the result per keystroke was the lag source.
import type { Text } from '@codemirror/state'
import { docLineIntents } from './Engine/intents'
import type { MarkdownScope } from './Engine/detect'
import { scanDoc } from './Engine/docScan'
import { headingOutlineOf } from './Engine/headingScan'
import { normalizeTitle } from '@pommora/core/Connections/connections'
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

export const docScan = perDoc((doc) => scanDoc(docString(doc)))

/** One cache per vocabulary: `perDoc` keys on the text alone, and the same text read as a page and as a cell derives differently. */
export function perScopedDoc<T>(
  derive: (doc: Text, scope: MarkdownScope) => T,
): (doc: Text, scope?: MarkdownScope) => T {
  const page = perDoc((doc) => derive(doc, 'page'))
  const cell = perDoc((doc) => derive(doc, 'cell'))
  return (doc, scope = 'page') => (scope === 'cell' ? cell(doc) : page(doc))
}

export const docLineIntentsOf = perScopedDoc((doc, scope) => docLineIntents(docScan(doc), scope))

export const docOutline = perDoc((doc) => headingOutlineOf(docScan(doc)))

export const docHeadingKeys = perDoc((doc) => docOutline(doc).map((h) => normalizeTitle(h.text)))

export const docSectionHeadings = perDoc((doc) =>
  docOutline(doc)
    .map((h) => h.text)
    .sort((a, b) => b.length - a.length),
)

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
