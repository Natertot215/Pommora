import type { WindowBounds } from './WindowBase'
import type { WindowPanelBounds } from './WindowPanel'

// KNOB — the window's opening size and resize floor.
export const SETTINGS_WIN: WindowBounds = { min: { w: 620, h: 420 }, default: { w: 850, h: 600 } }
export const SETTINGS_RAIL: WindowPanelBounds = { min: 130, default: 170, max: 240 }
