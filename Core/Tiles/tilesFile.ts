import { join, relative } from '../Paths/posix'
import {
  knownTile,
  mintSeed,
  NEW_TILE_H,
  type RemovedTile,
  TILE_KINDS,
  type TileHostRef,
} from './tiles'
import { decodeLayout } from './Layout/codec'
import { insertBand } from './Layout/ops'
import { fail, ok, type Result, valueOr, fault } from '../Contract/result'
import { readTileDocAt, writeTileDocAt } from './tileDoc'
import { isPlainObject } from '../Properties/propertyValue'
import { isUlidShaped } from '../Nexus/identityMark'
import { newId } from '../Nexus/ids'
import { mintDefaultView, mintViewId } from '../Views/views'
import { readStoredView } from '../Views/viewsFile'
import { resolveContainerSchema } from '../Views/Pipeline/pickView'
import type { Json } from '../Files/stableJson'
import { findContainerWhere } from '../Nexus/treePatch'
import { resolveUnderRoot } from '../Paths/pathSafety'
import { atomicWriteFile, pathExists, rewritePageSerialized } from '../Files/atomicWrite'
import { utf8 } from '../Files/utf8'
import { linksIn } from '../Connections/scan'
import { discardFile } from '../Trash/bundle'
import { machine } from '../Platform/machine'
import { loadContextWorld } from '../Contexts/contextWrite'
import { getLiveTree, liveTreeOf } from '../Nexus/liveTree'
import { tileFilePath, tileHostDir } from '../Paths/paths'
import type { BodyWrite } from '../Pages/pageDetail'
import { captureLoser } from '../Sync/Arrival/captures'
import type { TrashDeps } from '../Trash/bundle'

export async function hostDir(root: string, host: TileHostRef): Promise<string | null> {
  if (host.kind === 'homepage') return tileHostDir(root)
  const held = getLiveTree()
  if (held?.nexus.rootPath !== root) return null
  for (const g of held.contexts) {
    const space = g.spaces.find((s) => s.id === host.id)
    if (!space) continue
    // Mid-cascade the tree still spells the folder a rename just moved.
    const dir = join(root, space.path)
    return (await pathExists(dir)) ? dir : null
  }
  return null
}

const setTiles = (dir: string, update: (tiles: unknown[]) => unknown[]): Promise<Result<null>> =>
  writeTileDocAt(dir, (cur) => ({ ...cur, tiles: update(cur.tiles) }))

/** File first, so a crash leaks at worst an orphan file, never an entry without one. */
export async function createMarkdownTile(dir: string): Promise<string> {
  const id = newId()
  await machine().mkdir(dir)
  await atomicWriteFile(tileFilePath(dir, id), '')
  await setTiles(dir, (tiles) => [...tiles, mintSeed('markdown', id)])
  return id
}

async function reviseTile(
  root: string,
  dir: string,
  tileId: string,
  patch: Json | null,
  deps: TrashDeps,
): Promise<Result<RemovedTile>> {
  let entry: Json | null = null
  const written = await setTiles(dir, (tiles) =>
    tiles.flatMap((b) => {
      if (knownTile(b)?.id !== tileId) return [b]
      entry = b as Json
      return patch ? [{ ...entry, ...patch }] : []
    }),
  )
  if (!written.ok) return written
  const known = knownTile(entry)
  if (!known) return fail('not-found', 'No such tile.')
  if (!TILE_KINDS[known.type].fileBacked) return ok({ entry })
  const body = await discardTileFile(root, dir, tileId, deps)
  return ok(body === null ? { entry } : { entry, body })
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
): Promise<Result<RemovedTile>> => reviseTile(root, dir, tileId, null, deps)

/** File first, as a create is, never over the file its id names; the band lands with the entry, so a board no window holds still shows it. */
export async function restoreTile(dir: string, removed: RemovedTile): Promise<Result<null>> {
  const known = knownTile(removed.entry)
  const { at, body = '' } = removed
  if (
    !known ||
    !isUlidShaped(known.id) ||
    typeof body !== 'string' ||
    (at && !(Number.isInteger(at.band) && Number.isFinite(at.h)))
  )
    return fault('Invalid tile.')
  if (TILE_KINDS[known.type].fileBacked) {
    const file = tileFilePath(dir, known.id)
    await machine().lock(file, async () => {
      if (!(await pathExists(file))) await atomicWriteFile(file, body)
    })
  }
  return writeTileDocAt(dir, (cur) => {
    const layout = decodeLayout(cur.layout)
    return {
      ...cur,
      tiles: cur.tiles.some((b) => knownTile(b)?.id === known.id)
        ? cur.tiles
        : [...cur.tiles, removed.entry],
      layout: layout
        ? insertBand(layout, at?.band ?? layout.bands.length, known.id, at?.h ?? NEW_TILE_H)
        : cur.layout,
    }
  }).finally(dropTileHeadingLinks)
}

const settled = async (revised: Promise<Result<unknown>>): Promise<Result<null>> => {
  const r = await revised
  return r.ok ? ok(null) : r
}

export async function convertTile(
  root: string,
  dir: string,
  tileId: string,
  pick: unknown,
  deps: TrashDeps,
): Promise<Result<null>> {
  const patch = await convertedEntry(root, pick)
  return patch.ok ? settled(reviseTile(root, dir, tileId, patch.value, deps)) : patch
}

