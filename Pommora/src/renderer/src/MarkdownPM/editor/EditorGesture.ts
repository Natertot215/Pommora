// The editor's bracket around the shared pointer-gesture skeleton. A CodeMirror extension has no
// React component to hang an unmount abort on, and the skeleton drives its drags from window
// listeners — so an editor destroyed mid-drag would leave the gesture running against a dead view.
// `editorGestureCleanup` is that abort, and it goes in every extension array that starts one.
import type { ChangeSpec } from '@codemirror/state'
import { type EditorView, ViewPlugin } from '@codemirror/view'
import { resolveScroller, startAutoScroll } from '../../design-system/interactions/autoscroll'
import {
  beginPointerGesture,
  type GestureHandle,
  type PointerGestureSpec,
} from '../../design-system/interactions/gesture'
import { Overlay, setShade } from './dragChrome'

// One handle, matching the skeleton's own singleton: only one editor gesture is live app-wide. It
// carries the view that started it, because the plugin below is mounted in EVERY editor and a page
// runs several at once — an embed tile, a hover card, a preview window. Aborting on any view's
// teardown would let a sibling's unmount kill the drag you are in the middle of.
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

/** Keeps the insertion line readable against a short or deeply-indented target. */
const MIN_LINE_WIDTH = 40

/** What one relocation drag has to say for itself: where the slots are, how the line draws over
 *  one, and what a drop writes. */
export interface RelocateDragSpec<C, S> {
  /** Measure the drop candidates in viewport coords — at activation, then after every scroll. */
  measure: () => C[]
  /** Hit-test the cached candidates. Runs per pointermove, so it reads no layout. */
  pick: (cands: C[], clientY: number) => S | null
  /** Where the insertion line draws for a slot — null for a slot that would move nothing. */
  lineFor: (slot: S) => { left: number; top: number; width: number } | null
  /** The document changes a drop on this slot applies. */
  commit: (slot: S) => ChangeSpec[] | null
  /** At activation, before the shade lands — a heading unfolds here, so the shade covers what the
   *  unfold reveals rather than the folded stub. */
  onDragStart?: () => void
  /** A release that never crossed the threshold: the press was a click. */
  onTap?: () => void
}

/** Relocate a range of the document by dragging it: shade the source in place, track a fixed
 *  insertion line, and move the lines on release. Both editor surfaces that relocate — a list item
 *  with its nested descendants, a whole block by its gutter handle — are this gesture wearing a
 *  different `RelocateDragSpec`.
 *
 *  Candidates are measured at activation and re-measured only on scroll: the document is static
 *  during a drag, so re-measuring per pointermove would be pure layout thrash. */
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

  // Re-aim the insertion line at the slot under the last pointer Y — no re-measure.
  const repick = (): void => {
    slot = spec.pick(cands, lastY)
    const line = slot === null ? null : spec.lineFor(slot)
    if (line) overlay.show(line.left, line.top, Math.max(line.width, MIN_LINE_WIDTH))
    else overlay.hide()
  }
  // Candidate coords are viewport-relative, so any scroll invalidates them — re-measure against the
  // new layout, then re-aim.
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
      // The shared loop scrolls CM's viewport (explicit scroller — findScroller can't derive
      // scrollDOM); its scrollBy fires the native `scroll`, which the skeleton's capture-phase
      // window listener carries to onWindowScroll, so far candidates (CM only renders ~viewport)
      // become targetable as they scroll in.
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
