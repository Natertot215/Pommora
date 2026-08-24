// A plain module, NOT `.css.ts`: vanilla-extract only lets a stylesheet export plain values, so a
// helper that BUILDS a declaration has to live beside the stylesheets that consume it.
import type { StyleRule } from '@vanilla-extract/css'

/** KNOB — the trigger → pane distance. PickerMenu reads it too, so its measured body-portal
 *  placement lands at exactly the gap the CSS-anchored panes hang at. */
export const DROPDOWN_GAP = 6

export type DropdownPlacement = 'center' | 'right' | 'up'

const CLEARS = `calc(100% + ${DROPDOWN_GAP}px)`
const CENTERED = { left: '50%', transform: 'translateX(-50%)' }

const PLACEMENT: Record<DropdownPlacement, StyleRule> = {
  center: { top: CLEARS, ...CENTERED },
  right: { top: CLEARS, right: 0 },
  up: { bottom: CLEARS, ...CENTERED },
}

/** `zIndex` is per-surface, not a house constant — each anchor stacks inside its own context, so
 *  the layers aren't comparable. Callers pass the `stack.local.*` step that names their lift. */
export const dropdownAnchor = (placement: DropdownPlacement, zIndex: number): StyleRule => ({
  position: 'absolute',
  ...PLACEMENT[placement],
  zIndex,
})
