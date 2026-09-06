export interface ThumbRect {
  x: number
  y: number
  width: number
  height: number
  maskTop?: number
  maskFill?: 'banner' | 'window'
}

export interface SubfieldConfig {
  expanded: boolean
}

export type NavViewMode = 'list' | 'gallery'

export interface NavViewModes {
  window: NavViewMode
  view: NavViewMode
}
