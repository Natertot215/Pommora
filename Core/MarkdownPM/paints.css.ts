import { globalStyle } from '@vanilla-extract/css'
import { cellColor } from '@pommora/uix/Theme/ramp'
import { HIGHLIGHT_COLOR_NAMES, HIGHLIGHT_COLORS } from './Engine/highlightColors'

for (const color of HIGHLIGHT_COLOR_NAMES)
  globalStyle(`.md-highlight-${color}`, {
    vars: { '--highlight': cellColor(HIGHLIGHT_COLORS[color].cell) },
  })
