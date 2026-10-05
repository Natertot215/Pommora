import { isKeyOf, isPlainObject } from '../Contract/validators'
import {
  copyEntry,
  knownTile,
  type Landed,
  tileIdOf,
  landed,
  mergeEntry,
  mintSeed,
  NEW_TILE_H,
  type PickKind,
  type RemovedTile,
  TILE_KINDS,
  type TileDoc,
  type TilesChanged,
} from './tiles'
import { decodeLayout } from './Layout/codec'
import { insertBand } from './Layout/ops'
import { fail, ok, type Result, valueOr, fault } from '../Contract/result'
import { readTileDocAt, writeTileDocAt } from './tileDoc'
import { newId } from '../Nexus/ids'
import { mintDefaultView, mintViewId } from '../Views/views'
import { readStoredView } from '../Views/viewsFile'
import type { Json } from '../Files/stableJson'
import { containerSchema, findContainerWhere } from '../Nexus/treePatch'
import { resolveUnderRoot } from '../Paths/pathSafety'
import { atomicWriteFile, pathExists, rewritePageSerialized } from '../Files/atomicWrite'
import { linksIn } from '../Connections/scan'
import { discardFile } from '../Trash/bundle'
import { machine } from '../Platform/machine'
import { liveTreeOf } from '../Nexus/liveTree'
import { tileFilePath } from '../Paths/paths'
import { tileHostsOf } from './tileHosts'
import type { BodyWrite } from '../Pages/pageDetail'
import type { TrashDeps } from '../Trash/bundle'

const setTiles = (dir: string, update: (tiles: unknown[]) => unknown[]): Promise<Result<TileDoc>> =>
  writeTileDocAt(dir, (cur) => ({ ...cur, tiles: update(cur.tiles) }))

// A new tile's file lands before its entry, so a crash leaks at worst an orphan file, never an entry without one; a refused entry takes its file back.
async function addTile(
  dir: string,
  id: string,
  entry: unknown,
  body: string | null,
): Promise<Result<Landed<{ id: string }>>> {
  const file = tileFilePath(dir, id)
  if (body !== null) await atomicWriteFile(file, body)
  const written = await setTiles(dir, (tiles) => [...tiles, entry])
  if (!written.ok && body !== null) await machine().remove(file)
  return landed(written, { id })
}

// A kind is created directly when its bare seed is a whole entry; a kind that needs a source is reached by convert.
export async function createTile(
  dir: string,
  type: unknown,
): Promise<Result<Landed<{ id: string }>>> {
  const id = newId()
  const seed = knownTile({ id, type })
  if (!seed) return fault('That tile can’t be created.')
  await machine().mkdir(dir)
  return addTile(dir, id, mintSeed(seed.type, id), TILE_KINDS[seed.type].fileBacked ? '' : null)
}

async function reviseTile(
  root: string,
  dir: string,
  tileId: string,
  patch: Json | null,
  deps: TrashDeps,
): Promise<Result<Landed<{ removed: RemovedTile }>>> {
  // A convert rewrites a tile this build knows; a removal takes any entry by its id, or none, since a box can outlive its entry.
  const matches = (b: unknown): boolean => (patch ? knownTile(b)?.id : tileIdOf(b)) === tileId
  let entry: Json | null = null
  const written = await setTiles(dir, (tiles) =>
    tiles.flatMap((b) => {
      if (!matches(b)) return [b]
      entry = b as Json
      return patch ? [mergeEntry(entry, patch)] : []
    }),
  )
  if (!written.ok) return written
  const known = knownTile(entry)
  if (patch && !known) return fail('not-found', 'No such tile.')
  if (known && !TILE_KINDS[known.type].fileBacked) return landed(written, { removed: { entry } })
  const body = await discardTileFile(root, dir, tileId, deps)
  return landed(written, { removed: body === null ? { entry } : { entry, body } })
}

