import { globalStyle, keyframes, style } from '@vanilla-extract/css'
import { revealTarget } from './hover-reveal.css'

// ── Knobs ──
/** px, save `maxShare`: the pill's longest length as a share of its track, which keeps a small window's bar in proportion. */
export const SCROLLBAR = { width: 6, minLength: 32, maxLength: 240, maxShare: 0.5 } as const // KNOB

// ── Track ──
// Anchored to its scroller's box, pushed clear of any chrome its host names in --scrollbar-top and --scrollbar-right.
export const track = style({
  position: 'absolute',
  zIndex: 'var(--z-lifted)',
  top: `calc(max(anchor(top), var(--scrollbar-top, 0px)) + var(--app-inset))`,
  bottom: `calc(anchor(bottom) + var(--app-inset))`,
  right: `calc(var(--scrollbar-right, 0px) + var(--app-inset))`,
  width: SCROLLBAR.width,
  containerType: 'size',
  pointerEvents: 'none',
  selectors: { '&:not([data-overflow])': { display: 'none' } },
})

// ── Pill ──
// --scrollbar-visible is the scroller's visible share of its content; a translate percentage is the pill's own length.
const travel = keyframes({ to: { translate: '0 calc(100cqh - 100%)' } })
const wash = (state: string): string => `linear-gradient(${state}, ${state}), var(--fill-primary)`

export const pill = style([
  revealTarget,
  {
    height: `clamp(${SCROLLBAR.minLength}px, calc(100cqh * var(--scrollbar-visible, 1)), min(${SCROLLBAR.maxLength}px, ${SCROLLBAR.maxShare * 100}cqh))`,
    borderRadius: 'var(--radius-full)',
    background: 'var(--fill-secondary)',
    transition: 'opacity var(--duration-base) var(--ease-base)',
    animationName: travel,
    animationTimingFunction: 'linear',
    animationFillMode: 'both',
    '@starting-style': { opacity: 0 },
    selectors: {
      '&&:hover': { opacity: 1, pointerEvents: 'auto', background: wash('var(--state-hover)') },
      '&&[data-reveal-held]': { background: wash('var(--state-selected)') },
    },
  },
])

// ── Preference ──
globalStyle(`:root[data-scrollbar-reveal="always"] ${track}`, {
  vars: { '--reveal': '1', '--reveal-hits': 'auto' },
})
globalStyle(
  `:root[data-scrollbars="off"] ${track}, :root[data-scrollbars="pages"] ${track}:not([data-page])`,
  { display: 'none' },
)
