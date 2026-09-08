import { useEffect, useRef, type ReactNode } from 'react'
import { docString } from './docCache'
import { EditorView, keymap } from '@codemirror/view'
import { Compartment, EditorState, Prec } from '@codemirror/state'
import { history, historyField, historyKeymap, defaultKeymap } from '@codemirror/commands'
import { markdown } from '@codemirror/lang-markdown'
import { EDITOR_SCALE_DEFAULT, coerceScale } from '@pommora/core/Settings/personalization'
import { markdownDecorations } from './decorations'
import { markdownInput } from './Input/markdownInput'
import {
  tableWidgetExtension,
  applySavedHeadingCols,
  type TableHeadingColsApi,
} from './Tables/widget'
import { listDragExtension } from './Gestures/listDrag'
import { listRenumberOnDelete } from './Input/listRenumber'
import { blockHandles, blockGripHover } from './blockHandles'
import {
  blockDragExtension,
  blockquoteDragExtension,
  calloutDragExtension,
} from './Gestures/blockDrag'
import { gripMenu } from './Menus/gripMenu'
import {
  type EmbedHeightsApi,
  embedExclusions,
  embedField,
  embedTiles,
  refreshTileZooms,
  rerenderWebTiles,
  resolutionNudge,
  setEmbedHeights,
  setEmbedZooms,
} from './Embeds/embedWidget'
import { embeddable } from './Engine/embedRanges'
import { customCaret } from './caret'
import { customSelection } from './selection'
import { codeHighlight, codeLanguages } from './codeHighlight'
import { registerScrollHeal } from './Embeds/scrollHeal'
import { calloutAtomic } from './Guards/calloutAtomic'
import { calloutGuard } from './Guards/calloutGuard'
import { citationGuard } from './Guards/citationGuard'
import { citationHost, citationOrder, citationSeatAt } from './Citations/citationActions'
import { citationPointer, citationRowMenu, citationRowPointer } from './Citations/citationPointer'
import { connectionClicks } from './Links/connectionClicks'
import { markdownLinkClicks } from './Links/linkClicks'
import { pasteLink } from './Links/pasteLink'
import { pendingTitle } from './Links/pendingTitle'
import { aliasOnLeave } from './Links/linkEdit'
import { linkRest, linkTyping } from './Gestures/linkGestures'
import {
  markdownFolding,
  applySavedFolds,
  applyCitationsVisibility,
  type FoldsApi,
} from './folding'
import { applyEditorAction, claimEditorMenu, ownsEditorMenu, releaseEditorMenu } from './Menus/menu'
import { formatKeymap } from './Input/formatKeymap'
import { embedSeatAt } from './Embeds/embedInsert'
import { readFormatState } from './Input/formatState'
import type { FormatState } from '@pommora/core/Actions/editorMenu'
import { AC_MAX, aliasRows, pageRow } from './Autocomplete/autocomplete'
import {
  useConnectionAutocomplete,
  detectConnectionQuery,
  whenAcOpen,
} from './Autocomplete/useConnectionAutocomplete'
import { AutocompletePane } from './Autocomplete/AutocompletePane'
import type { ConnectionsApi } from './Links/connectionsApi'
import type { WarmSeam } from './warmSeam'
import { type EditorHost, editorHost } from './api'
import './markdown-pm.css'

export const EDITOR_BASE_PT = 15

export function zoomFontSize(scale: number): number {
  return EDITOR_BASE_PT * coerceScale(scale, EDITOR_SCALE_DEFAULT)
}

interface Props {
  initialBody: string
  onChange: (body: string) => void
  host: EditorHost
  header?: ReactNode
  scale?: number
  connections?: ConnectionsApi
  embedAncestors?: readonly string[]
  embedHeights?: EmbedHeightsApi
  embedZooms?: EmbedHeightsApi
  folds?: FoldsApi
  tableHeadingColumns?: TableHeadingColsApi
  autoFocus?: boolean
  readOnly?: boolean
  edgeFade?: boolean
  warm?: WarmSeam
  active?: boolean
  register?: (view: EditorView | null) => void
}

