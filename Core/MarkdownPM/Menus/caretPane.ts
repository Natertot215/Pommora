import { useCallback, useEffect, useState, type RefObject } from 'react'
import type { EditorView, KeyBinding } from '@codemirror/view'
import { clamp } from '@pommora/uix/Utilities/clamp'
import { useLatest } from '@pommora/uix/Utilities/stableApi'

export interface CaretGeometry {
  caretX: number
  caretTop: number
  caretBottom: number
  bounds: { left: number; right: number }
}

export const CLOSED_GEOMETRY: CaretGeometry = {
  caretX: 0,
  caretTop: 0,
  caretBottom: 0,
  bounds: { left: 0, right: 0 },
}

export interface PaneCtl {
  open: boolean
  pick: () => void
  move: (d: number) => void
  close: () => void
  aside?: (dir: 1 | -1) => boolean
}

export function usePaneCtl(
  count: number,
  resetKey: unknown,
  drive: {
    open: boolean
    pick: (index: number) => void
    close: () => void
    aside?: (dir: 1 | -1) => boolean
  },
  initial: number | null = 0,
): { index: number | null; ctl: RefObject<PaneCtl> } {
  const [index, setIndex] = useState<number | null>(initial)
  const selected = index === null ? null : Math.min(index, Math.max(count - 1, 0))

  const ctl = useLatest<PaneCtl>({
    open: drive.open,
    pick: () => drive.pick(selected ?? 0),
    move: (d) =>
      setIndex((i) => (i === null ? (d > 0 ? 0 : count - 1) : clamp(i + d, 0, count - 1))),
    close: drive.close,
    aside: drive.aside,
  })

  useEffect(() => setIndex(initial), [resetKey, initial])

  return { index: selected, ctl }
}

export const whenPaneOpen =
  (ctls: readonly RefObject<PaneCtl>[], drive: (c: PaneCtl) => unknown) => (): boolean => {
    const open = ctls.find((r) => r.current.open)?.current
    if (!open) return false
    // A driver that answers a boolean decides whether the key was handled; the rest always handle it.
    const handled = drive(open)
    return typeof handled === 'boolean' ? handled : true
  }

/** A pane's own keys; Enter is each surface's, since a cell's Enter also leaves the cell. */
export const paneKeys = (ctls: readonly RefObject<PaneCtl>[]): KeyBinding[] => [
  { key: 'ArrowDown', run: whenPaneOpen(ctls, (c) => c.move(1)) },
  { key: 'ArrowUp', run: whenPaneOpen(ctls, (c) => c.move(-1)) },
  { key: 'Escape', run: whenPaneOpen(ctls, (c) => c.close()) },
  { key: 'ArrowRight', run: whenPaneOpen(ctls, (c) => c.aside?.(1) ?? false) },
  { key: 'ArrowLeft', run: whenPaneOpen(ctls, (c) => c.aside?.(-1) ?? false) },
]

/** The editor's nearest SCROLLING ancestor — the editor itself never scrolls, so `scrollDOM` is the wrong answer. */
const surfaces = new WeakMap<HTMLElement, HTMLElement>()
function surfaceOf(view: EditorView): HTMLElement {
  // Containment, not connectedness: a cached surface can be in the document while the editor has been re-slotted out of it.
  const cached = surfaces.get(view.dom)
  if (cached?.contains(view.dom)) return cached
  // The answer must not be cached: the loop bottoms out at the body, which is connected by definition, so nothing would re-walk.
  if (!view.dom.isConnected) return document.body
  let el = view.dom.parentElement
  while (el && el !== document.body) {
    const oy = getComputedStyle(el).overflowY
    if (oy === 'auto' || oy === 'scroll') break
    el = el.parentElement
  }
  const found = el ?? document.body
  surfaces.set(view.dom, found)
  return found
}

export function caretGeometry(view: EditorView, pos: number): CaretGeometry | null {
  const c = view.coordsAtPos(pos)
  if (!c) return null
  const b = surfaceOf(view).getBoundingClientRect()
  return {
    caretX: Math.round(c.left),
    caretTop: Math.round(c.top),
    caretBottom: Math.round(c.bottom),
    bounds: { left: Math.round(b.left), right: Math.round(b.right) },
  }
}

export function useKeepInView(active: unknown): (el: HTMLElement | null) => void {
  return useCallback(
    (el: HTMLElement | null) => el?.scrollIntoView({ inline: 'nearest', block: 'nearest' }),
    [active],
  )
}
