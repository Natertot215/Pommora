import { style } from '@vanilla-extract/css'
import { vars as colorVars } from '../design-system/tokens/color.css'
import { font, truncateHoverScroll } from '../design-system/tokens/typography.css'

const c = colorVars.color

// ── KNOB — the picker's ONE pane width. The slider viewport follows the active slot's
// measured width, so unequal panes would shift the anchored picker on every slide;
// locking every pane to one width kills the shift and sets the menu's footprint.
export const PANE_W = 120
// The stretch ceiling — a pane may grow to fit content up to this, then labels truncate.
export const PANE_MAX_W = 180

export const pane = style({ minWidth: PANE_W, maxWidth: PANE_MAX_W, boxSizing: 'border-box' })

/** The page-embed title field — the source page's identity as a bordered "field" reading like an
 *  input but acting as a link: clicking it opens the page full-view. Its border wears the accent tint
 *  (accent @ tint-secondary), the same signal as the embed's own border on the surface, so the menu's
 *  "open the page" field reads as the embed it belongs to. A two-tier stack (page title over its
 *  location) with tight vertical rhythm; `textAlign: left` undoes the button's default centering; both
 *  labels ride the shared ellipsis-at-rest / scroll-on-hover mechanic. */
export const titleField = style({
  display: 'flex',
  flexDirection: 'column',
  gap: '1px',
  width: '100%',
  boxSizing: 'border-box',
  margin: '0 0 3px',
  padding: '3px 6px',
  border: '1px solid var(--accent-stroke)',
  borderRadius: '5px',
  background: 'none',
  textAlign: 'left',
  cursor: 'pointer',
  overflow: 'hidden',
  selectors: { '&:hover': { background: c.state.hover } },
})
export const titleFieldRow = style({
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
  overflow: 'hidden',
})
/** Page title — matches the menu's rows (truncateHoverScroll caps long titles). */
export const titleFieldText = style([
  truncateHoverScroll,
  {
    flex: 1,
    minWidth: 0,
    fontSize: font.scale.control.size,
    lineHeight: font.scale.control.line,
    color: c.label.control,
  },
])
/** Location sub-line — a step under the title. */
export const titleFieldLoc = style([
  truncateHoverScroll,
  {
    flex: 1,
    minWidth: 0,
    fontSize: font.scale.footnote.size,
    lineHeight: font.scale.footnote.line,
    color: c.label.secondary,
  },
])
export const titleFieldIcon = style({ selectors: { '&&': { color: c.label.secondary } } })
export const titleFieldLocIcon = style({ selectors: { '&&': { color: c.label.tertiary } } })

/** The Scale dropdown body — a tight column of the five step rows (narrower than the menu's own pane). */
export const scaleMenu = style({ minWidth: 58 })

/** The current step's check — deliberately not the row's label tone. */
/** The Scale row's trailing value + double-chevron trigger — a bare button, mirroring titleFieldLoc;
 *  the chevron a step quieter than the value. */
export const scaleTrailing = style({
  display: 'inline-flex',
  alignItems: 'center',
  gap: '2px',
  padding: 0,
  border: 'none',
  background: 'none',
  cursor: 'default',
  color: c.label.tertiary,
})
export const scaleValue = style({
  fontSize: font.scale.footnote.size,
  lineHeight: font.scale.footnote.line,
  color: c.label.secondary,
})
