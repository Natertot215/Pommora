import { join } from '../Paths/posix'
import { knownTile, mintSeed, TILE_KINDS, type TileHostRef } from './tiles'
import { errText, fail, ok, type Result } from '../Contract/result'
import { readTileDocAt, writeTileDocAt } from './tileDoc'
import { isPlainObject } from '../Properties/propertyValue'
import { normalizeTitle } from '../Connections/connections'
import { mentionsTitle } from '../Connections/scan'
import { rewriteConnections } from '../Connections/rewrite'
import { newId } from '../Nexus/ids'
import { atomicWriteFile, pathExists, readTextOrNull } from '../Files/atomicWrite'
import { trashFileFlat } from '../Trash/bundle'
import { machine } from '../Platform/machine'
import { loadContextWorld } from '../Contexts/contextWrite'
import { getLiveTree } from '../Nexus/liveTree'
import { tileFilePath, tileHostDir } from '../Paths/paths'

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
  patch: Record<string, unknown> | null,
): Promise<void> {
  let wasFileBacked = false
  const written = await setTiles(dir, (tiles) =>
    tiles.flatMap((b) => {
      const entry = knownTile(b)
      if (entry?.id !== tileId) return [b]
      if (TILE_KINDS[entry.type].fileBacked) wasFileBacked = true
      return patch ? [{ ...(b as Record<string, unknown>), ...patch }] : []
    }),
  )
  if (written.ok && wasFileBacked) await trashTileFile(root, dir, tileId)
}

/** Ordered against a still-pending editor flush, so a late body write can never land after the trash and resurrect it. */
async function trashTileFile(root: string, dir: string, tileId: string): Promise<void> {
  const file = tileFilePath(dir, tileId)
  await machine().lock(file, async () => {
    if (await pathExists(file)) await trashFileFlat(root, file)
  })
}

export async function removeTile(root: string, dir: string, tileId: string): Promise<void> {
  await reviseTile(root, dir, tileId, null)
}

export async function convertTileToPage(
  root: string,
  dir: string,
  tileId: string,
  pageId: string,
): Promise<void> {
  await reviseTile(root, dir, tileId, { type: 'page', page_id: pageId })
}

/** The source view's id and the DEFAULT_VIEW_ID sentinel are live keys outside the payload — preserving one would silently re-couple a copied snapshot to its source. */
function remintConfigIds(views: unknown[]): unknown[] {
  return views.map((v) => {
    if (typeof v !== 'object' || v === null) return v
    const el = v as Record<string, unknown>
    if (typeof el.config !== 'object' || el.config === null) return el
    return { ...el, config: { ...(el.config as Record<string, unknown>), id: newId() } }
  })
}

export function copyEntry(raw: unknown): unknown {
  if (!isPlainObject(raw) || raw.type !== 'view' || !Array.isArray(raw.views)) return raw
  return { ...raw, views: remintConfigIds(raw.views) }
}

export async function convertTileToView(
  root: string,
  dir: string,
  tileId: string,
  views: unknown[],
): Promise<void> {
  await reviseTile(root, dir, tileId, { type: 'view', views: remintConfigIds(views), active: 0 })
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
    await atomicWriteFile(tileFilePath(dir, id), body.ok ? body.value : '')
  }
  const copy = copyEntry({ ...(src as Record<string, unknown>), id })
  await setTiles(dir, (tiles) => [...tiles, copy])
  return id
}

/** Absent and unreadable stay apart: a body the read merely failed on must never render as an empty tile the next keystroke overwrites. */
export async function readMarkdownTile(dir: string, tileId: string): Promise<Result<string>> {
  try {
    const body = await machine().readText(tileFilePath(dir, tileId))
    return body === null ? fail('not-found', 'Tile file not found.') : ok(body)
  } catch (e) {
    return fail('operation-failed', errText(e))
  }
}

/** Locked on the file so the rename-cascade rewrite can't clobber a live edit. */
export async function writeMarkdownTile(dir: string, tileId: string, body: string): Promise<void> {
  const file = tileFilePath(dir, tileId)
  await machine().lock(file, () => atomicWriteFile(file, body))
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

async function markdownTileFiles(root: string): Promise<{ id: string; file: string }[]> {
  const out: { id: string; file: string }[] = []
  for (const { dir } of await listTileHosts(root)) {
    for (const b of (await readTileDocAt(dir)).tiles) {
      const entry = knownTile(b)
      if (!entry || !TILE_KINDS[entry.type].fileBacked) continue
      out.push({ id: entry.id, file: tileFilePath(dir, entry.id) })
    }
  }
  return out
}

export async function rewriteTileConnections(
  root: string,
  oldTitle: string,
  newTitle: string,
): Promise<void> {
  const oldKey = normalizeTitle(oldTitle)
  for (const { file } of await markdownTileFiles(root)) {
    await machine().lock(file, async () => {
      const body = await readTextOrNull(file)
      if (body === null) return
      if (!mentionsTitle(body, oldKey)) return
      const next = rewriteConnections(body, oldTitle, newTitle)
      if (next !== body) await atomicWriteFile(file, next)
    })
  }
}
