import type { DateFormat } from '../Properties/columnStyles'
import type { LinkDisplay } from '../Properties/properties'
import type {
  AccentSetting,
  CheckboxColorSetting,
  CodeColorSetting,
  ConnectionColorSetting,
  ExternalLinkColorSetting,
  HighlightColorSetting,
} from '@pommora/uix/Theme/colorSetting'
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

/** `top` (default) keeps folders above pages; `bottom` drops them below. A full folder↔page
 *  interleave is the eventual model — this flag is the interim: folders stay one contiguous
 *  block, just relocatable. */
export type FolderPlacement = 'top' | 'bottom'

/** Which surface the sidebar content column renders. Homepage is a selection, not a mode. */
export type SidebarMode = 'collections' | 'contexts' | 'agenda'
/** How a picker marks the row you're on. */
export type PickerSelection = 'outlined' | 'checked'

export type TabOpenBehavior = 'overtake' | 'newtab'

/** `personalization.historyDays` — how long a snapshot is kept, in days: the steps offered, and
 *  the range a typed value clamps into. */
export const HISTORY_DAY_STEPS = [7, 14, 30, 60, 90] as const
export const HISTORY_DAYS = {
  min: HISTORY_DAY_STEPS[0],
  max: HISTORY_DAY_STEPS[HISTORY_DAY_STEPS.length - 1],
  default: 90,
} as const
/** `personalization.historyInterval` — the least time between two snapshots of one page, in minutes. */
export const HISTORY_INTERVAL_STEPS = [5, 10, 15, 20] as const
export const HISTORY_INTERVAL = {
  min: HISTORY_INTERVAL_STEPS[0],
  max: HISTORY_INTERVAL_STEPS[HISTORY_INTERVAL_STEPS.length - 1],
  default: 5,
} as const
/** `personalization.tabMinWidth` / `tabMaxWidth` — the bounds a tab's width lands between, in
 *  pixels: the steps offered, and the range a typed value clamps into. */
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
/** `personalization.tabCache` — how many open page tabs keep their surface live before older ones
 *  fall to on-demand loading. */
export const TAB_CACHE_STEPS = [5, 10, 15, 20] as const
export const TAB_CACHE = {
  min: TAB_CACHE_STEPS[0],
  max: TAB_CACHE_STEPS[TAB_CACHE_STEPS.length - 1],
  default: 5,
} as const
export function clampInt(v: unknown, min: number, max: number): number | undefined {
  return typeof v === 'number' && Number.isFinite(v) ? clamp(Math.round(v), min, max) : undefined
}
/** The `personalization` object in `.nexus/settings.json`. Every field optional; absent = the
 *  built-in default. One schema behind one apply-map + one setter — a new toggle is a field here,
 *  a `readPersonalization` row, and an apply-map row. Icon names are bare strings so this stays free of renderer types. */
