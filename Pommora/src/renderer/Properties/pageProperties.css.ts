import { style } from '@vanilla-extract/css'
import { vars as colorVars } from '@renderer/DesignSystem/Tokens/color.css'
import { text } from '@renderer/DesignSystem/Tokens/typography.css'
import { item, titleText } from '@renderer/DesignSystem/Menus/menu-base.css'
import { growToContent } from '@renderer/DesignSystem/Menus/frame-growth'

const c = colorVars.color

/** KNOB — the pane's content-driven width ceiling. */
const PAGE_PROPERTIES_MAX_WIDTH = '350px'

export const frame = style({
  ...growToContent(PAGE_PROPERTIES_MAX_WIDTH),
  display: 'flex',
  flexDirection: 'column',
})

/** No horizontal inset of its own — the surface's shared menu gutter is the only one, so the
 *  field blocks land on the same edge as the header and its divider. */
export const rows = style({
  display: 'flex',
  flexDirection: 'column',
  gap: '8px',
  padding: '4px 0 6px',
})

/** A field block — Contexts in one, properties in the next. The fill is what separates them, so the
 *  frame carries no headings. */
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
 *  middle. */
export const value = style({
  marginLeft: 'auto',
  flex: '0 1 auto',
  minWidth: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'flex-end',
  textAlign: 'right',
})

export const empty = style([text.caption.standard])

/** Sits outside the field blocks — an ancillary affordance, not a row in either group. */
export const add = style({ alignSelf: 'flex-start', color: c.label.secondary })
