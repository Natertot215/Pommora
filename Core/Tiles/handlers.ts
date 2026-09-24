import { type Handlers, withRoot, withWriteRoot } from '../Contract/handlers'
import { fail, ok, type Result, fault } from '../Contract/result'
import { isUlid } from '../Nexus/ids'
import { machine } from '../Platform/machine'
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
async function tileHostAnd(
  root: string,
  host: unknown,
  tileId?: unknown,
): Promise<Result<TileCtx>> {
  const h = coerceTileHost(host)
  const dir = h ? await hostDir(root, h) : null
  if (!dir) return fail('not-found', 'Unknown tile host.')
  if (tileId !== undefined && (typeof tileId !== 'string' || !isUlid(tileId)))
    return fail('not-found', 'Invalid tile id.')
  return ok({ root, dir })
}

const onTile =
  <T>(fn: (tile: TileCtx, tileId: string, ...args: unknown[]) => Promise<Result<T>>) =>
  async (
    root: string,
    _ctx: unknown,
    host: unknown,
    tileId: unknown,
    ...args: unknown[]
  ): Promise<Result<T>> => {
    const tile = await tileHostAnd(root, host, tileId)
    return tile.ok ? fn(tile.value, tileId as string, ...args) : tile
  }

export const tilesHandlers = {
  'tiles:get': withRoot(async (root, _ctx, host: unknown) => {
    const tile = await tileHostAnd(root, host)
    return tile.ok ? ok(await readTileDocAt(tile.value.dir)) : tile
  }),

  'tiles:save': withWriteRoot(async (root, _ctx, host: unknown, patch: unknown) => {
    const tile = await tileHostAnd(root, host)
    if (!tile.ok) return tile
    if (!patch || typeof patch !== 'object') return fault('Invalid tile-doc patch.')
    const problem = tilePatchProblem(patch as TileDocPatch)
    if (problem) return fault(problem)
    return writeTileDocAt(tile.value.dir, (cur) => ({ ...cur, ...(patch as TileDocPatch) }))
  }),

  'tiles:createMarkdown': withWriteRoot(async (root, _ctx, host: unknown) => {
    const tile = await tileHostAnd(root, host)
    return tile.ok ? ok({ id: await createMarkdownTile(tile.value.dir) }) : tile
  }),

  'tiles:removeTile': withWriteRoot(
    onTile(async ({ root, dir }, tileId) => {
      await removeTile(root, dir, tileId)
      return ok(null)
    }),
  ),

  'tiles:readMarkdown': withRoot(
    onTile(async ({ dir }, tileId) => {
      const body = await readMarkdownTile(dir, tileId)
      return body.ok ? ok({ body: body.value, hash: machine().sha256Hex(body.value) }) : body
    }),
  ),

  'tiles:writeMarkdown': withWriteRoot(
    onTile(async ({ root, dir }, tileId, body, baseHash) => {
      if (typeof body !== 'string' || typeof baseHash !== 'string')
        return fault('A body and its base hash are required.')
      return ok(await writeMarkdownTile(root, dir, tileId, body, baseHash))
    }),
  ),

  'tiles:convertToPage': withWriteRoot(
    onTile(async ({ root, dir }, tileId, pageId) => {
      if (typeof pageId !== 'string' || pageId.length === 0) return fault('Invalid page id.')
      await convertTileToPage(root, dir, tileId, pageId)
      return ok(null)
    }),
  ),

  'tiles:convertToView': withWriteRoot(
    onTile(async ({ root, dir }, tileId, views) => {
      const list = Array.isArray(views) ? views : null
      const valid =
        list?.length &&
        list.every((v) => typeof (v as { source_id?: unknown })?.source_id === 'string')
      if (!valid) return fault('Invalid view list.')
      await convertTileToView(root, dir, tileId, list as unknown[])
      return ok(null)
    }),
  ),

  'tiles:duplicateTile': withWriteRoot(
    onTile(async ({ dir }, tileId) => {
      const id = await duplicateTile(dir, tileId)
      return id ? ok({ id }) : fail('not-found', 'No such tile.')
    }),
  ),
} satisfies Partial<Handlers>
