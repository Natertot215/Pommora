// The house folder-path field — a lead glyph, the stored path as a run of segments, and a browse
// affordance. It composes the house field chrome rather than restating it, and holds its own width
// at its trailing edge like every other control: a deep path is eclipsed by the run's own fade
// rather than pushing its row wider.
import { style } from '@vanilla-extract/css'
import { hairlineField } from './interactionField.css'
import { focusRing } from './fieldRing'
import { vars as colorVars } from '../tokens/color.css'
import { text } from '../tokens/typography.css'

const c = colorVars.color

/** KNOB — the field's resting width. Wide enough for a two-segment path at the default type;
 *  anything longer eclipses rather than growing the row. */
const FIELD_WIDTH = '220px'

const LEAD_GAP = '6px'

export const pathField = style([
  hairlineField,
  {
    width: FIELD_WIDTH,
    cursor: 'text',
    ...focusRing('within'),
  },
])

/** The path's one leading glyph. Every segment here is a folder, so repeating the icon per segment
 *  would read as noise — the run is what says "these are nested". */
export const leadIcon = style({ marginRight: LEAD_GAP, flexShrink: 0, color: c.label.secondary })

/** The browse affordance, at the field's trailing edge. `auto` margin rather than a gap so it
 *  stays flush no matter how short the path is. */
export const browse = style({
  marginLeft: 'auto',
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
