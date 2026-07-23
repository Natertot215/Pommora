import { style } from '@vanilla-extract/css'

/** The chassis's default close `×` — top-right inside the glass inset. A consumer with its
 *  own window CSS replaces this wholesale via `closeClassName`. */
export const close = style({
  position: 'absolute',
  top: 'calc(var(--glass-inset) + 4px)',
  right: 'calc(var(--glass-inset) + 4px)',
  zIndex: 3,
  display: 'flex',
  padding: 3,
  borderRadius: 6,
  border: 'none',
  background: 'none',
  color: 'var(--label-secondary)',
  cursor: 'pointer',
  selectors: {
    '&:hover': { background: 'var(--state-hover)' },
  },
})

/** The optional title area — leading text in the chassis's top strip, clear of the `×`. */
export const title = style({
  position: 'absolute',
  top: 'calc(var(--glass-inset) + 6px)',
  left: 'calc(var(--glass-inset) + 12px)',
  right: 'calc(var(--glass-inset) + 32px)',
  zIndex: 2,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  color: 'var(--label-primary)',
})
