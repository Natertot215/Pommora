import type { ReactNode, RefObject } from 'react'
import { type Extension, StateEffect, StateField } from '@codemirror/state'
import type { EditorView, KeyBinding } from '@codemirror/view'
import { scrollContainer } from '@pommora/uix/Interactions/autoscroll'
import { PickerMenu } from '@pommora/uix/Pickers/PickerMenu'
import type { PaneResize } from '@pommora/uix/Pickers/usePaneResize'
import type { PaneCtl } from '@pommora/uix/Interactions/paneCtl'
import { cx } from '@pommora/uix/Utilities/cx'

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

/** The editor's nearest SCROLLING ancestor — the editor itself never scrolls, so `scrollDOM` is the wrong answer. */
const surfaces = new WeakMap<HTMLElement, HTMLElement>()
function surfaceOf(view: EditorView): HTMLElement {
  // Containment, not connectedness: a cached surface can be in the document while the editor has been re-slotted out of it.
  const cached = surfaces.get(view.dom)
  if (cached?.contains(view.dom)) return cached
  // The answer must not be cached: the fallback is the body, which is connected by definition, so nothing would re-walk.
  if (!view.dom.isConnected) return document.body
  const found = scrollContainer(view.dom, 'y') ?? document.body
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

const CARET_PANE = 'mdpm-caret-pane'

/** Whether focus sits, or is moving, inside an editor's own caret pane. */
export const inCaretPane = (el: EventTarget | null): boolean =>
  el instanceof Element && el.closest(`.${CARET_PANE}`) !== null

export const holdPane = StateEffect.define<boolean>()

/** Set while an edit runs in the editor's caret pane, which holds the editor's place as its own focus would. */
export const paneHeld = StateField.define<boolean>({
  create: () => false,
  update: (held, tr) => tr.effects.reduce((h, e) => (e.is(holdPane) ? e.value : h), held),
})

// No `onDismiss`, and focus kept by contract: the editor's keymap owns arrows, Return and Escape, and only a field inside the pane takes focus, which the editor holds its place through.
export function CaretPane({
  open,
  at,
  className,
  resize,
  children,
}: {
  open: boolean
  at: CaretGeometry
  className: string
  resize: PaneResize
  children: ReactNode
}): React.JSX.Element {
  return (
    <PickerMenu
      glass="window"
      open={open}
      anchorX={at.caretX}
      anchorY={at.caretTop}
      anchorHeight={at.caretBottom - at.caretTop}
      bounds={at.bounds}
      origin="center"
      focus="keep"
      contentClassName={cx(CARET_PANE, className)}
      resize={resize}
    >
      {children}
    </PickerMenu>
  )
}

/** A pane an editor mounts: what it adds to the editor, and the control its keys drive. */
export interface EditorPane {
  extension: Extension
  ctl: RefObject<PaneCtl>
}

export const whenPaneOpen =
  (ctls: readonly RefObject<PaneCtl>[], drive: (c: PaneCtl) => unknown) => (): boolean => {
    const open = ctls.find((r) => r.current.open)?.current
    if (!open) return false
    // A driver that answers a boolean decides whether the key was handled; the rest always handle it.
    const handled = drive(open)
    return typeof handled === 'boolean' ? handled : true
  }

export const paneKeys = (ctls: readonly RefObject<PaneCtl>[]): KeyBinding[] => [
  { key: 'Enter', run: whenPaneOpen(ctls, (c) => c.pick()) },
  { key: 'Tab', run: whenPaneOpen(ctls, (c) => c.pick()) },
  { key: 'ArrowDown', run: whenPaneOpen(ctls, (c) => c.move(1)) },
  { key: 'ArrowUp', run: whenPaneOpen(ctls, (c) => c.move(-1)) },
  { key: 'Escape', run: whenPaneOpen(ctls, (c) => c.close()) },
  { key: 'ArrowRight', run: whenPaneOpen(ctls, (c) => c.aside?.(1) ?? false) },
  { key: 'ArrowLeft', run: whenPaneOpen(ctls, (c) => c.aside?.(-1) ?? false) },
]
