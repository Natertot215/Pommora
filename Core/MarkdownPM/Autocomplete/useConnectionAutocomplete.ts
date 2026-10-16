import { useEffect, useMemo, useReducer, useState, type RefObject } from 'react'
import { EditorView } from '@codemirror/view'
import type { Extension } from '@codemirror/state'
import {
  AC_MAX,
  aliasRows,
  commitEdit,
  headingRows,
  openHeadingRows,
  pageRow,
  type AcRow,
  type AutocompleteQuery,
} from './autocomplete'
import { toggled } from '@pommora/uix/Utilities/checkSet'
import { docOutline } from '../docCache'
import type { MarkdownScope } from '../Engine/detect'
import { keepsShown, readLinkText } from '../../Connections/linkValue'
import { normalizeTitle } from '../../Paths/caseFold'
import { restedOnLink } from '../Links/linkReveal'
import { baselineAt } from '../Links/linkSettle'
import type { AutocompletePaneProps } from './AutocompletePane'
import { acQuery, closeAcQuery } from './acQuery'
import type { PageHeading } from '../../Platform/stores'
import { type EditorHost, heldOf, ownPage } from '../api'
import { usePaneCtl } from '@pommora/uix/Interactions/paneCtl'
import {
  caretGeometry,
  type CaretGeometry,
  type EditorPane,
  holdPane,
  inCaretPane,
  paneHeld,
} from '../Menus/caretPane'
import { EDITABLE_TARGETS } from '@pommora/uix/Interactions/shared'
import type { AliasEdit } from '../../Connections/aliasMemory'

export type AcState = AutocompleteQuery & CaretGeometry

interface ConnectionAutocomplete extends EditorPane {
  pane: AutocompletePaneProps
}

