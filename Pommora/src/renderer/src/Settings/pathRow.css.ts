// The Default Asset Directory field. It composes the house field chrome rather than restating it,
// and holds its own width at the row's trailing edge like every other control — a deep path is
// eclipsed by the run's own fade rather than pushing the row wider.
import { style } from '@vanilla-extract/css'
import { field as fieldBase } from '../design-system/components/interactionField.css'
import { focusRing } from '../design-system/components/fieldRing'
import { vars as colorVars } from '../design-system/tokens/color.css'

const c = colorVars.color

/** The field's resting hairline — the same var the filter cells set. */
const restRing = { vars: { '--field-ring': c.separator.border } }

/** KNOB — the field's resting width. Wide enough for a two-segment path at the default type;
 *  anything longer eclipses rather than growing the row. */
const FIELD_WIDTH = '220px'

const LEAD_GAP = '6px'

export const pathField = style([
  fieldBase,
  {
    width: FIELD_WIDTH,
    flex: '0 0 auto',
    minWidth: 0,
    padding: '3px 6px',
    border: 'none',
    cursor: 'text',
    justifyContent: 'flex-start',
    textAlign: 'left',
    color: c.label.control,
    overflow: 'hidden',
    whiteSpace: 'nowrap',
    ...restRing,
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

/** The editing half — a bare input wearing the field's own type, since the chrome belongs to the
 *  host it sits in. */
export const input = style({
  flex: '1 1 auto',
  minWidth: 0,
  border: 'none',
  outline: 'none',
  background: 'none',
  padding: 0,
  fontFamily: 'inherit',
  fontSize: 'inherit',
  color: c.label.control,
})
