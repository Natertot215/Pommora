import { useEffect, useRef, type ReactNode } from 'react'
import { docHeadingKeys, docOutline, docScan, docString } from './docCache'
import { inCodeAt } from './Engine/docScan'
import { travelToHeading } from './travel'
import { headingParts } from './Engine/detect'
import { linkAt, normalizeTitle } from '@pommora/core/Connections/connections'
import { rewriteHeadingConnections } from '@pommora/core/Connections/rewrite'
import { changesTo } from '../Pages/merge3'
import { headingTargetOf, type HeadingTarget } from './Autocomplete/headingTarget'
import { EditorView, keymap } from '@codemirror/view'
import { Compartment, EditorState, Prec } from '@codemirror/state'
import { history, historyField, historyKeymap, defaultKeymap } from '@codemirror/commands'
import { markdown } from '@codemirror/lang-markdown'
import { EDITOR_SCALE_DEFAULT, coerceScale } from '@pommora/core/Settings/personalization'
import { markdownDecorations } from './decorations'
import { markdownInput } from './Input/markdownInput'
import { tableWidgetExtension, applySavedHeadingCols } from './Tables/widget'
import { listDragExtension } from './Gestures/listDrag'
import { listRenumberOnDelete } from './Input/listRenumber'
import { blockHandles, blockGripHover } from './Menus/blockHandles'
import {
  blockDragExtension,
  blockquoteDragExtension,
  calloutDragExtension,
} from './Gestures/blockDrag'
import { gripMenu } from './Menus/gripMenu'
import {
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
import { type PageStats, selectionStats } from './Engine/subfieldStats'
import { customCaret } from './caret'
import { customSelection } from './selection'
import { codeHighlight, codeLanguages } from './codeHighlight'
import { registerScrollHeal } from './Embeds/scrollHeal'
import { calloutAtomic } from './Guards/calloutAtomic'
import { calloutGuard } from './Guards/calloutGuard'
import { headingRenamed, headingRenameGuard, headingRenameOf } from './Guards/headingRenameGuard'
import { citationGuard } from './Guards/citationGuard'
import { citationHost, citationOrder, citationSeatAt } from './Citations/citationActions'
import { citationPointer, citationRowMenu, citationRowPointer } from './Citations/citationPointer'
import { connectionClicks } from './Links/connectionClicks'
import { markdownLinkClicks } from './Links/linkClicks'
import { pasteLink } from './Links/pasteLink'
import { pendingTitle } from './Links/pendingTitle'
import { aliasOnLeave } from './Links/linkEdit'
import { linkRest, linkTyping } from './Gestures/linkGestures'
import { markdownFolding, applySavedFolds, applyCitationsVisibility } from './folding'
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
import { BlockMenu } from './Menus/BlockMenu'
import { detectBlockQuery, useBlockMenu } from './Menus/useBlockMenu'
import type { ConnectionsApi } from './Links/connectionsApi'
import type { WarmSeam } from './warmSeam'
import { type EditorHost, type EditorPref, editorHost } from './api'
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
  embedHeights?: EditorPref<Record<string, number>>
  embedZooms?: EditorPref<Record<string, number>>
  folds?: EditorPref<string[]>
  tableHeadingColumns?: EditorPref<number[]>
  autoFocus?: boolean
  readOnly?: boolean
  edgeFade?: boolean
  warm?: WarmSeam
  active?: boolean
  register?: (view: EditorView | null) => void
  /** The focused main range's figures, or null while the caret is collapsed or the surface is unfocused. */
  onSelection?: (stats: PageStats | null) => void
  /** A heading to travel to once folds settle, or on a later value while the editor stays mounted. */
  arrive?: string
  onArrived?: () => void
  onHeadingRename?: (old: string, next: string) => void
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
  onSelection,
  active = true,
  arrive,
  onArrived,
  onHeadingRename,
}: Props): React.JSX.Element {
  const readOnlyGate = useRef(new Compartment())
  const lastReadOnly = useRef(readOnly)
  const formatGate = useRef(new Compartment())
  const lastCommands = useRef(host.settings().commands)
  const editorRef = useRef<HTMLDivElement>(null)
  const shellRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<EditorView | null>(null)
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange
  const onSelectionRef = useRef(onSelection)
  onSelectionRef.current = onSelection
  const lastRangeRef = useRef<{ from: number; to: number } | null>(null)
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
  const arriveRef = useRef(arrive)
  arriveRef.current = arrive
  const onArrivedRef = useRef(onArrived)
  onArrivedRef.current = onArrived
  const onHeadingRenameRef = useRef(onHeadingRename)
  onHeadingRenameRef.current = onHeadingRename
  const pendingRenameRef = useRef<{ old: string; line: number; trail: Set<string> } | null>(null)
  const lastFormatRef = useRef<FormatState | null>(null)
  // The position of a typed `§` that opens the heading list in prose; cleared once the caret leaves its line or the pane closes.
  const sectionArmedRef = useRef<number | null>(null)

  // Decorations rebuild only on editor updates, so a real tree change dispatches an empty transaction.
  useEffect(() => {
    if (connections) viewRef.current?.dispatch({ effects: resolutionNudge.of(null) })
  }, [connections])

  const cbLineCount = host.settings().codeblockLineCount
  useEffect(() => {
    viewRef.current?.requestMeasure()
  }, [cbLineCount])

  const { headingLinkStyle, inPageHeadingResolution } = host.settings()
  useEffect(() => {
    viewRef.current?.dispatch({ effects: resolutionNudge.of(null) })
  }, [headingLinkStyle, inPageHeadingResolution])

  useEffect(() => {
    const view = viewRef.current
    if (view) rerenderWebTiles(view)
  }, [active])

  // The mount-time travel already consumed the first value; a later one arrives while the editor stays mounted.
  const firstArrive = useRef(true)
  useEffect(() => {
    if (firstArrive.current) {
      firstArrive.current = false
      return
    }
    const view = viewRef.current
    if (!view || !arrive) return
    travelToHeading(view, arrive)
    onArrived?.()
  }, [arrive])

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

  const targetOf = (title: string): HeadingTarget =>
    title
      ? headingTargetOf(hostRef.current, connectionsRef.current, title)
      : { outline: viewRef.current ? docOutline(viewRef.current.state.doc) : [] }

  const {
    ac,
    setAc,
    candidates,
    acIndex,
    commit,
    acCtl,
    viaChevron,
    loading,
    headingRows,
    collapsed,
    toggleHeading,
  } = useConnectionAutocomplete(
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
    targetOf,
  )
  const block = useBlockMenu(viewRef)

  // The pane closing (Escape, a commit, a blur) leaves the § bare rather than arming the next keystroke near it.
  const acFormRef = useRef<string | null>(null)
  useEffect(() => {
    if (ac?.form !== 'section' && acFormRef.current === 'section') sectionArmedRef.current = null
    acFormRef.current = ac?.form ?? null
  }, [ac])

  useEffect(() => {
    const acCtls = [acCtl, block.ctl]
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
          { key: 'ArrowDown', run: whenAcOpen(acCtls, (c) => c.move(1)) },
          { key: 'ArrowUp', run: whenAcOpen(acCtls, (c) => c.move(-1)) },
          { key: 'Enter', run: whenAcOpen(acCtls, (c) => c.pick()) },
          { key: 'Escape', run: whenAcOpen(acCtls, (c) => c.close()) },
          { key: 'ArrowRight', run: whenAcOpen(acCtls, (c) => c.aside?.(1) ?? false) },
          { key: 'ArrowLeft', run: whenAcOpen(acCtls, (c) => c.aside?.(-1) ?? false) },
        ]),
      ),
      markdownInput,
      formatGate.current.of(formatKeymap(lastCommands.current)),
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
      headingRenameGuard,
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
          block.setState(null)
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

        // Measured here off the live doc, and only where the range moved: the host's copy of the body trails the keystroke, and a slice of it would describe the text from before.
        if (onSelectionRef.current) {
          const main = u.state.selection.main
          const range = u.view.hasFocus && !main.empty ? { from: main.from, to: main.to } : null
          const last = lastRangeRef.current
          if (u.docChanged || range?.from !== last?.from || range?.to !== last?.to) {
            lastRangeRef.current = range
            onSelectionRef.current(
              range ? selectionStats(u.state.sliceDoc(range.from, range.to)) : null,
            )
          }
        }

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

        const lineNo = u.state.doc.lineAt(u.state.selection.main.head).number
        for (const tr of u.transactions) {
          if (
            tr.isUserEvent('input.type') &&
            hostRef.current.settings().inPageHeadingResolution === 'automatic'
          ) {
            let at: number | null = null
            let seen = 0
            tr.changes.iterChangedRanges((fromA, toA, fromB, toB) => {
              seen++
              if (fromA === toA && toB - fromB === 1 && tr.newDoc.sliceString(fromB, toB) === '§')
                at = fromB
            })
            if (seen === 1 && at !== null) {
              const line = tr.newDoc.lineAt(at)
              const rel = at - line.from
              if (!linkAt(line.text, rel) && !inCodeAt(docScan(tr.newDoc), at))
                sectionArmedRef.current = at
            }
          }
          const renames = tr.effects.filter((e) => e.is(headingRenamed)).map((e) => e.value)
          // Undo and redo bypass transaction filters, so the guard never stamps them; the rename is read off the transaction itself.
          if (renames.length === 0 && (tr.isUserEvent('undo') || tr.isUserEvent('redo'))) {
            const rename = headingRenameOf(tr)
            if (rename) renames.push(rename)
          }
          for (const rename of renames) {
            const held = pendingRenameRef.current ?? {
              old: rename.old,
              line: rename.line,
              trail: new Set<string>(),
            }
            held.trail.add(rename.old).add(rename.next)
            pendingRenameRef.current = held
          }
        }
        const held = pendingRenameRef.current
        if (held && (held.line !== lineNo || (u.focusChanged && !u.view.hasFocus))) {
          pendingRenameRef.current = null
          const text = held.line <= u.state.doc.lines ? u.state.doc.line(held.line).text : ''
          const final = headingParts(text)?.content.trim() ?? ''
          const own = hostRef.current.pageTitle() ?? ''
          if (
            final &&
            final !== held.old &&
            !docHeadingKeys(u.state.doc).includes(normalizeTitle(held.old))
          ) {
            let body = doc
            for (const stale of held.trail)
              if (stale && stale !== final)
                body = rewriteHeadingConnections(body, own, stale, final, own)
            // Deferred as the alias slot's own leave dispatch defers: a dispatch inside an update listener re-enters the view.
            if (body !== doc)
              setTimeout(
                () => u.view.dispatch({ changes: changesTo(doc, body), userEvent: 'input' }),
                0,
              )
            onHeadingRenameRef.current?.(held.old, final)
          }
        }

        const armed = sectionArmedRef.current
        if (
          armed !== null &&
          (armed > u.state.doc.length || u.state.doc.lineAt(armed).number !== lineNo)
        )
          sectionArmedRef.current = null

        // A click seating the caret inside a rendered [[Title]] would otherwise pop the picker over a surface that can't accept an edit.
        if ((u.docChanged || u.selectionSet) && !u.state.readOnly) {
          detectConnectionQuery(u.view, setAc, true, sectionArmedRef.current ?? undefined)
          detectBlockQuery(u.view, block.setState, u.docChanged)
        }
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
    const land = (): void => {
      restoreScroll()
      const a = arriveRef.current
      if (a) {
        travelToHeading(view, a, 0)
        onArrivedRef.current?.()
      }
    }
    const foldsLoad = foldsRef.current?.load()
    const heightsLoad = embedHeightsRef.current?.load()
    const zoomsLoad = embedZoomsRef.current?.load()
    const colsLoad = tableHeadingColsRef.current?.load()
    if (foldsLoad || heightsLoad || zoomsLoad || colsLoad)
      void Promise.allSettled([foldsLoad, heightsLoad, zoomsLoad, colsLoad]).then(
        ([keys, h, z, cols]) => {
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
          if (cols.status === 'fulfilled' && cols.value) applySavedHeadingCols(view, cols.value)
          land()
        },
      )
    else requestAnimationFrame(land)
    const unsubMenu = hostRef.current.menus.format?.onAction((action) => {
      if (ownsEditorMenu(view)) applyEditorAction(view, action)
    })
    return () => {
      unsubMenu?.()
      releaseEditorMenu(view)
      if (lastRangeRef.current) {
        lastRangeRef.current = null
        onSelectionRef.current?.(null)
      }
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
  }, [])

  const commands = host.settings().commands
  useEffect(() => {
    const view = viewRef.current
    if (!view || commands === lastCommands.current) {
      lastCommands.current = commands
      return
    }
    lastCommands.current = commands
    view.dispatch({ effects: formatGate.current.reconfigure(formatKeymap(commands)) })
  }, [commands])

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
      <AutocompletePane
        ac={ac}
        candidates={candidates}
        index={acIndex}
        onPick={commit}
        viaChevron={viaChevron}
        loading={loading}
        headingRows={headingRows}
        collapsed={collapsed}
        onToggleHeading={toggleHeading}
        onAside={(row) => commit(row, { openHeading: true })}
        onBack={() => {
          acCtl.current.aside?.(-1)
        }}
      />
      <BlockMenu
        open={block.open}
        state={block.state}
        matches={block.matches}
        selected={block.selected}
        onPick={block.pick}
      />
    </div>
  )
}
