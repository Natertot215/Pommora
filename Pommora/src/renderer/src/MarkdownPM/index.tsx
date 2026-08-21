import { useEffect, useRef } from 'react'
import { docString } from './editor/docCache'
import { EditorView, keymap } from '@codemirror/view'
import { Compartment, EditorState, Prec } from '@codemirror/state'
import { history, historyField, historyKeymap, defaultKeymap } from '@codemirror/commands'
import { markdown } from '@codemirror/lang-markdown'
import { markdownDecorations } from './editor/decorations'
import { markdownInput } from './editor/input'
import { tableWidgetExtension, applySavedHeadingCols, type TableHeadingColsApi } from './Tables'
import { listDragExtension } from './editor/listDrag'
import { blockHandles, blockGripHover } from './editor/blockHandles'
import {
  blockDragExtension,
  blockquoteDragExtension,
  calloutDragExtension,
} from './editor/blockDrag'
import { HOT_MENU_LINES, gripMenu } from './editor/gripMenu'
import {
  type EmbedHeightsApi,
  embedExclusions,
  embedField,
  embedTiles,
  refreshTileZooms,
  resolutionNudge,
  setEmbedHeights,
  setEmbedZooms,
} from './editor/embedWidget'
import { embeddable } from './editor/embedRanges'
import { customCaret } from './editor/caret'
import { codeHighlight, codeLanguages } from './editor/codeHighlight'
import { registerScrollHeal } from '../Embeds/tileWarm'
import { calloutAtomic } from './editor/calloutAtomic'
import { calloutGuard } from './editor/calloutGuard'
import { citationGuard } from './editor/citationGuard'
import { citationPointer } from './editor/citationPointer'
import { connectionClicks } from './editor/connections'
import { markdownLinkClicks } from './editor/links'
import { pasteLink } from './editor/PasteLink'
import { pendingTitle } from './editor/PendingTitle'
import { aliasOnLeave } from './editor/linkEdit'
import { linkRest, linkTyping } from './editor/linkGestures'
import {
  markdownFolding,
  applySavedFolds,
  applyCitationsVisibility,
  type FoldsApi,
} from './editor/folding'
import {
  applyEditorAction,
  claimEditorMenu,
  ownsEditorMenu,
  releaseEditorMenu,
  type EditorMenuApi,
} from './editor/menu'
import { formatKeymap } from './editor/formatKeymap'
import { embedSeatAt } from './editor/embedInsert'
import { readFormatState } from './editor/formatState'
import type { FormatState } from '@shared/editorMenu'
import { AC_MAX, aliasRows, pageRow } from './autocomplete'
import {
  useConnectionAutocomplete,
  detectConnectionQuery,
  whenAcOpen,
} from './useConnectionAutocomplete'
import { AutocompletePanel } from './AutocompletePanel'
import { useSession } from '../store'
import type { ConnectionsApi } from './connections'
import { PageHeader } from './PageHeader'
import { ZOOM_DEFAULT, zoomFontSize } from './zoom'
import type { WarmSeam } from './warmSeam'
import './Styles.css'

interface Props {
  initialBody: string
  onChange: (body: string) => void
  title?: string
  // biome-ignore lint/suspicious/noConfusingVoidType: the union is deliberate: a caller may hand back nothing or a promise, and `undefined` in place of `void` breaks assignability for the sync handlers.
  onRename?: (newName: string) => void | Promise<boolean>
  path?: string
  cover?: string
  onEditIcon?: () => void
  /** The page's glyph and whether its header draws it — chrome, so the host owns the flag. */
  icon?: string
  iconHidden?: boolean
  onToggleIcon?: () => void
  zoom?: number
  connections?: ConnectionsApi
  /** The embed-host chain above this editor — feeds the tile facet (cycle guard + nesting depth). */
  embedAncestors?: readonly string[]
  /** Per-machine tile heights for this page; absent (preview, blocks) hides the resize handle. */
  embedHeights?: EmbedHeightsApi
  embedZooms?: EmbedHeightsApi
  folds?: FoldsApi
  /** Whether this page shows its footnotes section. Absent takes the nexus-wide default, which is
   *  what an embed, a preview and a hover card all read — the per-page override is the main pane's. */
  citationsShown?: boolean
  /** The divider's press. Absent leaves the section's disclosure to its host's own control. */
  onCitationsToggle?: () => void
  /** A jump arriving at a hidden section. The host writes the page's visibility rather than the
   *  editor folding behind its back, so the footer's control still reads the section's true state.
   *  Absent leaves the travel's own reveal to carry it, which is right for an embed or a preview. */
  onCitationsReveal?: () => void
  tableHeadingColumns?: TableHeadingColsApi
  menu?: EditorMenuApi
  autoFocus?: boolean
  readOnly?: boolean
  edgeFade?: boolean
  /** Warm-tab state seam — page editors only; embeds/blocks mount cold. */
  warm?: WarmSeam
  /** Handle registration for hosts that reach into this editor programmatically (the page
   *  surface's outline seam): the live view at mount, null at teardown. */
  register?: (view: EditorView | null) => void
}

