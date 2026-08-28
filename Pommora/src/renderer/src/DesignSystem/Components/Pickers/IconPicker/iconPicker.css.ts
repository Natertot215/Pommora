import { style } from '@vanilla-extract/css'
import { vars } from '../../../Tokens'
import { focusRing } from '../../../Components/Fields/fieldRing'
import { input } from '../../../Components/Fields/fields.css'
import { rowShell, separatorLine } from '../../../Menus/menu-base.css'

export const CELL = 34
const GUTTER = 8

export const content = style({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'stretch',
  gap: GUTTER,
  padding: GUTTER,
  width: 'var(--icon-picker-w, 224px)',
  boxSizing: 'border-box',
})

export const search = style([input, { textAlign: 'left' }, focusRing()])

export const separator = style([separatorLine, { flex: '0 0 auto' }])

export const favorites = style({
  width: '100%',
  flex: '0 0 auto',
  boxSizing: 'border-box',
  padding: '2px 4px',
  border: 'var(--width-150) solid var(--border-base)',
  borderRadius: 8,
  overflow: 'hidden',
})

export const favScroll = style({
  display: 'flex',
  gap: 2,
  overflowX: 'auto',
  overflowY: 'hidden',
  scrollbarWidth: 'none',
  vars: { '--over-scroll-fade': 'var(--fade-base)' },
})

/** Explicit width so `cols` measures a real box — a bare flex item collapses to its absolute rows'
 *  zero width. */
export const grid = style({
  position: 'relative',
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
  width: '100%',
  height: 'var(--icon-picker-h, 204px)',
  overflowY: 'auto',
  overflowX: 'hidden',
  scrollbarWidth: 'none',
  vars: { '--over-scroll-fade': 'var(--fade-base)' },
})

export const list = style({ position: 'relative', width: '100%', flex: '0 0 auto' })

export const row = style({ position: 'absolute', top: 0, left: 0, display: 'flex' })

export const cell = style([
  rowShell,
  {
    width: CELL,
    height: CELL,
    flex: '0 0 auto',
    display: 'grid',
    placeItems: 'center',
    border: 'none',
    background: 'transparent',
    color: vars.color.label.control,
    fontSize: vars.size.icon.title2,
  },
])

export const cellSelected = style({
  color: 'var(--accent)',
  background: 'var(--accent-fill)',
})
