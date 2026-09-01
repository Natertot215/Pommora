// The cross-process contract. Imported by main, preload, and renderer — NO fs, NO React here.

import { SPECTRUM, type CellKey } from './theme'
import type { ContextDef } from './contexts'
import type { LinkDisplay, PropertyDefinition } from './properties'
import type { Crop, PageFrontmatter } from './schemas'
import type { DateFormat } from './columnStyles'
import type { PommoraError } from './result'
import type { SavedView } from './views'

export type NodeKind = 'space' | 'collection' | 'set' | 'page'

// greyDefault is absent by construction: it lives beside SPECTRUM, not in it.
export const SOLID_COLORS = Object.keys(SPECTRUM) as SolidColor[]
export type SolidColor = keyof typeof SPECTRUM

/** A deferring color setting: a ramp cell, a legacy solid name still on disk, or the sentinel
 *  naming what it inherits when the user has picked nothing. */
export type ColorSetting<Inherit extends string> = CellKey | SolidColor | Inherit

/** The `accent` value in .nexus/settings.json. `'system'` follows the OS accent. */
export type AccentSetting = ColorSetting<'system'>

/** Default when settings.json omits or has an invalid `accent` — a concrete spectrum color
 *  (never `system`) so it always resolves to a hex. */
export const DEFAULT_ACCENT: SolidColor = 'cyan'

/** The inline [[Title]] connection color. `'accent'` (default) tracks the app accent live via
 *  `--connection: var(--accent)`; a ramp cell pins it. */
export type ConnectionColorSetting = ColorSetting<'accent'>

/** The `[text](url)` color. `'system'` (default) tracks the OS accent live via
 *  `--link: var(--system-accent)`; a ramp cell pins it. */
export type ExternalLinkColorSetting = ColorSetting<'system'>
export type CheckboxColorSetting = ColorSetting<'accent'>
export type HighlightColorSetting = ColorSetting<'accent'>
/** `'default'` is the sentinel rather than `'red'` — red is a real pick, and the two must stay
 *  distinguishable: cleared removes the var so the theme's own red answers, while picking red
 *  pins the ramp cell. */
export type CodeColorSetting = ColorSetting<'default'>

export const TIME_FORMAT_SETTINGS = ['twelveHour', 'twentyFourHour'] as const
export type TimeFormatSetting = (typeof TIME_FORMAT_SETTINGS)[number]
export const DEFAULT_TIME_FORMAT: TimeFormatSetting = 'twelveHour'

export const TIME_FORMAT_LABELS: Record<TimeFormatSetting, string> = {
  twelveHour: '12 Hours',
  twentyFourHour: '24 Hours',
}

export const ENTITY_ICON_KINDS = ['collection', 'set', 'space', 'page', 'context'] as const
export type EntityIconKind = (typeof ENTITY_ICON_KINDS)[number]

/** `kind` is absent on a historical crumb, which is a frozen folder name rather than a live
 *  entity. */
export interface TrashCrumb {
  kind?: EntityIconKind
  title: string
}

export interface ClearReport {
  pages: number
  sidecars: number
  refused: number
}

/** A `.trash` bundle as the trash browser reads it. Main owns the parse: the renderer never sees
 *  a `.deleted` suffix, a folder stamp, or the record union. */
export interface TrashRow {
  bundlePath: string
  kind: EntityIconKind
  title: string
  /** Resolved live from the recorded parent id, so a renamed ancestor reads true. */
  crumbs: TrashCrumb[]
  /** Set when the recorded parent resolves to nothing and `crumbs` fell back to the frozen chain. */
  historical?: boolean
  /** Epoch milliseconds from the bundle's own stamp; null when it won't parse. */
  deletedAt: number | null
  /** False when restoring would refuse for want of a home — the signal to ask where instead. */
  homeResolves: boolean
}

/** `top` (default) keeps folders above pages; `bottom` drops them below. A full folder↔page
 *  interleave is the eventual model — this flag is the interim: folders stay one contiguous
 *  block, just relocatable. */
export type FolderPlacement = 'top' | 'bottom'

