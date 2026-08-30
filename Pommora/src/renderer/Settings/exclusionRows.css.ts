import { globalStyle, style } from '@vanilla-extract/css'
import { segment as navTrailSegment } from '@renderer/DesignSystem/Elements/NavTrail/navTrail.css'
import { vars as colorVars } from '@renderer/DesignSystem/Tokens/color.css'

const c = colorVars.color

export const manageCluster = style({
  display: 'inline-flex',
  alignItems: 'center',
  gap: '8px',
})

export const count = style({
  color: c.label.secondary,
  fontVariantNumeric: 'tabular-nums',
})

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

export const removeButton = style({
  flex: '0 0 auto',
  border: 'none',
  background: 'none',
  padding: '4px',
  borderRadius: '4px',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: c.label.secondary,
  cursor: 'default',
  selectors: { '&:hover': { background: c.state.hover } },
})

export const addRow = style({
  display: 'flex',
  paddingTop: '4px',
})

export const addButton = style({ color: c.label.secondary })

globalStyle(`${paneRow} ${navTrailSegment}`, { color: c.label.control })
