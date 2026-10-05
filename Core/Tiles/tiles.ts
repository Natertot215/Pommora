// Entries ride raw through reads and writes so foreign tile types survive; `knownTile` types the ones this build understands.

import { z } from 'zod'
import { type Result, fault, ok } from '../Contract/result'
import { isKeyOf, isPlainObject } from '../Contract/validators'
import { looseDecoder } from '../Files/decoders'
import { isUlidShaped } from '../Nexus/identityMark'
import { VIEW_BUTTONS, VIEW_STYLES } from '../Views/viewRow'
import { mapViews, mintViewId } from '../Views/views'
import { rawLayoutSchema } from './Layout/codec'
import { NEW_TILE_H, type RowNode, type TileLeaf } from './Layout/model'
import { zoomStep } from './tileZoom'

// A homepage carrying an id is no host; a Space sheds whatever else its reference carries.
const tileHostSchema = z.discriminatedUnion('kind', [
  z.strictObject({ kind: z.literal('homepage') }),
  z.object({ kind: z.literal('space'), id: z.string().min(1) }),
])
export type TileHostRef = z.infer<typeof tileHostSchema>

/** A board whose document or tiles changed outside its window, with the tiles whose text did. */
export interface TilesChanged {
  host: TileHostRef
  ids: string[]
}

export const HOMEPAGE_HOST = { kind: 'homepage' } as const satisfies TileHostRef

export const coerceTileHost = (raw: unknown): TileHostRef | null =>
  tileHostSchema.safeParse(raw).data ?? null

export const tileHostKey = (host: TileHostRef): string =>
  'id' in host ? `${host.kind}:${host.id}` : host.kind

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

export interface ViewPick {
  source_id: string
  view_id?: string
}

/** What a create or a convert into each kind is given; a kind a menu row makes has a member here. */
export type TilePick = { kind: 'page'; value: string } | { kind: 'view'; value: ViewPick }
export type PickKind = TilePick['kind']

interface TileKind<E extends TileEntry = TileEntry> {
  schema: z.ZodType<E>
  label: string
  fileBacked: boolean
  menuRows: ReadonlyArray<{ label: string; to: PickKind }>
  /** Re-mints what a copy must not share with its source. */
  copy?: (raw: Record<string, unknown>) => unknown
}

export const TILE_KINDS: { [T in TileType]: TileKind<Extract<TileEntry, { type: T }>> } = {
  markdown: {
    schema: markdownEntry.loose(),
    label: 'Markdown Tile',
    fileBacked: true,
    menuRows: [
      { label: 'Link View', to: 'view' },
      { label: 'Link Page', to: 'page' },
    ],
  },
  page: {
    schema: pageEntry.loose(),
    label: 'Page Tile',
    fileBacked: false,
    menuRows: [{ label: 'Source', to: 'page' }],
  },
  view: {
    schema: viewEntry.loose(),
    label: 'View Tile',
    fileBacked: false,
    menuRows: [],
    // The source view's id and the DEFAULT_VIEW_ID sentinel are live keys outside the payload — preserving one would silently re-couple a copied snapshot to its source.
    copy: (raw) => mapViews(raw, (config) => ({ ...config, id: mintViewId() })),
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

export const mintSeed = (id: string): Record<string, unknown> => ({ id, type: 'markdown' })

export function seedBoard([a, b, c, d]: readonly string[]): TileDoc {
  const tile = (id: string): TileLeaf => ({ kind: 'tile', id, h: NEW_TILE_H })
  const band = (left: string, right: string): { node: RowNode } => ({
    node: { kind: 'row', ratios: [0.5, 0.5], children: [tile(left), tile(right)] },
  })
  return {
    layout: { bands: [band(a, b), band(c, d)] },
    tiles: [a, b, c, d].map(mintSeed),
    locked: false,
  }
}

export const tileIdOf = (raw: unknown): string | null =>
  isPlainObject(raw) && isUlidShaped(raw.id) ? raw.id : null

export function knownTile(raw: unknown): TileEntry | null {
  const parsed = knownEntry.safeParse(raw)
  return parsed.success ? (parsed.data as TileEntry) : null
}

export const copyEntry = (raw: unknown): unknown =>
  (isPlainObject(raw) && isKeyOf(TILE_KINDS, raw.type) && TILE_KINDS[raw.type].copy?.(raw)) || raw

export interface TileDoc {
  layout: unknown
  tiles: unknown[]
  locked: boolean
}

/** A key set to null leaves the entry, since an absent key is its default. */
export type EntryPatch = Record<string, unknown>

export const mergeEntry = (
  raw: Record<string, unknown>,
  patch: EntryPatch,
): Record<string, unknown> => {
  const next = { ...raw }
  for (const [k, v] of Object.entries(patch)) {
    if (v === null) delete next[k]
    else next[k] = v
  }
  return next
}

export const patchEntries = (tiles: unknown[], id: string, patch: EntryPatch): unknown[] =>
  tiles.map((b) => (knownTile(b)?.id === id ? mergeEntry(b as Record<string, unknown>, patch) : b))

export interface TileDocPatch {
  layout?: unknown
  entry?: { id: string; patch: EntryPatch }
  locked?: boolean
}

/** Every write answers with the document it left on disk, and the board adopts its entries and lock from it. */
export type Landed<T = unknown> = T & { landed: TileDoc }

export const landed = <T>(written: Result<TileDoc>, value: T): Result<Landed<T>> =>
  written.ok ? ok({ ...value, landed: written.value }) : written

/** The document keys a board writes, each shape-checked and kept as sent: zod's parse output would strip the foreign keys a layout or entry carries. */
export function tileDocPatch(raw: unknown): Result<TileDocPatch> {
  if (!isPlainObject(raw)) return fault('Invalid tile-doc patch.')
  const patch: TileDocPatch = {}
  const { layout, entry, locked } = raw
  if ('layout' in raw) {
    if (!rawLayoutSchema.safeParse(layout).success) return fault('Malformed layout.')
    patch.layout = layout
  }
  if ('entry' in raw) {
    // A patch sets an entry's settings; its identity and kind change only through convert.
    if (
      !isPlainObject(entry) ||
      !isUlidShaped(entry.id) ||
      !isPlainObject(entry.patch) ||
      'id' in entry.patch ||
      'type' in entry.patch
    )
      return fault('Malformed entry patch.')
    patch.entry = { id: entry.id, patch: entry.patch }
  }
  if ('locked' in raw) {
    if (typeof locked !== 'boolean') return fault('locked must be a boolean.')
    patch.locked = locked
  }
  return ok(patch)
}
