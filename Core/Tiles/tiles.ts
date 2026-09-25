// Entries ride raw through reads and writes so foreign tile types survive; `knownTile` types the ones this build understands.

import { z } from 'zod'
import { VIEW_BUTTONS, VIEW_STYLES } from '../Views/viewRow'

const rawTileSchema = z.object({
  kind: z.literal('tile'),
  id: z.string().min(1),
  h: z.number(),
})
type RawTile = z.infer<typeof rawTileSchema>

interface RawRow {
  kind: 'row'
  ratios: number[]
  children: Array<RawTile | RawRow | RawColumn>
}

interface RawColumn {
  kind: 'column'
  children: Array<RawTile | RawRow | RawColumn>
}

const rawRowSchema: z.ZodType<RawRow> = z.lazy(() =>
  z
    .object({
      kind: z.literal('row'),
      ratios: z.array(z.number()),
      children: z.array(z.union([rawTileSchema, rawRowSchema, rawColumnSchema])).min(2),
    })
    .refine((r) => r.ratios.length === r.children.length),
)

const rawColumnSchema: z.ZodType<RawColumn> = z.lazy(() =>
  z.object({
    kind: z.literal('column'),
    children: z.array(z.union([rawTileSchema, rawRowSchema, rawColumnSchema])).min(2),
  }),
)

export const rawLayoutSchema = z.object({
  bands: z.array(z.object({ node: z.union([rawTileSchema, rawRowSchema, rawColumnSchema]) })),
})

export const NEW_TILE_H = 160

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

const TILE_STYLES = ['bordered', 'borderless'] as const
export type TileStyle = (typeof TILE_STYLES)[number]
const styleField = z.enum(TILE_STYLES).optional().catch(undefined)

const boolField = z.boolean().optional().catch(undefined)
const zoomField = z.number().positive().optional().catch(undefined)
const chassisFields = {
  id: z.string().min(1),
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
const embeddedView = z.object({
  source_id: z.string().min(1),
  config: z.unknown().optional(),
})
/** The config `id` is payload-local, minted at copy — never the source view's id. */
export type EmbeddedView = z.infer<typeof embeddedView>
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
    // Elements are loose too — a strict element shape would strip nested foreign keys.
    schema: viewEntry.extend({ views: z.array(embeddedView.loose()).min(1) }).loose(),
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

export interface DrillPickItem<T> {
  label: string
  icon?: string
  pick?: T
  submenu?: Array<DrillPickItem<T>>
  footer?: boolean
}

export type PagePickerItem = DrillPickItem<string>

export interface ViewPick {
  source_id: string
  view_id?: string
  custom?: boolean
}
export type ViewPickerItem = DrillPickItem<ViewPick>

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

/** A shape CHECK only: the ORIGINAL values are what get written, since zod's parse output strips unknown keys and foreign keys must survive. */
export function tilePatchProblem(patch: TileDocPatch): string | null {
  if ('layout' in patch && !rawLayoutSchema.safeParse(patch.layout).success)
    return 'Malformed layout.'
  if ('tiles' in patch && !Array.isArray(patch.tiles)) return 'tiles must be an array.'
  if ('locked' in patch && typeof patch.locked !== 'boolean') return 'locked must be a boolean.'
  return null
}
