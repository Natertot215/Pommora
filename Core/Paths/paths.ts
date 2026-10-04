import { join } from './posix'
import {
  CONTEXTS_DIR_REL,
  CONTEXTS_REGISTRY_REL,
  HOMEPAGE_DIR_REL,
  METADATA_DIR_REL,
  NEXUS_DIR,
  SIDECAR_FILENAME,
  type SidecarKind,
  TILE_DOC_FILENAME,
} from './nexusPaths'
import { rootSegs } from './exclusion'

/** Every read-modify-write serializes on this exact string, so it is built here rather than spelled out at a call site. */
export function sidecarPath(absFolder: string, kind: SidecarKind): string {
  return join(absFolder, SIDECAR_FILENAME[kind])
}

export function nexusDir(root: string): string {
  return join(root, NEXUS_DIR)
}

export function nexusConfig(root: string, file: string): string {
  return join(nexusDir(root), file)
}

export const metadataShardPath = (root: string, shard: string): string =>
  join(root, METADATA_DIR_REL, `${shard}.json`)

export function contextsRegistryFile(root: string): string {
  return join(root, CONTEXTS_REGISTRY_REL)
}

export function assetsDir(root: string, assetDir: string): string {
  return join(root, ...rootSegs(assetDir))
}

export function contextsDir(root: string): string {
  return join(root, CONTEXTS_DIR_REL)
}

export function tileHostDir(root: string): string {
  return join(root, HOMEPAGE_DIR_REL)
}

export const tileDocPath = (hostDirAbs: string): string => join(hostDirAbs, TILE_DOC_FILENAME)

export const tileFilePath = (hostDirAbs: string, tileId: string): string =>
  join(hostDirAbs, `${tileId}.md`)
