import type { StyleRule } from '@vanilla-extract/css'

/** KNOB — trigger → pane distance; PickerMenu's portal placement reads it too. */
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
