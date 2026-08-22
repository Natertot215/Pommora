import { style } from '@vanilla-extract/css'
import { vars as colorVars } from '../../design-system/tokens/color.css'
import { text } from '../../design-system/tokens/typography.css'
import { bare } from '../EditableInput.css'

const c = colorVars.color

/** The element the menu anchors to, and the one that survives the swap into the typing field —
 *  a stable box the PickerMenu can keep measuring while the trigger inside it is replaced. */
export const host = style({ display: 'inline-flex' })

/** The picker trigger — bare button; `&&` beats the toolbar/UA button tone. */
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
  { selectors: { '&&': { color: c.label.secondary } } },
])

/** What the value wears while it is being written rather than read — the UA's box stripped, sized to
 *  its text. Worn ALONGSIDE whichever value tone the trigger is already showing, so a footing picker
 *  keeps its own while editing rather than reverting to the standard one. */
export const caretShape = style([bare, { width: 'auto', minWidth: '12px' }])
