import { globalStyle, style } from '@vanilla-extract/css'
import { vars as colorVars } from '../../Tokens/color.css'
import { font, text } from '../../Tokens/typography.css'
import { footingBar } from '../../Menus/menu-base.css'
import { base } from '../../Components/Fields/fields.css'

const c = colorVars.color

/** The element the menu anchors to, and the one that survives the swap into the typing field —
 *  a stable box the PickerMenu can keep measuring while the trigger inside it is replaced. */
export const host = style({ display: 'inline-flex' })

export const trigger = style({
  display: 'inline-flex',
  alignItems: 'center',
  gap: '4px',
  border: 'none',
  background: 'none',
  padding: 0,
  cursor: 'default',
  selectors: { '&&': { color: c.label.secondary } },
})

export const value = style([
  text.control.standard,
  { selectors: { '&&': { color: c.label.control } } },
])

export const written = style({ display: 'inline-flex', alignItems: 'center' })

export const caretShape = style([base, { width: 'auto', minWidth: '12px' }])

globalStyle(`${footingBar} ${value}`, {
  fontSize: font.scale.footnote.size,
  lineHeight: font.scale.footnote.line,
  fontWeight: font.weight.emphasized,
  color: c.label.secondary,
})
