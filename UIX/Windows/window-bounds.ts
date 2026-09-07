import type { WindowBounds } from './window-base'
import type { WindowPanelBounds } from './window-panel'

// KNOB — the window's opening size and resize floor. Exported so the showcase's replica reads the real numbers.
export const SETTINGS_WIN: WindowBounds = { min: { w: 620, h: 420 }, def: { w: 850, h: 600 } }
export const SETTINGS_RAIL: WindowPanelBounds = { min: 130, def: 170, max: 240 }
