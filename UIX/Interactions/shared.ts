import type { CSSProperties } from 'react'

export type Rect = { left: number; top: number; width: number; height: number }
export type Box = Rect & { cx: number; cy: number }
export type DragItem = {
  setNodeRef: (el: HTMLElement | null) => void
  style: CSSProperties
  handle: Record<string, unknown>
  isDragging: boolean
}

export const ACTIVATION = 5 // px the pointer must travel before a drag starts
// The CSS side reads this same token as `--drop-line-inset`.
export { DROP_LINE_INSET } from '../Theme/theme-vars.css'
export const EDITABLE_TARGETS = 'input, textarea, [contenteditable="true"]'

export function suppressNextClick(): void {
  const swallow = (e: MouseEvent): void => {
    e.stopPropagation()
    e.preventDefault()
  }
  document.addEventListener('click', swallow, { capture: true, once: true })
  window.setTimeout(() => document.removeEventListener('click', swallow, { capture: true }), 0)
}
/** A cancelled drag's release is still coming and must not read as a click; a new press first means that release was lost to a blur. */
export function suppressReleaseClick(): void {
  const onUp = (): void => {
    document.removeEventListener('pointerdown', onDown, true)
    suppressNextClick()
  }
  const onDown = (): void => document.removeEventListener('pointerup', onUp)
  document.addEventListener('pointerup', onUp, { once: true })
  document.addEventListener('pointerdown', onDown, { capture: true, once: true })
}
export const HYSTERESIS = 6 // px a new candidate must beat the current `over` by, to switch
export const BREAKOUT = 24 // px past an axis-locked zone's edges before its item is loose; a free zone lets go at its edge
export type Family<T> = { readonly name: string; readonly carried?: T }
export type CarryEntry = readonly [Family<unknown>, (id: string) => unknown]
export const carries = <T>(family: Family<T>, of: (id: string) => T | null): CarryEntry => [
  family,
  of,
]
export const SETTLE_FALLBACK = 80 // ms slack past the transition, covering the paint-start delay

export function boxAt(left: number, top: number, width: number, height: number): Box {
  return { left, top, width, height, cx: left + width / 2, cy: top + height / 2 }
}

export function toBox(el: HTMLElement): Box {
  const r = el.getBoundingClientRect()
  return boxAt(r.left, r.top, r.width, r.height)
}

/** `.toFixed(1)` keeps sub-pixel sharpness on Retina without blur. */
export const px = (n: number): string => `${n.toFixed(1)}px`

export function clipChain(el: Element): Element[] {
  const chain: Element[] = []
  for (let n = el.parentElement; n; n = n.parentElement) {
    const s = getComputedStyle(n)
    if (s.overflowX !== 'visible' || s.overflowY !== 'visible') chain.push(n)
  }
  return chain
}

const NOWHERE: Rect = { left: 0, top: 0, width: 0, height: 0 }

export function clipOf(chain: readonly Element[]): Rect | null {
  let cut: Rect | null = null
  for (const n of chain) cut = intersect(n.getBoundingClientRect(), cut) ?? NOWHERE
  return cut
}

export function intersect(box: Rect, cut: Rect | null): Rect | null {
  const c = cut ?? box
  const left = Math.max(box.left, c.left)
  const top = Math.max(box.top, c.top)
  const right = Math.min(box.left + box.width, c.left + c.width)
  const bottom = Math.min(box.top + box.height, c.top + c.height)
  return right > left && bottom > top
    ? { left, top, width: right - left, height: bottom - top }
    : null
}
