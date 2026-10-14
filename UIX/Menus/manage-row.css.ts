import { globalStyle, style } from '@vanilla-extract/css'
import { segment as navTrailSegment } from '../Elements/nav-trail.css'
import { vars as colorVars } from '../Theme/color.css'

export const pane = style({ padding: 'var(--surface-inset)' })

export const list = style({
  display: 'flex',
  flexDirection: 'column',
  gap: '6px',
  minWidth: 'calc(250px - 2 * var(--surface-inset))',
  maxWidth: 'calc(500px - 2 * var(--surface-inset))',
})

export const row = style({ display: 'flex', alignItems: 'center', gap: '4px' })

export const field = style({ flex: '1 1 auto', minWidth: 0 })

globalStyle(`${row} ${navTrailSegment}`, { color: colorVars.color.label.control })
