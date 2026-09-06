// Not a `.css.ts`: vanilla-extract stylesheets may only export plain values, never a builder.
import type { StyleRule } from '@vanilla-extract/css'

/** KNOB — the trigger → pane distance; PickerMenu reads it too, so its portal placement lands at the same gap. */
export const MENU_GAP = 6

type MenuPlacement = 'center' | 'right' | 'up'

const CLEARS = `calc(100% + ${MENU_GAP}px)`
const CENTERED = { left: '50%', transform: 'translateX(-50%)' }

const PLACEMENT: Record<MenuPlacement, StyleRule> = {
  center: { top: CLEARS, ...CENTERED },
  right: { top: CLEARS, right: 0 },
  up: { bottom: CLEARS, ...CENTERED },
}

/** `zIndex` is per-surface: each anchor stacks inside its own context, so the layers aren't comparable. */
export const menuAnchor = (placement: MenuPlacement, zIndex: number): StyleRule => ({
  position: 'absolute',
  ...PLACEMENT[placement],
  zIndex,
})
