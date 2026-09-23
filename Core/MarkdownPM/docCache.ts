// CM's Text.toString() re-joins the rope on every call, and extensions re-scanning the result per keystroke was the lag source.
import type { Text, Transaction } from '@codemirror/state'
import { docLineIntents, stepLineIntents } from './Engine/intents'
import type { MarkdownScope } from './Engine/detect'
import { rescan, scanDoc } from './Engine/docScan'
import { headingOutlineOf } from './Engine/headingScan'
import { normalizeTitle } from '@pommora/core/Connections/connections'
import type { Token } from './Engine/tokens'

interface PerDoc<T> {
  (doc: Text): T
  after(tr: Transaction): T
}

/** Keyed on the immutable `Text`, so an old version's entry collects with the history rather than being invalidated. */
export function perDoc<T>(
  derive: (doc: Text) => T,
  step?: (prev: T, tr: Transaction) => T,
): PerDoc<T> {
  const held = new WeakMap<Text, T>()
  const of = (doc: Text): T => {
    let v = held.get(doc)
    if (v === undefined) {
      v = derive(doc)
      held.set(doc, v)
    }
    return v
  }
  const after = (tr: Transaction): T => {
    const prev = held.get(tr.startState.doc)
    if (step && prev !== undefined && !held.has(tr.newDoc)) held.set(tr.newDoc, step(prev, tr))
    return of(tr.newDoc)
  }
  return Object.assign(of, { after })
}

export const docString = perDoc((doc) => doc.toString())

function changedSpan(tr: Transaction): [number, number] {
  let from = tr.startState.doc.length
  let to = 0
  tr.changes.iterChangedRanges((fromA, toA) => {
    from = Math.min(from, fromA)
    to = Math.max(to, toA)
  })
  return [from, to]
}

export const docScan = perDoc(
  (doc) => scanDoc(docString(doc)),
  (prev, tr) => rescan(prev, ...changedSpan(tr), docString(tr.newDoc)),
)

interface PerScopedDoc<T> {
  (doc: Text, scope?: MarkdownScope): T
  after(tr: Transaction, scope?: MarkdownScope): T
}

/** One cache per vocabulary: `perDoc` keys on the text alone, and the same text read as a page and as a cell derives differently. */
export function perScopedDoc<T>(
  derive: (doc: Text, scope: MarkdownScope) => T,
  step: (prev: T, tr: Transaction, scope: MarkdownScope) => T,
): PerScopedDoc<T> {
  const of = (scope: MarkdownScope): PerDoc<T> =>
    perDoc(
      (doc) => derive(doc, scope),
      (prev, tr) => step(prev, tr, scope),
    )
  const page = of('page')
  const cell = of('cell')
  return Object.assign(
    (doc: Text, scope: MarkdownScope = 'page') => (scope === 'cell' ? cell(doc) : page(doc)),
    {
      after: (tr: Transaction, scope: MarkdownScope = 'page') =>
        scope === 'cell' ? cell.after(tr) : page.after(tr),
    },
  )
}

export const docLineIntentsOf = perScopedDoc(
  (doc, scope) => docLineIntents(docScan(doc), scope),
  (prev, tr, scope) => stepLineIntents(prev, docScan(tr.startState.doc), docScan.after(tr), scope),
)

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
