import type { EditorView } from '@codemirror/view'

// Reads a line's OUTER box edge, which for a callout/quote/code box lies outside the visible border (where the drop lands), unlike coordsAtPos (the inner text position, which sits inside the box).
export function lineElementAt(view: EditorView, pos: number): HTMLElement | null {
  let node: Node | null = view.domAtPos(pos).node
  while (node && !(node instanceof HTMLElement && node.classList.contains('cm-line')))
    node = node.parentNode
  return node instanceof HTMLElement ? node : null
}

export function textColumn(view: EditorView): { left: number; right: number } {
  const box = view.contentDOM.getBoundingClientRect()
  const cs = getComputedStyle(view.contentDOM)
  return {
    left: box.left + (parseFloat(cs.paddingLeft) || 0),
    right: box.right - (parseFloat(cs.paddingRight) || 0),
  }
}

// A tile nests whole editors inside this one's content, so an element is this editor's own only when no nearer content claims it.
export function ownElements<E extends HTMLElement = HTMLElement>(
  view: EditorView,
  selector: string,
): E[] {
  return [...view.contentDOM.querySelectorAll<E>(selector)].filter(
    (el) => el.closest('.cm-content') === view.contentDOM,
  )
}

// The band a grip answers a press in: the gutter left of the line box on a page, and, where `--grip-strip` names one, that many pixels INTO the box — a table cell has no gutter, so its grip sits in the list's own inset.
function inGripStrip(e: { clientX: number }, line: HTMLElement): boolean {
  const inset = parseFloat(getComputedStyle(line).getPropertyValue('--grip-strip')) || 0
  return e.clientX < line.getBoundingClientRect().left + inset
}

/** Null on the line's own text — a press past the grip's own band is never a grip press. */
export function gutterLineAt(
  e: { target: EventTarget | null; clientX: number },
  selector: string,
): HTMLElement | null {
  const line = (e.target as HTMLElement).closest?.(selector) as HTMLElement | null
  return line && inGripStrip(e, line) ? line : null
}
