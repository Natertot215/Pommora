import { pathExists, rmwJsonStrict } from '../Files/atomicWrite'
import { listPathsUnder } from '../Files/walk'
import { recordWrite } from '../Files/writeEcho'
import { ASSETS_DIR_REL, CONTEXTS_DIR_REL, NEXUS_DIR } from '../Paths/nexusPaths'
import {
  NEXUS_CONFIG_FILES,
  SIDECARS,
  TILE_DOC_FILENAME,
  contextsRegistryFile,
  nexusConfig,
  tileHostDir,
} from '../Paths/paths'
import { join } from '../Paths/posix'
import { machine } from '../Platform/machine'

async function migrateFile(oldAbs: string, newAbs: string): Promise<void> {
  if (!(await pathExists(oldAbs))) return
  recordWrite(oldAbs)
  if (await pathExists(newAbs)) {
    await machine().remove(oldAbs)
    return
  }
  recordWrite(newAbs)
  await machine().rename(oldAbs, newAbs)
}

export async function ensureConfigLayout(root: string): Promise<void> {
  await machine().mkdir(join(root, ASSETS_DIR_REL))
  await machine().mkdir(join(root, CONTEXTS_DIR_REL))
  await machine().mkdir(tileHostDir(root))
  await migrateFile(
    join(root, NEXUS_DIR, 'crops.json'),
    nexusConfig(root, NEXUS_CONFIG_FILES.crops),
  )
  await migrateFile(
    join(root, NEXUS_DIR, 'homepage.json'),
    nexusConfig(root, NEXUS_CONFIG_FILES.homepage),
  )
  await migrateFile(join(root, NEXUS_DIR, 'contexts.json'), contextsRegistryFile(root))
}

// One-time normalizations of what a saved view writes down; each can go once no nexus carries it.
// `card_banner` spelled its banner mode `image` before the key and the mode were told apart, and the
// Table view's grid glyph was keyed `table` before that name went back to Lucide's own table.
const RENAMED: { key: string; from: string; to: string }[] = [
  { key: 'card_banner', from: 'image', to: 'banner' },
  { key: 'icon', from: 'table', to: 'view-table' },
]

function renamedView(v: unknown): Record<string, unknown> | null {
  if (!v || typeof v !== 'object') return null
  const view = v as Record<string, unknown>
  const hits = RENAMED.filter((r) => view[r.key] === r.from)
  return hits.length ? { ...view, ...Object.fromEntries(hits.map((r) => [r.key, r.to])) } : null
}

const changed = (xs: unknown, f: (x: unknown) => unknown | null): unknown[] | null => {
  if (!Array.isArray(xs)) return null
  let found = false
  const next = xs.map((x) => {
    const y = f(x)
    if (y) found = true
    return y ?? x
  })
  return found ? next : null
}

const field = (
  o: unknown,
  key: string,
  f: (v: unknown) => unknown | null,
): Record<string, unknown> | null => {
  if (!o || typeof o !== 'object') return null
  const next = f((o as Record<string, unknown>)[key])
  return next ? { ...(o as Record<string, unknown>), [key]: next } : null
}

const renamedSidecar = (meta: unknown) => field(meta, 'views', (vs) => changed(vs, renamedView))

const renamedTileDoc = (doc: unknown) =>
  field(doc, 'tiles', (tiles) =>
    changed(tiles, (tile) =>
      field(tile, 'views', (entries) =>
        changed(entries, (entry) => field(entry, 'config', renamedView)),
      ),
    ),
  )

async function rewrite(
  abs: string,
  fn: (json: Record<string, unknown>) => Record<string, unknown> | null,
): Promise<void> {
  await rmwJsonStrict(abs, (json) => {
    const next = fn(json)
    if (next !== null) recordWrite(abs)
    return next
  })
}

export async function normalizeSavedViews(root: string): Promise<void> {
  const sidecars = await listPathsUnder(root, root, (rel, kind) => {
    const segs = rel.split('/')
    if (segs[0] === NEXUS_DIR) return false
    return kind === 'dir' || SIDECARS.has(segs[segs.length - 1])
  })
  for (const rel of sidecars) await rewrite(join(root, rel), renamedSidecar)
  for (const dir of [tileHostDir(root), join(root, CONTEXTS_DIR_REL)]) {
    const tileDocs = await listPathsUnder(
      root,
      dir,
      (rel, kind) => kind === 'dir' || rel.endsWith(`/${TILE_DOC_FILENAME}`),
    )
    for (const rel of tileDocs) await rewrite(join(root, rel), renamedTileDoc)
  }
}
