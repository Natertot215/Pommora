import { z } from 'zod'
import { DATE_FORMATS } from '../Properties/columnStyles'
import { LINK_DISPLAYS } from '../Properties/properties'
import { type ColorSetting, isColorKey } from '@pommora/uix/Theme/colors'
import { clamp } from '@pommora/uix/Utilities/clamp'

export const HEADING_LINK_STYLES = ['page-heading', 'heading-only'] as const
export type HeadingLinkStyle = (typeof HEADING_LINK_STYLES)[number]
export const HEADING_LINK_STYLE_LABELS: Record<HeadingLinkStyle, string> = {
  'page-heading': 'Page & Heading',
  'heading-only': 'Heading Only',
}
export const IN_PAGE_HEADING_RESOLUTIONS = ['explicit', 'automatic'] as const
export type InPageHeadingResolution = (typeof IN_PAGE_HEADING_RESOLUTIONS)[number]
export const IN_PAGE_HEADING_RESOLUTION_LABELS: Record<InPageHeadingResolution, string> = {
  explicit: 'Explicit',
  automatic: 'Automatic',
}

export const TIME_FORMAT_SETTINGS = ['twelveHour', 'twentyFourHour'] as const
export type TimeFormatSetting = (typeof TIME_FORMAT_SETTINGS)[number]
export const DEFAULT_TIME_FORMAT: TimeFormatSetting = 'twelveHour'

export const TIME_FORMAT_LABELS: Record<TimeFormatSetting, string> = {
  twelveHour: '12 Hours',
  twentyFourHour: '24 Hours',
}

const ENTITY_ICON_KINDS = ['collection', 'set', 'space', 'page', 'context'] as const
export type EntityIconKind = (typeof ENTITY_ICON_KINDS)[number]

const PLACEMENTS = ['top', 'bottom'] as const
export type Placement = (typeof PLACEMENTS)[number]

const SIDEBAR_MODES = ['collections', 'contexts', 'agenda'] as const
export type SidebarMode = (typeof SIDEBAR_MODES)[number]
// Modes still being built, present only with Experimental Features on.
export const EXPERIMENTAL_MODES: ReadonlySet<string> = new Set<SidebarMode>(['agenda'])

export const TAB_OPEN_BEHAVIORS = ['overtake', 'newtab'] as const
export type TabOpenBehavior = (typeof TAB_OPEN_BEHAVIORS)[number]

export const MATRIX_OPEN_INS = ['tab', 'window'] as const
export type MatrixOpenIn = (typeof MATRIX_OPEN_INS)[number]

const ladder = (steps: readonly number[]) => ({
  steps,
  min: steps[0] as number,
  max: steps[steps.length - 1] as number,
})
type Bounds = { min: number; max: number }
const coerceIn =
  ({ min, max }: Bounds) =>
  (v: unknown, fallback: number): number =>
    typeof v !== 'number' || !Number.isFinite(v) ? fallback : clamp(v, min, max)

export const HISTORY_DAYS = { ...ladder([7, 14, 30, 60, 90]), default: 90 }
export const HISTORY_INTERVAL = { ...ladder([5, 10, 15, 20]), default: 5 }
export const TAB_MIN_WIDTH = { ...ladder([50, 60, 70, 80, 90, 100]), default: 70 }
export const TAB_MAX_WIDTH = {
  ...ladder([150, 175, 200, 225, 250, 275, 300, 325, 350]),
  default: 250,
}
export const TAB_CACHE = { ...ladder([5, 10, 15, 20, 25]), default: 5 }

export const SCALE = ladder([0.5, 0.65, 0.75, 0.9, 1, 1.1, 1.25, 1.5])
export const coerceScale = coerceIn(SCALE)
export const WEB_ZOOM_DEFAULT = 1
export const EDITOR_SCALE_DEFAULT = 1

