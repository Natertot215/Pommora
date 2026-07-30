// Single source of truth for the cross-process contract.
// Imported by main, preload, and renderer — NO fs, NO React here.

import { SPECTRUM } from './theme'
import type { ContextDef } from './contexts'
import type { PropertyDefinition } from './properties'
import type { PageFrontmatter } from './schemas'
import type { SavedView } from './views'

export type NodeKind = 'space' | 'collection' | 'set' | 'page'

// The spectrum solids the app accent can be set to, plus `system` (follow the OS accent).
// The selectable spectrum, straight off the palette that builds the :root vars — an accent, an
// option color and a Space color are one vocabulary, so they read one list. greyDefault is absent
// by construction: it lives beside SPECTRUM, not in it.
export const SOLID_COLORS = Object.keys(SPECTRUM) as SolidColor[]
export type SolidColor = keyof typeof SPECTRUM

/** The `accent` value in .nexus/settings.json: a spectrum solid, or follow-the-OS. */
export type AccentSetting = SolidColor | 'system'

/** Default when settings.json omits or has an invalid `accent`. A concrete spectrum color
 *  (never `system`) so it always resolves to a hex; users opt into `system` explicitly. */
export const DEFAULT_ACCENT: SolidColor = 'lavender'

/** Connection color — the inline [[Title]] connection link color. `'accent'` (the default) tracks
 *  the app accent live via `--connection: var(--accent)`; a spectrum solid pins it to that color. */
export type ConnectionColorSetting = SolidColor | 'accent'

/** The `time_format` value in .nexus/settings.json — the nexus-wide clock for the datetime
 *  picker (twelveHour = AM/PM segments, the default; twentyFourHour = flat HH:MM). */
export type TimeFormatSetting = 'twelveHour' | 'twentyFourHour'
export const DEFAULT_TIME_FORMAT: TimeFormatSetting = 'twelveHour'

/** Entity kinds that carry a nexus-wide default icon; an entity's own `icon` still overrides it. */
export const ENTITY_ICON_KINDS = ['collection', 'set', 'space', 'page'] as const
export type EntityIconKind = (typeof ENTITY_ICON_KINDS)[number]

/** Where a container's child folders sit relative to its loose pages in the sidebar. `top` (default)
 *  keeps folders above pages; `bottom` drops them below. A full folder↔page interleave is the eventual
 *  model — this flag is the interim: folders stay one contiguous block, just relocatable. */
export type FolderPlacement = 'top' | 'bottom'

/** Which surface the sidebar content column renders. Homepage is a selection, not a mode. */
export type SidebarMode = 'collections' | 'contexts' | 'agenda'

/** A read-only agenda entity for the sidebar list (main → renderer). Dates are ISO strings or absent. */
export interface AgendaEntry {
  id: string
  title: string
  kind: 'task' | 'event'
  icon?: string
  dueAt?: string
  startAt?: string
  endAt?: string
}

/** The `agenda:list` IPC envelope — tasks + events, or an error. */
export type AgendaListResult =
  | { ok: true; tasks: AgendaEntry[]; events: AgendaEntry[] }
  | { ok: false; error: string }

/** Nexus-wide interface personalization — the `personalization` object in `.nexus/settings.json`
 *  (canonical, synced). Every field optional; absent = the built-in default. One schema behind one
 *  apply-map + one setter — a new toggle is a field here plus an apply-map row. Icon names are bare
 *  strings (the renderer resolves them to symbols) so this stays free of renderer types. */
export interface Personalization {
  accent?: AccentSetting
  connectionColor?: ConnectionColorSetting
  hideChevrons?: boolean
  outlinerLines?: boolean
  /** Whether selecting an entity from the NavWindow closes it. Absent = closes (default true). */
  navCloseOnSelect?: boolean
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
  /** Wiki-link clicks open the Page Preview window instead of navigating. ⌘-click takes
   *  the other route. Absent = navigate. */
  connectionsOpenInPreview?: boolean
  /** Ribbon icon order below the pinned Homepage — bare icon keys, in display order. */
  ribbonOrder?: string[]
  /** The window zoom the nexus opens at (and ⌘0 resets to). Absent = 1.0. Set by hand in
   *  settings.json for now; ⌘ +/− nudge live from it. Applied main-side (webContents zoom). */
  defaultViewScale?: number
}

/** The per-nexus default window zoom (`personalization.defaultViewScale`). Clamped so a hand-typed
 *  settings.json value can't make the window unusable; absent/invalid → 1.0 (100%). */
