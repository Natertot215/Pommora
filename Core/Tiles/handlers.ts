import type { Handlers } from '../Contract/handlers'
import { BUSY, fail, NO_NEXUS, ok, type Result } from '../Contract/result'
import { isUlid } from '../Nexus/ids'
import { adopting } from '../Nexus/handlers'
import { sessionRoot } from '../Nexus/session'
import { readTileDocAt, writeTileDocAt } from './tileDoc'
import { coerceTileHost, type TileDocPatch, tilePatchProblem } from './tiles'
import {
  convertTileToPage,
  convertTileToView,
  createMarkdownTile,
  duplicateTile,
  hostDir,
  readMarkdownTile,
  removeTile,
  writeMarkdownTile,
} from './tilesFile'

type TileCtx = { root: string; dir: string }

// Tile ids gate on isUlid — the id becomes a filename, so a renderer-supplied value must never carry path segments.
async function tileHostAnd(host: unknown, tileId?: unknown): Promise<Result<TileCtx>> {
  if (adopting()) return BUSY
  const root = sessionRoot()
  if (root === null) return NO_NEXUS
  const h = coerceTileHost(host)
  const dir = h ? await hostDir(root, h) : null
  if (!dir) return fail('not-found', 'Unknown tile host.')
  if (tileId !== undefined && (typeof tileId !== 'string' || !isUlid(tileId)))
    return fail('not-found', 'Invalid tile id.')
  return ok({ root, dir })
}

const onTile =
  <T>(fn: (tile: TileCtx, tileId: string, arg?: unknown) => Promise<Result<T>>) =>
  async (_ctx: unknown, host: unknown, tileId: unknown, arg?: unknown): Promise<Result<T>> => {
    const tile = await tileHostAnd(host, tileId)
    return tile.ok ? fn(tile.value, tileId as string, arg) : tile
  }

export const tilesHandlers = {
  'tiles:get': async (_ctx, host: unknown) => {
    const tile = await tileHostAnd(host)
    return tile.ok ? ok(await readTileDocAt(tile.value.dir)) : tile
  },

  'tiles:save': async (_ctx, host: unknown, patch: unknown) => {
    const tile = await tileHostAnd(host)
    if (!tile.ok) return tile
    if (!patch || typeof patch !== 'object')
      return fail('operation-failed', 'Invalid tile-doc patch.')
    const problem = tilePatchProblem(patch as TileDocPatch)
    if (problem) return fail('operation-failed', problem)
    return writeTileDocAt(tile.value.dir, (cur) => ({ ...cur, ...(patch as TileDocPatch) }))
  },

  'tiles:createMarkdown': async (_ctx, host: unknown) => {
    const tile = await tileHostAnd(host)
    return tile.ok ? ok({ id: await createMarkdownTile(tile.value.dir) }) : tile
  },

  'tiles:removeTile': onTile(async ({ root, dir }, tileId) => {
    await removeTile(root, dir, tileId)
    return ok(null)
  }),

  'tiles:readMarkdown': onTile(async ({ dir }, tileId) => {
    const body = await readMarkdownTile(dir, tileId)
    return body.ok ? ok({ body: body.value }) : body
  }),

  'tiles:writeMarkdown': onTile(async ({ dir }, tileId, body) => {
    if (typeof body !== 'string') return fail('operation-failed', 'Body must be a string.')
    await writeMarkdownTile(dir, tileId, body)
    return ok(null)
  }),

  'tiles:convertToPage': onTile(async ({ root, dir }, tileId, pageId) => {
    if (typeof pageId !== 'string' || pageId.length === 0)
      return fail('operation-failed', 'Invalid page id.')
    await convertTileToPage(root, dir, tileId, pageId)
    return ok(null)
  }),

  'tiles:convertToView': onTile(async ({ root, dir }, tileId, views) => {
    const list = Array.isArray(views) ? views : null
    const valid =
      list?.length &&
      list.every((v) => typeof (v as { source_id?: unknown })?.source_id === 'string')
    if (!valid) return fail('operation-failed', 'Invalid view list.')
    await convertTileToView(root, dir, tileId, list as unknown[])
    return ok(null)
  }),

  'tiles:duplicateTile': onTile(async ({ dir }, tileId) => {
    const id = await duplicateTile(dir, tileId)
    return id ? ok({ id }) : fail('not-found', 'No such tile.')
  }),
} satisfies Partial<Handlers>
