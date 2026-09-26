import { isPlainObject } from '../Contract/validators'
import { pathExists, rmwJsonStrict } from '../Files/atomicWrite'
import { listFilesRecursive } from '../Files/walk'
import { recordWrite } from '../Files/writeEcho'
import {
  ASSETS_DIR_REL,
  CONTEXTS_DIR_REL,
  NEXUS_DIR,
  NEXUS_CONFIG_FILES,
  SIDECARS,
  TILE_DOC_FILENAME,
  TRASH_DIR,
} from '../Paths/nexusPaths'
import { contextsRegistryFile, nexusConfig, tileHostDir } from '../Paths/paths'
import { join } from '../Paths/posix'
import { machine } from '../Platform/machine'
import { propertyType } from '../Properties/properties'

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

export const renamedSidecar = (meta: unknown) =>
  field(meta, 'views', (vs) => changed(vs, renamedView))

const renamedTileDoc = (doc: unknown) =>
  field(doc, 'tiles', (tiles) =>
    changed(tiles, (tile) =>
      field(tile, 'views', (entries) =>
        changed(entries, (entry) => field(entry, 'config', renamedView)),
      ),
    ),
  )

// Containers in scope ride the adoption pass (`stampFolder`); only the Trash and the tile documents are walked here.
export async function normalizeSavedViews(root: string): Promise<void> {
  for (const file of await listFilesRecursive(join(root, TRASH_DIR), [...SIDECARS]))
    await rmwJsonStrict(file, renamedSidecar)
  for (const dir of [tileHostDir(root), join(root, CONTEXTS_DIR_REL)])
    for (const file of await listFilesRecursive(dir, [TILE_DOC_FILENAME]))
      await rmwJsonStrict(file, renamedTileDoc)
}

const respelled = (type: unknown) => {
  const id = propertyType.safeParse(type).data
  return id === type ? null : id
}

const renamedRegistry = (file: unknown) =>
  field(file, 'defs', (defs) => {
    if (!isPlainObject(defs)) return null
    const renamed = Object.entries(defs).flatMap(([id, def]) => {
      const next = field(def, 'type', respelled)
      return next ? [[id, next] as const] : []
    })
    return renamed.length ? { ...defs, ...Object.fromEntries(renamed) } : null
  })

// A def keeps the spelling it was written with through every ordinary write, so the registry's own copy is respelled here.
export const normalizePropertyTypes = (root: string) =>
  rmwJsonStrict(nexusConfig(root, NEXUS_CONFIG_FILES.properties), renamedRegistry)
