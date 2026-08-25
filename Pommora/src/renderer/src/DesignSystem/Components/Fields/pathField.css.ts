import { style } from '@vanilla-extract/css'
import { placeholder as fieldPlaceholder } from './fields.css'
import { focusRing } from './fieldRing'
import { vars as colorVars } from '../../Tokens/color.css'
import { text } from '../../Tokens/typography.css'

const c = colorVars.color

const LEAD_GAP = '5px' // KNOB — the lead glyph's stand-off from the trail
const BROWSE_GAP = '8px' // KNOB — how far the browse action stands off the path it follows
const TRAIL_FADE = '30px' // KNOB — wide enough that the eclipse reads as a dissolve rather than a cut

/** The field is its content, not its row: it widens as the path deepens and gives way when the row
 *  runs out, at which point the trail's own fade eclipses the head rather than the field pushing
 *  its row wider. */
export const pathField = style({
  width: 'auto',
  flex: '0 1 auto',
  cursor: 'text',
  ...focusRing('within'),
})

/** Every segment here is a folder, so the run carries one glyph rather than one per segment. */
export const leadIcon = style({ marginRight: LEAD_GAP, flexShrink: 0, color: c.label.secondary })

export const trail = style({
  flex: '1 1 auto',
  vars: { '--over-scroll-fade': TRAIL_FADE, '--nav-trail-ink': c.label.control },
})

/** A real gap rather than an auto margin: the field is its content, so an auto margin collapses to
 *  nothing and leaves the glyph reading as the last segment instead of the action it is. */
export const browse = style({ marginLeft: BROWSE_GAP, flexShrink: 0 })

export const placeholder = style([text.body.standard, fieldPlaceholder])
