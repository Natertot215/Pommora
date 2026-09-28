import { useEffect, useRef, type ReactNode } from 'react'
import { docScan, docString } from './docCache'
import { travelToHeading } from './travel'
import { EditorView, keymap } from '@codemirror/view'
import { Compartment, EditorState, Prec } from '@codemirror/state'
import { history, historyField, historyKeymap } from '@codemirror/commands'
import { markdown } from '@codemirror/lang-markdown'
import { markdownInput } from './Input/markdownInput'
import { tableWidgetExtension, applySavedHeadingCols } from './Tables/widget'
import {
  embedField,
  embedTiles,
  refreshTileZooms,
  rerenderWebTiles,
  setEmbedHeights,
  setEmbedZooms,
} from './Embeds/embedWidget'
import { type PageStats, rangeStats } from './Engine/subfieldStats'
import { codeHighlight, codeLanguages } from './codeHighlight'
import { registerScrollHeal } from './Embeds/scrollHeal'
import { calloutGuard } from './Guards/calloutGuard'
import { embedGuard } from './Guards/embedGuard'
import { headingRenameSettle } from './Guards/headingRenameSettle'
import { citationGuard } from './Guards/citationGuard'
import { citationHost, citationOrder } from './Citations/citationActions'
import { citationRowMenu, citationRowPointer } from './Citations/citationPointer'
import { markdownFolding, applySavedFolds, applyCitationsVisibility } from './folding'
import { useReconfigured } from './Input/useReconfigured'
import { htmlShortcuts, htmlTags } from './Input/htmlShortcuts'
import { editorKeymap, formatKeymap } from './Input/formatKeymap'
import { inlineSurface } from './surface'
import {
  useConnectionAutocomplete,
  detectConnectionQuery,
  sectionArmAfter,
} from './Autocomplete/useConnectionAutocomplete'
import { paneKeys, whenPaneOpen } from './Menus/caretPane'
import { AutocompletePane } from './Autocomplete/AutocompletePane'
import { BlockMenu } from './Menus/BlockMenu'
import { useBlockMenu } from './Menus/useBlockMenu'
import type { ConnectionsApi } from './Links/connectionsApi'
import type { WarmSeam } from './warmSeam'
import { type EditorHost, editorHost, mirrorBody, mirrored, resolutionNudge } from './api'
import { useLatest } from '@pommora/uix/Utilities/stableApi'
import './markdown-pm.css'

