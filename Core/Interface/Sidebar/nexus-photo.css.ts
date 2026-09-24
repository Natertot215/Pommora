import { style } from '@vanilla-extract/css'
import { vars } from '@pommora/uix/Theme'

const c = vars.color

export const photo = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flex: '0 0 auto',
  borderRadius: '50%',
  overflow: 'hidden',
  color: c.label.secondary,
})