/** Which surface the sidebar content column renders. Homepage is a selection, not a mode. */
export type SidebarMode = 'collections' | 'contexts' | 'agenda'
/** How a picker marks the row you're on. */
export type PickerSelection = 'outlined' | 'checked'

/** The `personalization` object in `.nexus/settings.json`. Every field optional; absent = the
 *  built-in default. One schema behind one apply-map + one setter — a new toggle is a field here
 *  plus an apply-map row. Icon names are bare strings so this stays free of renderer types. */
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
  /** Absent = Pommora draws its own text selection; true hands the paint back to the platform's. */
  nativeHighlight?: boolean
  /** Absent = `outlined`. */
  pickerSelection?: PickerSelection
  /** Wiki-link clicks open the Page Preview window instead of navigating; ⌘-click takes the
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
  /** Absent = the artifact goes to the OS trash and the OS owns the last undo; true erases it
   *  from the machine outright. */
  permanentDelete?: boolean
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
  /** The scale embedded pages and views start at, before a block's own Scale multiplies it.
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

/** The one session every guest webview lives on — a sign-in anywhere authenticates every embed
 *  surface, per machine, surviving restarts. */
export const WEB_PARTITION = 'persist:pommora-web'

/** The Webpage Zoom and Embed Scale pickers and the per-block Scale menus all offer these
 *  factors, and a hand-typed value clamps to the ramp's own ends. */
export const SCALE_STEPS = [0.5, 0.65, 0.75, 0.9, 1, 1.1, 1.25, 1.5] as const
export const SCALE_MIN = SCALE_STEPS[0]
export const SCALE_MAX = SCALE_STEPS[SCALE_STEPS.length - 1]
export const WEB_ZOOM_DEFAULT = 1
export const EDITOR_SCALE_DEFAULT = 1
export function coerceScale(v: unknown, fallback: number): number {
  if (typeof v !== 'number' || !Number.isFinite(v)) return fallback
  return Math.min(SCALE_MAX, Math.max(SCALE_MIN, v))
}

/** The scale embedded pages and views render at before a block's own Scale multiplies it
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
export const INTERFACE_SCALE_MIN = INTERFACE_SCALE_STEPS[0]
export const INTERFACE_SCALE_MAX = INTERFACE_SCALE_STEPS[INTERFACE_SCALE_STEPS.length - 1]
export function coerceInterfaceScale(v: unknown): number {
  if (typeof v !== 'number' || !Number.isFinite(v)) return INTERFACE_SCALE_DEFAULT
  return Math.min(INTERFACE_SCALE_MAX, Math.max(INTERFACE_SCALE_MIN, v))
}

/** What the interface's own 1.0 is worth as a host zoom factor. The chrome is drawn a step below
 *  the browser's scale, so every site that sets zoom passes through `interfaceScaleZoom` rather than
 *  the stated multiplier directly. */
export const INTERFACE_SCALE_BASE = 0.9

export const interfaceScaleZoom = (scale: number): number => scale * INTERFACE_SCALE_BASE

/** `personalization.hoverPreviewLinger`. Whole seconds; a hand-typed value clamps in, and zero
 *  or junk reads as None (the key's absence). */
export const HOVER_LINGER_MAX = 30
export function coerceHoverLinger(v: unknown): number | undefined {
  if (typeof v !== 'number' || !Number.isFinite(v)) return undefined
  const s = Math.round(v)
  return s >= 1 ? Math.min(HOVER_LINGER_MAX, s) : undefined
}

/** The `commands` object in `.nexus/settings.json`. Keys are command ids, values are shortcut
 *  specs ("cmd+t"); an absent id falls back to its default here. */
export const DEFAULT_COMMANDS: Record<string, string> = {
  'toggle-ribbon': 'cmd+t',
  'toggle-nav': 'cmd+o',
  // Does the opposite of what the Pages settings say a plain paste does.
  'paste-inverse': 'cmd+shift+v',
}

export interface BaseNode {
  id: string
  kind: NodeKind
  /** Derived from the file/folder basename — never stored on disk. */
  title: string
  /** A symbol name; overrides the kind's default icon. */
  icon?: string
}

