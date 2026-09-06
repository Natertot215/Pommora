import { style } from '@vanilla-extract/css'
import { vars } from '@pommora/uix/Theme'

const c = vars.color

export const photo = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flex: '0 0 auto',
  width: '32px',
  height: '32px',
  borderRadius: '50%',
  overflow: 'hidden',
  color: c.label.secondary,
})

/** Dropped once a photo is set, so its transparent areas fall through to the glass instead of a solid fill. */
export const photoEmpty = style({ background: c.fill.quaternary })
