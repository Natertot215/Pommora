// The host-agnostic contract a tile host carries: a tile layout tree under `layout`,
// tagged-union tile payloads under `tiles`, and the host lock under `locked`. Entries ride
// RAW through reads and writes so foreign or future tile types survive rewrites; `knownTile` is
// the read lens typing the entries this build understands.

import { z } from 'zod'
import type { ViewButton, ViewStyle } from './types'

export interface RawTile {
  kind: 'tile'
  id: string
  h: number
}

export interface RawRow {
  kind: 'row'
  ratios: number[]
  children: Array<RawTile | RawRow | RawColumn>
}

export interface RawColumn {
  kind: 'column'
  children: Array<RawTile | RawRow | RawColumn>
}

export const rawTileSchema: z.ZodType<RawTile> = z.object({
  kind: z.literal('tile'),
  id: z.string().min(1),
  h: z.number(),
})

export const rawRowSchema: z.ZodType<RawRow> = z.lazy(() =>
  z.object({
    kind: z.literal('row'),
    ratios: z.array(z.number()),
    children: z.array(z.union([rawTileSchema, rawRowSchema, rawColumnSchema])).min(1),
  }),
)

export const rawColumnSchema: z.ZodType<RawColumn> = z.lazy(() =>
  z.object({
    kind: z.literal('column'),
    children: z.array(z.union([rawTileSchema, rawRowSchema, rawColumnSchema])).min(1),
  }),
)

export const rawLayoutSchema = z.object({
  bands: z.array(z.object({ node: z.union([rawTileSchema, rawRowSchema, rawColumnSchema]) })),
})

/** The height a freshly-minted tile gets — the renderer's new-tile drops and main's
 *  Space 2×2 seed share this one value. */
export const NEW_TILE_H = 160

/** The tile hosts that exist: the homepage singleton and a Space. A host is a folder holding
 *  `_tiles.json` and its bodies; a new member is this union, `tileHostKey`, `coerceTileHost`,
 *  main's `hostDir` arm and `listTileHosts` entry, and the watcher's ignore arm and classifier. */
export type TileHostRef = { kind: 'homepage' } | { kind: 'space'; id: string }

export function tileHostKey(host: TileHostRef): string {
  return host.kind === 'homepage' ? 'homepage' : `space:${host.id}`
}

export function coerceTileHost(raw: unknown): TileHostRef | null {
  if (typeof raw !== 'object' || raw === null) return null
  const { kind, id } = raw as { kind?: unknown; id?: unknown }
  if (kind === 'homepage') return { kind: 'homepage' }
  if (kind === 'space' && typeof id === 'string' && id.length > 0) return { kind: 'space', id }
  return null
}

/** Per-tile chassis style: borderless hides the border until you reach for
 *  it — border/handle hover, drag, resize. */
export type TileStyle = 'bordered' | 'borderless'
const styleField = z.enum(['bordered', 'borderless']).optional().catch(undefined)

/** Markdown tile: body lives in `<id>.md` inside the host's own folder. */
export interface MarkdownTileEntry {
  id: string
  type: 'markdown'
  style?: TileStyle
  locked?: boolean
  zoom?: number
}

/** Page embed: a scrollable, editable window onto the real page. `banner` /
 *  `title` are the chrome toggles (absent = shown). */
export interface PageTileEntry {
  id: string
  type: 'page'
  page_id: string
  style?: TileStyle
  banner?: boolean
  title?: boolean
  locked?: boolean
  zoom?: number
}

/** One view a view-embed tile carries: its own source container + the copied config (snapshotted
 *  at pick time, never synced). The config's `id` is payload-local, minted at copy — never the
 *  source view's id and never the DEFAULT_VIEW_ID mint sentinel. */
export interface EmbeddedView {
  source_id: string
  config?: unknown
}

/** View embed: `views` is the switcher's list; `active` indexes into it. The header chrome follows
 *  the page embed's absent-=-shown convention — `title` hides the title row, `icon` the view icon
 *  beside it — and the switcher reuses the container presentation vocabulary. */
export interface ViewTileEntry {
  id: string
  type: 'view'
  views: EmbeddedView[]
  active?: number
  style?: TileStyle
  display_title?: string
  title?: boolean
  icon?: boolean
  title_level?: number
  view_button?: ViewButton
  view_style?: ViewStyle
  locked?: boolean
  zoom?: number
}

export type TileEntry = MarkdownTileEntry | PageTileEntry | ViewTileEntry

