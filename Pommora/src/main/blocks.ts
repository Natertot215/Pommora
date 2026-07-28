// A block document is split by what it is. `blocks[]` and the host lock stay on the host's own
// config — those entries name real content (a markdown file per tile, an embedded page, a view) —
// while the layout is arrangement, so it lives in nexus.db where no hand-edit can mangle a host
// into an unrenderable tree. Config writes are a locked read-merge-write touching only
// blocks/blocks_locked, so foreign keys (banner included) survive; the layout no longer shares
// that file, so a banner write and a layout drag can't lose each other.

import { mkdir, readFile, rm, stat } from 'node:fs/promises'
import { join } from 'node:path'
import {
  blockHostKey,
  knownBlock,
  rawLayoutSchema,
  type BlockDoc,
  type BlockDocPatch,
  type BlockHostRef,
} from '@shared/blocks'
import { readKey, writeKey } from './db/localState'
import { sessionDb } from './sessionDb'
import { normalizeTitle } from '@shared/connections'
import { scanConnections } from './connections/scan'
import { rewriteConnections } from './connections/rewrite'
import { newId } from './ids'
import {
  atomicWriteFile,
  mutateJson,
  pathExists,
  readJsonObject,
  rmwJsonStrict,
  trashWithTimestamp,
} from './io/atomicWrite'
import { serializeOnFile } from './io/fileLock'
import { loadContextWorld } from './crud/contextWrite'
import { blockHostDir, nexusConfig, NEXUS_CONFIG_FILES, SPACE_SIDECAR } from './paths'

const EPOCH = '1970-01-01T00:00:00.000Z'

/** A Space host's folder, resolved through the write-side world load (registry + sidecars —
 *  the same strictness every context write rides). Unknown or unresolvable ids throw; the IPC
 *  envelope catches. */
async function spaceHostDir(root: string, id: string): Promise<string> {
  const world = await loadContextWorld(root)
  if (!world.ok) throw new Error(world.error.message)
  const ref = world.value.spaceById.get(id)
  if (!ref) throw new Error('Unknown Space.')
  return ref.dir
}

/** The host's own folder — homepage's fixed dir, or the Space's folder. */
async function hostDir(root: string, host: BlockHostRef): Promise<string> {
  return host.kind === 'homepage' ? blockHostDir(root, host) : spaceHostDir(root, host.id)
}

/** The host's own config carries the block document (one file, one entity):
 *  homepage.json, or the Space's `_space.json`. Its writes don't cost a re-walk:
 *  the app's own writes are echo-suppressed at the watcher (io/writeEcho). */
export async function blockHostConfig(root: string, host: BlockHostRef): Promise<string> {
  return host.kind === 'homepage'
    ? nexusConfig(root, NEXUS_CONFIG_FILES.homepage)
    : join(await spaceHostDir(root, host.id), SPACE_SIDECAR)
}

/** A markdown block's backing file: `<tile-ulid>.md` in the host's own folder. */
export async function blockFilePath(
  root: string,
  host: BlockHostRef,
  tileId: string,
): Promise<string> {
  return join(await hostDir(root, host), `${tileId}.md`)
}

/** The one locked read-merge-write every doc mutation goes through. A Space's sidecar
 *  carries identity + relations other writers own, so its RMW is STRICT — a transiently
 *  unreadable `_space.json` fails the save rather than clobbering down to a near-empty
 *  object. Homepage keeps the from-nothing fallback (the config legitimately starts absent). */
async function mutateDoc(
  root: string,
  host: BlockHostRef,
  fn: (cur: Record<string, unknown>) => Record<string, unknown>,
): Promise<void> {
  const path = await blockHostConfig(root, host)
  if (host.kind === 'space') {
    await serializeOnFile(path, async () => {
      const r = await rmwJsonStrict(path, fn)
      if (!r.ok) throw new Error(r.error.message)
    })
    return
  }
  await serializeOnFile(path, () => mutateJson<Record<string, unknown>>(path, () => ({}), fn))
}

/** One-time healing: a brief interim build split the homepage doc into a `_blocks.json`
 *  sidecar — fold it back onto the host config (one file, one entity) and remove
 *  it. No-op when no sidecar exists; Space hosts never had the split. */
