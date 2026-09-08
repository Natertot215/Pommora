import { StateEffect, StateField, type Line, type Range, type Text } from '@codemirror/state'
import { Decoration, type DecorationSet, EditorView } from '@codemirror/view'

export function forEachLine(doc: Text, from: number, to: number, fn: (line: Line) => void): void {
  let line = doc.lineAt(from)
  while (line.from <= to) {
    fn(line)
    if (line.to + 1 > doc.length) break
    line = doc.lineAt(line.to + 1)
  }
}

// A StateField, since CM rebuilds line DOM on every change (a raw class would be wiped, but line decorations survive).
export const setShade = StateEffect.define<{ from: number; to: number } | null>()
const shadeLine = Decoration.line({ class: 'md-list-drag-source' })

export const shadeField = StateField.define<DecorationSet>({
  create: () => Decoration.none,
  update(deco, tr) {
    deco = deco.map(tr.changes)
    for (const e of tr.effects) {
      if (!e.is(setShade)) continue
      if (e.value === null) deco = Decoration.none
      else {
        const ranges: Range<Decoration>[] = []
        forEachLine(tr.state.doc, e.value.from, e.value.to, (line) =>
          ranges.push(shadeLine.range(line.from)),
        )
        deco = Decoration.set(ranges)
      }
    }
    return deco
  },
  provide: (f) => EditorView.decorations.from(f),
})

// position:fixed uses viewport coords, immune to the scroll-container ambiguity an absolute child of scrollDOM has.
export class Overlay {
  private line: HTMLElement | null = null

  show(left: number, top: number, width: number): void {
    if (!this.line) {
      const l = document.createElement('div')
      l.setAttribute('aria-hidden', 'true')
      l.className = 'drop-line'
      // Viewport-fixed with explicit left/width per frame — the class's absolute + edge insets don't apply to a body-level overlay.
      l.style.cssText = 'position:fixed;right:auto;z-index:var(--z-floating)'
      const dot = document.createElement('span')
      dot.className = 'drop-dot'
      l.appendChild(dot)
      document.body.appendChild(l)
      this.line = l
    }
    this.line.style.left = `${left}px`
    this.line.style.width = `${width}px`
    this.line.style.top = `${top}px`
  }

  hide(): void {
    this.line?.remove()
    this.line = null
  }
}

/** One drop boundary, in viewport coords. */
export interface Boundary<T> {
  at: number
  y: number
  slot: T
}

/** Snap to whichever boundary is vertically CLOSEST to the pointer, so the gap between two candidates splits at its midpoint. Runs per pointermove over cached coords, so it reads no layout. */
export function nearestBoundary<T>(
  bs: readonly Boundary<T>[],
  clientY: number,
): Boundary<T> | null {
  let best: Boundary<T> | null = null
  let bd = Number.POSITIVE_INFINITY
  for (const b of bs) {
    const d = Math.abs(clientY - b.y)
    if (d < bd) {
      bd = d
      best = b
    }
  }
  return best
}