export function MarkdownEditor({
  initialBody,
  onChange,
  title,
  onRename,
  path,
  cover,
  onEditIcon,
  icon,
  iconHidden,
  onToggleIcon,
  zoom = ZOOM_DEFAULT,
  connections,
  embedAncestors,
  embedHeights,
  embedZooms,
  folds,
  citationsShown,
  onCitationsToggle,
  onCitationsReveal,
  tableHeadingColumns,
  menu,
  autoFocus = false,
  readOnly = false,
  edgeFade = false,
  warm,
  register,
}: Props): React.JSX.Element {
  const readOnlyGate = useRef(new Compartment())
  /** The readOnly value last applied to the editor — read at mount to seed the compartment, and
   *  compared on every change to tell a real flip from a re-render. */
  const lastReadOnly = useRef(readOnly)
  const host = useRef<HTMLDivElement>(null)
  const shellRef = useRef<HTMLDivElement>(null)
  const titleRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<EditorView | null>(null)
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange
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
  const menuRef = useRef(menu)
  menuRef.current = menu
  const registerRef = useRef(register)
  registerRef.current = register
  const lastFormatRef = useRef<FormatState | null>(null)

  // The restyle nudge: connection colors and embed tiles resolve against the live page index, but
  // decorations rebuild only on editor updates — a tree change (rename, delete, restore) would
  // otherwise wait for the next caret move. One empty transaction per index identity re-renders
  // both layers; identity changes only on a REAL tree change (echo pushes keep object identity).
  useEffect(() => {
    if (connections) viewRef.current?.dispatch({ effects: resolutionNudge.of(null) })
  }, [connections])

  // The line-count flip rewraps every code line from CSS alone — CM never hears it, and a stale
  // height map mis-seats clicks on wrapped lines. Re-measure on the knob.
  const cbLineCount = useSession((s) => s.personalization.codeblockLineCount)
  useEffect(() => {
    viewRef.current?.requestMeasure()
  }, [cbLineCount])

  // The nexus-wide default, overridden per page where a caller resolved one. Read from the live
  // slice, so flipping the setting reaches an open page rather than waiting for the tree to echo.
  const citationsDefault = useSession((s) => s.personalization.citationsShown ?? false)
  const citesShown = citationsShown ?? citationsDefault
  const citesShownRef = useRef(citesShown)
  citesShownRef.current = citesShown
  const citationsToggleRef = useRef(onCitationsToggle)
  citationsToggleRef.current = onCitationsToggle
  const citationsRevealRef = useRef(onCitationsReveal)
  citationsRevealRef.current = onCitationsReveal
  // Mount seeds inside the view-creation effect (this one runs first, before the view exists); this
  // carries every later change to the value.
  //
  // The first change to reach a live view is still a seed, not a toggle: the per-page overrides are
  // fetched after the tree is applied and the surface is already on screen, so a page whose own
  // answer differs from the nexus-wide default mounts on the default and hears the truth a beat
  // later. Animating that would play a collapse on a page nobody has touched.
  const followed = useRef(false)
  useEffect(() => {
    const view = viewRef.current
    if (!view) return
    applyCitationsVisibility(view, citesShown, followed.current)
    followed.current = true
  }, [citesShown])

  // CM6 extensions are built once at mount, so they read live state + actions through refs. The `[[…]]`
  // autocomplete state machine is shared with table cells; this editor's seams are the candidate source
  // (over-fetch one to drop the page's own title) and the inline panel placement (rendered below).
  const { ac, setAc, candidates, acIndex, commit, acCtl } = useConnectionAutocomplete(
    viewRef,
    (q) => {
      const conn = connectionsRef.current
      if (!conn) return []
      if (q.form === 'alias') return aliasRows(conn, q.title, q.query)
      let pool = conn.candidates(q.query, AC_MAX * 2).filter((p) => p.title !== title)
      if (q.form === 'embed') {
        const state = viewRef.current?.state
        const taken = state ? embedExclusions(state) : new Set<string>()
        pool = pool.filter((p) => embeddable(p.title, taken))
      }
      return pool.slice(0, AC_MAX).map(pageRow)
    },
  )

  useEffect(() => {
    const parent = host.current
    if (!parent) return
    const extensions = [
      // Editable stays true even in the read-only portal: MarkdownPM renders selection natively (no
      // drawSelection layer), so the at-rest embed must remain a focusable contenteditable to be
      // selectable at all — never blocked by a non-editable DOM.
      EditorView.editable.of(true),
      readOnlyGate.current.of(EditorState.readOnly.of(lastReadOnly.current)),
      // EditorState.readOnly is ADVISORY — it stops the view's own input pipeline but NOT a
      // programmatic view.dispatch({changes}) (formatKeymap, the list/table/checkbox commands). With a
      // focusable read-only portal that would let Cmd+B edit + autosave a read-only surface, so drop
      // every doc-changing transaction while read-only at the one sink that catches them all.
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
      // Language/parse support ONLY — its default keymap and paste rewriting are Lezer-convention ghosts
      // this editor replaces: the keymap auto-continues constructs MarkdownPM renders as plain prose
      // (e.g. `1)` lists) whenever the custom handlers decline, and pasteURLAsLink fires only on a
      // non-empty selection, hardcodes [selection](url), and answers to none of the settings the
      // nexus-wide paste path reads — so that behavior is `pasteLink`'s, on its own terms.
      markdown({ addKeymap: false, pasteURLAsLink: false, completeHTMLTags: false, codeLanguages }),
      codeHighlight,
      EditorView.lineWrapping,
      // iOS soft-keyboard hints — no-ops on desktop; keep the on-screen keyboard from
      // auto-capitalizing and "correcting" Markdown / [[wikilinks]].
      EditorView.contentAttributes.of({
        autocapitalize: 'sentences',
        autocorrect: 'off',
        spellcheck: 'true',
        enterkeyhint: 'enter',
      }),
      markdownDecorations(() => connectionsRef.current),
      // The connections getter lets `[[…]]` render + autocomplete inside table cells.
      tableWidgetExtension(
        () => connectionsRef.current,
        (indices) => tableHeadingColsRef.current?.save(indices),
      ),
      // A claimed lone-line ![[Title]] renders as a live page tile (its own StateField — the
      // decoration ViewPlugin never reaches CM's height map).
      embedTiles({
        getConn: () => connectionsRef.current,
        ancestors: embedAncestorsRef.current,
        saveHeights: embedHeightsRef.current ? (h) => embedHeightsRef.current?.save(h) : undefined,
        saveZooms: embedZoomsRef.current ? (z) => embedZoomsRef.current?.save(z) : undefined,
      }),
      // Grab a list glyph (•, number, or checkbox) to drag-reorder the item; click toggles/places caret.
      listDragExtension,
      // Block-drag rail handles: a hover grip on each draggable block's first line (paragraph/code/quote/list).
      blockHandles,
      // Reveal each grip only while the pointer is in its gutter strip (not over the line's text); the hot-line
      // callback flags any grip or heading-chevron hover to main so the generic editor menu stands down there.
      blockGripHover((line) =>
        window.nexus?.setGripHot?.(
          !!line && HOT_MENU_LINES.some((c) => line.classList.contains(c)),
        ),
      ),
      // Press a block grip → drag the whole block → drop it at the nearest block boundary.
      blockDragExtension,
      // The callout's own gutter grip drags the whole callout box (same gesture, gated on the head line).
      calloutDragExtension,
      // The blockquote's widget grip drags the whole quote (same gesture, gated on its first line).
      blockquoteDragExtension,
      // Right-press any block grip → its native menu: Delete on every kind, Type ▸ on a list, Page
      // Source ▸ on an embed tile (the flag above suppresses the generic editor menu there).
      gripMenu,
      // Drawn caret (rounded bar in text, I-beam on empty lines, smooth fade) — native caret hidden in CSS.
      customCaret,
      // The hidden `> [!type] ` callout head is atomic — caret can't enter it, so the tag can't be corrupted.
      calloutAtomic,
      // Reject any delete that would erode a callout body line's `>` prefix in place (drop it out of the box).
      calloutGuard,
      citationGuard,
      connectionClicks(() => connectionsRef.current),
      citationPointer(
        () => connectionsRef.current,
        () => citationsRevealRef.current?.(),
      ),
      markdownLinkClicks(() => connectionsRef.current),
      pasteLink,
      pendingTitle,
      aliasOnLeave(() => connectionsRef.current),
      linkRest,
      linkTyping,
      // Close the connection panel when focus leaves the editor (sidebar click, Cmd-Tab) — the cell
      // editor has the same handler; without it the glass panel floats over unrelated UI.
      EditorView.domEventHandlers({
        blur: () => {
          setAc(null)
          return false
        },
      }),
      markdownFolding(
        (keys) => foldsRef.current?.save(keys),
        () => citationsToggleRef.current?.(),
      ),
      EditorView.updateListener.of((u) => {
        if (!(u.docChanged || u.selectionSet || u.focusChanged)) return // skip scroll/geometry-only updates
        // Focus landing here makes this editor the menu's subject, for the state it pushes and the
        // action it gets back. Parked tabs and resting embeds stay mounted and hear both.
        if (u.focusChanged && u.view.hasFocus) claimEditorMenu(u.view)
        const doc = docString(u.state.doc)
        if (u.docChanged) onChangeRef.current(doc)

        if (ownsEditorMenu(u.view)) {
          const sel = u.state.selection.main
          // FormatState is flat primitives — a field compare beats allocating a JSON string per
          // caret move just to diff it.
          const fs = readFormatState(doc, sel.from, sel.to, u.view.hasFocus, embedSeatAt(u.state))
          const last = lastFormatRef.current
          const changed =
            !last || (Object.keys(fs) as (keyof typeof fs)[]).some((k) => fs[k] !== last[k])
          if (changed) {
            lastFormatRef.current = fs
            menuRef.current?.pushState(fs)
          }
        }

        // Read-only mounts never autocomplete: a click seating the caret inside a rendered
        // [[Title]] would otherwise pop the picker over a surface that can't accept an edit —
        // a locked embed, or the hover card gazing at its own links.
        if ((u.docChanged || u.selectionSet) && !u.state.readOnly)
          detectConnectionQuery(u.view, setAc, true)
      }),
    ]
    // Warm rehydration: seed the fresh mount from the cached serialized state — doc + selection +
    // undo history (historyField is the only serialized field; folds persist separately). A corrupt
    // or cross-version payload falls back to a cold mount rather than throwing the editor away.
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
    // Track scroll continuously for the unmount capture — at cleanup time React may have already
    // detached the DOM, where reading scrollTop yields 0 and would wipe the saved position.
    let lastScrollTop = saved?.scrollTop ?? 0
    const onWarmScroll = (): void => {
      lastScrollTop = view.scrollDOM.scrollTop
    }
    // A host that re-slots this editor's DOM wipes its scroll position without a scroll event, so
    // the tracker still holds the truth — the heal registry (tileWarm) runs this self-check from
    // the host's measure phase, before paint: a zeroed scroller the tracker never saw at zero is
    // the wipe, reasserted.
    let unregisterHeal: (() => void) | null = null
    if (warm) {
      view.scrollDOM.addEventListener('scroll', onWarmScroll, { passive: true })
      unregisterHeal = registerScrollHeal(() => {
        if (view.scrollDOM.scrollTop === 0 && lastScrollTop > 0)
          view.scrollDOM.scrollTop = lastScrollTop
      })
    }
    // Embed treatment: the shared scroll-edge fade rides the CM scroller (the real scroll element), so
    // top/bottom content dissolves as it scrolls — same mask + scroll-timeline as every other faded box.
    // The top fade is gated to need a full fade-height of real scroll first (top-gated), so a
    // first line at rest — or CM's autofocus scroll offset — never blurs.
    if (edgeFade) view.scrollDOM.classList.add('edge-fade', 'top-gated')
    // Click-to-edit surfaces (block tiles) mount THIS editor in response to a click
    // that landed on the at-rest render — without a focus the caret goes nowhere.
    if (autoFocus && !lastReadOnly.current) view.focus()
    applyCitationsVisibility(view, citesShownRef.current, false)
    // Restore this page's saved folds once the view's lines exist (the widget clones them). The warm
    // scroll restores AFTER folds settle — folding changes content height, so restoring first would
    // land on a pre-fold offset.
    const restoreScroll = (): void => {
      // != null, not truthy — a saved top-of-page (0) must still override CM's own restore scroll.
      if (saved?.scrollTop != null) view.scrollDOM.scrollTop = saved.scrollTop
    }
    // Embed heights load alongside — tile heights move content by hundreds of px, so a scroll
    // restored before they land would faithfully anchor the wrong content. A height the user
    // already dragged while the load was in flight wins over the loaded value.
    const foldsLoad = foldsRef.current?.load()
    const heightsLoad = embedHeightsRef.current?.load()
    const zoomsLoad = embedZoomsRef.current?.load()
    if (foldsLoad || heightsLoad || zoomsLoad)
      // allSettled, never all — one load failing must not drop the others' results, and the scroll
      // restore runs regardless (a preference that can't be read degrades to defaults, not a hang).
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
    // The header parks on scroll via a CSS scroll-driven animation (Styles.css) — no JS scroll handler.
    const unsubMenu = menuRef.current?.onAction((action) => applyEditorAction(view, action))
    return () => {
      unsubMenu?.()
      releaseEditorMenu(view)
      if (warm) {
        unregisterHeal?.()
        view.scrollDOM.removeEventListener('scroll', onWarmScroll)
        // `warm` is the mount-render prop (deps []), so this capture lands under the identity this
        // editor mounted with — never the next tab's, even though the switch already updated the store.
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

  // The portal flip: reconfigure the read-only gate on the LIVE view — same doc, same
  // decorations, no remount (editable stays true throughout, see the mount comment). Entering
  // edit focuses when the surface asked for it.
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
    // A press inside the surface is what flips it, and that press already seated a caret — but
    // `focus()` writes the state's own selection back over whatever the DOM holds, discarding it
    // and costing a second click. Focus is taken only for an entry from outside the surface.
    if (!readOnly && autoFocus && !view.hasFocus) view.focus()
  }, [readOnly, autoFocus])

  // Body top-padding tracks the header height, so toggling the banner resizes the gutter automatically.
  useEffect(() => {
    const header = titleRef.current
    const shell = shellRef.current
    if (!header || !shell) return
    // --header-zone lives on the shell so both the body's top padding and the header's scroll-park range read it.
    const apply = (): void => shell.style.setProperty('--header-zone', `${header.offsetHeight}px`)
    apply()
    const ro = new ResizeObserver(apply)
    ro.observe(header)
    return () => ro.disconnect()
  }, [])

  return (
    <div
      ref={shellRef}
      className="mdpm-shell"
      style={{ '--editor-font-size': `${zoomFontSize(zoom)}px` } as React.CSSProperties}
    >
      {title !== undefined && path !== undefined && (
        <PageHeader
          ref={titleRef}
          page={{ path, title, cover, icon, iconHidden }}
          onRename={onRename ?? ((): void => {})}
          onToggleIcon={onToggleIcon}
          onEditIcon={onEditIcon ?? ((): void => {})}
        />
      )}
      <div ref={host} className="mdpm-editor" />
      <AutocompletePanel
        open={ac !== null}
        candidates={candidates}
        index={acIndex}
        caretX={ac?.caretX ?? 0}
        caretTop={ac?.caretTop ?? 0}
        caretBottom={ac?.caretBottom ?? 0}
        bounds={ac?.bounds}
        query={ac?.query ?? ''}
        onPick={commit}
      />
    </div>
  )
}
