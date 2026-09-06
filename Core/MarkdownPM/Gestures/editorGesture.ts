// CM extensions have no unmount hook, and drags run off window listeners, so a destroyed editor would leave a gesture running against a dead view. Include `editorGestureCleanup` in every extension array that starts one.
import type { ChangeSpec } from '@codemirror/state'
import { type EditorView, ViewPlugin } from '@codemirror/view'
import { resolveScroller, startAutoScroll } from '@pommora/uix/Interactions/autoscroll'
import {
  beginPointerGesture,
  type GestureHandle,
  type PointerGestureSpec,
} from '@pommora/uix/Interactions/gesture'
import { Overlay, setShade } from './dragChrome'

// The cleanup plugin is mounted in every editor (a page can run several), so the handle carries the view that started it — otherwise a sibling's unmount would abort the drag in progress.
let live: { view: EditorView; handle: GestureHandle } | null = null

function beginEditorGesture(view: EditorView, spec: PointerGestureSpec): boolean {
  const handle = beginPointerGesture(spec)
  if (handle) live = { view, handle }
  return handle !== null
}

export const editorGestureCleanup = ViewPlugin.define((view) => ({
  destroy: () => {
    if (live?.view !== view) return
    live.handle.abort()
    live = null
  },
}))

const MIN_LINE_WIDTH = 40

interface RelocateDragSpec<C, S> {
  measure: () => C[]
  pick: (cands: C[], clientY: number) => S | null
  lineFor: (slot: S) => { left: number; top: number; width: number } | null
  commit: (slot: S) => ChangeSpec[] | null
  /** Fires before the shade lands, so a heading can unfold first and the shade covers the unfolded content. */
  onDragStart?: () => void
  onTap?: () => void
}

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
      // Explicit scroller: findScroller can't derive CM's scrollDOM. Its scrollBy fires the native `scroll`, so off-viewport candidates become targetable as they scroll in.
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