async function healSplitDoc(root: string, host: BlockHostRef): Promise<void> {
  if (host.kind !== 'homepage') return
  const sidecarPath = join(blockHostDir(root, host), '_blocks.json')
  const sidecar = await readJsonObject(sidecarPath)
  if (!sidecar) return
  await mutateDoc(root, host, (cur) => ({
    ...cur,
    ...('layout' in sidecar ? { layout: sidecar.layout } : {}),
    ...('blocks' in sidecar ? { blocks: sidecar.blocks } : {}),
    ...('blocks_locked' in sidecar ? { blocks_locked: sidecar.blocks_locked } : {}),
  }))
  await rm(sidecarPath, { force: true })
}

/**
 * The layout comes from the database; a host whose config still carries one is lifted here, on
 * the read that finds it — no walk, and nothing to run for a host already migrated. A layout the
 * schema rejects is left where it is rather than lifted, so nothing unreadable is destroyed, and
 * with no database open the config is not touched at all.
 */
async function hostLayout(
  root: string,
  host: BlockHostRef,
  raw: Record<string, unknown> | null,
): Promise<unknown> {
  const key = blockHostKey(host)
  const stored = readKey<unknown>('layout', key)
  if (stored !== null) return stored
  const legacy = raw?.layout
  if (legacy === undefined || sessionDb() === null) return legacy
  if (!rawLayoutSchema.safeParse(legacy).success) {
    console.error(`blocks: ${key} carries an unreadable layout — leaving it on disk`)
    return legacy
  }
  writeKey('layout', key, legacy)
  await mutateDoc(root, host, ({ layout: _lifted, ...rest }) => rest)
  return legacy
}

export async function readBlockDoc(root: string, host: BlockHostRef): Promise<BlockDoc> {
  await healSplitDoc(root, host)
  const raw = await readJsonObject(await blockHostConfig(root, host))
  return {
    layout: await hostLayout(root, host, raw),
    blocks: Array.isArray(raw?.blocks) ? raw.blocks : [],
    locked: raw?.blocks_locked === true,
  }
}

export async function writeBlockDoc(
  root: string,
  host: BlockHostRef,
  patch: BlockDocPatch,
): Promise<void> {
  if ('layout' in patch) writeKey('layout', blockHostKey(host), patch.layout ?? null)
  if (!('blocks' in patch) && !('locked' in patch)) return
  await mutateDoc(root, host, (cur) => {
    const next = { ...cur }
    if ('blocks' in patch) next.blocks = patch.blocks
    if ('locked' in patch) {
      if (patch.locked) next.blocks_locked = true
      else delete next.blocks_locked
    }
    return next
  })
}

/** Mint a markdown block: host dir, an empty `<ulid>.md`, then the `blocks[]` entry —
 *  in that order, so a crash leaks at worst an orphan file, never an entry without one.
 *  The renderer splices the layout leaf afterward. */
export async function createMarkdownBlock(root: string, host: BlockHostRef): Promise<string> {
  const id = newId()
  await mkdir(await hostDir(root, host), { recursive: true })
  await atomicWriteFile(await blockFilePath(root, host, id), '')
  await mutateDoc(root, host, (cur) => {
    const blocks = Array.isArray(cur.blocks) ? cur.blocks : []
    return { ...cur, blocks: [...blocks, { id, type: 'markdown' }] }
  })
  return id
}

/** Drop a tile's entry; a markdown tile's backing `.md` goes to `.trash`. Foreign
 *  entries are never touched. The renderer splices the layout leaf FIRST — if this
 *  op is what fails, the leftover is an entry-less invisible orphan, never a dead box. */
export async function removeBlockTile(
  root: string,
  host: BlockHostRef,
  tileId: string,
): Promise<void> {
  let wasMarkdown = false
  await mutateDoc(root, host, (cur) => {
    const blocks = Array.isArray(cur.blocks) ? cur.blocks : []
    const kept = blocks.filter((b) => {
      const entry = knownBlock(b)
      if (entry?.id !== tileId) return true
      if (entry.type === 'markdown') wasMarkdown = true
      return false
    })
    return { ...cur, blocks: kept }
  })
  if (wasMarkdown) await trashTileFile(root, host, tileId)
}

