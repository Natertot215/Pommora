import { useEffect, useMemo, useRef, useState, type RefObject } from 'react'
import type { EditorView } from '@codemirror/view'
import {
  autocompleteQuery,
  commitEdit,
  type AcRow,
  type AcQuery,
  type AutocompleteQuery,
} from './autocomplete'
import { docString } from './Editor/docCache'
import { normalizeTitle, pageLinkPattern } from '@pommora/core/Connections/connections'
import { useSession } from '../Session/store'
import { restedOnLink } from './Editor/linkGestures'

export interface AcState extends AutocompleteQuery {
  /** The caret's x — what the panel centers on, not where its edge lands. */
  caretX: number
  caretTop: number
  caretBottom: number
  /** The surface the panel may slide within, in viewport coords. */
  bounds: { left: number; right: number }
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
  commit: (row: AcRow) => void
  acCtl: RefObject<AcCtl>
}

// The `[[…]]` connection autocomplete state machine, shared by the page editor and table cells.
export function useConnectionAutocomplete(
  viewRef: RefObject<EditorView | null>,
  candidatesFor: (q: AcQuery) => AcRow[],
): ConnectionAutocomplete {
  const [ac, setAc] = useState<AcState | null>(null)
  const [acIndex, setAcIndex] = useState(0)
  const dropAlias = useSession((s) => s.personalization.removeTitleOnLinkChange !== false)
  const offerAliases = useSession((s) => s.personalization.aliasPickerOnCommit !== false)
  const pageAliases = useSession((s) => s.pageAliases)
  const candidatesForRef = useRef(candidatesFor)
  candidatesForRef.current = candidatesFor
  const query = ac?.query ?? null
  const form = ac?.form ?? 'link'
  const title = ac?.title
  const candidates = useMemo(() => {
    if (query === null || (query === '' && form === 'link')) return []
    const found = candidatesForRef.current({ query, form, title })
    if (found.length === 1 && normalizeTitle(found[0].label) === normalizeTitle(query)) return []
    return found
  }, [query, form, title, pageAliases])

  const commit = (row: AcRow): void => {
    const view = viewRef.current
    if (!view || !ac) return
    // Retargeting replaces the WHOLE token, so an alias the link was wearing is destroyed unless
    // it's deliberately re-emitted.
    const worn =
      ac.form === 'link'
        ? pageLinkPattern().exec(view.state.doc.sliceString(ac.from, ac.to))?.[2]
        : undefined
    // Only a page the picker itself offered can open an alias slot, and only when that page has
    // names worth offering — an empty pipe with nothing behind it is a slot the user has to close.
    const openAlias =
      ac.form === 'link' && offerAliases && (pageAliases[row.pageId ?? '']?.length ?? 0) > 0
    const { changes, anchor, opensAlias } = commitEdit(ac, row, {
      keepAlias: dropAlias ? undefined : worn,
      openAlias,
    })
    view.dispatch({
      changes,
      selection: { anchor },
      // A finished link rests rendered on its closer, but only because this gesture put the caret
      // there. A link left open at its alias isn't finished and claims nothing.
      ...(opensAlias ? {} : { effects: restedOnLink.of(anchor) }),
      userEvent: 'input',
    })
    // The panel is NOT cleared here. `detectConnectionQuery` runs on this very dispatch and decides
    // what the new caret position deserves — closing it afterwards would wipe the alias picker that
    // an opened slot has just earned.
    view.focus()
  }

  // Clamped where it's read, not only where it's moved. Forgetting a row shrinks the list without
  // touching the query, so the stored index can end up past the end — and an open panel holds Enter
  // away from the editor while picking nothing at all.
  const selected = Math.min(acIndex, Math.max(candidates.length - 1, 0))

  // The editor's keymap (built once at mount) reads the live panel state through this ref.
  const acCtl = useRef<AcCtl>({ open: false, pick: () => {}, move: () => {}, close: () => {} })
  acCtl.current = {
    open: ac !== null && candidates.length > 0,
    pick: () => {
      const r = candidates[selected]
      if (r) commit(r)
    },
    move: (d) => setAcIndex((i) => Math.max(0, Math.min(i + d, candidates.length - 1))),
    close: () => setAc(null),
  }

  useEffect(() => setAcIndex(0), [ac?.query])

  return { ac, setAc, candidates, acIndex: selected, commit, acCtl }
}

/**
 * The surface the panel is bounded by — the editor's nearest SCROLLING ancestor (the detail pane, a
 * floating window's body, a tile's own box). The editor itself never scrolls, so `scrollDOM` is the
 * wrong answer here. */
const surfaces = new WeakMap<HTMLElement, HTMLElement>()
function surfaceOf(view: EditorView): HTMLElement {
  // Containment, not connectedness: a cached surface can still be in the document while the editor
  // has been re-slotted out of it, and "is that box still on screen" is a different question from
  // "is this editor still inside it".
  const cached = surfaces.get(view.dom)
  if (cached?.contains(view.dom)) return cached
  // A detached editor has no surface to walk to, and the answer must not be cached: the loop bottoms
  // out at the body, which is connected by definition, so nothing would ever re-walk.
  if (!view.dom.isConnected) return document.body
  let el = view.dom.parentElement
  while (el && el !== document.body) {
    const oy = getComputedStyle(el).overflowY
    if (oy === 'auto' || oy === 'scroll') break
    el = el.parentElement
  }
  const found = el ?? document.body
  surfaces.set(view.dom, found)
  return found
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
    if (q && c) {
      const b = surfaceOf(view).getBoundingClientRect()
      next = {
        ...q,
        caretX: Math.round(c.left),
        caretTop: Math.round(c.top),
        caretBottom: Math.round(c.bottom),
        bounds: { left: Math.round(b.left), right: Math.round(b.right) },
      }
    }
  }
  setAc(next)
}
