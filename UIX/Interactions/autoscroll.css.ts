import { globalStyle } from '@vanilla-extract/css'
import { AUTOSCROLL_KNOBS } from './autoscroll'

// The app-wide drag auto-scroll knobs, declared from the same map the loop reads its fallbacks
// from — so the default of every knob exists exactly once. What each one tunes is documented on
// that map (autoscroll.ts); restating it here is how the two would drift apart.
globalStyle(':root', {
  vars: Object.fromEntries(Object.values(AUTOSCROLL_KNOBS)),
})