export const VIEW_SCALE_DEFAULT = 1
export const VIEW_SCALE_MIN = 0.5
export const VIEW_SCALE_MAX = 3
export function coerceViewScale(v: unknown): number {
  if (typeof v !== 'number' || !Number.isFinite(v)) return VIEW_SCALE_DEFAULT
  return Math.min(VIEW_SCALE_MAX, Math.max(VIEW_SCALE_MIN, v))
}

/** Nexus-wide keyboard commands — the `commands` object in `.nexus/settings.json`. Keys are
 *  command ids, values are shortcut specs ("cmd+e"); an absent id falls back to its default here.
 *  Every future rebindable shortcut registers as a row in this map. */
export const DEFAULT_COMMANDS: Record<string, string> = {
  'toggle-ribbon': 'cmd+e',
  'toggle-nav': 'cmd+o',
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
/** The view-switcher presentation: the dropdown or the inline ViewBar (Prospect). */
export type ViewStyle = 'dropdown' | 'toolbar'

export interface SetNode extends PathNode {
  kind: 'set'
  /** Child Sets nested at any depth. Optional during the migration
   *  window; populated by the recursive read. */
  sets?: SetNode[]
  pages: PageNode[]
  /** Saved views from the sidecar `views[]` (depth-1 Sets only; deeper Sub-Sets ignore them). */
  views?: SavedView[]
  /** Per-container ViewDropdown presentation (sidecar `view_button` / `view_style`). */
  viewButton?: ViewButton
  viewStyle?: ViewStyle
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
  /** Per-container ViewDropdown presentation (sidecar `view_button` / `view_style`). */
  viewButton?: ViewButton
  viewStyle?: ViewStyle
}

/** A user-facing entity name in both forms. */
export interface LabelPair {
  singular: string
  plural: string
}

/** Per-Nexus UI labels (read from `settings.labels.{area,topic,project,page_collection,page_set,agenda_task,agenda_event}`).
 *  All three Contexts are first-class LabelPairs; sidebar section headers derive from the plurals
 *  (Areas ← area.plural, Topics ← topic.plural, Collections ← pageCollection.plural). "Sub-Set" is
 *  derived as `"Sub-" + pageSet.singular`, never stored. */
export interface NexusLabels {
  area: LabelPair
  topic: LabelPair
  project: LabelPair
  pageCollection: LabelPair
  pageSet: LabelPair
  agendaTask: LabelPair
  agendaEvent: LabelPair
}

export interface NexusTree {
  /** `name` is the root folder's basename (filename = title). `profileImage` is a
   *  nexus-relative path into `.nexus/assets/<id>/` (or null) and `profileSubtitle` a
   *  ≤30-char blurb — both from `.nexus/settings.json`. */
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
   *  useBlockDoc. */
  homepage: { banner?: string; headingIconHidden: boolean }
  /** NavView singleton (`.nexus/navview.json`) — its own banner; absent, the NavView inherits
   *  the homepage's. */
  navView: { banner?: string }
  /** Registry-backed Context groups in registry order, each with its Spaces ([] on a
   *  raw/unmigrated tree — the open path migrates + seeds before anything renders). */
  collections: CollectionNode[]
  contexts: ContextGroup[]
  /** Ungrouped top-level Collections (those not assigned to a user section). */
  labels: NexusLabels
  /** Resolved app accent from .nexus/settings.json (defaults to DEFAULT_ACCENT). */
  accent: AccentSetting
  /** Nexus-wide time format (.nexus/settings.json `time_format`) — drives the datetime picker's
   *  segment set. Defaults to twelveHour (AM/PM). */
  timeFormat: TimeFormatSetting
  /** Nexus-wide interface personalization (`settings.json` `personalization`) — the DRY config the
   *  renderer's apply-map consumes. Accent is surfaced separately as `accent` above (resolved). */
  personalization: Personalization
  /** Nexus-wide keyboard commands (`settings.json` `commands`) — DEFAULT_COMMANDS overlaid with
   *  the user's on-disk overrides, so every id always resolves to a spec. */
  commands: Record<string, string>
  /** Every registry definition, in the nexus-wide cosmetic order (order-listed first,
   *  unlisted appended) — reserved ids included; consumers filter. */
  registry: PropertyDefinition[]
}

/**
 * The renderer's view of what's open, from the `nexus:state` read. `empty` = no
 * nexus open (show the empty state, not an error); `open` = open + read OK;
 * `error` = a nexus is open but its tree couldn't be read. Never throws across IPC.
 */
export type NexusState =
  | { status: 'empty' }
  | { status: 'open'; tree: NexusTree }
  | { status: 'error'; error: string }

/** On-demand single-page read result envelope — never throws across the boundary. */
export type PageResult = { ok: true; page: PageDetail } | { ok: false; error: string }

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

/** Every `SelectionState` except the transient `none`. Narrower than `NavTarget`: no agenda
 *  kinds (they have no click destination in v1). */
export type SelectTarget = Exclude<SelectionState, { kind: 'none' }>

/** A durable navigation reference — identity only; titles, icons, and paths resolve live. */
export type NavRef =
  | { kind: 'homepage' }
  | { kind: 'context' | 'space' | 'collection' | 'set' | 'page' | 'task' | 'event'; id: string }

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

export type NavigationResult = { ok: true; nav: NavigationState } | { ok: false; error: string }

/** The new-tab sentinel — a tab target that maps to NavView (the `'none'` detail branch); it is NOT a
 *  `SelectionState` kind, so it bypasses `select` entirely. */
export type NewTabSentinel = { kind: 'newtab' }

export type TabTarget = SelectTarget | NewTabSentinel

/** A page, or the NavWindow flavor's tab-1 sentinel — the gallery itself; no id/path, never warmed. */
export type PreviewTabTarget = SelectTarget | { kind: 'navwindow' }

/** One toolbar tab. Carries its OWN Back/Forward history (`navStack`/`navIndex`). `isPinned` is
 *  never stored — it's derived from the pins set (a tab's navKey ∈ pins). Only unpinned tabs are
 *  persisted; pinned tabs are derived live from `.nexus/pins/`. */
export interface Tab {
  id: string
  target: TabTarget
  navStack: SelectTarget[]
  navIndex: number
}

/** The unpinned tab set + the active-tab pointer (which may reference a derived pinned tab's id). */
export interface TabSet {
  tabs: Tab[]
  activeTabId: string
}

/** The `tabs:load` IPC envelope — `set` is null when no sidecar exists yet (the store seeds fresh). */
export type TabsResult = { ok: true; set: TabSet | null } | { ok: false; error: string }

/** A persisted preview tab set: targets only — ids are session-local and re-minted at
 *  restore; `activeIndex` points into `tabs` by strip order. */
export interface PreviewSetRecord {
  tabs: { target: PreviewTabTarget }[]
  activeIndex: number
}

/** The `page-previews.json` sidecar: the NavWindow flavor's one set, the per-origin page-preview
 *  sets keyed by origin page id (re-keyed on re-parent), and which preview was open (recorded
 *  for the map; launch never auto-summons). */
export interface PreviewsFile {
  navSet: PreviewSetRecord | null
  origins: Record<string, PreviewSetRecord>
  open: { flavor: 'page' | 'nav'; originId: string } | null
  /** The NavWindow's routing override — "Open in Preview" from its rows opens a tab in THIS
   *  window instead of the floating preview. Absent = on (Nathan's default: the override wins). */
  navOverride?: boolean
}

/** The shape a nexus with no persisted previews reads as — shared so main's reader and the
 *  renderer's reset can't drift into two different "empty". */
export const EMPTY_PREVIEWS: PreviewsFile = { navSet: null, origins: {}, open: null }

/** The `previews:load` IPC envelope — a nexus with nothing stored reads as the empty shape, never null. */
export type PreviewsResult = { ok: true; file: PreviewsFile } | { ok: false; error: string }

/** A detail-pane rectangle (DIP, viewport-relative) the renderer measures for a thumbnail capture. */
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

/** The `capture:thumbnail` envelope — the written thumbnail's `nexus-asset://` URL. */
export type ThumbResult = { ok: true; url: string } | { ok: false; error: string }

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

// ---------- View pipeline seam types (filter → group → sort) ----------

/**
 * One row fed to the view pipeline. Carries the intrinsic PageNode fields plus the page's
 * parsed `frontmatter` (the source of property-keyed column values). `frontmatter` is
 * REQUIRED: when values aren't loaded yet, the flatten step supplies a minimal `{ id }` so the
 * row still sorts/groups/filters on intrinsic fields. `parentSetId` is the id of the Set the
 * page lives in (undefined for a container-root page), used to build structural disclosure
 * groups. Pure data — no fs, no React.
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

export const DEFAULT_LABELS: NexusLabels = {
  area: { singular: 'Area', plural: 'Areas' },
  topic: { singular: 'Topic', plural: 'Topics' },
  project: { singular: 'Project', plural: 'Projects' },
  pageCollection: { singular: 'Collection', plural: 'Collections' },
  pageSet: { singular: 'Set', plural: 'Sets' },
  agendaTask: { singular: 'Task', plural: 'Tasks' },
  agendaEvent: { singular: 'Event', plural: 'Events' },
}

/** The derived Sub-Set label (deeper Sets); never stored. */
export function subSetLabel(labels: NexusLabels): string {
  return `Sub-${labels.pageSet.singular}`
}
