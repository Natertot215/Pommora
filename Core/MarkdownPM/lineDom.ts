import type { EditorView } from '@codemirror/view'

// Reads a line's OUTER box edge, which for a callout/quote/code box lies outside the visible border (where the drop lands), unlike coordsAtPos (the inner text position, which sits inside the box).
export function lineElementAt(view: EditorView, pos: number): HTMLElement | null {
  let node: Node | null = view.domAtPos(pos).node
  while (node && !(node instanceof HTMLElement && node.classList.contains('cm-line')))
    node = node.parentNode
  return node instanceof HTMLElement ? node : null
}

// The band a grip answers a press in: the gutter left of the line box on a page, and, where `--grip-strip` names one, that many pixels INTO the box — a table cell has no gutter, so its grip sits in the list's own inset.
export function inGripStrip(e: { clientX: number }, line: HTMLElement): boolean {
  const inset = parseFloat(getComputedStyle(line).getPropertyValue('--grip-strip')) || 0
  return e.clientX < line.getBoundingClientRect().left + inset
}