interface Props {
  initialBody: string
  onChange: (body: string) => void
  host: EditorHost
  header?: ReactNode
  connections?: ConnectionsApi
  embedAncestors?: readonly string[]
  autoFocus?: boolean
  readOnly?: boolean
  edgeFade?: boolean
  warm?: WarmSeam
  active?: boolean
  register?: (view: EditorView | null) => void
  /** The focused main range's figures, or null while the caret is collapsed or the surface is unfocused. */
  onSelection?: (stats: PageStats | null) => void
  /** A later value replaces the document in place while the editor stays mounted — another mount's typing, mirrored into a read-only surface. */
  body?: string
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
  connections,
  embedAncestors,
  autoFocus = false,
  readOnly = false,
  edgeFade = false,
  warm,
  register,
  onSelection,
  active = true,
  body,
  arrive,
  onArrived,
  onHeadingRename,
}: Props): React.JSX.Element {
  const readOnlyGate = useRef(new Compartment())
  const lastReadOnly = useRef(readOnly)
  const editorRef = useRef<HTMLDivElement>(null)
  const shellRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<EditorView | null>(null)
  const onChangeRef = useLatest(onChange)
  const onSelectionRef = useLatest(onSelection)
  const lastRangeRef = useRef<{ from: number; to: number } | null>(null)
  const hostRef = useLatest(host)
  const connectionsRef = useLatest(connections)
  const embedAncestorsRef = useLatest<readonly string[]>(embedAncestors ?? [])
  const activeRef = useLatest(active)
  const registerRef = useLatest(register)
  const arriveRef = useLatest(arrive)
  const onArrivedRef = useLatest(onArrived)
  const onHeadingRenameRef = useLatest(onHeadingRename)
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

  useEffect(() => {
    const view = viewRef.current
    if (view && body !== undefined) mirrorBody(view, body)
  }, [body])

  useEffect(() => {
    const view = viewRef.current
    if (!view || !arrive) return
    travelToHeading(view, arrive)
    onArrived?.()
  }, [arrive])

  const citesShown = host.citations.shown()
  const citesShownRef = useLatest(citesShown)
  // The first change this effect carries is the nexus-wide seed settling in, not a user toggle.
  const followed = useRef(false)
  useEffect(() => {
    const view = viewRef.current
    if (!view) return
    applyCitationsVisibility(view, citesShown, followed.current)
    followed.current = true
  }, [citesShown])

  const { setAc, acCtl, pane } = useConnectionAutocomplete(
    viewRef,
    host,
    () => connectionsRef.current,
  )
  const formatExt = useReconfigured(viewRef, host.settings().commands, formatKeymap)
  const htmlExt = useReconfigured(viewRef, host.settings().htmlShortcuts, htmlShortcuts)
  const block = useBlockMenu(viewRef)

  // The pane closing (Escape, a commit, a blur) leaves the § bare rather than arming the next keystroke near it.
  const acFormRef = useRef<string | null>(null)
  useEffect(() => {
    if (pane.ac?.form !== 'section' && acFormRef.current === 'section')
      sectionArmedRef.current = null
    acFormRef.current = pane.ac?.form ?? null
  }, [pane.ac])

  useEffect(() => {
    const paneCtls = [acCtl, block.ctl]
    const parent = editorRef.current
    if (!parent) return
    const prefs = hostRef.current.prefs
    const extensions = [
      editorHost.of(hostRef.current),
      // Editable stays true even read-only: selection renders natively, so the at-rest embed must stay focusable.
      EditorView.editable.of(true),
      readOnlyGate.current.of(EditorState.readOnly.of(lastReadOnly.current)),
      // EditorState.readOnly is ADVISORY — it stops the view's input pipeline but not a programmatic dispatch; a mirrored body and the heading-rename settle's link rewrite skip filters and pass.
      EditorState.changeFilter.of((tr) => !(tr.startState.readOnly && tr.docChanged)),
      history(),
      Prec.highest(
        keymap.of([
          ...paneKeys(paneCtls),
          { key: 'Enter', run: whenPaneOpen(paneCtls, (c) => c.pick()) },
        ]),
      ),
      markdownInput,
      // Ahead of the default keymap, which also binds Mod-i and Mod-[.
      formatExt,
      htmlExt,
      keymap.of([...editorKeymap, ...historyKeymap]),
      markdown({
        addKeymap: false,
        pasteURLAsLink: false,
        completeHTMLTags: false,
        htmlTagLanguage: htmlTags,
        codeLanguages,
      }),
      codeHighlight,
      inlineSurface(() => connectionsRef.current, 'page'),
      citationRowPointer(),
      citationRowMenu(),
      tableWidgetExtension(() => connectionsRef.current),
      embedTiles({
        getConn: () => connectionsRef.current,
        ancestors: embedAncestorsRef.current,
        tabActive: () => activeRef.current,
      }),
      embedGuard,
      calloutGuard,
      headingRenameSettle.of(() => onHeadingRenameRef.current),
      citationGuard,
      citationHost.of({
        shown: () => citesShownRef.current,
        reveal: () => hostRef.current.citations.set(true),
      }),
      citationOrder,
      block.extension,
      EditorView.domEventHandlers({
        blur: () => {
          setAc(null)
          block.close()
          return false
        },
      }),
      markdownFolding(() => {
        const { citations } = hostRef.current
        citations.set(!citations.shown())
      }),
      EditorView.updateListener.of((u) => {
        if (!(u.docChanged || u.selectionSet || u.focusChanged)) return
        const doc = docString(u.state.doc)
        if (u.transactions.some((tr) => tr.docChanged && !tr.annotation(mirrored)))
          onChangeRef.current(doc)

        // Measured here off the live doc, and only where the range moved: the host's copy of the body trails the keystroke, and a slice of it would describe the text from before.
        if (onSelectionRef.current) {
          const main = u.state.selection.main
          const range = u.view.hasFocus && !main.empty ? { from: main.from, to: main.to } : null
          const last = lastRangeRef.current
          if ((u.docChanged && range) || range?.from !== last?.from || range?.to !== last?.to) {
            lastRangeRef.current = range
            onSelectionRef.current(
              range ? rangeStats(docScan(u.state.doc), range.from, range.to) : null,
            )
          }
        }

        sectionArmedRef.current = sectionArmAfter(u, sectionArmedRef.current)
        // A click seating the caret inside a rendered [[Title]] would otherwise pop the picker over a surface that can't accept an edit.
        if ((u.docChanged || u.selectionSet) && !u.state.readOnly) {
          detectConnectionQuery(u.view, setAc, true, sectionArmedRef.current ?? undefined)
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
    if (edgeFade) view.scrollDOM.classList.add('scroll-fade', 'scroll-fade-gated')
    if (autoFocus && !lastReadOnly.current) view.focus()
    applyCitationsVisibility(view, citesShownRef.current, false)
    // The warm scroll restores AFTER folds settle: folding changes content height, so restoring first lands on a pre-fold offset.
    const land = (): void => {
      // != null, not truthy — a saved top-of-page (0) must still override CM's own restore scroll.
      if (saved?.scrollTop != null) view.scrollDOM.scrollTop = saved.scrollTop
      const a = arriveRef.current
      if (a) {
        travelToHeading(view, a, saved?.scrollTop != null ? undefined : 0)
        onArrivedRef.current?.()
      }
    }
    if (prefs)
      void prefs.load().then((p) => {
        if (p) {
          const { folds, embedHeights, embedZooms, headingCols } = p
          applySavedFolds(view, folds)
          if (Object.keys(embedHeights).length > 0)
            view.dispatch({
              effects: setEmbedHeights.of({
                ...embedHeights,
                ...view.state.field(embedField).heights,
              }),
            })
          if (Object.keys(embedZooms).length > 0) {
            view.dispatch({
              effects: setEmbedZooms.of({ ...embedZooms, ...view.state.field(embedField).zooms }),
            })
            refreshTileZooms(view, false)
          }
          applySavedHeadingCols(view, headingCols)
        }
        land()
      })
    else requestAnimationFrame(land)
    return () => {
      view.plugin(headingRenameSettle)?.flush()
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
    <div ref={shellRef} className="mdpm-shell">
      {header}
      <div ref={editorRef} className="mdpm-editor interface-inset" />
      <AutocompletePane {...pane} />
      <BlockMenu state={block.state} selected={block.selected} onPick={block.pick} />
    </div>
  )
}
