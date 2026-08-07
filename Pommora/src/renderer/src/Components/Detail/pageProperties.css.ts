import { style } from '@vanilla-extract/css'
import { vars as colorVars } from '../../design-system/tokens/color.css'
import { text } from '../../design-system/tokens/typography.css'
import { item, titleText } from '../../design-system/components/menu/menu.css'
import { growToContent } from '../../design-system/components/menu/paneGrowth'

const c = colorVars.color

/** KNOB — the pane's content-driven width ceiling. */
const PAGE_PROPERTIES_MAX_WIDTH = '350px'

export const pane = style({
  ...growToContent(PAGE_PROPERTIES_MAX_WIDTH),
  display: 'flex',
  flexDirection: 'column',
})

/** No horizontal inset of its own — the surface's shared dropdown gutter is the only one, so the
 *  field blocks land on the same edge as the header and its divider. */
export const rows = style({
  display: 'flex',
  flexDirection: 'column',
  gap: '8px',
  padding: '4px 0 6px',
})

/** A field block — Contexts in one, properties in the next. The fill is what separates them, so the
 *  leaf carries no headings. */
export const group = style({
  display: 'flex',
  flexDirection: 'column',
  padding: '2px',
  borderRadius: '8px',
  background: c.fill.tertiary,
})

/** A row IS the menu's standard row — same body size, rhythm, and hover as every other row in the
 *  surface. The field block around it is the only thing that sets these apart. */
export const row = style([item])

export const label = style([titleText, { flex: '0 1 auto' }])

/** Content-sized and pushed right, so a picker anchors to the value rather than to the row's empty
 *  middle. Capped at a share of the pane's own ceiling: past that a value scrolls inside itself
 *  instead of growing the pane further, so a chip run can never crowd the name it belongs to. */
export const value = style({
  marginLeft: 'auto',
  flex: '0 1 auto',
  minWidth: 0,
  maxWidth: `calc(${PAGE_PROPERTIES_MAX_WIDTH} * 2 / 3)`,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'flex-end',
  textAlign: 'right',
})

export const empty = style([text.caption.standard, { color: c.label.tertiary }])

/** Sits outside the field blocks — an ancillary affordance, not a row in either group. */
export const add = style([
  text.footnote.standard,
  {
    alignSelf: 'flex-start',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    padding: '2px 4px',
    border: 'none',
    borderRadius: '5px',
    background: 'none',
    color: c.label.secondary,
    cursor: 'default',
    selectors: { '&:hover': { background: c.state.hover } },
  },
])