/** A node backed by a real file or folder on disk, carrying its nexus-relative POSIX path so a
 *  mutation can address it: the renderer sends `path` back and main resolves it under the
 *  session root — the renderer must never reconstruct the on-disk path itself. */
export interface PathNode extends BaseNode {
  path: string
  /** Only banner-bearing owners (Collections/Sets + contexts) populate it, surfaced from the
   *  sidecar `banner` field (a page's future banner rides here too — distinct from the
   *  page-level `cover`). */
  banner?: string
  /** From the sidecar `heading_icon_hidden`. Absent/false = shown. */
  headingIconHidden?: boolean
}

export interface PageNode extends PathNode {
  kind: 'page'
  /** contextId → the member's Space ids, attached at walk assembly from the raw parenthesized
   *  keys the parse retains. Absent = no links. */
  contextValues?: Record<string, string[]>
}

/** One Space — a member of a Context, backed by `.nexus/contexts/<Context>/<Space>/`. */
export interface SpaceNode extends PathNode {
  kind: 'space'
  /** Derived from the parent folder at walk. */
  contextId: string
  /** Chip-solid palette key; absent = the neutral grey Default. */
  color?: string
  contextValues?: Record<string, string[]>
}

export interface ContextGroup {
  def: ContextDef
  spaces: SpaceNode[]
}

/** Collection-owned; a Set proxies its parent Collection's value. */
export type OpenIn = 'full-page' | 'page-preview'
export type ViewButton = 'icon' | 'labeled'
export type ViewStyle = 'dropdown' | 'toolbar'

export interface SetNode extends PathNode {
  kind: 'set'
  /** Optional so a container read that stops short of the recursion still types; the walk
   *  populates it. */
  sets?: SetNode[]
  pages: PageNode[]
  /** Depth-1 Sets only; deeper Sub-Sets ignore them. */
  views?: SavedView[]
  viewButton?: ViewButton
  disclosureLocked?: boolean
}

export interface CollectionNode extends PathNode {
  kind: 'collection'
  sets: SetNode[] // rendered before pages
  pages: PageNode[]
  /** The property schema every Page inside inherits. */
  properties?: PropertyDefinition[]
  views?: SavedView[]
  openIn?: OpenIn
  viewButton?: ViewButton
  disclosureLocked?: boolean
}

/** Keyed by normalized basename — what a `[[Name.png]]` reference resolves against. Every path
 *  answering to a name is held, sorted, so display can take the first while a delete refuses to
 *  choose; holding only the winner would leave an unlink with nothing to promote. `version`
 *  moves on every change, so a file re-saved under an unchanged name is re-requested rather than
 *  left as a deep-equal map nothing repaints for. */
export interface AssetMap {
  files: Record<string, string[]>
  version: number
}

/** What both processes stand in for a map with no listing behind it — main before a nexus is
 *  open, the renderer before the first push lands. */
export const EMPTY_ASSET_MAP: AssetMap = { files: {}, version: 0 }

/** `dir` is nexus-relative like every path the renderer holds — main joins it, and a folder
 *  that's gone missing opens at the root rather than refusing. `any` widens the filter past
 *  images. */
export interface PickFileOptions {
  dir?: string
  any?: boolean
}

export interface ValueChange {
  rel: string
  pageIds: string[]
}

export type ValuesEpoch = { n: number } & (
  | { kind: 'rename'; oldKey: string; newKey: string }
  | { kind: 'container'; changes: ValueChange[] }
)

