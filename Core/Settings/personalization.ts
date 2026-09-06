import type { DateFormat } from '../Properties/columnStyles'
import type { LinkDisplay } from '../Properties/properties'
import type {
  AccentSetting,
  CheckboxColorSetting,
  CodeColorSetting,
  ConnectionColorSetting,
  ExternalLinkColorSetting,
  HighlightColorSetting,
} from '@pommora/uix/Theme/colors'
import { clamp } from '@pommora/uix/Utilities/clamp'

export const TIME_FORMAT_SETTINGS = ['twelveHour', 'twentyFourHour'] as const
export type TimeFormatSetting = (typeof TIME_FORMAT_SETTINGS)[number]
export const DEFAULT_TIME_FORMAT: TimeFormatSetting = 'twelveHour'

export const TIME_FORMAT_LABELS: Record<TimeFormatSetting, string> = {
  twelveHour: '12 Hours',
  twentyFourHour: '24 Hours',
}

export const ENTITY_ICON_KINDS = ['collection', 'set', 'space', 'page', 'context'] as const
export type EntityIconKind = (typeof ENTITY_ICON_KINDS)[number]

export type FolderPlacement = 'top' | 'bottom'

export type SidebarMode = 'collections' | 'contexts' | 'agenda'
export type PickerSelection = 'outlined' | 'checked'

export type TabOpenBehavior = 'overtake' | 'newtab'

export const HISTORY_DAY_STEPS = [7, 14, 30, 60, 90] as const
export const HISTORY_DAYS = {
  min: HISTORY_DAY_STEPS[0],
  max: HISTORY_DAY_STEPS[HISTORY_DAY_STEPS.length - 1],
  default: 90,
} as const
export const HISTORY_INTERVAL_STEPS = [5, 10, 15, 20] as const
export const HISTORY_INTERVAL = {
  min: HISTORY_INTERVAL_STEPS[0],
  max: HISTORY_INTERVAL_STEPS[HISTORY_INTERVAL_STEPS.length - 1],
  default: 5,
} as const
export const TAB_MIN_WIDTH_STEPS = [50, 60, 70, 80, 90, 100] as const
export const TAB_MIN_WIDTH = {
  min: TAB_MIN_WIDTH_STEPS[0],
  max: TAB_MIN_WIDTH_STEPS[TAB_MIN_WIDTH_STEPS.length - 1],
  default: 70,
} as const
export const TAB_MAX_WIDTH_STEPS = [150, 175, 200, 225, 250, 275, 300, 325, 350] as const
export const TAB_MAX_WIDTH = {
  min: TAB_MAX_WIDTH_STEPS[0],
  max: TAB_MAX_WIDTH_STEPS[TAB_MAX_WIDTH_STEPS.length - 1],
  default: 250,
} as const
export const TAB_CACHE_STEPS = [5, 10, 15, 20] as const
export const TAB_CACHE = {
  min: TAB_CACHE_STEPS[0],
  max: TAB_CACHE_STEPS[TAB_CACHE_STEPS.length - 1],
  default: 5,
} as const
export function clampInt(v: unknown, min: number, max: number): number | undefined {
  return typeof v === 'number' && Number.isFinite(v) ? clamp(Math.round(v), min, max) : undefined
}
export interface Personalization {
  accent?: AccentSetting
  connectionColor?: ConnectionColorSetting
  externalLinkColor?: ExternalLinkColorSetting
  checkboxColor?: CheckboxColorSetting
  highlightColor?: HighlightColorSetting
  codeColor?: CodeColorSetting
  /** Display only: the strike is drawn, never written, so the file stays the plain `- [x]` it was. */
  muteCheckedItems?: boolean
  hideChevrons?: boolean
  repairOnOpen?: boolean
  capitalizeMetadata?: boolean
  outlinerLines?: boolean
  codeblockLineCount?: boolean
  navCloseOnSelect?: boolean
  removeTitleOnLinkChange?: boolean
  aliasPickerOnCommit?: boolean
  defaultIcons?: Partial<Record<EntityIconKind, string>>
  favoriteIcons?: string[]
  setPlacement?: FolderPlacement
  subSetPlacement?: FolderPlacement
  sidebarMode?: SidebarMode
  revealTabBarOnHover?: boolean
  tabOpenBehavior?: TabOpenBehavior
  tabTakeFocus?: boolean
  tabMinWidth?: number
  tabMaxWidth?: number
  tabCache?: number
  pauseMediaOnTabSwitch?: boolean
  nativeHighlight?: boolean
  pickerSelection?: PickerSelection
  connectionsOpenInPreview?: boolean
  plainUnresolvedLinks?: boolean
  ribbonOrder?: string[]
  interfaceScale?: number
  previewPersistence?: PreviewPersistence
  fileHistory?: boolean
  historyDays?: number
  historyInterval?: number
  permanentDelete?: boolean
  /** Off skips the confirmation only where nothing owns a schema: a page, a tile, a bare folder. */
  confirmDeletion?: boolean
  dateFormat?: DateFormat
  timeFormat?: TimeFormatSetting
  trashDateFormat?: DateFormat
  trashHideTime?: boolean
  pasteLinkIntoText?: boolean
  defaultLinkFormat?: LinkDisplay
  openLinksInApp?: boolean
  webZoomFactor?: number
  embedScale?: number
  /** A tile states its own size through Embed Scale, so this stops at a tile's edge. */
  editorScale?: number
  citationsShown?: boolean
  jumpToCitation?: boolean
}

