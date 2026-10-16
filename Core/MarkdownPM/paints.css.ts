import { globalStyle } from '@vanilla-extract/css'
import { cellColor } from '@pommora/uix/Theme/ramp'
import { PAINT_COLOR_NAMES, PAINT_COLORS } from './Engine/paints'

for (const color of PAINT_COLOR_NAMES)
  globalStyle(`.md-paint-${color}`, {
    vars: { '--paint': cellColor(PAINT_COLORS[color].cell) },
  })
