import { useEffect, useMemo, useReducer, useRef, useState, type RefObject } from 'react'
import { EditorView, type ViewUpdate } from '@codemirror/view'
import type { Extension } from '@codemirror/state'
import {
  AC_MAX,
  aliasRows,
  autocompleteQuery,
  commitEdit,
  headingRows,
  listsHeadings,
  openHeadingRows,
  pageRow,
  type AcRow,
  type AutocompleteQuery,
} from './autocomplete'
import { toggled } from '@pommora/uix/Utilities/checkSet'
import { docOutline, docScan } from '../docCache'
import { inCodeAt } from '../Engine/docScan'
import type { MarkdownScope } from '../Engine/detect'
import { pageLinkPattern } from '../../Connections/connections'
import { normalizeTitle } from '../../Paths/caseFold'
import { inBracket } from '../Input/edits'
import { restedOnLink } from '../Links/linkReveal'
import { headingTargetOf, pageHeadingTarget } from './headingTarget'
import type { AutocompletePaneProps } from './AutocompletePane'
import type { ConnectionsApi } from '../Links/connectionsApi'
import { embeddable, embedExclusions } from '../Embeds/embedWidget'
import type { OutlineHeading } from '../Engine/headingScan'
import { type EditorHost, editorHost, ownPage } from '../api'
import { useLatest } from '@pommora/uix/Utilities/stableApi'
import { caretGeometry, type CaretGeometry, type EditorPane, usePaneCtl } from '../Menus/caretPane'

export interface AcState extends AutocompleteQuery, CaretGeometry {}

interface ConnectionAutocomplete extends EditorPane {
  pane: AutocompletePaneProps
}

export function useConnectionAutocomplete(
  viewRef: RefObject<EditorView | null>,
  host: EditorHost,
  getConn: () => ConnectionsApi | undefined,
  scope: MarkdownScope,
): ConnectionAutocomplete {
  const [ac, setAc] = useState<AcState | null>(null)
  // The position of a typed `§` that opens the heading list in prose; cleared once the caret leaves its line or the pane closes.
  const armed = useRef<number | null>(null)
  const measured = useRef<AutocompleteQuery | null>(null)
  const [extension] = useState<Extension>(() => [
    EditorView.domEventHandlers({
      blur: () => {
        measured.current = null
        setAc(null)
        return false
      },
    }),
    EditorView.updateListener.of((u) => {
      armed.current = sectionArmAfter(u, armed.current)
      // A click seating the caret inside a rendered [[Title]] would otherwise pop the picker over a surface that can't accept an edit.
      if (!(u.docChanged || u.selectionSet) || u.state.readOnly) return
      const { empty, head } = u.state.selection.main
      const q = empty
        ? autocompleteQuery(
            docScan(u.state.doc),
            head,
            scope === 'page',
            armed.current ?? undefined,
          )
        : null
      // The caret is measured only when the query moves, so arrowing inside a finished link reads no layout.
      if (q && sameQuery(q, measured.current)) return
      const g = q && caretGeometry(u.view, head)
      measured.current = g ? q : null
      setAc(q && g ? { ...q, ...g } : null)
    }),
  ])
  // The pane closing (Escape, a commit, a blur) leaves the § bare rather than arming the next keystroke near it.
  const formRef = useRef<string | null>(null)
  useEffect(() => {
    if (ac?.form !== 'section' && formRef.current === 'section') armed.current = null
    formRef.current = ac?.form ?? null
  }, [ac])
  const [fetched, setFetched] = useState<OutlineHeading[] | null>(null)
  const [viaChevron, setViaChevron] = useState(false)
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(new Set())
  // The title the heading list slid back to: an exact title closes the page list, but Back must land on it open.
  const [backedTo, setBackedTo] = useState<string | null>(null)
  const getConnRef = useLatest(getConn)
  const query = ac?.query ?? null
  const form = ac?.form ?? 'link'
  const title = ac?.title
  const heading = listsHeadings(form)
  // Read in render so a warm outline answers in the same pass and an exact heading closes without a frame ever mounting.
  const target = useMemo(() => {
    if (!heading) return null
    if (title) return headingTargetOf(host, getConnRef.current(), title)
    // The outline of the page a bare `#` answers to, never the editor's own document when that is a cell or a value.
    const own = viewRef.current && ownPage(viewRef.current)
    if (own?.kind === 'held') return pageHeadingTarget(host, own.page)
    return { kind: 'warm' as const, outline: own ? docOutline(own.view.state.doc) : [] }
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
    // NOT cleared here: the query listener runs on this dispatch, and closing afterwards would wipe the alias picker it just earned.
    view.focus()
  }

  // A collapse reshapes the list, so the highlight starts over rather than landing on whatever the old index now names.
  const resetKey = heading ? `${query}\u0000${[...collapsed].join('\u0000')}` : query
  const open = ac !== null && (candidates.length > 0 || loading)
  const { index, row, ctl } = usePaneCtl(candidates, resetKey, {
    open,
    pick: commit,
    close: () => setAc(null),
    aside: (dir) => {
      const view = viewRef.current
      if (!view || !ac) return false
      if (dir === 1 && (ac.form === 'link' || (ac.form === 'target' && ac.query !== ''))) {
        if (row?.kind !== 'page') return false
        commit(row, { openHeading: true })
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
    extension,
    ctl,
    pane: {
      open,
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

const sameQuery = (a: AutocompleteQuery, b: AutocompleteQuery | null): boolean =>
  b !== null &&
  a.form === b.form &&
  a.from === b.from &&
  a.to === b.to &&
  a.query === b.query &&
  a.title === b.title

// Under Automatic, a `§` typed alone in prose, outside a bracket and code, arms the section form at its position; the arm lapses once the caret leaves that line.
function sectionArmAfter(u: ViewUpdate, armed: number | null): number | null {
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
    if (!inBracket(line.text, at - line.from) && !inCodeAt(docScan(tr.newDoc), at)) next = at
  }
  if (next === null) return null
  const caretLine = u.state.doc.lineAt(u.state.selection.main.head).number
  return next > u.state.doc.length || u.state.doc.lineAt(next).number !== caretLine ? null : next
}