export const SCALE_STEPS = [0.5, 0.65, 0.75, 0.9, 1, 1.1, 1.25, 1.5] as const
const SCALE_MIN = SCALE_STEPS[0]
const SCALE_MAX = SCALE_STEPS[SCALE_STEPS.length - 1]
export const WEB_ZOOM_DEFAULT = 1
export const EDITOR_SCALE_DEFAULT = 1
export function coerceScale(v: unknown, fallback: number): number {
  if (typeof v !== 'number' || !Number.isFinite(v)) return fallback
  return clamp(v, SCALE_MIN, SCALE_MAX)
}

/** Resize is a viewport, never a scale — a view embed normalizes its table's body text to the editor's before taking the same zoom a page embed does. */
export const EMBED_SCALE_DEFAULT = 0.9
export const embedZoom = (scale: number): number => 1 + Math.log2(scale)
export const viewEmbedZoom = (scale: number): number => (15 / 13) * embedZoom(scale)

export const INTERFACE_SCALE_DEFAULT = 1
export const INTERFACE_SCALE_STEPS = [0.5, 0.6, 0.7, 0.8, 0.9, 1, 1.1, 1.2, 1.3, 1.4, 1.5] as const
const INTERFACE_SCALE_MIN = INTERFACE_SCALE_STEPS[0]
const INTERFACE_SCALE_MAX = INTERFACE_SCALE_STEPS[INTERFACE_SCALE_STEPS.length - 1]
export function coerceInterfaceScale(v: unknown): number {
  if (typeof v !== 'number' || !Number.isFinite(v)) return INTERFACE_SCALE_DEFAULT
  return clamp(v, INTERFACE_SCALE_MIN, INTERFACE_SCALE_MAX)
}

// One axis for the whole preview-persistence story: 'off' disables all arming; the rest set the linger.
export type PreviewPersistence = 'off' | '1s' | '5s' | '10s' | 'always'
export const PREVIEW_PERSISTENCE_DEFAULT: PreviewPersistence = '1s'
const PREVIEW_PERSISTENCE_VALUES: readonly PreviewPersistence[] = [
  'off',
  '1s',
  '5s',
  '10s',
  'always',
]

export function coercePreviewPersistence(v: unknown): PreviewPersistence | undefined {
  return PREVIEW_PERSISTENCE_VALUES.find((p) => p === v)
}

const PREVIEW_LINGER_MS: Record<Exclude<PreviewPersistence, 'off'>, number> = {
  '1s': 1000,
  '5s': 5000,
  '10s': 10000,
  always: Number.POSITIVE_INFINITY,
}

// Live-pane dismiss grace in ms; 'off' is narrowed out by callers before this runs. 'always' yields Infinity — no timer.
export function previewLingerMs(v: Exclude<PreviewPersistence, 'off'> | undefined): number {
  return v === undefined ? 1000 : PREVIEW_LINGER_MS[v]
}
