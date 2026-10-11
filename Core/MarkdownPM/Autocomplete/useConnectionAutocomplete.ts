import { useEffect, useMemo, useReducer, useState, type RefObject } from 'react'
import { EditorView } from '@codemirror/view'
import type { Extension } from '@codemirror/state'
import {
  AC_MAX,
  aliasRows,
  commitEdit,
  headingRows,
  listsHeadings,
  openHeadingRows,
  pageRow,
  type AcRow,
  type AutocompleteQuery,
} from './autocomplete'
import { toggled } from '@pommora/uix/Utilities/checkSet'
import { docOutline } from '../docCache'
import type { MarkdownScope } from '../Engine/detect'
import { readLinkText } from '../../Connections/linkValue'
import { normalizeTitle } from '../../Paths/caseFold'
import { restedOnLink } from '../Links/linkReveal'
import { titleTarget } from '../Links/connectionsApi'
import type { AutocompletePaneProps } from './AutocompletePane'
import { acQuery, closeAcQuery } from './acQuery'
import type { PageHeading } from '../../Platform/stores'
import { type EditorHost, ownPage } from '../api'
import { caretGeometry, type CaretGeometry, type EditorPane, usePaneCtl } from '../Menus/caretPane'

export interface AcState extends AutocompleteQuery, CaretGeometry {}

interface ConnectionAutocomplete extends EditorPane {
  pane: AutocompletePaneProps
}

export function useConnectionAutocomplete(
  viewRef: RefObject<EditorView | null>,
  host: EditorHost,
  scope: MarkdownScope,
): ConnectionAutocomplete {
  const [ac, setAc] = useState<AcState | null>(null)
  const [field] = useState(() => acQuery(scope))
  const [extension] = useState<Extension>(() => [
    field,
    EditorView.updateListener.of((u) => {
      const q = u.state.field(field).query
      if (q === u.startState.field(field).query) return
      const g = q && caretGeometry(u.view, u.state.selection.main.head)
      setAc(q && g ? { ...q, ...g } : null)
    }),
    EditorView.domEventHandlers({
      blur: (_, view) => {
        if (view.state.field(field).query) view.dispatch({ effects: closeAcQuery.of('blur') })
        return false
      },
    }),
  ])
  const close = (): void => {
    const view = viewRef.current
    if (view?.state.field(field).query) view.dispatch({ effects: closeAcQuery.of('dismiss') })
  }
  const [behind, setBehind] = useState<AcRow[] | null>(null)
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(new Set())
  // The title the heading list slid back to: an exact title closes the page list, but Back must land on it open.
  const [backedTo, setBackedTo] = useState<string | null>(null)
  const query = ac?.query ?? null
  const form = ac?.form ?? 'link'
  const title = ac?.title
  const closed = ac?.closed ?? true
  const heading = listsHeadings(form)
  const page = useMemo(() => {
    if (title) {
      const named = titleTarget(host.connections(), title)
      return named.kind === 'page' ? named.page : null
    }
    if (!heading) return null
    const own = viewRef.current && ownPage(viewRef.current)
    return own?.kind === 'held' ? own.page : null
  }, [heading, title])
  const outline: readonly PageHeading[] = useMemo(() => {
    if (!heading) return []
    if (page) return host.connections()?.headingsOf(page.path)?.outline ?? []
    if (title) return []
    const own = viewRef.current && ownPage(viewRef.current)
    return own?.kind === 'body' ? docOutline(own.view.state.doc) : []
  }, [heading, page, title])

  useEffect(() => {
    if (heading) return
    setCollapsed(new Set())
  }, [heading])

  // A forgotten alias bumps the epoch, which is what shrinks the list under an unchanged query.
  const [aliasEpoch, bumpAliases] = useReducer((n: number) => n + 1, 0)
  useEffect(() => host.aliases.subscribe(bumpAliases), [host])
  const allHeadingRows = useMemo(
    () => (heading && query !== null ? headingRows(outline, query) : []),
    [heading, outline, query],
  )
  const lookup = (q: string): AcRow[] => {
    const conn = host.connections()
    if (!conn) return []
    if (form === 'alias') return aliasRows(host.aliases, page?.id, q)
    return conn.candidates(q, AC_MAX).map((p) => pageRow(p, conn))
  }
  // A query that names its one match exactly is a finished link, so the caret resting in one opens nothing; Back is the exception.
  const candidates = useMemo(() => {
    if (query === null) return []
    const found = heading
      ? query === ''
        ? openHeadingRows(allHeadingRows, collapsed)
        : allHeadingRows
      : lookup(query)
    const exact = found.length === 1 && normalizeTitle(found[0].value) === normalizeTitle(query)
    if (exact && closed && normalizeTitle(query) !== normalizeTitle(backedTo ?? '')) return []
    return found
  }, [query, closed, form, page, host, aliasEpoch, heading, allHeadingRows, collapsed, backedTo])

  useEffect(() => {
    if (ac === null) setBackedTo(null)
    if (ac === null || ac.form === 'link' || ac.form === 'target') setBehind(null)
  }, [ac])

  const commit = (row: AcRow, opts: { openHeading?: boolean } = {}): void => {
    const view = viewRef.current
    if (!view || !ac || !ctl.current.open) return
    const settings = host.settings()
    const container =
      ac.form === 'link'
        ? readLinkText(view.state.sliceDoc(ac.from, ac.to) + (ac.closed ? '' : ']]'))
        : null
    const pageId = row.kind === 'page' ? row.pageId : page?.id
    // Only a page the picker offered can open an alias slot — an empty pipe with nothing behind it is a slot the user has to close.
    const openAlias =
      (ac.form === 'link' || ac.form === 'heading') &&
      !opts.openHeading &&
      settings.aliasPickerOnCommit &&
      host.aliases.list(pageId ?? '').length > 0
    const { changes, anchor, opensAlias, opensHeading } = commitEdit(ac, row.value, {
      container,
      keepTitle: !settings.removeTitleOnLinkChange,
      openAlias,
      openHeading: opts.openHeading,
    })
    if (opensAlias || opensHeading) setBehind(candidates)
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
  const open = ac !== null && candidates.length > 0
  const { index, row, ctl } = usePaneCtl(candidates, resetKey, {
    open,
    pick: commit,
    close,
    aside: (dir) => {
      const view = viewRef.current
      if (!view || !ac) return false
      if (dir === 1 && (ac.form === 'link' || ac.form === 'target')) {
        if (row?.kind !== 'page') return false
        commit(row, { openHeading: true })
        return true
      }
      if (dir === -1 && heading && behind) {
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
      behind,
      headingRows: allHeadingRows,
      collapsed,
      onToggleHeading: (value) => setCollapsed((prev) => toggled(prev, value)),
      onAside: (row) => commit(row, { openHeading: true }),
      onBack: () => ctl.current.aside?.(-1),
      geometry: host.paneGeometry?.('autocomplete'),
    },
  }
}
