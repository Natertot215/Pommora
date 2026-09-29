import { useEffect, useMemo, useReducer, useState, type RefObject } from 'react'
import type { EditorView, ViewUpdate } from '@codemirror/view'
import {
  AC_MAX,
  aliasRows,
  autocompleteQuery,
  commitEdit,
  headingRows,
  openHeadingRows,
  pageRow,
  type AcRow,
  type AutocompleteQuery,
} from './autocomplete'
import { toggled } from '@pommora/uix/Utilities/checkSet'
import { docOutline, docScan } from '../docCache'
import { inCodeAt } from '../Engine/docScan'
import { linkAt, normalizeTitle, pageLinkPattern } from '@pommora/core/Connections/connections'
import { restedOnLink } from '../Links/linkReveal'
import { headingTargetOf } from './headingTarget'
import type { AutocompletePaneProps } from './AutocompletePane'
import type { ConnectionsApi } from '../Links/connectionsApi'
import { embedExclusions } from '../Embeds/embedWidget'
import { embeddable } from '../Engine/embedClaims'
import type { OutlineHeading } from '../Engine/headingScan'
import { type EditorHost, editorHost, pageEditorAt } from '../api'
import { useLatest } from '@pommora/uix/Utilities/stableApi'
import { caretGeometry, type CaretGeometry, type PaneCtl, usePaneCtl } from '../Menus/caretPane'

export interface AcState extends AutocompleteQuery, CaretGeometry {}

interface ConnectionAutocomplete {
  setAc: (s: AcState | null) => void
  acCtl: RefObject<PaneCtl>
  pane: AutocompletePaneProps
}

export function useConnectionAutocomplete(
  viewRef: RefObject<EditorView | null>,
  host: EditorHost,
  getConn: () => ConnectionsApi | undefined,
): ConnectionAutocomplete {
  const [ac, setAc] = useState<AcState | null>(null)
  const [fetched, setFetched] = useState<OutlineHeading[] | null>(null)
  const [viaChevron, setViaChevron] = useState(false)
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(new Set())
  // The title the heading list slid back to: an exact title closes the page list, but Back must land on it open.
  const [backedTo, setBackedTo] = useState<string | null>(null)
  const getConnRef = useLatest(getConn)
  const query = ac?.query ?? null
  const form = ac?.form ?? 'link'
  const title = ac?.title
  // A section run reads its outline and rows the same way a heading form does; it never opens an alias slide or a chevron slide.
  const heading = form === 'heading' || form === 'section'
  // Read in render so a warm outline answers in the same pass and an exact heading closes without a frame ever mounting.
  const target = useMemo(() => {
    if (!heading) return null
    if (title) return headingTargetOf(host, getConnRef.current(), title)
    // The host document's outline for a bare `#`: a cell's own document is one cell, so the page around it answers.
    const view = viewRef.current
    const page = view && (pageEditorAt(view.dom).view ?? view)
    return { kind: 'warm' as const, outline: page ? docOutline(page.state.doc) : [] }
  }, [heading, title])
  const outline = target?.kind === 'warm' ? target.outline : fetched
  // A freshly typed `#` shows the empty frame while a cold page's rows load; a typed prefix, or a caret placed in a finished link, waits for the rows so nothing flashes.
  const loading = heading && outline === null && query === ''

  useEffect(() => {
    setFetched(null)
    if (target?.kind !== 'cold') return
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

  // A forgotten alias bumps the epoch, which is what shrinks the list under an unchanged query.
  const [aliasEpoch, bumpAliases] = useReducer((n: number) => n + 1, 0)
  useEffect(() => host.aliases.subscribe(bumpAliases), [host])
  const allHeadingRows = useMemo(
    () => (heading && query !== null ? headingRows(outline ?? [], query) : []),
    [heading, outline, query],
  )
  const lookup = (q: string): AcRow[] => {
    const conn = getConnRef.current()
    if (!conn) return []
    if (form === 'alias') return aliasRows(conn, host.aliases, title, q)
    const embed = form === 'embed'
    let pool = conn.candidates(q, embed ? AC_MAX * 2 : AC_MAX)
    if (embed) {
      const state = viewRef.current?.state
      const taken = state ? embedExclusions(state) : new Set<string>()
      pool = pool.filter((p) => embeddable(p.title, taken))
    }
    return pool.slice(0, AC_MAX).map((p) => pageRow(p, conn))
  }
  // A query that names its one match exactly is a finished link, so the caret resting in one opens nothing; Back is the exception.
  const candidates = useMemo(() => {
    if (query === null) return []
    if (query === '' && form === 'link') return []
    const found = heading
      ? query === ''
        ? openHeadingRows(allHeadingRows, collapsed)
        : allHeadingRows
      : lookup(query)
    const exact = found.length === 1 && normalizeTitle(found[0].value) === normalizeTitle(query)
    if (exact && normalizeTitle(query) !== normalizeTitle(backedTo ?? '')) return []
    return found
  }, [query, form, title, host, aliasEpoch, heading, allHeadingRows, collapsed, backedTo])

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
    const pageId = row.kind === 'page' ? row.pageId : target?.pageId
    // Only a page the picker offered can open an alias slot — an empty pipe with nothing behind it is a slot the user has to close.
    const openAlias =
      (ac.form === 'link' || ac.form === 'heading') &&
      !opts.openHeading &&
      settings.aliasPickerOnCommit &&
      host.aliases.list(pageId ?? '').length > 0
    const { changes, anchor, opensAlias, opensHeading } = commitEdit(ac, row.value, {
      keepAlias: settings.removeTitleOnLinkChange ? undefined : worn,
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
  const { index, ctl } = usePaneCtl(candidates.length, resetKey, {
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
        if (r?.kind !== 'page') return false
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
    setAc,
    acCtl: ctl,
    pane: {
      ac,
      candidates,
      index: index ?? 0,
      onPick: commit,
      viaChevron,
      loading,
      headingRows: allHeadingRows,
      collapsed,
      onToggleHeading: (value) => setCollapsed((prev) => toggled(prev, value)),
      onAside: (row) => commit(row, { openHeading: true }),
      onBack: () => ctl.current.aside?.(-1),
      geometry: host.paneGeometry?.('autocomplete'),
    },
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
