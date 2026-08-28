import { style } from '@vanilla-extract/css'

/** The slider's hit strip — hosts the ProgressBar track + the glass knob riding over it. */
export const strip = style({
  position: 'relative',
  display: 'flex',
  alignItems: 'center',
  width: 160, // KNOB
  padding: '6px 0',
  touchAction: 'none',
})

/** The knob slot — positioned on the fill edge; holds the glass-wrapped fill (the Switch's knob).
 *  `--slider-knob-scale` is the KNOB — it zooms the whole knob (glass + fill + radius together);
 *  a consumer sets it on the slider's container to resize the knob without touching the strip. */
export const knob = style({
  position: 'absolute',
  display: 'flex',
  transform: 'translateX(-50%)',
  pointerEvents: 'none',
  zoom: 'var(--slider-knob-scale, 0.75)',
})

/** The knob fill — the Switch knob's exact aspect + fill. */
export const knobFill = style({
  display: 'block',
  width: '26px',
  height: '18px',
  borderRadius: '9px',
  background: 'var(--label-control)',
})

export const readout = style({ flexShrink: 0 })
