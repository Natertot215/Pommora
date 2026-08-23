// The house folder-path field — a lead glyph, the stored path as a run of segments, and a browse
// affordance. It composes the house field chrome rather than restating it, and sizes to the path it
// holds: it widens as the path deepens and gives way when the row runs out, at which point the run's
// own fade eclipses the head rather than the field pushing its row wider.
import { style } from '@vanilla-extract/css'
import { hairlineField } from './interactionField.css'
import { focusRing } from './fieldRing'
import { vars as colorVars } from '../tokens/color.css'
import { text } from '../tokens/typography.css'

const c = colorVars.color

const LEAD_GAP = '6px' // KNOB
const BROWSE_GAP = '8px' // KNOB — how far the browse action stands off the path it follows

export const pathField = style([
  hairlineField,
  {
    // The FilterPane cell's sizing: `field`'s own `width: 100%` off, so the field is its content
    // rather than its row. Grow is off and shrink is on — absorbing the row's leftover would strand
    // the browse glyph at a far edge with nothing between it and the path, and a fixed width leaves
    // the narrower of its two hosts with a field it can't fill. `hairlineField` carries the
    // `minWidth: 0` that lets the run give way into its fade instead of forcing the field open.
    width: 'auto',
    flex: '0 1 auto',
    cursor: 'text',
    ...focusRing('within'),
  },
])

/** The path's one leading glyph. Every segment here is a folder, so repeating the icon per segment
 *  would read as noise — the run is what says "these are nested". */
export const leadIcon = style({ marginRight: LEAD_GAP, flexShrink: 0, color: c.label.secondary })

/** The browse affordance, after the path. A real gap rather than an auto margin: the field is its
 *  content now, so an auto margin collapses to nothing and leaves the glyph resting against the
 *  last segment, reading as part of the path instead of as the action it is. */
export const browse = style({
  marginLeft: BROWSE_GAP,
  flexShrink: 0,
  display: 'inline-flex',
  alignItems: 'center',
  border: 'none',
  background: 'none',
  padding: 0,
  color: c.label.secondary,
  cursor: 'pointer',
  selectors: { '&:hover': { color: c.label.primary } },
})

/** The editing half — a bare input inside the field's chrome. It restates the field's own type
 *  rather than inheriting it: an input takes its line-height from the browser, not its parent, and
 *  the caret is drawn to THAT — so inheriting the size alone leaves a caret taller than the text
 *  it sits in. */
export const input = style([
  text.body.standard,
  {
    flex: '1 1 auto',
    minWidth: 0,
    border: 'none',
    outline: 'none',
    background: 'none',
    padding: 0,
    fontFamily: 'inherit',
    color: c.label.control,
  },
])

/** What an unset path reads as — the default it falls back to, stated rather than left blank. */
export const placeholder = style([text.body.standard, { color: c.label.tertiary }])
