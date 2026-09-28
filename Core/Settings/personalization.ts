import { z } from 'zod'
import { eachOf, numberCheck } from '../Files/decoders'
import { columnStyle, DATE_FORMATS, type TimeFormat } from '../Properties/columnStyles'
import { DEFAULT_LINK_DISPLAY, LINK_DISPLAYS } from '../Properties/properties'
import { type ColorSetting, isColorKey } from '@pommora/uix/Theme/colors'
import { type NumberRange, type SteppedRange, steppedRange } from '@pommora/uix/Utilities/clamp'

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

export const TIME_FORMAT_SETTINGS = [
  'twelveHour',
  'twentyFourHour',
] as const satisfies readonly TimeFormat[]
export type TimeFormatSetting = (typeof TIME_FORMAT_SETTINGS)[number]

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

export const HISTORY_DAYS = { ...steppedRange([7, 14, 30, 60, 90]), default: 90 }
export const HISTORY_INTERVAL = { ...steppedRange([5, 10, 15, 20]), default: 5 }
export const TAB_MIN_WIDTH = { ...steppedRange([50, 60, 70, 80, 90, 100]), default: 70 }
export const TAB_MAX_WIDTH = {
  ...steppedRange([150, 175, 200, 225, 250, 275, 300, 325, 350]),
  default: 250,
}
export const TAB_CACHE = { ...steppedRange([5, 10, 15, 20, 25]), default: 5 }

export const SCALE = steppedRange([0.5, 0.65, 0.75, 0.9, 1, 1.1, 1.25, 1.5])
export const ZOOM = { ...SCALE, default: 1 }

/** Each heading level's size in em of the page text. */
export const HEADING_SIZE_KEYS = [
  'heading1Size',
  'heading2Size',
  'heading3Size',
  'heading4Size',
  'heading5Size',
  'heading6Size',
] as const
export const HEADING_SIZE: NumberRange = { min: 0.5, max: 2.5 }

/** Resize is a viewport, never a scale — a view embed normalizes its table's body text to the editor's before taking the same zoom a page embed does. */
export const embedZoom = (scale: number): number => 1 + Math.log2(scale)
export const viewEmbedZoom = (scale: number): number => (15 / 13) * embedZoom(scale)

export const TENTHS_SCALE = {
  ...steppedRange([0.5, 0.6, 0.7, 0.8, 0.9, 1, 1.1, 1.2, 1.3, 1.4, 1.5]),
  default: 1,
}

// One axis for the whole preview-persistence story: 'off' disables all arming; the rest set the linger.
const PREVIEW_PERSISTENCE_VALUES = ['off', '1s', '5s', '10s', 'always'] as const
export type PreviewPersistence = (typeof PREVIEW_PERSISTENCE_VALUES)[number]

// The live pane's dismiss grace in ms; 'off' never has a live pane, and 'always' sets no timer.
export const PREVIEW_LINGER_MS: Record<PreviewPersistence, number> = {
  off: 0,
  '1s': 1000,
  '5s': 5000,
  '10s': 10000,
  always: Number.POSITIVE_INFINITY,
}

// One declaration per setting: the shape the file is read through, the type the app holds, and the value an absent key means come from the same entry, so a setting the reader forgot cannot compile.
// Every field is per-field lenient — an absent or invalid value decodes to undefined, which settingOf reads as the entry's fallback.
const setting = <
  T extends z.ZodTypeAny,
  F = undefined,
  R extends SteppedRange | undefined = undefined,
>(
  schema: T,
  fallback?: F,
  range?: R,
) => ({
  schema: schema.optional().catch(undefined),
  fallback: fallback as F,
  range: range as R,
})
const flag = (fallback: boolean) => setting(z.boolean(), fallback)
const oneOf = <
  const T extends readonly [string, ...string[]],
  F extends T[number] | undefined = undefined,
>(
  values: T,
  fallback?: F,
) => setting(z.enum(values), fallback)
const color = <S extends string>(inherit: S) =>
  setting(
    z.custom<ColorSetting<S>>((v) => typeof v === 'string' && (v === inherit || isColorKey(v))),
    inherit,
  )
const stepped = (range: SteppedRange & { default: number }) =>
  setting(numberCheck(range, true), range.default, range)