export interface NexusTree {
  /** `name` is the root folder's basename. `profileImage` names an image in the asset directory
   *  as a `[[Name.ext]]` wikilink — or, in a nexus the migration hasn't run against, a
   *  nexus-relative path. Both come from `.nexus/settings.json`. */
  nexus: {
    id: string
    rootPath: string
    name: string
    profileImage: string | null
    profileIcon?: string
    profileSubtitle: string
  }
  /** The block doc's heavy layout/blocks stay off the walk, loaded lazily by useTileDoc. */
  homepage: { banner?: string; headingIconHidden: boolean }
  /** Keyed by the image (nexus-relative path or raw web address). Absent key ⇒ the seat draws
   *  its plain image. */
  crops: Record<string, Crop>
  /** In registry order, each with its Spaces ([] on a raw/unmigrated tree — the open path
   *  migrates + seeds before anything renders). */
  collections: CollectionNode[]
  contexts: ContextGroup[]
  /** Resolved from .nexus/settings.json (defaults to DEFAULT_ACCENT). */
  accent: AccentSetting
  personalization: Personalization
  /** DEFAULT_COMMANDS overlaid with the user's on-disk overrides, so every id always resolves
   *  to a spec. */
  commands: Record<string, string>
  /** Nexus-relative folder paths the walk, the watcher, and the content index all step around. */
  excluded: string[]
  /** Nexus-relative POSIX, defaulting to `.nexus/assets`. Outside the content corpus and the
   *  tree, and watched regardless of `excluded`. */
  assetDirectory: string
  /** Nexus-wide cosmetic order (order-listed first, unlisted appended) — reserved ids included;
   *  consumers filter. */
  registry: PropertyDefinition[]
  /** A present-but-unparseable sidecar, an Unknown or unreadable page. Distinct from absence,
   *  which is a missing entry; absent when empty. */
  unreadable?: { path: string }[]
}

/** `empty` = no nexus open (show the empty state, not an error); `open` = open + read OK;
 *  `error` = a nexus is open but its tree couldn't be read. Never throws across IPC. */
export type NexusState =
  | { status: 'empty' }
  | { status: 'open'; tree: NexusTree }
  | { status: 'error'; error: PommoraError }

export type SelectionState =
  | { kind: 'none' }
  | { kind: 'homepage' }
  /** Reserved for ContextView; member selection is `space`. */
  | { kind: 'context'; id: string }
  | { kind: 'space'; id: string }
  | { kind: 'collection'; id: string }
  /** A depth-1 Set (direct child of a Collection) — the only selectable Set; deeper Sub-Sets
   *  are expand-only. Carries `path` for rename-safe reconciliation, like a page. */
  | { kind: 'set'; id: string; path: string }
  | { kind: 'page'; id: string; path: string }

/** Every `SelectionState` except the transient `none` — the live, path-carrying targets. */
export type SelectTarget = Exclude<SelectionState, { kind: 'none' }>

/** Identity only; titles, icons, and paths resolve live. */
export type NavRef =
  | { kind: 'homepage' }
  | { kind: 'context' | 'space' | 'collection' | 'set' | 'page' | 'task' | 'event'; id: string }

/** The ONE strip between a live target and anything stored, shared by both processes so the
 *  in-memory arrays, the persist payload, and the file are one shape. */
export function toNavRef(t: NavRef | SelectTarget): NavRef {
  return t.kind === 'homepage' ? { kind: 'homepage' } : { kind: t.kind, id: t.id }
}

/** Where each key persists is the IO module's business: pinned/favorites/banner in
 *  `.nexus/navigation.json`, recents in the device-local db row. Array position IS the order;
 *  an absent key is an empty list. */
export interface NavigationState {
  pinned?: NavRef[]
  favorites?: NavRef[]
  recents?: NavRef[]
  banner?: string
}

/** A tab target that maps to NavView (the `'none'` detail branch); NOT a `SelectionState` kind,
 *  so it bypasses `select` entirely. */
export type NewTabSentinel = { kind: 'newtab' }

export type TabTarget = SelectTarget | NewTabSentinel

/** A page, or the NavWindow flavor's tab-1 sentinel — the gallery itself; no id/path, never
 *  warmed. */
export type PreviewTabTarget = SelectTarget | { kind: 'navwindow' }

/** Carries its OWN Back/Forward history (`navStack`/`navIndex`). `isPinned` is never stored —
 *  it's derived from the pinned refs. Only unpinned tabs persist, as bare refs; restore hydrates
 *  them against the tree. */
