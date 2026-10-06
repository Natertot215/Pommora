import type { Rect } from '@pommora/uix/Interactions/useResizable'
import type { DividerRef, LayoutNode, TileLayout } from './model'
import { nodeHeight } from './model'

/** A horizontal length as a share of the grid's width plus a fixed offset — every x and width the layout produces is one, so CSS can lay the board out at any width. */
interface Span {
  share: number
  px: number
}

export interface Placement {
  x: Span
  y: number
  w: Span
  h: number
}

interface DividerPlacement {
  ref: DividerRef
  x: Span
  extent: Span
}

interface TilePlacements {
  tiles: Map<string, Placement>
  dividers: DividerPlacement[]
  seams: number[]
  totalHeight: number
}

export interface TileGeometry {
  tiles: Map<string, Rect>
  dividers: { ref: DividerRef; x: number; extentPx: number }[]
  seams: number[]
  totalHeight: number
}

const fixed = (px: number): Span => ({ share: 0, px })
const plus = (s: Span, px: number): Span => ({ share: s.share, px: s.px + px })
const scaled = (s: Span, k: number): Span => ({ share: s.share * k, px: s.px * k })
const sum = (a: Span, b: Span): Span => ({ share: a.share + b.share, px: a.px + b.px })

const atWidth = (s: Span, width: number): number => s.share * width + s.px

export const pinned = (r: Rect): Placement => ({ x: fixed(r.x), y: r.y, w: fixed(r.w), h: r.h })

export function placeTiles(layout: TileLayout, gap: number): TilePlacements {
  const tiles = new Map<string, Placement>()
  const dividers: DividerPlacement[] = []
  const seams: number[] = []

  const walk = (
    node: LayoutNode,
    x: Span,
    y: number,
    w: Span,
    band: number,
    path: number[],
  ): void => {
    if (node.kind === 'tile') {
      tiles.set(node.id, { x, y, w, h: node.h })
      return
    }
    if (node.kind === 'column') {
      let cy = y
      node.children.forEach((child, i) => {
        walk(child, x, cy, w, band, [...path, i])
        cy += nodeHeight(child, gap) + gap
      })
      return
    }
    const usable = plus(w, -gap * (node.children.length - 1))
    let cx = x
    node.children.forEach((child, i) => {
      const share = scaled(usable, node.ratios[i] ?? 0)
      walk(child, cx, y, share, band, [...path, i])
      cx = sum(cx, share)
      if (i < node.children.length - 1) {
        dividers.push({ ref: { band, path, index: i }, x: cx, extent: usable })
        cx = plus(cx, gap)
      }
    })
  }

  let y = 0
  layout.bands.forEach((band, i) => {
    walk(band.node, fixed(0), y, { share: 1, px: 0 }, i, [])
    y += nodeHeight(band.node, gap)
    // The seam CENTERLINE of the gap below this band — hit-testing's anchor.
    seams.push(y + gap / 2)
    y += gap
  })

  return { tiles, dividers, seams, totalHeight: Math.max(0, y - gap) }
}

export function computeGeometry(layout: TileLayout, width: number, gap: number): TileGeometry {
  const placed = placeTiles(layout, gap)
  const tiles = new Map<string, Rect>()
  for (const [id, p] of placed.tiles)
    tiles.set(id, { x: atWidth(p.x, width), y: p.y, w: atWidth(p.w, width), h: p.h })
  return {
    tiles,
    dividers: placed.dividers.map((d) => ({
      ref: d.ref,
      x: atWidth(d.x, width),
      extentPx: atWidth(d.extent, width),
    })),
    seams: placed.seams,
    totalHeight: placed.totalHeight,
  }
}
