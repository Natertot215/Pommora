import { style } from '@vanilla-extract/css'
import { vars } from '@renderer/design-system/tokens'

const c = vars.color

/** Circular photo / avatar slot (32px) — holds the nexus photo (cover-fit) or the default icon.
 *  No background of its own, so a photo with transparency shows the liquid-glass sidebar through. */
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

/** Faint placeholder tint for the EMPTY slot only — dropped once a photo is set so its
 *  transparent areas fall through to the glass instead of a solid fill. */
export const photoEmpty = style({ background: c.fill.tertiary })

export const photoImg = style({
  width: '100%',
  height: '100%',
  objectFit: 'cover',
  display: 'block',
})