export function MarkdownEditor({
  initialBody,
  onChange,
  host,
  header,
  scale = EDITOR_SCALE_DEFAULT,
  connections,
  embedAncestors,
  embedHeights,
  embedZooms,
  folds,
  tableHeadingColumns,
  autoFocus = false,
  readOnly = false,
  edgeFade = false,
  warm,
  register,
  active = true,
}: Props): React.JSX.Element {
  const readOnlyGate = useRef(new Compartment())
  const lastReadOnly = useRef(readOnly)
  const editorRef = useRef<HTMLDivElement>(null)
  const shellRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<EditorView | null>(null)
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange
  const hostRef = useRef(host)
  hostRef.current = host
  const connectionsRef = useRef(connections)
  connectionsRef.current = connections
  const embedAncestorsRef = useRef<readonly string[]>(embedAncestors ?? [])
  embedAncestorsRef.current = embedAncestors ?? []
  const embedHeightsRef = useRef(embedHeights)
  embedHeightsRef.current = embedHeights
  const embedZoomsRef = useRef(embedZooms)
  embedZoomsRef.current = embedZooms
  const foldsRef = useRef(folds)
  foldsRef.current = folds
  const tableHeadingColsRef = useRef(tableHeadingColumns)
  tableHeadingColsRef.current = tableHeadingColumns
  const activeRef = useRef(active)
  activeRef.current = active
  const registerRef = useRef(register)
  registerRef.current = register
  const lastFormatRef = useRef<FormatState | null>(null)

  // Decorations rebuild only on editor updates, so a real tree change dispatches an empty transaction.
  useEffect(() => {
    if (connections) viewRef.current?.dispatch({ effects: resolutionNudge.of(null) })
  }, [connections])

  const cbLineCount = host.settings().codeblockLineCount
  useEffect(() => {
    viewRef.current?.requestMeasure()
  }, [cbLineCount])

  useEffect(() => {
    const view = viewRef.current
    if (view) rerenderWebTiles(view)
  }, [active])

  const citesShown = host.citations.shown()
  const citesShownRef = useRef(citesShown)
  citesShownRef.current = citesShown
  // The first change this effect carries is the nexus-wide seed settling in, not a user toggle.
  const followed = useRef(false)
  useEffect(() => {
    const view = viewRef.current
    if (!view) return
    applyCitationsVisibility(view, citesShown, followed.current)
    followed.current = true
  }, [citesShown])

  const { ac, setAc, candidates, acIndex, commit, acCtl } = useConnectionAutocomplete(
    viewRef,
    host,
    (q) => {
      const conn = connectionsRef.current
      if (!conn) return []
      if (q.form === 'alias') return aliasRows(conn, hostRef.current.aliases, q.title, q.query)
      const embed = q.form === 'embed'
      let pool = conn.candidates(q.query, embed ? AC_MAX * 2 : AC_MAX)
      if (embed) {
        const state = viewRef.current?.state
        const taken = state ? embedExclusions(state) : new Set<string>()
        pool = pool.filter((p) => embeddable(p.title, taken))
      }
      return pool.slice(0, AC_MAX).map(pageRow)
    },
  )

  useEffect(() => {
    const parent = editorRef.current
    if (!parent) return
    const extensions = [
      editorHost.of(hostRef.current),
      // Editable stays true even read-only: selection renders natively, so the at-rest embed must stay focusable.
      EditorView.editable.of(true),
      readOnlyGate.current.of(EditorState.readOnly.of(lastReadOnly.current)),
      // EditorState.readOnly is ADVISORY — it stops the view's input pipeline but not a programmatic dispatch.
      EditorState.changeFilter.of((tr) => !(tr.startState.readOnly && tr.docChanged)),
      history(),
      Prec.highest(
        keymap.of([
          { key: 'ArrowDown', run: whenAcOpen(acCtl, (c) => c.move(1)) },
          { key: 'ArrowUp', run: whenAcOpen(acCtl, (c) => c.move(-1)) },
          { key: 'Enter', run: whenAcOpen(acCtl, (c) => c.pick()) },
          { key: 'Escape', run: whenAcOpen(acCtl, (c) => c.close()) },
        ]),
      ),
      markdownInput,
      formatKeymap,
      keymap.of([...defaultKeymap, ...historyKeymap]),
      markdown({ addKeymap: false, pasteURLAsLink: false, completeHTMLTags: false, codeLanguages }),
      codeHighlight,
      EditorView.lineWrapping,
      // iOS soft-keyboard hints, no-ops on desktop — mobile scaffolding.
      EditorView.contentAttributes.of({
        autocapitalize: 'sentences',
        autocorrect: 'off',
        spellcheck: 'true',
        enterkeyhint: 'enter',
      }),
      markdownDecorations(() => connectionsRef.current),
      tableWidgetExtension(
        () => connectionsRef.current,
        (indices) => tableHeadingColsRef.current?.save(indices),
      ),
      embedTiles({
        getConn: () => connectionsRef.current,
        ancestors: embedAncestorsRef.current,
        saveHeights: embedHeightsRef.current ? (h) => embedHeightsRef.current?.save(h) : undefined,
        saveZooms: embedZoomsRef.current ? (z) => embedZoomsRef.current?.save(z) : undefined,
        tabActive: () => activeRef.current,
      }),
      listDragExtension,
      listRenumberOnDelete,
      blockHandles,
      blockGripHover(),
      blockDragExtension,
      calloutDragExtension,
      blockquoteDragExtension,
      gripMenu,
      customCaret,
      customSelection,
      calloutAtomic,
      calloutGuard,
      citationGuard,
      connectionClicks(() => connectionsRef.current),
      citationHost.of({
        shown: () => citesShownRef.current,
        reveal: () => hostRef.current.citations.set(true),
      }),
      citationOrder,
      citationPointer(() => connectionsRef.current),
      citationRowPointer(),
      citationRowMenu(),
      markdownLinkClicks(() => connectionsRef.current),
      pasteLink,
      pendingTitle,
      aliasOnLeave(() => connectionsRef.current),
      linkRest,
      linkTyping,
      EditorView.domEventHandlers({
        blur: () => {
          setAc(null)
          return false
        },
      }),
      markdownFolding(
        (keys) => foldsRef.current?.save(keys),
        () => {
          const { citations } = hostRef.current
          citations.set(!citations.shown())
        },
      ),
      EditorView.updateListener.of((u) => {
        if (!(u.docChanged || u.selectionSet || u.focusChanged)) return
        if (u.focusChanged && u.view.hasFocus) claimEditorMenu(u.view)
        const doc = docString(u.state.doc)
        if (u.docChanged) onChangeRef.current(doc)

        if (ownsEditorMenu(u.view)) {
          const sel = u.state.selection.main
          const fs = readFormatState(
            doc,
            sel.from,
            sel.to,
            u.view.hasFocus,
            embedSeatAt(u.state),
            citationSeatAt(u.state),
          )
          const last = lastFormatRef.current
          const changed =
            !last || (Object.keys(fs) as (keyof typeof fs)[]).some((k) => fs[k] !== last[k])
          if (changed) {
            lastFormatRef.current = fs
            hostRef.current.menus.format?.pushState(fs)
          }
        }

        // A click seating the caret inside a rendered [[Title]] would otherwise pop the picker over a surface that can't accept an edit.
        if ((u.docChanged || u.selectionSet) && !u.state.readOnly)
          detectConnectionQuery(u.view, setAc, true)
      }),
    ]
    const saved = warm?.restore()
    let warmState: EditorState | null = null
    if (saved?.editorState !== undefined) {
      try {
        warmState = EditorState.fromJSON(
          saved.editorState,
          { extensions },
          { history: historyField },
        )
      } catch {
        warmState = null
      }
    }
    const view = new EditorView(
      warmState ? { state: warmState, parent } : { doc: initialBody, parent, extensions },
    )
    viewRef.current = view
    registerRef.current?.(view)
    // At cleanup time React may have already detached the DOM, where reading scrollTop yields 0 and would wipe the saved position.
    let lastScrollTop = saved?.scrollTop ?? 0
    const onWarmScroll = (): void => {
      lastScrollTop = view.scrollDOM.scrollTop
    }
    let unregisterHeal: (() => void) | null = null
    if (warm) {
      view.scrollDOM.addEventListener('scroll', onWarmScroll, { passive: true })
      unregisterHeal = registerScrollHeal(() => {
        if (view.scrollDOM.scrollTop === 0 && lastScrollTop > 0)
          view.scrollDOM.scrollTop = lastScrollTop
      })
    }
    if (edgeFade) view.scrollDOM.classList.add('over-scroll', 'over-scroll-gated')
    if (autoFocus && !lastReadOnly.current) view.focus()
    applyCitationsVisibility(view, citesShownRef.current, false)
    // The warm scroll restores AFTER folds settle: folding changes content height, so restoring first lands on a pre-fold offset.
    const restoreScroll = (): void => {
      // != null, not truthy — a saved top-of-page (0) must still override CM's own restore scroll.
      if (saved?.scrollTop != null) view.scrollDOM.scrollTop = saved.scrollTop
    }
    const foldsLoad = foldsRef.current?.load()
    const heightsLoad = embedHeightsRef.current?.load()
    const zoomsLoad = embedZoomsRef.current?.load()
    if (foldsLoad || heightsLoad || zoomsLoad)
      void Promise.allSettled([foldsLoad, heightsLoad, zoomsLoad]).then(([keys, h, z]) => {
        if (keys.status === 'fulfilled' && keys.value) applySavedFolds(view, keys.value)
        if (h.status === 'fulfilled' && h.value && Object.keys(h.value).length > 0)
          view.dispatch({
            effects: setEmbedHeights.of({ ...h.value, ...view.state.field(embedField).heights }),
          })
        if (z.status === 'fulfilled' && z.value && Object.keys(z.value).length > 0) {
          view.dispatch({
            effects: setEmbedZooms.of({ ...z.value, ...view.state.field(embedField).zooms }),
          })
          refreshTileZooms(view, false)
        }
        restoreScroll()
      })
    else requestAnimationFrame(restoreScroll)
    void tableHeadingColsRef.current?.load().then((indices) => applySavedHeadingCols(view, indices))
    const unsubMenu = hostRef.current.menus.format?.onAction((action) => {
      if (ownsEditorMenu(view)) applyEditorAction(view, action)
    })
    return () => {
      unsubMenu?.()
      releaseEditorMenu(view)
      if (warm) {
        unregisterHeal?.()
        view.scrollDOM.removeEventListener('scroll', onWarmScroll)
        warm.capture({
          editorState: view.state.toJSON({ history: historyField }),
          scrollTop: lastScrollTop,
        })
      }
      registerRef.current?.(null)
      view.destroy()
      viewRef.current = null
    }
    // Mount once per page — the host keys on path; initialBody is the seed, not a live binding.
  }, [])

  useEffect(() => {
    const view = viewRef.current
    if (!view || readOnly === lastReadOnly.current) {
      lastReadOnly.current = readOnly
      return
    }
    lastReadOnly.current = readOnly
    view.dispatch({
      effects: readOnlyGate.current.reconfigure(EditorState.readOnly.of(readOnly)),
    })
    // The press that flips this already seated a caret, and `focus()` would write the state's selection back over it.
    if (!readOnly && autoFocus && !view.hasFocus) view.focus()
  }, [readOnly, autoFocus])

  useEffect(() => {
    const shell = shellRef.current
    const header = shell?.firstElementChild
    if (!shell || !header || header === editorRef.current) return
    const apply = (): void =>
      shell.style.setProperty('--header-zone', `${(header as HTMLElement).offsetHeight}px`)
    apply()
    const ro = new ResizeObserver(apply)
    ro.observe(header)
    return () => ro.disconnect()
  }, [])

  return (
    <div
      ref={shellRef}
      className="mdpm-shell"
      style={{ '--editor-font-size': `${zoomFontSize(scale)}px` } as React.CSSProperties}
    >
      {header}
      <div ref={editorRef} className="mdpm-editor" />
      <AutocompletePane ac={ac} candidates={candidates} index={acIndex} onPick={commit} />
    </div>
  )
}
