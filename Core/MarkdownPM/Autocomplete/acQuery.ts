import { StateEffect, StateField, type Text, type Transaction } from '@codemirror/state'
import { docScan } from '../docCache'
import { inCodeAt } from '../Engine/docScan'
import { inBracket } from '../Input/edits'
import { inRawHtml } from '../decorations'
import { editorHost } from '../api'
import type { MarkdownScope } from '../Engine/detect'
import { type AutocompleteQuery, autocompleteQuery, closerOf } from './autocomplete'

export interface AcField {
  query: AutocompleteQuery | null
  armed: number | null
  dismissed: AutocompleteQuery | null
  origin: LinkOrigin | null
}

interface LinkOrigin {
  from: number
  to: number
  text: string
}

export const closeAcQuery = StateEffect.define<'dismiss' | 'blur'>()

const sameQuery = (a: AutocompleteQuery, b: AutocompleteQuery | null): boolean =>
  b !== null &&
  a.form === b.form &&
  a.from === b.from &&
  a.to === b.to &&
  a.closed === b.closed &&
  a.query === b.query &&
  a.title === b.title

const linkStart = (q: AutocompleteQuery): number => (q.label ? q.label.from - 1 : q.from)

const originOf = (doc: Text, q: AutocompleteQuery): LinkOrigin => ({
  from: linkStart(q),
  to: q.to,
  text: doc.sliceString(linkStart(q), q.to) + (q.label || !q.closed ? closerOf(q.form) : ''),
})

function originAfter(
  was: LinkOrigin | null,
  query: AutocompleteQuery | null,
  tr: Transaction,
): LinkOrigin | null {
  if (was === null) return query && originOf(tr.newDoc, query)
  const from = tr.changes.mapPos(was.from, 1)
  const to = tr.changes.mapPos(was.to, 1)
  const head = tr.newSelection.main.head
  if (query ? from !== linkStart(query) : head < from || head > to)
    return query && originOf(tr.newDoc, query)
  return from === was.from && to === was.to ? was : { from, to, text: was.text }
}

function armedBy(tr: Transaction): number | null {
  if (
    !tr.isUserEvent('input') ||
    tr.state.facet(editorHost).settings().inPageHeadingResolution !== 'automatic'
  )
    return null
  let at: number | null = null
  let seen = 0
  tr.changes.iterChangedRanges((_fromA, _toA, fromB, toB) => {
    seen++
    if (toB - fromB === 1 && tr.newDoc.sliceString(fromB, toB) === '§') at = fromB
  })
  if (seen !== 1 || at === null) return null
  const line = tr.newDoc.lineAt(at)
  return inBracket(line.text, at - line.from) || inCodeAt(docScan(tr.newDoc), at) ? null : at
}

export const acQuery = (scope: MarkdownScope) =>
  StateField.define<AcField>({
    create: () => ({ query: null, armed: null, dismissed: null, origin: null }),
    update(value, tr) {
      const close = tr.effects.find((e) => e.is(closeAcQuery))
      if (close)
        return {
          query: null,
          armed: null,
          dismissed: close.value === 'dismiss' ? value.query : null,
          origin: null,
        }
      let armed = armedBy(tr) ?? (value.armed === null ? null : tr.changes.mapPos(value.armed))
      const head = tr.newSelection.main.head
      if (
        armed !== null &&
        (tr.newDoc.sliceString(armed, armed + 1) !== '§' ||
          tr.newDoc.lineAt(armed).number !== tr.newDoc.lineAt(head).number)
      )
        armed = null
      if (!tr.docChanged && !tr.selection)
        return armed === value.armed ? value : { ...value, armed }
      const q =
        tr.newSelection.main.empty && !tr.state.readOnly && !inRawHtml(tr.state, head, scope)
          ? autocompleteQuery(docScan(tr.newDoc), head, armed ?? undefined)
          : null
      const dismissed = q && sameQuery(q, value.dismissed) ? value.dismissed : null
      const query = dismissed
        ? null
        : q && value.query && sameQuery(q, value.query)
          ? value.query
          : q
      const origin = originAfter(value.origin, query, tr)
      return query === value.query &&
        armed === value.armed &&
        dismissed === value.dismissed &&
        origin === value.origin
        ? value
        : { query, armed, dismissed, origin }
    },
  })