export interface Tab {
  id: string
  target: TabTarget
  navStack: SelectTarget[]
  navIndex: number
}

/** Identity only. Paths are minted at restore; the history pointer is recomputed as dead refs
 *  prune, so nothing stored can go stale or desync. */
export interface StoredTab {
  id: string
  target: NavRef | NewTabSentinel
  navStack: NavRef[]
  navIndex: number
}

/** Device-local; every card opens at it. */
export interface HoverCardSize {
  w: number
  h: number
}

export interface StoredTabSet {
  tabs: StoredTab[]
  activeTabId: string
}

/** Bare refs only — ids are session-local and re-minted at restore; `activeIndex` points into
 *  `tabs` by strip order. The NavWindow's gallery sentinel never persists — opening the nav
 *  flavor re-seeds it as tab 1. */
export interface PreviewSetRecord {
  tabs: { target: NavRef }[]
  activeIndex: number
}

/** One device-local row: the NavWindow flavor's one set, the per-origin sets keyed by origin
 *  page id (re-keyed on re-parent), and which preview was open (recorded for the map; launch
 *  never auto-summons). */
export interface PreviewsFile {
  navSet: PreviewSetRecord | null
  origins: Record<string, PreviewSetRecord>
  open: { flavor: 'page' | 'nav'; originId: string } | null
  /** "Open Preview" from NavWindow rows opens a tab in THIS window instead of the floating
   *  preview. Absent = on (the default: the override wins). */
  navOverride?: boolean
}

/** Shared so main's reader and the renderer's reset can't drift into two different "empty". */
export const EMPTY_PREVIEWS: PreviewsFile = { navSet: null, origins: {}, open: null }

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

export interface PageDetail {
  id: string
  title: string
  path: string
  frontmatter: Record<string, unknown>
  body: string
}

/** One page's batch entry for the view pipeline. Both stamps are ISO 8601; `createdAt` is null
 *  under an adopted id, `modifiedAt` null when the file could not be stat'd. */
export interface PageValues {
  frontmatter: PageFrontmatter
  createdAt: string | null
  modifiedAt: string | null
}

/** `frontmatter` is REQUIRED: when values aren't loaded yet, the flatten step supplies an
 *  identity-only entry so the row still sorts/groups/filters on intrinsic fields. */
export interface ViewRow {
  id: string
  title: string
  icon?: string
  path: string
  parentSetId?: string
  frontmatter: PageFrontmatter
  createdAt?: string
  modifiedAt?: string
  /** The tree node's resolved context links (contextId → Space ids); the optimistic write
   *  layer overrides per commit. */
  contextValues?: Record<string, string[]>
}

/** `title`/`context`/`stamp` are reserved columns; `property` is a user-defined schema
 *  property. Width + the group/sort hoist are separate render concerns, not modeled here. */
export type ColumnKind = 'title' | 'property' | 'context' | 'stamp'

/** The stable seam the table routes to. `id` is the property id (a reserved
 *  `_title` or stamp id, a Context id, or a `prop_*`); `kind` picks the renderer. */
export interface ResolvedColumn {
  id: string
  kind: ColumnKind
}

/** `structural-set` = a Set/Sub-Set disclosure group; `property` = grouped by a property value;
 *  `ungrouped` = the no-value / flat band. */
export type GroupKind = 'structural-set' | 'property' | 'ungrouped'

/** `children` nests Sub-Set groups under a Set group (structural grouping); `items` holds this
 *  group's own rows. `key` is the group's identity — round-trips `collapsed_groups`. Header
 *  labels are derived at render time from `key` + schema, not stored here. */
export interface ResolvedGroup {
  key: string
  kind: GroupKind
  items: ViewRow[]
  children?: ResolvedGroup[]
  isCollapsed: boolean
  /** Sub-group bands only: the raw bucket value (`key` is the composite set/bucket collapse id). */
  bucket?: string
}

/** Stored on disk in `collapsed_groups`, so it round-trips across builds — the single source the
 *  pipeline and the render code both match group keys against. */
export const UNGROUPED = '_ungrouped'
