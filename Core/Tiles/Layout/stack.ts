import type { TileLayout } from './model'
import { tileLeaves } from './model'

// KNOB — the grid width below which the board draws as one column (two SIDE_PANE_WIDTH.min panes plus the gutter), and the margin it regains before unstacking (five gutters, wider than --content-inset, so a pane slide crosses once).
const STACK_WIDTH_PX = 488
const STACK_HYSTERESIS_PX = 40

export function stackedAt(width: number, was: boolean): boolean {
  return width < STACK_WIDTH_PX + (was ? STACK_HYSTERESIS_PX : 0)
}

// The leaves are REBUILT rather than shared: ops.ts mutates a cloned tree's leaves in place, so a node held by both trees is a write hazard.
export function stackLayout(layout: TileLayout): TileLayout {
  return {
    bands: tileLeaves(layout).map((t) => ({ node: { kind: 'tile' as const, id: t.id, h: t.h } })),
  }
}