/** Each heading level's size in em of the page text; the fallback is the stylesheet's own. */
export const HEADING_SIZE_KEYS = [
  'heading1Size',
  'heading2Size',
  'heading3Size',
  'heading4Size',
  'heading5Size',
  'heading6Size',
] as const
type HeadingSizeKey = (typeof HEADING_SIZE_KEYS)[number]
export const HEADING_SIZE_DEFAULTS: Record<HeadingSizeKey, number> = {
  heading1Size: 1.8,
  heading2Size: 1.6,
  heading3Size: 1.4,
  heading4Size: 1.2,
  heading5Size: 1.1,
  heading6Size: 1,
}
export const HEADING_SIZE: Bounds = { min: 0.5, max: 2.5 }
export const coerceHeadingSize = coerceIn(HEADING_SIZE)

/** Resize is a viewport, never a scale — a view embed normalizes its table's body text to the editor's before taking the same zoom a page embed does. */
export const EMBED_SCALE_DEFAULT = 0.9
export const embedZoom = (scale: number): number => 1 + Math.log2(scale)
export const viewEmbedZoom = (scale: number): number => (15 / 13) * embedZoom(scale)

export const TENTHS_SCALE = {
  ...ladder([0.5, 0.6, 0.7, 0.8, 0.9, 1, 1.1, 1.2, 1.3, 1.4, 1.5]),
  default: 1,
}
export const coerceTenthsScale = coerceIn(TENTHS_SCALE)

// One axis for the whole preview-persistence story: 'off' disables all arming; the rest set the linger.
const PREVIEW_PERSISTENCE_VALUES = ['off', '1s', '5s', '10s', 'always'] as const
export type PreviewPersistence = (typeof PREVIEW_PERSISTENCE_VALUES)[number]
export const PREVIEW_PERSISTENCE_DEFAULT: PreviewPersistence = '1s'

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

// One declaration per setting: the shape the file is read through and the type the app holds are the same object, so a setting the reader forgot cannot compile.
// Every field is per-field lenient — an absent or invalid value decodes to undefined, which every consumer reads as the built-in default.
const lenient = <T extends z.ZodTypeAny>(schema: T) => schema.optional().catch(undefined)
const flag = () => lenient(z.boolean())
const oneOf = <const T extends readonly [string, ...string[]]>(values: T) => lenient(z.enum(values))
const color = <S extends string>(inherit: S) =>
  lenient(
    z.custom<ColorSetting<S>>((v) => typeof v === 'string' && (v === inherit || isColorKey(v))),
  )
// Only a stored number takes the range; anything else leaves the key unwritten.
const bounded = ({ min, max }: Bounds, round = false) =>
  lenient(z.number().transform((n) => clamp(round ? Math.round(n) : n, min, max)))
const stepped = (range: Bounds) => bounded(range, true)
const scaled = () => bounded(SCALE)
const headingSize = () => bounded(HEADING_SIZE)
// Each entry stands on its own: a malformed one drops, and an empty list is the absent list.
const nonEmptyStrings = () =>
  lenient(
    z
      .array(z.unknown())
      .transform((a) => a.filter((v): v is string => typeof v === 'string' && v.length > 0))
      .refine((a) => a.length > 0),
  )
const iconsByKind = () =>
  lenient(
    z
      .record(z.string(), z.unknown())
      .transform(
        (r): Partial<Record<EntityIconKind, string>> =>
          Object.fromEntries(
            ENTITY_ICON_KINDS.flatMap((k) =>
              typeof r[k] === 'string' && r[k].length > 0 ? [[k, r[k]]] : [],
            ),
          ),
      )
      .refine((r) => Object.keys(r).length > 0),
  )

