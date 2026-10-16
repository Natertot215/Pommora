import { globalStyle } from '@vanilla-extract/css'
import type { CellKey } from '@pommora/uix/Theme/colors'
import { ANCHOR_CELLS, cellColor } from '@pommora/uix/Theme/ramp'
import { PAINT_COLOR_NAMES, type PaintColor } from './Engine/paints'

const CELLS: Record<PaintColor, CellKey> = { ...ANCHOR_CELLS, black: 'grey-4', white: 'grey-7' }

for (const color of PAINT_COLOR_NAMES)
  globalStyle(`.md-paint-${color}`, {
    vars: { '--paint': cellColor(CELLS[color]) },
  })
