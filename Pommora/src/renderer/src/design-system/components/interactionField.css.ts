import { style } from '@vanilla-extract/css'
import { vars as colorVars, inputFieldVar } from '../tokens/color.css'
import { text } from '../tokens/typography.css'
import { fieldRing } from './fieldRing'

const c = colorVars.color

/** The rounded input surface. The OutlineTint channel: any ancestor (or the
 *  component's `outline` prop) sets `--field-ring` and the field paints the house inset ring
 *  in that color — unset stays ringless. */
export const field = style([
  text.body.standard,
  {
    display: 'flex',
    alignItems: 'center',
    minHeight: '28px',
    padding: '4px 8px',
    borderRadius: '8px',
    background: inputFieldVar,
    color: c.label.primary,
    width: '100%',
    boxSizing: 'border-box',
    boxShadow: fieldRing(),
  },
])

/** The bare <input> variant — identical chrome, no native border/outline, no focus ring (Nathan:
 *  no focus animation). Focus keeps the SEMANTIC ring (`--field-ring` is color, not focus state)
 *  while still killing the native outline. */
export const input = style([
  field,
  {
    border: 'none',
    outline: 'none',
    font: 'inherit',
  },
])
