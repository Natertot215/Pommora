import { type Handlers, type HostContext, withRoot, withWriteRoot } from '../Contract/handlers'
import { fail, ok, type Result, fault } from '../Contract/result'
import { isUlidShaped } from '../Nexus/identityMark'
import { machine } from '../Platform/machine'
import { readTileDocAt, writeTileDocAt } from './tileDoc'
import { coerceTileHost, landed, patchEntries, tileDocPatch } from './tiles'

import {
  convertTile,
  createMarkdownTile,
  duplicateTile,
  hostDir,
  readMarkdownTile,
  removeTile,
  restoreTile,
  writeMarkdownTile,
} from './tilesFile'
import { trashDeps } from '../Trash/bundle'
import { captureLoser } from '../Sync/Arrival/captures'
import { relative } from '../Paths/posix'
import { tileFilePath } from '../Paths/paths'
import { utf8 } from '../Files/utf8'

type TileCtx = { root: string; dir: string }

// Tile ids gate on isUlidShaped — the id becomes a filename, so a renderer-supplied value must never carry path segments.
async function tileHostAnd(
  root: string,
  host: unknown,
  tileId?: unknown,
): Promise<Result<TileCtx>> {
  const h = coerceTileHost(host)
  const dir = h ? await hostDir(root, h) : null
  if (!dir) return fail('not-found', 'Unknown tile host.')
  if (tileId !== undefined && !isUlidShaped(tileId)) return fail('not-found', 'Invalid tile id.')
  return ok({ root, dir })
}

const onTile =
  <T>(
    fn: (
      tile: TileCtx & { ctx: HostContext },
      tileId: string,
      ...args: unknown[]
    ) => Promise<Result<T>>,
  ) =>
  async (
    root: string,
    ctx: HostContext,
    host: unknown,
    tileId: unknown,
    ...args: unknown[]
  ): Promise<Result<T>> => {
    const tile = await tileHostAnd(root, host, tileId)
    return tile.ok ? fn({ ...tile.value, ctx }, tileId as string, ...args) : tile
  }

export const tilesHandlers = {
  'tiles:get': withRoot(async (root, _ctx, host: unknown) => {
    const tile = await tileHostAnd(root, host)
    return tile.ok ? readTileDocAt(tile.value.dir) : tile
  }),

  'tiles:save': withWriteRoot(async (root, _ctx, host: unknown, patch: unknown) => {
    const tile = await tileHostAnd(root, host)
    if (!tile.ok) return tile
    const read = tileDocPatch(patch)
    if (!read.ok) return read
    const { entry, ...keys } = read.value
    return landed(
      await writeTileDocAt(tile.value.dir, (cur) => ({
        ...cur,
        ...keys,
        tiles: entry ? patchEntries(cur.tiles, entry.id, entry.patch) : cur.tiles,
      })),
      {},
    )
  }),

  'tiles:createMarkdown': withWriteRoot(async (root, _ctx, host: unknown) => {
    const tile = await tileHostAnd(root, host)
    return tile.ok ? createMarkdownTile(tile.value.dir) : tile
  }),

  'tiles:removeTile': withWriteRoot(
    onTile(async ({ root, dir, ctx }, tileId) =>
      removeTile(root, dir, tileId, await trashDeps(root, ctx)),
    ),
  ),

  'tiles:restoreTile': withWriteRoot(async (root, _ctx, host: unknown, removed: unknown) => {
    const tile = await tileHostAnd(root, host)
    return tile.ok ? restoreTile(tile.value.dir, removed) : tile
  }),

  'tiles:readMarkdown': withRoot(
    onTile(async ({ dir }, tileId) => {
      const body = await readMarkdownTile(dir, tileId)
      return body.ok ? ok({ body: body.value, hash: machine().sha256Hex(body.value) }) : body
    }),
  ),

  'tiles:writeMarkdown': withWriteRoot(
    onTile(async ({ dir }, tileId, body, baseHash) => {
      if (typeof body !== 'string' || typeof baseHash !== 'string')
        return fault('A body and its base hash are required.')
      return ok(await writeMarkdownTile(dir, tileId, body, baseHash))
    }),
  ),

  'tiles:captureMarkdown': withWriteRoot(
    onTile(async ({ root, dir }, tileId, text) => {
      if (typeof text !== 'string') return fault('The text is required.')
      await captureLoser(root, relative(root, tileFilePath(dir, tileId)), utf8(text), 'merge-lost')
      return ok(null)
    }),
  ),

  'tiles:convert': withWriteRoot(
    onTile(async ({ root, dir, ctx }, tileId, pick) =>
      convertTile(root, dir, tileId, pick, await trashDeps(root, ctx)),
    ),
  ),

  'tiles:duplicateTile': withWriteRoot(onTile(({ dir }, tileId) => duplicateTile(dir, tileId))),
} satisfies Partial<Handlers>
