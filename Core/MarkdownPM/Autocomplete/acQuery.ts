import { StateEffect, StateField, type Transaction } from '@codemirror/state'
import { docScan } from '../docCache'
import { editorHost, inRawHtml } from '../api'
import type { MarkdownScope } from '../Engine/detect'
import { type AutocompleteQuery, autocompleteQuery } from './autocomplete'

interface AcField {
  query: AutocompleteQuery | null
  armed: number | null
  dismissed: AutocompleteQuery | null
}

const IDLE: AcField = { query: null, armed: null, dismissed: null }

export const closeAcQuery = StateEffect.define<'dismiss' | 'blur'>()

const sameQuery = (a: AutocompleteQuery, b: AutocompleteQuery | null): boolean =>
  b !== null &&
  a.syntax === b.syntax &&
  a.part === b.part &&
  a.start === b.start &&
  a.end === b.end &&
  a.from === b.from &&
  a.to === b.to &&
  a.closed === b.closed &&
  a.query === b.query &&
  a.title === b.title &&
  a.shown === b.shown

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
  return seen === 1 ? at : null
}

export const acQuery = (scope: MarkdownScope) =>
  StateField.define<AcField>({
    create: () => IDLE,
    update(value, tr) {
      const close = tr.effects.find((e) => e.is(closeAcQuery))
      if (close) return { ...IDLE, dismissed: close.value === 'dismiss' ? value.query : null }
      if (!tr.docChanged && !tr.selection) return value
      let armed = armedBy(tr) ?? (value.armed === null ? null : tr.changes.mapPos(value.armed))
      const head = tr.newSelection.main.head
      if (
        armed !== null &&
        (tr.newDoc.sliceString(armed, armed + 1) !== '§' ||
          tr.newDoc.lineAt(armed).number !== tr.newDoc.lineAt(head).number)
      )
        armed = null
      const q =
        tr.newSelection.main.empty && !tr.state.readOnly && !inRawHtml(tr.state, head, scope)
          ? autocompleteQuery(docScan(tr.newDoc), head, armed ?? undefined)
          : null
      const dismissed = q && sameQuery(q, value.dismissed) ? value.dismissed : null
      const query = dismissed ? null : q && sameQuery(q, value.query) ? value.query : q
      return query === value.query && armed === value.armed && dismissed === value.dismissed
        ? value
        : { query, armed, dismissed }
    },
  })
