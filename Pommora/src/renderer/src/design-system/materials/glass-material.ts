import type { CSSProperties } from 'react'
import { shadowStandardVar } from '../tokens/color.css'

// The Pommora glass recipe — CSS frost: a clear, slightly-dimmed blur (no fill, no
// saturate) with a glassy edge — a crisp top specular, a hairline inner ring, and a
// soft light pooling at the lower rim — so the edge reads like glass, not a flat panel.
// One source for surfaces + windows; layout (size / position / radius) is the consumer's.
//
// `--glass-outline` re-colours that edge — the tinted outline a surface wears while it's being acted
// on (a resize in flight, an active embed). One value carrying its own alpha, so the tint can never
// desynchronise from an opacity animating separately beside it.
export const frostMaterial: CSSProperties = {
  background: 'transparent', // no fill
  backdropFilter: 'blur(6px) brightness(95%)', // no saturate
  WebkitBackdropFilter: 'blur(6px) brightness(95%)',
  border: '1px solid var(--glass-outline, #FFFFFF1F)',
  transition:
    'border-color var(--duration-base) var(--ease-standard), box-shadow var(--duration-base) var(--ease-standard)',
  boxShadow: [
    'inset 0 0 0 1px var(--glass-outline, transparent)', // the tinted edge's second pass
    'inset 0 1px 0 #FFFFFF59', // top specular — the glassy edge highlight
    'inset 0 0 0 1px #FFFFFF14', // hairline inner ring
    'inset 0 -12px 18px -12px #FFFFFF14', // soft light pooling at the lower rim
    shadowStandardVar, // drop shadow — the shared --shadow-standard token
  ].join(', '),
}
