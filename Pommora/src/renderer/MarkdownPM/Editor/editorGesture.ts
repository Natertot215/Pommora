// CodeMirror extensions have no unmount hook of their own, and drags run off window listeners,
// so a destroyed editor would leave a gesture running against a dead view. `editorGestureCleanup`
// is the abort for that; include it in every extension array that starts a gesture.
import type { ChangeSpec } from '@codemirror/state'
import { type EditorView, ViewPlugin } from '@codemirror/view'
import { resolveScroller, startAutoScroll } from '@renderer/Interactions/autoscroll'
import {
  beginPointerGesture,
  type GestureHandle,
  type PointerGestureSpec,
} from '@renderer/Interactions/gesture'
import { Overlay, setShade } from './dragChrome'

// Only one editor gesture is live app-wide, but the cleanup plugin is mounted in every editor
// (a page can run several — embed tile, hover card, preview window), so the handle carries the
// view that started it — otherwise a sibling's unmount would abort the drag in progress.
let live: { view: EditorView; handle: GestureHandle } | null = null

export function beginEditorGesture(view: EditorView, spec: PointerGestureSpec): boolean {
  const handle = beginPointerGesture(spec)
  if (handle) live = { view, handle }
  return handle !== null
}

export const editorGestureCleanup = ViewPlugin.define((view) => ({
  destroy: () => {
    if (live?.view !== view) return
    live.handle.abort()
    live = null // else the destroyed view is held by the module for the life of the process
  },
}))

const MIN_LINE_WIDTH = 40

export interface RelocateDragSpec<C, S> {
  measure: () => C[]
  /** Runs per pointermove, so it must not read layout. */
  pick: (cands: C[], clientY: number) => S | null
  lineFor: (slot: S) => { left: number; top: number; width: number } | null
  commit: (slot: S) => ChangeSpec[] | null
  /** Fires before the shade lands, so a heading can unfold first and the shade covers the
   *  unfolded content rather than the folded stub. */
  onDragStart?: () => void
  onTap?: () => void
}

/** Shared drag gesture for relocating a document range: shades the source, tracks a fixed
 *  insertion line, and moves the lines on release. Used by both list-item drag and block-handle
 *  drag via a different `RelocateDragSpec`. Candidates are measured at activation and re-measured
 *  only on scroll, since the document is otherwise static during a drag. */
export function beginRelocateDrag<C, S>(
  view: EditorView,
  e: PointerEvent,
  block: { from: number; to: number },
  spec: RelocateDragSpec<C, S>,
): void {
  const host = view.scrollDOM
  const overlay = new Overlay()
  let activated = false
  let cands: C[] = []
  let slot: S | null = null
  let lastY = e.clientY
  let stopScroll: (() => void) | null = null

  const repick = (): void => {
    slot = spec.pick(cands, lastY)
    const line = slot === null ? null : spec.lineFor(slot)
    if (line) overlay.show(line.left, line.top, Math.max(line.width, MIN_LINE_WIDTH))
    else overlay.hide()
  }
  // Candidates are viewport-relative, so a scroll invalidates them.
  const remeasure = (): void => {
    cands = spec.measure()
    repick()
  }

  beginEditorGesture(view, {
    el: host,
    event: e,
    onActivate: (ev) => {
      activated = true
      document.body.style.cursor = 'grabbing'
      spec.onDragStart?.()
      view.dispatch({ effects: setShade.of({ from: block.from, to: block.to }) })
      lastY = ev.clientY
      remeasure()
      // Explicit scroller: findScroller can't derive CM's scrollDOM. Its scrollBy fires the
      // native `scroll`, reaching onWindowScroll, so off-viewport candidates become targetable
      // as they scroll in.
      stopScroll = startAutoScroll({
        getPoint: () => ({ x: 0, y: lastY }),
        scroller: resolveScroller(host, 'y'),
        dragEl: host,
        axis: 'y',
      })
      return true
    },
    onDragMove: (ev) => {
      lastY = ev.clientY
      repick()
    },
    scrollTarget: () => host,
    onWindowScroll: remeasure,
    onDrop: () => {
      if (slot === null) return
      const changes = spec.commit(slot)
      if (changes?.length) view.dispatch({ changes, userEvent: 'input' })
    },
    onTap: spec.onTap,
    teardown: () => {
      stopScroll?.()
      stopScroll = null
      if (!activated) return
      document.body.style.cursor = ''
      overlay.hide()
      view.dispatch({ effects: setShade.of(null) })
    },
  })
}
