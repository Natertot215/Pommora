// Entries ride raw through reads and writes so foreign tile types survive; `knownTile` types the ones this build understands.

import { z } from 'zod'
import { type Result, fault, ok } from '../Contract/result'
import { isPlainObject } from '../Contract/validators'
import { looseDecoder } from '../Files/decoders'
import { isUlidShaped } from '../Nexus/identityMark'
import { isNavRef, toNavRef } from '../Navigation/navRef'
import { VIEW_BUTTONS, VIEW_STYLES } from '../Views/viewRow'
import { zoomStep } from './tileZoom'

interface RawTile {
  kind: 'tile'
  id: string
  h: number
}

interface RawRow {
  kind: 'row'
  ratios: number[]
  children: RawNode[]
}

interface RawColumn {
  kind: 'column'
  children: RawNode[]
}

type RawNode = RawTile | RawRow | RawColumn

// The write gate takes a node as an op shaped it; a stored one takes what a hand may have left for repairLayout to finish: a height or share off its type reads as 0, a container may hold one child, and a row's shares may run short.
const layoutNode = (stored: boolean): z.ZodType<RawNode> => {
  const num = stored ? z.number().catch(0) : z.number()
  const children = z.lazy(() => z.array(node).min(stored ? 1 : 2))
  const tile = z.object({ kind: z.literal('tile'), id: z.string().min(1), h: num })
  const row = z
    .object({ kind: z.literal('row'), ratios: z.array(num), children })
    .refine((r) => stored || r.ratios.length === r.children.length)
  const column = z.object({ kind: z.literal('column'), children })
  const node: z.ZodType<RawNode> = z.union([tile, row, column])
  return node
}
export const storedNodeSchema = layoutNode(true)

export const rawLayoutSchema = z.object({
  bands: z.array(z.object({ node: layoutNode(false) })),
})

export const NEW_TILE_H = 160

export type TileHostRef = { kind: 'homepage' } | { kind: 'space'; id: string }

export const HOMEPAGE_HOST = { kind: 'homepage' } as const satisfies TileHostRef

const TILE_HOST_KINDS: ReadonlySet<string> = new Set<TileHostRef['kind']>(['homepage', 'space'])

export function coerceTileHost(raw: unknown): TileHostRef | null {
  return isNavRef(raw, TILE_HOST_KINDS) ? (toNavRef(raw) as TileHostRef) : null
}

const TILE_STYLES = ['bordered', 'borderless'] as const
export type TileStyle = (typeof TILE_STYLES)[number]
const styleField = z.enum(TILE_STYLES).optional().catch(undefined)

const boolField = z.boolean().optional().catch(undefined)
const zoomField = z.number().transform(zoomStep).optional().catch(undefined)
// The id names the tile's file, so an entry read from disk is held to the ULID shape every minted id has; a path-shaped id reads as unknown and inert.
const chassisFields = {
  id: z.string().refine(isUlidShaped),
  style: styleField,
  locked: boolField,
  zoom: zoomField,
}
const markdownEntry = z.object({
  ...chassisFields,
  type: z.literal('markdown'),
})
const pageEntry = z.object({
  ...chassisFields,
  type: z.literal('page'),
  page_id: z.string().min(1),
  banner: boolField,
  title: boolField,
})
const embeddedView = looseDecoder(
  z.object({
    source_id: z.string().min(1),
    config: z.unknown().optional(),
  }),
)
const viewEntry = z.object({
  ...chassisFields,
  type: z.literal('view'),
  views: z.array(embeddedView).min(1),
  active: z.number().int().nonnegative().optional().catch(undefined),
  display_title: z.string().optional().catch(undefined),
  display_icon: z.string().optional().catch(undefined),
  title: boolField,
  icon: boolField,
  title_level: z.number().int().min(1).max(6).optional().catch(undefined),
  view_button: z.enum(VIEW_BUTTONS).optional().catch(undefined),
  view_style: z.enum(VIEW_STYLES).optional().catch(undefined),
  view_band: boolField,
})
export type ViewTileEntry = z.infer<typeof viewEntry>

export type TileEntry = z.infer<typeof markdownEntry> | z.infer<typeof pageEntry> | ViewTileEntry
export type TileType = TileEntry['type']

type TileMenuSource = 'pages' | 'views'

interface TileKind<E extends TileEntry = TileEntry> {
  schema: z.ZodType<E>
  label: string
  fileBacked: boolean
  menuRows: ReadonlyArray<{ label: string; source: TileMenuSource }>
}

export const TILE_KINDS: { [T in TileType]: TileKind<Extract<TileEntry, { type: T }>> } = {
  markdown: {
    schema: markdownEntry.loose(),
    label: 'Markdown Tile',
    fileBacked: true,
    menuRows: [
      { label: 'Link View', source: 'views' },
      { label: 'Link Page', source: 'pages' },
    ],
  },
  page: {
    schema: pageEntry.loose(),
    label: 'Page Tile',
    fileBacked: false,
    menuRows: [{ label: 'Source', source: 'pages' }],
  },
  view: {
    schema: viewEntry.loose(),
    label: 'View Tile',
    fileBacked: false,
    menuRows: [],
  },
}

/** What a removal took, so an Undo can put it back: the raw entry, a file-backed tile's text, and the band it returns to. */
export interface RemovedTile {
  entry: unknown
  body?: string
  at?: { band: number; h: number }
}

type EntrySchemas = [z.ZodType<TileEntry>, z.ZodType<TileEntry>, ...z.ZodType<TileEntry>[]]
const knownEntry = z.union(Object.values(TILE_KINDS).map((k) => k.schema) as EntrySchemas)

export const mintSeed = (type: TileType, id: string): Record<string, unknown> => ({ id, type })

export function seedBoard([a, b, c, d]: readonly string[]): TileDoc {
  const tile = (id: string): RawTile => ({ kind: 'tile', id, h: NEW_TILE_H })
  const band = (left: string, right: string): { node: RawRow } => ({
    node: { kind: 'row', ratios: [0.5, 0.5], children: [tile(left), tile(right)] },
  })
  return {
    layout: { bands: [band(a, b), band(c, d)] },
    tiles: [a, b, c, d].map((id) => mintSeed('markdown', id)),
    locked: false,
  }
}

export interface ViewPick {
  source_id: string
  view_id?: string
}

export type TilePick = { kind: 'page'; value: string } | { kind: 'view'; value: ViewPick }

export function knownTile(raw: unknown): TileEntry | null {
  const parsed = knownEntry.safeParse(raw)
  return parsed.success ? (parsed.data as TileEntry) : null
}

export interface TileDoc {
  layout: unknown
  tiles: unknown[]
  locked: boolean
}

export interface TileDocPatch {
  layout?: unknown
  tiles?: unknown[]
  locked?: boolean
}

/** The three document keys, each shape-checked and kept as sent: zod's parse output would strip the foreign keys a layout or entry carries. */
export function tileDocPatch(raw: unknown): Result<TileDocPatch> {
  if (!isPlainObject(raw)) return fault('Invalid tile-doc patch.')
  const patch: TileDocPatch = {}
  const { layout, tiles, locked } = raw
  if ('layout' in raw) {
    if (!rawLayoutSchema.safeParse(layout).success) return fault('Malformed layout.')
    patch.layout = layout
  }
  if ('tiles' in raw) {
    if (!Array.isArray(tiles)) return fault('tiles must be an array.')
    patch.tiles = tiles
  }
  if ('locked' in raw) {
    if (typeof locked !== 'boolean') return fault('locked must be a boolean.')
    patch.locked = locked
  }
  return ok(patch)
}
