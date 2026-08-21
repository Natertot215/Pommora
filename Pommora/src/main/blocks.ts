// A block document — layout, entries, lock — is ONE row in nexus.db, keyed by host. It is an
// arrangement of things that live elsewhere: every entry is a reference (a markdown file per tile,
// an embedded page, a view onto a container), so the document creates nothing a Nexus would miss.
// What each tile *says* stays a file: markdown bodies are prose, in the connections graph, and
// rewritten by a rename cascade.
//
// A host's own sidecar keeps identity and appearance — homepage.json its banner and icon, a Space
// its id and color — and no longer carries the document, so a block gesture and a banner write can
// never lose each other, and no hand-edit can mangle a host into an unrenderable tree.

import { mkdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import {
  blockHostKey,
  knownBlock,
  type BlockDoc,
  type BlockDocPatch,
  type BlockHostRef,
} from '@shared/blocks'
import { readKey, writeKey } from './db/localState'
import { normalizeTitle } from '@shared/connections'
import { mentionsTitle } from './connections/scan'
import { rewriteConnections } from './connections/rewrite'
import { newId } from './ids'
import { atomicWriteFile, pathExists, trashFileFlat } from './io/atomicWrite'
import { serializeOnFile } from './io/fileLock'
import { loadContextWorld } from './crud/contextWrite'
import { getLiveTree } from './liveTree'
import { blockHostDir } from './paths'

/** A Space host's folder, answered by the live tree; the world load covers the pre-walk moment
 *  and an unconfirmed Space. Unknown or unresolvable ids throw; the IPC envelope catches. */
async function spaceHostDir(root: string, id: string): Promise<string> {
  const held = getLiveTree()
  if (held?.nexus.rootPath === root) {
    for (const g of held.contexts) {
      const space = g.spaces.find((s) => s.id === id)
      if (space) {
        // Mid-cascade the tree still spells the folder a rename just moved — a stale entry
        // falls through to the fresh world load.
        const dir = join(root, space.path)
        if (await pathExists(dir)) return dir
        break
      }
    }
  }
  const world = await loadContextWorld(root)
  if (!world.ok) throw new Error(world.error.message)
  const ref = world.value.spaceById.get(id)
  if (!ref) throw new Error('Unknown Space.')
  return ref.dir
}

async function hostDir(root: string, host: BlockHostRef): Promise<string> {
  return host.kind === 'homepage' ? blockHostDir(root) : spaceHostDir(root, host.id)
}

export async function blockFilePath(
  root: string,
  host: BlockHostRef,
  tileId: string,
): Promise<string> {
  return join(await hostDir(root, host), `${tileId}.md`)
}

export function readBlockDoc(host: BlockHostRef): BlockDoc {
  const row = readKey<Partial<BlockDoc>>('blockDoc', blockHostKey(host))
  return {
    layout: row?.layout,
    blocks: Array.isArray(row?.blocks) ? row.blocks : [],
    locked: row?.locked === true,
  }
}

/** Patch the document. The read and the write are one synchronous pair, so two saves arriving
 *  together — a layout debounce beside an entry op — cannot interleave and lose each other,
 *  which is what the file lock used to buy. */
export function writeBlockDoc(host: BlockHostRef, patch: BlockDocPatch): void {
  const cur = readBlockDoc(host)
  writeKey('blockDoc', blockHostKey(host), {
    layout: 'layout' in patch ? patch.layout : cur.layout,
    blocks: 'blocks' in patch ? patch.blocks : cur.blocks,
    locked: 'locked' in patch ? patch.locked === true : cur.locked,
  })
}

/** Replace the entries through the given updater, leaving layout and lock alone. */
function setBlocks(host: BlockHostRef, update: (blocks: unknown[]) => unknown[]): void {
  writeBlockDoc(host, { blocks: update(readBlockDoc(host).blocks) })
}

/** Mint a markdown block: host dir, an empty `<ulid>.md`, then the `blocks[]` entry —
 *  in that order, so a crash leaks at worst an orphan file, never an entry without one.
 *  The renderer splices the layout leaf afterward. */
export async function createMarkdownBlock(root: string, host: BlockHostRef): Promise<string> {
  const id = newId()
  await mkdir(await hostDir(root, host), { recursive: true })
  await atomicWriteFile(await blockFilePath(root, host, id), '')
  setBlocks(host, (blocks) => [...blocks, { id, type: 'markdown' }])
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
  setBlocks(host, (blocks) =>
    blocks.filter((b) => {
      const entry = knownBlock(b)
      if (entry?.id !== tileId) return true
      if (entry.type === 'markdown') wasMarkdown = true
      return false
    }),
  )
  if (wasMarkdown) await trashTileFile(root, host, tileId)
}

/** Trash a markdown tile's backing file on ITS lock — ordered against a still-pending
 *  editor flush, so a late body write can never land after the trash and resurrect it. */
async function trashTileFile(root: string, host: BlockHostRef, tileId: string): Promise<void> {
  const file = await blockFilePath(root, host, tileId)
  await serializeOnFile(file, async () => {
    if (await pathExists(file)) await trashFileFlat(root, file)
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
  setBlocks(host, (blocks) =>
    blocks.map((b) => {
      const entry = knownBlock(b)
      if (entry?.id !== tileId) return b
      if (entry.type === 'markdown') wasMarkdown = true
      return { ...(b as Record<string, unknown>), ...patch }
    }),
  )
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
 *  silently re-couple a copied/"detached" snapshot to its source, so every copy re-mints.
 *  Takes ONE tile's `views` array, never a whole block doc. */
export function remintConfigIds(views: unknown[]): unknown[] {
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
  const doc = readBlockDoc(host)
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
  setBlocks(host, (blocks) => [...blocks, copy])
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

async function listBlockHosts(root: string): Promise<{ host: BlockHostRef; dir: string }[]> {
  const homepage: BlockHostRef = { kind: 'homepage' }
  const hosts: { host: BlockHostRef; dir: string }[] = [{ host: homepage, dir: blockHostDir(root) }]
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

/** The shared walk under both the link-index read and the rename heal — a missing backing file
 *  is left to each caller to tolerate. */
async function markdownBlockFiles(root: string): Promise<{ id: string; file: string }[]> {
  const out: { id: string; file: string }[] = []
  for (const { host, dir } of await listBlockHosts(root)) {
    for (const b of readBlockDoc(host).blocks) {
      const entry = knownBlock(b)
      if (entry?.type !== 'markdown') continue
      out.push({ id: entry.id, file: join(dir, `${entry.id}.md`) })
    }
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
      if (!mentionsTitle(body, oldKey)) return
      const next = rewriteConnections(body, oldTitle, newTitle)
      if (next !== body) await atomicWriteFile(file, next)
    })
  }
}
