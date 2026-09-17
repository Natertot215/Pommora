import { useEffect, useMemo, useRef, useState, type RefObject } from 'react'
import type { EditorView, ViewUpdate } from '@codemirror/view'
import {
  autocompleteQuery,
  commitEdit,
  headingRows,
  openHeadingRows,
  type AcRow,
  type AcQuery,
  type AutocompleteQuery,
} from './autocomplete'
import { clamp } from '@pommora/uix/Utilities/clamp'
import { toggled } from '@pommora/uix/Utilities/checkSet'
import { docScan } from '../docCache'
import { inCodeAt } from '../Engine/docScan'
import { linkAt, normalizeTitle, pageLinkPattern } from '@pommora/core/Connections/connections'
import { restedOnLink } from '../Gestures/linkGestures'
import type { HeadingTarget } from './headingTarget'
import type { OutlineHeading } from '../Engine/headingScan'
import { type EditorHost, editorHost } from '../api'

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
  aside?: (dir: 1 | -1) => boolean
}

export function useMenuCtl(
  count: number,
  resetKey: unknown,
  drive: {
    open: boolean
    pick: (index: number) => void
    close: () => void
    aside?: (dir: 1 | -1) => boolean
  },
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
    aside: drive.aside,
  }

  useEffect(() => setIndex(initial), [resetKey, initial])

  return { index: selected, ctl }
}

export const whenAcOpen =
  (ctls: readonly RefObject<AcCtl>[], drive: (c: AcCtl) => unknown) => (): boolean => {
    const open = ctls.find((r) => r.current.open)?.current
    if (!open) return false
    // A driver that answers a boolean decides whether the key was handled; the rest always handle it.
    const handled = drive(open)
    return typeof handled === 'boolean' ? handled : true
  }

interface ConnectionAutocomplete {
  ac: AcState | null
  setAc: (s: AcState | null) => void
  candidates: AcRow[]
  acIndex: number
  commit: (row: AcRow, opts?: { openHeading?: boolean }) => void
  acCtl: RefObject<AcCtl>
  viaChevron: boolean
  loading: boolean
  headingRows: AcRow[]
  collapsed: ReadonlySet<string>
  toggleHeading: (value: string) => void
}

