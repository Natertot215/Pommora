import { join, relative } from './posix'
import { CONTEXTS_DIR_REL, CONTEXTS_REGISTRY_REL, NEXUS_DIR } from './nexusPaths'
import { rootSegs } from './exclusion'

export const relPosix = (root: string, abs: string): string => relative(root, abs)

export type SidecarKind = 'space' | 'collection' | 'set' | 'taskConfig' | 'eventConfig'

export const SIDECAR_FILENAME: Record<SidecarKind, string> = {
  space: '_space.json',
  collection: '_pagecollection.json',
  set: '_pageset.json',
  taskConfig: '_taskconfig.json',
  eventConfig: '_eventconfig.json',
}

/** Every read-modify-write serializes on this exact string, so it is built here rather than spelled out at a call site. */
export function sidecarPath(absFolder: string, kind: SidecarKind): string {
  return join(absFolder, SIDECAR_FILENAME[kind])
}

export const SIDECARS = new Set<string>(Object.values(SIDECAR_FILENAME))

export function nexusDir(root: string): string {
  return join(root, NEXUS_DIR)
}

export function nexusConfig(root: string, file: string): string {
  return join(nexusDir(root), file)
}

export function contextsRegistryFile(root: string): string {
  return join(root, CONTEXTS_REGISTRY_REL)
}

export function assetsDir(root: string, assetDir: string): string {
  return join(root, ...rootSegs(assetDir))
}

export function contextsDir(root: string): string {
  return join(root, CONTEXTS_DIR_REL)
}

export const SPACE_SIDECAR = SIDECAR_FILENAME.space

export const HOMEPAGE_HOST_DIRNAME = 'homepage'

export function tileHostDir(root: string): string {
  return join(nexusDir(root), HOMEPAGE_HOST_DIRNAME)
}

export const TILE_DOC_FILENAME = '_tiles.json'
export const tileDocPath = (hostDirAbs: string): string => join(hostDirAbs, TILE_DOC_FILENAME)

export const tileFilePath = (hostDirAbs: string, tileId: string): string =>
  join(hostDirAbs, `${tileId}.md`)

export const NEXUS_CONFIG_FILES = {
  identity: 'nexus.json',
  settings: 'settings.json',
  state: 'state.json',
  homepage: 'homepage.json',
  navigation: 'navigation.json',
  properties: 'properties.json',
  crops: 'crops.json',
} as const