const lockedField = z.boolean().optional().catch(undefined)
const zoomField = z.number().positive().optional().catch(undefined)
const markdownEntry = z.looseObject({
  id: z.string().min(1),
  type: z.literal('markdown'),
  style: styleField,
  locked: lockedField,
  zoom: zoomField,
})
const pageEntry = z.looseObject({
  id: z.string().min(1),
  type: z.literal('page'),
  page_id: z.string().min(1),
  style: styleField,
  banner: z.boolean().optional().catch(undefined),
  title: z.boolean().optional().catch(undefined),
  locked: lockedField,
  zoom: zoomField,
})
// Elements are looseObjects too — a strict element shape would strip nested foreign keys.
const embeddedView = z.looseObject({
  source_id: z.string().min(1),
  config: z.unknown().optional(), // zod 4 treats a bare unknown() key as required
})
const viewEntry = z.looseObject({
  id: z.string().min(1),
  type: z.literal('view'),
  views: z.array(embeddedView).min(1),
  active: z.number().int().nonnegative().optional().catch(undefined),
  style: styleField,
  display_title: z.string().optional().catch(undefined),
  title: z.boolean().optional().catch(undefined),
  icon: z.boolean().optional().catch(undefined),
  title_level: z.number().int().min(1).max(6).optional().catch(undefined),
  view_button: z.enum(['icon', 'labeled']).optional().catch(undefined),
  view_style: z.enum(['dropdown', 'toolbar']).optional().catch(undefined),
  locked: lockedField,
  zoom: zoomField,
})
export type TileType = TileEntry['type']

/** Which picker a link row drills into; `'none'` renders the row refused. */
export type TileMenuSource = 'pages' | 'views' | 'none'

/** What a kind declares once; the host, the menus, and main's lifecycle read it here. */
export interface TileKind<E extends TileEntry = TileEntry> {
  schema: z.ZodType<E>
  /** The kind owns a `<id>.md` beside the document: trashed on remove or convert, copied on
   *  duplicate, walked by the rename heal. */
  fileBacked: boolean
  /** The handle menu's link rows, in order. */
  menuRows: ReadonlyArray<{ label: string; source: TileMenuSource }>
}

export const TILE_KINDS: { [T in TileType]: TileKind<Extract<TileEntry, { type: T }>> } = {
  markdown: {
    schema: markdownEntry,
    fileBacked: true,
    menuRows: [
      { label: 'Link View', source: 'views' },
      { label: 'Link Page', source: 'pages' },
    ],
  },
  page: { schema: pageEntry, fileBacked: false, menuRows: [{ label: 'Source', source: 'pages' }] },
  view: { schema: viewEntry, fileBacked: false, menuRows: [{ label: 'Source', source: 'none' }] },
}

const knownEntry = z.union([
  TILE_KINDS.markdown.schema,
  TILE_KINDS.page.schema,
  TILE_KINDS.view.schema,
] satisfies { [T in TileType]: z.ZodType<Extract<TileEntry, { type: T }>> }[TileType][])

/** The tabs the inspector may hold beyond the reserved ones. */
export const MAX_INSPECTOR_TABS = 6

/** The `inspector` key of `.nexus/state.json` is reserved for user-made tabs, each a tile host
 *  under `.nexus/inspector/<id>/`; nothing reads or writes it yet. */
export const INSPECTOR_STATE_KEY = 'inspector'

/** The entry a freshly minted tile starts as — complete for a markdown tile, whose kind is its
 *  only field. */
export const mintSeed = (type: TileType, id: string): Record<string, unknown> => ({ id, type })

/** One node of a native returning drill menu (renderer-built — main has no tree).
 *  A node with `pick` resolves the menu; a node with `submenu` drills. */
export interface DrillPickItem<T> {
  label: string
  icon?: string
  pick?: T
  submenu?: Array<DrillPickItem<T>>
  footer?: boolean
}

/** The Link Page drill resolves a page id. */
export type PagePickerItem = DrillPickItem<string>

/** The Link View drill resolves a source view to copy, or + Custom on a container. */
export interface ViewPick {
  source_id: string
  view_id?: string
  custom?: boolean
}
export type ViewPickerItem = DrillPickItem<ViewPick>

/** Type one raw `tiles[]` entry, or null for shapes this build doesn't know —
 *  the caller keeps the raw value either way (never strip, render inert). */
export function knownTile(raw: unknown): TileEntry | null {
  const parsed = knownEntry.safeParse(raw)
  return parsed.success ? (parsed.data as TileEntry) : null
}

/** The document as it sits in a host's `_tiles.json` and crosses IPC — layout + entries stay raw;
 *  the renderer decodes the layout and lenses the entries. */
export interface TileDoc {
  layout: unknown
  tiles: unknown[]
  locked: boolean
}

/** A partial write — only the present keys change. */
export interface TileDocPatch {
  layout?: unknown
  tiles?: unknown[]
  locked?: boolean
}

/** Main-side gate for a tiles:save patch — a shape CHECK only: the ORIGINAL values are what get
 *  written, since zod's parse output strips unknown keys and foreign keys must survive. */
export function tilePatchProblem(patch: TileDocPatch): string | null {
  if ('layout' in patch && !rawLayoutSchema.safeParse(patch.layout).success)
    return 'Malformed layout.'
  if ('tiles' in patch && !Array.isArray(patch.tiles)) return 'tiles must be an array.'
  if ('locked' in patch && typeof patch.locked !== 'boolean') return 'locked must be a boolean.'
  return null
}