export function useConnectionAutocomplete(
  viewRef: RefObject<EditorView | null>,
  host: EditorHost,
  scope: MarkdownScope,
): ConnectionAutocomplete {
  const [ac, setAc] = useState<AcState | null>(null)
  const [held, setHeld] = useState(false)
  const [field] = useState(() => acQuery(scope))
  const closePicker = (view: EditorView | null, why: 'dismiss' | 'blur'): void => {
    if (view?.state.field(field).query) view.dispatch({ effects: closeAcQuery.of(why) })
  }
  const [extension] = useState<Extension>(() => [
    field,
    paneHeld,
    EditorView.updateListener.of((u) => {
      const holds = u.state.field(paneHeld)
      if (holds !== u.startState.field(paneHeld)) setHeld(holds)
      const q = u.state.field(field).query
      if (q === u.startState.field(field).query) return
      const g = q && caretGeometry(u.view, u.state.selection.main.head)
      setAc(q && g ? { ...q, ...g } : null)
    }),
    EditorView.domEventHandlers({
      blur: (e, view) => {
        if (inCaretPane(e.relatedTarget)) view.dispatch({ effects: holdPane.of(true) })
        else closePicker(view, 'blur')
        return false
      },
    }),
  ])
  const [behind, setBehind] = useState<AcRow[] | null>(null)
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(new Set())
  // The title the heading list slid back to: an exact title closes the page list, but Back must land on it open.
  const [backedTo, setBackedTo] = useState<string | null>(null)
  const query = ac?.query ?? null
  const part = ac?.part ?? 'title'
  const title = ac?.title
  const closed = ac?.closed ?? true
  const heading = part === 'heading'
  const page = useMemo(() => {
    if (title) return host.connections()?.index.resolve(title).page ?? null
    return (heading && viewRef.current && heldOf(viewRef.current)) || null
  }, [heading, title])
  const outline: readonly PageHeading[] = useMemo(() => {
    if (!heading) return []
    if (page) return host.connections()?.headingsOf(page.path)?.outline ?? []
    if (title) return []
    const own = viewRef.current && ownPage(viewRef.current)
    return own?.kind === 'body' ? docOutline(own.view.state.doc) : []
  }, [heading, page, title])

  useEffect(() => {
    if (!heading) setCollapsed(new Set())
  }, [heading])

  // An edit to the remembered aliases bumps the epoch, which is what reshapes the list under an unchanged query.
  const [aliasEpoch, bumpAliases] = useReducer((n: number) => n + 1, 0)
  useEffect(() => host.aliases.subscribe(bumpAliases), [host])
  const allHeadingRows = useMemo(
    () => (heading && query !== null ? headingRows(outline, query) : []),
    [heading, outline, query],
  )
  const lookup = (q: string): AcRow[] => {
    const conn = host.connections()
    if (!conn) return []
    if (part === 'shown') return aliasRows(host.aliases, page?.id, q)
    return conn.index.candidates(q, AC_MAX).map((p) => pageRow(p, host))
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
  }, [query, closed, part, page, host, aliasEpoch, heading, allHeadingRows, collapsed, backedTo])

  useEffect(() => {
    if (ac === null) setBackedTo(null)
    if (ac === null || ac.part === 'title') setBehind(null)
  }, [ac])

  const commit = (row: AcRow, opts: { openHeading?: boolean } = {}): void => {
    const view = viewRef.current
    if (!view || !ac || !ctl.current.open) return
    const settings = host.settings()
    const conn = host.connections()
    // How the link read before this edit began decides whether its shown text survives a re-aim.
    const was = baselineAt(
      view.state,
      ac.start,
      ac.closed ? view.state.doc.sliceString(ac.start, ac.end) : null,
    )
    const baseline = was === null ? null : readLinkText(was)
    const kept =
      ac.shown &&
      (ac.part !== 'title' ||
        keepsShown(
          baseline,
          {
            kind: 'page',
            syntax: ac.syntax === 'markdown' ? 'markdown' : 'wiki',
            title: row.value,
          },
          settings.removeTitleOnLinkChange,
          conn?.index,
        ))
        ? ac.shown
        : undefined
    const pageId = row.kind === 'page' ? row.pageId : ac.title ? page?.id : undefined
    // A page or heading pick opens the alias stage on a link left showing nothing, for a page that remembers aliases.
    const openAlias =
      ac.part !== 'shown' &&
      !opts.openHeading &&
      !kept &&
      settings.aliasPickerOnCommit &&
      pageId !== undefined &&
      host.aliases.list(pageId).length > 0
    const opensSlot = openAlias || opts.openHeading
    const { changes, anchor } = commitEdit(ac, row.value, {
      kept,
      openAlias,
      openHeading: opts.openHeading,
    })
    if (opensSlot) setBehind(candidates)
    view.dispatch({
      changes,
      selection: { anchor },
      ...(opensSlot ? {} : { effects: restedOnLink.of(anchor) }),
      userEvent: 'input',
    })
    // NOT cleared here: the query listener runs on this dispatch, and closing afterwards would wipe the alias picker it just earned.
    view.focus()
  }

  // A collapse reshapes the list, so the highlight starts over rather than landing on whatever the old index now names.
  const resetKey = heading ? `${query}\u0000${[...collapsed].join('\u0000')}` : query
  const open = ac !== null && (candidates.length > 0 || held)
  const { index, row, ctl } = usePaneCtl(candidates, resetKey, {
    open,
    pick: commit,
    close: () => closePicker(viewRef.current, 'dismiss'),
    aside: (dir) => {
      const view = viewRef.current
      if (!view || !ac) return false
      if (dir === 1 && ac.part === 'title') {
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

  // An edit in the pane ends with the caret back in its slot when it ended there; one that ended by focus going elsewhere leaves as the editor's own blur would. Read a tick later, once focus has landed.
  const endEdit = (stay: boolean): void =>
    void window.setTimeout(() => {
      const view = viewRef.current
      const at = document.activeElement
      if (!view?.state.field(paneHeld) || (inCaretPane(at) && at?.closest(EDITABLE_TARGETS))) return
      view.dispatch({ effects: holdPane.of(false) })
      if (stay || inCaretPane(at)) view.focus()
      else if (!view.dom.contains(at)) view.contentDOM.dispatchEvent(new FocusEvent('blur'))
    }, 0)

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
      geometry: host.paneGeometry('autocomplete'),
      aliasHost:
        part === 'shown' && page
          ? {
              title: page.title,
              edit: (e: AliasEdit) => host.aliases.edit(page.id, e),
              menu: host.menus.alias,
              onEditEnd: endEdit,
            }
          : null,
    },
  }
}
