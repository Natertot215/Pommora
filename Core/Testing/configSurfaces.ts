import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join } from '../Paths/posix'
import { contextsDir, contextsRegistryFile, nexusConfig, sidecarPath } from '../Paths/paths'
import { NEXUS_CONFIG_FILES, SIDECAR_FILENAME, TILE_DOC_FILENAME } from '../Paths/nexusPaths'
import { pathExists } from '../Files/atomicWrite'
import { createFolderEntity } from '../Nexus/folderEntity'

type Raw = Record<string, unknown>

interface ConfigViews {
  collection: Raw
  set: Raw
  tile: Raw
  matrix: unknown
}

export interface ConfigSurfaces {
  set: string
  tiles: string
  read: () => Promise<ConfigViews>
}

export const viewOn = (propertyId: string, value: string): Raw => ({
  id: 'view_1',
  name: 'V',
  type: 'table',
  property_order: ['_title', propertyId],
  hidden_properties: [propertyId],
  column_widths: { [propertyId]: 120 },
  filter: { match: 'all', rules: [{ property_id: propertyId, op: 'is', value }] },
  sort: [{ property_id: propertyId, direction: 'ascending', order: [value] }],
  group: { kind: 'property', property_id: propertyId, order_mode: 'manual', order: [value] },
  hidden_groups: [`${propertyId}/${value}`],
  collapsed_groups: [value],
})

const json = async (file: string): Promise<Raw> => JSON.parse(await readFile(file, 'utf8'))

const put = async (file: string, value: unknown): Promise<void> => {
  await mkdir(join(file, '..'), { recursive: true })
  await writeFile(file, JSON.stringify(value, null, 2))
}

export async function seedConfigSurfaces(
  root: string,
  collection: string,
  view: Raw,
): Promise<ConfigSurfaces> {
  const identity = nexusConfig(root, NEXUS_CONFIG_FILES.identity)
  if (!(await pathExists(identity))) await put(identity, { id: 'nx', createdAt: '2026' })
  const colFile = sidecarPath(collection, 'collection')
  await put(colFile, { ...(await json(colFile)), views: [view] })
  const set = await createFolderEntity(collection, 'set', 'Deep', { views: [view] })
  if (!set.ok) throw new Error('set failed')
  await put(contextsRegistryFile(root), { contexts: [{ id: 'ctx_areas', title: 'Areas' }] })
  const space = join(contextsDir(root), 'Areas', 'Home')
  await put(join(space, SIDECAR_FILENAME.space), { id: 'sp_home' })
  const tiles = join(space, TILE_DOC_FILENAME)
  await put(tiles, {
    tiles: [{ id: 't', type: 'view', views: [{ source_id: set.value.id, config: view }] }],
  })
  const matrix = nexusConfig(root, NEXUS_CONFIG_FILES.matrix)
  await put(matrix, { filter: { rules: view.filter, enabled: true } })
  const setFile = sidecarPath(set.value.path, 'set')
  return {
    set: set.value.path,
    tiles,
    read: async () => ({
      collection: ((await json(colFile)).views as Raw[])[0],
      set: ((await json(setFile)).views as Raw[])[0],
      tile: (((await json(tiles)).tiles as Raw[])[0].views as Raw[])[0].config as Raw,
      matrix: ((await json(matrix)).filter as Raw).rules,
    }),
  }
}
