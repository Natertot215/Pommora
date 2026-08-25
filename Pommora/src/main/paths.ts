// Every absolute path main builds, resolved against the nexus root, plus the on-disk names only
// main ever reads — sidecars, config filenames, the block host's folder. Names the renderer also
// speaks are the cross-process contract and live in `@shared/nexusPaths`. node:path only; no fs.

import { join, relative, sep } from 'node:path'
import { CONTEXTS_DIR_REL, CONTEXTS_REGISTRY_REL, NEXUS_DIR } from '@shared/nexusPaths'
import { rootSegs } from './exclusion'

/** A path under `root`, spelled the way every key in the app spells one: nexus-relative and
 *  POSIX, whatever separator the platform handed back. */
export const relPosix = (root: string, abs: string): string =>
  relative(root, abs).split(sep).join('/')

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

/** Every sidecar filename, for the walks that ask whether a file IS one. */
export const SIDECARS = new Set<string>(Object.values(SIDECAR_FILENAME))

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

/** The configured asset root, absolute. The value is nexus-relative POSIX, validated at the
 *  reader, so it joins the same way every other relative path here does. */
export function assetsDir(root: string, assetDir: string): string {
  return join(root, ...rootSegs(assetDir))
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
  crops: 'crops.json',
} as const