/** Ordered against a still-pending editor flush, so a late body write can never land after the discard and resurrect it. */
function discardTileFile(
  root: string,
  dir: string,
  tileId: string,
  deps: TrashDeps,
): Promise<string | null> {
  const file = tileFilePath(dir, tileId)
  return machine().lock(file, async () => {
    const body = await machine().readText(file)
    // The entry is already gone, so a discard that fails leaves the file behind rather than the removal half-done.
    if (body !== null)
      await discardFile(root, file, deps).catch((e) =>
        console.error('tiles: a removed tile’s file stayed:', e),
      )
    return body
  })
}

export const removeTile = (
  root: string,
  dir: string,
  tileId: string,
  deps: TrashDeps,
): Promise<Result<Landed<{ removed: RemovedTile }>>> => reviseTile(root, dir, tileId, null, deps)

/** File first, as a create is, never over the file its id names; the band lands with the entry, so a board no window holds still shows it. */
export async function restoreTile(dir: string, removed: unknown): Promise<Result<Landed>> {
  if (!isPlainObject(removed)) return fault('Invalid tile.')
  const id = tileIdOf(removed.entry)
  const known = knownTile(removed.entry)
  const { at, body = '' } = removed as Partial<RemovedTile>
  if (
    !id ||
    typeof body !== 'string' ||
    (at && !(Number.isInteger(at.band) && Number.isFinite(at.h)))
  )
    return fault('Invalid tile.')
  // A kind this build doesn't know brings back the file it had, if it had one.
  if (known ? TILE_KINDS[known.type].fileBacked : 'body' in removed) {
    const file = tileFilePath(dir, id)
    await machine().lock(file, async () => {
      if (!(await pathExists(file))) await atomicWriteFile(file, body)
    })
  }
  const written = await writeTileDocAt(dir, (cur) => {
    const layout = decodeLayout(cur.layout)
    return {
      ...cur,
      tiles: cur.tiles.some((b) => tileIdOf(b) === id) ? cur.tiles : [...cur.tiles, removed.entry],
      layout: layout
        ? insertBand(layout, at?.band ?? layout.bands.length, id, at?.h ?? NEW_TILE_H)
        : cur.layout,
    }
  }).finally(dropTileHeadingLinks)
  return landed(written, {})
}

const CONVERTS: Record<PickKind, (root: string, value: unknown) => Promise<Result<Json>>> = {
  page: async (_root, value) =>
    typeof value === 'string' && value !== ''
      ? ok({ type: 'page', page_id: value })
      : fault('Invalid page id.'),
  // A view pick naming no view takes the container's default.
  view: async (root, value) => {
    if (!isPlainObject(value) || typeof value.source_id !== 'string') return fault('Invalid pick.')
    const tree = await liveTreeOf(root)
    const source = findContainerWhere(tree, (c) => c.id === value.source_id)
    if (!source) return fail('not-found', 'That view’s source is gone.')
    let config: Json | null
    if (typeof value.view_id === 'string') {
      const folder = await resolveUnderRoot(root, source.path)
      if (!folder.ok) return folder
      config = await readStoredView(folder.value, source.kind, value.view_id)
    } else config = mintDefaultView(containerSchema(tree, source))
    if (!config) return fail('not-found', 'View not found.')
    const views = [{ source_id: source.id, config: { ...config, id: mintViewId() } }]
    return ok({ type: 'view', views, active: 0 })
  },
}

export async function convertTile(
  root: string,
  dir: string,
  tileId: string,
  pick: unknown,
  deps: TrashDeps,
): Promise<Result<Landed>> {
  const patch =
    isPlainObject(pick) && isKeyOf(CONVERTS, pick.kind)
      ? await CONVERTS[pick.kind](root, pick.value)
      : fault('Invalid pick.')
  if (!patch.ok) return patch
  const revised = await reviseTile(root, dir, tileId, patch.value, deps)
  return revised.ok ? ok({ landed: revised.value.landed }) : revised
}

