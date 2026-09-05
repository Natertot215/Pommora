// A tile document — layout, entries, lock — is `_tiles.json` in its host's folder, beside the
// tile bodies, so it travels with the Nexus. It is an arrangement of things that live elsewhere:
// every entry is a reference (a markdown file per tile, an embedded page, a view onto a
// container), so the document creates nothing a Nexus would miss. What each tile *says* stays a
// file: markdown bodies are prose, in the connections graph, and rewritten by a rename cascade.
//
// A host's own sidecar keeps identity and appearance (homepage.json its banner and icon, a
// Space its id and color) and never carries the document, so a tile gesture and a banner write
// can never lose each other. The document has one writer, under its own lock.

import { mkdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { knownTile, mintSeed, TILE_KINDS, type TileHostRef, type TileType } from '@shared/tiles'
import { errText, fail, ok, type Result } from '@shared/result'
import { readTileDocAt, writeTileDocAt } from './tileDoc'
import { isPlainObject } from '@shared/propertyValue'
import { normalizeTitle } from '@shared/connections'
import { mentionsTitle } from './Connections/scan'
import { rewriteConnections } from './Connections/rewrite'
import { newId } from './ids'
import { atomicWriteFile, pathExists, trashFileFlat } from './IO/atomicWrite'
import { serializeOnFile } from './IO/fileLock'
import { loadContextWorld } from './CRUD/contextWrite'
import { getLiveTree } from './liveTree'
import { tileFilePath, tileHostDir } from './paths'
export { tileFilePath }

/** Where a host keeps its document and bodies; null when the host no longer resolves. A Space is
 *  answered by the live tree; the world load covers the pre-walk moment and an unconfirmed Space. */
export async function hostDir(root: string, host: TileHostRef): Promise<string | null> {
  if (host.kind === 'homepage') return tileHostDir(root)
  try {
    const held = getLiveTree()
    if (held?.nexus.rootPath === root) {
      for (const g of held.contexts) {
        const space = g.spaces.find((s) => s.id === host.id)
        if (!space) continue
        // Mid-cascade the tree still spells the folder a rename just moved — a stale entry
        // falls through to the fresh world load.
        const dir = join(root, space.path)
        if (await pathExists(dir)) return dir
        break
      }
    }
    const world = await loadContextWorld(root)
    return world.ok ? (world.value.spaceById.get(host.id)?.dir ?? null) : null
  } catch {
    return null
  }
}

/** Replace the entries through the given updater, leaving layout and lock alone. */
const setTiles = (dir: string, update: (tiles: unknown[]) => unknown[]): Promise<Result<null>> =>
  writeTileDocAt(dir, (cur) => ({ ...cur, tiles: update(cur.tiles) }))

/** Mint a markdown tile: host dir, an empty `<ulid>.md`, then the entry —
 *  in that order, so a crash leaks at worst an orphan file, never an entry without one.
 *  The renderer splices the layout leaf afterward. */
export async function createMarkdownTile(dir: string): Promise<string> {
  const id = newId()
  await mkdir(dir, { recursive: true })
  await atomicWriteFile(tileFilePath(dir, id), '')
  await setTiles(dir, (tiles) => [...tiles, mintSeed('markdown', id)])
  return id
}

/** Rewrite one tile's RAW entry — `null` drops it — and trash a file-backed tile's body, since
 *  both leaving the document and ceasing to be markdown end that file's life. Foreign entries are
 *  never touched: the caller's patch spreads over the raw value so its keys and chrome survive. */
async function reviseTile(
  root: string,
  dir: string,
  tileId: string,
  patch: Record<string, unknown> | null,
): Promise<void> {
  let wasFileBacked = false
  await setTiles(dir, (tiles) =>
    tiles.flatMap((b) => {
      const entry = knownTile(b)
      if (entry?.id !== tileId) return [b]
      if (TILE_KINDS[entry.type].fileBacked) wasFileBacked = true
      return patch ? [{ ...(b as Record<string, unknown>), ...patch }] : []
    }),
  )
  if (wasFileBacked) await trashTileFile(root, dir, tileId)
}

/** Trash a markdown tile's backing file on ITS lock — ordered against a still-pending
 *  editor flush, so a late body write can never land after the trash and resurrect it. */
async function trashTileFile(root: string, dir: string, tileId: string): Promise<void> {
  const file = tileFilePath(dir, tileId)
  await serializeOnFile(file, async () => {
    if (await pathExists(file)) await trashFileFlat(root, file)
  })
}

/** The renderer splices the layout leaf FIRST — if this op is what fails, the leftover is an
 *  entry-less invisible orphan, never a dead box. */
export async function removeTile(root: string, dir: string, tileId: string): Promise<void> {
  await reviseTile(root, dir, tileId, null)
}

/** Linking IS the one conversion (markdown → embed); the embedded source is never touched. */
export async function convertTileToPage(
  root: string,
  dir: string,
  tileId: string,
  pageId: string,
): Promise<void> {
  await reviseTile(root, dir, tileId, { type: 'page', page_id: pageId })
}

/** Re-mint each view config's payload-local `id` as a fresh ULID. The source view's id and
 *  the DEFAULT_VIEW_ID sentinel are live keys OUTSIDE the payload — preserving one would
 *  silently re-couple a copied/"detached" snapshot to its source, so every copy re-mints.
 *  Takes ONE tile's `views` array, never a whole tile doc. */
function remintConfigIds(views: unknown[]): unknown[] {
  return views.map((v) => {
    if (typeof v !== 'object' || v === null) return v
    const el = v as Record<string, unknown>
    if (typeof el.config !== 'object' || el.config === null) return el
    return { ...el, config: { ...(el.config as Record<string, unknown>), id: newId() } }
  })
}

/** What a kind must rewrite when its raw entry is copied — raw in, raw out; a kind with no arm
 *  and an unknown kind pass through. */
export const TILE_COPY: Partial<
  Record<TileType, (raw: Record<string, unknown>) => Record<string, unknown>>
> = {
  view: (raw) => (Array.isArray(raw.views) ? { ...raw, views: remintConfigIds(raw.views) } : raw),
}

export function copyEntry(raw: unknown): unknown {
  if (!isPlainObject(raw) || typeof raw.type !== 'string') return raw
  // `hasOwn`, not a bare index — a foreign `type: 'toString'` would otherwise reach
  // Object.prototype and rewrite the entry into whatever that returns.
  if (!Object.hasOwn(TILE_COPY, raw.type)) return raw
  return TILE_COPY[raw.type as TileType]?.(raw) ?? raw
}

/** Link View: the entry becomes a view embed carrying the COPIED config(s), each re-minted. */
export async function convertTileToView(
  root: string,
  dir: string,
  tileId: string,
  views: unknown[],
): Promise<void> {
  await reviseTile(root, dir, tileId, { type: 'view', views: remintConfigIds(views), active: 0 })
}

/** Duplicate a tile: the RAW entry copies under a fresh id (foreign fields + chrome
 *  survive); a markdown tile's body file copies FIRST (a crash leaks an orphan
 *  file, never an entry without one); a view tile's copied configs re-mint their
 *  payload-local ids (they key per-machine state — two tiles must never share one). */
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

/** Absent and unreadable stay apart: a body the read merely failed on must never render as an
 *  empty tile the next keystroke overwrites. */
export async function readMarkdownTile(dir: string, tileId: string): Promise<Result<string>> {
  try {
    return ok(await readFile(tileFilePath(dir, tileId), 'utf8'))
  } catch (e) {
    return (e as NodeJS.ErrnoException).code === 'ENOENT'
      ? fail('not-found', 'Tile file not found.')
      : fail('operation-failed', errText(e))
  }
}

/** Pure body write — no frontmatter envelope, no stamp (tile files stay bare).
 *  Locked on the file so a future rename-cascade rewrite can't clobber a live edit. */
export async function writeMarkdownTile(dir: string, tileId: string, body: string): Promise<void> {
  const file = tileFilePath(dir, tileId)
  await serializeOnFile(file, () => atomicWriteFile(file, body))
}

async function listTileHosts(root: string): Promise<{ host: TileHostRef; dir: string }[]> {
  const homepage: TileHostRef = { kind: 'homepage' }
  const hosts: { host: TileHostRef; dir: string }[] = [{ host: homepage, dir: tileHostDir(root) }]
  try {
    const world = await loadContextWorld(root)
    if (world.ok)
      for (const [id, ref] of world.value.spaceById)
        hosts.push({ host: { kind: 'space', id }, dir: ref.dir })
  } catch {
    // registry unreadable — homepage only this pass
  }
  return hosts
}

/** Every markdown tile's backing file across every host — a missing file is the caller's to
 *  tolerate; this walk does not stat them. */
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

/** Heal markdown-tile bodies on a page rename: rewrite every `[[oldTitle]]` → `[[newTitle]]`,
 *  each under its own file lock (the same lock a live tile edit takes). renameCascade can't reach
 *  these — they're id-less and .nexus-resident — so this runs beside it. Best-effort and per-file:
 *  re-runnable, never cross-file atomic; a failure leaves the page renamed and tiles stale. */
export async function rewriteTileConnections(
  root: string,
  oldTitle: string,
  newTitle: string,
): Promise<void> {
  const oldKey = normalizeTitle(oldTitle)
  for (const { file } of await markdownTileFiles(root)) {
    await serializeOnFile(file, async () => {
      let body: string
      try {
        body = await readFile(file, 'utf8')
      } catch {
        return
      }
      if (!mentionsTitle(body, oldKey)) return
      const next = rewriteConnections(body, oldTitle, newTitle)
      if (next !== body) await atomicWriteFile(file, next)
    })
  }
}
