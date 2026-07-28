// Pure path module — the one place that knows the on-disk layout.
// Mirrors the Swift NexusPaths. node:path only; no fs.

import { join } from 'node:path'

export type SidecarKind =
  | 'area'
  | 'topic'
  | 'project'
  | 'space'
  | 'collection'
  | 'set'
  | 'taskConfig'
  | 'eventConfig'

/** Per-kind sidecar filenames (the kind authority on disk). */
export const SIDECAR_FILENAME: Record<SidecarKind, string> = {
  area: '_area.json',
  topic: '_topic.json',
  project: '_project.json',
  space: '_space.json',
  collection: '_pagecollection.json',
  set: '_pageset.json',
  taskConfig: '_taskconfig.json',
  eventConfig: '_eventconfig.json',
}

export function nexusDir(root: string): string {
  return join(root, '.nexus')
}

export function nexusConfig(root: string, file: string): string {
  return join(nexusDir(root), file)
}

/** The Contexts registry — `.nexus/contexts.json` (per-Context id, title, singular, icon;
 *  array position is the order). */
export function contextsRegistryFile(root: string): string {
  return join(nexusDir(root), 'contexts.json')
}

/** The Space tree root — `.nexus/contexts/<Context Title>/<Space Title>/`. */
export function contextsDir(root: string): string {
  return join(nexusDir(root), 'contexts')
}

export function spaceDir(root: string, contextTitle: string, spaceTitle: string): string {
  return join(contextsDir(root), contextTitle, spaceTitle)
}

/** A Space folder's sidecar filename (membership comes from the parent folder). */
export const SPACE_SIDECAR = SIDECAR_FILENAME.space

/** The homepage block host's content folder — its markdown-block `.md` files live here
 *  (distinct from the `homepage.json` config file). Real hosts use their own folders. */
export const HOMEPAGE_HOST_DIRNAME = 'homepage'

export function blockHostDir(root: string, _host: { kind: 'homepage' }): string {
  return join(nexusDir(root), HOMEPAGE_HOST_DIRNAME)
}

/** The canonical `.nexus/` files. Per-machine chrome is not among them — that lives in nexus.db,
 *  so everything named here is content a user or another app can legitimately read and edit. */
export const NEXUS_CONFIG_FILES = {
  identity: 'nexus.json',
  settings: 'settings.json',
  state: 'state.json',
  homepage: 'homepage.json',
  navview: 'navview.json',
  sidebarSections: 'sidebar-sections.json',
  properties: 'properties.json',
  navRecents: 'navRecents.json',
  navFavorites: 'navFavorites.json',
  tabs: 'tabs.json',
  previews: 'page-previews.json',
} as const
