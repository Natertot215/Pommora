import { join } from '../Paths/posix'
import { contextsDir, contextsRegistryFile, nexusConfig, sidecarPath } from '../Paths/paths'
import { NEXUS_CONFIG_FILES, SIDECAR_FILENAME, TILE_DOC_FILENAME } from '../Paths/nexusPaths'
import { pathExists } from '../Files/atomicWrite'
import { createFolderEntity } from '../Nexus/folderEntity'
import { newId } from '../Nexus/ids'
import { putJson, readJsonAt } from './hostFs'

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

export async function seedConfigSurfaces(
  root: string,
  collection: string,
  view: Raw,
): Promise<ConfigSurfaces> {
  const identity = nexusConfig(root, NEXUS_CONFIG_FILES.identity)
  if (!(await pathExists(identity))) await putJson(identity, { id: 'nx', createdAt: '2026' })
  const colFile = sidecarPath(collection, 'collection')
  await putJson(colFile, { ...(await readJsonAt(colFile)), views: [view] })
  const set = await createFolderEntity(collection, 'set', 'Deep', newId(), { views: [view] })
  if (!set.ok) throw new Error('set failed')
  await putJson(contextsRegistryFile(root), { contexts: [{ id: 'ctx_areas', title: 'Areas' }] })
  const space = join(contextsDir(root), 'Areas', 'Home')
  await putJson(join(space, SIDECAR_FILENAME.space), { id: 'sp_home' })
  const tiles = join(space, TILE_DOC_FILENAME)
  await putJson(tiles, {
    tiles: [{ id: 't', type: 'view', views: [{ source_id: set.value.id, config: view }] }],
  })
  const matrix = nexusConfig(root, NEXUS_CONFIG_FILES.matrix)
  await putJson(matrix, { filter: { rules: view.filter, enabled: true } })
  const setFile = sidecarPath(set.value.path, 'set')
  return {
    set: set.value.path,
    tiles,
    read: async () => ({
      collection: ((await readJsonAt(colFile)).views as Raw[])[0],
      set: ((await readJsonAt(setFile)).views as Raw[])[0],
      tile: (((await readJsonAt(tiles)).tiles as Raw[])[0].views as Raw[])[0].config as Raw,
      matrix: ((await readJsonAt(matrix)).filter as Raw).rules,
    }),
  }
}
