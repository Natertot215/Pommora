import { globalStyle, style } from '@vanilla-extract/css'
import { segment as navTrailSegment } from '@renderer/DesignSystem/Elements/NavTrail/nav-trail.css'
import { vars as colorVars } from '@renderer/DesignSystem/Tokens/color.css'
import { text } from '@renderer/DesignSystem/Tokens/typography.css'

const c = colorVars.color

export const manageCluster = style({
  display: 'inline-flex',
  alignItems: 'center',
  gap: '8px',
})

export const count = style([
  text.control.standard,
  { color: c.label.secondary, fontVariantNumeric: 'tabular-nums' },
])

export const paneList = style({
  display: 'flex',
  flexDirection: 'column',
  gap: '6px',
  padding: 'var(--surface-inset)',
})

export const paneRow = style({
  display: 'flex',
  alignItems: 'center',
  gap: '4px',
})

export const field = style({
  flex: '1 1 auto',
  minWidth: 0,
})

export const addRow = style({
  display: 'flex',
  paddingTop: '4px',
})

export const addButton = style({ color: c.label.secondary })

globalStyle(`${paneRow} ${navTrailSegment}`, { color: c.label.control })
