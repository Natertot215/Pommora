import { getTile, tileIds, type LayoutNode, type TileLayout } from '../Tiles/Layout/model'
import { attachBelow, insertBand, moveTile } from '../Tiles/Layout/ops'

export function splitTile(
  layout: TileLayout,
  targetId: string,
  edge: 'e' | 's',
  newId: string,
): TileLayout {
  if (edge === 'e')
    return moveTile(insertBand(layout, layout.bands.length, newId, 1), newId, targetId, 'e')
  const h = getTile(layout, targetId)?.h ?? 0
  const below = Math.round(h / 2)
  const next = attachBelow(layout, targetId, newId, below)
  const target = getTile(next, targetId)
  if (target) target.h = Math.max(1, h - below)
  return next
}

export function validateLayout(layout: TileLayout): string[] {
  const problems: string[] = []
  const walk = (node: LayoutNode, where: string): void => {
    if (node.kind === 'tile') {
      if (!(node.h > 0)) problems.push(`${where}: non-positive tile height`)
      return
    }
    if (node.kind === 'row') {
      if (node.ratios.some((r) => !(r > 0))) problems.push(`${where}: non-positive ratio`)
      const sum = node.ratios.reduce((a, r) => a + r, 0)
      if (Math.abs(sum - 1) > 1e-6) problems.push(`${where}: ratios sum to ${sum}`)
    }
    node.children.forEach((child, i) => {
      walk(child, `${where}.${i}`)
    })
  }
  layout.bands.forEach((band, i) => {
    walk(band.node, `band ${i}`)
  })
  const ids = tileIds(layout)
  if (new Set(ids).size !== ids.length) problems.push('duplicate tile id')
  return problems
}
