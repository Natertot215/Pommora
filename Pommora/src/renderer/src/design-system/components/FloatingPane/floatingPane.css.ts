import { keyframes, style } from '@vanilla-extract/css'

const paneIn = keyframes({
  from: { opacity: 0, transform: 'scale(0.95)' },
})
const paneOut = keyframes({
  to: { opacity: 0, transform: 'scale(0.95)' },
})

/** The floating-window contract itself — fixed over the app, glass inset + radius, clipped
 *  (a parked side pane must never peek past the glass edge), scale-in on mount. The hook's
 *  inline style supplies the geometry; consumers layer their own window CSS on top. */
export const pane = style({
  position: 'fixed',
  zIndex: 1000,
  display: 'flex',
  flexDirection: 'column',
  padding: 'var(--glass-inset)',
  borderRadius: 'var(--glass-radius)',
  overflow: 'hidden',
  animation: `${paneIn} var(--disclosure) var(--ease-standard)`,
})

export const paneClosing = style({
  animation: `${paneOut} var(--disclosure) var(--ease-standard) forwards`,
  pointerEvents: 'none',
})

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