export async function duplicateTile(
  dir: string,
  tileId: string,
): Promise<Result<Landed<{ id: string }>>> {
  const doc = await readTileDocAt(dir)
  if (!doc.ok) return doc
  const src = doc.value.tiles.find((b) => knownTile(b)?.id === tileId)
  const entry = src ? knownTile(src) : null
  if (!src || !entry) return fail('not-found', 'No such tile.')
  const id = newId()
  let text: string | null = null
  if (TILE_KINDS[entry.type].fileBacked) {
    const body = await readMarkdownTile(dir, tileId)
    if (!body.ok && body.error.code !== 'not-found') throw new Error(body.error.message)
    text = valueOr(body, '')
  }
  return addTile(dir, id, copyEntry({ ...(src as Json), id }), text)
}

/** Absent and unreadable stay apart: a body the read merely failed on must never render as an empty tile the next keystroke overwrites. */
export async function readMarkdownTile(dir: string, tileId: string): Promise<Result<string>> {
  try {
    const body = await machine().readText(tileFilePath(dir, tileId))
    return body === null ? fail('not-found', 'Tile file not found.') : ok(body)
  } catch (e) {
    return fault(e)
  }
}

/** Locked on the file so the rename-cascade rewrite can't clobber a live edit; a file that moved past the text the editor started from refuses the write, and the window merges onto what it holds now. */
export async function writeMarkdownTile(
  dir: string,
  tileId: string,
  body: string,
  baseHash: string,
): Promise<BodyWrite> {
  const file = tileFilePath(dir, tileId)
  return machine().lock(file, async () => {
    const held = await machine().readText(file)
    if (held !== null && machine().sha256Hex(held) !== baseHash) return { stale: true }
    await atomicWriteFile(file, body)
    dropTileHeadingLinks()
    return { stale: false, hash: machine().sha256Hex(body) }
  })
}

// Null is a board that couldn't be read, whose tiles are unknown.
const markdownTileIds = async (dir: string): Promise<string[] | null> => {
  const doc = await readTileDocAt(dir)
  if (!doc.ok) return null
  return doc.value.tiles.flatMap((b) => {
    const entry = knownTile(b)
    return entry && TILE_KINDS[entry.type].fileBacked ? [entry.id] : []
  })
}

let tileHeadingLinks: { root: string; keys: Promise<Set<string>> } | null = null

export const dropTileHeadingLinks = (): void => {
  tileHeadingLinks = null
}

async function readTileHeadingLinks(root: string): Promise<Set<string>> {
  const keys = new Set<string>()
  for (const { dir } of tileHostsOf(root, await liveTreeOf(root)).hosts)
    for (const id of (await markdownTileIds(dir)) ?? [])
      for (const hit of linksIn(valueOr(await readMarkdownTile(dir, id), '')))
        if (hit.qualifier) keys.add(`${hit.target}\0${hit.qualifier}`)
  return keys
}

export function tilesLinkHeading(
  root: string,
  normalizedTitle: string,
  normalizedHeading: string,
): Promise<boolean> {
  if (tileHeadingLinks?.root !== root) tileHeadingLinks = { root, keys: readTileHeadingLinks(root) }
  return tileHeadingLinks.keys.then((keys) => keys.has(`${normalizedTitle}\0${normalizedHeading}`))
}

export async function rewriteTileConnections(
  root: string,
  rewrite: (body: string) => string,
): Promise<{ hosts: TilesChanged[]; failed: number }> {
  const found = tileHostsOf(root, await liveTreeOf(root))
  const hosts: TilesChanged[] = []
  let failed = found.unreadable
  for (const { host, dir } of found.hosts) {
    const wrote: string[] = []
    const ids = await markdownTileIds(dir)
    if (!ids) failed++
    for (const id of ids ?? []) {
      // The timestamp-preserving path: a rename cascade must not re-date every tile it merely rewrites a link inside.
      const landed = await rewritePageSerialized(tileFilePath(dir, id), (body) => {
        const next = rewrite(body)
        return next === body ? null : next
      }).catch(() => null)
      if (landed === null) failed++
      else if (landed) wrote.push(id)
    }
    if (wrote.length && host) hosts.push({ host, ids: wrote })
  }
  dropTileHeadingLinks()
  return { hosts, failed }
}