/** Trash a markdown tile's backing file on ITS lock — ordered against a still-pending
 *  editor flush, so a late body write can never land after the trash and resurrect it. */
async function trashTileFile(root: string, host: BlockHostRef, tileId: string): Promise<void> {
  const file = await blockFilePath(root, host, tileId)
  await serializeOnFile(file, async () => {
    if (await pathExists(file)) await trashWithTimestamp(root, file)
  })
}

/** Linking IS the one conversion (markdown → embed): the RAW entry spreads so
 *  foreign keys + chrome survive, the backing `.md` trashes recoverably,
 *  and the embedded source is never touched. */
async function flipTile(
  root: string,
  host: BlockHostRef,
  tileId: string,
  patch: Record<string, unknown>,
): Promise<void> {
  let wasMarkdown = false
  await mutateDoc(root, host, (cur) => {
    const blocks = Array.isArray(cur.blocks) ? cur.blocks : []
    const next = blocks.map((b) => {
      const entry = knownBlock(b)
      if (entry?.id !== tileId) return b
      if (entry.type === 'markdown') wasMarkdown = true
      return { ...(b as Record<string, unknown>), ...patch }
    })
    return { ...cur, blocks: next }
  })
  if (wasMarkdown) await trashTileFile(root, host, tileId)
}

export async function convertTileToPage(
  root: string,
  host: BlockHostRef,
  tileId: string,
  pageId: string,
): Promise<void> {
  await flipTile(root, host, tileId, { type: 'page', page_id: pageId })
}

/** Re-mint each view config's payload-local `id` as a fresh ULID. The source view's id and
 *  the DEFAULT_VIEW_ID sentinel are live keys OUTSIDE the payload — preserving one would
 *  silently re-couple a copied/"detached" snapshot to its source, so every copy re-mints. */
function remintConfigIds(views: unknown[]): unknown[] {
  return views.map((v) => {
    if (typeof v !== 'object' || v === null) return v
    const el = v as Record<string, unknown>
    if (typeof el.config !== 'object' || el.config === null) return el
    return { ...el, config: { ...(el.config as Record<string, unknown>), id: newId() } }
  })
}

/** Link View: the entry becomes a view embed carrying the COPIED config(s), each re-minted. */
export async function convertTileToView(
  root: string,
  host: BlockHostRef,
  tileId: string,
  views: unknown[],
): Promise<void> {
  await flipTile(root, host, tileId, { type: 'view', views: remintConfigIds(views), active: 0 })
}

/** Duplicate a tile: the RAW entry copies under a fresh id (foreign fields + chrome
 *  survive); a markdown tile's body file copies FIRST (a crash leaks an orphan
 *  file, never an entry without one); a view tile's copied configs re-mint their
 *  payload-local ids (they key per-machine state — two tiles must never share one). */
export async function duplicateBlockTile(
  root: string,
  host: BlockHostRef,
  tileId: string,
): Promise<string | null> {
  const doc = await readBlockDoc(root, host)
  const src = doc.blocks.find((b) => knownBlock(b)?.id === tileId)
  const entry = src ? knownBlock(src) : null
  if (!src || !entry) return null
  const id = newId()
  if (entry.type === 'markdown') {
    const body = (await readMarkdownBlock(root, host, tileId)) ?? ''
    await mkdir(await hostDir(root, host), { recursive: true })
    await atomicWriteFile(await blockFilePath(root, host, id), body)
  }
  let copy: Record<string, unknown> = { ...(src as Record<string, unknown>), id }
  if (entry.type === 'view' && Array.isArray(copy.views)) {
    copy = { ...copy, views: remintConfigIds(copy.views as unknown[]) }
  }
  await mutateDoc(root, host, (cur) => ({
    ...cur,
    blocks: [...(Array.isArray(cur.blocks) ? cur.blocks : []), copy],
  }))
  return id
}

export async function readMarkdownBlock(
  root: string,
  host: BlockHostRef,
  tileId: string,
): Promise<string | null> {
  try {
    return await readFile(await blockFilePath(root, host, tileId), 'utf8')
  } catch {
    return null
  }
}