export const personalizationSchema = z.object({
  accent: color<'system'>('system'),
  connectionColor: color<'accent'>('accent'),
  externalLinkColor: color<'system'>('system'),
  checkboxColor: color<'accent'>('accent'),
  highlightColor: color<'accent'>('accent'),
  codeColor: color<'default'>('default'),
  // Display only: the strike is drawn, never written, so the file stays the plain `- [x]` it was.
  muteCheckedItems: flag(),
  hideChevrons: flag(),
  repairOnOpen: flag(),
  capitalizeMetadata: flag(),
  outlinerLines: flag(),
  titleIcon: flag(),
  codeblockLineCount: flag(),
  navCloseOnSelect: flag(),
  removeTitleOnLinkChange: flag(),
  aliasPickerOnCommit: flag(),
  defaultIcons: iconsByKind(),
  iconFavorites: nonEmptyStrings(),
  setPlacement: oneOf(PLACEMENTS),
  subSetPlacement: oneOf(PLACEMENTS),
  newPagePlacement: oneOf(PLACEMENTS),
  newFolderPlacement: oneOf(PLACEMENTS),
  newSpacePlacement: oneOf(PLACEMENTS),
  sidebarMode: oneOf(SIDEBAR_MODES),
  // Reveals the surfaces that are still being built; off, they are absent rather than disabled.
  experimentalFeatures: flag(),
  revealTabBarOnHover: flag(),
  tabOpenBehavior: oneOf(TAB_OPEN_BEHAVIORS),
  matrixOpenIn: oneOf(MATRIX_OPEN_INS),
  windowPageBanners: flag(),
  windowSpaceBanners: flag(),
  windowNavBanner: flag(),
  tabTakeFocus: flag(),
  tabMinWidth: stepped(TAB_MIN_WIDTH),
  tabMaxWidth: stepped(TAB_MAX_WIDTH),
  tabCache: stepped(TAB_CACHE),
  pauseMediaOnTabSwitch: flag(),
  nativeHighlight: flag(),
  connectionsOpenInPreview: flag(),
  plainUnresolvedLinks: flag(),
  headingLinkStyle: oneOf(HEADING_LINK_STYLES),
  inPageHeadingResolution: oneOf(IN_PAGE_HEADING_RESOLUTIONS),
  ribbonOrder: nonEmptyStrings(),
  previewPersistence: oneOf(PREVIEW_PERSISTENCE_VALUES),
  dismissPreviewOnPointer: flag(),
  fileHistory: flag(),
  historyDays: stepped(HISTORY_DAYS),
  historyInterval: stepped(HISTORY_INTERVAL),
  permanentDelete: flag(),
  // Off skips the confirmation only where nothing owns a schema: a page, a tile, a bare folder.
  confirmDeletion: flag(),
  dateFormat: oneOf(DATE_FORMATS),
  timeFormat: oneOf(TIME_FORMAT_SETTINGS),
  trashDateFormat: oneOf(DATE_FORMATS),
  trashHideTime: flag(),
  pasteLinkIntoText: flag(),
  defaultLinkFormat: oneOf(LINK_DISPLAYS),
  openLinksInApp: flag(),
  webZoomFactor: scaled(),
  embedScale: scaled(),
  // A tile states its own size through Embed Scale, so this stops at a tile's edge.
  editorScale: scaled(),
  heading1Size: headingSize(),
  heading2Size: headingSize(),
  heading3Size: headingSize(),
  heading4Size: headingSize(),
  heading5Size: headingSize(),
  heading6Size: headingSize(),
  citationsShown: flag(),
  jumpToCitation: flag(),
  transformDashes: flag(),
  transformArrows: flag(),
  transformEquations: flag(),
  transformEllipses: flag(),
  transformCallouts: flag(),
  transformSections: flag(),
  transformBullets: flag(),
  pairBrackets: flag(),
  pairMarkers: flag(),
  pairQuotes: flag(),
  wrapSelections: flag(),
  deletePairsTogether: flag(),
  exitPairsOnEnter: flag(),
})

export type Personalization = z.infer<typeof personalizationSchema>

// A Collection's Sets sit above or below its pages by setPlacement, a Set's by subSetPlacement.
export const placementOf = (p: Personalization, containerKind: string): Placement =>
  p[containerKind === 'collection' ? 'setPlacement' : 'subSetPlacement'] ?? 'top'
