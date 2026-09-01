// Single source of truth for the cross-process contract.
// Imported by main, preload, and renderer — NO fs, NO React here.

import { SPECTRUM, type CellKey } from './theme'
import type { ContextDef } from './contexts'
import type { LinkDisplay, PropertyDefinition } from './properties'
import type { Crop, PageFrontmatter } from './schemas'
import type { DateFormat } from './columnStyles'
import type { PommoraError } from './result'
import type { SavedView } from './views'

export type NodeKind = 'space' | 'collection' | 'set' | 'page'

// The spectrum solids the app accent can be set to, plus `system` (follow the OS accent).
// The selectable spectrum, straight off the palette that builds the :root vars — an accent, an
// option color and a Space color are one vocabulary, so they read one list. greyDefault is absent
// by construction: it lives beside SPECTRUM, not in it.
export const SOLID_COLORS = Object.keys(SPECTRUM) as SolidColor[]
export type SolidColor = keyof typeof SPECTRUM

/** A deferring color setting: a ramp cell, a legacy solid name still on disk, or the sentinel naming
 *  what it inherits when the user has picked nothing. Each setting below names its own sentinel. */
export type ColorSetting<Inherit extends string> = CellKey | SolidColor | Inherit

/** The `accent` value in .nexus/settings.json. `'system'` follows the OS accent. */
export type AccentSetting = ColorSetting<'system'>

/** Default when settings.json omits or has an invalid `accent`. A concrete spectrum color
 *  (never `system`) so it always resolves to a hex; users opt into `system` explicitly. */
export const DEFAULT_ACCENT: SolidColor = 'cyan'

/** Internal link color — the inline [[Title]] connection color. `'accent'` (the default) tracks the
 *  app accent live via `--connection: var(--accent)`; a ramp cell pins it to that color. */
export type ConnectionColorSetting = ColorSetting<'accent'>

/** External link color — the `[text](url)` color. `'system'` (the default) tracks the OS accent live
 *  via `--link: var(--system-accent)`; a ramp cell pins it to that color. */
export type ExternalLinkColorSetting = ColorSetting<'system'>
/** The task checkbox's own color. Cleared follows the accent, as a connection's does. */
export type CheckboxColorSetting = ColorSetting<'accent'>
/** The wash a `==highlight==` wears. Cleared follows the accent. */
export type HighlightColorSetting = ColorSetting<'accent'>
/** Inline `code` text and its wash. `'default'` is the sentinel rather than `'red'` — red is a real
 *  pick, and the two must stay distinguishable: cleared removes the var so the theme's own red
 *  answers, while picking red pins the ramp cell. */
export type CodeColorSetting = ColorSetting<'default'>

/** The nexus-wide clock for the datetime picker (twelveHour = AM/PM segments, the default;
 *  twentyFourHour = flat HH:MM). Lives at `personalization.timeFormat`. */
export const TIME_FORMAT_SETTINGS = ['twelveHour', 'twentyFourHour'] as const
export type TimeFormatSetting = (typeof TIME_FORMAT_SETTINGS)[number]
export const DEFAULT_TIME_FORMAT: TimeFormatSetting = 'twelveHour'

export const TIME_FORMAT_LABELS: Record<TimeFormatSetting, string> = {
  twelveHour: '12 Hours',
  twentyFourHour: '24 Hours',
}

/** Entity kinds that carry a nexus-wide default icon; an entity's own `icon` still overrides it. */
export const ENTITY_ICON_KINDS = ['collection', 'set', 'space', 'page', 'context'] as const
export type EntityIconKind = (typeof ENTITY_ICON_KINDS)[number]

/** One step of a trashed entity's location. `kind` is absent on a historical crumb, which is a
 *  frozen folder name rather than a live entity. */
export interface TrashCrumb {
  kind?: EntityIconKind
  title: string
}

/** What a Clear Exclusion Cache pass did: pages rewritten, container sidecars deleted, pages refused. */
export interface ClearReport {
  pages: number
  sidecars: number
  refused: number
}

/** A `.trash` bundle as the trash browser reads it. Main owns the parse: the renderer never sees a
 *  `.deleted` suffix, a folder stamp, or the record union. The artifact-less `property` record
 *  carries none of these facts and becomes no row at all. */
