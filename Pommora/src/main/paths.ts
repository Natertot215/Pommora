// Every absolute path main builds, resolved against the nexus root, plus the on-disk names only
// main ever reads — sidecars, config filenames, the block host's folder. Names the renderer also
// speaks are the cross-process contract and live in `@shared/nexusPaths`. node:path only; no fs.

import { join } from 'node:path'
import { CONTEXTS_DIR_REL, CONTEXTS_REGISTRY_REL, NEXUS_DIR } from '@shared/nexusPaths'

export type SidecarKind = 'space' | 'collection' | 'set' | 'taskConfig' | 'eventConfig'

/** Per-kind sidecar filenames (the kind authority on disk). */
export const SIDECAR_FILENAME: Record<SidecarKind, string> = {
  space: '_space.json',
  collection: '_pagecollection.json',
  set: '_pageset.json',
  taskConfig: '_taskconfig.json',
  eventConfig: '_eventconfig.json',
}

/** A folder entity's sidecar file. Every read-modify-write of that file serializes on this
 *  exact string, so it is built here rather than spelled out at a call site. */
export function sidecarPath(absFolder: string, kind: SidecarKind): string {
  return join(absFolder, SIDECAR_FILENAME[kind])
}

export function nexusDir(root: string): string {
  return join(root, NEXUS_DIR)
}

export function nexusConfig(root: string, file: string): string {
  return join(nexusDir(root), file)
}

/** The Contexts registry (per-Context id, title, singular, icon; array position is the order). */
export function contextsRegistryFile(root: string): string {
  return join(root, CONTEXTS_REGISTRY_REL)
}

export function contextsDir(root: string): string {
  return join(root, CONTEXTS_DIR_REL)
}

/** A Space folder's sidecar filename (membership comes from the parent folder). */
export const SPACE_SIDECAR = SIDECAR_FILENAME.space

/** The homepage block host's content folder — its markdown-block `.md` files live here
 *  (distinct from the `homepage.json` config file). Real hosts use their own folders. */
export const HOMEPAGE_HOST_DIRNAME = 'homepage'

export function blockHostDir(root: string): string {
  return join(nexusDir(root), HOMEPAGE_HOST_DIRNAME)
}

/** The canonical `.nexus/` files. Per-machine chrome is not among them — that lives in nexus.db,
 *  so everything named here is content a user or another app can legitimately read and edit. */
export const NEXUS_CONFIG_FILES = {
  identity: 'nexus.json',
  settings: 'settings.json',
  state: 'state.json',
  homepage: 'homepage.json',
  navigation: 'navigation.json',
  properties: 'properties.json',
} as const
