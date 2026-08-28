import { style } from '@vanilla-extract/css'
import { vars as colorVars } from '@renderer/DesignSystem/Tokens/color.css'
import { font } from '@renderer/DesignSystem/Tokens/typography.css'
import { base } from '@renderer/DesignSystem/Components/Fields/fields.css'

/** No flex `gap`: a collapsed Reveal would still consume one on each side, so each row carries its
 *  own top margin, which rides inside the Reveal and collapses with it. */
export const section = style({ display: 'flex', flexDirection: 'column', paddingTop: '6px' })

export const rowRhythm = style({
  marginTop: '8px',
  selectors: { '&:first-child': { marginTop: 0 } },
})

export const valueControl = style({
  display: 'inline-flex',
  alignItems: 'center',
  gap: '4px',
  padding: 0,
  border: 'none',
  background: 'none',
  cursor: 'default',
  selectors: { '&&': { color: colorVars.color.label.secondary } },
})

export const valueCaret = style([
  base,
  {
    fontSize: font.scale.control.size,
    lineHeight: font.scale.control.line,
    minWidth: '12px',
    width: 'auto',
    fieldSizing: 'content',
    color: colorVars.color.label.secondary,
  },
])
