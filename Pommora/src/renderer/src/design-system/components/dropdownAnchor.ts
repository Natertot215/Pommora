// THE anchored-dropdown geometry: a pane hung off its trigger's own box. A plain module, NOT a
// `.css.ts`: vanilla-extract permits a stylesheet to export only plain objects, arrays, strings and
// numbers, so a helper that BUILDS a declaration has to live beside the stylesheets that consume it.
import type { StyleRule } from '@vanilla-extract/css'

/** KNOB — the trigger → pane distance. PickerMenu reads it too, so its measured body-portal placement
 *  lands at exactly the remove the CSS-anchored panes hang at. */
export const DROPDOWN_GAP = 6

/** Where the pane hangs off the trigger: `center` below and centred on it, `right` below and flush to
 *  its right edge, `up` above and centred (the beak-down NotchedPane's placement). */
export type DropdownPlacement = 'center' | 'right' | 'up'

const CLEARS = `calc(100% + ${DROPDOWN_GAP}px)`
const CENTERED = { left: '50%', transform: 'translateX(-50%)' }

const PLACEMENT: Record<DropdownPlacement, StyleRule> = {
  center: { top: CLEARS, ...CENTERED },
  right: { top: CLEARS, right: 0 },
  up: { bottom: CLEARS, ...CENTERED },
}

/** `zIndex` is per-surface, not a house constant: each anchor stacks inside its own context (a picker
 *  over its host's chrome, a toolbar pane over the toolbar), so the layers aren't comparable. */
export const dropdownAnchor = (placement: DropdownPlacement, zIndex: number): StyleRule => ({
  position: 'absolute',
  ...PLACEMENT[placement],
  zIndex,
})