// A view pick naming no view takes the container's default.
async function convertedEntry(root: string, pick: unknown): Promise<Result<Json>> {
  if (!isPlainObject(pick)) return fault('Invalid pick.')
  const { kind, value } = pick
  if (kind === 'page')
    return typeof value === 'string' && value !== ''
      ? ok({ type: 'page', page_id: value })
      : fault('Invalid page id.')
  if (kind !== 'view' || !isPlainObject(value) || typeof value.source_id !== 'string')
    return fault('Invalid pick.')
  const tree = await liveTreeOf(root)
  const source = findContainerWhere(tree, (c) => c.id === value.source_id)
  if (!source) return fail('not-found', 'That view’s source is gone.')
  let config: Json | null
  if (typeof value.view_id === 'string') {
    const folder = await resolveUnderRoot(root, source.path)
    if (!folder.ok) return folder
    config = await readStoredView(folder.value, source.kind, value.view_id)
  } else config = mintDefaultView(resolveContainerSchema(tree, source))
  if (!config) return fail('not-found', 'View not found.')
  const views = [{ source_id: source.id, config: { ...config, id: mintViewId() } }]
  return ok({ type: 'view', views, active: 0 })
}

/** The source view's id and the DEFAULT_VIEW_ID sentinel are live keys outside the payload — preserving one would silently re-couple a copied snapshot to its source. */
export function copyEntry(raw: unknown): unknown {
  if (!isPlainObject(raw) || raw.type !== 'view' || !Array.isArray(raw.views)) return raw
  const views = raw.views.map((v) =>
    isPlainObject(v) && isPlainObject(v.config)
      ? { ...v, config: { ...v.config, id: mintViewId() } }
      : v,
  )
  return { ...raw, views }
}

export async function duplicateTile(dir: string, tileId: string): Promise<string | null> {
  const doc = await readTileDocAt(dir)
  const src = doc.tiles.find((b) => knownTile(b)?.id === tileId)
  const entry = src ? knownTile(src) : null
  if (!src || !entry) return null
  const id = newId()
  if (TILE_KINDS[entry.type].fileBacked) {
    const body = await readMarkdownTile(dir, tileId)
    if (!body.ok && body.error.code !== 'not-found') throw new Error(body.error.message)
    await atomicWriteFile(tileFilePath(dir, id), valueOr(body, ''))
  }
  const copy = copyEntry({ ...(src as Json), id })
  await setTiles(dir, (tiles) => [...tiles, copy])
  return id
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

/** Locked on the file so the rename-cascade rewrite can't clobber a live edit; a file that moved past the text the editor started from refuses the write and keeps it as a capture, the way a refused page save is kept. */
export async function writeMarkdownTile(
  root: string,
  dir: string,
  tileId: string,
  body: string,
  baseHash: string,
): Promise<BodyWrite> {
  const file = tileFilePath(dir, tileId)
  return machine().lock(file, async () => {
    const held = await machine().readText(file)
    if (held !== null && machine().sha256Hex(held) !== baseHash) {
      await captureLoser(root, relative(root, file), utf8(body), 'merge-lost')
      return { stale: true }
    }
    await atomicWriteFile(file, body)
    dropTileHeadingLinks()
    return { stale: false, hash: machine().sha256Hex(body) }
  })
}

async function listTileHosts(root: string): Promise<{ host: TileHostRef; dir: string }[]> {
  const homepage: TileHostRef = { kind: 'homepage' }
  const hosts: { host: TileHostRef; dir: string }[] = [{ host: homepage, dir: tileHostDir(root) }]
  try {
    const world = await loadContextWorld(root)
    if (world.ok)
      for (const [id, ref] of world.value.spaceById)
        hosts.push({ host: { kind: 'space', id }, dir: ref.dir })
  } catch {}
  return hosts
}

const markdownTileIds = async (dir: string): Promise<string[]> =>
  (await readTileDocAt(dir)).tiles.flatMap((b) => {
    const entry = knownTile(b)
    return entry && TILE_KINDS[entry.type].fileBacked ? [entry.id] : []
  })

let tileHeadingLinks: { root: string; keys: Promise<Set<string>> } | null = null

export const dropTileHeadingLinks = (): void => {
  tileHeadingLinks = null
}

async function readTileHeadingLinks(root: string): Promise<Set<string>> {
  const keys = new Set<string>()
  for (const { dir } of await listTileHosts(root))
    for (const id of await markdownTileIds(dir))
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
): Promise<{ hosts: TileHostRef[]; failed: number }> {
  const hosts: TileHostRef[] = []
  let failed = 0
  for (const { host, dir } of await listTileHosts(root)) {
    let wrote = false
    for (const id of await markdownTileIds(dir)) {
      // The timestamp-preserving path: a rename cascade must not re-date every tile it merely rewrites a link inside.
      const landed = await rewritePageSerialized(tileFilePath(dir, id), (body) => {
        const next = rewrite(body)
        return next === body ? null : next
      }).catch(() => null)
      if (landed === null) failed++
      else wrote ||= landed
    }
    if (wrote) hosts.push(host)
  }
  dropTileHeadingLinks()
  return { hosts, failed }
}
