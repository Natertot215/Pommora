import type { CSSProperties } from 'react'
import { shadowStandardVar } from '../Tokens/color.css'

// The Pommora glass recipe — CSS frost: a clear, slightly-dimmed blur (no fill, no
// saturate) with a glassy edge — a crisp top specular, a hairline inner ring, and a
// soft light pooling at the lower rim — so the edge reads like glass, not a flat panel.
// One source for surfaces + windows; layout (size / position / radius) is the consumer's.
//
// `--glass-outline` re-colors that edge — the tinted outline a surface wears while it's being acted
// on (a resize in flight, an active embed). One value carrying its own alpha, so the tint can never
// desynchronise from an opacity animating separately beside it.
/** The outline's second pass, inward — a tinted edge on a 1px border reads far fainter than the same
 *  color on the thicker borders tiles and embeds wear, and widening the border would shift
 *  everything inside it, so the weight goes where nothing can move. */
export const OUTLINE_INSET = 'inset 0 0 0 1px var(--glass-outline, transparent)'

export const frostMaterial: CSSProperties = {
  background: 'transparent',
  backdropFilter: 'blur(6px) brightness(95%)',
  WebkitBackdropFilter: 'blur(6px) brightness(95%)',
  border: 'var(--width-100) solid var(--glass-outline, #FFFFFF1F)',
  boxShadow: [
    OUTLINE_INSET,
    'inset 0 1px 0 #FFFFFF59', // top specular — the glassy edge highlight
    'inset 0 0 0 1px #FFFFFF14', // hairline inner ring
    'inset 0 -12px 18px -12px #FFFFFF14', // soft light pooling at the lower rim
    shadowStandardVar, // drop shadow — the shared --shadow-standard token
  ].join(', '),
}
