// Glass — Pommora's material. Import from here, not the individual files.
// One recipe (glass-base) in four tiers, brightest and clearest first:
//   GlassPane    — the chrome panes: sidebar, inspector, side slots, anchored surfaces; clear
//   GlassSurface — a Menu floating over them; a step dimmer, `solid` when it opens over another
//   GlassWindow  — that surface carrying the 90% --bg-window body — every floating window
//   GlassControls · GlassSegment — Liquid Glass for buttons and small controls
export { GlassPane, Surface } from './glass-pane'
export { GlassSurface } from './glass-surface'
export { GlassWindow } from './glass-window'
export { CONTROL_OPTICS, GlassControls, GlassSegment } from './glass-control'
export {
  GHOST_FROST,
  OUTLINE_INSET,
  SOLID_FILL,
  SURFACE_FROST,
  WINDOW_FROST,
  frostStyle,
  paneMaterial,
  type FrostParams,
} from './glass-base'
