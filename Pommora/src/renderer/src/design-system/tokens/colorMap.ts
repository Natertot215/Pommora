// The chip-palette accessor: the one crossing from a stored color string to a render key. It
// absorbs the legacy vocabulary — a bare `red` on disk normalizes to its anchor cell — so nothing
// downstream needs to know two grammars ever existed, and nothing on disk is rewritten.

import { isColorKey, type CellKey } from '@shared/theme'
import { ANCHOR_CELLS } from './ramp'

const ANCHORS: Readonly<Record<string, CellKey>> = ANCHOR_CELLS

export function chipColorFor(color: string | undefined): CellKey | 'default' {
  if (!color) return 'default'
  const anchor = ANCHORS[color]
  if (anchor) return anchor
  return isColorKey(color) ? (color as CellKey) : 'default'
}