/** Pure body write — no frontmatter envelope, no stamp (block files stay bare).
 *  Locked on the file so a future rename-cascade rewrite can't clobber a live edit. */
export async function writeMarkdownBlock(
  root: string,
  host: BlockHostRef,
  tileId: string,
  body: string,
): Promise<void> {
  const file = await blockFilePath(root, host, tileId)
  await serializeOnFile(file, () => atomicWriteFile(file, body))
}

/** Every block host with its resolved folder: the homepage singleton plus one per Space.
 *  Tolerates a failed world load (those hosts just skip this pass). */
async function listBlockHosts(root: string): Promise<{ config: string; dir: string }[]> {
  const homepage: BlockHostRef = { kind: 'homepage' }
  const hosts = [
    {
      config: nexusConfig(root, NEXUS_CONFIG_FILES.homepage),
      dir: blockHostDir(root, homepage),
    },
  ]
  try {
    const world = await loadContextWorld(root)
    if (world.ok)
      for (const ref of world.value.spaceById.values())
        hosts.push({ config: join(ref.dir, SPACE_SIDECAR), dir: ref.dir })
  } catch {
    // registry unreadable — homepage only this pass
  }
  return hosts
}

/** Every markdown block across all hosts as `{ id, file }` — the shared walk under both the
 *  link-index read and the rename heal. Non-markdown tiles are filtered here; a missing
 *  backing file is left to each caller to tolerate. */
async function markdownBlockFiles(root: string): Promise<{ id: string; file: string }[]> {
  const out: { id: string; file: string }[] = []
  for (const host of await listBlockHosts(root)) {
    // Read the config DIRECTLY, not via readBlockDoc — its healSplitDoc fold is a WRITE, and the index
    // build (a read path) must stay read-only by construction. A nexus still carrying the legacy
    // `_blocks.json` sidecar gets folded by the renderer's normal load and indexed on the next rebuild.
    const raw = await readJsonObject(host.config)
    const blocks = Array.isArray(raw?.blocks) ? raw.blocks : []
    for (const b of blocks) {
      const entry = knownBlock(b)
      if (entry?.type !== 'markdown') continue
      out.push({ id: entry.id, file: join(host.dir, `${entry.id}.md`) })
    }
  }
  return out
}

/** Every markdown block's body + mtime — the block half of the link index reads from here. A
 *  blocks[] entry whose file is missing is skipped, never fatal to the build. */
export async function listBlockBodies(
  root: string,
): Promise<{ id: string; body: string; modifiedAt: string }[]> {
  const out: { id: string; body: string; modifiedAt: string }[] = []
  for (const { id, file } of await markdownBlockFiles(root)) {
    let body: string
    try {
      body = await readFile(file, 'utf8')
    } catch {
      continue // entry without a backing file — skip
    }
    // A missing/corrupt mtime must not throw (toISOString on an Invalid Date) and silently drop the
    // whole block from the index — fall back to the epoch so the block + its edges still index.
    let modifiedAt = EPOCH
    try {
      const m = (await stat(file)).mtime
      if (!Number.isNaN(m.getTime())) modifiedAt = m.toISOString()
    } catch {
      // keep EPOCH
    }
    out.push({ id, body, modifiedAt })
  }
  return out
}

/** Heal markdown-block bodies on a page rename: rewrite every `[[oldTitle]]` → `[[newTitle]]`,
 *  each under its own file lock (the same lock a live block edit takes). renameCascade can't reach
 *  these — they're id-less and .nexus-resident — so this runs beside it. Best-effort and per-file:
 *  re-runnable, never cross-file atomic; a failure leaves the page renamed and blocks stale. */
export async function rewriteBlockConnections(
  root: string,
  oldTitle: string,
  newTitle: string,
): Promise<void> {
  const oldKey = normalizeTitle(oldTitle)
  for (const { file } of await markdownBlockFiles(root)) {
    await serializeOnFile(file, async () => {
      let body: string
      try {
        body = await readFile(file, 'utf8')
      } catch {
        return
      }
      if (!scanConnections(body).some((c) => c.normalizedTitle === oldKey)) return
      const next = rewriteConnections(body, oldTitle, newTitle)
      if (next !== body) await atomicWriteFile(file, next)
    })
  }
}
