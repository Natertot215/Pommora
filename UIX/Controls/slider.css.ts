import { style } from '@vanilla-extract/css'

export const strip = style({
  position: 'relative',
  display: 'flex',
  alignItems: 'center',
  width: 160, // KNOB
  padding: '6px 0',
  touchAction: 'none',
})

/** KNOB — `--slider-knob-scale`, set on the container, zooms glass + fill + radius without touching the strip. */
export const knob = style({
  position: 'absolute',
  display: 'flex',
  transform: 'translateX(-50%)',
  pointerEvents: 'none',
  zoom: 'var(--slider-knob-scale, 0.75)',
})

export const knobFill = style({
  display: 'block',
  width: '26px',
  height: '18px',
  borderRadius: '9px',
  background: 'var(--label-control)',
})

export const readout = style({ flexShrink: 0 })
