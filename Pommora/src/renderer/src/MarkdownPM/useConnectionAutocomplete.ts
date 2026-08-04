import { useEffect, useMemo, useRef, useState, type RefObject } from 'react'
import type { EditorView } from '@codemirror/view'
import type { ConnPage } from './connections'
import {
  autocompleteQuery,
  connectionInsert,
  acPanelTop,
  type ConnectionForm,
} from './autocomplete'
import { docString } from './editor/docCache'

export interface AcState {
  query: string
  from: number
  to: number
  form: ConnectionForm
  left: number
  caretTop: number
  caretBottom: number
}

export interface AcCtl {
  open: boolean
  pick: () => void
  move: (d: number) => void
  close: () => void
}

/** Both keymaps bind the same arrows + Escape through this binding, so the fall-through
 *  rule lives in one place. */
export const whenAcOpen = (ctl: RefObject<AcCtl>, drive: (c: AcCtl) => void) => (): boolean => {
  if (!ctl.current.open) return false
  drive(ctl.current)
  return true
}

export interface ConnectionAutocomplete {
  ac: AcState | null
  setAc: (s: AcState | null) => void
  candidates: ConnPage[]
  acIndex: number
  acTop: number
  commit: (page: ConnPage) => void
  acCtl: RefObject<AcCtl>
}

// The `[[…]]` connection autocomplete state machine, shared by the page editor and table cells. The caller
// supplies the live view (for the insert) + a candidate source — each bakes in its own getter/ref and
// self-filter — and owns where the panel renders (inline vs portal) and its keymap. This owns the rest:
// query state, index clamping, the commit, the panel anchor, and the keymap-facing `acCtl` ref. Pair it
// with detectConnectionQuery() in the editor's updateListener.
export function useConnectionAutocomplete(
  viewRef: RefObject<EditorView | null>,
  candidatesFor: (query: string, form: ConnectionForm) => ConnPage[],
): ConnectionAutocomplete {
  const [ac, setAc] = useState<AcState | null>(null)
  const [acIndex, setAcIndex] = useState(0)
  // Every caret move rebuilds `ac`, so the scan keys on the query alone — `candidatesFor` is an
  // inline closure at both call sites and would defeat the memo as a dependency.
  const candidatesForRef = useRef(candidatesFor)
  candidatesForRef.current = candidatesFor
  const query = ac?.query ?? null
  const form = ac?.form ?? 'link'
  const candidates = useMemo(
    () => (query === null ? [] : candidatesForRef.current(query, form)),
    [query, form],
  )

  const commit = (page: ConnPage): void => {
    const view = viewRef.current
    if (!view || !ac) return
    const { insert, caret } = connectionInsert(page.title, ac.from, ac.form)
    view.dispatch({
      changes: { from: ac.from, to: ac.to, insert },
      selection: { anchor: caret },
      userEvent: 'input',
    })
    setAc(null)
    view.focus()
  }

  // The editor's keymap (built once at mount) reads the live panel state through this ref.
  const acCtl = useRef<AcCtl>({ open: false, pick: () => {}, move: () => {}, close: () => {} })
  acCtl.current = {
    open: ac !== null && candidates.length > 0,
    pick: () => {
      const p = candidates[acIndex]
      if (p) commit(p)
    },
    move: (d) => setAcIndex((i) => Math.max(0, Math.min(i + d, candidates.length - 1))),
    close: () => setAc(null),
  }

  useEffect(() => setAcIndex(0), [ac?.query])

  const acTop = ac ? acPanelTop(ac.caretTop, ac.caretBottom, candidates.length) : 0

  return { ac, setAc, candidates, acIndex, acTop, commit, acCtl }
}

// setAc (a useState setter) is stable, so capturing it once at mount is safe; this is a free
// function rather than a closure so both editors share one detection path.
export function detectConnectionQuery(
  view: EditorView,
  setAc: (s: AcState | null) => void,
  allowEmbeds = false,
): void {
  const sel = view.state.selection.main
  let next: AcState | null = null
  if (sel.empty) {
    // docString hits the per-doc-version cache — a raw toString() re-joins the whole rope on
    // every keystroke/caret-move for a read that only touches the caret's line.
    const q = autocompleteQuery(docString(view.state.doc), sel.head, allowEmbeds)
    const c = q && view.coordsAtPos(sel.head)
    if (q && c)
      next = {
        ...q,
        left: Math.round(c.left),
        caretTop: Math.round(c.top),
        caretBottom: Math.round(c.bottom),
      }
  }
  setAc(next)
}
