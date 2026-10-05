import { isPlainObject } from '../Contract/validators'
import { rmwJsonStrict } from '../Files/atomicWrite'
import { listFilesRecursive } from '../Files/walk'
import {
  CONTEXTS_DIR_REL,
  NEXUS_CONFIG_FILES,
  SIDECARS,
  TILE_DOC_FILENAME,
  TRASH_DIR,
} from '../Paths/nexusPaths'
import { nexusConfig, homepageDir } from '../Paths/paths'
import { join } from '../Paths/posix'
import { propertyType } from '../Properties/properties'
import { mapTiles, mapViews } from '../Views/views'

// One-time normalizations of what a saved view writes down; each can go once no nexus carries it.
// `card_banner` spelled its banner mode `image` before the key and the mode were told apart, and the
// Table view's grid glyph was keyed `table` before that name went back to Lucide's own table.
const RENAMED: { key: string; from: string; to: string }[] = [
  { key: 'card_banner', from: 'image', to: 'banner' },
  { key: 'icon', from: 'table', to: 'view-table' },
]

function renamedView(view: Record<string, unknown>): Record<string, unknown> | null {
  const hits = RENAMED.filter((r) => view[r.key] === r.from)
  return hits.length ? { ...view, ...Object.fromEntries(hits.map((r) => [r.key, r.to])) } : null
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
  isPlainObject(meta) ? mapViews(meta, renamedView) : null

const renamedTileDoc = (doc: unknown) =>
  isPlainObject(doc) ? mapTiles(doc, (tile) => mapViews(tile, renamedView)) : null

// Containers in scope ride the adoption pass (`stampFolder`); only the Trash and the tile documents are walked here.
export async function normalizeSavedViews(root: string): Promise<void> {
  for (const file of await listFilesRecursive(join(root, TRASH_DIR), [...SIDECARS]))
    await rmwJsonStrict(file, renamedSidecar)
  // Runs at open, before a tree exists to ask TILE_HOSTS for its boards.
  for (const dir of [homepageDir(root), join(root, CONTEXTS_DIR_REL)])
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
