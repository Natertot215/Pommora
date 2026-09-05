import type { SelectionState } from '../Navigation/navRef'

/** A content-view rectangle (DIP, viewport-relative) the renderer measures for a thumbnail
 *  capture. */
export interface ThumbRect {
  x: number
  y: number
  width: number
  height: number
  /** DIP height of the toolbar band overlapping the shot's top — overpainted so its chrome
   *  doesn't bake in. `maskFill` picks the fill: `banner` copies the banner up over it (reads
   *  continuous); `window` fills the bannerless empty strip. */
  maskTop?: number
  maskFill?: 'banner' | 'window'
}

/** Persisted as a foreign `subfield` key in settings.json. */
export interface SubfieldConfig {
  /** Absent kinds fall back to the built-in defaults. */
  order: Partial<Record<SelectionState['kind'], string[]>>
  /** All views share one. */
  expanded: boolean
}

export type NavViewMode = 'list' | 'gallery'

/** Persisted as a foreign `navViewModes` key in settings.json. Kept SEPARATE per surface: the
 *  floating NavWindow and the in-pane NavView each own theirs. */
export interface NavViewModes {
  window: NavViewMode
  view: NavViewMode
}
