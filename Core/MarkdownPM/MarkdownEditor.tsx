import { useEffect, useRef, useState, type ReactNode } from 'react'
import { docScan, docString } from './docCache'
import { travelToHeading } from './travel'
import { EditorView, keymap, placeholder } from '@codemirror/view'
import { Compartment, EditorState } from '@codemirror/state'
import { history, historyField, historyKeymap } from '@codemirror/commands'
import { markdown } from '@codemirror/lang-markdown'
import { markdownInput } from './Input/markdownInput'
import { tableWidgetExtension, applySavedHeadingCols } from './Tables/widget'
import { applySavedEmbeds, embedTiles, rerenderWebTiles } from './Embeds/embedWidget'
import { type PageStats, rangeStats } from './Engine/subfieldStats'
import { codeHighlight, pageCode } from './codeHighlight'
import { codeScroll, codeScrolls } from './codeScroll'
import { registerScrollHeal } from './Embeds/scrollHeal'
import { calloutGuard } from './Guards/calloutGuard'
import { embedGuard } from './Guards/embedGuard'
import { headingRenameSettle } from './Guards/headingRenameSettle'
import { citationGuard } from './Guards/citationGuard'
import { citationOrder } from './Citations/citationActions'
import { citationRowMenu, citationRowPointer } from './Citations/citationPointer'
import { markdownFolding, applySavedFolds, applyCitationsVisibility } from './folding'
import { useReconfigured } from './Input/useReconfigured'
import { htmlShortcuts, htmlTags } from './Input/htmlShortcuts'
import { formatKeymap } from './Input/formatKeymap'
import { editorBase } from './surface'
import { useConnectionAutocomplete } from './Autocomplete/useConnectionAutocomplete'
import { AutocompletePane } from './Autocomplete/AutocompletePane'
import { BlockMenuPane } from './Menus/BlockMenuPane'
import { useBlockMenu } from './Menus/useBlockMenu'
import type { ConnectionsApi } from './Links/connectionsApi'
import type { WarmSeam } from './warmSeam'
import { type EditorHost, mirrored, redrawNudge } from './api'
import { useLatest } from '@pommora/uix/Utilities/stableApi'
import { Scrollbar } from '@pommora/uix/Interactions/Scrollbar'
import './markdown-pm.css'
import './highlights.css'

export const EMPTY_PAGE_TEXT = 'Click to type or press / for actions'

const WARM_FIELDS = { history: historyField, codeScroll: codeScrolls }

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
  arrive,
  onArrived,
  onHeadingRename,
}: Props): React.JSX.Element {
  const readOnlyGate = useRef(new Compartment())
  const lastReadOnly = useRef(readOnly)
  const editorRef = useRef<HTMLDivElement>(null)
  const shellRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<EditorView | null>(null)
  const [scroller, setScroller] = useState<HTMLElement | null>(null)
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

  const settings = host.settings()
  // Decorations rebuild only on editor updates, so a real tree or settings change dispatches an empty transaction.
  useEffect(() => {
    viewRef.current?.dispatch({ effects: redrawNudge.of(null) })
  }, [connections, settings])

  useEffect(() => {
    viewRef.current?.requestMeasure()
  }, [settings.codeblockLineCount])

  useEffect(() => {
    const view = viewRef.current
    if (view) rerenderWebTiles(view)
  }, [active])

  useEffect(() => {
    const view = viewRef.current
    if (!view || !arrive) return
    travelToHeading(view, arrive)
    onArrived?.()
  }, [arrive])

  const citesShown = host.citations.shown()
  useEffect(() => {
    const view = viewRef.current
    if (view) applyCitationsVisibility(view, citesShown)
  }, [citesShown])

  const ac = useConnectionAutocomplete(viewRef, host, () => connectionsRef.current, 'page')
  const formatExt = useReconfigured(viewRef, settings.commands, formatKeymap)
  const htmlExt = useReconfigured(viewRef, settings.htmlShortcuts, htmlShortcuts)
  const block = useBlockMenu(viewRef)

  useEffect(() => {
    const parent = editorRef.current
    if (!parent) return
    const prefs = hostRef.current.prefs
    const extensions = [
      readOnlyGate.current.of(EditorState.readOnly.of(lastReadOnly.current)),
      // EditorState.readOnly is ADVISORY — it stops the view's input pipeline but not a programmatic dispatch; a mirrored body and the heading-rename settle's link rewrite skip filters and pass.
      EditorState.changeFilter.of((tr) => !(tr.startState.readOnly && tr.docChanged)),
      history(),
      placeholder(EMPTY_PAGE_TEXT),
      markdownInput,
      markdown({
        addKeymap: false,
        pasteURLAsLink: false,
        completeHTMLTags: false,
        htmlTagLanguage: htmlTags,
        extensions: pageCode,
      }),
      codeHighlight,
      codeScroll,
      editorBase({
        host: hostRef.current,
        getConn: () => connectionsRef.current,
        scope: 'page',
        panes: [ac, block],
        formatExt,
      }),
      htmlExt,
      keymap.of(historyKeymap),
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
      citationOrder,
      markdownFolding(),
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
      }),
    ]
    const saved = warm?.restore()
    let warmState: EditorState | null = null
    if (saved?.editorState !== undefined) {
      try {
        warmState = EditorState.fromJSON(saved.editorState, { extensions }, WARM_FIELDS)
      } catch {
        warmState = null
      }
    }
    const view = new EditorView(
      warmState ? { state: warmState, parent } : { doc: initialBody, parent, extensions },
    )
    viewRef.current = view
    setScroller(view.scrollDOM)
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
    applyCitationsVisibility(view, citesShown, false)
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
          applySavedEmbeds(view, embedHeights, embedZooms)
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
          editorState: view.state.toJSON(WARM_FIELDS),
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
      <Scrollbar of={scroller} page timeline="--mdpm-scroll" />
      <AutocompletePane {...ac.pane} />
      <BlockMenuPane
        state={block.state}
        selected={block.selected}
        onPick={block.pick}
        geometry={host.paneGeometry?.('block-menu')}
      />
    </div>
  )
}
