import { useEffect, useMemo, useRef, useState, type RefObject } from 'react'
import type { EditorView } from '@codemirror/view'
import {
  autocompleteQuery,
  commitEdit,
  type AcRow,
  type AcQuery,
  type AutocompleteQuery,
} from './autocomplete'
import { clamp } from '@pommora/uix/Utilities/clamp'
import { docScan } from '../docCache'
import { normalizeTitle, pageLinkPattern } from '@pommora/core/Connections/connections'
import { restedOnLink } from '../Gestures/linkGestures'
import type { EditorHost } from '../api'

export interface CaretGeometry {
  caretX: number
  caretTop: number
  caretBottom: number
  bounds: { left: number; right: number }
}

export const CLOSED_GEOMETRY: CaretGeometry = {
  caretX: 0,
  caretTop: 0,
  caretBottom: 0,
  bounds: { left: 0, right: 0 },
}

export interface AcState extends AutocompleteQuery, CaretGeometry {}

export interface AcCtl {
  open: boolean
  pick: () => void
  move: (d: number) => void
  close: () => void
}

export function useMenuCtl(
  count: number,
  resetKey: unknown,
  drive: { open: boolean; pick: (index: number) => void; close: () => void },
  initial: number | null = 0,
): { index: number | null; ctl: RefObject<AcCtl> } {
  const [index, setIndex] = useState<number | null>(initial)
  const selected = index === null ? null : Math.min(index, Math.max(count - 1, 0))

  const ctl = useRef<AcCtl>({ open: false, pick: () => {}, move: () => {}, close: () => {} })
  ctl.current = {
    open: drive.open,
    pick: () => drive.pick(selected ?? 0),
    move: (d) =>
      setIndex((i) => (i === null ? (d > 0 ? 0 : count - 1) : clamp(i + d, 0, count - 1))),
    close: drive.close,
  }

  useEffect(() => setIndex(initial), [resetKey, initial])

  return { index: selected, ctl }
}

export const whenAcOpen =
  (ctls: readonly RefObject<AcCtl>[], drive: (c: AcCtl) => void) => (): boolean => {
    const open = ctls.find((r) => r.current.open)?.current
    if (!open) return false
    drive(open)
    return true
  }

interface ConnectionAutocomplete {
  ac: AcState | null
  setAc: (s: AcState | null) => void
  candidates: AcRow[]
  acIndex: number
  commit: (row: AcRow) => void
  acCtl: RefObject<AcCtl>
}

export function useConnectionAutocomplete(
  viewRef: RefObject<EditorView | null>,
  host: EditorHost,
  candidatesFor: (q: AcQuery) => AcRow[],
): ConnectionAutocomplete {
  const [ac, setAc] = useState<AcState | null>(null)
  const candidatesForRef = useRef(candidatesFor)
  candidatesForRef.current = candidatesFor
  const query = ac?.query ?? null
  const form = ac?.form ?? 'link'
  const title = ac?.title
  // The host re-identifies when an alias is forgotten, which is what shrinks the list under an unchanged query.
  const candidates = useMemo(() => {
    if (query === null || (query === '' && form === 'link')) return []
    const found = candidatesForRef.current({ query, form, title })
    if (found.length === 1 && normalizeTitle(found[0].label) === normalizeTitle(query)) return []
    return found
  }, [query, form, title, host])

  const commit = (row: AcRow): void => {
    const view = viewRef.current
    if (!view || !ac || !ctl.current.open) return
    const settings = host.settings()
    // Retargeting replaces the WHOLE token, so an alias the link was wearing is destroyed unless deliberately re-emitted.
    const worn =
      ac.form === 'link'
        ? pageLinkPattern().exec(view.state.doc.sliceString(ac.from, ac.to))?.[2]
        : undefined
    // Only a page the picker offered can open an alias slot — an empty pipe with nothing behind it is a slot the user has to close.
    const openAlias =
      ac.form === 'link' &&
      settings.aliasPickerOnCommit !== false &&
      host.aliases.list(row.pageId ?? '').length > 0
    const { changes, anchor, opensAlias } = commitEdit(ac, row, {
      keepAlias: settings.removeTitleOnLinkChange !== false ? undefined : worn,
      openAlias,
    })
    view.dispatch({
      changes,
      selection: { anchor },
      ...(opensAlias ? {} : { effects: restedOnLink.of(anchor) }),
      userEvent: 'input',
    })
    // NOT cleared here: `detectConnectionQuery` runs on this dispatch, and closing afterwards would wipe the alias picker it just earned.
    view.focus()
  }

  const { index, ctl } = useMenuCtl(candidates.length, ac?.query, {
    open: ac !== null && candidates.length > 0,
    pick: (i) => {
      const r = candidates[i]
      if (r) commit(r)
    },
    close: () => setAc(null),
  })

  return { ac, setAc, candidates, acIndex: index ?? 0, commit, acCtl: ctl }
}

/** The editor's nearest SCROLLING ancestor — the editor itself never scrolls, so `scrollDOM` is the wrong answer. */
const surfaces = new WeakMap<HTMLElement, HTMLElement>()
function surfaceOf(view: EditorView): HTMLElement {
  // Containment, not connectedness: a cached surface can be in the document while the editor has been re-slotted out of it.
  const cached = surfaces.get(view.dom)
  if (cached?.contains(view.dom)) return cached
  // The answer must not be cached: the loop bottoms out at the body, which is connected by definition, so nothing would re-walk.
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

export function caretGeometry(view: EditorView, pos: number): CaretGeometry | null {
  const c = view.coordsAtPos(pos)
  if (!c) return null
  const b = surfaceOf(view).getBoundingClientRect()
  return {
    caretX: Math.round(c.left),
    caretTop: Math.round(c.top),
    caretBottom: Math.round(c.bottom),
    bounds: { left: Math.round(b.left), right: Math.round(b.right) },
  }
}

export function detectConnectionQuery(
  view: EditorView,
  setAc: (s: AcState | null) => void,
  allowEmbeds = false,
): void {
  const sel = view.state.selection.main
  let next: AcState | null = null
  if (sel.empty) {
    const q = autocompleteQuery(docScan(view.state.doc), sel.head, allowEmbeds)
    if (q) {
      const g = caretGeometry(view, sel.head)
      if (g) next = { ...q, ...g }
    }
  }
  setAc(next)
}