const scaled = (fallback: number) => setting(numberCheck(SCALE), fallback, SCALE)
const headingSize = (fallback: number) => setting(numberCheck(HEADING_SIZE), fallback)
// Each entry stands on its own: a malformed one drops, and an empty list is the absent list.
const nonEmptyStrings = () => setting(eachOf(z.string().min(1)).refine((a) => a.length > 0))
const iconsByKind = () =>
  setting(
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

const SETTINGS = {
  accent: color<'system'>('system'),
  connectionColor: color<'accent'>('accent'),
  externalLinkColor: color<'system'>('system'),
  checkboxColor: color<'accent'>('accent'),
  highlightColor: color<'accent'>('accent'),
  codeColor: color<'default'>('default'),
  // Display only: the strike is drawn, never written, so the file stays the plain `- [x]` it was.
  muteCheckedItems: flag(false),
  hideChevrons: flag(false),
  repairOnOpen: flag(false),
  capitalizeMetadata: flag(false),
  outlinerLines: flag(false),
  titleIcon: flag(false),
  codeblockLineCount: flag(false),
  htmlShortcuts: flag(false),
  navCloseOnSelect: flag(true),
  removeTitleOnLinkChange: flag(true),
  aliasPickerOnCommit: flag(true),
  defaultIcons: iconsByKind(),
  iconFavorites: nonEmptyStrings(),
  setPlacement: oneOf(PLACEMENTS, 'top'),
  subSetPlacement: oneOf(PLACEMENTS, 'top'),
  newPagePlacement: oneOf(PLACEMENTS, 'bottom'),
  newFolderPlacement: oneOf(PLACEMENTS, 'bottom'),
  newSpacePlacement: oneOf(PLACEMENTS, 'bottom'),
  sidebarMode: oneOf(SIDEBAR_MODES, 'collections'),
  // Reveals the surfaces that are still being built; off, they are absent rather than disabled.
  experimentalFeatures: flag(false),
  revealTabBarOnHover: flag(false),
  tabOpenBehavior: oneOf(TAB_OPEN_BEHAVIORS, 'overtake'),
  matrixOpenIn: oneOf(MATRIX_OPEN_INS, 'tab'),
  windowPageBanners: flag(false),
  windowSpaceBanners: flag(false),
  windowNavBanner: flag(false),
  tabTakeFocus: flag(true),
  tabMinWidth: stepped(TAB_MIN_WIDTH),
  tabMaxWidth: stepped(TAB_MAX_WIDTH),
  tabCache: stepped(TAB_CACHE),
  pauseMediaOnTabSwitch: flag(true),
  nativeHighlight: flag(false),
  connectionsOpenInPreview: flag(false),
  plainUnresolvedLinks: flag(false),
  headingLinkStyle: oneOf(HEADING_LINK_STYLES, 'page-heading'),
  inPageHeadingResolution: oneOf(IN_PAGE_HEADING_RESOLUTIONS, 'explicit'),
  ribbonOrder: nonEmptyStrings(),
  previewPersistence: oneOf(PREVIEW_PERSISTENCE_VALUES, '1s'),
  dismissPreviewOnPointer: flag(false),
  fileHistory: flag(true),
  historyDays: stepped(HISTORY_DAYS),
  historyInterval: stepped(HISTORY_INTERVAL),
  permanentDelete: flag(false),
  // Off skips the confirmation only where nothing owns a schema: a page, a tile, a bare folder.
  confirmDeletion: flag(true),
  dateFormat: oneOf(DATE_FORMATS, 'full'),
  timeFormat: oneOf(TIME_FORMAT_SETTINGS, 'twelveHour'),
  trashColumnStyle: setting(columnStyle),
  pasteLinkIntoText: flag(false),
  defaultLinkFormat: oneOf(LINK_DISPLAYS, DEFAULT_LINK_DISPLAY),
  openLinksInApp: flag(false),
  webZoomFactor: scaled(1),
  embedScale: scaled(0.9),
  // A tile states its own size through Embed Scale, so this stops at a tile's edge.
  editorScale: scaled(1),
  heading1Size: headingSize(1.8),
  heading2Size: headingSize(1.6),
  heading3Size: headingSize(1.4),
  heading4Size: headingSize(1.2),
  heading5Size: headingSize(1.1),
  heading6Size: headingSize(1),
  citationsShown: flag(false),
  jumpToCitation: flag(true),
  transformDashes: flag(true),
  transformArrows: flag(true),
  transformEquations: flag(true),
  transformEllipses: flag(true),
  transformCallouts: flag(true),
  transformSections: flag(false),
  transformBullets: flag(false),
  pairBrackets: flag(true),
  pairMarkers: flag(true),
  pairQuotes: flag(true),
  wrapSelections: flag(false),
  deletePairsTogether: flag(true),
  exitPairsOnEnter: flag(true),
}
type Settings = typeof SETTINGS
export type SettingKey = keyof Settings
export type SettingValue<K extends SettingKey> =
  | Exclude<Personalization[K], undefined>
  | Settings[K]['fallback']

const eachSetting = <V>(pick: (s: Settings[SettingKey]) => V): Record<SettingKey, V> =>
  Object.fromEntries(Object.entries(SETTINGS).map(([k, s]) => [k, pick(s)])) as Record<
    SettingKey,
    V
  >

export const personalizationSchema = z.object(
  eachSetting((s) => s.schema) as { [K in SettingKey]: Settings[K]['schema'] },
)

export type Personalization = z.infer<typeof personalizationSchema>

export const settingValue = <K extends SettingKey>(key: K, value: unknown): Personalization[K] =>
  personalizationSchema.shape[key].parse(value) as Personalization[K]

export const SETTING_DEFAULTS = eachSetting((s) => s.fallback) as {
  [K in SettingKey]: Settings[K]['fallback']
}

export const SETTING_RANGES = eachSetting((s) => s.range) as {
  [K in SettingKey]: Settings[K]['range']
}
export type SteppedKey = {
  [K in SettingKey]: Settings[K]['range'] extends SteppedRange ? K : never
}[SettingKey]

export const settingOf = <K extends SettingKey>(p: Personalization, key: K): SettingValue<K> =>
  (p[key] ?? SETTING_DEFAULTS[key]) as SettingValue<K>

// A Collection's Sets sit above or below its pages by setPlacement, a Set's by subSetPlacement.
export const placementOf = (p: Personalization, containerKind: string): Placement =>
  settingOf(p, containerKind === 'collection' ? 'setPlacement' : 'subSetPlacement')
