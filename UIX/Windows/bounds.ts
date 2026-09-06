import type { WindowBounds } from './window-base'
import type { WindowPanelBounds } from './window-panel'

// KNOB — the window's opening size and its resize floor. The floor is what a frame carrying a surface has to fit in: a title, a breadcrumb and the date lane, side by side. Exported so the showcase's replica wears the real shell instead of a copy of its numbers.
export const SETTINGS_WIN: WindowBounds = { min: { w: 620, h: 420 }, def: { w: 850, h: 600 } }
export const SETTINGS_RAIL: WindowPanelBounds = { min: 130, def: 170, max: 240 }
