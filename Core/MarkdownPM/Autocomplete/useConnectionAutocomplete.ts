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

export interface AcState extends AutocompleteQuery {
  caretX: number
  caretTop: number
  caretBottom: number
  bounds: { left: number; right: number }
}

interface AcCtl {
  open: boolean
  pick: () => void
  move: (d: number) => void
  close: () => void
}

/** Both keymaps bind the same arrows and Escape through this, so the fall-through rule lives in one place. */
export const whenAcOpen = (ctl: RefObject<AcCtl>, drive: (c: AcCtl) => void) => (): boolean => {
  if (!ctl.current.open) return false
  drive(ctl.current)
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
  const [acIndex, setAcIndex] = useState(0)
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
    if (!view || !ac) return
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

  // Clamped where it's read: forgetting a row shrinks the list without touching the query, and an open panel holds Enter away from the editor while picking nothing.
  const selected = Math.min(acIndex, Math.max(candidates.length - 1, 0))

  const acCtl = useRef<AcCtl>({ open: false, pick: () => {}, move: () => {}, close: () => {} })
  acCtl.current = {
    open: ac !== null && candidates.length > 0,
    pick: () => {
      const r = candidates[selected]
      if (r) commit(r)
    },
    move: (d) => setAcIndex((i) => clamp(i + d, 0, candidates.length - 1)),
    close: () => setAc(null),
  }

  useEffect(() => setAcIndex(0), [ac?.query])

  return { ac, setAc, candidates, acIndex: selected, commit, acCtl }
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

export function detectConnectionQuery(
  view: EditorView,
  setAc: (s: AcState | null) => void,
  allowEmbeds = false,
): void {
  const sel = view.state.selection.main
  let next: AcState | null = null
  if (sel.empty) {
    const q = autocompleteQuery(docScan(view.state.doc), sel.head, allowEmbeds)
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
