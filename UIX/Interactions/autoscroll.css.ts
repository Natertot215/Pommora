import { globalStyle } from '@vanilla-extract/css'
import { AUTOSCROLL_KNOBS } from './autoscroll'

// From the same map the loop reads its fallbacks from, so each knob's default exists exactly once; what it tunes is documented there.
globalStyle(':root', {
  vars: Object.fromEntries(Object.values(AUTOSCROLL_KNOBS)),
})