export function useConnectionAutocomplete(
  viewRef: RefObject<EditorView | null>,
  host: EditorHost,
  candidatesFor: (q: AcQuery) => AcRow[],
  targetOf: (title: string) => HeadingTarget,
): ConnectionAutocomplete {
  const [ac, setAc] = useState<AcState | null>(null)
  const [fetched, setFetched] = useState<OutlineHeading[] | null>(null)
  const [viaChevron, setViaChevron] = useState(false)
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(new Set())
  // The title the heading list slid back to: an exact title closes the page list, but Back must land on it open.
  const [backedTo, setBackedTo] = useState<string | null>(null)
  const candidatesForRef = useRef(candidatesFor)
  candidatesForRef.current = candidatesFor
  const query = ac?.query ?? null
  const form = ac?.form ?? 'link'
  const title = ac?.title
  // A section run reads its outline and rows the same way a heading form does; it never opens an alias slide or a chevron slide.
  const heading = form === 'heading' || form === 'section'
  // Read in render so a warm outline answers in the same pass and an exact heading closes without a frame ever mounting.
  const target = useMemo(() => (heading ? targetOf(title ?? '') : null), [heading, title])
  const outline = target ? (target.outline ?? fetched) : null
  const loading = heading && outline === null

  useEffect(() => {
    setFetched(null)
    if (!target?.fetch) return
    let live = true
    void target.fetch().then((rows) => live && setFetched(rows))
    return () => {
      live = false
    }
  }, [target])

  useEffect(() => {
    if (heading) return
    setViaChevron(false)
    setCollapsed(new Set())
  }, [heading])

  // The host re-identifies when an alias is forgotten, which is what shrinks the list under an unchanged query.
  const allHeadingRows = useMemo(
    () => (heading && query !== null ? headingRows(outline ?? [], query) : []),
    [heading, outline, query],
  )
  // A query that names its one match exactly is a finished link, so the caret resting in one opens nothing; Back is the exception.
  const candidates = useMemo(() => {
    if (query === null) return []
    if (query === '' && form === 'link') return []
    const found = heading
      ? query === ''
        ? openHeadingRows(allHeadingRows, collapsed)
        : allHeadingRows
      : candidatesForRef.current({ query, form, title })
    const exact = found.length === 1 && normalizeTitle(found[0].label) === normalizeTitle(query)
    if (exact && normalizeTitle(query) !== normalizeTitle(backedTo ?? '')) return []
    return found
  }, [query, form, title, host, heading, allHeadingRows, collapsed, backedTo])

  useEffect(() => {
    if (ac === null) setBackedTo(null)
  }, [ac])

  const commit = (row: AcRow, opts: { openHeading?: boolean } = {}): void => {
    const view = viewRef.current
    if (!view || !ac || !ctl.current.open) return
    const settings = host.settings()
    // Retargeting replaces the WHOLE token, so an alias the link was wearing is destroyed unless deliberately re-emitted.
    const worn =
      ac.form === 'link'
        ? pageLinkPattern().exec(view.state.doc.sliceString(ac.from, ac.to))?.groups?.alias
        : undefined
    const pageId = heading ? target?.pageId : row.pageId
    // Only a page the picker offered can open an alias slot — an empty pipe with nothing behind it is a slot the user has to close.
    const openAlias =
      (ac.form === 'link' || ac.form === 'heading') &&
      !opts.openHeading &&
      settings.aliasPickerOnCommit !== false &&
      host.aliases.list(pageId ?? '').length > 0
    const { changes, anchor, opensAlias, opensHeading } = commitEdit(ac, row, {
      keepAlias: settings.removeTitleOnLinkChange !== false ? undefined : worn,
      openAlias,
      openHeading: opts.openHeading,
    })
    if (opensHeading) setViaChevron(true)
    view.dispatch({
      changes,
      selection: { anchor },
      ...(opensAlias || opensHeading ? {} : { effects: restedOnLink.of(anchor) }),
      userEvent: 'input',
    })
    // NOT cleared here: `detectConnectionQuery` runs on this dispatch, and closing afterwards would wipe the alias picker it just earned.
    view.focus()
  }

  // A collapse reshapes the list, so the highlight starts over rather than landing on whatever the old index now names.
  const resetKey = heading ? `${query}\u0000${[...collapsed].join('\u0000')}` : query
  const { index, ctl } = useMenuCtl(candidates.length, resetKey, {
    open: ac !== null && (candidates.length > 0 || loading),
    pick: (i) => {
      const r = candidates[i]
      if (r) commit(r)
    },
    close: () => setAc(null),
    aside: (dir) => {
      const view = viewRef.current
      if (!view || !ac) return false
      if (dir === 1 && ac.form === 'link') {
        const r = candidates[index ?? 0]
        if (!r?.isPage) return false
        commit(r, { openHeading: true })
        return true
      }
      if (dir === -1 && heading && viaChevron) {
        setBackedTo(ac.title ?? '')
        view.dispatch({
          changes: { from: ac.from - 1, to: ac.to, insert: '' },
          selection: { anchor: ac.from - 1 },
          userEvent: 'delete',
        })
        return true
      }
      return false
    },
  })

  return {
    ac,
    setAc,
    candidates,
    acIndex: index ?? 0,
    commit,
    acCtl: ctl,
    viaChevron,
    loading,
    headingRows: allHeadingRows,
    collapsed,
    toggleHeading: (value) => setCollapsed((prev) => toggled(prev, value)),
  }
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
  armed?: number,
): void {
  const sel = view.state.selection.main
  let next: AcState | null = null
  if (sel.empty) {
    const q = autocompleteQuery(docScan(view.state.doc), sel.head, allowEmbeds, armed)
    if (q) {
      const g = caretGeometry(view, sel.head)
      if (g) next = { ...q, ...g }
    }
  }
  setAc(next)
}

// Under Automatic, a `§` typed alone in prose, outside a link and code, arms the section form at its position; the arm lapses once the caret leaves that line.
export function sectionArmAfter(u: ViewUpdate, armed: number | null): number | null {
  let next = armed
  for (const tr of u.transactions) {
    if (
      !tr.isUserEvent('input.type') ||
      u.state.facet(editorHost).settings().inPageHeadingResolution !== 'automatic'
    )
      continue
    let at: number | null = null
    let seen = 0
    tr.changes.iterChangedRanges((fromA, toA, fromB, toB) => {
      seen++
      if (fromA === toA && toB - fromB === 1 && tr.newDoc.sliceString(fromB, toB) === '§')
        at = fromB
    })
    if (seen !== 1 || at === null) continue
    const line = tr.newDoc.lineAt(at)
    if (!linkAt(line.text, at - line.from) && !inCodeAt(docScan(tr.newDoc), at)) next = at
  }
  if (next === null) return null
  const caretLine = u.state.doc.lineAt(u.state.selection.main.head).number
  return next > u.state.doc.length || u.state.doc.lineAt(next).number !== caretLine ? null : next
}