export interface Personalization {
  accent?: AccentSetting
  connectionColor?: ConnectionColorSetting
  externalLinkColor?: ExternalLinkColorSetting
  checkboxColor?: CheckboxColorSetting
  highlightColor?: HighlightColorSetting
  codeColor?: CodeColorSetting
  /** Display only: the strike is drawn, never written, so the file stays the plain `- [x]` it
   *  was. Absent = off. */
  muteCheckedItems?: boolean
  hideChevrons?: boolean
  /** Canonicalize drifted property and Context values on the pages re-read at open. */
  repairOnOpen?: boolean
  /** Present every property name Title Cased; the stored key is untouched. */
  capitalizeMetadata?: boolean
  outlinerLines?: boolean
  /** Line numbers on codeblock content lines (rendered chrome, never editable text). */
  codeblockLineCount?: boolean
  /** Absent = closes (default true). */
  navCloseOnSelect?: boolean
  /** Absent = drops (default true) — the old words describe the old page. The alias stays in
   *  that page's remembered list either way. */
  removeTitleOnLinkChange?: boolean
  /** Absent = opens (default true). Intentionally invisible on the settings surface. */
  aliasPickerOnCommit?: boolean
  defaultIcons?: Partial<Record<EntityIconKind, string>>
  /** Bare Lucide ids (kebab), in display/reorder order. */
  favoriteIcons?: string[]
  /** Depth-1 Sets vs their Collection's loose pages. */
  setPlacement?: FolderPlacement
  /** Sub-Sets (depth-2+) vs their parent Set's loose pages. */
  subSetPlacement?: FolderPlacement
  /** Absent = 'collections'. */
  sidebarMode?: SidebarMode
  /** Absent = always shown. */
  revealTabBarOnHover?: boolean
  tabOpenBehavior?: TabOpenBehavior
  tabTakeFocus?: boolean
  tabMinWidth?: number
  tabMaxWidth?: number
  /** How many open page tabs keep their surface live, within TAB_CACHE. Absent = its default. */
  tabCache?: number
  /** Absent = on. Off lets a tab's video and audio keep playing once it leaves the main view. */
  pauseMediaOnTabSwitch?: boolean
  /** Absent = Pommora draws its own text selection; true hands the paint back to the platform's. */
  nativeHighlight?: boolean
  /** Absent = `outlined`. */
  pickerSelection?: PickerSelection
  /** Wiki-link clicks open the Page Window instead of navigating; ⌘-click takes the
   *  other route. Absent = navigate. */
  connectionsOpenInPreview?: boolean
  /** How a link that leads nowhere reads. Absent = dimmed, its syntax showing; true renders it
   *  as the plain prose it's written as. */
  plainUnresolvedLinks?: boolean
  /** Bare icon keys, in display order. */
  ribbonOrder?: string[]
  /** The window zoom the nexus opens at (and ⌘0 resets to). Absent = 1.0; ⌘ +/− nudge live from
   *  it. Applied main-side (webContents zoom). */
  interfaceScale?: number
  /** Whole seconds (1–30). Absent = None: only the short pointer-travel grace. */
  hoverPreviewLinger?: number
  /** Absent = on. Off records no page snapshots on this device. */
  fileHistory?: boolean
  /** Days a snapshot is kept, within HISTORY_DAYS. Absent = its default. */
  historyDays?: number
  /** Minutes between two snapshots of one page, within HISTORY_INTERVAL. Absent = its default. */
  historyInterval?: number
  /** Absent = the artifact goes to the OS trash and the OS owns the last undo; true erases it
   *  from the machine outright. */
  permanentDelete?: boolean
  /** Absent = on. Off skips the confirmation for a page, a tile, and a folder that carries no
   *  schema of its own; a Collection, a Set, a view and a property always ask. */
  confirmDeletion?: boolean
  /** The live fallback every date renders through unless its column overrides it. Absent = `full`. */
  dateFormat?: DateFormat
  /** Absent = twelve-hour. */
  timeFormat?: TimeFormatSetting
  /** Absent = `short`. */
  trashDateFormat?: DateFormat
  /** Absent = the nexus's own time format is shown. */
  trashHideTime?: boolean
  /** Whether pasting a URL over selected text wraps that text as the link's label rather than
   *  replacing it. Absent = replaces. The inverse chord flips this. */
  pasteLinkIntoText?: boolean
  /** Absent = the whole address as its own label. */
  defaultLinkFormat?: LinkDisplay
  /** Absent = the system browser. */
  openLinksInApp?: boolean
  /** Every guest renders at the host factor times this. Absent = 1.0. */
  webZoomFactor?: number
  /** The scale embedded pages and views start at, before a tile's own Scale multiplies it.
   *  Absent = 0.9. */
  embedScale?: number
  /** Body text, chrome, and inline title as one factor. Absent = 1.0. A tile states its own
   *  size through Embed Scale, so this stops at a tile's edge rather than multiplying through it. */
  editorScale?: number
  /** Absent = hidden. A page can override this for itself, per machine, and that override
   *  outranks this. */
  citationsShown?: boolean
  /** Absent = it does. */
  jumpToCitation?: boolean
}

/** The Webpage Zoom and Embed Scale pickers and the per-tile Scale menus all offer these
 *  factors, and a hand-typed value clamps to the ramp's own ends. */
export const SCALE_STEPS = [0.5, 0.65, 0.75, 0.9, 1, 1.1, 1.25, 1.5] as const
const SCALE_MIN = SCALE_STEPS[0]
const SCALE_MAX = SCALE_STEPS[SCALE_STEPS.length - 1]
export const WEB_ZOOM_DEFAULT = 1
export const EDITOR_SCALE_DEFAULT = 1
export function coerceScale(v: unknown, fallback: number): number {
  if (typeof v !== 'number' || !Number.isFinite(v)) return fallback
  return clamp(v, SCALE_MIN, SCALE_MAX)
}

/** The scale embedded pages and views render at before a tile's own Scale multiplies it
 *  (`personalization.embedScale`). Resize is a viewport, never a scale — the factor sets the
 *  content's text level: page embeds apply it as a log-curved editor zoom; view embeds first
 *  normalize the table's body text to the editor's, then apply the same zoom, so both read at
 *  one text level. */
export const EMBED_SCALE_DEFAULT = 0.9
export const embedZoom = (scale: number): number => 1 + Math.log2(scale)
export const viewEmbedZoom = (scale: number): number => (15 / 13) * embedZoom(scale)

/** `personalization.interfaceScale`, stated as the multiplier a user reads: 1.0 is the
 *  interface at its own intended size. */
export const INTERFACE_SCALE_DEFAULT = 1
export const INTERFACE_SCALE_STEPS = [0.5, 0.6, 0.7, 0.8, 0.9, 1, 1.1, 1.2, 1.3, 1.4, 1.5] as const
const INTERFACE_SCALE_MIN = INTERFACE_SCALE_STEPS[0]
const INTERFACE_SCALE_MAX = INTERFACE_SCALE_STEPS[INTERFACE_SCALE_STEPS.length - 1]
export function coerceInterfaceScale(v: unknown): number {
  if (typeof v !== 'number' || !Number.isFinite(v)) return INTERFACE_SCALE_DEFAULT
  return clamp(v, INTERFACE_SCALE_MIN, INTERFACE_SCALE_MAX)
}

/** `personalization.hoverPreviewLinger`. Whole seconds; a hand-typed value clamps in, and zero
 *  or junk reads as None (the key's absence). */
export const HOVER_LINGER_MAX = 30
export function coerceHoverLinger(v: unknown): number | undefined {
  if (typeof v !== 'number' || !Number.isFinite(v)) return undefined
  const s = Math.round(v)
  return s >= 1 ? Math.min(HOVER_LINGER_MAX, s) : undefined
}