export interface TrashRow {
  /** Nexus-relative bundle path — the reference both trash actions take. */
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

/** Where a container's child folders sit relative to its loose pages in the sidebar. `top` (default)
 *  keeps folders above pages; `bottom` drops them below. A full folder↔page interleave is the eventual
 *  model — this flag is the interim: folders stay one contiguous block, just relocatable. */
export type FolderPlacement = 'top' | 'bottom'

/** Which surface the sidebar content column renders. Homepage is a selection, not a mode. */
export type SidebarMode = 'collections' | 'contexts' | 'agenda'
/** How a picker marks the row you're on. */
export type PickerSelection = 'outlined' | 'checked'

/** Nexus-wide interface personalization — the `personalization` object in `.nexus/settings.json`
 *  (canonical, synced). Every field optional; absent = the built-in default. One schema behind one
 *  apply-map + one setter — a new toggle is a field here plus an apply-map row. Icon names are bare
 *  strings (the renderer resolves them to symbols) so this stays free of renderer types. */
export interface Personalization {
  accent?: AccentSetting
  connectionColor?: ConnectionColorSetting
  externalLinkColor?: ExternalLinkColorSetting
  checkboxColor?: CheckboxColorSetting
  highlightColor?: HighlightColorSetting
  codeColor?: CodeColorSetting
  /** Whether a checked task reads as done — its text dimmed and struck through. Display only: the
   *  strike is drawn, never written, so the file stays the plain `- [x]` it was. Absent = off. */
  muteCheckedItems?: boolean
  hideChevrons?: boolean
  outlinerLines?: boolean
  /** Line numbers on codeblock content lines (rendered chrome, never editable text). */
  codeblockLineCount?: boolean
  /** Whether selecting an entity from the NavWindow closes it. Absent = closes (default true). */
  navCloseOnSelect?: boolean
  /** Whether repointing a connection drops the alias it was wearing. Absent = drops (default true) —
   *  the old words describe the old page. The alias stays in that page's remembered list either way. */
  removeTitleOnLinkChange?: boolean
  /** Whether accepting a page from the picker opens its alias slot when that page already has names
   *  worth offering. Absent = opens (default true).
   *
   *  This is intentionally invisible because the language used to describe the toggle on the settings
   *  surface hasn't been decided yet — do this sooner rather than later. */
  aliasPickerOnCommit?: boolean
  defaultIcons?: Partial<Record<EntityIconKind, string>>
  /** Icons the user favorited in the Icon Picker — bare Lucide ids (kebab), in display/reorder order. */
  favoriteIcons?: string[]
  /** Depth-1 Sets vs their Collection's loose pages. */
  setPlacement?: FolderPlacement
  /** Sub-Sets (depth-2+) vs their parent Set's loose pages. */
  subSetPlacement?: FolderPlacement
  /** The sidebar ribbon's active mode (which content the column shows). Absent = 'collections'. */
  sidebarMode?: SidebarMode
  /** Hide the toolbar tab bar until hovered. Absent = always shown. */
  revealTabBarOnHover?: boolean
  /** Absent = Pommora draws its own text selection; true hands the paint back to the platform's. */
  nativeHighlight?: boolean
  /** How every picker marks its chosen row — a filled, outlined row or a trailing checkmark.
   *  Absent = `outlined`. */
  pickerSelection?: PickerSelection
  /** Wiki-link clicks open the Page Preview window instead of navigating. ⌘-click takes
   *  the other route. Absent = navigate. */
  connectionsOpenInPreview?: boolean
  /** How a link that leads nowhere reads — a `[[Title]]` naming no page, or a malformed address.
   *  Absent = dimmed, its syntax showing; true renders it as the plain prose it is written as. */
  plainUnresolvedLinks?: boolean
  /** Ribbon icon order below the pinned Homepage — bare icon keys, in display order. */
  ribbonOrder?: string[]
  /** The window zoom the nexus opens at (and ⌘0 resets to). Absent = 1.0; ⌘ +/− nudge live from
   *  it. Applied main-side (webContents zoom). */
  defaultViewScale?: number
  /** How long the connection hover card lingers after hover-off, in whole seconds (1–30).
   *  Absent = None: only the short pointer-travel grace. */
  hoverPreviewLinger?: number
  /** What emptying an item from the trash means. Absent = the artifact goes to the operating
   *  system's trash and the OS owns the last undo; true erases it from the machine outright. */
  permanentDelete?: boolean
  /** The nexus's own date form — the live fallback every date renders through unless its column
   *  overrides it. Absent = `full`, the form the app has always seeded. */
  dateFormat?: DateFormat
  /** The nexus's clock. Absent = twelve-hour. */
  timeFormat?: TimeFormatSetting
  /** How the trash browser writes a deletion's date. Absent = `short`, the worded form. */
  trashDateFormat?: DateFormat
  /** Whether that date drops its clock. Absent = the nexus's own time format is shown. */
  trashHideTime?: boolean
  /** Whether pasting a URL over selected text wraps that text as the link's label rather than
   *  replacing it. Absent = replaces. The inverse chord flips this one. */
  pasteLinkIntoText?: boolean
  /** Which form a pasted address is written in. Absent = the whole address as its own label. */
  defaultLinkFormat?: LinkDisplay
  /** Whether an external link opens Pommora's floating browser rather than the system one.
   *  Absent = the system browser. */
  openLinksInApp?: boolean
  /** How web guests scale relative to the window's own zoom — every guest renders at the host
   *  factor times this. Absent = 1.0, the window's scale as-is. */
  webZoomFactor?: number
  /** The scale embedded pages and views start at, before a block's own Scale multiplies it.
   *  Absent = 0.9. */
  embedScale?: number
  /** How large a page reads — its body text, the chrome scaled off it, and the inline title, as one
   *  factor. Absent = 1.0. A tile states its own size outright through the Embed Scale, so this
   *  governs the page surface and stops at a tile's edge rather than multiplying through it. */
  editorScale?: number
  /** Whether a page opens with its footnotes section shown. Absent = hidden. A page can override
   *  this for itself, per machine, and that override outranks this. */
  citationsShown?: boolean
  /** Whether creating a footnote carries the caret down to the citation it just wrote.
   *  Absent = it does. */
  jumpToCitation?: boolean
}

/** The one session every guest webview lives on — a sign-in anywhere authenticates every embed
 *  surface, per machine, surviving restarts. Surfaces take it as a prop defaulting to this. */
export const WEB_PARTITION = 'persist:pommora-web'

/** The one scale ramp every zoom control steps through — the Webpage Zoom and Embed Scale pickers
 *  and the per-block Scale menus all offer these factors, and a hand-typed value clamps to the
 *  ramp's own ends. */
export const SCALE_STEPS = [0.5, 0.65, 0.75, 0.9, 1, 1.1, 1.25, 1.5] as const
// The clamp is the offered range itself, derived rather than restated.
export const SCALE_MIN = SCALE_STEPS[0]
export const SCALE_MAX = SCALE_STEPS[SCALE_STEPS.length - 1]
export const WEB_ZOOM_DEFAULT = 1
/** The scale a page reads at with nothing asked for — the ramp's own middle. */
export const EDITOR_SCALE_DEFAULT = 1
export function coerceScale(v: unknown, fallback: number): number {
  if (typeof v !== 'number' || !Number.isFinite(v)) return fallback
  return Math.min(SCALE_MAX, Math.max(SCALE_MIN, v))
}

/** The scale embedded pages and views render at before a block's own Scale multiplies it
 *  (`personalization.embedScale`). Resize is a viewport, never a scale — the factor sets the
 *  content's text level: page embeds apply it as a log-curved editor zoom; view embeds first
 *  normalize the table's body text to the editor's, then apply the same zoom, so both read at one
 *  text level. */
export const EMBED_SCALE_DEFAULT = 0.9
export const embedZoom = (scale: number): number => 1 + Math.log2(scale)
export const viewEmbedZoom = (scale: number): number => (15 / 13) * embedZoom(scale)

/** The per-nexus default window zoom (`personalization.defaultViewScale`), stated as the multiplier
 *  a user reads: 1.0 is the interface at its own intended size. The Interface Scale picker steps
 *  this even ramp, and a hand-typed value — written in the settings file or into the control —
 *  clamps to the ramp's own ends; absent/invalid → 1.0 (100%). */
export const VIEW_SCALE_DEFAULT = 1
export const VIEW_SCALE_STEPS = [0.5, 0.6, 0.7, 0.8, 0.9, 1, 1.1, 1.2, 1.3, 1.4, 1.5] as const
export const VIEW_SCALE_MIN = VIEW_SCALE_STEPS[0]
export const VIEW_SCALE_MAX = VIEW_SCALE_STEPS[VIEW_SCALE_STEPS.length - 1]
export function coerceViewScale(v: unknown): number {
  if (typeof v !== 'number' || !Number.isFinite(v)) return VIEW_SCALE_DEFAULT
  return Math.min(VIEW_SCALE_MAX, Math.max(VIEW_SCALE_MIN, v))
}

/** What the interface's own 1.0 is worth as a host zoom factor. The chrome is drawn a step below the
 *  browser's scale, so a stated multiplier is never a zoom factor — every site that sets zoom passes
 *  through `viewScaleZoom`, and the two numbers stay distinguishable by name. */
export const VIEW_SCALE_BASE = 0.9

export const viewScaleZoom = (scale: number): number => scale * VIEW_SCALE_BASE

/** The hover card's linger ceiling (`personalization.hoverPreviewLinger`). Whole seconds; a
 *  hand-typed value clamps in, and zero or junk reads as None (the key's absence). */
export const HOVER_LINGER_MAX = 30
export function coerceHoverLinger(v: unknown): number | undefined {
  if (typeof v !== 'number' || !Number.isFinite(v)) return undefined
  const s = Math.round(v)
  return s >= 1 ? Math.min(HOVER_LINGER_MAX, s) : undefined
}

/** Nexus-wide keyboard commands — the `commands` object in `.nexus/settings.json`. Keys are
 *  command ids, values are shortcut specs ("cmd+t"); an absent id falls back to its default here.
 *  Every future rebindable shortcut registers as a row in this map. */
export const DEFAULT_COMMANDS: Record<string, string> = {
  'toggle-ribbon': 'cmd+t',
  'toggle-nav': 'cmd+o',
  // The paste that does the opposite of what the Pages settings say a plain paste does.
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

/**
 * A node backed by a real file or folder on disk, carrying its nexus-relative POSIX path so a
 * mutation can address it: the renderer sends `path` back and main resolves it under the session
 * root — the renderer must never reconstruct the on-disk path itself. Pages + every container
 * are PathNodes.
 */
export interface PathNode extends BaseNode {
  /** Nexus-relative POSIX path to the entity on disk (forward slashes). */
  path: string
  /** Nexus-relative POSIX path to this entity's banner image, if set. Only banner-bearing
   *  owners (Collections/Sets + contexts) populate it, surfaced from the sidecar `banner` field
   *  (a page's future banner rides here too — distinct from the page-level `cover`). */
  banner?: string
  /** The banner-heading icon is hidden (show/hide chrome), from the sidecar `heading_icon_hidden`.
   *  Absent/false = shown. */
  headingIconHidden?: boolean
}

export interface PageNode extends PathNode {
  kind: 'page'
  /** Resolved context links — contextId → the member's Space ids, attached at walk
   *  assembly from the raw parenthesized keys the parse retains. Absent = no links. */
  contextValues?: Record<string, string[]>
}

/** One Space — a member of a Context, backed by `.nexus/contexts/<Context>/<Space>/`. */
export interface SpaceNode extends PathNode {
  kind: 'space'
  /** The owning Context's registry id (derived from the parent folder at walk). */
  contextId: string
  /** Chip-solid palette key (open string, validated through the chip map at render);
   *  absent = the neutral grey Default. */
  color?: string
  /** Space-to-Space links — same shape and attachment as PageNode's. */
  contextValues?: Record<string, string[]>
}

/** One registry Context with its resolved member Spaces, in display order. */
export interface ContextGroup {
  def: ContextDef
  spaces: SpaceNode[]
}

/** How a page opens from its collection — full-view or a hovering preview window. Collection-owned;
 *  a Set proxies its parent Collection's value. */
export type OpenIn = 'full-page' | 'page-preview'
/** The ViewDropdown button presentation: icon-only vs icon + view name (Show/Hide Title). */
export type ViewButton = 'icon' | 'labeled'
/** A view embed's switcher presentation: a dropdown button or an inline toolbar of view pills. */
export type ViewStyle = 'dropdown' | 'toolbar'

export interface SetNode extends PathNode {
  kind: 'set'
  /** Child Sets nested at any depth. Optional so a container read that stops short of the
   *  recursion still types; the walk populates it. */
  sets?: SetNode[]
  pages: PageNode[]
  /** Saved views from the sidecar `views[]` (depth-1 Sets only; deeper Sub-Sets ignore them). */
  views?: SavedView[]
  /** Per-container ViewDropdown presentation (sidecar `view_button`). */
  viewButton?: ViewButton
  /** Sidebar disclosure is blocked while set (sidecar `disclosure_locked`). */
  disclosureLocked?: boolean
}

export interface CollectionNode extends PathNode {
  kind: 'collection'
  sets: SetNode[] // rendered before pages
  pages: PageNode[]
  /** The property schema every Page inside inherits. Read from the
   *  Collection sidecar's `properties`. */
  properties?: PropertyDefinition[]
  /** Saved views from the sidecar `views[]`. */
  views?: SavedView[]
  /** Collection-owned page-open behavior (sidecar `open_in`). */
  openIn?: OpenIn
  /** Per-container ViewDropdown presentation (sidecar `view_button`). */
  viewButton?: ViewButton
  /** Sidebar disclosure is blocked while set (sidecar `disclosure_locked`). */
  disclosureLocked?: boolean
}

/** The asset root's files, keyed by normalized basename — what a `[[Name.png]]` reference
 *  resolves against. Every path answering to a name is held, sorted, so display can take the
 *  first while a delete refuses to choose; holding only the winner would leave an unlink with
 *  nothing to promote. `version` moves on every change, so a file re-saved under an unchanged
 *  name is re-requested rather than left as a deep-equal map nothing repaints for. */
export interface AssetMap {
  files: Record<string, string[]>
  version: number
}

/** What both processes stand in for a map with no listing behind it — main before a nexus is
 *  open, the renderer before the first push lands. */
export const EMPTY_ASSET_MAP: AssetMap = { files: {}, version: 0 }

/** What a caller asks of the file dialog. `dir` is nexus-relative like every path the renderer
 *  holds — main joins it, and a folder that has gone missing opens at the root rather than
 *  refusing. `any` widens the filter past images; the dialog is the same one either way, so a
 *  banner and a file property can't drift into two pickers. */
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
  /** `name` is the root folder's basename (filename = title). `profileImage` names an image in
   *  the asset directory as a `[[Name.ext]]` wikilink — or, in a nexus the migration has not
   *  run against, a nexus-relative path — and `profileSubtitle` is a ≤30-char blurb. Both come
   *  from `.nexus/settings.json`. */
  nexus: {
    id: string
    rootPath: string
    name: string
    profileImage: string | null
    profileIcon?: string
    profileSubtitle: string
  }
  /** Homepage singleton (`.nexus/homepage.json`) — its optional banner and whether its heading
   *  icon is hidden. The block doc's heavy layout/blocks stay off the walk, loaded lazily by
   *  useTileDoc. */
  homepage: { banner?: string; headingIconHidden: boolean }
  /** Per-image framing from `.nexus/crops.json`, keyed by the image (nexus-relative path or raw
   *  web address). Absent key ⇒ the seat draws its plain image. */
  crops: Record<string, Crop>
  /** Registry-backed Context groups in registry order, each with its Spaces ([] on a
   *  raw/unmigrated tree — the open path migrates + seeds before anything renders). */
  collections: CollectionNode[]
  contexts: ContextGroup[]
  /** Resolved app accent from .nexus/settings.json (defaults to DEFAULT_ACCENT). */
  accent: AccentSetting
  /** Nexus-wide interface personalization (`settings.json` `personalization`) — the DRY config the
   *  renderer's apply-map consumes. Accent is surfaced separately as `accent` above (resolved). */
  personalization: Personalization
  /** Nexus-wide keyboard commands (`settings.json` `commands`) — DEFAULT_COMMANDS overlaid with
   *  the user's on-disk overrides, so every id always resolves to a spec. */
  commands: Record<string, string>
  /** The user's `excluded_folders` (`settings.json`) — nexus-relative folder paths the walk,
   *  the watcher, and the content index all step around. */
  excluded: string[]
  /** The folder holding banners and the profile image (`asset_directory`, `settings.json`) —
   *  nexus-relative POSIX, defaulting to `.nexus/assets`. Outside the content corpus and the
   *  tree, and watched regardless of `excluded`. */
  assetDirectory: string
  /** Every registry definition, in the nexus-wide cosmetic order (order-listed first,
   *  unlisted appended) — reserved ids included; consumers filter. */
  registry: PropertyDefinition[]
  /** Nexus-relative paths the walk saw but could not read — a present-but-unparseable
   *  sidecar, an Unknown or unreadable page. Distinct from absence, which is a missing
   *  entry; absent when empty. No surface reads it — the record's baseline consumes it. */
  unreadable?: { path: string }[]
}

/**
 * The renderer's view of what's open, from the `nexus:state` read. `empty` = no
 * nexus open (show the empty state, not an error); `open` = open + read OK;
 * `error` = a nexus is open but its tree couldn't be read. Never throws across IPC.
 */
export type NexusState =
  | { status: 'empty' }
  | { status: 'open'; tree: NexusTree }
  | { status: 'error'; error: PommoraError }

/** What the renderer currently has open: a container, a page, or nothing. */
export type SelectionState =
  | { kind: 'none' }
  | { kind: 'homepage' }
  /** The group level (a Context) — reserved for ContextView; member selection is `space`. */
  | { kind: 'context'; id: string }
  /** One Space (a Context's member) — the selectable context-layer entity. */
  | { kind: 'space'; id: string }
  | { kind: 'collection'; id: string }
  /** A depth-1 Set (direct child of a Collection) — the only selectable Set; deeper
   *  Sub-Sets are expand-only. Carries `path` for rename-safe reconciliation, like a page. */
  | { kind: 'set'; id: string; path: string }
  | { kind: 'page'; id: string; path: string }

/** Every `SelectionState` except the transient `none` — the live, path-carrying targets. */
export type SelectTarget = Exclude<SelectionState, { kind: 'none' }>

/** A durable navigation reference — identity only; titles, icons, and paths resolve live. */
export type NavRef =
  | { kind: 'homepage' }
  | { kind: 'context' | 'space' | 'collection' | 'set' | 'page' | 'task' | 'event'; id: string }

/** Identity only — the ONE strip between a live target and anything stored, shared by both
 *  processes so the in-memory arrays, the persist payload, and the file are one shape. */
export function toNavRef(t: NavRef | SelectTarget): NavRef {
  return t.kind === 'homepage' ? { kind: 'homepage' } : { kind: t.kind, id: t.id }
}

/** The one navigation contract both processes speak — where each key persists is the IO
 *  module's business: pinned/favorites/banner in `.nexus/navigation.json`, recents in the
 *  device-local db row. Array position IS the order; an absent key is an empty list. */
export interface NavigationState {
  pinned?: NavRef[]
  favorites?: NavRef[]
  recents?: NavRef[]
  /** The NavView's banner — a nexus-relative asset path. */
  banner?: string
}

/** The new-tab sentinel — a tab target that maps to NavView (the `'none'` detail branch); it is NOT a
 *  `SelectionState` kind, so it bypasses `select` entirely. */
export type NewTabSentinel = { kind: 'newtab' }

export type TabTarget = SelectTarget | NewTabSentinel

/** A page, or the NavWindow flavor's tab-1 sentinel — the gallery itself; no id/path, never warmed. */
export type PreviewTabTarget = SelectTarget | { kind: 'navwindow' }

/** One LIVE toolbar tab. Carries its OWN Back/Forward history (`navStack`/`navIndex`). `isPinned`
 *  is never stored — it's derived from the pinned refs (a tab's navKey ∈ pinned). Only unpinned
 *  tabs persist, as bare refs; restore hydrates them against the tree. */
export interface Tab {
  id: string
  target: TabTarget
  navStack: SelectTarget[]
  navIndex: number
}

/** A persisted tab — identity only. Paths are minted at restore; the history pointer is
 *  recomputed as dead refs prune, so nothing stored can go stale or desync. */
export interface StoredTab {
  id: string
  target: NavRef | NewTabSentinel
  navStack: NavRef[]
  navIndex: number
}

/** The connection hover card's one universal size — device-local, every card opens at it. */
export interface HoverCardSize {
  w: number
  h: number
}

export interface StoredTabSet {
  tabs: StoredTab[]
  activeTabId: string
}

/** A persisted preview tab set: bare refs only — ids are session-local and re-minted at
 *  restore; `activeIndex` points into `tabs` by strip order. The NavWindow's gallery sentinel
 *  never persists — opening the nav flavor re-seeds it as tab 1. */
export interface PreviewSetRecord {
  tabs: { target: NavRef }[]
  activeIndex: number
}

/** The preview-tab state, one device-local row: the NavWindow flavor's one set, the per-origin
 *  sets keyed by origin page id (re-keyed on re-parent), and which preview was open (recorded
 *  for the map; launch never auto-summons). */
export interface PreviewsFile {
  navSet: PreviewSetRecord | null
  origins: Record<string, PreviewSetRecord>
  open: { flavor: 'page' | 'nav'; originId: string } | null
  /** The NavWindow's routing override — "Open Preview" from its rows opens a tab in THIS
   *  window instead of the floating preview. Absent = on (the default: the override wins). */
  navOverride?: boolean
}

/** The shape a nexus with no persisted previews reads as — shared so main's reader and the
 *  renderer's reset can't drift into two different "empty". */
export const EMPTY_PREVIEWS: PreviewsFile = { navSet: null, origins: {}, open: null }

/** A content-view rectangle (DIP, viewport-relative) the renderer measures for a thumbnail capture. */
export interface ThumbRect {
  x: number
  y: number
  width: number
  height: number
  /** DIP height of the toolbar band overlapping the shot's top — overpainted so its chrome doesn't
   *  bake in. `maskFill` picks the fill: `banner` copies the banner up over it (reads continuous);
   *  `window` fills the bannerless empty strip. */
  maskTop?: number
  maskFill?: 'banner' | 'window'
}

/** Per-nexus Subfield (footer) config — persisted as a foreign `subfield` key in settings.json. */
export interface SubfieldConfig {
  /** Per-view-kind ordered item ids; absent kinds fall back to the built-in defaults. */
  order: Partial<Record<SelectionState['kind'], string[]>>
  /** App-level expanded/collapsed flag (all views share one). */
  expanded: boolean
}

export type NavViewMode = 'list' | 'gallery'

/** Per-nexus nav view modes — persisted as a foreign `navViewModes` key in settings.json. Kept
 *  SEPARATE per surface: the floating NavWindow and the in-pane NavView each own theirs. */
export interface NavViewModes {
  window: NavViewMode
  view: NavViewMode
}

/** A single page's full content, read on demand for the detail view. */
export interface PageDetail {
  id: string
  title: string
  /** Nexus-relative POSIX path to the `.md` file (forward slashes). */
  path: string
  frontmatter: Record<string, unknown>
  body: string
}

/**
 * `frontmatter` is REQUIRED: when values aren't loaded yet, the flatten step supplies a
 * minimal `{ id }` so the row still sorts/groups/filters on intrinsic fields.
 */
export interface ViewRow {
  id: string
  title: string
  icon?: string
  path: string
  parentSetId?: string
  frontmatter: PageFrontmatter
  /** The tree node's resolved context links (contextId → Space ids) — the pipeline's
   *  context-column value source; the optimistic write layer overrides per commit. */
  contextValues?: Record<string, string[]>
}

/** What a resolved column renders from. `title`/`context`/`modified` are reserved columns;
 *  `property` is a user-defined schema property. (Width + the group/sort hoist are separate
 *  render concerns, not modeled here.) */
export type ColumnKind = 'title' | 'property' | 'context' | 'modified'

/** A resolved table column — the stable seam the table routes to. `id` is the property id
 *  (a reserved `_title`/`_modified_at`, a Context id, or a `prop_*`); `kind` picks the renderer. */
export interface ResolvedColumn {
  id: string
  kind: ColumnKind
}

/** How a resolved group was formed. `structural-set` = a Set/Sub-Set disclosure group;
 *  `property` = grouped by a property value; `ungrouped` = the no-value / flat band. */
export type GroupKind = 'structural-set' | 'property' | 'ungrouped'

/** A resolved bucket of rows produced by the pipeline. `children` nests Sub-Set groups under a
 *  Set group (structural grouping); `items` holds this group's own rows. `key` is the group's
 *  identity (a property value, a Set id, or `'_ungrouped'`) — round-trips `collapsed_groups`.
 *  Header labels are derived at render time from `key` + schema, not stored here. */
export interface ResolvedGroup {
  key: string
  kind: GroupKind
  items: ViewRow[]
  children?: ResolvedGroup[]
  isCollapsed: boolean
  /** Sub-group bands only: the raw bucket value (`key` is the composite set/bucket collapse id). */
  bucket?: string
}

/** The reserved `key` for the no-value / flat / structural-root band. Stored on disk in
 *  `collapsed_groups`, so it round-trips across builds — the single source the pipeline and the
 *  render code both match group keys against. */
export const UNGROUPED = '_ungrouped'
