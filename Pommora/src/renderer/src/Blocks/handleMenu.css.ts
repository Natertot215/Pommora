import { style } from '@vanilla-extract/css'
import { vars as colorVars } from '@renderer/DesignSystem/Tokens/color.css'
import { font } from '@renderer/DesignSystem/Tokens/typography.css'
import { item } from '@renderer/DesignSystem/Menus/menu-base.css'

const c = colorVars.color

// ── KNOB — the picker's ONE pane width. The slider viewport follows the active slot's
// measured width, so unequal panes would shift the anchored picker on every slide;
// locking every pane to one width kills the shift and sets the menu's footprint.
export const PANE_W = 120
export const PANE_MAX_W = 180 // KNOB

export const pane = style({
  display: 'flex',
  flexDirection: 'column',
  minWidth: PANE_W,
  maxWidth: PANE_MAX_W,
  boxSizing: 'border-box',
})

export const titleField = style([
  item,
  {
    flexDirection: 'column',
    alignItems: 'stretch',
    gap: '1px',
    width: '100%',
    boxSizing: 'border-box',
    margin: '0 0 3px',
    border: 'var(--width-100) solid var(--accent-stroke)',
    borderRadius: '5px',
    background: 'none',
    textAlign: 'left',
    cursor: 'pointer',
    overflow: 'hidden',
  },
])
export const titleFieldText = style({ flex: 1, minWidth: 0, color: c.label.control })
export const titleFieldLoc = style([
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

export const scaleMenu = style({ minWidth: 58 })

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
