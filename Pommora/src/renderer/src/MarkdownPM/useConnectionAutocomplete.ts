import { useEffect, useMemo, useRef, useState, type RefObject } from 'react'
import type { EditorView } from '@codemirror/view'
import {
  autocompleteQuery,
  connectionInsert,
  acPanelTop,
  type AcRow,
  type AcQuery,
  type AutocompleteQuery,
} from './autocomplete'
import { docString } from './editor/docCache'
import { normalizeTitle, pageLinkPattern } from '@shared/connections'
import { useSession } from '../store'

export interface AcState extends AutocompleteQuery {
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
  candidates: AcRow[]
  acIndex: number
  acTop: number
  commit: (row: AcRow) => void
  acCtl: RefObject<AcCtl>
}

// The `[[…]]` connection autocomplete state machine, shared by the page editor and table cells. The caller
// supplies the live view (for the insert) + a candidate source — each bakes in its own getter/ref and
// self-filter — and owns where the panel renders (inline vs portal) and its keymap. This owns the rest:
// query state, index clamping, the commit, the panel anchor, and the keymap-facing `acCtl` ref. Pair it
// with detectConnectionQuery() in the editor's updateListener.
export function useConnectionAutocomplete(
  viewRef: RefObject<EditorView | null>,
  candidatesFor: (q: AcQuery) => AcRow[],
): ConnectionAutocomplete {
  const [ac, setAc] = useState<AcState | null>(null)
  const [acIndex, setAcIndex] = useState(0)
  const dropAlias = useSession((s) => s.personalization.removeTitleOnLinkChange !== false)
  // The alias form's rows come out of this, and forgetting one has to take its row with it — so the
  // scan depends on the memory rather than only on what's been typed.
  const pageAliases = useSession((s) => s.pageAliases)
  // Every caret move rebuilds `ac`, so the scan keys on the query alone — `candidatesFor` is an
  // inline closure at both call sites and would defeat the memo as a dependency.
  const candidatesForRef = useRef(candidatesFor)
  candidatesForRef.current = candidatesFor
  const query = ac?.query ?? null
  const form = ac?.form ?? 'link'
  const title = ac?.title
  // An empty query browses for embeds and aliases — the just-typed opener pops the full list, and a
  // bare pipe is the one moment a page's remembered names are worth showing unprompted. Only link
  // stays quiet, because its pool is every page in the nexus.
  const candidates = useMemo(() => {
    if (query === null || (query === '' && form === 'link')) return []
    const found = candidatesForRef.current({ query, form, title })
    // A sole suggestion identical to what's already written has nothing to offer: accepting it is a
    // no-op edit, and an open panel holds Enter and the arrow keys away from whatever the caret is
    // actually doing. Lives here so every surface on this state machine inherits it.
    if (found.length === 1 && normalizeTitle(found[0].label) === normalizeTitle(query)) return []
    return found
  }, [query, form, title, pageAliases])

  const commit = (row: AcRow): void => {
    const view = viewRef.current
    if (!view || !ac) return
    // Retargeting replaces the WHOLE token, so an alias the link was wearing is destroyed here
    // unless it's deliberately re-emitted. Dropping it is the default — the old words describe the
    // old page — and the setting is what makes that a preference rather than a law. Authoring an
    // alias already put it in that page's memory, so the words survive being dropped from here.
    const worn =
      ac.form === 'link'
        ? pageLinkPattern().exec(view.state.doc.sliceString(ac.from, ac.to))?.[2]
        : undefined
    const kept = dropAlias ? undefined : worn
    const { insert, caret } = connectionInsert(row.value, ac.from, ac.form, kept)
    // A caret resting on a connection's closer keeps its token active, so the link just picked would
    // sit there as raw syntax. Step one past it instead, adding the space when there isn't one to
    // step over. Embeds own their whole line, and an alias lands inside a link rather than past one.
    const spaced = ac.form === 'link'
    const pad = spaced && view.state.doc.sliceString(ac.to, ac.to + 1) !== ' ' ? ' ' : ''
    view.dispatch({
      changes: { from: ac.from, to: ac.to, insert: insert + pad },
      selection: { anchor: caret + (spaced ? 1 : 0) },
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
      const r = candidates[acIndex]
      if (r) commit(r)
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
