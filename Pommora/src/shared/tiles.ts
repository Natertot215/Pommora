// Entries ride raw through reads and writes so foreign tile types survive; `knownTile` types the ones this build understands.

import { z } from 'zod'
import type { ViewButton, ViewStyle } from './types'

interface RawTile {
  kind: 'tile'
  id: string
  h: number
}

interface RawRow {
  kind: 'row'
  ratios: number[]
  children: Array<RawTile | RawRow | RawColumn>
}

interface RawColumn {
  kind: 'column'
  children: Array<RawTile | RawRow | RawColumn>
}

const rawTileSchema: z.ZodType<RawTile> = z.object({
  kind: z.literal('tile'),
  id: z.string().min(1),
  h: z.number(),
})

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

export type TileStyle = 'bordered' | 'borderless'
const styleField = z.enum(['bordered', 'borderless']).optional().catch(undefined)

interface MarkdownTileEntry {
  id: string
  type: 'markdown'
  style?: TileStyle
  locked?: boolean
  zoom?: number
}

interface PageTileEntry {
  id: string
  type: 'page'
  page_id: string
  style?: TileStyle
  banner?: boolean
  title?: boolean
  locked?: boolean
  zoom?: number
}

/** The config `id` is payload-local, minted at copy — never the source view's id. */
export interface EmbeddedView {
  source_id: string
  config?: unknown
}

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

const boolField = z.boolean().optional().catch(undefined)
const zoomField = z.number().positive().optional().catch(undefined)
const chassisFields = {
  id: z.string().min(1),
  style: styleField,
  locked: boolField,
  zoom: zoomField,
}
const markdownEntry = z.looseObject({
  ...chassisFields,
  type: z.literal('markdown'),
})
const pageEntry = z.looseObject({
  ...chassisFields,
  type: z.literal('page'),
  page_id: z.string().min(1),
  banner: boolField,
  title: boolField,
})
// Elements are looseObjects too — a strict element shape would strip nested foreign keys.
const embeddedView = z.looseObject({
  source_id: z.string().min(1),
  config: z.unknown().optional(), // zod 4 treats a bare unknown() key as required
})
const viewEntry = z.looseObject({
  ...chassisFields,
  type: z.literal('view'),
  views: z.array(embeddedView).min(1),
  active: z.number().int().nonnegative().optional().catch(undefined),
  display_title: z.string().optional().catch(undefined),
  title: boolField,
  icon: boolField,
  title_level: z.number().int().min(1).max(6).optional().catch(undefined),
  view_button: z.enum(['icon', 'labeled']).optional().catch(undefined),
  view_style: z.enum(['dropdown', 'toolbar']).optional().catch(undefined),
})
export type TileType = TileEntry['type']

type TileMenuSource = 'pages' | 'views'

interface TileKind<E extends TileEntry = TileEntry> {
  schema: z.ZodType<E>
  /** The kind owns a `<id>.md` beside the document. */
  fileBacked: boolean
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
  view: { schema: viewEntry, fileBacked: false, menuRows: [] },
}

type EntrySchemas = [z.ZodType<TileEntry>, z.ZodType<TileEntry>, ...z.ZodType<TileEntry>[]]
const knownEntry = z.union(Object.values(TILE_KINDS).map((k) => k.schema) as EntrySchemas)

export const MAX_INSPECTOR_TABS = 6

export const INSPECTOR_STATE_KEY = 'inspector'

export const mintSeed = (type: TileType, id: string): Record<string, unknown> => ({ id, type })

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

/** Null for shapes this build doesn't know — the caller keeps the raw value and renders inert. */
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

/** Main-side gate for a tiles:save patch — a shape CHECK only: the ORIGINAL values are what get
 *  written, since zod's parse output strips unknown keys and foreign keys must survive. */
export function tilePatchProblem(patch: TileDocPatch): string | null {
  if ('layout' in patch && !rawLayoutSchema.safeParse(patch.layout).success)
    return 'Malformed layout.'
  if ('tiles' in patch && !Array.isArray(patch.tiles)) return 'tiles must be an array.'
  if ('locked' in patch && typeof patch.locked !== 'boolean') return 'locked must be a boolean.'
  return null
}
