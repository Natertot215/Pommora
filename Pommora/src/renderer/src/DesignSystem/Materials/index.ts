// Materials — Pommora's glass. Import from here, not the individual files.
// Three frost tiers, brightest and clearest at the bottom:
//   GlassSurface — the app's fixed chrome (sidebar, inspector, side rail); clear
//   GlassPane    — anything floating over it (menus, pickers, the autocomplete); a step dimmer
//   GlassWindow  — that same pane carrying a body (settings, preview, nav, the crop modal)
// A pane opening over another pane asks GlassPane for `solid`, which adds the window's fill and
// nothing else. Liquid glass is separate: GlassControls (buttons) · GlassSegment (small controls).
export { GlassSurface } from './glass-surface'
export {
  GHOST_FROST,
  GlassPane,
  PANE_FROST,
  SOLID_FILL,
  WINDOW_FROST,
  frostStyle,
  type FrostParams,
} from './glass-pane'
export { GlassWindow } from './glass-window'
export { CONTROL_OPTICS, GlassControls } from './glass-controls'
export { GlassSegment } from './glass-segment'
export { OUTLINE_INSET, frostMaterial } from './glass-material'
