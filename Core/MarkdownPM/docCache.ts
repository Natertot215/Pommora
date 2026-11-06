// CM's Text.toString() re-joins the rope on every call, and extensions re-scanning the result per keystroke was the lag source.
import { type EditorState, Facet, type Text, type Transaction } from '@codemirror/state'
import type { EditorView } from '@codemirror/view'
import { docLineIntents, stepLineIntents } from './Engine/intents'
import type { MarkdownScope } from './Engine/detect'
import { rescan, scanDoc } from './Engine/docScan'
import { headingOutlineOf } from './Engine/headingScan'
import { normalizeTitle } from '../Paths/caseFold'

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

/** Each view keeps what its last pass drew, by text, so a pass derives only what changed and holds nothing it has moved past. */
export function drawnLast<T>(derive: (text: string, view: EditorView) => T) {
  const last = new WeakMap<EditorView, Map<string, T>>()
  return (view: EditorView, draw: (read: (text: string, keep?: boolean) => T) => void): void => {
    const was = last.get(view)
    const now = new Map<string, T>()
    draw((text, keep = true) => {
      const v = now.get(text) ?? was?.get(text) ?? derive(text, view)
      if (keep) now.set(text, v)
      return v
    })
    last.set(view, now)
  }
}

function changedSpan(tr: Transaction): [number, number] {
  let from = tr.startState.doc.length
  let to = 0
  tr.changes.iterChangedRanges((fromA, toA) => {
    from = Math.min(from, fromA)
    to = Math.max(to, toA)
  })
  return [from, to]
}

/** What a surface reads, stated once where the surface is built, so every derivation below answers for that vocabulary. */
export const surfaceScope = Facet.define<MarkdownScope, MarkdownScope>({
  combine: (values) => values[0] ?? 'page',
})

interface PerScopedDoc<T> {
  (state: EditorState): T
  after(tr: Transaction): T
  of(doc: Text, scope: MarkdownScope): T
}

/** One cache per vocabulary: `perDoc` keys on the text alone, and the same text read as a page and as a cell derives differently. */
export function perScopedDoc<T>(
  derive: (doc: Text, scope: MarkdownScope) => T,
  step: (prev: T, tr: Transaction) => T,
): PerScopedDoc<T> {
  const perScope = (scope: MarkdownScope): PerDoc<T> => perDoc((doc) => derive(doc, scope), step)
  const scoped = { page: perScope('page'), lists: perScope('lists'), inline: perScope('inline') }
  return Object.assign((state: EditorState) => scoped[state.facet(surfaceScope)](state.doc), {
    after: (tr: Transaction) => scoped[tr.startState.facet(surfaceScope)].after(tr),
    of: (doc: Text, scope: MarkdownScope) => scoped[scope](doc),
  })
}

export const docScan = perScopedDoc(
  (doc, scope) => scanDoc(docString(doc), scope),
  (prev, tr) => rescan(prev, ...changedSpan(tr), docString(tr.newDoc)),
)

export const docLineIntentsOf = perScopedDoc(
  (doc, scope) => docLineIntents(docScan.of(doc, scope)),
  (prev, tr) => stepLineIntents(prev, docScan(tr.startState), docScan.after(tr)),
)

export const docOutline = perDoc((doc) => headingOutlineOf(docScan.of(doc, 'page')))

export const docHeadingKeys = perDoc((doc) => docOutline(doc).map((h) => normalizeTitle(h.text)))

export const docSectionHeadings = perDoc((doc) => docOutline(doc).map((h) => h.text))
